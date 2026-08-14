---
title: sysmon-hunter
tagline: A command-line triage tool for Sysmon telemetry — index process lineage and command-line activity, then run Sigma-style detection rules against exported logs, no Event Viewer required.
stack: [Python, Sysmon, Windows Event Log, Sigma]
repo_url: https://github.com/Emmazch22/sysmon-hunter
category: Detection Engineering
status: active
achievements:
  - Parses Sysmon Event IDs 1, 3, 7, 8, 10, 11/23 — process creation, network connections, image loads, and file activity
  - Applies Sigma-style detection rule logic directly against parsed events
  - Outputs a process-tree view for fast parent/child triage
order: 1
---

A command-line tool for hunting through Sysmon event logs without opening
Event Viewer. Loads exported `.evtx`/`.xml` Sysmon logs, indexes the fields
that matter for hunting (process lineage, `GrantedAccess`, `Hashes`,
`CommandLine`), and lets you run Sigma-style rules against them locally.

Built for the parts of triage that get repetitive: pulling every process
with a given parent, filtering ProcessAccess events by granted-access
bitmask, and diffing a host's process tree against a known-good baseline.

**Highlights**

- Parses Sysmon Event IDs 1 (process create), 3 (network connect), 7
  (image load), 8 (CreateRemoteThread), 10 (process access), and 11/23
  (file create/delete).
- Applies a subset of Sigma rule logic directly against parsed events.
- Outputs a process-tree view for fast parent/child triage.
