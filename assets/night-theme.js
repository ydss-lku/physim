function requestedLabTheme(){
 const requested=new URL(location.href).searchParams.get('theme');
 if(requested==='tech'||requested==='paper')return requested;
 try{return localStorage.getItem('yd-physics-theme')==='paper'?'paper':'tech'}catch{return 'tech'}
}
document.documentElement.dataset.theme=document.documentElement.dataset.style=requestedLabTheme();

function installThemes(host,root,menuButton){

 const nav=root.querySelector('nav'),group=document.createElement('div');group.className='themes';group.setAttribute('role','group');group.setAttribute('aria-label','Visual style / 顯示風格');
 for(const [value,en,zh] of [['paper','Origami','摺紙風'],['tech','Night','黑夜']]){
  const button=document.createElement('button');button.type='button';button.dataset.theme=value;button.innerHTML=en+'<small lang="zh-HK">'+zh+'</small>';group.append(button);
 }
 nav.insertBefore(group,menuButton);
 const css=document.createElement('style');css.textContent=`
 nav{flex-wrap:wrap}.themes{margin-left:auto;display:flex;gap:2px;background:#e5decf;padding:3px;border-radius:8px}
 .themes button{min-width:62px;background:transparent;color:#314737;padding:3px 8px;font-weight:650}.themes small{display:block;font:12px/1.25 system-ui}
 .themes button[aria-pressed=true]{color:white;background:#315340}

 button:focus-visible,a:focus-visible{outline:3px solid #c57a19;outline-offset:2px}
 @media(max-width:440px){nav{gap:4px;padding:5px}nav a,nav>button{font-size:12px;padding:7px 4px}.themes button{font-size:12px;min-width:46px}}

`;root.append(css);
 const navSkin=document.createElement('link');
 navSkin.rel='stylesheet';navSkin.href=document.documentElement.dataset.page === 'index' ? 'site-shell/home-navigation.css' : 'assets/night-lab-nav.css';root.append(navSkin);

 const key='yd-physics-theme';
 function syncLinks(){
  for(const container of [document,root])for(const a of container.querySelectorAll('a[href]')){
   const u=new URL(a.getAttribute('href'),document.baseURI);
   if(u.origin===location.origin&&/\.html$/i.test(u.pathname)){
    u.searchParams.set('theme',host.dataset.theme||'paper');
    if(a.href!==u.href)a.href=u.href;
   }
  }
 }
 function remember(theme){try{localStorage.setItem(key,theme)}catch{}try{const u=new URL(location.href);u.searchParams.set('theme',theme);history.replaceState(null,'',u)}catch{}}
 function apply(value){
  const theme=value==='paper'?'paper':'tech';document.documentElement.dataset.theme=theme;document.documentElement.dataset.style=theme;host.dataset.theme=theme;
  for(const img of document.querySelectorAll('img[data-paper-src][data-tech-src]')){const src=theme==='tech'?img.dataset.techSrc:img.dataset.paperSrc;if(img.getAttribute('src')!==src)img.src=src;}
  for(const b of group.children)b.setAttribute('aria-pressed',String(b.dataset.theme===theme));
  remember(theme);syncLinks();window.dispatchEvent(new Event('lab-theme-change'));
 }
 function restore(){apply(requestedLabTheme())}
 restore();window.addEventListener('pageshow',restore);
 group.onclick=e=>{const b=e.target.closest('button');if(b)apply(b.dataset.theme)};
 window.addEventListener('storage',e=>{if(e.key===key)apply(e.newValue)});
 for(const name of ['click','auxclick','contextmenu'])document.addEventListener(name,syncLinks,true);
 const observer=new MutationObserver(records=>{
  if(records.some(record=>[...record.addedNodes].some(el=>el.nodeType===1&&(el.matches('a[href]')||el.querySelector('a[href]')))))syncLinks();
 });
 for(const container of [document.body,root])observer.observe(container,{childList:true,subtree:true});
}
