(()=>{
  'use strict';
  const el=id=>document.getElementById(id),root=document.documentElement,wind=root.dataset.machine==='wind';
  const host=el('viewport'),q=[el('q0'),el('q1')],rows=[...document.querySelectorAll('.power-row')];
  const state={a:0,b:0},readings=document.querySelector('#results tbody');
  let inspected=false,showFlow=true,paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let yaw=wind?-.66:.64,pitch=.23,zoom=1,angle=.15,elapsed=0,previous=0,dirty=true,sceneDraw;
  const number=n=>n.toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1});
  function power(){const input=wind?.5*1.225*Math.PI*state.b**2*state.a**3/1000:9.81*state.a*state.b;
    const shaft=input*(wind?.40:.85);return [input,shaft,shaft*.90]}
  function update(){[state.a,state.b]=q.map(e=>Number(e.value));
    q.forEach((item,i)=>el('v'+i).textContent=(i===1&&!wind?state.b.toFixed(2):item.value)+' '+item.dataset.unit);
    el('derived').textContent=wind?'A = '+Math.round(Math.PI*state.b**2).toLocaleString('en-US')+' m²':(state.b===0?'—':'v = '+Math.sqrt(2*9.81*state.a).toFixed(1)+' m/s');
    const powers=power();el('power').textContent=number(powers[2]);
    rows.forEach((row,i)=>{row.querySelector('i').style.width=(powers[0]?100*powers[i]/powers[0]:0)+'%';row.querySelector('output').textContent=number(powers[i])+' kW'});dirty=true}
  function button(id,pressed){el(id).setAttribute('aria-pressed',String(pressed))}
  function skin(){const frame=document.querySelector('.instrument');if(root.dataset.theme==='tech')frame.setAttribute('data-augmented-ui','tl-clip tr-clip br-clip bl-clip border');else frame.removeAttribute('data-augmented-ui');dirty=true}
  function defaultCamera(){yaw=wind?-.66:.64;pitch=.23;zoom=1}
  q.forEach(input=>input.oninput=update);
  el('reset').onclick=()=>{q.forEach(e=>e.value=e.defaultValue);paused=matchMedia('(prefers-reduced-motion: reduce)').matches;inspected=false;showFlow=true;angle=.15;elapsed=0;defaultCamera();button('pause',paused);button('detail',false);button('flow',true);update()};
  el('pause').onclick=()=>{paused=!paused;button('pause',paused);dirty=true};
  el('detail').onclick=()=>{inspected=!inspected;defaultCamera();if(inspected)yaw=wind?-1.13:.35;button('detail',inspected);dirty=true};
  el('flow').onclick=()=>{showFlow=!showFlow;button('flow',showFlow);dirty=true};
  el('save').onclick=()=>{const row=readings.insertRow();[q[0].value,wind?q[1].value:state.b.toFixed(2),number(power()[2])].forEach(v=>row.insertCell().textContent=v);el('results').hidden=false};
  try{
    const T=window.THREE,renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
    renderer.setClearColor(0,0);renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));host.append(renderer.domElement);
    const scene=new T.Scene(),camera=new T.PerspectiveCamera(33,1,.04,100);
    const card=document.createElement('canvas');card.width=512;card.height=256;const c=card.getContext('2d');c.fillStyle='#55656b';c.fillRect(0,0,512,256);
    c.fillStyle='#fff7e5';[[5,16,146,55],[226,30,28,123],[322,15,168,66],[294,165,89,12]].forEach(r=>c.fillRect(...r));
    const env=new T.CanvasTexture(card);env.mapping=T.EquirectangularReflectionMapping;env.colorSpace=T.SRGBColorSpace;scene.environment=env;
    scene.add(new T.HemisphereLight(0xfff8e9,0x889da9,1.55));
    for(const [x,y,z,color,power] of [[-4,7,5,0xffefcf,2.65],[4,4,-3,0xb9d8ee,1.75]]){const key=new T.DirectionalLight(color,power);key.position.set(x,y,z);scene.add(key)}
    const model=turbineMachine(T,scene,wind),target=new T.Vector3();let lastW=0,lastH=0;
    sceneDraw=()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;
      if(w!==lastW||h!==lastH){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();lastW=w;lastH=h}
      target.set(wind?0:(inspected?.10:-.48),wind?(inspected?.08:-.54):(inspected?-.31:-.45),wind?(inspected?-.42:0):-.25);
      const span=wind?(inspected?2.68:7.6):(inspected?3.25:6.25);
      const d=span/(2*Math.tan(camera.fov*Math.PI/360))*Math.max(1,1/camera.aspect)/zoom;
      camera.position.set(d*Math.sin(yaw)*Math.cos(pitch),d*Math.sin(pitch),d*Math.cos(yaw)).add(target);camera.lookAt(target);
      model.update(state,elapsed,angle,inspected,showFlow);renderer.render(scene,camera)};
    const touches=new Map();let gap=0;const canvas=renderer.domElement;
    const separation=()=>{const [a,b]=[...touches.values()];return Math.hypot(a.x-b.x,a.y-b.y)};
    const magnify=f=>{zoom=Math.max(.65,Math.min(2.4,zoom*f));dirty=true};
    canvas.addEventListener('wheel',e=>{if(e.ctrlKey||e.shiftKey){e.preventDefault();magnify(Math.exp(-e.deltaY*.004))}},{passive:false});
    canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);touches.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touches.size===2)gap=separation()};
    canvas.onpointermove=e=>{const old=touches.get(e.pointerId);if(!old)return;touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(touches.size===2){const next=separation();if(gap>0)magnify(next/gap);gap=next}else{yaw-=(e.clientX-old.x)*.008;pitch=Math.max(-1,Math.min(1.25,pitch+(e.clientY-old.y)*.008));dirty=true}};
    canvas.onlostpointercapture=e=>touches.delete(e.pointerId);
    canvas.tabIndex=0;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',host.getAttribute('aria-label'));
    canvas.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-'].includes(e.key))return;e.preventDefault();
      if(e.key==='ArrowLeft')yaw-=.14;if(e.key==='ArrowRight')yaw+=.14;if(e.key==='ArrowUp')pitch=Math.min(1.25,pitch+.1);if(e.key==='ArrowDown')pitch=Math.max(-1,pitch-.1);if(e.key==='+')magnify(1.12);if(e.key==='-')magnify(1/1.12);dirty=true};
    new ResizeObserver(()=>{dirty=true}).observe(host);
  }catch(error){
    host.replaceChildren();const msg=document.createElement('p');msg.style.padding='4rem 1rem';msg.textContent='3D view requires WebGL. The power controls remain available. · 顯示立體模型需要 WebGL。仍可調節參數及比較功率。';host.append(msg);
    ['detail','pause','flow'].forEach(id=>el(id).disabled=true);console.warn(error);sceneDraw=()=>{};
  }
  button('pause',paused);skin();update();window.addEventListener('lab-theme-change',skin);
  function frame(now){const dt=Math.min(.06,(now-previous)/1000);previous=now;
    if(!paused){elapsed+=dt;
      // Time is slowed in each view. At constant tip-speed ratio wind rpm varies as v/r.
      angle+=dt*(wind?2.2*state.a/state.b:(state.b?1.24*Math.sqrt(state.a/100):0))}
    if(!paused||dirty){sceneDraw();dirty=false}requestAnimationFrame(frame)}
  requestAnimationFrame(frame);
})();
