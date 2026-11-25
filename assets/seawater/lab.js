const iconSources=new Map();
function iconButton(el,icon,label,badge=''){
 const saved=iconSources.get(el);
 if(saved&&saved[0]===icon&&saved[1]===label&&saved[2]===badge&&el.dataset.uiLanguage===document.documentElement.lang)return;
 el.dataset.uiLanguage=document.documentElement.lang;iconSources.set(el,[icon,label,badge]);label=labText(label);
 const signature=[icon,label,badge].join('|');
 if(el.dataset.glyph===signature)return;
 el.dataset.glyph=signature;el.classList.add('icon-control');el.title=label;el.setAttribute('aria-label',label);
 el.innerHTML='<svg class="control-glyph" aria-hidden="true"><use href="#icon-'+icon+'"></use></svg>';
 if(badge){const tag=document.createElement('small');tag.textContent=badge;el.append(tag)}
}
const $=id=>document.getElementById(id), T=THREE, vec=(x,y,z)=>new T.Vector3(x,y,z);
const labView=$('view'),fullscreenButton=$('fullscreenLab');
const drawerToggle=$('drawerToggle');
function foldControls(folded){
 labView.classList.toggle('controls-folded',folded);
 drawerToggle.setAttribute('aria-expanded',String(!folded));
 iconButton(drawerToggle,'drawer',folded?'顯示控制欄':'收起控制欄');
 if(folded)$('hosePanel').open=false;
}
drawerToggle.onclick=()=>foldControls(!labView.classList.contains('controls-folded'));
const zoomButtons=[$('inspectGlass'),$('zoomIn'),$('zoomOut'),$('restoreView')];
const controlsHome=zoomButtons[3].nextElementSibling;
function setLabExpanded(active){
 if(active!==labView.classList.contains('lab-expanded')){
  if(active)drawerToggle.after(fullscreenButton,...zoomButtons);
  else controlsHome.before(fullscreenButton,...zoomButtons);
  foldControls(active);
 }
 labView.classList.toggle('lab-expanded',active);
 fullscreenButton.setAttribute('aria-pressed',String(active));
 iconButton(fullscreenButton,active?'collapse':'expand',active?'退出全螢幕':'全螢幕');
}
foldControls(false);
setLabExpanded(false);
fullscreenButton.onclick=async()=>{
 if(labView.classList.contains('lab-expanded')){
  if(document.fullscreenElement===labView)await document.exitFullscreen();
  setLabExpanded(false);
 }else{
  setLabExpanded(true);
  if(labView.requestFullscreen){
   try{await labView.requestFullscreen()}catch{/* Keep the viewport-filling layout. */}
  }
 }
};
document.addEventListener('fullscreenchange',()=>setLabExpanded(document.fullscreenElement===labView));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.fullscreenElement)setLabExpanded(false)});
const rotateHint=$('rotateHint');
try{rotateHint.hidden=sessionStorage.getItem('seawater.rotateHintDismissed')==='1'}catch{}
$('dismissRotate').onclick=()=>{
 rotateHint.hidden=true;
 try{sessionStorage.setItem('seawater.rotateHintDismissed','1')}catch{}
};
const scene=new T.Scene(), camera=new T.PerspectiveCamera(34,1,.1,100);
const renderer=new T.WebGLRenderer({canvas:$('sceneCanvas'),antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
// A small photographic studio reflected in the metal and curved glass.
function studioBackdrop(top,centre,edge){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
 const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(220,160,12,220,160,320);
 gradient.addColorStop(0,centre);gradient.addColorStop(.64,top);gradient.addColorStop(1,edge);
 ctx.fillStyle=gradient;ctx.fillRect(0,0,512,256);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;return texture;
}
const backdrops={tech:studioBackdrop('#23303a','#465966','#121b24'),paper:studioBackdrop('#e1dfd5','#faf5e8','#c0c6bf'),thermal:new T.Color(0x211533)};
const studio=new T.Scene();
studio.background=new T.Color(0x39424b);
for(const [x,y,z,w,h,intensity] of [[-5,4,2,2,8,5],[3,6,-4,8,3,4],[5,2,4,1,6,3]]){
 const panel=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color(intensity,intensity,intensity)}));
 panel.position.set(x,y,z);panel.lookAt(0,0,0);studio.add(panel);
}
const generator=new T.PMREMGenerator(renderer);
const studioReflection=generator.fromScene(studio,.025);
generator.dispose();
studio.children.forEach(p=>{p.geometry.dispose();p.material.dispose()});
scene.environment=studioReflection.texture;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=T.PCFSoftShadowMap;
scene.add(new T.HemisphereLight(0xf4faff,0x88949b,.68));
const sun=new T.DirectionalLight(0xfff4de,2);sun.position.set(-4,9,6);sun.intensity=1.35;scene.add(sun);
sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
Object.assign(sun.shadow.camera,{left:-7,right:7,top:6,bottom:-6,near:.5,far:24});
sun.shadow.normalBias=.015;sun.shadow.bias=-.00025;
const backlight=new T.DirectionalLight(0xb5dcff,1.1);backlight.position.set(3,4,-5);scene.add(backlight);
for(const [id,icon,label] of [['add','add','加入海水'],['granules','granules','防暴沸粒：有'],['labels','labels','顯示標籤'],['reset','reset','重新開始'],['cloth','cloth','拖動抹布，或用方向鍵移動']])iconButton($(id),icon,label);
iconButton(document.querySelector('#hosePanel summary'),'hose','接駁膠喉');
const surfaces=[];
const glassReflectance={value:1};
function solid(geometry,color,position,alpha=1){
 const mat=new T.MeshStandardMaterial({color,transparent:alpha<1,opacity:alpha,depthWrite:alpha===1,roughness:.46});
 const polished=[0x82979e,0xc59750,0xb99141].includes(color);
 if(polished){mat.metalness=.84;mat.roughness=.23}
 else if(alpha===1){mat.roughness=.67;mat.envMapIntensity=.42}
 if(color===0xbbe6e8||color===0x66b8be){
  mat.roughness=.075;mat.metalness=.18;mat.envMapIntensity=1.1;
  // Reflected light is strongest at grazing incidence. Keep the centre optically clear.
  mat.onBeforeCompile=shader=>{
   shader.uniforms.glassReflectance=glassReflectance;
   shader.fragmentShader="uniform float glassReflectance;\n"+shader.fragmentShader.replace('#include <opaque_fragment>',
    'diffuseColor.a *= mix(1.0,0.26 + 1.5 * pow(1.0 - abs(dot(normal,normalize(vViewPosition))),2.0),glassReflectance);\n#include <opaque_fragment>');
  };
 }
 const obj=new T.Mesh(geometry,mat);obj.castShadow=alpha===1;obj.receiveShadow=alpha===1;obj.position.copy(position);scene.add(obj);surfaces.push({obj,color,alpha});return obj;
}
function box(x,y,z,w,h,d,color){return solid(new T.BoxGeometry(w,h,d),color,vec(x,y,z))}
function rod(a,b,r,c,alpha=1){const v=b.clone().sub(a),obj=solid(new T.CylinderGeometry(r,r,v.length(),32),c,a.clone().lerp(b,.5),alpha);obj.quaternion.setFromUnitVectors(vec(0,1,0),v.normalize());return obj}
function ball(p,r,c,alpha=1){return solid(new T.SphereGeometry(r,40,28),c,p,alpha)}
const gauzeWires=[],tripodLegs=[],burnerParts=[],socketGlass=[],standParts=[],innerGlass=[];
const metal=0x82979e,glass=0xbbe6e8,water=0x43b5cf;
// Cut the sink opening through the worktop; its upper surface is y = -.02.
const slab=new T.Shape();
slab.moveTo(-6,-2.5);slab.lineTo(6,-2.5);slab.lineTo(6,2.5);slab.lineTo(-6,2.5);slab.closePath();
const cut=new T.Path();cut.moveTo(3.35,-1.35);cut.lineTo(3.35,1.05);cut.lineTo(5.25,1.05);cut.lineTo(5.25,-1.35);cut.closePath();slab.holes.push(cut);
const worktop=solid(new T.ExtrudeGeometry(slab,{depth:.52,bevelEnabled:false}),0x566270,vec(0,-.54,0));
worktop.rotation.x=-Math.PI/2;
// Fine mineral grain, tiled in local bench coordinates.
const grain=document.createElement('canvas');grain.width=grain.height=128;
const grainCtx=grain.getContext('2d'),grainPixels=grainCtx.createImageData(128,128);
let seed=199;
for(let i=0;i<grainPixels.data.length;i+=4){
 seed=(Math.imul(seed,1664525)+1013904223)>>>0;
 const value=218+(seed>>>27);
 grainPixels.data.set([value,value,value,255],i);
}
grainCtx.putImageData(grainPixels,0,0);
const grainMap=new T.CanvasTexture(grain);grainMap.wrapS=grainMap.wrapT=T.RepeatWrapping;
worktop.material.map=grainMap;worktop.material.roughness=.81;
const lift=.55;
const raised=(x,y,z)=>vec(x,y+lift,z);
const outlet=raised(2.32,.76,0);
const flask=raised(-3,1.8,0), high=raised(-1.85,2.85,0),low=raised(1.5,1.65,0),tip=raised(2.32,1.22,0);
const collarAngle=Math.asin(.19/.72);
const bulb=solid(new T.SphereGeometry(.72,80,48,0,2*Math.PI,collarAngle,Math.PI-collarAngle),glass,flask,.42);
const innerRadius=.69;
const brine=ball(flask.clone(),innerRadius,water,.75);
renderer.localClippingEnabled=true;
const waterline=new T.Plane(vec(0,-1,0),flask.y);
brine.material.clippingPlanes=[waterline];
const waterSurface=solid(new T.CircleGeometry(1,64),water,flask.clone(),.84);
waterSurface.rotation.x=-Math.PI/2;
waterSurface.material.side=T.DoubleSide;
function updateBrine(volume,surge){
 brine.visible=waterSurface.visible=volume>0;
 if(!volume)return;
 // A half-full round flask holds the initial 50 mL. Invert spherical-cap volume.
 let lo=0,hi=1;
 for(let i=0;i<16;i++){
  const h=(lo+hi)/2;
  if(h*h*(3-h)<2*volume/50)lo=h;else hi=h;
 }
 const offset=Math.max(-innerRadius,Math.min(innerRadius,innerRadius*((lo+hi)/2-1)+.16*surge));
 waterSurface.position.y=waterline.constant=flask.y+offset;
 waterSurface.scale.setScalar(Math.sqrt(innerRadius**2-offset**2));
}
// Open glass neck with a lateral opening at the steam takeoff.
const neckRadius=.19,branchRadius=.115,neckBase=1.8+.72*Math.cos(collarAngle),mouth=3.81;
const branchHeight=3.25;
const branchStart=raised(-3+neckRadius-.02,branchHeight,0);
const branchAxis=high.clone().sub(branchStart).normalize();
const branchUp=vec(-branchAxis.y,branchAxis.x,0);
// Each strip joins two matching polylines. The opening and sidearm share their rim vertices.
function glassStripGeometry(strips){
 const vertices=[],indices=[];
 for(const [left,right] of strips){
  const first=vertices.length/3;
  left.forEach((v,i)=>{vertices.push(v.x,v.y,v.z,right[i].x,right[i].y,right[i].z)});
  for(let i=0;i+1<left.length;i++){
   const j=first+i*2;
   indices.push(j,j+1,j+2,j+2,j+1,j+3);
  }
 }
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 return geometry;
}
const topRim=[],bottomRim=[],topExit=[],bottomExit=[];
for(let i=0;i<=32;i++){
 const a=-Math.PI/2+i*Math.PI/32,z=branchRadius*Math.sin(a);
 const x=Math.sqrt(neckRadius**2-z*z);
 for(const sign of [1,-1]){
  const offset=sign*branchRadius*Math.cos(a);
  const y=branchStart.y+(flask.x+x-branchStart.x)*branchAxis.y/branchAxis.x+offset/branchAxis.x;
  (sign===1?topRim:bottomRim).push(vec(flask.x+x,y,z));
  (sign===1?topExit:bottomExit).push(high.clone().addScaledVector(branchUp,offset).add(vec(0,0,z)));
 }
}
const edgeAngleAtNeck=Math.asin(branchRadius/neckRadius);
const backArc=Array.from({length:81},(_,i)=>{
 const a=edgeAngleAtNeck+(2*Math.PI-2*edgeAngleAtNeck)*i/80;
 return vec(flask.x+neckRadius*Math.cos(a),0,neckRadius*Math.sin(a));
});
const atHeight=(rim,y)=>rim.map(p=>vec(p.x,y+lift,p.z));
const neck=solid(glassStripGeometry([[atHeight(bottomRim,neckBase),bottomRim],[topRim,atHeight(topRim,mouth)],[atHeight(backArc,neckBase),atHeight(backArc,mouth)]]),glass,vec(0,0,0),.32);
const branch=solid(glassStripGeometry([[topExit,topRim],[bottomRim,bottomExit]]),glass,vec(0,0,0),.42);
// Continuous open glass bore, including the rounded delivery bend.
const bendStart=tip.clone().lerp(high,.048),bendEnd=tip.clone().lerp(outlet,.35);
const deliveryPath=new T.CurvePath();
deliveryPath.add(new T.LineCurve3(high,low));
deliveryPath.add(new T.LineCurve3(low,bendStart));
deliveryPath.add(new T.QuadraticBezierCurve3(bendStart,tip,bendEnd));
deliveryPath.add(new T.LineCurve3(bendEnd,outlet));
const deliveryTube=solid(new T.TubeGeometry(deliveryPath,150,.105,32,false),glass,vec(0,0,0),.55);
deliveryTube.material.side=T.DoubleSide;
const rim=solid(new T.TorusGeometry(neckRadius,.017,12,48),glass,raised(-3,mouth,0),.72);rim.rotation.x=Math.PI/2;
// Annular rubber stopper with a central bore around the thermometer.
const bungProfile=[[.047,3.66],[.167,3.66],[.183,mouth],[.227,mouth+.02],[.233,mouth+.15],[.047,mouth+.15],[.047,3.66]];
const bung=solid(new T.LatheGeometry(bungProfile.map(([r,y])=>new T.Vector2(r,y)),48),0x854b39,raised(-3,0,0));bung.material.side=T.DoubleSide;
const thermometerTopY=5.20;
const thermometerStem=rod(raised(-3,3.24,0),raised(-3,thermometerTopY,0),.044,glass,.43);
const thermometerColumn=rod(raised(-3,3.23,0),raised(-3,thermometerTopY-.14,0),.012,0xad3936);
const sensor=ball(raised(-3,3.21,0),.051,0x983732);sensor.scale.y=1.65;
for(let i=0;i<13;i++)box(-2.981,4.04+lift+i*.085,.033,.026,.009,.009,metal);
const granules=[];
let useGranules=true,granulesLocked=false;
for(let i=0;i<9;i++){
 const a=i*2.4,r=.14+(i%3)*.069;
 const chip=solid(new T.IcosahedronGeometry(.053,0),0xf4e6bd,raised(-3+r*Math.cos(a),1.8-Math.sqrt(.69**2-r**2)+.05,r*Math.sin(a)));
 chip.rotation.set(a,a*.3,0);granules.push(chip);
}
// Tripod and open wire mesh below the flask.
for(let i=0;i<3;i++){
 const a=i*Math.PI*2/3+.3;
 const foot=vec(-3+.65*Math.cos(a),.02,.65*Math.sin(a)),top=vec(-3+.49*Math.cos(a),1.045+lift,.49*Math.sin(a));
 for(let j=0;j<6;j++)tripodLegs.push({mesh:rod(foot.clone().lerp(top,j/6),foot.clone().lerp(top,(j+1)/6),.035,metal),fraction:(j+.5)/6});
}
const support=solid(new T.TorusGeometry(.50,.03,10,48),metal,raised(-3,1.047,0));support.rotation.x=Math.PI/2;
for(let i=-6;i<=6;i++){
 const d=i*.09;
 const wireStart=surfaces.length;
 rod(vec(-3+d,1.082+lift,-.55),vec(-3+d,1.082+lift,.55),.009,metal);
 rod(vec(-3.55,1.093+lift,d),vec(-2.45,1.093+lift,d),.009,metal);
 for(const {obj} of surfaces.slice(wireStart))gauzeWires.push({mesh:obj,weight:1-.6*Math.abs(i)/6});
}
const gasLine=new T.CatmullRomCurve3([vec(-3.57,.27,.20),vec(-3.88,.105,.38),vec(-4.45,.09,.65),vec(-4.84,.17,.43),vec(-5.02,.43,.40)]);
solid(new T.TubeGeometry(gasLine,32,.055,12,false),0x393c40,vec(0,0,0));
const valveParts=[],handle=new T.Group(),tapBrass=0xb78c50;
scene.add(handle);handle.position.set(-5.55,.78,.4);
valveParts.push(rod(vec(-5.55,.015,.4),vec(-5.55,.12,.4),.253,metal),
 rod(vec(-5.55,.12,.4),vec(-5.55,.64,.4),.137,tapBrass),
 rod(vec(-5.55,.43,.4),vec(-5.00,.43,.4),.083,tapBrass),
 rod(vec(-5.55,.62,.4),vec(-5.55,.78,.4),.071,metal));
