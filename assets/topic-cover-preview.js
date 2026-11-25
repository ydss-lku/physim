// Load the film only when its card is inspected. One cover can play at a time.
(() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const isNight = () => document.documentElement.dataset.theme === 'tech';
  let active = null;

  function reset() {
    if (!active) return;
    const {layer} = active;
    active = null;
    if (layer instanceof HTMLVideoElement) layer.pause();
    layer.remove();
  }

  function inspect(card, still = reducedMotion.matches) {
    if (!isNight() || active?.card === card) return;
    reset();
    const figure = card.querySelector('figure');
    const image = figure.querySelector('img[data-cover]');
    const base = image.dataset.techSrc.replace(/\.webp$/, '');
    const layer = document.createElement(still ? 'img' : 'video');
    active = {card, layer};
    layer.className = 'topic-cover-preview';
    layer.setAttribute('aria-hidden', 'true');
    if (still) {
      layer.alt = '';
      layer.src = base + '-detail.webp';
      figure.append(layer);
      return;
    }
    layer.muted = true;
    layer.playsInline = true;
    layer.poster = image.dataset.techSrc;
    layer.src = base + '.mp4';
    figure.append(layer);
    function showStill() {
      if (active?.layer !== layer) return;
      reset();
      inspect(card, true);
    }
    layer.addEventListener('error', showStill, {once: true});
    layer.play().catch(showStill);
  }

  for (const image of document.querySelectorAll('#catalogue img[data-cover]')) {
    const card = image.closest('a');
    card.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'touch') inspect(card);
    });
    card.addEventListener('pointerleave', () => {
      if (active?.card === card && !card.matches(':focus-visible')) reset();
    });
    card.addEventListener('pointerdown', event => {
      if (event.pointerType === 'touch') inspect(card, true);
    });
    for (const type of ['pointerup', 'pointercancel']) {
      card.addEventListener(type, event => {
        if (event.pointerType === 'touch' && active?.card === card) reset();
      });
    }
    card.addEventListener('focus', () => {
      if (card.matches(':focus-visible')) inspect(card);
    });
    card.addEventListener('blur', () => {
      if (active?.card === card) reset();
    });
  }
  reducedMotion.addEventListener('change', () => {
    const card = active?.card;
    reset();
    if (card) inspect(card);
  });
  window.addEventListener('lab-theme-change', () => { if (!isNight()) reset(); });
  window.addEventListener('pagehide', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
})();
