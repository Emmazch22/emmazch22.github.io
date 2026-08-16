---
layout: default
title: About
permalink: /about/
description: >-
  Cybersecurity Analyst specialized in threat hunting and detection
  engineering, currently protecting enterprise environments via MDR
  operations. Background, certifications, and stack.
---
<div class="page-head">
  <div class="page-prompt">$ cat ./about.md</div>
  <h1 class="page-title">about</h1>
</div>

<div class="about-body">

  <section class="about-hero reveal">
    <h2 class="about-name">Emmanuel Zúñiga</h2>
    <p class="about-role">Cybersecurity Analyst at SentinelOne</p>
    <p class="about-summary">
      Cybersecurity Analyst specialized in threat hunting and detection engineering.
      Currently protecting enterprise environments through MDR operations, while
      building security tooling and research projects focused on attacker behavior,
      detection logic, and incident correlation.
    </p>
    <div class="about-hero-actions">
      <a href="{{ '/assets/files/emmanuel-zuniga-resume.pdf' | relative_url }}" class="btn-primary" download>Download resume</a>
      <a href="mailto:emmanuel2202zch@gmail.com" class="btn-ghost">Get in touch</a>
    </div>
  </section>

  <section class="about-section">
    <h2 class="section-heading">Professional Journey</h2>
    <ol class="timeline">
      <li class="timeline-item reveal">
        <span class="timeline-year">2022</span>
        <p class="timeline-text">Started working in Security Operations.</p>
      </li>
      <li class="timeline-item reveal">
        <span class="timeline-year">2024</span>
        <p class="timeline-text">Cyber Security Operations Analyst &mdash; Equifax.</p>
      </li>
      <li class="timeline-item reveal">
        <span class="timeline-year">2025</span>
        <p class="timeline-text">Vigilance MDR Security Analyst &mdash; SentinelOne.</p>
      </li>
      <li class="timeline-item reveal">
        <span class="timeline-year">Today</span>
        <p class="timeline-text">Building detection engineering, threat hunting, and malware analysis projects.</p>
      </li>
    </ol>
  </section>

  <section class="about-section">
    <h2 class="section-heading">What I Focus On</h2>
    <div class="focus-grid">
      <article class="focus-card reveal">
        <h3 class="focus-card-title">Threat Hunting</h3>
        <p class="focus-card-desc">Investigating attacker behavior through endpoint, network, and log telemetry.</p>
      </article>
      <article class="focus-card reveal">
        <h3 class="focus-card-title">Detection Engineering</h3>
        <p class="focus-card-desc">Designing detection logic mapped to MITRE ATT&amp;CK techniques.</p>
      </article>
      <article class="focus-card reveal">
        <h3 class="focus-card-title">MDR Operations</h3>
        <p class="focus-card-desc">Monitoring, triaging, and responding to threats across enterprise environments.</p>
      </article>
      <article class="focus-card reveal">
        <h3 class="focus-card-title">Malware Analysis</h3>
        <p class="focus-card-desc">Analyzing malicious activity to understand execution patterns and defensive opportunities.</p>
      </article>
    </div>
  </section>

  {% assign featured = site.projects | where: "slug", "sysmon-hunter" | first %}
  {% if featured %}
  <section class="about-section">
    <h2 class="section-heading">Featured Project</h2>
    <article class="featured-card reveal">
      <div class="featured-card-head">
        <h3 class="featured-card-title">{{ featured.title }}</h3>
        {% if featured.status %}<span class="explorer-item-status status-{{ featured.status | slugify }}">{{ featured.status }}</span>{% endif %}
      </div>
      <p class="featured-card-desc">A detection and correlation engine designed for Sysmon telemetry that reconstructs process activity, maps detections to MITRE ATT&amp;CK techniques, and groups related events into actionable incidents.</p>
      <ul class="featured-card-capabilities">
        <li>Real-time event ingestion</li>
        <li>ATT&amp;CK-mapped detection rules</li>
        <li>ProcessGuid correlation</li>
        <li>Incident reconstruction</li>
        <li>SOC-focused investigation workflow</li>
      </ul>
      <div class="featured-card-cta">
        <a href="{{ featured.url | relative_url }}" class="btn-primary">View Project</a>
        {% if featured.repo_url %}<a href="{{ featured.repo_url }}" target="_blank" rel="noopener" class="btn-ghost">Repository &rarr;</a>{% endif %}
      </div>
    </article>
  </section>
  {% endif %}

  <section class="about-section">
    <h2 class="section-heading">Beyond the SOC</h2>
    <p>
      Outside of day-to-day MDR operations, I enjoy building detection tools,
      researching attacker tradecraft, and analyzing malware behavior to better
      understand how threats evolve and how defenders can respond more effectively.
    </p>
  </section>

  <section class="about-section">
    <h2 class="section-heading">Certifications</h2>
    <ul class="plain-list">
      <li>eCTHP &mdash; eLearnSecurity Certified Threat Hunting Professional</li>
      <li>PMRP &mdash; Practical Malware Researcher Professional</li>
      <li>MCBTA &mdash; Multi-Cloud Blue Team Analyst</li>
      <li>GCP ACE &mdash; Google Cloud Associate Cloud Engineer</li>
    </ul>
  </section>

  <section class="about-section">
    <h2 class="section-heading">Stack</h2>
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
  </section>

  <section class="about-section">
    <h2 class="section-heading">Contact</h2>
    <p>
      <a href="mailto:emmanuel2202zch@gmail.com">emmanuel2202zch@gmail.com</a>
      <span class="contact-sep" aria-hidden="true">&middot;</span>
      <a href="{{ '/assets/files/emmanuel-zuniga-resume.pdf' | relative_url }}" download>Download resume</a>
    </p>
  </section>

</div>

<script src="{{ '/assets/js/reveal.js' | relative_url }}" defer></script>
