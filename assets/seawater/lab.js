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
const scene=new T.Scene(), camera=new T.PerspectiveCamera(34,1,.1,100);
const renderer=new T.WebGLRenderer({canvas:$('sceneCanvas'),antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
scene.add(new T.HemisphereLight(0xffffff,0x788a92,2));
const sun=new T.DirectionalLight(0xfff4de,2);sun.position.set(-4,9,6);scene.add(sun);
for(const [id,icon,label] of [['add','add','加入海水'],['granules','granules','防暴沸粒：有'],['labels','labels','隱藏標籤'],['reset','reset','重新開始'],['cloth','cloth','拖動抹布，或用方向鍵移動']])iconButton($(id),icon,label);
iconButton(document.querySelector('#hosePanel summary'),'hose','接駁膠喉');
const surfaces=[];
function solid(geometry,color,position,alpha=1){
 const mat=new T.MeshStandardMaterial({color,transparent:alpha<1,opacity:alpha,depthWrite:alpha===1,roughness:.46});
 const obj=new T.Mesh(geometry,mat);obj.position.copy(position);scene.add(obj);surfaces.push({obj,color,alpha});return obj;
}
function box(x,y,z,w,h,d,color){return solid(new T.BoxGeometry(w,h,d),color,vec(x,y,z))}
function rod(a,b,r,c,alpha=1){const v=b.clone().sub(a),obj=solid(new T.CylinderGeometry(r,r,v.length(),32),c,a.clone().lerp(b,.5),alpha);obj.quaternion.setFromUnitVectors(vec(0,1,0),v.normalize());return obj}
function ball(p,r,c,alpha=1){return solid(new T.SphereGeometry(r,40,28),c,p,alpha)}
const metal=0x82979e,glass=0xbbe6e8,water=0x43b5cf;
// Cut the sink opening through the worktop; its upper surface is y = -.02.
const slab=new T.Shape();
slab.moveTo(-6,-2.5);slab.lineTo(6,-2.5);slab.lineTo(6,2.5);slab.lineTo(-6,2.5);slab.closePath();
const cut=new T.Path();cut.moveTo(3.35,-1.35);cut.lineTo(3.35,1.05);cut.lineTo(5.25,1.05);cut.lineTo(5.25,-1.35);cut.closePath();slab.holes.push(cut);
const worktop=solid(new T.ExtrudeGeometry(slab,{depth:.52,bevelEnabled:false}),0xa2b6b4,vec(0,-.54,0));
worktop.rotation.x=-Math.PI/2;
const lift=.55;
const raised=(x,y,z)=>vec(x,y+lift,z);
const outlet=raised(2.32,.76,0);
const flask=raised(-3,1.8,0), high=raised(-1.85,2.85,0),low=raised(1.5,1.65,0),tip=raised(2.32,1.22,0);
const bulb=ball(flask,.72,glass,.24);
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
 const offset=innerRadius*((lo+hi)/2-1)+.16*surge;
 waterSurface.position.y=waterline.constant=flask.y+offset;
 waterSurface.scale.setScalar(Math.sqrt(innerRadius**2-offset**2));
}
// Open glass neck with a lateral opening at the steam takeoff.
const neckRadius=.19,branchRadius=.115,neckBase=2.39,mouth=3.81;
const branchHeight=3.25;
const neckMesh=new T.CylinderGeometry(neckRadius,neckRadius,mouth-neckBase,96,80,true);
const index=neckMesh.index.array,pos=neckMesh.attributes.position,kept=[];
for(let i=0;i<index.length;i+=3){
 const v=new T.Vector3();
 for(let j=0;j<3;j++)v.add(new T.Vector3().fromBufferAttribute(pos,index[i+j]));
 v.divideScalar(3);
 if(v.x>0&&(v.z/branchRadius)**2+((v.y+(mouth+neckBase)/2-branchHeight)/.121)**2<1)continue;
 kept.push(index[i],index[i+1],index[i+2]);
}
neckMesh.setIndex(kept);
solid(neckMesh,glass,raised(-3,(mouth+neckBase)/2,0),.32);
const branchStart=raised(-3+neckRadius-.02,branchHeight,0);
const branch=rod(branchStart,high,branchRadius,glass,.42);
branch.geometry.dispose();branch.geometry=new T.CylinderGeometry(branchRadius,branchRadius,branchStart.distanceTo(high),48,1,true);
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
rod(raised(-3,3.24,0),raised(-3,thermometerTopY,0),.044,glass,.43);
rod(raised(-3,3.23,0),raised(-3,thermometerTopY-.14,0),.012,0xad3936);
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
 rod(vec(-3+.65*Math.cos(a),.02,.65*Math.sin(a)),vec(-3+.49*Math.cos(a),1.045+lift,.49*Math.sin(a)),.035,metal);
}
const support=solid(new T.TorusGeometry(.50,.03,10,48),metal,raised(-3,1.047,0));support.rotation.x=Math.PI/2;
for(let i=-6;i<=6;i++){
 const d=i*.09;
 rod(vec(-3+d,1.082+lift,-.55),vec(-3+d,1.082+lift,.55),.009,metal);
 rod(vec(-3.55,1.093+lift,d),vec(-2.45,1.093+lift,d),.009,metal);
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
 const seal=solid(new T.RingGeometry(.106,shellRadius,48),glass,end,.36);
 seal.quaternion.setFromUnitVectors(vec(0,0,1),low.clone().sub(high).normalize());seal.material.side=T.DoubleSide;
}
for(let j=0;j<18;j++){
 const a=high.clone().lerp(low,j/18),b=high.clone().lerp(low,(j+1)/18);
 jackets.push(openTube(a,b,.265,glass,.95));
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
 lip.quaternion.setFromUnitVectors(vec(0,0,1),direction);lip.material.side=T.DoubleSide;
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
const brass=0xc59750,iron=0x48565b;
solid(new T.CylinderGeometry(.32,.48,.135,36),iron,vec(-3,.072,0));
rod(vec(-3,.13,0),vec(-3,.27,0),.16,brass);
rod(vec(-3.09,.21,0),vec(-3.51,.26,.17),.065,brass);
rod(vec(-3.48,.255,.16),vec(-3.58,.27,.20),.079,brass);
const sleeve=(r,h,y,color,start=0,arc=Math.PI*2)=>{
 const wall=solid(new T.CylinderGeometry(r,r,h,48,1,true,start,arc),color,vec(-3,y,0));
 wall.material.side=T.DoubleSide;
};
sleeve(.135,.36+lift,.59+lift/2,metal);
sleeve(.17,.045,.288,brass);sleeve(.17,.045,.427,brass);
// Opposed openings through the collar and mixing tube.
for(const start of [.52,Math.PI+.52])sleeve(.17,.096,.357,brass,start,Math.PI-1.04);
sleeve(.085,.15,.343,iron);
const flame=solid(new T.ConeGeometry(.133,.39,32),0x408aff,raised(-3,.965,0));

// Clamp the flask neck and the condenser jacket on independent retort stands.
function standClamp(centre,axis,radius){
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
}
standClamp(raised(-3,2.70,0),vec(0,1,0),.223);
standClamp(high.clone().lerp(low,.58),low.clone().sub(high).normalize(),.298);
const cup=solid(new T.CylinderGeometry(.46,.42,.69,40,1,true),glass,vec(2.32,.35,0),.42);
const collected=rod(vec(2.32,.035,0),vec(2.32,.56,0),.405,water,.72);
const loose=[vec(-4.2,.11,1.47),vec(-.65,.11,1.47),vec(.12,.11,1.72),vec(3.08,.11,1.96)];
const taps=['tap','tap2'];
ports.tap2=ports.tap.clone();ports.tap.z+=.6;ports.tap2.z-=.6;
const openTaps=new Set();
const waterHandles=taps.map(k=>{
 const outlet=ports[k],z=outlet.z,bodyX=5.48;
 rod(vec(bodyX,-.02,z),vec(bodyX,.09,z),.21,metal);
 rod(vec(bodyX,.09,z),vec(bodyX,1.61,z),.112,metal);
 ball(vec(bodyX,1.52,z),.155,metal);
 const bend=new T.CatmullRomCurve3([vec(bodyX,1.49,z),vec(5.23,1.56,z),vec(4.77,1.63,z),vec(4.33,1.64,z),vec(4.10,1.56,z),vec(outlet.x,1.42,z)]);
 solid(new T.TubeGeometry(bend,40,.112,20,false),metal,vec(0,0,0));
 rod(vec(outlet.x,1.43,z),outlet,.135,metal);
 rod(outlet,vec(outlet.x,outlet.y-.003,z),.095,0x354b50);
 rod(vec(bodyX,1.60,z),vec(bodyX,1.82,z),.062,metal);
 return box(bodyX,1.84,z,.42,.08,.11,0x267882);
});
const codes=['A1','A2','B1','B2'];
const names={free:'鬆開',tap:'T1 水龍頭',tap2:'T2 水龍頭',high:'C1 燒瓶端（高位）',low:'C2 接收器端（低位）',sink:'S 洗手盆'};
const connections=Array(4).fill('free'),hoses=[],endButtons=[];
let slippedEnd=-1,slippedPosition;
function point(i){return ports[connections[i]]||(i===slippedEnd?slippedPosition:loose[i])}
function hose(i){
 const a=point(2*i),b=point(2*i+1),mid=a.clone().lerp(b,.5);mid.y=.21;mid.z=1.1+i*.48;
 const resting=connections[2*i]==='free'&&connections[2*i+1]==='free';
 const positions=resting
  ? [a,a.clone().lerp(b,.27).add(vec(0,0,.54)),a.clone().lerp(b,.70).add(vec(0,0,-.33)),b]
  : [a,a.clone().lerp(mid,.35).add(vec(0,.08,.32)),mid.clone().add(vec(0,0,.38)),b.clone().lerp(mid,.35).add(vec(0,.08,.32)),b];
 const curve=new T.CatmullRomCurve3(positions);
 const geometry=new T.TubeGeometry(curve,48,.074,12,false);
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
function connect(key){
 if(recovery)return;
 if(selected<0)return;
 const occupied=connections.indexOf(key);
 if(key!=='free'&&occupied>=0)connections[occupied]='free';
 if(selected===slippedEnd)slippedEnd=-1;
 connections[selected]=key;hose(0);hose(1);choose(-1);detectLeak();
}
hose(0);hose(1);
function trace(key){
 const ends=connections,idx=ends.indexOf(key);
 if(idx<0)return {out:ports[key],drain:true};
 const dest=ends[idx^1];if(dest==='sink')return {out:ports.sink,drain:true};
 if(dest==='free')return {out:point(idx^1),looseEnd:idx^1};
 if(taps.includes(dest))return {tapLoop:true};
 const other=dest==='low'?'high':'low',exit=ends.indexOf(other);
 if(exit>=0&&taps.includes(ends[exit^1]))return {blocked:true};
 return {inlet:dest,openPort:exit<0?other:null,out:exit<0?ports[other]:point(exit^1),drain:exit>=0&&ends[exit^1]==='sink'};
}
const streams=taps.map(()=>({jet:rod(vec(0,0,0),vec(0,1,0),.044,water,.82),puddle:ball(vec(0,.012,1.7),1,water,.56),size:0}));
const spray=taps.map(()=>Array.from({length:20},()=>ball(vec(0,0,0),.039,water,.84)));
function sprayOffset(i,f){return vec((i%2?1:-1)*.55*f,.55*f,1.13*f)}
const droplet=ball(outlet.clone(),.07,0x378ca5,.95);
const dropVolume=.05;
const fallingDrop=ball(outlet.clone(),.07,0x378ca5,.95);
const fallDuration=.18;
let fallAge=null;
let dripPhase=0, steamAge=0, headTemp=22, fast=false;
$('fast').onclick=()=>fast=!fast;
let nextBump=1.6,burstAge=1,granuleAttempt=false,bumped=false;
const splash=Array.from({length:5},()=>ball(flask.clone(),.023,water,.86));
const bubbles=Array.from({length:6},()=>ball(flask.clone(),.034,0xe1f8fb,.75));
const mist=Array.from({length:10},()=>ball(vec(0,0,0),.09,0xf2f6f4,.35));
$('add').onclick=()=>{if(!charge&&!heat&&temp<40)charge=50};
// Select the loose joint once, when the blocked circuit fails.
function advanceBlockedCircuit(dt){
 if(recovery||![...openTaps].some(k=>trace(k).blocked)){blockedTime=0;return}
 blockedTime+=dt;
 if(blockedTime<2)return;
 failedJoint=Math.random()<.5?'high':'low';
 const end=connections.indexOf(failedJoint);
 slippedPosition=ports[failedJoint].clone().add(vec(.22,-.13,.35));slippedEnd=end;
 connections[end]='free';blockedTime=0;hose(Math.floor(end/2));detectLeak();
}
function detectLeak(){
 if(!recovery&&[...openTaps].some(k=>{const p=trace(k);return p.out&&!p.drain})){
  for(const k of openTaps){const path=trace(k);if(path.out&&!path.drain){const stream=streams[taps.indexOf(k)];stream.size=Math.max(.42,stream.size);stream.puddle.position.copy(path.out)}}
  recovery='stop';choose(-1);
  for(const btn of endButtons)btn.disabled=true;
 }
}
function toggleWater(key){
 if(recovery&&!openTaps.has(key))return;
 if(openTaps.has(key))openTaps.delete(key);else openTaps.add(key);
 if(recovery==='stop'&&!openTaps.size){recovery='wipe';startWiping()}
 detectLeak();
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
 for(const stream of streams){
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
 for(const stream of streams){stream.size=0;stream.puddle.visible=false}
 recovery='';
 for(const btn of endButtons)btn.disabled=false;
 choose(-1);
 setHint('枱面抹乾喇，檢查喉頭，改好接駁先再開水。');
};
$('heat').onclick=toggleBurner;
$('eye').onclick=()=>{thermal=!thermal;$('lens').hidden=$('scale').hidden=!thermal};
$('reset').onclick=()=>location.reload();
const canvas=renderer.domElement;let drag;
let press;const picker=new T.Raycaster();
canvas.onpointerdown=e=>{press=[e.clientX,e.clientY];drag=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId)};
canvas.onpointermove=e=>{if(drag){yaw-=(e.clientX-drag[0])*.008;pitch=Math.max(.12,Math.min(1.15,pitch+(e.clientY-drag[1])*.006));drag=[e.clientX,e.clientY]}};
canvas.onpointerup=e=>{
 if(press&&Math.hypot(e.clientX-press[0],e.clientY-press[1])<6){
 const r=canvas.getBoundingClientRect();
 picker.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),camera);
 const hit=picker.intersectObjects([...waterHandles,...valveParts],true)[0];
 if(hit){const i=waterHandles.indexOf(hit.object);if(i<0)toggleBurner();else toggleWater(taps[i])}
 }
 drag=press=null;
};
canvas.onpointercancel=()=>drag=press=null;
const palette=['#21114c','#7751c6','#ec5682','#ffac43','#fff3a7'].map(x=>new T.Color(x));
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
 dot.setAttribute('aria-hidden','true');dot.onclick=()=>btn.click();
 $('leaders').append(line);$('markers').append(btn,dot);markers.push({btn,getPoint,end,line,dot,key,isTap:taps.includes(key)});
 btn.onclick=()=>{if(end!==undefined)pickEnd(end);else if(selected>=0)connect(key);else choose(-1,selectedPort===key?null:key)};
}
codes.forEach((code,i)=>marker(code,()=>point(i),i));
for(const key of Object.keys(ports))marker(names[key].split(' ')[0],()=>ports[key],undefined,key);
function detachSelected(){
 if(selectedPort)selected=connections.indexOf(selectedPort);
 const lifted=selected;
 const pickup=connections[lifted]==='sink';
 connect('free');
 if(pickup&&!recovery)choose(lifted);
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
 const signature=[w,h,yaw,pitch,thermal,showNames,$('view').classList.contains('unlabelled'),selected,selectedPort,...connections].join(',');
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
 for(const m of markers){
 m.dot.hidden=m.btn.hidden;m.line.style.display=m.btn.hidden?'none':'';if(m.btn.hidden)continue;
 const v=m.getPoint().clone().project(camera),px=(1+v.x)*w/2,py=(1-v.y)*h/2;
 m.dot.style.left=px+'px';m.dot.style.top=py+'px';
 m.dot.style.zIndex=m.end===undefined?'1':'2';
 let best,score=Infinity;
 for(let dy=-125;dy<=125;dy+=25)for(let dx=-126;dx<=126;dx+=21){
 const x=Math.max(23,Math.min(w-23,px+dx)),y=Math.max(57,Math.min(h-25,py+dy));
 const overlap=placed.some(p=>Math.abs(p.x-x)<(p.wide?54:46)&&Math.abs(p.y-y)<45);
 const left=m.key==='low';
 const lift=m.isTap?75:left?0:25;
 const cost=(overlap?100000:0)+(m.isTap&&y>py-35?10000:0)+(left&&x>px-28?10000:0)+(x-px+(left?63:0))**2+(y-py+lift)**2;
 if(cost<score){score=cost;best={x,y}}
 }
 placed.push(best);m.btn.style.left=best.x+'px';m.btn.style.top=best.y+'px';
 for(const [k,value] of Object.entries({x1:px,y1:py,x2:best.x,y2:best.y}))m.line.setAttribute(k,value);
 }
 if(showNames)placeNames(w,h,$('view').classList.contains('unlabelled')?[]:placed);
}
let last=performance.now(),clock=0,oldMode=null;
function frame(now){
 const dt=Math.min(.12,(now-last)/1000);last=now;clock+=dt;
 advanceBlockedCircuit(dt);
 const paths=taps.map(trace),path=paths.find((p,i)=>openTaps.has(taps[i])&&p.inlet)||{},flow=path.inlet;
 fill+=((flow?(path.inlet==='low'?1:.42):0)-fill)*(1-Math.exp(-dt*1.5));
 updateCoolant(fill);
 const canAdvance=heat&&charge>2&&steamAge<4;
 if(!canAdvance)fast=false;
 const elapsed=dt*(fast?8:1);
 // Classroom model at atmospheric pressure; ignore the small boiling-point elevation.
 if(heat)temp=Math.min(100,temp+elapsed*(charge?1.4:3));
 else temp+=(22-temp)*(1-Math.exp(-dt*.055));
 const boiling=heat&&charge>2&&temp>=100;
 steamAge=boiling?Math.min(4,steamAge+elapsed):0;
 const headTarget=steamAge>=1?100:22+.12*(temp-22);
 headTemp+=(headTarget-headTemp)*(1-Math.exp(-elapsed*(steamAge>=1?.85:.09)));
 const collecting=boiling&&steamAge>=4;
 if(collecting)fast=false;
 $('fast').disabled=!canAdvance||collecting;$('fast').setAttribute('aria-pressed',String(fast));
 iconButton($('fast'),'fast',fast?'回復正常速度':'快轉八倍',fast?'1×':'8×');
 liveText('thermo',labText('溫度計　')+Math.round(headTemp)+' °C');
 const efficiency=.18+.81*fill;
 const evaporated=boiling?Math.min(charge-2,.025*dt):0;
 charge-=evaporated;
 if(fallAge!==null){
  fallAge+=dt;
  if(fallAge>=fallDuration){dist+=dropVolume;fallAge=null}
 }
 if(collecting){
  dripPhase+=evaporated*efficiency/dropVolume;
  if(dripPhase>=1){fallAge=0;dripPhase-=1}
 }
 // Illustrative burst timing; surface nucleation varies between real flasks.
 if(boiling&&!useGranules){
  nextBump-=dt;burstAge+=dt;
  if(nextBump<=0){bumped=true;burstAge=0;nextBump=1.8+Math.random()*2.7}
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
 if(!heat)bumped=false;
 if(!heat&&temp<40){granulesLocked=false;granuleAttempt=false}
 const running=taps.filter(k=>openTaps.has(k));
 const runningWith=predicate=>running.find(k=>predicate(paths[taps.indexOf(k)]));
 const leaking=runningWith(p=>p.out&&!p.drain);
 const label=k=>names[k].split(' ')[0];
 const supply=taps.find((k,i)=>paths[i].inlet==='low'&&paths[i].drain);
 const reverse=taps.find((k,i)=>paths[i].inlet==='high'&&paths[i].drain);
 const loop=runningWith(p=>p.tapLoop);
 let instruction='';
 if(recovery==='stop'){
  instruction=leaking?'閂番'+label(leaking)+'! 漏水喇!':'閂埋'+label(running[0])+'!';
 }else if(blockedTime>0)instruction='閂 '+label(runningWith(p=>p.blocked))+'!';
 else if(recovery==='wipe')instruction=heat?'先熄火!':'抹番乾張枱!';
 else if(heat&&!charge)instruction='空燒喇，熄火!';
 else if(heat&&charge<=2.001)instruction='就快蒸乾，熄火!';
 else if(heat&&!flow)instruction='冇冷卻水，熄火!';
 else if(heat&&bumped)instruction='暴沸喇，熄火!';
 else if(!heat&&temp>52&&!flow&&supply)instruction='開番'+label(supply)+'冷卻水!';
 else if(granuleAttempt)instruction=heat?'先熄火!':'等燒瓶冷卻先加防暴沸粒!';
 else if(loop)instruction='閂'+label(loop)+'，供水喉冇出水口!';
 else if(runningWith(p=>p.out&&p.drain&&!p.inlet))instruction='唔好浪費食水!';
 else if(reverse){
  if(heat)instruction='先熄火再改駁!';
  else if(openTaps.has(reverse))instruction='入水位太高，先閂'+label(reverse)+'!';
  else instruction='將供水喉駁去低位 C2!';
 }
 taps.forEach((k,i)=>{
 const on=openTaps.has(k),btn=$(k);btn.disabled=Boolean(recovery&&!on);iconButton(btn,'tap',(on?'閂 ':'開 ')+'T'+(i+1),'T'+(i+1));
 btn.setAttribute('aria-pressed',on);waterHandles[i].rotation.y=on?Math.PI/2:0;
 });
 const speech=instruction?'⚠ '+labText(instruction):'';
 if($('warn').textContent!==speech){$('warn').hidden=!speech;$('warn').textContent=speech}

 liveText('read',labText('收集到嘅蒸餾水　')+dist.toFixed(2)+' mL');
 for(const [id,state,on,off] of [['heat',heat,'熄火','開火'],['eye',thermal,'除低熱像眼鏡','戴上熱像眼鏡']]){const el=$(id);iconButton(el,id,state?on:off);el.setAttribute('aria-pressed',state)}
 $('add').disabled=charge>0||heat||temp>=40;
 const targetAngle=heat?0:Math.PI/2;
 handle.rotation.y+=Math.sign(targetAngle-handle.rotation.y)*Math.min(Math.abs(targetAngle-handle.rotation.y),dt*Math.PI*2);
 flame.visible=heat;updateBrine(charge,surge);
 collected.visible=dist>.01;collected.scale.y=dist/50;collected.position.y=.035+.2625*dist/50;
 streams.forEach((stream,i)=>{
 const {jet,puddle}=stream,p=paths[i];jet.visible=Boolean(openTaps.has(taps[i])&&p.out);
 const spurting=Boolean(jet.visible && failedJoint && (p.openPort===failedJoint || p.looseEnd===slippedEnd));
 spray[i].forEach((drop,j)=>{
  drop.visible=spurting;if(!spurting)return;
  const f=(clock*1.8+j/20)%1;
  drop.position.copy(p.out).add(sprayOffset(i,f));
  drop.position.y-=(p.out.y+.53)*f*f;
  drop.position.x+=.045*Math.sin(j*3)*f;
 });
 if(jet.visible){jet.position.copy(p.out);jet.scale.y=Math.max(.04,p.out.y-(p.drain?-.47:.025));jet.position.y-=jet.scale.y/2}
 if(jet.visible&&!p.drain){puddle.position.copy(p.out);if(spurting)puddle.position.add(sprayOffset(i,1));stream.size=Math.min(1.5,stream.size+dt*.16)}else if(!recovery)stream.size=Math.max(0,stream.size-dt*.035);
 if(spurting)jet.visible=false;
 puddle.visible=stream.size>.01;puddle.position.y=.016;puddle.scale.set(stream.size,.012,stream.size*.65);
 });
 if(oldMode!==thermal){for(const {obj,color} of surfaces){if(thermal)tint(obj.material,22);else obj.material.color.set(color)}oldMode=thermal}
 if(!scene.background)scene.background=new T.Color();
 scene.background.setHex(thermal?0x211533:document.documentElement.dataset.theme==='tech'?0x14272e:0xe7e7db);
 for(let j=0;j<18;j++){
 const f=(j+.5)/18,covered=high.y+(low.y-high.y)*f<jacketClip.constant;
 const target=22+Math.max(0,temp-65)*(1-f*.44)*(covered&&flow?.24:1.5);
 section[j]+=(target-section[j])*(1-Math.exp(-dt*.55));
 jackets[j].visible=thermal;
 if(thermal)tint(jackets[j].material,section[j]);
 }
 jacketShell.visible=!thermal;
 if(thermal){tint(bulb.material,temp);tint(brine.material,temp);tint(waterSurface.material,temp);tint(flame.material,110)}
 droplet.visible=collecting&&dripPhase>.005;
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
 mist.forEach((m,i)=>{const f=(clock*.75+i/10)%1;m.visible=boiling&&efficiency<.82;m.position.set(2.35+f*.57,outlet.y+f*.86,.05+f*.1);m.scale.setScalar(.5+f);m.material.opacity=.33*(1-f)});
 const w=canvas.clientWidth,h=canvas.clientHeight;if(canvas.width!==Math.floor(w*renderer.getPixelRatio())||canvas.height!==Math.floor(h*renderer.getPixelRatio()))renderer.setSize(w,h,false);
 camera.aspect=w/h;camera.updateProjectionMatrix();
 const distance=Math.max(thermal?7.6:11.8,(thermal?6.3:10.8)/(.57*camera.aspect));
 const angle=thermal?yaw*.7:yaw,tilt=thermal?Math.min(.43,pitch):pitch;
 camera.position.set(.55+distance*Math.cos(tilt)*Math.sin(angle),(thermal?1.7:2.12)+distance*Math.sin(tilt),distance*Math.cos(tilt)*Math.cos(angle));camera.lookAt(.55,thermal?1.7:2.12,0);camera.updateMatrixWorld();
 const thermometerTop=raised(-3,thermometerTopY,0).project(camera);
 $('thermo').style.left=Math.max(58,Math.min(w-58,(thermometerTop.x+1)*w/2))+'px';
 $('thermo').style.top=Math.max(3,Math.min(h-30,(1-thermometerTop.y)*h/2-29))+'px';
 liveText('tag',labText(thermal?'第一身 · 熱像眼鏡':'實驗枱'));placeMarkers(w,h);renderer.render(scene,camera);requestAnimationFrame(frame)
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
