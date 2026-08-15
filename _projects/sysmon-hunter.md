---
title: sysmon-hunter
tagline: A real-time detection and correlation engine for Windows Sysmon telemetry — 173 ATT&CK-mapped rules plus statistical detectors for beaconing, recon bursts, and network scans, correlated into incidents and served through a live analyst console.
stack: [Python, FastAPI, Sysmon, Sigma, SQLite, SQLAlchemy, WebSocket, MITRE ATT&CK, Docker, Prometheus]
repo_url: https://github.com/Emmazch22/sysmon-hunter
category: Detection Engineering
status: active
achievements:
  - 173 hand-written YAML rules across all 23 Sysmon event types the engine understands, indexed by EventID and mapped to MITRE ATT&CK
  - Three statistical detectors — C2 beaconing (median/MAD, jitter-resistant), recon bursts (distinct ATT&CK techniques, not raw volume), and network scans (dual IP/port threshold) — catching what no single-event rule can see
  - Correlates detections by process-tree root (Sysmon ProcessGuid, never PID) into incidents with a non-linear severity score, a derived kill-chain narrative, and three named correlation chains for ransomware, credential-theft, and Office-to-PowerShell infection patterns
  - Live WebSocket console — interactive process tree, attack timeline, full-text/field search, false-positive similarity scoring, IOC enrichment via AbuseIPDB/VirusTotal, PDF incident reports, and STIX 2.1 / ATT&CK Navigator export
  - Every rule validated against real malware telemetry replayed from the EVTX-ATTACK-SAMPLES corpus, backed by a 742-test suite where each rule ships both a true-positive and a true-negative case
order: 1
---

Sysmon Hunter takes the raw event stream Sysmon dumps on a Windows endpoint
and turns it into something an analyst can actually work: rule and
statistical detections, correlated by process-tree ancestry into incidents,
scored, narrated, and streamed live to a dark SOC-style console. It runs as
a single FastAPI process on a laptop's worth of resources — no SIEM license
or cluster required — and ingests events from Winlogbeat, an `.evtx` replay,
or a test harness through the exact same pipeline, so nothing behaves
differently between a unit test and production.

The premise driving the design: a lone "PowerShell ran an encoded command"
detection is a lead an analyst has to chase by hand. The same detection
sitting under a `WINWORD.EXE` root, next to a reconnaissance burst and an
outbound beacon, with a hash VirusTotal confirms is Mimikatz, is an incident
that can be acted on immediately. Building that whole path — ingest,
normalize, correlate, score, present — was the point, not just getting a
Sigma-style rule to match a sample.

**Detection corpus**

- 173 YAML rules, Sigma-compatible in matching semantics (`equals`,
  `contains`, `startswith`, `endswith`, `re`, all invertible with `|not`),
  indexed by EventID so only relevant rules evaluate per event.
- Covers every Sysmon event type the engine understands: process creation,
  network and DNS, registry create/set/delete/rename, image load, process
  access, remote thread, file create/delete/time-stomp, alternate data
  streams, named pipes, driver load, raw disk access, process tampering,
  Sysmon config changes, clipboard capture, and the full WMI persistence
  chain.
- Every rule was written and validated the way a real detection engineer
  validates one: replay a known-bad `.evtx` from a public malware-sample
  corpus, see what fires (or doesn't), close the gap, prove the fix against
  the sample — not written from memory against synthetic fixtures.

**Correlation and scoring**

- Process ancestry is tracked by `ProcessGuid`, never PID, since Windows
  recycles PIDs aggressively enough to graft an unrelated process onto a
  malicious family tree.
- Detections sharing a process-tree root within a correlation window fold
  into one incident instead of surfacing as disconnected alerts.
- Incident severity is a non-linear point score (info=1 … critical=14)
  bucketed back into a severity band, so one critical detection — or two
  highs — correctly outranks a pile of low-severity noise that a plain
  average would under-report.
- An incident's title and kill-chain narrative are computed fresh from its
  current detections, never stored, so a new detection landing later
  updates both automatically.

**The console and beyond**

- A live WebSocket feed drives an incident queue with three inline views
  (list, interactive timeline, full process tree) plus a dedicated
  full-screen "Explore" page with pan/zoom for wide or deep trees.
- Full-text and field search (`host:`, `severity:`, `technique:`, `rule:`,
  `command_line:`, `actionable:`), analyst notes, and a "Set verdict" triage
  flow (close / reopen / mark false positive).
- False-positive similarity scoring compares each new incident against
  previously dismissed ones on shared rules, ATT&CK techniques, root
  process, and process-chain overlap — never auto-dismissing, just
  surfacing an explainable "probable noise" badge.
- Sigma rule import (upload and go live with no restart), STIX 2.1 export,
  and an ATT&CK Navigator coverage report that turns the rule corpus into a
  prioritized worklist of what to write next.
- Production-hardening knobs off by default: Prometheus metrics, structured
  JSON logging, an ingest rate limiter, and API-key auth on every JSON
  route.

Read the detection-engineering breakdown of how the rule engine, the
statistical detectors, and the incident correlation logic actually work in
the [Sysmon Hunter writeup]({{ '/writeups/2026/08/15/sysmon-hunter-detection-engineering/' | relative_url }}).
