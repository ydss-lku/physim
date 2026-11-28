// Compact controls retain the original inputs, listeners and simulation state.
(() => {
  'use strict';
  const paths = {
    ray: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12"/><circle cx="12" cy="12" r="3"/>',
    incident: '<path d="M19 3v18M3 5l12 7-12 7M10 7l5 5-6 1"/>',
    reflected: '<path d="M5 3v18M21 5 9 12l12 7M15 19l6 .2-2-6"/>',
    extensions: '<path d="M12 3v18M3 5l9 7-9 7"/><path d="m12 12 9-6m-9 6 9 6" stroke-dasharray="2 3"/>',
    virtual: '<path d="M8 3v18M13 5h7v14h-7z" stroke-dasharray="2 3"/>',
    incidentAngle: '<path d="M4 19h17M4 19V3M4 19 18 5M4 10a9 9 0 0 1 6.4 2.6"/><text x="14" y="19">i</text>',
    reflectionAngle: '<path d="M20 19H3M20 19V3M20 19 6 5M20 10a9 9 0 0 0-6.4 2.6"/><text x="3" y="19">r</text>',
    edgeRays: '<path d="M12 7v10M3 3l9 4 9-4M3 21l9-4 9 4"/><circle cx="12" cy="7" r="1.5"/><circle cx="12" cy="17" r="1.5"/>',
    imageRange: '<path d="M7 3v18M14 3h5v18h-5z" stroke-dasharray="2 2"/><path d="M16.5 8v8" stroke-width="4"/>',
    visible: '<path d="M6 3v18M14 3v18"/><path d="M14 8v8" stroke-width="4"/><path d="m18 10 3 2-3 2"/>',
    normal: '<path d="M12 3v18"/><path d="M2 12h20" stroke-dasharray="2 2"/><path d="M12 8h4v4"/>',
    dimensions: '<path d="M4 4v16M20 4v16M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4"/>',
    labels: '<path d="M4 20V4h6a4 4 0 0 1 0 8H4M15 19l6-6"/><circle cx="15" cy="19" r="1"/>',
    grid: '<path d="M3 3h18v18H3zM9 3v18M15 3v18M3 9h18M3 15h18"/>',
    eyeHeightLock: '<path d="M4 14h10v7H4zM6 14v-3a3 3 0 0 1 6 0v3M20 3v18M17 6l3-3 3 3M17 18l3 3 3-3"/>',
    perspective: '<path d="m12 3 9 5v9l-9 5-9-5V8zM3 8l9 5 9-5M12 13v9M12 3v5"/>',
    topview: '<path d="M4 8h16v12H4zM8 3h8M12 2v9m-3-3 3 3 3-3"/>',
    original: '<path d="M5 3v18M21 5 9 12l12 7" stroke-dasharray="2 3"/><text x="3" y="22">0</text>',
    initialIncident: '<path d="M19 3v18M3 5l12 7-12 7" stroke-dasharray="2 3"/><text x="3" y="22">0</text>',
    incidentChange: '<path d="M4 20V3M4 20 20 6M4 9a11 11 0 0 1 8 3"/><text x="13" y="21">Δi</text>',
    rayAngle: '<path d="M20 20V3M20 20 4 6M20 9a11 11 0 0 0-8 3"/><text x="2" y="21">Δr</text>',
    mirrorAngle: '<path d="M4 18h16M6 21 18 3M12 18a6 6 0 0 0 5-3"/><text x="2" y="10">θ</text>',
    op: '<path d="M4 18 20 6"/><circle cx="4" cy="18" r="2"/><circle cx="20" cy="6" r="2"/><text x="2" y="9">OP</text>',
    target: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
    values: '<text x="2" y="16">123</text>',
    zero: '<path d="M3 18h18M12 18V4M5 11a7 7 0 0 1 12-5M17 2v5h-5"/>',
  };
  paths.iAngle = paths.incidentAngle;
  paths.rAngle = paths.reflectionAngle;
  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('mirror-glyph');
    svg.innerHTML = paths[name];
    return svg;
  }
  function init() {
    const presets = {
      width:[2,8,14], position:[-3,0,3], objectX:[-7,0,7], distance:[1.5,4,8],
      mirrorBottom:[0,2,4], mirrorHeight:[1,2,4], eyeDistance:[1,3,5],
      eyeHeight:[0.5,2,4], postDistance:[1,5,10,15], postHeight:[1,3,6],
      mirror:[-90,-45,0,45,90], sourceAngle:[0,90,180,270],
    };
    const scales = [];
    for (const slider of document.querySelectorAll('aside input[type="range"]')) {
      const scale = document.createElement('div');
      scale.className = 'mirror-scale-ticks';
      scale.dataset.slider = slider.id;
      const minimum = Number(slider.min), maximum = Number(slider.max);
      const page = document.documentElement.dataset.page;
      const unit = page === 'mirror-image-2' ? ' m' : page === 'mirror-rotation' ? '°' : '';
      // Buttons must sit outside the input's label so tapping a tick never also toggles a label.
      const label = slider.closest('label');
      if (label) {
        label.classList.add('mirror-slider-label');
        label.after(scale);
      } else slider.after(scale);
      for (const value of presets[slider.id]) {
        const button = document.createElement('button');
        button.type = 'button';
        button.value = String(value);
        button.textContent = value + unit;
        const description = slider.getAttribute('aria-label') || label.querySelector('.bilingual').textContent.trim();
        button.setAttribute('aria-label', description + ': ' + value + unit);
        button.style.left = (100 * (value - minimum) / (maximum - minimum)) + '%';
        button.addEventListener('click', () => {
          slider.value = button.value;
          slider.dispatchEvent(new Event('input', {bubbles:true}));
        });
        scale.append(button);
      }
      scales.push([slider, scale]);
    }
    function syncPresets() {
      for (const [slider, scale] of scales) {
        for (const button of scale.children) {
          const value = Number(button.value);
          const disabled = (slider.id === 'postDistance' && value < Number(document.getElementById('eyeDistance').value)) ||
            (slider.id === 'eyeDistance' && value > Number(document.getElementById('postDistance').value));
          if (button.disabled !== disabled) button.disabled = disabled;
          const selected = String(Math.abs(Number(slider.value) - value) < 0.001);
          if (button.getAttribute('aria-pressed') !== selected) button.setAttribute('aria-pressed', selected);
        }
      }
    }
    document.querySelector('main').addEventListener('input', syncPresets);
    document.querySelector('main').addEventListener('pointermove', syncPresets);
    document.getElementById('reset').addEventListener('click', syncPresets);
    document.getElementById('zero')?.addEventListener('click', syncPresets);
    syncPresets();
    const guide = document.createElement('details');
    guide.className = 'mirror-control-guide';
    guide.innerHTML = '<summary><span lang="en">Control guide</span><small lang="zh-HK">圖示說明</small></summary><div class="mirror-guide-items"></div>';
    const items = guide.lastElementChild;
    const zero = document.getElementById('zero');
    if (zero) {
      zero.classList.add('mirror-view-button');
      zero.title = 'Zero mirror / 鏡面歸零';
      zero.setAttribute('aria-label', zero.title);
      zero.append(icon('zero'));
    }
    const inputs = [...document.querySelectorAll('aside input[type="checkbox"]')];
    for (const input of inputs) {
      const label = input.closest('label');
      const key = input.id.replace(/Toggle$/, '').replace(/\d$/, '');
      // A numbered colour chip distinguishes the three independently selectable rays.
      const ray = /^ray\d$/.test(input.id);
      const name = ray ? 'ray' : key;
      const copy = label.querySelector('.bilingual');
      const en = copy.querySelector('[lang="en"]').textContent.trim();
      const zh = copy.querySelector('[lang^="zh"]').textContent.trim();
      label.classList.add('mirror-toggle');
      label.title = en + ' / ' + zh;
      input.setAttribute('aria-label', en + ' / ' + zh);
      label.append(icon(name));
      if (ray) {
        label.style.setProperty('--ray-colour', ['#ffca69','#68dbff','#fa8bb9'][Number(input.id.at(-1))]);
        const number = document.createElement('b');
        number.className = 'mirror-ray-number';
        number.textContent = String(Number(input.id.at(-1)) + 1);
        number.setAttribute('aria-hidden', 'true');
        label.append(number);
      }
      if (!items.querySelector('[data-guide="' + name + '"]')) {
        const entry = document.createElement('div');
        entry.dataset.guide = name;
        const explanation = copy.cloneNode(true);
        if (ray) {
          explanation.querySelector('[lang="en"]').textContent = 'Show the numbered ray';
          explanation.querySelector('[lang^="zh"]').textContent = '顯示該編號的光線';
        }
        entry.append(icon(name), explanation);
        items.append(entry);
      }
    }
    for (const id of ['perspective', 'topview']) {
      const button = document.getElementById(id);
      if (!button) continue;
      button.classList.add('mirror-view-button');
      button.title = id === 'perspective' ? '3D view / 立體視角' : 'Top view / 鳥瞰';
      button.setAttribute('aria-label', button.title);
      button.append(icon(id));
      const sync = () => document.querySelectorAll('.mirror-view-button').forEach(el => el.setAttribute('aria-pressed', String(el.classList.contains('active'))));
      button.addEventListener('click', sync);
      if (id === 'perspective') document.getElementById('reset').addEventListener('click', sync);
      sync();
    }
    if (document.documentElement.dataset.page === 'mirror-image') {
      for (let i = 0; i < 3; i++) {
        const label = document.getElementById('ray' + i).closest('label');
        const options = label.nextElementSibling;
        const row = document.createElement('div');
        row.className = 'mirror-ray-row';
        label.before(row);
        row.append(label, ...options.children);
        options.remove();
      }
      const display = document.getElementById('extensions').closest('section');
      const row = document.createElement('div');
      row.className = 'mirror-toggle-row';
      display.append(row);
      row.append(...display.querySelectorAll('.mirror-toggle'));
    }
    document.querySelector('aside').append(guide);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
