// Usage: node site-shell/updating.mjs page.html "English name" "中文名稱"
// Run in the publication checkout. Restore the working simulation from version
// control when the update is ready. Preview pages have independent URLs.
import {readFileSync,writeFileSync} from 'node:fs';
const [page,en,zh]=process.argv.slice(2);
if(!/^[a-z0-9-]+\.html$/.test(page)||!en||!zh) throw Error('Supply a root simulation filename and both names.');
const source=readFileSync(page,'utf8');
// Keep the host page, its theme bootstrap, layout and shared shell intact.
const main=/<main\b[^>]*>/i.exec(source);
const footer=source.indexOf('<!-- shared-footer -->');
if(!main || footer<main.index || footer>source.indexOf('</main>',main.index))
 throw Error('Expected a shared footer inside main. Add explicit notice boundaries for this layout.');
if(source.includes('id="simulation-update"')) throw Error('Update notice already installed.');
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const notice=`<article id="simulation-update" class="notice"><div class="sheet"><header><span lang="en">${esc(en)}</span><small lang="zh-HK">${esc(zh)}</small></header>
<h1 data-no-share><span lang="en">Update in progress</span><small lang="zh-HK">更新進行中</small></h1></div></article>`;
const start=main.index+main[0].length;
const updated=source.slice(0,start)+notice+'<div hidden inert style="display:none">'+source.slice(start,footer)+'</div>'+source.slice(footer);
const frame=`<script>(()=>{const n=document.getElementById('simulation-update');function frame(){if(document.documentElement.dataset.style==='tech')n.setAttribute('data-augmented-ui','tl-clip tr-clip br-clip bl-clip border');else n.removeAttribute('data-augmented-ui')}frame();window.addEventListener('lab-theme-change',frame)})();</script>`;
writeFileSync(page,updated.replace('</head>','<link rel="stylesheet" href="assets/simulation-updating.css?v=2"></head>').replace('</body>',frame+'</body>').replace(/assets\/language\.js(?:\?[^"]*)?"/,'assets/language.js?v=notice1"'));
