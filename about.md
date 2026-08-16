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

  <section class="about-hero reveal">
    <h2 class="about-name">Emmanuel Zúñiga</h2>
    <p class="about-role">Cybersecurity Analyst at SentinelOne</p>
    <div class="about-focus">
      <span>Threat Hunting</span>
      <span class="about-focus-sep" aria-hidden="true">|</span>
      <span>Detection Engineering</span>
      <span class="about-focus-sep" aria-hidden="true">|</span>
      <span>Malware Analysis</span>
    </div>
    <p class="about-summary">
      Cybersecurity Analyst with experience in MDR operations, threat hunting, detection
      engineering, and malware analysis. Currently working at SentinelOne, focusing on
      large-scale investigations, threat detection, and security operations.
    </p>
    <div class="about-hero-actions">
      <a href="{{ '/assets/files/emmanuel-zuniga-resume.pdf' | relative_url }}" class="btn-primary" download>Download resume</a>
      <a href="mailto:emmanuel2202zch@gmail.com" class="btn-ghost">Get in touch</a>
    </div>
  </section>

  <section class="about-section">
    <div class="section-head">
      <span class="section-prompt">$ cat ./career.log</span>
      <h2 class="section-heading">Professional Timeline</h2>
    </div>
    <ol class="timeline">
      <li class="timeline-item reveal">
        <span class="timeline-year">2022</span>
        <p class="timeline-text">Entered the cybersecurity industry.</p>
      </li>
      <li class="timeline-item reveal">
        <span class="timeline-year">2024</span>
        <p class="timeline-text">Joined Equifax as Cyber Security Operations Analyst.</p>
      </li>
      <li class="timeline-item reveal">
        <span class="timeline-year">2025</span>
        <p class="timeline-text">Joined SentinelOne MDR.</p>
      </li>
      <li class="timeline-item reveal">
        <span class="timeline-year">Present</span>
        <p class="timeline-text">Building personal detection engineering and malware analysis projects.</p>
      </li>
    </ol>
  </section>

  {% assign featured = site.projects | where: "slug", "sysmon-hunter" | first %}
  {% if featured %}
  <section class="about-section">
    <div class="section-head">
      <span class="section-prompt">$ ls ./projects --pinned</span>
      <h2 class="section-heading">Featured Project</h2>
    </div>
    <article class="featured-card reveal">
      <div class="featured-card-head">
        <h3 class="featured-card-title">{{ featured.title }}</h3>
        {% if featured.status %}<span class="explorer-item-status status-{{ featured.status | slugify }}">{{ featured.status }}</span>{% endif %}
      </div>
      <p class="featured-card-desc">A real-time Windows detection and correlation engine built around Sysmon telemetry, ATT&amp;CK-mapped detections, process correlation, and SOC-style investigations.</p>
      <div class="featured-card-badges">
        <span class="tag">Sysmon</span>
        <span class="tag">MITRE ATT&amp;CK</span>
        <span class="tag">Detection Engineering</span>
        <span class="tag">Malware Analysis</span>
        <span class="tag">Threat Hunting</span>
      </div>
      <div class="featured-card-cta">
        <a href="{{ featured.url | relative_url }}" class="btn-primary">View Project</a>
        {% if featured.repo_url %}<a href="{{ featured.repo_url }}" target="_blank" rel="noopener" class="btn-ghost">Repository &rarr;</a>{% endif %}
      </div>
    </article>
  </section>
  {% endif %}

  <section class="about-section">
    <div class="section-head">
      <span class="section-prompt">$ cat ./highlights.txt</span>
      <h2 class="section-heading">Professional Highlights</h2>
    </div>
    <div class="metrics-grid">
      <div class="metric-card reveal">
        <span class="metric-value" data-count="3" data-suffix="+">0</span>
        <span class="metric-label">Years Experience</span>
      </div>
      <div class="metric-card reveal">
        <span class="metric-icon" aria-hidden="true">&gt;_</span>
        <span class="metric-label">MDR Operations</span>
      </div>
      <div class="metric-card reveal">
        <span class="metric-icon" aria-hidden="true">&gt;_</span>
        <span class="metric-label">Threat Hunting</span>
      </div>
      <div class="metric-card reveal">
        <span class="metric-icon" aria-hidden="true">&gt;_</span>
        <span class="metric-label">Detection Engineering</span>
      </div>
      <div class="metric-card reveal">
        <span class="metric-icon" aria-hidden="true">&gt;_</span>
        <span class="metric-label">Malware Analysis</span>
      </div>
      <div class="metric-card reveal">
        <span class="metric-icon" aria-hidden="true">&gt;_</span>
        <span class="metric-label">Security Investigations</span>
      </div>
    </div>
  </section>

  <section class="about-section">
    <div class="section-head">
      <span class="section-prompt">$ whoami</span>
      <h2 class="section-heading">About Me</h2>
    </div>
    <p>
      My interest in security started with wanting to understand how systems actually
      break &mdash; not just how to defend them, but how an attacker thinks, pivots, and
      hides. That curiosity turned into a habit of pulling apart malware samples,
      replaying attack chains, and asking what a detection would need to see to catch
      them.
    </p>
    <p>
      Outside of work I keep building &mdash; mostly detection engineering and malware
      analysis tooling like <a href="{{ '/projects/' | relative_url }}">Sysmon Hunter</a>
      &mdash; and writing up interesting hunts and CVE research in
      <a href="{{ '/writeups/' | relative_url }}">writeups</a>. I treat the field as
      something to keep learning, one investigation at a time.
    </p>
  </section>

  <section class="about-section">
    <div class="section-head">
      <span class="section-prompt">$ cat ./certifications.txt</span>
      <h2 class="section-heading">Certifications</h2>
    </div>
    <ul class="plain-list">
      <li>eCTHP &mdash; eLearnSecurity Certified Threat Hunting Professional</li>
      <li>PMRP &mdash; Practical Malware Researcher Professional</li>
      <li>MCBTA &mdash; Multi-Cloud Blue Team Analyst</li>
      <li>GCP ACE &mdash; Google Cloud Associate Cloud Engineer</li>
    </ul>
  </section>

  <section class="about-section">
    <div class="section-head">
      <span class="section-prompt">$ cat ./stack.txt</span>
      <h2 class="section-heading">Stack</h2>
    </div>
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
    <div class="section-head">
      <span class="section-prompt">$ cat ./contact.txt</span>
      <h2 class="section-heading">Contact</h2>
    </div>
    <p>
      <a href="mailto:emmanuel2202zch@gmail.com">emmanuel2202zch@gmail.com</a>
    </p>
  </section>

  <section class="about-section">
    <div class="section-head">
      <span class="section-prompt">$ ./resume.sh --download</span>
      <h2 class="section-heading">Resume</h2>
    </div>
    <p>
      <a href="{{ '/assets/files/emmanuel-zuniga-resume.pdf' | relative_url }}" download>emmanuel-zuniga-resume.pdf</a>
    </p>
  </section>

</div>

<script>
(function () {
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function runCounter(el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    var suffix = el.getAttribute('data-suffix') || '';
    if (reduced || !target) { el.textContent = target + suffix; return; }
    var start = null;
    var duration = 700;
    function step(ts) {
      if (start === null) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      el.textContent = Math.round(progress * target) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  var counters = Array.prototype.slice.call(document.querySelectorAll('.metric-value[data-count]'));

  if (reduced || !('IntersectionObserver' in window)) {
    counters.forEach(runCounter);
    return;
  }

  revealEls.forEach(function (el) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(12px)';
  });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.style.opacity = '';
      entry.target.style.transform = '';
      if (entry.target.classList.contains('metric-card')) {
        var counter = entry.target.querySelector('.metric-value[data-count]');
        if (counter) runCounter(counter);
      }
      io.unobserve(entry.target);
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -40px 0px' });

  revealEls.forEach(function (el) { io.observe(el); });
})();
</script>
