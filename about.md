---
layout: default
title: About
permalink: /about/
---
<div class="page-head">
  <div class="page-prompt">$ cat ./about.md</div>
  <h1 class="page-title">about</h1>
</div>

<div class="about-body">
  <p>
    I'm a cybersecurity analyst working in managed detection &amp; response (MDR),
    focused on threat hunting, detection engineering, and incident triage across
    endpoint, network, and cloud telemetry. My day-to-day is building and tuning
    detections, chasing down anomalous behavior, and writing up what I find so
    the next analyst doesn't have to start from zero.
  </p>
  <p>
    Outside of the queue, I build small tools to speed up log parsing and
    endpoint triage — see <a href="{{ '/projects/' | relative_url }}">projects</a>
    — and write up interesting hunts and CVE analysis in
    <a href="{{ '/writeups/' | relative_url }}">writeups</a>.
  </p>

  <h2 class="section-title">$ cat ./certifications.txt</h2>
  <ul class="plain-list">
    <li>eCTHP &mdash; eLearnSecurity Certified Threat Hunting Professional</li>
    <li>PMRP &mdash; Practical Malware Researcher Professional</li>
    <li>MCBTA &mdash; Multi-Cloud Blue Team Analyst</li>
    <li>GCP ACE &mdash; Google Cloud Associate Cloud Engineer</li>
  </ul>

  <h2 class="section-title">$ cat ./stack.txt</h2>
  <div class="stack-list">
    <span class="tag">Sysmon</span>
    <span class="tag">Sigma</span>
    <span class="tag">Splunk</span>
    <span class="tag">Elastic / ELK</span>
    <span class="tag">EVTX</span>
    <span class="tag">Python</span>
    <span class="tag">PowerShell</span>
    <span class="tag">YARA</span>
    <span class="tag">MITRE ATT&amp;CK</span>
    <span class="tag">Windows Internals</span>
  </div>

  <h2 class="section-title">$ cat ./contact.txt</h2>
  <p>
    <a href="mailto:emmanuel2202zch@gmail.com">emmanuel2202zch@gmail.com</a>
  </p>

  <h2 class="section-title">$ ./resume.sh --download</h2>
  <p>
    <a href="{{ '/assets/files/emmanuel-zuniga-resume.pdf' | relative_url }}" download>emmanuel-zuniga-resume.pdf</a>
  </p>
</div>