for(const x of [-5.20,-5.12,-5.04])valveParts.push(rod(vec(x-.018,.43,.4),vec(x+.018,.43,.4),.099,tapBrass));
const lever=box(.18,0,0,.55,.094,.13,0xc99726);
const grip=box(.37,.005,0,.26,.115,.16,0xe4b63c);
const screw=rod(vec(0,.045,0),vec(0,.071,0),.058,metal);
handle.add(lever,grip,screw);valveParts.push(handle);
handle.rotation.y=Math.PI/2;
function toggleBurner(){
 if(broken)return;
 heat=!heat;
 if(heat)granulesLocked=true;
}
$('granules').onclick=()=>{
 if(granulesLocked){granuleAttempt=true;return}
 useGranules=!useGranules;
 granules.forEach(chip=>chip.visible=useGranules);
 $('granules').setAttribute('aria-pressed',String(useGranules));
 iconButton($('granules'),'granules','防暴沸粒：'+(useGranules?'有':'冇'));
};

const jackets=[];
function openTube(a,b,r,color,opacity){
 const tube=solid(new T.CylinderGeometry(r,r,a.distanceTo(b),48,1,true),color,a.clone().lerp(b,.5),opacity);
 tube.quaternion.setFromUnitVectors(vec(0,1,0),b.clone().sub(a).normalize());return tube;
}
const axisVector=low.clone().sub(high).normalize();
const socketNormal=vec(-axisVector.y,axisVector.x,0);
const shellRadius=.30,socketRadius=.084,shellLength=high.distanceTo(low);
const upperSocket=high.clone().lerp(low,.095),lowerSocket=low.clone().lerp(high,.095);
// Each strip stops at the circular bore of a nozzle. The steam tube is a separate mesh.
const shellVertices=[],shellFaces=[];
const angles=Array.from({length:129},(_,i)=>i*2*Math.PI/128);
const edgeAngle=Math.asin(socketRadius/shellRadius);
angles.push(edgeAngle,Math.PI-edgeAngle,Math.PI+edgeAngle,2*Math.PI-edgeAngle);
angles.sort((a,b)=>a-b);
for(const [index,angle] of angles.entries()){
 const z=shellRadius*Math.sin(angle),n=shellRadius*Math.cos(angle);
 const half=Math.sqrt(Math.max(0,socketRadius**2-z*z));
 const upper=.095*shellLength,lower=.905*shellLength;
 const gap1=n>0?half:0,gap2=n<0?half:0;
 for(const t of [0,upper-gap1,upper+gap1,lower-gap2,lower+gap2,shellLength]){
  const pt=high.clone().addScaledVector(axisVector,t).addScaledVector(socketNormal,n);
  shellVertices.push(pt.x,pt.y,pt.z+z);
 }
 if(index)for(const k of [0,2,4]){
  const a=6*(index-1)+k;shellFaces.push(a,a+1,a+6,a+1,a+7,a+6);
 }
}
const shellGeometry=new T.BufferGeometry();
shellGeometry.setAttribute('position',new T.Float32BufferAttribute(shellVertices,3));
shellGeometry.setIndex(shellFaces);shellGeometry.computeVertexNormals();
const jacketShell=solid(shellGeometry,0x66b8be,vec(0,0,0),.32);
jacketShell.material.side=T.DoubleSide;
for(const end of [high,low]){
 const profile=[[shellRadius,0],[.298,.025],[.284,.055],[.250,.085],[.17,.119],[.119,.146],[.106,.166]];
 const seal=solid(new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),64),glass,end,.62);
 seal.quaternion.setFromUnitVectors(vec(0,1,0),axisVector.clone().multiplyScalar(end===high?-1:1));
 seal.material.side=T.DoubleSide;
}
for(let j=0;j<18;j++){
 const a=high.clone().lerp(low,j/18),b=high.clone().lerp(low,(j+1)/18);
 jackets.push(openTube(a,b,.265,glass,.48));
 innerGlass.push(openTube(a,b,.107,glass,.84));
}
// Intersect a horizontal water surface with the tilted annular jacket.
const jacketAxis=low.clone().sub(high).normalize(),jacketLength=high.distanceTo(low);
const outerR=shellRadius-.012,innerR=.105;
const jacketBottom=low.y-jacketAxis.x*outerR,jacketTop=high.y+jacketAxis.x*outerR;
const jacketClip=new T.Plane(vec(0,-1,0),jacketBottom);
const coolant=rod(high,low,outerR,water,.38);
coolant.material.clippingPlanes=[jacketClip];
const slices=64,capGeo=new T.BufferGeometry();
const capVertices=new T.BufferAttribute(new Float32Array((slices+1)*4*3),3);
capGeo.setAttribute('position',capVertices);
const faces=[];
for(let j=0;j<slices;j++)for(const side of [0,2]){
 const a=j*4+side;faces.push(a,a+4,a+1,a+1,a+4,a+5);
}
capGeo.setIndex(faces);
const coolantSurface=solid(capGeo,water,vec(0,0,0),.82);
coolantSurface.material.side=T.DoubleSide;coolantSurface.frustumCulled=false;
function updateCoolant(level){
 const y=jacketBottom+level*(jacketTop-jacketBottom);
 jacketClip.constant=y;coolant.visible=level>.0005;
 coolantSurface.visible=coolant.visible&&level<.9995;
 if(!coolantSurface.visible)return;
 const dy=y-high.y,centre=high.x+jacketAxis.x*dy/jacketAxis.y;
 const xMin=high.x-jacketAxis.y*dy/jacketAxis.x,xMax=xMin+jacketLength/jacketAxis.x;
 const clamp=x=>Math.max(xMin,Math.min(xMax,x));
 for(let j=0;j<=slices;j++){
  const z=outerR*Math.sin(Math.PI*(j/slices-.5));
  const span=Math.sqrt(Math.max(0,outerR**2-z*z))/-jacketAxis.y;
  const hole=Math.sqrt(Math.max(0,innerR**2-z*z))/-jacketAxis.y;
  const xs=[centre-span,centre-hole,centre+hole,centre+span];
  for(let k=0;k<4;k++)capVertices.setXYZ(4*j+k,clamp(xs[k]),y,z);
 }
 capVertices.needsUpdate=true;capGeo.computeVertexNormals();
}

