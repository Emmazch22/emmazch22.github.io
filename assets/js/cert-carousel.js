(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var carousel = document.querySelector('.cert-carousel');
    if (!carousel) return;

    var track = carousel.querySelector('.cert-carousel-track');
    var slides = carousel.querySelectorAll('.cert-slide');
    var prevBtn = carousel.querySelector('.cert-carousel-prev');
    var nextBtn = carousel.querySelector('.cert-carousel-next');
    var dots = carousel.querySelectorAll('.cert-carousel-dot');
    if (!track || !slides.length) return;

    var index = 0;

    function render() {
      track.style.transform = 'translateX(-' + index * 100 + '%)';
      dots.forEach(function (dot, i) {
        dot.setAttribute('aria-selected', i === index ? 'true' : 'false');
      });
    }

    function goTo(i) {
      index = (i + slides.length) % slides.length;
      render();
    }

    if (prevBtn) prevBtn.addEventListener('click', function () { goTo(index - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { goTo(index + 1); });

    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () { goTo(i); });
    });

    carousel.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { goTo(index - 1); }
      else if (e.key === 'ArrowRight') { goTo(index + 1); }
    });

    var touchStartX = null;
    carousel.addEventListener('touchstart', function (e) {
      touchStartX = e.changedTouches[0].clientX;
    }, { passive: true });
    carousel.addEventListener('touchend', function (e) {
      if (touchStartX === null) return;
      var delta = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(delta) > 40) goTo(delta < 0 ? index + 1 : index - 1);
      touchStartX = null;
    }, { passive: true });

    render();
  });
})();
