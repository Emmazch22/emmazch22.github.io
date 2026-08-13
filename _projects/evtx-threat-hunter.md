---
title: EVTX Threat Hunter
tagline: Bulk-parse Windows EVTX exports and surface high-value security events for threat hunting at scale.
stack: [Python, EVTX, Windows Security Log, MITRE ATT&CK]
repo_url: https://github.com/Emmazch22/evtx-threat-hunter
order: 2
---

A batch triage tool for environments where you're handed a folder of
exported `.evtx` files from multiple hosts and need to find the handful of
events that matter. Focuses on the Windows Security, System, and
PowerShell Operational logs.

Maps parsed events to MITRE ATT&CK techniques where possible (logon type
anomalies, PowerShell script block logging, scheduled task creation,
service installation) so hunts can be organized by tactic instead of raw
Event ID.

**Highlights**

- Bulk-parses `.evtx` across an arbitrary number of hosts in one pass.
- Flags high-signal Security log events: 4624/4625 logon anomalies, 4688
  process creation with command-line auditing, 4697 service installs,
  4720 account creation.
- Tags matched events with likely ATT&CK technique IDs for reporting.
- Exports findings to CSV/JSON for handoff into a SIEM or case notes.
