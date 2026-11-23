window.addEventListener('lab-theme-change', () => {
  const theme = document.documentElement.dataset.theme;
  for (const card of document.querySelectorAll('#catalogue .box')) {
    if (theme === 'tech') card.setAttribute('data-augmented-ui', 'tl-clip tr-clip br-clip bl-clip border');
    else card.removeAttribute('data-augmented-ui');
    const image = card.querySelector('img[data-tech-label]');
    if (image) {
      image.alt = theme === 'tech' ? image.dataset.techLabel : image.dataset.paperLabel;
    }
  }
});
