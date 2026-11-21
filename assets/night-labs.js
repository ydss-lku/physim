(() => {
  const q = selector => document.querySelector(selector);
  const all = selector => [...document.querySelectorAll(selector)];
  const shell = 'tl-clip tr-clip br-clip bl-clip border';
  const cleanup = [];
  let active = false;

  function mount(parent, tag, className, before = null) {
    const el = document.createElement(tag);
    el.className = className;
    parent.insertBefore(el, before);
    cleanup.push(() => el.remove());
    return el;
  }

  // Reparent the existing controls so input listeners and experiment state survive.
  function move(node, parent, before = null) {
    const anchor = document.createComment('original position');
    node.before(anchor);
    parent.insertBefore(node, before);
    cleanup.push(() => anchor.replaceWith(node));
  }

  function frame(el, shape = shell) {
    el.setAttribute('data-augmented-ui', shape);
    cleanup.push(() => el.removeAttribute('data-augmented-ui'));
  }

  function details(parent, en, zh, before = null) {
    const block = mount(parent, 'details', 'night-details', before);
    const title = mount(block, 'summary', '');
    title.append(en + ' ');
    mount(title, 'small', 'night-zh').textContent = zh;
    return block;
  }

  function mast(topic, href, title, logo) {
    const main = q('main');
    const head = mount(main, 'header', 'night-mast', main.firstChild);
    const copy = mount(head, 'div', '');
    const link = mount(copy, 'a', 'night-topic');
    link.href = href;
    link.textContent = topic;
    move(title, copy);
    move(logo, head);
  }

  function lightGate() {
    mast('ME01 · Motion　運動', 'force-and-motion.html', q('aside h1'), q('.yd-logo'));
    const bench = q('.workspace');
    frame(bench);
    const tools = mount(bench, 'div', 'night-run', q('.readings'));
    move(q('.branded-topbar .actions'), tools);
    move(q('#beamStatus'), tools);
    move(q('.transport'), tools);
    frame(q('#play'), 'tl-clip br-clip border');
    const rail = q('aside');
    const sections = all('aside section.controls');
    const options = details(rail, 'Playback & display', '播放與顯示', sections[1]);
    move(sections[1], options);
    const example = details(rail, 'Checkpoint 8', '檢視點 8', sections[2]);
    move(sections[2], example);
    const settings = details(bench, 'Trolley settings', '小車設定', q('.readings'));
    const anchor = document.createComment('desktop controls');
    rail.before(anchor);
    const compact = matchMedia('(max-width: 800px)');
    function placeSettings() {
      settings.hidden = !compact.matches;
      if (compact.matches) settings.append(rail);
      else anchor.after(rail);
    }
    compact.addEventListener('change', placeSettings);
    cleanup.push(() => {
      compact.removeEventListener('change', placeSettings);
      anchor.replaceWith(rail);
    });
    placeSettings();
  }

  function rayleigh() {
    const title = q('aside h1');
    mast('AW03 · Probing into the nanoscale　探索納米世界', 'atomic-world.html', title, q('.brand-row img'));
    const article = q('article');
    const bench = mount(article, 'div', 'night-optics', article.firstChild);
    frame(bench);
    const top = mount(bench, 'div', 'night-top');
    move(q('.top h2'), top);
    move(q('#status'), top);
    const pair = mount(bench, 'div', 'night-comparison');
    const imagePanel = q('#imagePanel');
    move(imagePanel, pair);
    move(q('.image-head h2'), imagePanel, imagePanel.firstChild);
    move(q('#graphPanel'), pair);
    const toolbar = mount(bench, 'div', 'night-optics-tools');
    const mode = mount(toolbar, 'div', 'night-mode');
    move(q('label[for=mode]'), mode);
    move(q('#mode'), mode);
    const variables = mount(toolbar, 'div', 'night-variables');
    // Anchor each parameter once. Free exploration exposes every independent input.
    const controls = all('#parameters .control').map(node => {
      const anchor = document.createComment('parameter');
      node.before(anchor);
      cleanup.push(() => anchor.replaceWith(node));
      return {node, anchor};
    });
    function showVariables() {
      for (const {node, anchor} of controls) {
        if (node.querySelector('input[type=range]').disabled) anchor.after(node);
        else variables.append(node);
      }
    }
    const select = q('#mode');
    select.addEventListener('change', showVariables);
    cleanup.push(() => select.removeEventListener('change', showVariables));
    showVariables();
    move(q('aside .actions'), toolbar);
    frame(q('#limit'), 'tl-clip br-clip border');
    move(q('.zoom'), toolbar);
    move(q('#values'), bench);
    move(q('#explanation'), bench);
    const display = details(bench, 'Sources & display', '光源與顯示');
    move(q('#parameters .toggles'), display);
    for (const section of all('aside > section')) move(section, display);
    move(q('#lockNote'), bench);
    const remaining = details(article, 'Fixed & calculated parameters', '固定及計算所得的參量', q('article > .canvas-wrap').previousElementSibling);
    move(q('#parameters'), remaining);
  }

  window.layoutNightLab = theme => {
    const night = theme === 'tech';
    if (night === active) return;
    active = night;
    if (night) {
      if (q('#scene')) lightGate();
      else rayleigh();
    } else {
      while (cleanup.length) cleanup.pop()();
    }
  };
})();
