(function () {
  var STORAGE_KEY = 'writeup-lang';

  function applyLang(lang) {
    document.querySelectorAll('[data-lang]').forEach(function (el) {
      if (el.getAttribute('data-lang') === lang) {
        el.removeAttribute('hidden');
      } else {
        el.setAttribute('hidden', '');
      }
    });
    document.querySelectorAll('[data-lang-btn]').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-lang-btn') === lang);
    });
    document.querySelectorAll('[data-en][data-es]').forEach(function (el) {
      el.textContent = lang === 'es' ? el.getAttribute('data-es') : el.getAttribute('data-en');
    });
    document.documentElement.setAttribute('lang', lang);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var toggle = document.querySelector('.lang-toggle');
    if (!toggle) return;

    var stored = localStorage.getItem(STORAGE_KEY);
    var lang = stored === 'es' ? 'es' : 'en';
    applyLang(lang);

    toggle.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-lang-btn]');
      if (!btn) return;
      lang = btn.getAttribute('data-lang-btn');
      localStorage.setItem(STORAGE_KEY, lang);
      applyLang(lang);
    });
  });
})();