const ports={tap:vec(4.03,1.27,.15),high:upperSocket.clone().addScaledVector(socketNormal,.66),low:lowerSocket.clone().addScaledVector(socketNormal,-.66),sink:vec(3.92,-.16,.49)};
for(const [base,end] of [[upperSocket,ports.high],[lowerSocket,ports.low]]){
 const direction=end.clone().sub(base).normalize(),axis=low.clone().sub(high).normalize();
 const transverse=Math.sqrt(1-direction.dot(axis)**2);
 const root=base.clone().addScaledVector(direction,shellRadius/transverse);
 const nozzle=openTube(root,end,socketRadius,0x66b8be,.64);nozzle.material.side=T.DoubleSide;
 // Fit the lower rim to the curved jacket, including both sides of the saddle.
 const points=nozzle.geometry.attributes.position;
 for(let i=0;i<points.count;i++){
  const local=vec(0,0,0).fromBufferAttribute(points,i);
  if(local.y>0)continue;
  const offset=local.applyQuaternion(nozzle.quaternion).add(nozzle.position).sub(base);
  const radial=offset.clone().addScaledVector(axis,-offset.dot(axis));
  const normalDir=direction.clone().addScaledVector(axis,-direction.dot(axis));
  const b=radial.dot(normalDir),a=normalDir.lengthSq();
  const step=(-b+Math.sqrt(Math.max(0,b*b-a*(radial.lengthSq()-shellRadius**2))))/a;
  points.setY(i,points.getY(i)+step-.002);
 }
 points.needsUpdate=true;nozzle.geometry.computeVertexNormals();
 const lip=solid(new T.RingGeometry(.066,.092,32),glass,end,.85);
 lip.quaternion.setFromUnitVectors(vec(0,0,1),direction);lip.material.side=T.DoubleSide;socketGlass.push([nozzle,lip]);
}
// Brushed steel liner inset below a thin flush rim.
box(4.30,-.53,.15,1.90,.08,2.40,metal);
for(const z of [-1.05,1.35]){
 box(4.30,-.26,z,1.94,.50,.055,metal);box(4.30,-.018,z,2.02,.025,.09,metal);
}
for(const x of [3.35,5.25]){
 box(x,-.26,.15,.055,.50,2.40,metal);box(x,-.018,.15,.09,.025,2.44,metal);
}
rod(vec(4.30,-.491,.15),vec(4.30,-.477,.15),.145,0x455a60);
for(let i=-1;i<=1;i++)box(4.30,-.472,.15+i*.058,.21,.012,.016,metal);
// Bunsen burner: cast foot, gas inlet, brass collar and open chimney.
const burnerStart=surfaces.length;
const brass=0xc59750,iron=0x48565b;
solid(new T.CylinderGeometry(.32,.48,.135,36),iron,vec(-3,.072,0));
rod(vec(-3,.13,0),vec(-3,.27,0),.16,brass);
rod(vec(-3.09,.21,0),vec(-3.51,.26,.17),.065,brass);
rod(vec(-3.48,.255,.16),vec(-3.58,.27,.20),.079,brass);
const sleeve=(r,h,y,color,start=0,arc=Math.PI*2)=>{
 const wall=solid(new T.CylinderGeometry(r,r,h,48,1,true,start,arc),color,vec(-3,y,0));
 wall.material.side=T.DoubleSide;
};
for(let i=0;i<6;i++)sleeve(.135,(.36+lift)/6,.41+(i+.5)*(.36+lift)/6,metal);
sleeve(.17,.045,.288,brass);sleeve(.17,.045,.427,brass);
// Opposed openings through the collar and mixing tube.
for(const start of [.52,Math.PI+.52])sleeve(.17,.096,.357,brass,start,Math.PI-1.04);
sleeve(.085,.15,.343,iron);
burnerParts.push(...surfaces.slice(burnerStart).map(s=>s.obj));
const flame=solid(new T.LatheGeometry([[.085,0],[.128,.045],[.113,.145],[.07,.255],[.002,.39]].map(([r,y])=>new T.Vector2(r,y)),40),0x498bff,raised(-3,.77,0),.55);
flame.material.emissive.setHex(0x164cbe);
const flameCore=solid(new T.ConeGeometry(.081,.218,32),0x91e8ff,raised(-3,.882,0),.9);
flameCore.material.emissive.setHex(0x38a4eb);

