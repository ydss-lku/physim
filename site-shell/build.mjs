import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const footer = read('./footer.html').trim();
const navigation = '<script>\n' + read('./navigation.js').trim() + '\n</script>';

function fill(html, name, content) {
  const start = '<!-- shared-' + name + ' -->';
  const end = '<!-- /shared-' + name + ' -->';
  const parts = html.split(start);
  if (parts.length !== 2 || html.split(end).length !== 2 || !parts[1].includes(end)) {
    throw Error('Missing or duplicate template markers for ' + name);
  }
  return parts[0] + start + '\n' + content + '\n' + end + parts[1].split(end)[1];
}

for (const page of readdirSync(new URL('../', import.meta.url)).filter(name => name.endsWith('.html')).concat('preview/luo-hao-quiz-2.html')) {
  const file = new URL('../' + page, import.meta.url);
  const original = readFileSync(file, 'utf8');
  if (!original.includes('<!-- shared-navigation -->')) continue;
  const home = page === 'index.html';
  const homeSetup = '<script src="assets/night-theme.js"></script>\n<script>\n' + read('./home-cards.js') + '</script>\n';
  let html = fill(original, 'navigation', (home ? homeSetup : '') + navigation);
  const footerClass = original.match(/<!-- footer-class: ([\w -]+) -->/)?.[1];
  html = fill(html, 'footer', footerClass ? footer.replace('<footer ', '<footer class="' + footerClass + '" ') : footer);
  if (original !== html) writeFileSync(file, html);
}

