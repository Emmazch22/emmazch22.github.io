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

  <h2 class="section-title">$ cat ./experience.txt</h2>
  <div class="exp-list">
    <div class="exp-item">
      <div class="exp-head">
        <span class="exp-role">Vigilance MDR Security Analyst</span>
        <span class="exp-dates">Dec 2025 &mdash; Present</span>
      </div>
      <div class="exp-org">SentinelOne &middot; Remote, Costa Rica</div>
      <ul class="plain-list">
        <li>Investigate and respond to 100+ daily security incidents across multi-tenant environments; perform triage, risk assessment, and escalation to ensure SLA compliance</li>
        <li>Conduct threat hunting using endpoint behavioral analysis and digital forensics; perform root cause analysis to identify attack vectors and prevent recurrence</li>
        <li>Analyze endpoint, network, and threat intelligence data to determine malicious patterns and correlate findings with MITRE ATT&amp;CK</li>
      </ul>
    </div>
    <div class="exp-item">
      <div class="exp-head">
        <span class="exp-role">Cyber Security Operations Analyst &mdash; Intermediate</span>
        <span class="exp-dates">Nov 2024 &mdash; Dec 2025</span>
      </div>
      <div class="exp-org">Equifax &middot; Mata Redonda, San Jos&eacute;</div>
      <ul class="plain-list">
        <li>Investigated real-time security alerts and incidents from SIEM, EDR, proxy, and threat intelligence sources</li>
        <li>Engineered 10+ detection use cases and correlation rules; validated detection accuracy across 300+ daily events</li>
        <li>Developed custom Python scripts for incident automation, log enrichment, and OSINT correlation, cutting alert triage time by 30%</li>
        <li>Conducted vulnerability assessments and cloud security reviews; mentored junior analysts on investigation techniques</li>
      </ul>
    </div>
    <div class="exp-item">
      <div class="exp-head">
        <span class="exp-role">Cyber Security Operations Analyst &mdash; Entry</span>
        <span class="exp-dates">Jan 2024 &mdash; Nov 2024</span>
      </div>
      <div class="exp-org">Equifax &middot; Mata Redonda, San Jos&eacute;</div>
      <ul class="plain-list">
        <li>Performed incident triage on 2,000+ security alerts; assessed severity and escalated validated threats</li>
        <li>Optimized SIEM rules and EDR detection parameters, improving detection precision and reducing false positives</li>
        <li>Developed automated incident response workflows on a SOAR platform to accelerate containment</li>
      </ul>
    </div>
    <div class="exp-item">
      <div class="exp-head">
        <span class="exp-role">Cyber Threat Detection Engineer &mdash; Intern</span>
        <span class="exp-dates">Jul 2023 &mdash; Dec 2023</span>
      </div>
      <div class="exp-org">Equifax &middot; Mata Redonda, San Jos&eacute;</div>
      <ul class="plain-list">
        <li>Analyzed security alerts and EDR telemetry to optimize detection logic, reducing false positive rates through iterative tuning</li>
        <li>Developed and validated EDR detection rules aligned to threat behaviors and attack patterns</li>
      </ul>
    </div>
  </div>

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
