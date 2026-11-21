// The original buttons and links own the interaction. A decorative mask inherits
// their ink, including the selected, disabled and focus states in either theme.
(() => {
  'use strict';
  const page = location.pathname.split('/').pop().replace(/\.html$/,'');
  const paths = {
    home:'M3 11.5 12 4l9 7.5 M5.5 10v10h5v-6h3v6h5V10',
    list:'M8 6h12 M8 12h12 M8 18h12 M4 6h.1 M4 12h.1 M4 18h.1',
    close:'M6 6l12 12 M18 6 6 18',
    play:'M7 4.5 20 12 7 19.5Z',
    pause:'M6.5 5h3v14h-3z M14.5 5h3v14h-3z',
    stop:'M5.5 5.5h13v13h-13z',
    replay:'M4.2 9A8.2 8.2 0 1 1 4 14 M4 4v5.5h5.5 M10 9l5 3-5 3z',
    reset:'M4 9a8 8 0 1 1-.1 5 M4 4v5.5h5.5',
    undo:'M9 4 3 10l6 6 M4 10h10a6 6 0 0 1 0 12',
    start:'M5 5v14 M18 5l-10 7 10 7z',
    next:'M6 5l10 7-10 7z M19 5v14', previous:'M18 5l-10 7 10 7z M5 5v14',
    fast:'M3 6l8 6-8 6z M12 6l8 6-8 6z',
    back:'M20 12H4 M11 5l-7 7 7 7',
    zoomIn:'M16 16l5 5 M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0 M7 10.5h7 M10.5 7v7',
    zoomOut:'M16 16l5 5 M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0 M7 10.5h7',
    expand:'M4 9V4h5 M15 4h5v5 M20 15v5h-5 M9 20H4v-5',
    collapse:'M9 4v5H4 M20 9h-5V4 M15 20v-5h5 M4 15h5v5',
    centre:'M4 9V4h5 M15 4h5v5 M20 15v5h-5 M9 20H4v-5 M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    sound:'M3 9h4l5-4v14l-5-4H3z M15 9a5 5 0 0 1 0 6 M18 6a9 9 0 0 1 0 12',
    mute:'M3 9h4l5-4v14l-5-4H3z M16 9l5 6 M21 9l-5 6',
  };
  const styles = Object.entries(paths).map(([name,path])=>{
    const fill = ['play','pause','stop'].includes(name) ? 'black' : 'none';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${path}" fill="${fill}" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    return `[data-lab-icon="${name}"]{--lab-control-art:url("data:image/svg+xml,${encodeURIComponent(svg)}")}`;
  }).join('\n') + `
    :is(button,a)[data-lab-icon]{
      box-sizing:border-box!important;
      vertical-align:middle;position:relative;min-width:44px!important;min-height:44px!important;
      width:44px!important;height:44px!important;padding:0!important;gap:0!important;
      font-size:0!important;line-height:0!important;letter-spacing:0!important;flex:0 0 auto;
    }
    :is(button,a)[data-lab-icon][hidden]{display:none!important}
    :is(button,a)[data-lab-icon]>.control-glyph{
      position:absolute!important;inset:0!important;margin:auto!important;display:block!important;
      width:22px!important;height:22px!important;background:currentColor!important;pointer-events:none;
      -webkit-mask:var(--lab-control-art) center / contain no-repeat;mask:var(--lab-control-art) center / contain no-repeat;
    }
    html[data-language] body :is(button,a)[data-lab-icon]>:not(.control-glyph),
    :host nav :is(button,a)[data-lab-icon]>:not(.control-glyph){display:none!important}
    :is(button,a)[data-lab-icon]:focus-visible{outline:3px solid currentColor;outline-offset:2px}
    :is(button,a)[data-lab-icon]:disabled{opacity:.5;cursor:default}
    @media(forced-colors:active){.control-glyph{forced-color-adjust:none;color:ButtonText}button:disabled .control-glyph{color:GrayText}}
  `;
  const choice=(icon,en,zh)=>({icon,label:window.labLanguage.pick(en,zh)});
  function toggle(icon,en,zh,hintEn,hintZh) {
    return {...choice(icon,en,zh),hint:window.labLanguage.pick(hintEn,hintZh)};
  }
  const playback = el => {
    const text = el.textContent;
    if (/pause|暫停/i.test(text)) return choice('pause','Pause','暫停');
    if (/replay|重播/i.test(text)) return choice('replay','Replay','重播');
    if (/resume|continue|繼續/i.test(text)) return choice('play','Resume','繼續播放');
    if (/stop|停止/i.test(text)) return choice('stop','Stop','停止');
    if (/play|run|播放|啟動/i.test(text)) return choice('play','Play','播放');
  };
  function action(el) {
    if (el.getRootNode().host?.localName==='lab-navigation') {
      if(el.matches('nav [aria-controls="menu"]')){
        const open=el.getAttribute('aria-expanded')==='true';
        return toggle(open?'close':'list','Simulation list','模擬目錄',open?'Close simulation list':'Open simulation list',open?'關閉模擬目錄':'開啟模擬目錄');
      }
      if(el.matches('nav > a'))
        return choice('home','Home','首頁');
      return;
    }
    if(el.localName==='a'){
      if(page==='me01-light-gate' && el.matches('a[href*="index.html"]') && /實驗櫃|lab cabinet/i.test(el.textContent))return choice('back','Back to the lab catalogue','返回實驗目錄');
      if(/^(?:←\s*)?(?:Back|Go back|Previous page|返回上一頁|上一頁)$/i.test(el.textContent.trim()))return choice('back','Previous page','返回上一頁');
      return;
    }
    const id=el.id;
    if(page==='s2-circuit-board' && id==='undo') return choice('undo','Undo last change','復原上一步');
    if(id==='reset'){
      if(page==='falling-with-air-resistance'||page==='me01-light-gate') return choice('start','Reset to start','重設至起點');
      return choice('reset','Reset simulation','重設模擬');
    }
    if(id==='play' && page==='falling-with-air-resistance'){
      // The simulation already supplies the current localized name and title.
      return {icon:el.dataset.icon||'play', native:true};
    }
    if(['play','pause','animate'].includes(id)) return playback(el);
    if(id==='restart' && page==='eu01-doping')return choice('start','Restart from beginning','從頭開始');
    if(id==='replay' && page==='eu01-doping')return choice('replay','Replay this step','重播這一步');
    if(id==='restart' && page==='me01-ticker-tape-timer')return choice('start','Restart tape','重新記錄紙帶');
    if(id==='resettime')return choice('start','Back to time zero','返回起始時刻');
    if(page==='newton-second-law' && id==='fast')return choice('fast','Fast-forward to five readings','快進至五組數據');
    if(id==='diagramZoom')return el.getAttribute('aria-pressed')==='true'
      ? toggle('collapse','Enlarge diagram','放大示意圖','Fit diagram','顯示全圖') : choice('expand','Enlarge diagram','放大示意圖');
    const viewTool=page==='pinhole-camera' && el.matches('.view-controls button') ? el.getAttribute('aria-label')||'' : '';
    if(/reset view|重設視角/i.test(viewTool))return choice('centre','Reset view','重設視角');
    if(id==='fullscreen'||/full screen|fullscreen|全螢幕/i.test(viewTool))return document.fullscreenElement||document.webkitFullscreenElement
      ? toggle('collapse','Full screen','全螢幕','Exit full screen','退出全螢幕') : choice('expand','Full screen','全螢幕');
    if(page==='mirror-rotation'||page==='mirror-image-2'){
      if(id==='minus')return choice('zoomOut','Zoom out','縮小');
      if(id==='plus')return choice('zoomIn','Zoom in','放大');
      if(id==='fit')return choice('centre','Centre the view','視圖置中');
    }
    if(page==='s1-vertical-sections'){
      const model=el.dataset.target==='model';
      if(el.hasAttribute('data-zoom')){
        const zoomIn=Number(el.dataset.zoom)>1;
        return choice(zoomIn?'zoomIn':'zoomOut',`Zoom ${zoomIn?'in':'out'} ${model?'model':'diagram'}`,(zoomIn?'放大':'縮小')+(model?'模型':'線圖'));
      }
      if(el.hasAttribute('data-reset'))return choice('centre',model?'Reset model view':'Reset diagram view',model?'還原模型視圖':'還原線圖視圖');
      if(id==='previous')return choice('previous','Previous stage','上一階段');
      if(id==='next')return choice('next','Next stage','下一階段');
      if(id==='closePicker')return choice('close','Close apparatus list','關閉儀器清單');
      if(id==='sound'){
        const on=el.getAttribute('aria-pressed')==='true';
        return toggle(on?'sound':'mute','Sound','聲效',on?'Mute sound':'Enable sound',on?'關閉聲效':'開啟聲效');
      }
    }
    if(page==='motion-graph-practice' && (id==='backhome'||el.matches('button[data-page="home"]')))
      return choice('home','Practice home','練習首頁');
    if (el.matches('button') && /^(?:Stop|停止)$/.test(el.textContent.trim())) return choice('stop','Stop','停止');
  }
  // Save author-provided metadata for controls that become a text command again
  // (e.g. "Form junction" -> Pause -> Replay -> "Form junction").
  const originals=new WeakMap();
  function render(el){
    const item=action(el);
    let glyph=el.querySelector(':scope > .control-glyph');
    if(!item){
      if(!el.hasAttribute('data-lab-icon'))return;
      glyph?.remove();delete el.dataset.labIcon;
      const attrs=originals.get(el);
      if(attrs) for(const [key,value] of attrs) value===null?el.removeAttribute(key):el.setAttribute(key,value);
      originals.delete(el);return;
    }
    if(!item.native){
      if(!originals.has(el))originals.set(el,['title','aria-label'].map(key=>[key,el.getAttribute(key)]));
      if(el.title!==(item.hint||item.label))el.title=item.hint||item.label;
      if(el.getAttribute('aria-label')!==item.label)el.setAttribute('aria-label',item.label);
    }
    if(el.dataset.labIcon!==item.icon)el.dataset.labIcon=item.icon;
    if(!glyph){
      glyph=document.createElement('span');glyph.className='control-glyph';glyph.setAttribute('aria-hidden','true');el.append(glyph);
    }
  }
  window.labControlIcons={styles,render};
  const updateFullscreen=()=>document.querySelectorAll('#fullscreen,.view-controls button[aria-label]').forEach(render);
  document.addEventListener('fullscreenchange',updateFullscreen);
  document.addEventListener('webkitfullscreenchange',updateFullscreen);
})();
