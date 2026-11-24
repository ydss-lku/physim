(() => {
  'use strict';
  const key = 'yd-physics-language';
  const html = document.documentElement;
  const han = /[\u3400-\u9fff]/;
  const prose = /[A-Za-z]{2,}|[\u3400-\u9fff]/;
  const original = new WeakMap();
  const originalsByAttribute = new WeakMap();
  const copy = window.labVocabulary;
  const translated = new Map(copy.map(([en, zh]) => [en, zh]));
  const english = new Map(copy.map(([en, zh]) => [zh, en]));
  const roots = [];
  let language = 'en';
  try { if (localStorage.getItem(key) === 'zh-HK') language = 'zh-HK'; } catch {}
  const pick = (en, zh) => language === 'en' ? en : zh;
  function publishLanguage() {
    html.lang = language;
    html.dataset.language = language;
  }
  publishLanguage();

  // A number of the original lab renderers store both captions in one string.
  // Split at the language boundary, preserving scientific symbols and units.
  function halves(text) {
    if (!han.test(text) || !/[a-z]/i.test(text)) return;
    const boundaries = [...text.matchAll(/(?:\s+[/|·;｜]\s*|\s*[\n　／]+\s*|;\s+|\s+\()/g)];
    for (const match of boundaries.reverse()) {
      const a = text.slice(0, match.index).trim();
      const b = text.slice(match.index + match[0].length).trim().replace(match[0].endsWith('(') ? /\)$/ : /$^/, '');
      if (!han.test(a) && han.test(b) && /[a-z]/i.test(a) && !/^[A-Z]+\d+$/.test(a)) return [a,b];
      if (han.test(a) && !han.test(b) && /[a-z]{2}/i.test(b)) return [b,a];
    }
    const m = text.match(/^(.+?)\s+([\u3400-\u9fff].*)$/s);
    if (m && !han.test(m[1]) && /[a-z]{2}/i.test(m[1])) return [m[1],m[2]];
  }
  function label(raw) {
    const text = String(raw).trim();
    if (translated.has(text)) return pick(text, translated.get(text));
    if (english.has(text)) return pick(english.get(text), text);
    const dynamic = window.labFormatLanguage?.(text, pick);
    if (dynamic !== undefined) return dynamic;
    const pair = halves(text);
    return pair ? pick(...pair) : text;
  }
  window.labLanguage = { pick, label, get current() { return language; } };
  function source(node) {
    const previous = original.get(node);
    return previous && node.data === previous.rendered ? previous.source : node.data;
  }
  function content(el) {
    return Array.from(el.childNodes).filter(n => n.nodeType === 3).map(source).join('').trim();
  }
  function explicit(el) {
    const lang = el.getAttribute('lang');
    if (lang === 'en' || el.classList.contains('en')) return 'en';
    if (lang?.startsWith('zh') || ['zh','bi-zh','night-zh'].some(c => el.classList.contains(c))) return 'zh-HK';
  }
  const painted = new WeakMap();
  function mark(el, lang) {
    if (el.dataset.copyLanguage !== lang) el.dataset.copyLanguage = lang;
    painted.set(el,lang);
  }
  function writeText(node, raw, value) {
    const rendered = value === raw.trim() ? raw : value ? raw.replace(/\S[\s\S]*\S|\S/, () => value) : '';
    if (rendered !== node.data) node.data = rendered;
    original.set(node, {source:raw,rendered});
  }
  const attrNames = ['title','aria-label','alt','placeholder','aria-description','aria-valuetext'];
  function attributes(el) {
    for (const name of attrNames) {
      const value = el.getAttribute(name);
      if (!value) continue;
      let saved = originalsByAttribute.get(el);
      if (!saved) originalsByAttribute.set(el, saved = {});
      const raw = saved[name]?.rendered === value ? saved[name].source : value;
      const rendered = label(raw);
      if (value !== rendered) el.setAttribute(name,rendered);
      saved[name] = {source:raw, rendered};
    }
  }
  const inline = 'span,small,b,strong,i,em,sub,sup,br,p,h1,h2,h3,tspan';
  function render(el, inherited) {
    if (el.matches('[data-lab-localized],script,style,noscript,template,[data-language-switch],.control-glyph')) return;
    attributes(el);
    if (el.matches('option') && !el.hasAttribute('value')) el.value = el.textContent;
    const own = explicit(el) || inherited;
    const children = [...el.children];
    const texts = [...el.childNodes].filter(n => n.nodeType === 3 && source(n).trim());
    const englishSibling = texts.some(n=>!han.test(source(n)) && /[a-z]{2}/i.test(source(n)));
    const chineseSibling = texts.some(n=>han.test(source(n)) && !halves(source(n).trim()));
    const secondaries = children.filter(child => {
      if (child.hasAttribute('data-language-switch')) return false;
      if (explicit(child) === 'zh-HK') return true;
      if (!child.matches('small,span') || child.children.length || !han.test(content(child)) || halves(content(child))) return false;
      return englishSibling || children.some(other => other !== child && (explicit(other) === 'en' || (!han.test(content(other)) && /[a-z]{2}/i.test(content(other)))));
    });
    const hasPair = secondaries.length > 0 && el !== document.body;
    for (const child of children) {
      if (child.hasAttribute('data-language-switch')) continue;
      let side = explicit(child);
      if (!side && secondaries.includes(child)) side = 'zh-HK';
      if (!side && hasPair && child.matches(inline) && !child.querySelector('input,button,select,output,[lang^=zh],.zh') && !han.test(content(child)) && !child.matches('.value,.reading') && !child.id?.match(/read|val/i)) {
        if (prose.test(content(child)) || child.matches('i,em,br,sub,sup') || (child.matches('b,strong') && texts.some(n=>source(n).trim().length>12))) side = 'en';
      }
      if (side) mark(child,side);
      else if (painted.has(child)) {delete child.dataset.copyLanguage;painted.delete(child);}
      render(child,side || own);
    }
    for (const node of texts) {
      const raw = source(node), text = raw.trim();
      const pairedText = !own && !halves(text) && ((hasPair && !han.test(text)) || (englishSibling && chineseSibling));
      let value;
      if (pairedText && /[a-z\u3400-\u9fff]/i.test(text) && !/^[A-Z]{1,4}\d{1,2}\s*·?$/.test(text)) {
        const side = han.test(text) ? 'zh-HK' : 'en';
        value = side === language ? text : '';
      } else value = own ? text : label(text);
      writeText(node,raw,value);
    }
    if (el.matches('a,button')) window.labControlIcons?.render(el);
  }
  const sheet = `
    [data-language="en"] [data-copy-language="zh-HK"],[data-language="zh-HK"] [data-copy-language="en"]{display:none!important}
    :host([data-language="en"]) [data-copy-language="zh-HK"],:host([data-language="zh-HK"]) [data-copy-language="en"]{display:none!important}
    html[data-language="zh-HK"] :is(small,span)[data-copy-language="zh-HK"],
    :host([data-language="zh-HK"]) button small[data-copy-language="zh-HK"]{font:inherit!important;color:inherit!important;letter-spacing:inherit!important;margin:0!important}
    html[data-language="zh-HK"] :is(h1,h2,h3,h4,button,summary,label,strong,th,.tool) :is(small,span)[data-copy-language="zh-HK"]{display:inline!important}
    html[data-language="zh-HK"] #phaseZh{font:650 clamp(18px,2vw,26px)/1.25 var(--night-type)!important}
    button[data-language-switch]{min-height:44px;min-width:52px;padding:5px 9px;font:600 14px/1.2 system-ui;cursor:pointer}
    html[data-language] #catalogue .box h2,html[data-language] #catalogue .box h2>span{font-size:clamp(17px,2vw,22px);font-weight:700}
    html[data-language="zh-HK"]{--optics-caption:"光學 / 工作紙 4 · 第 2 題";--mirror-caption:"光學"}
    @media(max-width:450px){button[data-language-switch]{min-width:45px;font-size:13px;padding-inline:5px}}
  `;
  function watch(root) {
    const style = document.createElement('style');
    style.textContent = sheet + (window.labControlIcons?.styles || '');
    (root === document.body ? document.head : root).append(style);
    const target = root.host ? root.querySelector('nav') : root;
    function refresh() {
      if (root.host) {root.host.dataset.language = language;for (const el of root.children) render(el);}
      else render(root);
    }
    const observer = new MutationObserver(records => {
      const targets = new Set();
      for (const record of records) {
        if ((record.target.parentElement?.closest('[data-lab-localized]') || record.target.hasAttribute?.('data-lab-localized'))) continue;
        if (record.type === 'attributes') {
          if (attrNames.includes(record.attributeName)) attributes(record.target);
          else if (record.target.matches('button')) window.labControlIcons?.render(record.target);
          continue;
        }
        if (record.type === 'characterData' && original.get(record.target)?.rendered === record.target.data) continue;
        const parent = record.target.nodeType === 3 ? record.target.parentElement : record.target;
        if(parent?.nodeType===1 && parent.isConnected && !parent.closest('script,style,[data-language-switch]')) targets.add(parent);
      }
      for(const el of targets) {
        if (!Array.from(targets).some(other=>other!==el && other.contains(el))) render(el,el.closest('[data-copy-language]')?.dataset.copyLanguage);
      }
    });
    roots.push(refresh);refresh();
    observer.observe(root,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:[...attrNames,'aria-pressed','aria-expanded','data-icon']});
    return target;
  }
  let button;
  function addShareButton(heading) {
    const share = document.createElement('button');
    share.type = 'button';

    const icon = document.createElementNS('http://www.w3.org/2000/svg','svg');
    icon.setAttribute('viewBox','0 0 24 24');
    icon.setAttribute('width','20');
    icon.setAttribute('height','20');
    icon.setAttribute('aria-hidden','true');
    icon.innerHTML = '<path d="M12 14V3m-4 4 4-4 4 4M7 10H5v10h14V10h-2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>';

    share.append(icon);

    share.style.cssText = 'display:inline-grid;place-items:center;align-self:center;flex:0 0 44px;width:44px;height:44px;min-width:44px;min-height:44px;margin:0;padding:0;cursor:pointer;background:transparent;border:0;box-shadow:none';
    const paint = () => {
      const dark = [html.dataset.style,html.dataset.theme].includes('tech');
      share.style.color = dark ? '#a6eeef' : '#315847';
    };
    paint();
    new MutationObserver(paint).observe(html,{attributes:true,attributeFilter:['data-theme','data-style']});
    const status = document.createElement('span');
    status.setAttribute('role','status');
    status.style.cssText = 'position:fixed;top:4rem;right:1rem;z-index:9999;background:#24342e;color:white;padding:6px 12px;border-radius:5px;font:14px system-ui';
    status.hidden = true;
    document.body.append(status);
    const labelShare = () => {
      const name = pick('Share this page','分享此頁');

      share.title = name;
      share.setAttribute('aria-label',name);
    };
    labelShare();
    roots.push(labelShare);
    let timer;
    share.addEventListener('click',async () => {
      const url = new URL(location.pathname,location.origin).href;
      if (navigator.share) {
        try {
          await navigator.share({title:document.title,url});
          return;
        } catch (error) {
          if (error.name === 'AbortError') return;
        }
      }
      try {
        await navigator.clipboard.writeText(url);
        status.textContent = pick('Link copied','已複製連結');
        status.hidden = false;
        clearTimeout(timer);
        timer = setTimeout(() => { status.hidden = true; },2500);
      } catch {
        window.prompt(pick('Copy this link','請複製以下連結'),url);
      }
    });
    const row = document.createElement('div');
    row.className = 'lab-share-title';
    row.style.cssText = 'display:flex;align-items:center;gap:4px;min-width:0;max-width:100%';
    heading.before(row);
    row.append(heading,share);
    heading.style.minWidth = '0';
  }
  function updateButton(){
    button.lang=pick('zh-HK','en');
    button.textContent=pick('繁中','English');
    button.setAttribute('aria-label',pick('Switch to Traditional Chinese','切換至英文'));
  }
  function set(value) {
    language=value;publishLanguage();
    try {localStorage.setItem(key,value);} catch {}
    roots.forEach(refresh=>refresh());updateButton();
    window.dispatchEvent(new Event('lab-language-change'));
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const host=document.querySelector('lab-navigation');
    const shadow=host?.shadowRoot;
    const nav=shadow?.querySelector('nav') || document.querySelector('[data-language-bar]');
    if(!nav)return;
    button=document.createElement('button');button.type='button';button.dataset.languageSwitch='';
    nav.insertBefore(button,nav.querySelector('[aria-controls="menu"]'));updateButton();
    button.addEventListener('click',()=>set(pick('zh-HK','en')));
    const title=document.querySelector('title');
    if(title){
      const raw=title.textContent;
      const updateTitle=()=>{title.textContent=title.dataset.en ? pick(title.dataset.en,title.dataset.zh) : label(raw);};
      roots.push(updateTitle);updateTitle();
    }
    const heading = document.querySelector('header .brand:not(:has(h1))') && location.pathname.endsWith('motion-graph-practice.html')
      ? document.querySelector('header .brand') : document.querySelector('h1');
    if (heading && !heading.hasAttribute('data-no-share')) addShareButton(heading);
    watch(document.body);if(shadow)watch(shadow);
    window.addEventListener('storage',e=>{if(e.key===key && (e.newValue==='en'||e.newValue==='zh-HK') && e.newValue!==language)set(e.newValue);});
  });
})();
