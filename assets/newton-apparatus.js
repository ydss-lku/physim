/* Fixed instrument view. All model dimensions and positions are in centimetres. */
function createTrolleyBench() {
  const T = window.THREE;
  const host = document.querySelector('.apparatus-view');
  const renderer = new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0,0);
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.outputColorSpace=T.SRGBColorSpace;
  const scene=new T.Scene(), camera=new T.OrthographicCamera();
  const group=(parent)=>{const g=new T.Group();parent.add(g);return g};
  const steel=(color,metalness=.65,roughness=.32)=>new T.MeshStandardMaterial({color,metalness,roughness});
  const alloy=steel(0xb6c4cb), polished=steel(0xe4ecee,.87,.19), rubber=steel(0x20292d,.04,.71);
  const chassis=steel(0x1e6269,.38,.32),brass=steel(0xb79a63,.72), dark=steel(0x374249,.5), orange=steel(0xce7039,.23);
  const env=document.createElement('canvas');env.width=256;env.height=128;
  const ctx=env.getContext('2d');ctx.fillStyle='#515b62';ctx.fillRect(0,0,256,128);
  for(const [x,y,w,h] of [[4,12,73,34],[105,26,16,62],[158,5,92,22],[180,88,54,8]]){ctx.fillStyle='#f2f4ef';ctx.fillRect(x,y,w,h)}
  const texture=new T.CanvasTexture(env);texture.mapping=T.EquirectangularReflectionMapping;texture.colorSpace=T.SRGBColorSpace;scene.environment=texture;
  scene.add(new T.HemisphereLight(0xfffaf0,0x74919b,1.35));
  const light=new T.DirectionalLight(0xfff4db,2.9);light.position.set(-30,90,50);light.target.position.x=28;scene.add(light,light.target);
  light.castShadow=true;Object.assign(light.shadow.camera,{left:-90,right:90,top:70,bottom:-65,far:230});light.shadow.mapSize.set(1024,1024);light.shadow.normalBias=.08;
  const mesh=(parent,geometry,mat,x,y,z)=>{const m=new T.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m};
  const box=(p,m,x,y,z,w,h,d)=>mesh(p,new T.BoxGeometry(w,h,d),m,x,y,z);
  // Chamfered machined profiles catch a narrow highlight along the folded edge.
  function casing(parent,mat,x,y,z,w,h,d,cut,bevel=.18){
    const profile=new T.Shape(),a=w/2,b=h/2;
    const outline=[[-a+cut,-b],[a-cut,-b],[a,-b+cut],[a,b-cut],[a-cut,b],[-a+cut,b],[-a,b-cut],[-a,-b+cut]];
    outline.forEach(([u,v],i)=>i?profile.lineTo(u,v):profile.moveTo(u,v));profile.closePath();
    return mesh(parent,new T.ExtrudeGeometry(profile,{depth:d,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3}),mat,x,y,z-d/2)
  }
  function axle(p,m,x,y,z,r,length,axis='z',sides=36){
    const a=mesh(p,new T.CylinderGeometry(r,r,length,sides),m,x,y,z);
    if(axis==='z')a.rotation.x=Math.PI/2;if(axis==='x')a.rotation.z=Math.PI/2;return a;
  }
  function rod(p,m,start,end,r){const a=new T.Vector3(...start),b=new T.Vector3(...end),v=b.clone().sub(a);
    const c=axle(p,m,0,0,0,r,v.length(),'y',10);c.position.copy(a.addScaledVector(v,.5));c.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return c}
  // Extruded rail, recessed T-slot, guide strips, adjustable feet and engraved scale.
  box(scene,alloy,29,-1.5,0,151,3,15);
  for(const z of [-6.9,6.9]){box(scene,polished,29,.15,z,151,.35,1.1);box(scene,dark,29,-1.65,z*1.09,150,.58,.18)}
  box(scene,rubber,29,.03,0,150,.15,1.6);
  for(const x of [-37,96]){box(scene,dark,x,-3.9,0,4,2,20);for(const z of [-8,8])axle(scene,rubber,x,-5.4,z,1.7,1.2,'y')}
  const ticks=new T.Group();scene.add(ticks);
  const vertices=[];for(let i=-44;i<103;i++){vertices.push(i,-.15,7.53,i,i%10===0?-1.4:i%5===0?-1:-.68,7.53)}
  ticks.add(new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(vertices,3)),new T.LineBasicMaterial({color:0x29414a})));
  // Release latch and slotted optical gate. The flag's leading edge is x = 0 on the trolley.
  box(scene,dark,-36,2,0,4,4,9);box(scene,orange,-35,4.7,0,2,1.4,4);
  box(scene,dark,80,-3.1,0,5,1.4,24);
  for(const z of [-11,11]){casing(scene,dark,80,5.8,z,4.2,18,2.2,.8);box(scene,alloy,80,12.4,z,3.9,.6,2.3);axle(scene,rubber,80,10.8,z-Math.sign(z)*1.2,.9,.6);axle(scene,orange,80,10.8,z-Math.sign(z)*1.48,.45,.25)}
  const beam=rod(scene,orange,[80,10.8,-10],[80,10.8,10],.075);
  const cart=group(scene);
  casing(cart,chassis,-15,4.1,0,30,3.6,13,.9,.23);box(cart,alloy,-15,6.1,0,29.4,.5,12.6);
  for(const x of [-25,-5])for(const z of [-6.2,6.2]){axle(cart,rubber,x,2.65,z,2.5,1.45);axle(cart,alloy,x,2.65,z+Math.sign(z)*.77,1.58,.2);axle(cart,dark,x,2.65,z+Math.sign(z)*.95,.52,.24,'z',6)}
  for(const x of [-28,-2])for(const z of [-5.4,5.4])axle(cart,polished,x,6.48,z,.37,.24,'y',6);
  const wheelFaces=[];
  for(const z of [-6.58,6.58]){
    box(cart,polished,-15,5.25,z,25,.14,.10);
    for(const x of [-25,-5]){const face=group(cart);face.position.set(x,2.65,z+Math.sign(z)*.47);wheelFaces.push(face);
      for(let i=0;i<5;i++){const a=i*Math.PI*2/5;axle(face,rubber,Math.cos(a)*1.02,Math.sin(a)*1.02,0,.30,.07)}}
  }
  const nameplate=document.createElement('canvas');nameplate.width=512;nameplate.height=96;
  const pen=nameplate.getContext('2d');pen.fillStyle='#114953';pen.fillRect(0,0,512,96);
  pen.fillStyle='#e7eae4';pen.font='bold 61px Arial';pen.textAlign='center';pen.fillText('FAN TROLLEY',256,69);
  const decal=new T.CanvasTexture(nameplate);decal.colorSpace=T.SRGBColorSpace;
  mesh(cart,new T.PlaneGeometry(12,2.25),new T.MeshBasicMaterial({map:decal}),-15,4.05,6.76);
  // Axial fan with a protective wire cage, pitched blades, motor and twin mounting struts.
  const cy=17,fx=-25;
  for(const z of [-4,4])rod(cart,dark,[fx+1,6.3,z],[fx,cy,z*.5],.58);
  axle(cart,dark,fx+2,cy,0,2.5,4,'x');
  function hoop(x,r,t){const h=mesh(cart,new T.TorusGeometry(r,t,8,72),polished,x,cy,0);h.rotation.y=Math.PI/2}
  for(const x of [fx-2.3,fx+1.4])hoop(x,8.4,.34);
  for(const r of [2.9,4.7,6.5])hoop(fx-2.75,r,.13);
  const rotor=group(cart);rotor.position.set(fx,cy,0);
  const blade=new T.Shape();blade.moveTo(0,.8);blade.bezierCurveTo(-.15,3.3,-2.4,5.4,-3,6.3);blade.bezierCurveTo(-.1,8.3,2.5,6.3,2.3,4.6);blade.lineTo(1.3,1);blade.closePath();
  for(let i=0;i<7;i++){const mount=group(rotor);mount.rotation.x=i*Math.PI*2/7;const vane=mesh(mount,new T.ExtrudeGeometry(blade,{depth:.28,bevelEnabled:true,bevelSize:.16,bevelThickness:.12,bevelSegments:2}),steel(0x537d80,.65,.27),0,0,0);vane.rotation.y=Math.PI/2+.2}
  axle(cart,alloy,fx-2.85,cy,0,1.45,.9,'x');
  for(let i=0;i<10;i++){const a=i*Math.PI/5,y=Math.cos(a),z=Math.sin(a);rod(cart,polished,[fx-3,cy+1.1*y,1.1*z],[fx-2.3,cy+8.4*y,8.4*z],.13);rod(cart,alloy,[fx-2.3,cy+8.4*y,8.4*z],[fx+1.4,cy+8.4*y,8.4*z],.17)}
  box(cart,dark,-11,6.65,0,17,.65,10);
  const plates=[];for(let i=0;i<10;i++){const x=i<5?-15.1:-7;const y=7.48+(i%5)*.98;
    const plate=group(cart);plate.position.set(x,y,0);
    casing(plate,brass,0,0,0,7.4,.69,8.6,.23,.11);
    for(const dz of [-2.8,2.8])axle(plate,dark,0,.39,dz,.43,.035,'y');
    plates.push(plate)}
  casing(cart,steel(0x4e5b64,.25,.46),-1.5,10.8,0,2.9,8.55,.5,.12,.05);box(cart,alloy,-1.5,6.7,0,4,.7,2);
  const floor=new T.Mesh(new T.PlaneGeometry(320,160),new T.ShadowMaterial({opacity:.15}));floor.rotation.x=-Math.PI/2;floor.position.y=-6.1;floor.receiveShadow=true;scene.add(floor);
  const overlay=host.querySelector('.bench-overlay'), lab=(id)=>host.querySelector('[data-label="'+id+'"]');
  host.prepend(renderer.domElement);host.hidden=false;document.querySelector('svg.bench').style.display='none';
  let progress=0,force=.04,count=0,angle=0,width=0,height=0;
  function draw(){
    cart.position.x=80*progress;wheelFaces.forEach(w=>w.rotation.z=-cart.position.x/2.5);rotor.rotation.x=angle;plates.forEach((plate,i)=>plate.visible=i<count);
    beam.visible=progress<1||progress>1+3/80;renderer.render(scene,camera);
    function project(x,y,z){const v=new T.Vector3(x,y,z).project(camera);return [(v.x+1)*width/2,(1-v.y)*height/2]}
    function place(id,pos){const e=lab(id);e.style.left=pos[0]+'px';e.style.top=pos[1]+'px'}
    place('start',project(0,-4,10));place('end',project(80,-4,10));place('gate',project(80,-7.1,10));place('release',project(-35,8,0));
    const origin=project(cart.position.x,17,0),end=project(cart.position.x+force*105,17,0);
    const arrow=overlay.querySelector('path');const head=Math.min(6,(end[0]-origin[0])*.35);
    arrow.setAttribute('d','M'+origin+' L'+end+' l-'+head+' -3 M'+end+' l-'+head+' 3');
    place('force',[origin[0],origin[1]-5]);lab('force').textContent=force.toFixed(2)+' N';
  }
  function resize(){width=host.clientWidth;height=host.clientHeight;if(!width||!height)return;
    renderer.setSize(width,height,false);const narrow=width<540;
    camera.position.set(narrow?-66:-34,49,narrow?90:110);camera.lookAt(31,7,0);camera.updateMatrixWorld();
    const w=narrow?126:151,h=w*height/width;Object.assign(camera,{left:-w/2,right:w/2,top:h/2,bottom:-h/2,near:.1,far:400});camera.updateProjectionMatrix();draw()}
  new ResizeObserver(resize).observe(host);resize();
  renderer.domElement.addEventListener('webglcontextlost',()=>{host.hidden=true;document.querySelector('svg.bench').style.display='block'});
  return (fraction,thrust,weights,elapsed)=>{progress=fraction;force=thrust;count=weights;if(elapsed!==undefined)angle=elapsed*23;draw()};
}
