/* Lighting is drawn on a separate transparent layer. Model state and ray paths are untouched. */
(()=>{
 const objects=new Map(),textZones=new WeakMap(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let textRanges=[],lastProtected=[],frames=[];
 // Capture actual glyph bounds, including alignment, baseline and canvas transforms.
 const proto=CanvasRenderingContext2D.prototype;
 function recordText(ctx,text,x,y,maxWidth){
  if(ctx.canvas===overlay||!String(text).trim())return;
  const m=ctx.measureText(text),scale=Number.isFinite(maxWidth)&&maxWidth>0?Math.min(1,maxWidth/Math.max(m.width,1)):1;
  const left=x-m.actualBoundingBoxLeft*scale,right=x+m.actualBoundingBoxRight*scale;
  const top=y-m.actualBoundingBoxAscent,bottom=y+m.actualBoundingBoxDescent,t=ctx.getTransform(),c=ctx.canvas;
  if(!c.width||!c.height)return;
  const points=[[left,top],[right,top],[right,bottom],[left,bottom]].map(([a,b])=>[(t.a*a+t.c*b+t.e)/c.width,(t.b*a+t.d*b+t.f)/c.height]);
  if(points.some(p=>!p.every(Number.isFinite)))return;
  let zones=textZones.get(c);if(!zones){zones=new Map();textZones.set(c,zones)}
  zones.set(String(text)+'|'+x+'|'+y+'|'+ctx.font,points);
  if(zones.size>512)zones.delete(zones.keys().next().value);
 }
 for(const method of ['fillText','strokeText']){const original=proto[method];proto[method]=function(...args){recordText(this,...args);return original.apply(this,args)}}
 const clear=proto.clearRect;proto.clearRect=function(...args){textZones.delete(this.canvas);return clear.apply(this,args)};
 for(const key of ['width','height']){const descriptor=Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype,key);if(descriptor?.set&&descriptor.configurable)Object.defineProperty(HTMLCanvasElement.prototype,key,{...descriptor,set(value){textZones.delete(this);descriptor.set.call(this,value)}})}
 let overlay,g,last=0,enabled=false,frameCount=0;
 const rectangle=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]];
 const ring=(x,y,r)=>Array.from({length:49},(_,i)=>[x+r*Math.cos(i*Math.PI/24),y+r*Math.sin(i*Math.PI/24)]);
 function begin(canvas){objects.set(canvas,[])}
 function path(ctx,points){
  if(points.length<2)return;const c=ctx.canvas,t=ctx.getTransform();
  const pts=points.map(([x,y])=>[(t.a*x+t.c*y+t.e)/c.width,(t.b*x+t.d*y+t.f)/c.height]);
  if(!objects.has(c))begin(c);objects.get(c).push(pts);
 }
 function three(canvas,scene,camera){
  if(!enabled)return;const paths=[];
  scene.traverseVisible(mesh=>{
   if(!mesh.isMesh||!mesh.geometry)return;const geom=mesh.geometry;
   if(!['BoxGeometry','CylinderGeometry'].includes(geom.type))return;
   const project=p=>{const v=camera.position.clone().set(...p).applyMatrix4(mesh.matrixWorld).project(camera);return[(v.x+1)/2,(1-v.y)/2]};
   if(geom.type==='CylinderGeometry'){
    const {radiusTop:rt,radiusBottom:rb,height:h}=geom.parameters;
    for(const [r,y]of[[rt,h/2],[rb,-h/2]])if(r>0)paths.push(Array.from({length:33},(_,i)=>project([r*Math.cos(i*Math.PI/16),y,r*Math.sin(i*Math.PI/16)])));
   }else{
    geom.computeBoundingBox();const a=geom.boundingBox.min,b=geom.boundingBox.max;
    const vertices=[[a.x,a.y,a.z],[b.x,a.y,a.z],[b.x,b.y,a.z],[a.x,b.y,a.z],[a.x,a.y,b.z],[b.x,a.y,b.z],[b.x,b.y,b.z],[a.x,b.y,b.z]];
    const view=camera.getWorldPosition(camera.position.clone()).sub(mesh.getWorldPosition(camera.position.clone()));
    for(const [indices,normal]of[[[0,3,2,1],[0,0,-1]],[[4,5,6,7],[0,0,1]],[[0,4,7,3],[-1,0,0]],[[1,2,6,5],[1,0,0]],[[3,7,6,2],[0,1,0]],[[0,1,5,4],[0,-1,0]]]){
     if(camera.position.clone().set(...normal).transformDirection(mesh.matrixWorld).dot(view)<=0)continue;
     paths.push([...indices,indices[0]].map(i=>project(vertices[i])));
    }
   }
  });objects.set(canvas,paths);
 }
 function markFrames(){
  frames=[...document.querySelectorAll('.box,.tool,main>header,main>aside,main>article,.panel,.card,.apparatus,.bench,.chart,.stage,.canvas-wrap,.hero-art')];
  for(const el of frames){
   el.classList.add('rgb-frame');if(getComputedStyle(el).position==='static')el.style.position='relative';
   let inversions=0;for(let p=el;p&&p!==document.documentElement;p=p.parentElement)if(/invert\(1\)/.test(getComputedStyle(p).filter))inversions++;
   el.classList.toggle('rgb-inverted',inversions%2===1);
  }
  textRanges=[];const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  for(let node;node=walker.nextNode();){if(!node.textContent.trim()||node.parentElement?.closest('script,style,canvas,lab-navigation'))continue;const range=document.createRange();range.selectNodeContents(node);textRanges.push(range)}
 }
 function update(){enabled=document.documentElement.dataset.style==='tech';if(overlay)overlay.hidden=!enabled;markFrames();last=0}
 function segment(points,from,to){
  let distance=0;g.beginPath();for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);
   if(len&&distance+len>=from&&distance<=to){const lo=Math.max(0,(from-distance)/len),hi=Math.min(1,(to-distance)/len);g.moveTo(a[0]+(b[0]-a[0])*lo,a[1]+(b[1]-a[1])*lo);g.lineTo(a[0]+(b[0]-a[0])*hi,a[1]+(b[1]-a[1])*hi)}distance+=len;
  }g.stroke();
 }
 function lightPath(pts,index,now){
  if(pts.some(p=>!p.every(Number.isFinite)))return;let len=0;for(let i=1;i<pts.length;i++)len+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);if(len<5)return;
  const shift=reduced.matches?0:now/5200,gradient=g.createLinearGradient(pts[0][0],pts[0][1],pts.at(-1)[0]+80,pts.at(-1)[1]+160);for(let j=0;j<=4;j++)gradient.addColorStop(j/4,'hsl('+((j*85+shift*100+index*27)%360)+' 100% 67%)');
  g.shadowBlur=10;g.shadowColor='#18dcff';g.strokeStyle=gradient;g.lineWidth=2.5;segment(pts,0,len);
  for(let j=0;j<3;j++){const start=((shift+j/3+index*.07)%1)*len,travel=Math.min(65,len*.18);g.strokeStyle=['#b9ffff','#ffd5fa','#ddffb7'][j];g.shadowColor=['#00eaff','#ff28e7','#aaff00'][j];g.shadowBlur=14;g.lineWidth=3;segment(pts,start,Math.min(len,start+travel));if(start+travel>len)segment(pts,0,start+travel-len);}
 }
 function roundedFrame(r,radius){const points=[],a=Math.min(radius,r.width/2,r.height/2);for(const [x,y,start]of [[r.right-a,r.top+a,-Math.PI/2],[r.right-a,r.bottom-a,0],[r.left+a,r.bottom-a,Math.PI/2],[r.left+a,r.top+a,Math.PI]])for(let i=0;i<=8;i++)points.push([x+a*Math.cos(start+i*Math.PI/16),y+a*Math.sin(start+i*Math.PI/16)]);points.push(points[0]);return points}
 function paint(now){requestAnimationFrame(paint);if(!enabled||document.hidden||now-last<(reduced.matches?250:33))return;last=now;
  const d=Math.min(devicePixelRatio||1,2);if(overlay.width!==Math.round(innerWidth*d)||overlay.height!==Math.round(innerHeight*d)){overlay.width=Math.round(innerWidth*d);overlay.height=Math.round(innerHeight*d)}g.setTransform(d,0,0,d,0,0);g.clearRect(0,0,innerWidth,innerHeight);g.lineCap='round';g.lineJoin='round';
  const frameRects=[];let frameIndex=0;
  for(const el of frames){if(!el.isConnected||!el.checkVisibility())continue;const r=el.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight||r.width<1||r.height<1)continue;
   let l=0,t=0,right=innerWidth,bottom=innerHeight;for(let p=el.parentElement;p&&p!==document.body;p=p.parentElement){const s=getComputedStyle(p),b=p.getBoundingClientRect();if(/auto|scroll|hidden|clip/.test(s.overflowX)){l=Math.max(l,b.left);right=Math.min(right,b.right)}if(/auto|scroll|hidden|clip/.test(s.overflowY)){t=Math.max(t,b.top);bottom=Math.min(bottom,b.bottom)}}
   if(right<=l||bottom<=t)continue;g.save();g.beginPath();g.rect(l,t,right-l,bottom-t);g.clip();lightPath(roundedFrame(r,parseFloat(getComputedStyle(el).borderTopLeftRadius)||3),frameIndex++,now);g.restore();frameRects.push(r);
  }
  let index=0;const visible=[];for(const [canvas,paths]of objects){if(!canvas.isConnected||!canvas.checkVisibility())continue;const r=canvas.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight||r.width<1||r.height<1)continue;visible.push([canvas,r]);
   g.save();g.beginPath();g.rect(r.left,r.top,r.width,r.height);g.clip();
   for(const path of paths){const pts=path.map(([x,y])=>[r.left+x*r.width,r.top+y*r.height]);lightPath(pts,index,now);
    index++;
   }g.restore();
  }
  // Erase only the decorative layer around text. Physical rays and text stay untouched.
  lastProtected=[];g.save();g.shadowBlur=0;g.globalCompositeOperation='destination-out';g.fillStyle='#000';
  function protect(left,top,right,bottom){const pad=5;const rect=[left-pad,top-pad,right-left+pad*2,bottom-top+pad*2];if(rect.every(Number.isFinite)&&rect[2]>0&&rect[3]>0){g.fillRect(...rect);lastProtected.push(rect)}}
  for(const canvas of document.querySelectorAll("canvas")){if(canvas===overlay||!canvas.checkVisibility()||!textZones.has(canvas))continue;const r=canvas.getBoundingClientRect();for(const pts of textZones.get(canvas)?.values()||[]){const xs=pts.map(p=>r.left+p[0]*r.width),ys=pts.map(p=>r.top+p[1]*r.height);protect(Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys))}}
  const litRects=[...frameRects,...visible.map(([,r])=>r)];for(const range of textRanges){if(!range.startContainer.isConnected)continue;for(const r of range.getClientRects()){if(r.width&&r.height&&litRects.some(c=>r.right>c.left&&r.left<c.right&&r.bottom>c.top&&r.top<c.bottom))protect(r.left,r.top,r.right,r.bottom)}}
  g.restore();frameCount++;overlay.dataset.frames=String(frameCount);overlay.dataset.paths=String(index);overlay.dataset.borderPaths=String(frameIndex);overlay.dataset.protectedLabels=String(lastProtected.length);
 }
 window.ydRGB={begin,path,rectangle,ring,three,get active(){return enabled},get objectCount(){return objects.size},get protectedAreas(){return lastProtected.map(r=>r.slice())}};
 function init(){overlay=document.createElement('canvas');overlay.id='rgb-object-lights';overlay.setAttribute('aria-hidden','true');document.body.append(overlay);g=overlay.getContext('2d');update();requestAnimationFrame(paint);let pending=false;new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;markFrames()})}).observe(document.body,{childList:true,subtree:true});window.addEventListener('lab-theme-change',update)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
