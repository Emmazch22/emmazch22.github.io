(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var trigger = document.getElementById('contact-trigger');
    var overlay = document.getElementById('contact-modal-overlay');
    var modal = document.getElementById('contact-modal');
    var closeBtn = document.getElementById('contact-modal-close');
    var copyBtn = document.getElementById('contact-modal-copy');
    if (!trigger || !overlay || !modal || !closeBtn || !copyBtn) return;

    var lastFocused = null;

    function focusableEls() {
      return modal.querySelectorAll('button, a[href]');
    }

    function openModal() {
      lastFocused = document.activeElement;
      overlay.hidden = false;
      document.body.classList.add('modal-open');
      closeBtn.focus();
      document.addEventListener('keydown', onKeydown);
    }

    function closeModal() {
      overlay.hidden = true;
      document.body.classList.remove('modal-open');
      document.removeEventListener('keydown', onKeydown);
      if (lastFocused) lastFocused.focus();
    }

    function onKeydown(e) {
      if (e.key === 'Escape') {
        closeModal();
        return;
      }
      if (e.key === 'Tab') {
        var els = focusableEls();
        var first = els[0];
        var last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    trigger.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });

    copyBtn.addEventListener('click', function () {
      var email = copyBtn.getAttribute('data-email');
      var originalText = copyBtn.textContent;

      function showCopied() {
        copyBtn.textContent = 'Copied!';
        setTimeout(function () {
          copyBtn.textContent = originalText;
        }, 1800);
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(showCopied, function () {
          fallbackCopy(email, showCopied);
        });
      } else {
        fallbackCopy(email, showCopied);
      }
    });

    function fallbackCopy(text, done) {
      var textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        done();
      } catch (err) {
        /* clipboard unavailable; user can still select the email text manually */
      }
      document.body.removeChild(textarea);
    }
  });
})();
