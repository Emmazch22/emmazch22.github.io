---
title: "Hunting LSASS Credential Access with Sysmon Event ID 10"
date: 2026-08-13 09:00:00 -0500
tags: [threat-hunting, sysmon, credential-access, windows]
severity: high
excerpt: >-
  Building a Sysmon-based detection for suspicious process handle requests
  against lsass.exe, and separating real credential-dumping attempts from
  noisy AV/EDR self-protection access.
---

## Why lsass.exe

`lsass.exe` holds credential material in memory — NTLM hashes, Kerberos
tickets, sometimes cleartext secrets depending on WDigest configuration.
Tools like Mimikatz, `procdump`, and `comsvcs.dll`'s `MiniDump` export all
work the same way at the OS level: open a handle to the LSASS process with
enough access rights to read its memory, then either dump it or read
credentials directly.

That shared mechanism is exactly what Sysmon **Event ID 10** (ProcessAccess)
lets us catch, regardless of which specific tool is used.

## The raw signal

```text
Event ID: 10
SourceImage:   C:\Windows\Temp\update.exe
TargetImage:   C:\Windows\System32\lsass.exe
GrantedAccess: 0x1010
CallTrace:     C:\Windows\SYSTEM32\ntdll.dll+9d234|...
```

`GrantedAccess` is the field that matters. Legitimate handles to LSASS
(other AV/EDR agents, WMI, some Windows services) tend to request narrow
access rights. Credential-dumping tooling typically requests
`PROCESS_VM_READ | PROCESS_QUERY_INFORMATION`, which shows up as
`0x1010` or `0x1410`.

## Sigma detection

```yaml
title: Suspicious Access to LSASS Process
logsource:
  category: process_access
  product: windows
detection:
  selection:
    TargetImage|endswith: '\lsass.exe'
    GrantedAccess:
      - '0x1010'
      - '0x1410'
      - '0x1438'
  filter_known_tools:
    SourceImage|endswith:
      - '\MsMpEng.exe'
      - '\SenseIR.exe'
  condition: selection and not filter_known_tools
level: high
```

## Cutting the noise

Straight out of the box this rule fires constantly — every EDR agent on
the box, `svchost.exe`, and occasionally `taskmgr.exe` (when someone opens
Details and highlights lsass.exe) will touch this process. The filter list
needs to be built per-environment from a baseline, not copied from a blog
post verbatim.

The signal that actually mattered in this hunt: an unsigned binary running
out of `C:\Windows\Temp`, requesting `0x1010` against LSASS, four seconds
after a suspicious PowerShell download cradle executed on the same host.
That correlation — not the LSASS access alone — is what turned this from
"noisy Sysmon event" into a confirmed credential-dumping attempt.

## Takeaways

- Alert on `GrantedAccess` values associated with memory-read rights, not
  every ProcessAccess event against LSASS.
- Build the AV/EDR allowlist from your own environment's baseline.
- Correlate with parent process ancestry and file provenance (signed vs.
  unsigned, write-then-execute from a temp path) before escalating.
