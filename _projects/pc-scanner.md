---
title: pc_scanner.py
tagline: Lightweight endpoint triage script — snapshots running processes, autoruns, and network connections for quick compromise checks.
stack: [Python, psutil, Windows]
repo_url: https://github.com/Emmazch22/pc_scanner
order: 3
---

A single-file endpoint triage script for when you need a fast look at a
host's state without deploying a full agent. Snapshots running processes
(with parent PID, hashes, and signature status where available), active
network connections, and common autorun/persistence locations
(`Run`/`RunOnce` keys, scheduled tasks, startup folders, services).

Designed to run from removable media on an isolated or air-gapped host
during initial triage, before a heavier EDR/forensics toolkit is available.

**Highlights**

- Zero-dependency-friendly: falls back to built-in `subprocess` calls if
  `psutil` isn't available on the target host.
- Flags unsigned binaries running from user-writable paths
  (`%TEMP%`, `%APPDATA%`, `Downloads`).
- Diffs two snapshots to highlight what changed between runs.
- Outputs a single JSON report for easy archiving alongside case notes.
