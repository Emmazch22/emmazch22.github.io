---
layout: default
title: Projects
permalink: /projects/
description: >-
  Detection engineering tooling built and maintained by Emmanuel Zúñiga,
  including sysmon-hunter, a real-time Sysmon detection and correlation
  engine with a live analyst console.
---
<div class="page-head">
  <div class="page-prompt">$ ls ./projects</div>
  <h1 class="page-title">projects</h1>
  <p class="page-lede">Detection engineering tooling I build and maintain — starting with sysmon-hunter, a real-time Sysmon detection and correlation engine with a live analyst console.</p>
</div>

{% assign projects = site.projects | sort: 'order' %}
{% assign total = projects.size %}
<div class="explorer" id="explorer">
  <nav class="explorer-nav" aria-label="Projects">
    <div class="explorer-nav-head">
      <span class="explorer-prompt">$ ls ./projects</span>
      <span class="explorer-count">{{ total }} found</span>
    </div>
    <div class="explorer-list">
      <div class="explorer-indicator" aria-hidden="true"></div>
      {% for project in projects %}
      <a class="explorer-item{% if forloop.first %} is-active{% endif %}"
         href="{{ project.url | relative_url }}"
         data-index="{{ forloop.index0 }}"
         data-panel="panel-{{ project.slug }}">
        <span class="explorer-item-marker" aria-hidden="true">&gt;</span>
        <span class="explorer-item-body">
          <span class="explorer-item-name">{{ project.title }}</span>
          <span class="explorer-item-meta">
            {% if project.category %}<span class="explorer-item-cat">{{ project.category }}</span>{% endif %}
            {% if project.status %}<span class="explorer-item-status status-{{ project.status | slugify }}">{{ project.status }}</span>{% endif %}
          </span>
        </span>
      </a>
      {% endfor %}
    </div>
  </nav>

  <div class="explorer-detail">
    {% for project in projects %}
    <article class="explorer-panel{% if forloop.first %} is-active{% endif %}"
              id="panel-{{ project.slug }}"
              data-index="{{ forloop.index0 }}">
      <div class="explorer-panel-head">
        <h2 class="explorer-panel-title">{{ project.title }}</h2>
        {% if project.status %}<span class="explorer-item-status status-{{ project.status | slugify }}">{{ project.status }}</span>{% endif %}
      </div>
      <p class="explorer-panel-tagline">{{ project.tagline }}</p>

      {% if project.achievements %}
      <div class="explorer-panel-section">
        <h3 class="explorer-panel-label">Achievements</h3>
        <ul class="plain-list">
          {% for item in project.achievements %}<li>{{ item }}</li>{% endfor %}
        </ul>
      </div>
      {% endif %}

      {% if project.stack %}
      <div class="explorer-panel-section">
        <h3 class="explorer-panel-label">Stack</h3>
        <p class="explorer-panel-stack">
          {% for item in project.stack %}<span>{{ item }}</span>{% endfor %}
        </p>
      </div>
      {% endif %}

      <div class="explorer-panel-links">
        {% if project.repo_url %}<a class="project-link" href="{{ project.repo_url }}" target="_blank" rel="noopener">View Repository &rarr;</a>{% endif %}
        {% if project.demo_url %}<a class="project-link" href="{{ project.demo_url }}" target="_blank" rel="noopener">Live Demo &rarr;</a>{% endif %}
        <a class="project-link project-link-ghost" href="{{ project.url | relative_url }}">Full Write-up &rarr;</a>
      </div>
    </article>
    {% endfor %}
  </div>
</div>

<script src="{{ '/assets/js/project-explorer.js' | relative_url }}" defer></script>
