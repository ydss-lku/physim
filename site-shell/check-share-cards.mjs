import { readFileSync, statSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const read = file => readFileSync(new URL(file, root), 'utf8');
const nav = read('site-shell/navigation.js');
const catalog = nav.match(/\bconst data\s*=\s*(\[[\s\S]*?\])\s*,\s*file\s*=/);
if (!catalog) throw Error('Cannot read simulation list from site-shell/navigation.js');
const pages = new Set(JSON.parse(catalog[1]).flatMap(([, , groups]) =>
  groups.flatMap(([, entries]) => entries.map(([page]) => page))));
for (const page of process.argv.slice(2)) pages.add(page);
const base = 'https://ydss-lku.github.io/physim/';
let failed = 0;
for (const page of pages) {
  try {
    const head = read(page).split(/<\/head>/i)[0].replace(/<!--[\s\S]*?-->/g, '');
    const tags = new Map();
    for (const tag of head.match(/<meta\b[^>]*>/gi) || []) {
      const attrs = Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)].map(m => [m[1].toLowerCase(),m[3]]));
      tags.set(attrs.property || attrs.name, attrs.content?.trim());
    }
    for (const key of ['og:title', 'og:description', 'og:image']) {
      if (!tags.get(key)) throw Error('Missing ' + key);
    }
    const image = tags.get('og:image');
    if (!image.startsWith(base + 'assets/share/') || !statSync(new URL(image.slice(base.length),root)).isFile())
      throw Error('Missing local share card for ' + image);
  } catch (error) {
    console.error(page + ': ' + error.message);
    failed++;
  }
}
console.log(pages.size + ' simulation pages checked; ' + failed + ' need attention.');
process.exitCode = failed ? 1 : 0;
