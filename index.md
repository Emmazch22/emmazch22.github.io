---
layout: home
title: Home
hero_name: Emmanuel Zúñiga
tagline: "Cybersecurity Analyst — Detection & Threat Hunting"
intro: >-
  I build detection logic and hunt for adversary behavior across endpoint,
  network, and cloud telemetry — turning raw log noise into reliable signal.
cta_text: view projects
cta_url: /projects/
---

<section class="featured-projects" aria-labelledby="featured-projects-heading">
  <div class="section-head">
    <span class="section-prompt">$ ls ./projects --featured</span>
    <h2 id="featured-projects-heading" class="section-heading">Featured Projects</h2>
  </div>

  {% assign featured = site.projects | sort: 'order' %}
  <div class="project-grid">
    {% for project in featured %}
    <article class="project-card">
      <div class="project-card-head">
        <span class="project-card-icon" aria-hidden="true">&gt;_</span>
        <h3 class="project-card-title">{{ project.title }}</h3>
        {% if project.status %}<span class="explorer-item-status status-{{ project.status | slugify }}">{{ project.status }}</span>{% endif %}
      </div>
      <p class="project-card-desc">{{ project.tagline }}</p>
      {% if project.stack %}
      <div class="project-card-tags">
        {% for item in project.stack limit:6 %}<span class="tag">{{ item }}</span>{% endfor %}
      </div>
      {% endif %}
      <div class="project-card-links">
        <a href="{{ project.url | relative_url }}" class="project-link">full write-up &rarr;</a>
        {% if project.repo_url %}<a href="{{ project.repo_url }}" target="_blank" rel="noopener" class="project-link project-link-ghost">repo &rarr;</a>{% endif %}
      </div>
    </article>
    {% endfor %}
  </div>

  <a href="{{ '/projects/' | relative_url }}" class="section-more">view all projects &rarr;</a>
</section>