// Clamp the flask neck and the condenser jacket on independent retort stands.
function standClamp(centre,axis,radius){
 const first=surfaces.length;
 const z=-.83;
 box(centre.x,.07,z,.81,.14,.86,iron);
 rod(vec(centre.x,.14,z),vec(centre.x,centre.y+.35,z),.047,metal);
 box(centre.x,centre.y,z,.20,.19,.22,iron);
 rod(vec(centre.x-.19,centre.y,z),vec(centre.x,centre.y,z),.045,brass);
 rod(vec(centre.x,centre.y,z),centre.clone().add(vec(0,0,-radius)),.058,metal);
 const across=vec(0,0,-1),perp=axis.clone().cross(across).normalize();
 for(const sign of [-1,1]){
  const pts=[];
  for(let j=0;j<=18;j++){
   const angle=sign*j/18*2.39;
   pts.push(centre.clone().addScaledVector(across,radius*Math.cos(angle)).addScaledVector(perp,radius*Math.sin(angle)));
  }
  solid(new T.TubeGeometry(new T.CatmullRomCurve3(pts),20,.035,10,false),iron,vec(0,0,0));
  rod(pts[15],pts[18],.047,0x895c49);
 }
 standParts.push(surfaces.slice(first).map(s=>s.obj));
}
standClamp(raised(-3,2.70,0),vec(0,1,0),.223);
standClamp(high.clone().lerp(low,.58),low.clone().sub(high).normalize(),.298);
// Model the heavy heel, hollow wall and rolled pouring lip as one revolved section.
const cupProfile=[[.001,.012],[.388,.012],[.414,.02],[.423,.048],[.458,.65],[.468,.681],[.469,.697],[.458,.706],[.447,.697],[.446,.679],[.405,.07],[.385,.053],[.001,.053]];
const cupGeometry=new T.LatheGeometry(cupProfile.map(([r,y])=>new T.Vector2(r,y)),96);
const cupVertices=cupGeometry.attributes.position;
for(let i=0;i<cupVertices.count;i++){
 const x=cupVertices.getX(i),y=cupVertices.getY(i),z=cupVertices.getZ(i);
 const spout=Math.pow(Math.max(0,-x/Math.hypot(x,z)),36)*Math.max(0,(y-.45)/.25);
 cupVertices.setXYZ(i,x-.125*spout,y+.025*spout,z);
}
cupGeometry.computeVertexNormals();
const cup=solid(cupGeometry,glass,vec(2.32,0,0),.58);
for(let i=1;i<=8;i++){
 const y=.095+i*.061,r=.421+.054*y;
 const mark=solid(new T.TorusGeometry(r,.005,6,16,i%2===0?.48:.25),0xe8ece8,vec(2.32,y,0),.86);
 mark.rotation.set(Math.PI/2,0,1.04);
}
const collected=rod(vec(2.32,.035,0),vec(2.32,.56,0),.405,water,.72);
const loose=[vec(-4.2,.11,1.47),vec(-.65,.11,1.47),vec(.12,.11,1.72),vec(3.08,.11,1.96)];
const taps=['tap','tap2'];
ports.tap2=ports.tap.clone();ports.tap.z+=.6;ports.tap2.z-=.6;
const openTaps=new Set();
const spoutMidpoints={};
const waterHandles=taps.map(k=>{
 const outlet=ports[k],z=outlet.z,bodyX=5.48;
 rod(vec(bodyX,-.02,z),vec(bodyX,.09,z),.21,metal);
 rod(vec(bodyX,.09,z),vec(bodyX,1.61,z),.112,metal);
 ball(vec(bodyX,1.52,z),.155,metal);
 const bend=new T.CatmullRomCurve3([vec(bodyX,1.49,z),vec(5.23,1.56,z),vec(4.77,1.63,z),vec(4.33,1.64,z),vec(4.10,1.56,z),vec(outlet.x,1.42,z)]);
 spoutMidpoints[k]=bend.getPointAt(.5);
 solid(new T.TubeGeometry(bend,40,.112,20,false),metal,vec(0,0,0));
 rod(vec(outlet.x,1.43,z),outlet,.135,metal);
 rod(outlet,vec(outlet.x,outlet.y-.003,z),.095,0x354b50);
 rod(vec(bodyX,1.60,z),vec(bodyX,1.82,z),.062,metal);
 return box(bodyX,1.84,z,.42,.08,.11,0x267882);
});
// An outline marks the moving controls without changing their thermal colours.
const reducedValveMotion=matchMedia('(prefers-reduced-motion: reduce)');
const valveOutlineMaterial=new T.LineBasicMaterial({color:0xffed9a,transparent:true,depthWrite:false});
function outlineValve(part){
 const outline=new T.LineSegments(new T.EdgesGeometry(part.geometry),valveOutlineMaterial);
 outline.scale.setScalar(1.04);
 outline.raycast=()=>{};
 part.add(outline);
 return outline;
}
[lever,grip].forEach(outlineValve);
const waterOutlines=waterHandles.map(outlineValve);
const codes=['A1','A2','B1','B2'];
const names={free:'鬆開',tap:'T1 水龍頭',tap2:'T2 水龍頭',high:'C1 燒瓶端（高位）',low:'C2 接收器端（低位）',sink:'S 洗手盆'};
const connections=Array(4).fill('free'),hoses=[],endButtons=[];
let slippedEnd=-1,slippedPosition;
function point(i){return ports[connections[i]]||(i===slippedEnd?slippedPosition:loose[i])}
const hoseWater=[],hoseBands=[],socketSleeves=[];
function hose(i){
 const a=point(2*i),b=point(2*i+1),mid=a.clone().lerp(b,.5);mid.y=.21;mid.z=1.1+i*.48;
 const resting=connections[2*i]==='free'&&connections[2*i+1]==='free';
 const positions=resting
  ? [a,a.clone().lerp(b,.27).add(vec(0,0,.54)),a.clone().lerp(b,.70).add(vec(0,0,-.33)),b]
  : [a,a.clone().lerp(mid,.35).add(vec(0,.08,.32)),mid.clone().add(vec(0,0,.38)),b.clone().lerp(mid,.35).add(vec(0,.08,.32)),b];
 // Slide the rubber end over the glass and leave along the nozzle axis before bending.
 for(const end of [2*i,2*i+1]){
  const key=connections[end],attached=key==='high'||key==='low';
  let sleeve=socketSleeves[end];
  if(sleeve)sleeve.visible=attached;
  if(!attached)continue;
  const normal=socketNormal.clone().multiplyScalar(key==='high'?1:-1);
  const tip=ports[key],exit=tip.clone().addScaledVector(normal,.12);
  const guide=tip.clone().addScaledVector(normal,.31);
  const bend=[exit,guide];
  if(key==='high'){
   // Round the hanging hose over the barb before gravity draws it down.
   const tangent=vec(normal.y,-normal.x,.5).normalize();
   for(let j=1;j<=6;j++){
    const angle=j*Math.PI/9;
    bend.push(guide.clone().addScaledVector(normal,.35*Math.sin(angle)).addScaledVector(tangent,.35*(1-Math.cos(angle))));
   }
  }
  if(end%2===0)positions.splice(0,1,...bend);
  else positions.splice(positions.length-1,1,...bend.reverse());
  if(!sleeve){
   sleeve=socketSleeves[end]=solid(new T.CylinderGeometry(.075,.103,.32,32),i?0xbb833b:0x387c83,vec(0,0,0));
  }
  sleeve.position.copy(tip).addScaledVector(normal,-.02);
  sleeve.quaternion.setFromUnitVectors(vec(0,1,0),normal);
 }
 const curve=new T.CatmullRomCurve3(positions);
 const geometry=new T.TubeGeometry(curve,48,.074,12,false);
 // A translucent cutaway overlay lets students follow water through an opaque rubber hose.
 for(const [layer,radius,color,opacity] of [[hoseWater,.076,0x52cddd,.64],[hoseBands,.078,0xc0ffff,.95]]){
  const g=new T.TubeGeometry(curve,48,radius,12,false);
  g.setDrawRange(0,0);
  if(layer[i]){layer[i].geometry.dispose();layer[i].geometry=g}
  else layer[i]=solid(g,color,vec(0,0,0),opacity);
  layer[i].renderOrder=layer===hoseWater?2:3;
 }
 if(hoses[i]){hoses[i].geometry.dispose();hoses[i].geometry=geometry}else hoses[i]=solid(geometry,i?0xbb833b:0x387c83,vec(0,0,0));
}
let heat=false,thermal=false,charge=0,dist=0,temp=22,fill=0,spill=0,section=Array(18).fill(22),yaw=.12,pitch=.47;
for(const [group,name] of ['青喉','啡喉'].entries()){
 const row=document.createElement('fieldset'),legend=document.createElement('legend');
 legend.dataset.copy=name;legend.textContent=labText(name);row.append(legend);$('ends').append(row);
 for(let side=0;side<2;side++){
  const i=group*2+side,btn=document.createElement('button');
  btn.onclick=()=>pickEnd(i);row.append(btn);endButtons.push(btn);
 }
}
for(const key of [...taps,'high','low','sink']){
 const btn=document.createElement('button');iconButton(btn,taps.includes(key)?'tap':key,names[key],names[key].split(' ')[0]);btn.onclick=()=>connect(key);$('targets').append(btn);
}
let recovery='',blockedTime=0,failedJoint=null;
let hotDisconnectAttempt=false;
function hosesLockedByHeat(){
 return heat || Math.max(temp,headTemp,baseTemperature)>=40;
}
function connect(key){
 if(recovery)return;
 if(selected<0)return;
 const occupied=connections.indexOf(key);
 const removesConnection=connections[selected]!==key && (connections[selected]!=='free' || (key!=='free' && occupied>=0));
 if(removesConnection && hosesLockedByHeat()){
  hotDisconnectAttempt=true;
  return false;
 }
 if(key!=='free'&&occupied>=0)connections[occupied]='free';
 if(selected===slippedEnd)slippedEnd=-1;
 connections[selected]=key;hose(0);hose(1);choose(-1);return true;
}
hose(0);hose(1);
// Use the same horizontal surface that is drawn inside the jacket.
const c1IntakeHeight=upperSocket.y+socketNormal.y*outerR;
function canDrainPort(port){
 const end=connections.indexOf(port);
 if(end<0)return true;
 const outlet=connections[end^1];
 return outlet==='sink'||outlet==='free';
}
function retainedJacketLevel(){
 // A hose ending at a shut tap is a closed branch. Only an open outlet can lower the surface.
 const lowIntake=lowerSocket.y-socketNormal.y*outerR;
 const outletHeight=canDrainPort('low')?lowIntake:canDrainPort('high')?c1IntakeHeight:jacketTop;
 const limit=Math.max(0,(outletHeight-jacketBottom)/(jacketTop-jacketBottom));
 return Math.min(fill,limit);
}
function trace(key){
 const ends=connections,idx=ends.indexOf(key);
 if(idx<0)return {out:ports[key],drain:true};
 const dest=ends[idx^1];if(dest==='sink')return {out:ports.sink,drain:true,hoseStart:idx};
 if(dest==='free')return {out:point(idx^1),looseEnd:idx^1,hoseStart:idx};
 if(taps.includes(dest))return {tapLoop:true};
 const other=dest==='low'?'high':'low',exit=ends.indexOf(other);
 if(exit>=0&&taps.includes(ends[exit^1]))return {blocked:true,feed:dest};
 if(dest==='low'&&jacketClip.constant<c1IntakeHeight)return {inlet:dest,drain:exit>=0&&ends[exit^1]==='sink'};
 return {inlet:dest,hoseStart:exit>=0?exit:undefined,openPort:exit<0?other:null,out:exit<0?ports[other]:point(exit^1),drain:exit>=0&&ends[exit^1]==='sink'};
}
function drawHoseFlow(start,age){
 const n=Math.floor(start/2);
   const transit=hoses[n].geometry.parameters.path.getLength()/3.8;
   const front=Math.min(48,Math.floor(48*age/transit));
   const reversed=start%2===1;
   const draw=(mesh,first,count)=>{
    mesh.visible=count>0;
    mesh.geometry.setDrawRange((reversed?48-first-count:first)*72,count*72);
   };
   draw(hoseWater[n],0,front);
   const band=Math.floor(48*((age/transit)%1));
   draw(hoseBands[n],Math.max(0,band-3),Math.min(3,band,front));
 return transit;
}
const supplies=taps.map(()=>({route:null,age:0,ready:false}));
function updateSupply(key,i,dt){
 const state=supplies[i],start=connections.indexOf(key);
 const dest=start<0?null:connections[start^1];
 const active=openTaps.has(key)&&(dest==='low'||dest==='high');
 const route=(dest==='low'||dest==='high')?start+':'+dest:null;
 if(route!==state.route){state.route=route;state.age=0}
 state.ready=false;
 if(active){
  state.age+=dt;
  state.ready=state.age>=drawHoseFlow(start,state.age);
 }else if(route&&state.age>0){
  drawHoseFlow(start,state.age);
  hoseBands[Math.floor(start/2)].visible=false;
 }
}
const streams=taps.map(()=>({jet:rod(vec(0,0,0),vec(0,1,0),.044,water,.82),puddle:ball(vec(0,.012,1.7),1,water,.56),size:0,route:null,age:0}));
// Each stopped return flow leaves a finite slug, including any water already in free fall.
const drainingReturns=[];
function releaseReturn(start,age){
 const n=Math.floor(start/2),source=hoseWater[n];
 const waterSlug=new T.Mesh(source.geometry.clone(),source.material);
 waterSlug.renderOrder=source.renderOrder;
 const lastJet=new T.Mesh(streams[0].jet.geometry,streams[0].jet.material);
 scene.add(waterSlug,lastJet);
 drainingReturns.push({start,inlet:connections[start],age,elapsed:0,waterSlug,lastJet,
  transit:hoses[n].geometry.parameters.path.getLength()/3.8});
}
function advanceDrains(dt){
 for(let i=drainingReturns.length-1;i>=0;i--){
  const d=drainingReturns[i],out=ports.sink;
  d.elapsed+=dt;
  const height=Math.max(.02,out.y+.47);
  if(connections[d.start]!==d.inlet||connections[d.start^1]!=='sink'||d.elapsed>=d.transit+Math.sqrt(height/4.9)){
   scene.remove(d.waterSlug,d.lastJet);d.waterSlug.geometry.dispose();drainingReturns.splice(i,1);continue;
  }
  const front=Math.min(48,Math.floor(48*(d.age+d.elapsed)/d.transit));
  const tail=Math.min(48,Math.floor(48*d.elapsed/d.transit));
  d.waterSlug.geometry.setDrawRange((d.start%2?48-front:tail)*72,(front-tail)*72);
  d.waterSlug.visible=front>tail;
  const fall=time=>Math.min(height,4.9*Math.max(0,time-d.transit)**2);
  const bottom=fall(d.age+d.elapsed),top=fall(d.elapsed);
  d.lastJet.visible=bottom>top;
  if(d.lastJet.visible){
   d.lastJet.scale.y=bottom-top;d.lastJet.position.copy(out);d.lastJet.position.y-=(top+bottom)/2;
  }
 }
}
const plumes=taps.map(()=>solid(new T.BufferGeometry(),water,vec(0,0,0),.68));
const spray=taps.map(()=>Array.from({length:20},()=>ball(vec(0,0,0),.039,water,.84)));
function sprayOffset(i,f){return vec((i%2?1:-1)*.55*f,.55*f,1.13*f)}
const droplet=ball(outlet.clone(),.07,0x378ca5,.95);
const dropVolume=.05;
// Form liquid on the lower inner wall, then carry that same volume to the delivery tip.
const filmBeads=Array.from({length:16},(_,i)=>({
 mesh:ball(high.clone(),.058,0x3986a8,.94),start:.08+.15*(i%4),volume:0,travel:0
}));
let beadIndex=0,escapingFraction=0;
function advanceFilm(amount,dt){
 const forming=amount>1e-10;
 while(amount>1e-10){
  const bead=filmBeads[beadIndex],take=Math.min(amount,dropVolume/2-bead.volume);
  bead.volume+=take;amount-=take;
  if(bead.volume>=dropVolume/2-1e-10){bead.travel=.001;beadIndex=(beadIndex+1)%filmBeads.length}
 }
 for(const bead of filmBeads){
  if(bead.volume>0&&(bead.travel>0||!forming)){
   if(!bead.travel&&bead===filmBeads[beadIndex])beadIndex=(beadIndex+1)%filmBeads.length;
   bead.travel+=dt/.95;
  }
  if(bead.travel>=1){dripPhase+=bead.volume/dropVolume;bead.travel=bead.volume=0}
  bead.mesh.visible=bead.volume>0;
  if(!bead.mesh.visible)continue;
  const u=bead.start+(1-bead.start)*bead.travel;
  deliveryPath.getPointAt(u,bead.mesh.position);
  bead.mesh.position.y-=.052*(1-u);
  bead.mesh.scale.setScalar(Math.cbrt(bead.volume/(dropVolume/2)));
 }
}
const fallingDrop=ball(outlet.clone(),.07,0x378ca5,.95);
const fallDuration=.18;
let fallAge=null;
// Liquid-equivalent vapour volumes in mL; count condensate on impact.
let boilPower=0,vapourInHead=0,experimentSeconds=0;
const arrivalTimes=[];
let dripPhase=0, steamAge=0, headTemp=22, fast=false;
$('fast').onclick=()=>fast=!fast;
let nextBump=1.6,burstAge=1,granuleAttempt=false,bumped=false;
const splash=Array.from({length:5},()=>ball(flask.clone(),.023,water,.86));
const bubbles=Array.from({length:6},()=>ball(flask.clone(),.034,0xe1f8fb,.75));
const mist=Array.from({length:10},()=>ball(vec(0,0,0),.09,0xf2f6f4,.35));
// A classroom model: the damage threshold varies by flask and is not a material rating.
const damageDose=Math.random()<.55?15+20*Math.random():Infinity;
let dryDose=0,baseTemperature=22,broken=false,inFlight=null;
let flaskSaltMg=0,sampleSaltMg=0;
const sampleKey='seawater.receiver.v1';
function saveReceiver(){
 try{sessionStorage.setItem(sampleKey,JSON.stringify({volumeMl:dist,saltMg:sampleSaltMg}))}catch{}
}
const heatBands=Array.from({length:8},(_,i)=>solid(new T.SphereGeometry(.722,40,4,0,2*Math.PI,Math.PI-(i+1)*.13,.13),glass,flask,.82));
const crystals=Array.from({length:32},(_,i)=>{
 const a=i*2.4,r=.09+.32*Math.sqrt(i/32);
 const crystal=box(flask.x+r*Math.cos(a),flask.y-Math.sqrt(innerRadius**2-r*r)+.027,r*Math.sin(a),.085,.035,.065,0xf2f4ee);
 crystal.rotation.y=a;return crystal;
});
const crackPoints=[[-.34,-.45],[-.24,-.37],[-.26,-.23],[-.12,-.17],[-.16,-.04],[.02,.04]].map(([x,y])=>flask.clone().add(vec(x,y,Math.sqrt(.723**2-x*x-y*y))));
const crack=solid(new T.TubeGeometry(new T.CatmullRomCurve3(crackPoints),18,.013,6,false),0x39302d,vec(0,0,0));
crack.visible=false;
const brineSlug=ball(flask,.062,water,.95);
brineSlug.visible=false;
function startCarryover(){
 if(inFlight||charge<.12||Math.random()>=.22)return;
 const volume=.12,salt=volume*Math.min(360,flaskSaltMg/charge);
 flaskSaltMg-=salt;charge-=volume;
 inFlight={age:0,volume,salt,start:vec(flask.x,waterline.constant,0)};
}
function moveCarryover(dt){
 brineSlug.visible=Boolean(inFlight);if(!inFlight)return;
 const slug=inFlight;slug.age+=dt;
 if(slug.age<.4)brineSlug.position.lerpVectors(slug.start,branchStart,slug.age/.4);
 else if(slug.age<.75)brineSlug.position.lerpVectors(branchStart,high,(slug.age-.4)/.35);
 else if(slug.age<2.25)deliveryPath.getPointAt((slug.age-.75)/1.5,brineSlug.position);
 else{
  const f=Math.min(1,(slug.age-2.25)/.22);
  brineSlug.position.copy(outlet);brineSlug.position.y-=(outlet.y-.05-.525*dist/50)*f*f;
  if(f>=1){mixReceiver(slug.volume,(temp+equipmentHeat.tip)/2);dist+=slug.volume;sampleSaltMg+=slug.salt;inFlight=null;brineSlug.visible=false;saveReceiver()}
 }
}
$('add').onclick=()=>{if(!charge&&!heat&&Math.max(temp,baseTemperature)<40){charge=50;flaskSaltMg+=1750}};
$('incident').addEventListener('cancel',e=>e.preventDefault());
$('restartIncident').onclick=()=>location.reload();
// Select the loose joint once, when the blocked circuit fails.
function advanceBlockedCircuit(dt){
 if(recovery||jacketClip.constant<c1IntakeHeight||![...openTaps].some(k=>trace(k).blocked)){blockedTime=0;return}
 blockedTime+=dt;
 if(blockedTime<2)return;
 failedJoint=Math.random()<.5?'high':'low';
 const end=connections.indexOf(failedJoint);
 slippedPosition=ports[failedJoint].clone().add(vec(.22,-.13,.35));slippedEnd=end;
 connections[end]='free';blockedTime=0;hose(Math.floor(end/2));
}
// Gravity drainage from an exposed lower socket, independent of the tap-fed jets.
const jacketDrain={
 jet:rod(vec(0,0,0),vec(0,1,0),.052,water,.85),
 puddle:ball(vec(0,.016,0),1,water,.56),size:0,landed:0,packets:[],age:0
};
function drainLowerSocket(dt){
 const d=jacketDrain,out=ports.low,height=out.y-.025;
 const flight=Math.sqrt(height/4.9);
 const pouring=!openTaps.size&&!connections.includes('low')&&fill>0;
 if(pouring){
  // A finite drawdown: discharge slows with the square root of remaining head.
  const next=Math.max(0,Math.sqrt(fill)-.17*dt)**2;
  d.packets.push({at:clock,amount:fill-next});
  fill=next;
 }
 while(d.packets.length&&clock-d.packets[0].at>=flight){
  d.landed+=d.packets.shift().amount;
  d.size=Math.sqrt(d.landed);
  if(!recovery){
   recovery=openTaps.size?'stop':'drain';choose(-1);
   for(const btn of endButtons)btn.disabled=true;
  }
 }
 if(pouring)d.age+=dt;
 const bottom=Math.min(height,4.9*d.age*d.age);
 const top=pouring?0:d.packets.length?Math.min(height,4.9*(clock-d.packets[d.packets.length-1].at)**2):height;
 d.jet.visible=bottom>top;
 if(d.jet.visible){
  const radius=.12+.88*Math.sqrt(fill);
  d.jet.scale.set(radius,bottom-top,radius);
  d.jet.position.copy(out);d.jet.position.y-=(bottom+top)/2;
 }else if(!pouring)d.age=0;
 d.puddle.visible=d.size>0;
 d.puddle.position.set(out.x,.016,out.z);
 d.puddle.scale.set(d.size,.012,d.size*.65);
 if(recovery==='drain'&&!pouring&&!d.packets.length){
  recovery='wipe';startWiping();
 }
}
function beginLeakRecovery(){
 if(recovery)return;
 recovery='stop';choose(-1);
 for(const btn of endButtons)btn.disabled=true;
}
function toggleWater(key){
 if(recovery&&!openTaps.has(key))return;
 if(openTaps.has(key)){openTaps.delete(key)}else openTaps.add(key);
 if(recovery==='stop'&&!openTaps.size){recovery='drain'}

}
taps.forEach(key=>$(key).onclick=()=>toggleWater(key));
const board=$('wipeBoard'), mop=$('cloth'), ink=board.getContext('2d',{willReadFrequently:true});
let clothDrag=null,clothX=40,clothY=88;
function putCloth(x,y){
 clothX=Math.max(0,Math.min(board.width,x));clothY=Math.max(0,Math.min(board.height,y));
 mop.style.left=100*clothX/board.width+'%';mop.style.top=100*clothY/board.height+'%';
}
function startWiping(){
 $('cleaning').hidden=false;
 ink.globalCompositeOperation='source-over';ink.clearRect(0,0,board.width,board.height);
 for(const stream of [...streams,jacketDrain]){
  if(stream.size<=0)continue;
  const pos=stream.puddle.position,x=300+pos.x*42,y=100+pos.z*29;
  const r=16+stream.size*24;ink.fillStyle='#57afbc';ink.beginPath();ink.ellipse(x,y,r,r*.65,-.16,0,2*Math.PI);ink.fill();
  ink.fillStyle='#b3e5e6';ink.beginPath();ink.ellipse(x-r*.38,y-r*.14,r*.28,2,-.3,0,2*Math.PI);ink.fill();
 }
 putCloth(42,165);
}
function wipeTo(x,y){
 if(heat)return;
 ink.globalCompositeOperation='destination-out';ink.lineWidth=38;ink.lineCap='round';ink.strokeStyle='black';
 ink.beginPath();ink.moveTo(clothX,clothY);putCloth(x,y);ink.lineTo(clothX,clothY);ink.stroke();
 const pixels=ink.getImageData(0,0,board.width,board.height).data;
 for(let i=3;i<pixels.length;i+=4)if(pixels[i]>8)return;
 finishWiping();
}
mop.onpointerdown=e=>{if(heat||clothDrag!==null)return;e.preventDefault();clothDrag=e.pointerId;mop.setPointerCapture(e.pointerId)};
mop.onpointermove=e=>{if(e.pointerId!==clothDrag)return;const r=board.getBoundingClientRect();wipeTo((e.clientX-r.left)*board.width/r.width,(e.clientY-r.top)*board.height/r.height)};
mop.onpointerup=mop.onpointercancel=mop.onlostpointercapture=()=>{clothDrag=null};
mop.onkeydown=e=>{const delta={ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,-12],ArrowDown:[0,12]}[e.key];if(delta){e.preventDefault();wipeTo(clothX+delta[0],clothY+delta[1])}};
function finishWiping(){
 if(recovery!=='wipe'||openTaps.size)return;
 clothDrag=null;failedJoint=null;$('cleaning').hidden=true;
 jacketDrain.landed=0;
 for(const stream of [...streams,jacketDrain]){stream.size=0;stream.puddle.visible=false}
 recovery='';
 for(const btn of endButtons)btn.disabled=false;
 choose(-1);
 setHint('枱面抹乾喇，檢查喉頭，改好接駁先再開水。');
};
$('heat').onclick=toggleBurner;
$('eye').onclick=()=>{thermal=!thermal;$('lens').hidden=$('scale').hidden=!thermal};
$('reset').onclick=()=>location.reload();
const canvas=renderer.domElement,picker=new T.Raycaster(),pointers=new Map();
let zoom=1,press=null,inspectCondenser=false;
let panX=0,panY=0,pinchStart=null;
function changeZoom(factor){
 zoom=Math.max(.65,Math.min(3,zoom*factor));
 $('zoomIn').disabled=zoom>=3;
 $('zoomOut').disabled=zoom<=.65;
}
for(const [id,factor,label] of [['zoomIn',1.25,'放大'],['zoomOut',.8,'縮細']]){
 iconButton($(id),id,label);
 $(id).onclick=()=>changeZoom(factor);
}
iconButton($('inspectGlass'),'inspectGlass','近看冷凝管');
$('inspectGlass').onclick=()=>{
 inspectCondenser=true;yaw=-.14;pitch=.18;panX=panY=0;changeZoom(2.3/zoom);beginPinch();
};
iconButton($('restoreView'),'restoreView','回復視角');
$('restoreView').onclick=()=>{
 inspectCondenser=false;yaw=.12;pitch=.47;panX=0;panY=0;
 changeZoom(1/zoom);
 beginPinch();
};
canvas.style.touchAction='none';
canvas.addEventListener('wheel',e=>{
 e.preventDefault();
 const pixels=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?canvas.clientHeight:1);
 changeZoom(Math.exp(-Math.max(-300,Math.min(300,pixels))*.002));
},{passive:false});
function fingerDistance(){
 const [a,b]=pointers.values();
 return Math.hypot(a.x-b.x,a.y-b.y);
}
function beginPinch(){
 if(pointers.size!==2){pinchStart=null;return}
 const [a,b]=pointers.values();
 pinchStart={x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:fingerDistance(),zoom,panX,panY};
}
canvas.onpointerdown=e=>{
 pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 press=pointers.size===1?{x:e.clientX,y:e.clientY}:null;
 beginPinch();
 canvas.setPointerCapture(e.pointerId);
};
canvas.onpointermove=e=>{
 const old=pointers.get(e.pointerId);
 if(!old)return;
 pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pointers.size===2&&pinchStart){
  const [a,b]=pointers.values();
  panX=Math.max(-2,Math.min(2,pinchStart.panX+((a.x+b.x)/2-pinchStart.x)/canvas.clientWidth));
  panY=Math.max(-2,Math.min(2,pinchStart.panY+((a.y+b.y)/2-pinchStart.y)/canvas.clientHeight));
  if(pinchStart.distance>2)changeZoom(pinchStart.zoom*fingerDistance()/(pinchStart.distance*zoom));
 }else if(pointers.size===1){
  yaw-=(e.clientX-old.x)*.008;
  pitch=Math.max(.12,Math.min(1.15,pitch+(e.clientY-old.y)*.006));
  if(press&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>=6)press=null;
 }
};
canvas.onpointerup=e=>{
 if(pointers.delete(e.pointerId)&&press&&Math.hypot(e.clientX-press.x,e.clientY-press.y)<6){
 const r=canvas.getBoundingClientRect();
 picker.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),camera);
 const hit=picker.intersectObjects([...waterHandles,...valveParts],true)[0];
 if(hit){const i=waterHandles.indexOf(hit.object);if(i<0)toggleBurner();else toggleWater(taps[i])}
 }
 beginPinch();
 press=null;
};
canvas.onpointercancel=canvas.onlostpointercapture=e=>{if(pointers.delete(e.pointerId))beginPinch();press=null};
const palette=['#21114c','#7751c6','#ec5682','#ffac43','#fff3a7'].map(x=>new T.Color(x));
// Relative surface temperatures for the classroom thermal view. Each node keeps its heat after the flame goes out.
const equipmentHeat={gauze:22,ring:22,barrel:22,neck:22,branch:22,bung:22,tip:22,receiver:22,flaskClamp:22,jacketClamp:22};
let sampleTemperature=22;
function mixReceiver(volume,incoming){
 sampleTemperature=(dist*sampleTemperature+volume*incoming)/(dist+volume);
}
const boreTemperatures=Array(18).fill(22);
const coolantWarmth=Array(18).fill(0);
function advanceCooling(dt,flow,boiling){
 // Move coolant one jacket section at a time; use the previous upstream value.
 const steps=Math.max(1,Math.ceil(dt/.12)),step=dt/steps;
 for(let k=0;k<steps;k++){
  for(let j=0;j<18;j++){
   const i=flow==='high'?17-j:j;
   const upstream=flow==='high'?i-1:i+1;
   const upstreamWarmth=coolantWarmth[upstream]??0;
   if(flow)coolantWarmth[i]+=(upstreamWarmth-coolantWarmth[i])*Math.min(1,4*step);
   const wet=high.y+(low.y-high.y)*(i+.5)/18<jacketClip.constant;
   coolantWarmth[i]=approach(coolantWarmth[i],boiling&&wet?1:0,boiling ? .035 : .022,step);
  }
 }
}
function approach(current,target,rate,dt){return target+(current-target)*Math.exp(-rate*dt)}
function updateEquipmentHeat(dt,boiling,efficiency){
 const t=equipmentHeat;
 function follow(key,target,rate){t[key]=approach(t[key],target,rate,dt)}
 follow('barrel',heat?168:22,heat ? .12 : .055);
 follow('gauze',heat?240:22,heat ? .15 : .045);
 follow('ring',22+.46*(t.gauze-22),.055);
 follow('neck',Math.max(headTemp,22+.23*(baseTemperature-22)),.12);
 follow('bung',22+.52*(t.neck-22),.035);
 follow('branch',22+(t.neck-22)*(boiling ? .98 : .54),.16);
 follow('flaskClamp',22+.43*(t.neck-22),.05);
 for(let i=0;i<18;i++){
  const f=(i+.5)/18, covered=high.y+(low.y-high.y)*f<jacketClip.constant;
  const cooling=covered?(1-coolantWarmth[i])*.80+.08:.10;
  boreTemperatures[i]=approach(boreTemperatures[i],22+(t.branch-22)*(1-cooling*f),.35,dt);
  section[i]=approach(section[i],22+(boreTemperatures[i]-22)*(covered ? .14+.70*coolantWarmth[i] : .78),.12,dt);
 }
 follow('jacketClamp',22+.48*(section[10]-22),.04);
 follow('tip',22+.82*(boreTemperatures[17]-22),.15);
 sampleTemperature=approach(sampleTemperature,22,.012,dt);
 follow('receiver',22+(sampleTemperature-22)*Math.min(.8,dist/3),.045);
}
function paintEquipment(){
 const t=equipmentHeat;
 const paint=(obj,value)=>tint(obj.material,value);
 for(const {mesh,weight} of gauzeWires)paint(mesh,22+(t.gauze-22)*weight);
 paint(support,t.ring);
 for(const {mesh,fraction} of tripodLegs)paint(mesh,22+(t.ring-22)*(.05+.95*fraction**2));
 for(const part of burnerParts)paint(part,22+(t.barrel-22)*Math.max(.025,Math.min(1,(part.position.y/1.32)**1.8)));
 paint(neck,t.neck);paint(branch,t.branch);paint(bung,t.bung);paint(rim,t.bung);
 paint(sensor,headTemp);paint(thermometerStem,22+.27*(headTemp-22));paint(thermometerColumn,22+.3*(headTemp-22));
 standParts.forEach((parts,i)=>parts.forEach((obj,j)=>paint(obj,22+((i?t.jacketClamp:t.flaskClamp)-22)*(j<2 ? .08 : j<5 ? .5 : 1))));
 streams.forEach((stream,i)=>{
  const path=trace(taps[i]);
  const outletHeat=path.inlet?section[path.inlet==='low'?1:16]:22;
  paint(stream.jet,outletHeat);paint(plumes[i],outletHeat);
  for(const drop of spray[i])paint(drop,outletHeat);
 });
 paint(jacketDrain.jet,section[16]);
 paint(deliveryTube,t.tip);paint(cup,t.receiver);paint(collected,sampleTemperature);
 for(const obj of [droplet,fallingDrop])paint(obj,t.tip);
 for(const obj of [...granules,...crystals])paint(obj,charge?temp:baseTemperature);
 for(const obj of [...splash,...bubbles,brineSlug])paint(obj,temp);
 for(const obj of mist)paint(obj,22+.75*(t.tip-22));
 socketGlass.forEach((parts,i)=>parts.forEach(obj=>paint(obj,section[i?16:1])));
 paint(coolant,(section[1]+section[16])/2);paint(coolantSurface,(section[1]+section[16])/2);
 hoses.forEach((obj,i)=>{
  const socket=connections.slice(2*i,2*i+2).find(k=>k==='high'||k==='low');
  const out=streams.some(s=>s.returnStart!=null&&Math.floor(s.returnStart/2)===i);
  const local=socket==='high'?section[1]:section[16];
  paint(obj,22+(socket?(local-22)*(out ? .54 : .10):0));
  paint(hoseWater[i],out?local:22);paint(hoseBands[i],out?local:22);
 });
}
function tint(mat,t){const n=Math.max(0,Math.min(3.999,(t-15)/90*4)),k=Math.floor(n);mat.color.copy(palette[k]).lerp(palette[k+1],n-k)}
$('labels').onclick=()=>{
 const hide=$('view').classList.toggle('unlabelled');
 iconButton($('labels'),'labels',hide?'顯示標籤':'隱藏標籤');$('labels').setAttribute('aria-pressed',String(!hide));
};
const markers=[];let selected=-1;
let selectedPort=null;
function choose(i,port=null){
 if(recovery&&(i>=0||port))return;
 selectedPort=port;
 selected=i;iconButton($('connectHint'),'cancel','取消選擇');$('connectHint').hidden=i<0&&!port;setHint(port?names[port]+' → 點喉頭（取消）':i<0?'點喉頭或接口開始接駁。':codes[i]+' → 點接口（取消）');
 $('targets').hidden=i<0;
 const attached=i>=0?i:port?connections.indexOf(port):-1;
 for(const button of [$('detach'),$('panelDetach')]){
  button.hidden=attached<0||connections[attached]==='free';
  if(!button.hidden){
   const pickup=connections[attached]==='sink';
   const action=pickup?'拎返上去':'鬆開';
   const label=pickup?codes[attached]+'：由洗手盆拎返上去':action+' '+codes[attached]+' ↔ '+names[connections[attached]].split(' ')[0];
   iconButton(button,pickup?'pickup':'detach',label);
  }
 }
 endButtons.forEach((btn,j)=>{
  btn.setAttribute('aria-pressed',String(j===i));
  const dest=connections[j];
  iconButton(btn,'end',codes[j]+' '+(dest==='free'?'未接':names[dest]),codes[j]+(dest==='free'?'':' → '+names[dest].split(' ')[0]));
 });
 for(const m of markers){
  m.btn.hidden=m.end!==undefined&&i>=0;
  m.dot.classList.toggle('connect-target',port?m.end!==undefined:i>=0&&m.end===undefined);
 }
}
function pickEnd(i){
 if(recovery)return;
 if(selectedPort){selected=i;connect(selectedPort)}else choose(selected===i?-1:i);
}
function marker(code,getPoint,end,key){
 const btn=document.createElement('button');btn.textContent=code;btn.className='pin '+(end===undefined?'port':end<2?'a':'b');
 btn.dataset.copyAria=end===undefined?names[key]:code+' '+(end<2?'青喉':'啡喉');btn.setAttribute('aria-label',labText(btn.dataset.copyAria));
 const line=document.createElementNS('http://www.w3.org/2000/svg','line');
 const dot=document.createElement('span');dot.className='socket-dot';
 dot.tabIndex=0;dot.setAttribute('role','button');dot.dataset.copyAria=btn.dataset.copyAria;dot.setAttribute('aria-label',btn.getAttribute('aria-label'));dot.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();btn.click()}};dot.onclick=()=>btn.click();
 $('leaders').append(line);$('markers').append(btn,dot);markers.push({btn,getPoint,end,line,dot,key,isTap:taps.includes(key)});
 btn.onclick=()=>{if(end!==undefined)pickEnd(end);else if(selected>=0)connect(key);else choose(-1,selectedPort===key?null:key)};
}
codes.forEach((code,i)=>marker(code,()=>point(i),i));
for(const key of Object.keys(ports))marker(names[key].split(' ')[0],()=>ports[key],undefined,key);
function detachSelected(){
 if(selectedPort)selected=connections.indexOf(selectedPort);
 const lifted=selected;
 const pickup=connections[lifted]==='sink';
 const removed=connect('free');
 if(removed&&pickup&&!recovery)choose(lifted);
}
$('detach').onclick=$('panelDetach').onclick=detachSelected;
$('connectHint').onclick=()=>choose(-1);
choose(-1);
const apparatus=[
 ['Sink',vec(4.40,-.12,.12)],['Beaker',vec(2.32,.34,0)],
 ['Thermometer',raised(-3,4.65,0)],['Rubber stopper',raised(-3,3.87,0)],['Distillation flask',flask],
 ['Tripod',raised(-3,.45,.45)],['Wire gauze',raised(-3.4,1.09,.4)],['Bunsen burner',vec(-3,.8,0)],
 ['Gas tap',vec(-5.55,.7,.4)],['Condenser',high.clone().lerp(low,.40)],
 ['Retort stand and clamp',vec(T.MathUtils.lerp(high.x,low.x,.58),.66,-.83)],
 ['Water taps',vec(5.48,1.6,.15)],
 ['Rubber hose',()=>hoses[0].geometry.parameters.path.getPoint(.5)]
];
const nameLayer=$('apparatusNames');
const nameLabels=apparatus.map(([label,location])=>{
 const make=tag=>document.createElementNS('http://www.w3.org/2000/svg',tag);
 const group=make('g'),line=make('path'),dot=make('circle'),text=make('text');
 text.textContent=label;dot.setAttribute('r',2);group.append(line,dot,text);nameLayer.append(group);
 return {location,line,dot,text};
});
let showNames=false;
function toggleNames(on){
 showNames=on;nameLayer.style.display=on?'block':'none';
 $('namesToggle').setAttribute('aria-pressed',String(on));
 iconButton($('namesToggle'),'names',on?'隱藏器材英文全名':'顯示器材英文全名');
}
toggleNames(false);$('namesToggle').onclick=()=>toggleNames(!showNames);
function placeNames(w,h,markersPlaced){
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 const occupied=markersPlaced.map(p=>({x:p.x,y:p.y,hw:p.wide?34:19,hh:13}));
 for(const {location,line,dot,text} of nameLabels){
  const pos=typeof location==='function'?location():location;
  const v=pos.clone().project(camera),x=(v.x+1)*w/2,y=(1-v.y)*h/2;
  const outside=x<0||x>w||y<0||y>h;
  const half=text.getComputedTextLength()/2+3;
  const anchorX=clamp(x,2,w-2),anchorY=clamp(y,2,h-2);
  const inset=text.textContent==='Sink'||text.textContent==='Beaker';
  let best,lowest=Infinity;
  for(let dy=-96;dy<=96;dy+=16)for(let dx=-96;dx<=96;dx+=12){
   const cx=clamp(anchorX+dx,half+4,w-half-4),cy=clamp(anchorY+dy,12,h-12);
   const overlap=occupied.reduce((n,r)=>n+Math.max(0,half+r.hw-Math.abs(r.x-cx))*Math.max(0,10+r.hh-Math.abs(r.y-cy)),0);
   const cost=overlap*(inset&&!outside?0:200)+(cx-anchorX)**2+(cy-anchorY+(outside?0:inset?0:10))**2;
   if(cost<lowest){lowest=cost;best={x:cx,y:cy,hw:half,hh:9}}
  }
  occupied.push(best);
  text.setAttribute('text-anchor','middle');text.setAttribute('dominant-baseline','central');
  text.setAttribute('x',best.x);text.setAttribute('y',best.y);
  line.style.display=dot.style.display=outside?'':'none';
  if(outside){
   line.setAttribute('d','M'+best.x+' '+best.y+' L'+anchorX+' '+anchorY);
   dot.setAttribute('cx',anchorX);dot.setAttribute('cy',anchorY);
  }
 }
}
let previousLayout='';
function placeMarkers(w,h){
 const signature=[w,h,yaw,pitch,zoom,panX,panY,thermal,showNames,$('view').classList.contains('unlabelled'),selected,selectedPort,...connections].join(',');
 if(signature===previousLayout)return;previousLayout=signature;camera.updateMatrixWorld();
 const placed=[];
 const detach=$('detach');
 if(!detach.hidden){
  const v=(selectedPort?ports[selectedPort]:point(selected)).clone().project(camera);
  const px=(1+v.x)*w/2,py=(1-v.y)*h/2;
  const x=Math.max(detach.offsetWidth/2+3,Math.min(w-detach.offsetWidth/2-3,px+(px+detach.offsetWidth+24<w?1:-1)*(detach.offsetWidth/2+21)));
  const y=Math.max(24,Math.min(h-24,py));
  detach.style.left=x+'px';detach.style.top=y+'px';placed.push({x,y,wide:true});
 }
 // Reserve the tap labels first so only the movable labels dodge other controls.
 const tapLabels={};
 for(const k of taps){
  const v=spoutMidpoints[k].clone().project(camera);
  const x=Math.max(23,Math.min(w-23,(1+v.x)*w/2));
  let y=Math.max(24,Math.min(h-25,(1-v.y)*h/2-28));
  if(k==='tap2'){
   const first=tapLabels.tap;
   const near=Math.max(0,Math.min(1,(72-Math.abs(x-first.x))/24));
   y-=near*Math.max(0,y-first.y+40);
   if(y<24){first.y+=24-y;y=24}
  }
  tapLabels[k]={x,y};
 }
 const isCondenser=m=>m.key==='high'||m.key==='low';
 const ordered=[...markers.filter(m=>m.isTap),...markers.filter(isCondenser),...markers.filter(m=>!m.isTap&&!isCondenser(m))];
 for(const m of ordered){
 m.dot.hidden=m.btn.hidden;m.line.style.display=m.btn.hidden||m.isTap||isCondenser(m)?'none':'';if(m.btn.hidden)continue;
 const v=m.getPoint().clone().project(camera),px=(1+v.x)*w/2,py=(1-v.y)*h/2;
 m.dot.style.left=px+'px';m.dot.style.top=py+'px';
 m.dot.style.zIndex=m.end===undefined?'1':'2';
 let best=tapLabels[m.key],score=Infinity;
 if(isCondenser(m)){
  const half=m.btn.offsetWidth/2;
  const x=px-half-12;
  best={x:x<half+3?Math.min(w-half-3,px+half+12):x,y:Math.max(22,Math.min(h-22,py))};
 }else if(!m.isTap){
 for(let dy=-125;dy<=125;dy+=25)for(let dx=-126;dx<=126;dx+=21){
 const x=Math.max(23,Math.min(w-23,px+dx)),y=Math.max(57,Math.min(h-25,py+dy));
 const overlap=placed.some(p=>Math.abs(p.x-x)<(p.wide?54:46)&&Math.abs(p.y-y)<45);
 const cost=(overlap?100000:0)+(x-px)**2+(y-py+25)**2;
 if(cost<score){score=cost;best={x,y}}
 }
 }
 placed.push(best);m.btn.style.left=best.x+'px';m.btn.style.top=best.y+'px';
 for(const [k,value] of Object.entries({x1:px,y1:py,x2:best.x,y2:best.y}))m.line.setAttribute(k,value);
 }
 if(showNames)placeNames(w,h,$('view').classList.contains('unlabelled')?[]:placed);
}
let last=performance.now(),clock=0,oldMode=null;
function frame(now){
 const dt=Math.min(.12,(now-last)/1000);last=now;clock+=dt;
 for(const mesh of [...hoseWater,...hoseBands])mesh.visible=false;
 taps.forEach((key,i)=>updateSupply(key,i,dt));
 advanceBlockedCircuit(dt);
 const feeds=taps.filter((k,i)=>supplies[i].ready).map(trace);
 const flow=feeds.find(p=>p.inlet)?.inlet;
 // For downward flow the lower outlet drains the jacket while a film also wets its wall.
 const lowerPool=(lowerSocket.y+outerR-jacketBottom)/(jacketTop-jacketBottom);
 const targetFill=feeds.some(p=>p.blocked)||flow==='low'?1:flow?lowerPool:retainedJacketLevel();
 if(openTaps.size||connections.includes('low'))fill+=(targetFill-fill)*(1-Math.exp(-dt*1.5));
 drainLowerSocket(dt);
 updateCoolant(fill);
 const paths=taps.map(trace);

 const canAdvance=heat;
 if(!canAdvance)fast=false;
 const elapsed=dt*(fast?8:1);
 // Classroom model at atmospheric pressure; ignore the small boiling-point elevation.
 if(heat&&charge)temp=Math.min(100,temp+elapsed*1.4);
 else temp+=(22-temp)*(1-Math.exp(-dt*.055));
 baseTemperature+=((heat?(charge?temp+5:265):22)-baseTemperature)*(1-Math.exp(-elapsed*(heat ? .045 : .055)));
 if(heat&&!charge&&baseTemperature>150)dryDose+=elapsed;
 if(!broken&&dryDose>=damageDose){
  broken=true;heat=fast=false;crack.visible=true;saveReceiver();
 }
 const boiling=heat&&charge>0&&temp>=100;
 steamAge=boiling?Math.min(4,steamAge+elapsed):0;
 const headTarget=steamAge>=1?100:22+.12*(temp-22);
 headTemp+=(headTarget-headTemp)*(1-Math.exp(-elapsed*(steamAge>=1?.85:.09)));
 // Integrate a burner response and residual stored heat over simulation time.
 const targetPower=boiling ? .025 : 0, tau=boiling ? 4 : 3;
 const previousPower=boilPower;
 boilPower=approach(previousPower,targetPower,1/tau,elapsed);
 const evaporated=Math.min(charge,Math.max(0,targetPower*elapsed+(previousPower-boilPower)*tau));
 charge-=evaporated;
 if(!charge)boilPower=0;
 // Vapour in the head takes time to reach the condenser, including after shutoff.
 const retention=Math.exp(-elapsed/2);
 const nextInventory=vapourInHead*retention+2*(elapsed>0?evaporated/elapsed:0)*(1-retention);
 const delivered=Math.max(0,vapourInHead+evaporated-nextInventory);
 vapourInHead=nextInventory;
 experimentSeconds+=elapsed;

 $('fast').disabled=!canAdvance;$('fast').setAttribute('aria-pressed',String(fast));
 iconButton($('fast'),'fast',fast?'回復正常速度':'快轉八倍',fast?'1×':'8×');
 const columnBottom=3.23+lift,columnLength=thermometerTopY-.14-3.23;
 thermometerColumn.scale.y=.47+.5*Math.max(0,Math.min(1,(headTemp-22)/78));
 thermometerColumn.position.y=columnBottom+.5*columnLength*thermometerColumn.scale.y;
 liveText('thermo',labText('溫度 ')+Math.round(headTemp)+' °C');
 advanceCooling(elapsed,flow,boiling);
 // Compare incoming vapour with the heat-removal capacity of the wetted glass.
 // Capacities are illustrative mL/s equivalents for this classroom burner.
 const wallFilm=flow==='high' ? .14 : 0;
 const wetted=fill+(1-fill)*wallFilm;
 const meanWarmth=coolantWarmth.reduce((sum,w)=>sum+w,0)/coolantWarmth.length;
 const capacity=.0045+.065*wetted*(1-meanWarmth);
 const condensed=Math.min(delivered,capacity*elapsed);
 const efficiency=delivered>0?condensed/delivered:1;
 const uncondensed=(delivered-condensed)/Math.max(.025*elapsed,1e-9);
 escapingFraction=approach(escapingFraction,uncondensed,1.2,elapsed);
 if(fallAge!==null){
  fallAge+=elapsed;
  if(fallAge>=fallDuration){
   mixReceiver(dropVolume,equipmentHeat.tip);dist+=dropVolume;fallAge=null;
   arrivalTimes.push(experimentSeconds);saveReceiver();
  }
 }
 advanceFilm(condensed,elapsed);
 if(fallAge===null&&dripPhase>=1){fallAge=0;dripPhase-=1}
 while(arrivalTimes.length&&arrivalTimes[0]<=experimentSeconds-30)arrivalTimes.shift();
 // Illustrative burst timing; surface nucleation varies between real flasks.
 if(boiling&&!useGranules){
  nextBump-=dt;burstAge+=dt;
  if(nextBump<=0){bumped=true;burstAge=0;startCarryover();nextBump=1.8+Math.random()*2.7}
 }else{burstAge=1;nextBump=1.6}
 const surge=burstAge<.85?Math.sin(Math.PI*burstAge/.85)*Math.exp(-2*burstAge):0;
 bubbles.forEach((bubble,i)=>{
  const f=useGranules?(clock*1.3+i/6)%1:(burstAge-i*.065)/.5;
  bubble.visible=boiling&&(useGranules||(f>=0&&f<1));
  if(!bubble.visible)return;
  const chip=granules[i],rise=useGranules?f:f*f;
  bubble.scale.setScalar(useGranules?.8+f*.4:1.6+f*2);
  bubble.position.set(chip.position.x,chip.position.y+rise*(.25+charge*.006),chip.position.z);
 });
 splash.forEach((drop,i)=>{
  const f=(burstAge-i*.025)/.52;
  drop.visible=boiling&&!useGranules&&f>0&&f<1;
  if(drop.visible)drop.position.set(flask.x+.24*f*Math.cos(i*2.4),waterline.constant+.05+.49*4*f*(1-f),.24*f*Math.sin(i*2.4));
 });
 moveCarryover(dt);
 if(!heat)bumped=false;
 if(!heat&&temp<40){granulesLocked=false;granuleAttempt=false}
 const running=taps.filter(k=>openTaps.has(k));
 const runningWith=predicate=>running.find(k=>predicate(paths[taps.indexOf(k)]));
 const leaking=runningWith(p=>p.out&&!p.drain);
 const label=k=>names[k].split(' ')[0];
 const reverse=taps.find((k,i)=>paths[i].inlet==='high'&&paths[i].drain);
 const loop=runningWith(p=>p.tapLoop);
 if(!hosesLockedByHeat())hotDisconnectAttempt=false;
 let instruction='';
 if(recovery==='stop'){
  instruction=leaking?teacherLine('leak'):teacherLine('otherTap');
 }else if(blockedTime>0)instruction=teacherLine('blocked');
 else if(recovery==='wipe')instruction=heat?teacherLine('flame'):teacherLine('wipe');
 else if(heat&&!charge)instruction=teacherLine(flaskSaltMg>0?'dry':'empty');
 else if(heat&&charge<=2.001)instruction=teacherLine('almostDry');
 else if(heat&&!flow&&!taps.some((k,i)=>openTaps.has(k)&&paths[i].inlet))instruction=teacherLine('noWater');
 else if(heat&&bumped)instruction=teacherLine('bumping');
 else if(hotDisconnectAttempt)instruction=teacherLine('hotReverse');
 else if(granuleAttempt&&heat)instruction=teacherLine('flame');
 else if(loop)instruction=teacherLine('loop');

 else if(reverse && hosesLockedByHeat())instruction=teacherLine('hotReverse');
 else if(runningWith(p=>p.out&&p.drain&&!p.inlet))instruction=teacherLine('waste');
 else if(reverse){
  if(openTaps.has(reverse))instruction=teacherLine('reverseOn');
  else instruction=teacherLine('reverseOff');
 }
 taps.forEach((k,i)=>{
 const on=openTaps.has(k),btn=$(k);btn.disabled=Boolean(recovery&&!on);iconButton(btn,'tap',(on?'閂 ':'開 ')+'T'+(i+1),'T'+(i+1));
 btn.setAttribute('aria-pressed',on);waterHandles[i].rotation.y=on?Math.PI/2:0;
 });
 // One smooth brightening and fading cycle every two real seconds, even on fast forward.
 valveOutlineMaterial.opacity=reducedValveMotion.matches ? .75 : .12+.86*(1-Math.cos(now*Math.PI/1000))/2;
 waterOutlines.forEach((outline,i)=>{outline.visible=!$(taps[i]).disabled});
 const speech=instruction?'⚠ '+instruction:'';
 if($('warn').textContent!==speech){$('warn').hidden=!speech;$('warn').textContent=speech}

 liveText('read',labText('收集到嘅蒸餾水　')+dist.toFixed(2)+' mL · '+(arrivalTimes.length*2)+' '+labText('滴／分鐘'));
 for(const [id,state,on,off] of [['heat',heat,'熄火','開火'],['eye',thermal,'除低熱像眼鏡','戴上熱像眼鏡']]){const el=$(id);iconButton(el,id,state?on:off);el.setAttribute('aria-pressed',state)}
 $('add').disabled=charge>0||heat||Math.max(temp,baseTemperature)>=40;
 const targetAngle=heat?0:Math.PI/2;
 handle.rotation.y+=Math.sign(targetAngle-handle.rotation.y)*Math.min(Math.abs(targetAngle-handle.rotation.y),dt*Math.PI*2);
 flame.visible=heat;flameCore.visible=heat&&!thermal;updateBrine(charge,surge);
 collected.visible=dist>.01;collected.scale.y=dist/50;collected.position.y=.035+.2625*dist/50;

 streams.forEach((stream,i)=>{
  const {jet,puddle}=stream,p=paths[i];
  const active=openTaps.has(taps[i])&&(!p.inlet||supplies[i].ready)&&p.out;
  const start=p.hoseStart, n=start===undefined?-1:Math.floor(start/2);
  const route=active?[p.inlet,start,p.openPort,p.looseEnd,p.out.x,p.out.y,p.out.z,failedJoint].join('|'):null;
  const newRoute=route!==stream.route;
  if(newRoute){
   if(stream.returnStart!=null&&stream.age>0&&connections[stream.returnStart]===stream.returnPort&&connections[stream.returnStart^1]==='sink')releaseReturn(stream.returnStart,stream.age);
   stream.age=0;stream.route=route;
   stream.returnStart=active&&p.inlet&&p.drain?start:null;
   stream.returnPort=connections[start];
  }
  if(active)stream.age+=dt;
  let transit=0;
  if(active&&n>=0){
   transit=drawHoseFlow(start,stream.age);
  }
  const age=active?Math.max(0,stream.age-transit):0;
  const spurting=active&&!p.drain&&failedJoint&&(p.openPort===failedJoint||p.looseEnd===slippedEnd);
  const height=active?Math.max(.02,p.out.y-(p.drain?-.47:.025)):0;
  const flight=spurting ? .55 : Math.sqrt(2*height/9.8);
  const plume=plumes[i];
  if(spurting&&newRoute){
   const points=Array.from({length:17},(_,j)=>{
    const f=j/16,position=sprayOffset(i,f);
    position.y-=(height+.55)*f*f;
    return position;
   });
   plume.geometry.dispose();
   plume.geometry=new T.TubeGeometry(new T.CatmullRomCurve3(points),40,.025,8,false);
   plume.position.copy(p.out);
  }
  plume.visible=Boolean(spurting&&age>0);
  if(plume.visible)plume.geometry.setDrawRange(0,48*Math.min(40,Math.floor(40*age/flight)));
  const falling=Math.min(height,4.9*age*age);
  jet.visible=age>0&&!spurting;
  if(jet.visible){jet.scale.y=falling;jet.position.copy(p.out);jet.position.y-=falling/2}
  spray[i].forEach((drop,j)=>{
   const launched=age-j*flight/20;
   drop.visible=Boolean(spurting&&launched>0);
   if(!drop.visible)return;
   const f=(launched%flight)/flight;
   drop.position.copy(p.out).add(sprayOffset(i,f));
   drop.position.y-=(height+.55)*f*f;
   drop.position.x+=.045*Math.sin(j*3)*f;
  });
  if(age>=flight&&active&&!p.drain){
   puddle.position.copy(p.out);if(spurting)puddle.position.add(sprayOffset(i,1));
   stream.size=Math.min(1.5,Math.max(.08,stream.size+dt*.16));
   beginLeakRecovery();
  }else if(!recovery)stream.size=Math.max(0,stream.size-dt*.035);
  puddle.visible=stream.size>.01;puddle.position.y=.016;puddle.scale.set(stream.size,.012,stream.size*.65);
 });
 advanceDrains(dt);
 if(oldMode!==thermal){for(const {obj,color} of surfaces){if(thermal)tint(obj.material,22);else obj.material.color.set(color)}oldMode=thermal}

 glassReflectance.value=thermal?0:1;
 scene.environment=thermal?null:studioReflection.texture;
 scene.background=thermal?backdrops.thermal:document.documentElement.dataset.theme==='tech'?backdrops.tech:backdrops.paper;
 updateEquipmentHeat(elapsed,boiling,efficiency);
 for(let j=0;j<18;j++){
  jackets[j].visible=innerGlass[j].visible=thermal;
  if(thermal){tint(jackets[j].material,section[j]);tint(innerGlass[j].material,boreTemperatures[j])}
 }
 if(thermal)paintEquipment();
 jacketShell.visible=!thermal;
 const precipitate=Math.max(0,flaskSaltMg-360*charge);
 crystals.forEach((v,i)=>{v.visible=precipitate>i*40+.01});
 heatBands.forEach((band,i)=>{
  band.visible=thermal;
  if(thermal)tint(band.material,temp+(baseTemperature-temp)*Math.exp(-i*.42));
 });
 if(thermal){tint(bulb.material,Math.max(temp,22+.19*(baseTemperature-22)));tint(brine.material,temp);tint(waterSurface.material,temp);tint(flame.material,110)}
 droplet.visible=dripPhase>.005;
 if(droplet.visible){
  const size=Math.cbrt(dripPhase);
  droplet.scale.set(size,size*1.2,size);
  droplet.position.copy(outlet);droplet.position.y-=.084*size;
 }
 fallingDrop.visible=fallAge!==null;
 if(fallingDrop.visible){
  const progress=fallAge/fallDuration;
  const surface=.035+.525*dist/50;
  fallingDrop.position.copy(outlet);
  fallingDrop.position.y-=.084+(outlet.y-.084-surface)*progress*progress;
 }
 mist.forEach((m,i)=>{const f=(clock*.75+i/10)%1;m.visible=escapingFraction>.035;m.position.set(2.35+f*.57,outlet.y+f*.86,.05+f*.1);m.scale.setScalar(.5+f);m.material.opacity=.33*escapingFraction*(1-f)});
 const w=canvas.clientWidth,h=canvas.clientHeight;if(canvas.width!==Math.floor(w*renderer.getPixelRatio())||canvas.height!==Math.floor(h*renderer.getPixelRatio()))renderer.setSize(w,h,false);
 camera.setViewOffset(w,h,-panX*w,-panY*h,w,h);
 const closeThermal=thermal&&!inspectCondenser;
 const distance=Math.max(closeThermal?7.6:11.8,(closeThermal?6.3:10.8)/(.57*camera.aspect))/zoom;
 const angle=thermal?yaw*.7:yaw,tilt=thermal?Math.min(.43,pitch):pitch;
 const targetX=inspectCondenser?(high.x+low.x)/2:.55;
 const targetY=inspectCondenser?(high.y+low.y)/2:thermal?1.7:2.12;
 camera.position.set(targetX+distance*Math.cos(tilt)*Math.sin(angle),targetY+distance*Math.sin(tilt),distance*Math.cos(tilt)*Math.cos(angle));
 camera.lookAt(targetX,targetY,0);camera.updateMatrixWorld();
 const thermometerTop=raised(-3,thermometerTopY,0).project(camera);
 $('thermo').hidden=inspectCondenser&&(Math.abs(thermometerTop.x)>.96||Math.abs(thermometerTop.y)>.94);
 $('thermo').style.left=Math.max(58,Math.min(w-58,(thermometerTop.x+1)*w/2))+'px';
 $('thermo').style.top=Math.max(3,Math.min(h-30,(1-thermometerTop.y)*h/2-17))+'px';
 liveText('tag',labText(thermal?'第一身 · 熱像眼鏡':'實驗枱'));placeMarkers(w,h);renderer.render(scene,camera);
 if(broken){$('incident').showModal();return}
 requestAnimationFrame(frame)
}
requestAnimationFrame(frame);

function liveText(id,value){const el=$(id);if(el.textContent!==value)el.textContent=value}
function setHint(raw){$('hoseHint').dataset.copy=raw;$('hoseHint').textContent=labText(raw)}
function refreshLab(){
 for(const el of document.querySelectorAll('[data-copy]'))el.textContent=labText(el.dataset.copy);
 for(const el of document.querySelectorAll('[data-copy-aria]'))el.setAttribute('aria-label',labText(el.dataset.copyAria));
 for(const [el,args] of iconSources)iconButton(el,...args);
 document.title=labText('海水蒸餾實驗');
 const night=document.documentElement.dataset.theme==='tech';
 for(const [el,shape] of [[$('view'),'tl-clip tr-clip br-clip bl-clip border'],[$('add'),'tl-clip br-clip border']]){
 if(night)el.setAttribute('data-augmented-ui',shape);else el.removeAttribute('data-augmented-ui');
 }
}
window.addEventListener('lab-language-change',refreshLab);
window.addEventListener('lab-theme-change',refreshLab);
refreshLab();
