import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const site = fileURLToPath(new URL('../', import.meta.url));
const mime = { '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.png': 'image/png' };
const encode = (type, data) => 'data:' + type + ';base64,' + Buffer.from(data).toString('base64');

function stylesheet(path) {
  const file = resolve(site, path);
  const css = readFileSync(file, 'utf8').replace(/url\((["']?)([^)'"]+)\1\)/g, (match, quote, ref) => {
    if (/^(data:|#)/.test(ref)) return match;
    const type = mime[extname(ref)];
    if (!type) throw Error('Unknown asset type ' + ref);
    return 'url("' + encode(type, readFileSync(resolve(dirname(file), ref))) + '")';
  });
  return encode('text/css', css);
}

let html = readFileSync(resolve(site, 'newton-second-law.html'), 'utf8');
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, href) =>
  '<link rel="stylesheet" data-source="' + href + '" href="' + stylesheet(href) + '">');
html = html.replace(/<script( defer)? src="([^"]+)"><\/script>/g, (_, defer, src) => {
  let js = readFileSync(resolve(site, src.split('?')[0]), 'utf8');
  if (src === 'assets/night-collection.js') js = js.replace('link[href=', 'link[data-source=');
  if (src === 'assets/night-theme.js') js = js.replace("'assets/night-lab-nav.css'", JSON.stringify(stylesheet('assets/night-lab-nav.css')));
  return '<script' + (defer || '') + ' src="' + encode('text/javascript', js) + '"></script>';
});
writeFileSync(process.argv[2], html);
