/* Lighting is drawn on a separate transparent layer. Model state and ray paths are untouched. */
(()=>{
 const objects=new Map(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
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
  for(const el of document.querySelectorAll('.box,.tool,main>header,main>aside,main>article,.panel,.card,.apparatus,.bench,.chart,.stage,.canvas-wrap,.hero-art')){
   el.classList.add('rgb-frame');if(getComputedStyle(el).position==='static')el.style.position='relative';
   let inversions=0;for(let p=el;p&&p!==document.documentElement;p=p.parentElement)if(/invert\(1\)/.test(getComputedStyle(p).filter))inversions++;
   el.classList.toggle('rgb-inverted',inversions%2===1);
  }
 }
 function update(){enabled=document.documentElement.dataset.style==='tech';if(overlay)overlay.hidden=!enabled;markFrames();last=0}
 function segment(points,from,to){
  let distance=0;g.beginPath();for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);
   if(len&&distance+len>=from&&distance<=to){const lo=Math.max(0,(from-distance)/len),hi=Math.min(1,(to-distance)/len);g.moveTo(a[0]+(b[0]-a[0])*lo,a[1]+(b[1]-a[1])*lo);g.lineTo(a[0]+(b[0]-a[0])*hi,a[1]+(b[1]-a[1])*hi)}distance+=len;
  }g.stroke();
 }
 function paint(now){requestAnimationFrame(paint);if(!enabled||document.hidden||now-last<(reduced.matches?250:33))return;last=now;
  const d=Math.min(devicePixelRatio||1,2);if(overlay.width!==Math.round(innerWidth*d)||overlay.height!==Math.round(innerHeight*d)){overlay.width=Math.round(innerWidth*d);overlay.height=Math.round(innerHeight*d)}g.setTransform(d,0,0,d,0,0);g.clearRect(0,0,innerWidth,innerHeight);g.lineCap='round';g.lineJoin='round';
  let index=0;for(const [canvas,paths]of objects){if(!canvas.isConnected||!canvas.checkVisibility())continue;const r=canvas.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight||r.width<1||r.height<1)continue;
   g.save();g.beginPath();g.rect(r.left,r.top,r.width,r.height);g.clip();
   for(const path of paths){const pts=path.map(([x,y])=>[r.left+x*r.width,r.top+y*r.height]);if(pts.some(p=>!p.every(Number.isFinite)))continue;let len=0;for(let i=1;i<pts.length;i++)len+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);if(len<5)continue;
    const shift=reduced.matches?0:now/5200;const gradient=g.createLinearGradient(pts[0][0],pts[0][1],pts.at(-1)[0]+80,pts.at(-1)[1]+160);for(let j=0;j<=4;j++)gradient.addColorStop(j/4,'hsl('+((j*85+shift*100+index*27)%360)+' 100% 67%)');
    g.shadowBlur=13;g.shadowColor='#18dcff';g.strokeStyle=gradient;g.lineWidth=3;segment(pts,0,len);
    for(let j=0;j<3;j++){const start=((shift+j/3+index*.07)%1)*len,travel=Math.min(55,len*.18);g.strokeStyle=['#b9ffff','#ffd5fa','#ddffb7'][j];g.shadowColor=['#00eaff','#ff28e7','#aaff00'][j];g.shadowBlur=18;g.lineWidth=3.5;segment(pts,start,Math.min(len,start+travel));if(start+travel>len)segment(pts,0,start+travel-len);}
    index++;
   }g.restore();
  }frameCount++;overlay.dataset.frames=String(frameCount);overlay.dataset.paths=String(index);
 }
 window.ydRGB={begin,path,rectangle,ring,three,get active(){return enabled},get objectCount(){return objects.size}};
 function init(){overlay=document.createElement('canvas');overlay.id='rgb-object-lights';overlay.setAttribute('aria-hidden','true');document.body.append(overlay);g=overlay.getContext('2d');update();requestAnimationFrame(paint);let pending=false;new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;markFrames()})}).observe(document.body,{childList:true,subtree:true});window.addEventListener('lab-theme-change',update)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
