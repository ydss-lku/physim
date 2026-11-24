// Usage: node site-shell/updating.mjs page.html "English name" "中文名稱"
// Run in the publication checkout. Restore the working simulation from version
// control when the update is ready. Preview pages have independent URLs.
import {readFileSync,writeFileSync} from 'node:fs';
const [page,en,zh]=process.argv.slice(2);
if(!/^[a-z0-9-]+\.html$/.test(page)||!en||!zh) throw Error('Supply a root simulation filename and both names.');
const source=readFileSync(page,'utf8');
function shell(name){
 const start='<!-- shared-'+name+' -->',end='<!-- /shared-'+name+' -->';
 const a=source.indexOf(start),b=source.indexOf(end);
 if(a<0||b<a) throw Error('Missing shared '+name);
 return source.slice(a,b+end.length);
}
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const english=esc(en),chinese=esc(zh);
writeFileSync(page,`<!doctype html>
<html lang="en" data-own-theme-css><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title data-en="${english} · Update in progress" data-zh="${chinese} · 更新進行中">${english} · Update in progress</title>
<meta property="og:title" content="${english} · 更新進行中"><meta name="description" content="Update in progress · 更新進行中">
<script src="assets/language-copy.js"></script><script src="assets/language.js?v=afd2e35"></script>
<link rel="stylesheet" href="assets/author-credit.css"><link rel="stylesheet" href="cyberpunk-assets/augmented-ui.min.css"><link rel="stylesheet" href="assets/simulation-updating.css">
</head><body><main><article class="notice"><div class="sheet"><header><span lang="en">${english}</span><small lang="zh-HK">${chinese}</small></header>
<h1><span lang="en">Update in progress</span><small lang="zh-HK">更新進行中</small></h1>
</div></article>${shell('footer')}</main>
<script src="site-shell/circuit-theme.js"></script>
${shell('navigation')}
<script>function frame(){const n=document.querySelector('.notice');if(document.documentElement.dataset.style==='tech')n.setAttribute('data-augmented-ui','tl-clip tr-clip br-clip bl-clip border');else n.removeAttribute('data-augmented-ui')}frame();window.addEventListener('lab-theme-change',frame);</script>
</body></html>`);
