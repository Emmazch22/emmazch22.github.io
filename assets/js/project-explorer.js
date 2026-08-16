(function () {
  var root = document.getElementById('explorer');
  if (!root) return;

  var list = root.querySelector('.explorer-list');
  var indicator = root.querySelector('.explorer-indicator');
  var items = Array.prototype.slice.call(root.querySelectorAll('.explorer-item'));
  var detail = root.querySelector('.explorer-detail');
  var panels = Array.prototype.slice.call(root.querySelectorAll('.explorer-panel'));
  if (!items.length || !panels.length) return;

  var active = 0;

  // Progressive enhancement: only claim tab/tabpanel semantics once JS
  // actually drives the panel switching. Without this, items are plain
  // links to each project's own page (still fully usable, no dead ends).
  list.setAttribute('role', 'tablist');
  list.setAttribute('aria-orientation', 'vertical');
  items.forEach(function (item, i) {
    var panelId = item.getAttribute('data-panel');
    item.setAttribute('role', 'tab');
    item.setAttribute('id', 'tab-' + i);
    item.setAttribute('aria-controls', panelId);
    item.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    item.setAttribute('tabindex', i === 0 ? '0' : '-1');
  });
  panels.forEach(function (panel, i) {
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', 'tab-' + i);
  });

  function moveIndicator(index) {
    var item = items[index];
    indicator.style.transform = 'translateY(' + item.offsetTop + 'px)';
    indicator.style.height = item.offsetHeight + 'px';
  }

  function showPanel(index) {
    var slug = items[index].getAttribute('data-panel');
    panels.forEach(function (panel) {
      panel.classList.toggle('is-active', panel.id === slug);
    });
    var next = panels.filter(function (p) { return p.id === slug; })[0];
    if (next && 'animate' in next) {
      next.animate(
        [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
      );
    }
  }

  function selectProject(index, opts) {
    index = Math.max(0, Math.min(items.length - 1, index));
    var focusItem = !opts || opts.focus !== false;
    if (index === active) {
      if (focusItem) items[index].focus();
      return;
    }
    items[active].classList.remove('is-active');
    items[active].setAttribute('aria-selected', 'false');
    items[active].setAttribute('tabindex', '-1');
    active = index;
    items[active].classList.add('is-active');
    items[active].setAttribute('aria-selected', 'true');
    items[active].setAttribute('tabindex', '0');
    moveIndicator(active);
    showPanel(active);
    if (focusItem) items[active].focus();
  }

  items.forEach(function (item, i) {
    item.addEventListener('click', function (e) {
      e.preventDefault();
      selectProject(i, { focus: false });
    });
  });

  list.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); selectProject(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); selectProject(active - 1); }
    else if (e.key === 'Home') { e.preventDefault(); selectProject(0); }
    else if (e.key === 'End') { e.preventDefault(); selectProject(items.length - 1); }
  });

  var wheelLock = false;
  list.addEventListener('wheel', function (e) {
    if (Math.abs(e.deltaY) < 4) return;
    e.preventDefault();
    if (wheelLock) return;
    wheelLock = true;
    selectProject(active + (e.deltaY > 0 ? 1 : -1), { focus: false });
    setTimeout(function () { wheelLock = false; }, 220);
  }, { passive: false });

  var touchStartX = null;
  detail.addEventListener('touchstart', function (e) {
    touchStartX = e.changedTouches[0].clientX;
  }, { passive: true });
  detail.addEventListener('touchend', function (e) {
    if (touchStartX === null) return;
    var dx = e.changedTouches[0].clientX - touchStartX;
    touchStartX = null;
    if (Math.abs(dx) < 40) return;
    selectProject(active + (dx < 0 ? 1 : -1), { focus: false });
  }, { passive: true });

  window.addEventListener('resize', function () { moveIndicator(active); });

  moveIndicator(0);
})();
