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
    <div class="cert-carousel reveal" role="region" aria-roledescription="carousel" aria-label="Certifications" tabindex="0">
      <div class="cert-carousel-viewport">
        <ul class="cert-carousel-track">
          <li class="cert-slide" role="group" aria-roledescription="slide" aria-label="1 of 4">
            <a class="cert-slide-link" href="{{ '/assets/images/certifications/ecthp.jpg' | relative_url }}" target="_blank" rel="noopener">
              <img src="{{ '/assets/images/certifications/ecthp.jpg' | relative_url }}" alt="eCTHP certificate, Certified Threat Hunting Professional, awarded to Emmanuel Zúñiga" width="1980" height="1530" loading="lazy" decoding="async">
            </a>
            <div class="cert-slide-caption">
              <h3 class="cert-slide-title">eCTHP</h3>
              <p class="cert-slide-issuer">Certified Threat Hunting Professional &mdash; INE Security</p>
            </div>
          </li>
          <li class="cert-slide" role="group" aria-roledescription="slide" aria-label="2 of 4">
            <a class="cert-slide-link" href="{{ '/assets/images/certifications/pmrp.jpg' | relative_url }}" target="_blank" rel="noopener">
              <img src="{{ '/assets/images/certifications/pmrp.jpg' | relative_url }}" alt="PMRP certificate, Practical Malware Researcher Professional, awarded to Emmanuel Zuniga" width="1980" height="1530" loading="lazy" decoding="async">
            </a>
            <div class="cert-slide-caption">
              <h3 class="cert-slide-title">PMRP</h3>
              <p class="cert-slide-issuer">Practical Malware Researcher Professional &mdash; TCM Security</p>
            </div>
          </li>
          <li class="cert-slide" role="group" aria-roledescription="slide" aria-label="3 of 4">
            <a class="cert-slide-link" href="{{ '/assets/images/certifications/mcbta.jpg' | relative_url }}" target="_blank" rel="noopener">
              <img src="{{ '/assets/images/certifications/mcbta.jpg' | relative_url }}" alt="MCBTA certificate, Certified Multi-Cloud Blue Team Analyst, awarded to Emmanuel Zuniga" width="700" height="495" loading="lazy" decoding="async">
            </a>
            <div class="cert-slide-caption">
              <h3 class="cert-slide-title">MCBTA</h3>
              <p class="cert-slide-issuer">Certified Multi-Cloud Blue Team Analyst &mdash; CyberWarfare Labs</p>
            </div>
          </li>
          <li class="cert-slide" role="group" aria-roledescription="slide" aria-label="4 of 4">
            <a class="cert-slide-link" href="{{ '/assets/images/certifications/gcp-ace.jpg' | relative_url }}" target="_blank" rel="noopener">
              <img src="{{ '/assets/images/certifications/gcp-ace.jpg' | relative_url }}" alt="Google Cloud Associate Cloud Engineer certificate awarded to Emmanuel Zúñiga Chaves" width="1980" height="1530" loading="lazy" decoding="async">
            </a>
            <div class="cert-slide-caption">
              <h3 class="cert-slide-title">GCP ACE</h3>
              <p class="cert-slide-issuer">Google Cloud Associate Cloud Engineer</p>
            </div>
          </li>
        </ul>
      </div>
      <button type="button" class="cert-carousel-btn cert-carousel-prev" aria-label="Previous certification">&larr;</button>
      <button type="button" class="cert-carousel-btn cert-carousel-next" aria-label="Next certification">&rarr;</button>
      <div class="cert-carousel-dots" role="tablist" aria-label="Choose certification">
        <button type="button" class="cert-carousel-dot" role="tab" aria-selected="true" aria-label="Show slide 1: eCTHP"></button>
        <button type="button" class="cert-carousel-dot" role="tab" aria-selected="false" aria-label="Show slide 2: PMRP"></button>
        <button type="button" class="cert-carousel-dot" role="tab" aria-selected="false" aria-label="Show slide 3: MCBTA"></button>
        <button type="button" class="cert-carousel-dot" role="tab" aria-selected="false" aria-label="Show slide 4: GCP ACE"></button>
      </div>
    </div>
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
<script src="{{ '/assets/js/cert-carousel.js' | relative_url }}" defer></script>
