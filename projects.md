---
layout: default
title: Projects
permalink: /projects/
---
<div class="page-head">
  <div class="page-prompt">$ ls ./projects</div>
  <h1 class="page-title">projects</h1>
  <p class="page-lede">Tools I've built for detection engineering, log parsing, and endpoint triage.</p>
</div>

<div class="card-grid">
  {% assign projects = site.projects | sort: 'order' %}
  {% for project in projects %}
  <a class="card" href="{{ project.url | relative_url }}">
    <div class="card-head">
      <span class="card-prompt">$</span>
      <span class="card-name">{{ project.title }}</span>
    </div>
    <p class="card-desc">{{ project.tagline }}</p>
    {% if project.stack %}
    <div class="card-tags">
      {% for item in project.stack %}<span class="tag">{{ item }}</span>{% endfor %}
    </div>
    {% endif %}
  </a>
  {% endfor %}
</div>
