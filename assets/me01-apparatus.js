/* ME01 apparatus drawings. Distances along the light-gate track are centimetres.
   The ticker overview compresses long runs; the analysis strip retains its own scale. */
window.makeMotionBench=function(kind){
  const T=window.THREE,canvas=document.getElementById('scene');
  let gl;
  try{gl=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'})}catch{return null}
  const world=new T.Scene(),cam=new T.OrthographicCamera(),timer=kind==='ticker';
  const mat=(color,metalness=.55,roughness=.3)=>new T.MeshStandardMaterial({color,metalness,roughness});
  const satin=mat(0xbac7cf),bright=mat(0xe1e7e8,.87,.17),black=mat(0x263139,.17,.44),
    rubber=mat(0x192324,.03,.76),teal=mat(0x225b63,.38),red=mat(0xd85e35,.27),
    brass=mat(0xcbad6e,.74),copper=mat(0xaf623a,.76),ink=mat(0x242d3a,.06,.72);
  const group=p=>{const o=new T.Group();p.add(o);return o};
  function part(p,g,m,x,y,z){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o}
  function plate(p,m,x,y,z,w,h,d,b=.25){
    const sh=new T.Shape(),a=w/2,c=h/2,k=Math.min(c*.65,a*.3,b*2);
    [[-a+k,-c],[a-k,-c],[a,-c+k],[a,c-k],[a-k,c],[-a+k,c],[-a,c-k],[-a,-c+k]].forEach(([u,v],i)=>i?sh.lineTo(u,v):sh.moveTo(u,v));sh.closePath();
    return part(p,new T.ExtrudeGeometry(sh,{depth:d,bevelEnabled:true,bevelSize:b,bevelThickness:b,bevelSegments:2}),m,x,y,z-d/2);
  }
  function box(p,m,x,y,z,w,h,d){return part(p,new T.BoxGeometry(w,h,d),m,x,y,z)}
  function drum(p,m,x,y,z,r,h,axis='y',sides=32){const o=part(p,new T.CylinderGeometry(r,r,h,sides),m,x,y,z);if(axis==='z')o.rotation.x=Math.PI/2;if(axis==='x')o.rotation.z=Math.PI/2;return o}
  function rod(p,m,a,b,r){const v=new T.Vector3(...a),u=new T.Vector3(...b).sub(v);const o=drum(p,m,0,0,0,r,u.length(),'y',12);o.position.copy(v.addScaledVector(u,.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),u.normalize());return o}
  function bolt(p,x,y,z){drum(p,bright,x,y,z,.49,.26,'y',6);box(p,black,x,y+.135,z,.55,.03,.1)}
  function badge(p,word,x,y,z,w,h,bg='#184b50'){
    const sheet=document.createElement('canvas');sheet.width=512;sheet.height=96;const c=sheet.getContext('2d');
    c.fillStyle=bg;c.fillRect(0,0,512,96);c.fillStyle='#f4f4e8';c.font='bold 64px Arial';c.textAlign='center';if(word.length<=2)c.font='bold 78px Arial';c.fillText(word,256,71);
    const map=new T.CanvasTexture(sheet);map.colorSpace=T.SRGBColorSpace;
    part(p,new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map}),x,y,z);
  }
  function cable(m,points,r){
    const route=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
    return part(world,new T.TubeGeometry(route,48,r,8,false),m,0,0,0);
  }
  function contactShadow(p,x,y,z,w,d){
    const sheet=document.createElement('canvas');sheet.width=sheet.height=64;const g=sheet.getContext('2d');
    const wash=g.createRadialGradient(32,32,4,32,32,32);wash.addColorStop(0,'rgba(12,18,20,.48)');wash.addColorStop(1,'rgba(12,18,20,0)');g.fillStyle=wash;g.fillRect(0,0,64,64);
    const shadow=part(p,new T.PlaneGeometry(w,d),new T.MeshBasicMaterial({map:new T.CanvasTexture(sheet),transparent:true,depthWrite:false}),x,y,z);shadow.rotation.x=-Math.PI/2;
  }
  const sky=document.createElement('canvas');sky.width=256;sky.height=128;const paint=sky.getContext('2d');
  paint.fillStyle='#556068';paint.fillRect(0,0,256,128);paint.fillStyle='#fff9ed';
  [[0,17,82,22],[96,8,13,66],[157,10,86,35],[150,85,74,12]].forEach(v=>paint.fillRect(...v));
  const env=new T.CanvasTexture(sky);env.mapping=T.EquirectangularReflectionMapping;env.colorSpace=T.SRGBColorSpace;world.environment=env;
  world.add(new T.HemisphereLight(0xfffaf1,0x879daa,1.55));
  const sun=new T.DirectionalLight(0xfff3db,2.8);sun.position.set(-40,95,50);world.add(sun);
  const rim=new T.DirectionalLight(0xaecbdf,1.5);rim.position.set(40,35,-55);world.add(rim);
  const cart=group(world),wheelsets=[];
  plate(cart,teal,0,4.4,0,22,3.5,12,.34);plate(cart,satin,0,6.4,0,21.5,.5,11.8,.13);
  for(const x of [-7.4,7.4])for(const z of [-5.8,5.8]){
    const face=group(cart);face.position.set(x,2.42,z);wheelsets.push(face);
    drum(face,rubber,0,0,0,2.42,1.5,'z');const sign=Math.sign(z);
    drum(face,satin,0,0,sign*.8,1.64,.25,'z');drum(face,black,0,0,sign*1,.46,.25,'z',6);
    for(let i=0;i<5;i++){const a=i*2*Math.PI/5;drum(face,black,Math.cos(a)*1.05,Math.sin(a)*1.05,sign*.95,.26,.1,'z',12)}
    bolt(cart,x,6.85,z*.82);
  }
  contactShadow(cart,0,.15,0,27,17);
  if(timer)badge(cart,'DYNAMICS',0,4.45,6.38,10.2,1.9);
  const railStart=timer?-35:-85,railEnd=timer?102:92,railMid=(railStart+railEnd)/2,railLen=railEnd-railStart;
  box(world,satin,railMid,-1.65,0,railLen,3.3,15);
  for(const z of [-6.6,6.6]){box(world,bright,railMid,.04,z,railLen,.1,1.8);box(world,black,railMid,-1.85,Math.sign(z)*7.51,railLen,.62,.1)}
  box(world,black,railMid,.04,0,railLen,.1,1.7);
  for(const x of [railStart+4,railEnd-4])for(const z of [-6,6])drum(world,rubber,x,-4,z,1.9,1.5);
  const marks=[];for(let i=railStart+1;i<railEnd;i++)marks.push(i,-.1,7.55,i,i%5?-.65:-1.25,7.55);
  world.add(new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(marks,3)),new T.LineBasicMaterial({color:0x50626b})));
  let flag,outgoing,paper,striker,stamps;
  if(!timer){
    plate(world,black,0,-3.7,0,6,1.8,26,.3);
    for(const z of [-12,12]){
      plate(world,teal,0,7.9,z,5.8,22.6,2.4,.5);
      plate(world,black,0,15.2,z,6.2,6.2,3,.38);
      drum(world,bright,0,15.2,z-Math.sign(z)*1.7,1.75,.9,'z');
      drum(world,red,0,15.2,z-Math.sign(z)*2.22,.97,.32,'z');
      for(const off of [-1.7,1.7]){
        box(world,satin,off,5.8,z+Math.sign(z)*1.28,.23,10.4,.10);
        drum(world,bright,off,17.4,z+Math.sign(z)*1.85,.30,.22,'z',6);
      }
      if(z>0)badge(world,'TX',0,15.2,z+1.91,10,2.4,'#283138');
      bolt(world,0,19.9,z);
    }
    for(const z of [-12,12]){
      drum(world,brass,0,-2.4,z,1.08,.65);
      for(const dx of [-2,2])drum(world,bright,dx,12.5,z+1.25,.38,.28,'z',6);
    }
    cable(rubber,[[1.2,1,-13],[4,-1,-16],[12,-4,-18],[26,-5,-24],[43,-5,-26]],.39);
    const light=new T.MeshBasicMaterial({color:0xe56946});
    rod(world,light,[0,15.2,9.8],[0,15.2,0],.16);
    outgoing=rod(world,light,[0,15.2,0],[0,15.2,-9.8],.16);
    plate(cart,black,0,7.4,0,7,1.5,3,.2);
    rod(cart,bright,[0,7.5,0],[0,13,0],.6);
    flag=box(cart,mat(0x3d4a54,.25,.42),0,16.5,0,1,9,.55);
  }else{
    plate(world,teal,-13,2.1,0,32,3.6,22,.46);
    plate(world,satin,-13,4.15,0,31,.55,21.6,.16);
    badge(world,'TICKER TIMER',-13,2.3,11.53,18,2.45);
    for(const x of [-26.5,.7])for(const z of [-8.7,8.7])bolt(world,x,4.64,z);
    // The rear-mounted electromagnet attracts the spring steel armature above the strip.
    box(world,black,-11,5.65,-6,11,2.1,7.2);
    drum(world,black,-11,9,-6,2.5,7);
    for(let i=0;i<19;i++){const ring=part(world,new T.TorusGeometry(2.9,.18,8,40),copper,-11,6.1+i*.30,-6);ring.rotation.x=Math.PI/2}
    for(const y of [5.95,12])drum(world,black,-11,y,-6,3.25,.65);
    drum(world,bright,-11,12.55,-6,1.46,.6);
    plate(world,mat(0x54626a),-20,8.65,-6,3,8.4,4,.18);
    striker=group(world);striker.position.set(-20,13.3,-6);
    box(striker,satin,5,0,0,12,.33,2.3);box(striker,satin,11,0,3,1.9,.33,7.6);
    drum(striker,black,11,-2.6,6,.55,5);drum(striker,bright,11,-5.25,6,.29,1.1);
    for(const x of [-21,-1.8])for(const z of [-3.2,3.2]){rod(world,bright,[x,4.4,z],[x,7,z],.26)}
    for(const x of [-21,-1.8])rod(world,bright,[x,7,-3.2],[x,7,3.2],.3);
    drum(world,ink,-9,6.77,-2.7,4.45,.18);drum(world,brass,-9,7.1,-2.7,.77,.55);
    plate(world,satin,-9,5.47,0,10.5,1.8,6,.1);
    for(const [x,m,dz] of [[-25,red,-3],[-21,black,2]]){
      cable(m,[[x,6,-8],[x,8.6,-10],[x-4,9,-14],[x-7,2,-17],[x-12,-3,-24+dz],[x-17,-4,-34+dz]],.32);
      drum(world,black,x,7.2,-8,.75,2.1);
    }
    bolt(world,-20,13.75,-6);
    for(const [x,m] of [[-25,red],[-21,black]]){drum(world,m,x,5.5,-8,1.12,1.8);drum(world,brass,x,6.47,-8,.46,.25)}
    paper=box(world,mat(0xfff2d5,.01,.8),0,6.55,0,1,.12,4.8);
    stamps=new T.InstancedMesh(new T.CircleGeometry(.33,12),new T.MeshBasicMaterial({color:0x242a36}),512);stamps.frustumCulled=false;world.add(stamps);
    plate(cart,red,-9.2,6.95,0,2.7,.85,5.2,.15);
  }

  const label=s=>window.labLanguage?.label(s)||s;
  let detail=false,lastDraw=null,lost=false;
  gl.domElement.addEventListener('webglcontextlost',()=>{lost=true;toggle.hidden=true});
  const toggle=document.createElement('button');toggle.type='button';toggle.className='instrument-detail';
  toggle.innerHTML='Detail view <small lang="zh-HK">器材近觀</small>';toggle.setAttribute('aria-pressed','false');
  (canvas.closest('.apparatus')||canvas).after(toggle);
  toggle.onclick=()=>{detail=!detail;toggle.setAttribute('aria-pressed',String(detail));lastDraw?.()};
  let oldW=0,oldH=0;const point=new T.Vector3(),matrix=new T.Object3D();
  return function draw(d){
    if(lost)return false;
    const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return false;
    const ratio=Math.min(devicePixelRatio||1,1.65),rw=Math.round(w*ratio),rh=Math.round(h*ratio);
    if(rw!==oldW||rh!==oldH){gl.setSize(rw,rh,false);oldW=rw;oldH=rh}
    const night=document.documentElement.dataset.theme==='tech';
    const center=detail?(timer?-11:0):(timer?30:2);
    const span=detail?(timer?52:62):(timer?132:Math.max(110,126+d.length));
    const viewW=Math.max(span, (detail?33:35)*w/h);
    cam.position.set(center-44,46,102);cam.lookAt(center,detail?9:6,0);
    Object.assign(cam,{left:-viewW/2,right:viewW/2,top:viewW*h/w/2,bottom:-viewW*h/w/2,near:.1,far:350});cam.updateProjectionMatrix();
    if(timer){
      const scale=Math.min(100,70/Math.max(.01,d.end)),head=-9;
      const delta=d.position*scale;cart.position.x=12+delta;
      const from=-32,to=cart.position.x-9.2;paper.scale.x=to-from;paper.position.x=(from+to)/2;
      striker.rotation.z=-.079+.064*(1-Math.cos(2*Math.PI*d.t*d.freq));
      stamps.count=d.dots?Math.min(512,d.count):0;
      matrix.rotation.x=-Math.PI/2;
      for(let n=0;n<stamps.count;n++){matrix.position.set(head+delta-d.at(n/d.freq)*scale,6.63,0);matrix.updateMatrix();stamps.setMatrixAt(n,matrix.matrix)}
      stamps.instanceMatrix.needsUpdate=true;
    }else{
      cart.position.x=d.direction*(d.front-d.length/2);flag.scale.x=d.length;outgoing.visible=!d.blocked;
    }
    wheelsets.forEach(o=>o.rotation.z=-cart.position.x/2.42);
    gl.render(world,cam);
    const g=canvas.getContext('2d');g.save();g.setTransform(canvas.width/w,0,0,canvas.height/h,0,0);
    const bg=g.createLinearGradient(0,0,0,h);bg.addColorStop(0,night?'#1a2b32':'#e5eae5');bg.addColorStop(1,night?'#0f1b21':'#f6f5ed');g.fillStyle=bg;g.fillRect(0,0,w,h);g.drawImage(gl.domElement,0,0,w,h);
    function xy(x,y,z){point.set(x,y,z).project(cam);return [(1+point.x)*w/2,(1-point.y)*h/2]}
    function tag(s,p,color){g.font='600 '+(w<500?11:13)+'px system-ui';g.textAlign='center';g.textBaseline='middle';const tw=g.measureText(s).width+10;if(p[0]<0||p[0]>w)return;
      const x=Math.max(tw/2+3,Math.min(w-tw/2-3,p[0])),y=Math.min(h-10,Math.max(10,p[1]));
      g.fillStyle=night?'#132128e8':'#f4f4ecd9';g.fillRect(x-tw/2,y-9,tw,18);g.fillStyle=color||(night?'#ebf0ea':'#23424b');g.fillText(s,x,y)}
    function arrow(p,length,color,name){if(Math.abs(length)<1)return;const x=p[0],y=p[1],end=x+length,side=Math.sign(length);g.strokeStyle=color;g.lineWidth=2;g.beginPath();g.moveTo(x,y);g.lineTo(end,y);g.lineTo(end-side*6,y-4);g.moveTo(end,y);g.lineTo(end-side*6,y+4);g.stroke();if(name)tag(name,[x+length/2,y-10],color)}
    if(timer){
      if(d.labels){tag(label('Ticker timer · 打點計時器'),xy(-14,18,-5));tag(label('Paper tape · 紙帶'),xy(-25,6.5,8));if(!d.v)tag(label('At rest · 靜止'),xy(cart.position.x,15,0));else tag(label('Trolley · 小車'),xy(cart.position.x,-6,8))}
      if(d.velocity)arrow(xy(cart.position.x,14,0),Math.min(w*.18,d.v*44),night?'#a2d8c4':'#23634c','v');
      if(d.accel)arrow(xy(cart.position.x,21,0),d.a*35,night?'#ffc087':'#884817','a');
    }else{
      const x=cart.position.x,P=xy(x,4.6,6.8);
      g.fillStyle='#ffce68';g.beginPath();g.arc(...P,3.8,0,Math.PI*2);g.fill();tag('P',[P[0],P[1]+14]);
      if(d.dimensions){const a=xy(x-d.length/2,23,0),b=xy(x+d.length/2,23,0);g.strokeStyle=night?'#e7c28e':'#785724';g.lineWidth=1.3;g.beginPath();g.moveTo(...a);g.lineTo(...b);for(const k of [a,b]){g.moveTo(k[0],k[1]-3);g.lineTo(k[0],k[1]+3)}g.stroke();tag('L = '+d.length.toFixed(1)+' cm',[(a[0]+b[0])/2,(a[1]+b[1])/2-13])}
      arrow(xy(x,-7,5),d.direction*29,night?'#bfdbd6':'#365f63');
    }
    g.restore();lastDraw=()=>draw(d);return true;
  }
};
