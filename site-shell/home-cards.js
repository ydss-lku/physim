function syncHomeCards() {
  const theme = document.documentElement.dataset.theme;
  for (const card of document.querySelectorAll('#catalogue .box')) {
    if (theme === 'tech') card.setAttribute('data-augmented-ui', 'tl-clip tr-clip br-clip bl-clip border');
    else card.removeAttribute('data-augmented-ui');
    const image = card.querySelector('img[data-tech-label]');
    if (image) {
      const english = document.documentElement.dataset.language === 'en';
      image.alt = theme === 'tech'
        ? (english ? image.dataset.techLabelEn : image.dataset.techLabel)
        : (window.labLanguage?.label(image.dataset.paperLabel) ?? image.dataset.paperLabel);
    }
  }
}
window.addEventListener('lab-theme-change', syncHomeCards);
window.addEventListener('lab-language-change', syncHomeCards);
