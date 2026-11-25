(() => {
  const root = document.documentElement;
  const layout = root.dataset.nightLayout;
  const page = root.dataset.page;
  const main = document.querySelector('main');
  const q = selector => document.querySelector(selector);
  // Page-specific layout rules follow each simulator's original styles.
  document.head.append(q('link[href="assets/night-collection.css"]'));
  const groups = {
    gas: ['heat-and-gases', 'HG07 · Kinetic theory', '分子運動論'],
    ticker: ['force-and-motion', 'ME01 · Motion', '運動'],
    practice: ['force-and-motion', 'ME02 · Motion graphs', '運動線圖'],
    mechanics: ['force-and-motion', 'ME04 · Newton’s laws', '牛頓定律'],
    optics: ['wave-motion', 'OP01 · Reflection and refraction', '反射與折射'],
    lighting: ['energy-and-use-of-energy', 'EU01 · Lighting', '照明'],
    maths: ['mathematics', 'M2 · Calculus', '微積分'],
  };
  const group = layout === 'calculus' ? (page === 'instantaneous-velocity' ? groups.practice : groups.maths)
    : (groups[layout] || (['newton','fall'].includes(layout) ? groups.mechanics : groups.optics));
  function make(tag, cls) {
    const el = document.createElement(tag);
    el.className = cls;
    return el;
  }
  function topicLink() {
    const a = make('a','night-parent');
    a.href = group[0] + '.html';
    a.textContent = group[1] + '　' + group[2];
    return a;
  }

  const undo = [];
  function move(el, target, before = null) {
    if (!el) return;
    if (layout !== 'topic') {
      target.insertBefore(el, before);
      return;
    }
    const place = document.createComment('paper layout');
    el.before(place);
    target.insertBefore(el, before);
    undo.push(() => place.replaceWith(el));
  }
  function insert(el, target, before = null) {
    target.insertBefore(el, before);
    if (layout === 'topic') undo.push(() => el.remove());
    return el;
  }
  function indexLayout() {
    const header = q('main > header');
    const specimen = header.querySelector('img[data-specimen]');
    if (specimen?.dataset.techAltEn) {
      const original = specimen.alt;
      const describe = () => {
        specimen.alt = root.dataset.language === 'zh-HK' ? specimen.dataset.techAltZh : specimen.dataset.techAltEn;
      };
      specimen.setAttribute('data-lab-localized', '');
      describe();
      window.addEventListener('lab-language-change', describe);
      undo.push(() => {
        window.removeEventListener('lab-language-change', describe);
        specimen.removeAttribute('data-lab-localized');
        specimen.alt = window.labLanguage?.label(original) ?? original;
      });
    }
    const footer = q('main > footer');
    const content = [];
    for (let el = header.nextElementSibling; el && el !== footer; el = el.nextElementSibling) content.push(el);
    const grid = insert(make('div','topic-content'),main,header.nextSibling);
    const tools = insert(make('div','topic-tools'),grid);
    const guide = insert(make('div','topic-guide'),grid);
    let inGuide = false;
    for (const el of content) {
      if (el.matches('[data-topic-guide]')) inGuide = true;
      move(el,inGuide ? guide : tools);
    }
    if (!guide.children.length) guide.hidden = true;
  }
  function benchLayout() {
    const head = insert(make('header','night-lab-heading'),main,main.firstChild);
    head.append(topicLink());
    const title = q('aside h1');
    if (title) move(title,head);
    else {
      const h1 = make('h1','');
      h1.textContent = 'Laws of reflection';
      const zh = make('small',''); zh.lang = 'zh-HK'; zh.textContent = '反射定律';
      h1.append(zh);head.append(h1);
    }
  }
  function arrange() {
    if (['ticker','mirror','reflection'].includes(layout)) benchLayout();
    else {
      const target = layout === 'pinhole' ? q('#pinhole-root') : document.body;
      insert(topicLink(),document.body,layout === 'pinhole' ? target : q('lab-navigation').nextSibling);
    }
    if (layout === 'lighting') {
      const diagram = q('#diagramViewport');
      const controls = q('article .controls') || q('article .actions');
      if (controls) move(controls,diagram.parentNode,diagram.nextSibling);
      if (q('article .playback')) move(q('article .playback'),diagram.parentNode,controls ? controls.nextSibling : diagram.nextSibling);
    }
    if (layout === 'fall') {
      const controls = q('main > .controls');
      move(controls,q('.lab'),q('.plots'));
    }
    if (layout === 'calculus') {
      const chart = q('section.panel #plot');
      if (chart) move(q('main > .toolbar'),chart.parentNode,chart.nextSibling);
    }
  }

  const frames = {
    topic:'main > header', calculus:'.layout > section.panel', gas:'.layout section.card',
    ticker:'#apparatusPanel', mirror:'main > article', reflection:'.stage', refraction:'.workspace > section.card',
    lighting:'main.eu article', practice:'.hero-art,.evidence,.lab-dashboard', pinhole:'.stage',
    newton:'section.lab,section.graph-panel',
  };
  const primaries = {
    calculus:'#closer,#double',ticker:'#play',newton:'#run',lighting:'#next,#play,#toggle',
    practice:'#start',gas:'#pause',
  };
  let active = false;
  function markFrames(scope) {
    for (const [selector, shape] of [[frames[layout],'tl-clip tr-clip br-clip bl-clip border'],
      [primaries[layout],'tl-clip br-clip border']]) {
      if (!selector) continue;
      const nodes = [...scope.querySelectorAll(selector)];
      if (scope.matches?.(selector)) nodes.push(scope);
      nodes.forEach(el => el.setAttribute('data-augmented-ui',shape));
    }
  }
  // Only these two apps replace whole panels after initialization.
  const dynamic = ['practice','pinhole'].includes(layout) ? new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) markFrames(node);
    }
  }) : null;
  function sync() {
    const night = root.dataset.theme === 'tech';
    if (active === night) return;
    active = night;
    if (night) {
      if (layout === 'topic') indexLayout();
      markFrames(document);
      if (dynamic) dynamic.observe(q(layout==='practice'?'#app':'#pinhole-root'),{childList:true,subtree:true});
    } else {
      dynamic?.disconnect();
      if (layout !== 'fall') document.querySelectorAll('[data-augmented-ui]').forEach(el => el.removeAttribute('data-augmented-ui'));
      while (undo.length) undo.pop()();
    }
  }
  if (layout !== 'topic') arrange();
  sync();
  window.addEventListener('lab-theme-change',sync);
})();
