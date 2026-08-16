---
layout: default
title: Writeups
permalink: /writeups/
description: >-
  Threat hunts, detection engineering breakdowns, and phishing/malware
  campaign analysis from real-world investigations.
---
<div class="page-head">
  <div class="page-prompt">$ ls ./writeups</div>
  <h1 class="page-title">writeups</h1>
  <p class="page-lede">Threat hunts, detection walkthroughs, and CVE analysis.</p>
</div>

<div class="post-list">
  {% for post in site.posts %}
  <a class="post-row" href="{{ post.url | relative_url }}">
    <time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: "%Y-%m-%d" }}</time>
    <span class="post-row-title">{{ post.title }}</span>
    {% if post.severity %}<span class="severity severity-{{ post.severity | downcase }}">{{ post.severity }}</span>{% endif %}
  </a>
  {% endfor %}
</div>
