// Orthographic exhibit scene. The flight plane z=0 maps directly to the measurement overlay.
function createProjectileExhibit(canvas) {
  const T = window.THREE;
  const renderer = new T.WebGLRenderer({canvas, alpha:true, antialias:true});
  renderer.setClearColor(0,0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  const scene = new T.Scene();
  const rig = new T.Group(), barrel = new T.Group();
  scene.add(rig);
  rig.add(barrel);
  // Broad studio reflections give polished edges and rough cast surfaces distinct highlights.
  const studio = document.createElement('canvas');
  studio.width=512; studio.height=256;
  const ink=studio.getContext('2d');
  const sky=ink.createLinearGradient(0,0,0,256);
  for(const [at,color] of [[0,'#679ec7'],[.35,'#cadae2'],[.49,'#fff0d8'],[.52,'#747e61'],[1,'#252b27']])sky.addColorStop(at,color);
  ink.fillStyle=sky;ink.fillRect(0,0,512,256);
  for(const [x,y,w,h,color] of [[25,20,145,88,'#fff5df'],[270,55,48,130,'#f0f7ff'],[360,18,120,45,'#b6d6e6'],[0,177,512,79,'#282422']]){
    ink.fillStyle=color; ink.fillRect(x,y,w,h);
  }
  const texture=new T.CanvasTexture(studio);
  texture.colorSpace=T.SRGBColorSpace;
  texture.mapping=T.EquirectangularReflectionMapping;
  const generator=new T.PMREMGenerator(renderer);
  const environment=generator.fromEquirectangular(texture);
  scene.environment=environment.texture;
  generator.dispose(); texture.dispose();
  const metal=(color,metalness,roughness)=>new T.MeshStandardMaterial({color,metalness,roughness});
  const armour=metal(0x566b78,.78,.33), alloy=metal(0xb9c9ce,.87,.26);
  const graphite=metal(0x23303a,.62,.44), enamel=metal(0xffb320,.35,.34);
  const teal=metal(0x178a91,.48,.31);
  function part(parent,geometry,material,x=0,y=0,z=0){
    const obj=new T.Mesh(geometry,material);
    obj.position.set(x,y,z); obj.castShadow=true; obj.receiveShadow=true; parent.add(obj);
    return obj;
  }
  function cylinder(parent,r1,r2,len,material,x,y,z){
    const obj=part(parent,new T.CylinderGeometry(r1,r2,len,64),material,x,y,z);
    obj.rotation.x=Math.PI/2; return obj;
  }
  function ring(parent,outer,thickness,depth,material,x,y,z){
    const shape=new T.Shape(); shape.absarc(0,0,outer,0,2*Math.PI,false);
    const hole=new T.Path(); hole.absarc(0,0,outer-thickness,0,2*Math.PI,true); shape.holes.push(hole);
    return part(parent,new T.ExtrudeGeometry(shape,{depth,curveSegments:48,bevelEnabled:true,bevelThickness:.012,bevelSize:.012,bevelSegments:2}),material,x,y,z-depth/2);
  }
  function panel(parent,outline,depth,material,x,y,z){
    const shape=new T.Shape();
    outline.forEach(([px,py],i)=>i?shape.lineTo(px,py):shape.moveTo(px,py));shape.closePath();
    return part(parent,new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:2,bevelSize:.025,bevelThickness:.025}),material,x,y,z-depth/2);
  }
  const sleeve=[[0,-1.77],[.31,-1.77],[.41,-1.6],[.41,-.78],[.34,-.68],[.30,1.14],[.40,1.26],[.40,1.48],[.25,1.48],[.25,1.11],[0,1.10]];
  const tube=part(barrel,new T.LatheGeometry(sleeve.map(([r,y])=>new T.Vector2(r,y)),12),armour,.38);
  tube.rotation.z=-Math.PI/2;
  for(const side of [-1,1]){
    panel(barrel,[[-1.30,.15],[-1.05,.34],[.89,.34],[1.24,.11],[.74,-.09],[-1.08,-.10]],.10,enamel,0,0,side*.32);
    for(let i=0;i<4;i++)panel(barrel,[[0,0],[.09,0],[.21,.16],[.12,.16]],.018,graphite,-.89+.22*i,.025,side*.384);
    panel(rig,[[-2.18,-.84],[-2.02,-1.06],[-.42,-.65],[.34,-.39],[.29,-.04],[-.34,.03]],.21,armour,0,0,side*.41);
    panel(rig,[[-1.95,-.83],[-1.72,-.85],[-.52,-.43],[-.45,-.30]],.035,teal,0,0,side*.55);
    const z=side*.73,y=-.32;
    cylinder(rig,.79,.79,.20,graphite,0,y,z);
    cylinder(rig,.65,.67,.24,armour,0,y,z);
    ring(rig,.57,.064,.035,alloy,0,y,z+side*.13);
    cylinder(rig,.27,.30,.31,enamel,0,y,z);
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4;
      const lug=part(rig,new T.BoxGeometry(.21,.105,.03),graphite,.435*Math.cos(a),y+.435*Math.sin(a),z+side*.14);
      lug.rotation.z=a;
    }
    cylinder(rig,.12,.12,.36,graphite,0,y,z);
  }
  const pendingRig=rig.clone(),pendingBarrel=pendingRig.children[rig.children.indexOf(barrel)];
  const previewMaterials=new Map();
  pendingRig.traverse(mesh=>{
    if(!mesh.isMesh)return;
    if(!previewMaterials.has(mesh.material)){
      const tint=mesh.material.color.clone().lerp(new T.Color(0x63bbad),.29);
      previewMaterials.set(mesh.material,new T.MeshStandardMaterial({color:tint,roughness:.55,
        emissive:tint,emissiveIntensity:.08,transparent:true,opacity:.72,depthWrite:true,
        polygonOffset:true,polygonOffsetFactor:-2}));
    }
    mesh.material=previewMaterials.get(mesh.material);mesh.castShadow=false;mesh.receiveShadow=false;
  });
  const pendingPlatform=createLaunchLift(T,true);
  const pendingSetup=new T.Group();pendingSetup.add(pendingRig,pendingPlatform);scene.add(pendingSetup);
  const initialVector=new T.ArrowHelper(new T.Vector3(1,0,0),new T.Vector3(1.86,0,0),1,adjustmentPurple);
  initialVector.cone.material.toneMapped=initialVector.line.material.toneMapped=false;
  initialVector.line.material.transparent=initialVector.cone.material.transparent=true;
  initialVector.line.material.opacity=initialVector.cone.material.opacity=.85;
  pendingBarrel.add(initialVector);
  const arcMaterial=new T.MeshBasicMaterial({color:adjustmentPurple,toneMapped:false,transparent:true,depthWrite:false});
  const angleGuide=new T.Group();
  angleGuide.position.z=.38;
  const arcRadius=2.27,innerAngle=.25,outerAngle=.76;
  const arcEdges=[];
  for(const sign of [-1,1]){
    const tubeGeometry=r=>new T.TorusGeometry(arcRadius,r,8,20,outerAngle-innerAngle);
    const tube=new T.Mesh(tubeGeometry(.054),arcMaterial);
    tube.rotation.z=sign<0?-outerAngle:innerAngle;
    angleGuide.add(tube);
    arcEdges.push(outlineGuide(tube,tubeGeometry(.078)));
    const a=sign*outerAngle;
    const head=new T.Mesh(new T.ConeGeometry(.14,.34,12),arcMaterial);
    head.position.set(arcRadius*Math.cos(a),arcRadius*Math.sin(a),0);
    head.rotation.z=a+(sign<0?Math.PI:0);
    angleGuide.add(head);arcEdges.push(outlineGuide(head));
  }
  const speedShaft=new T.Mesh(new T.CylinderGeometry(.085,.085,1,16),initialVector.cone.material);
  initialVector.add(speedShaft);
  const speedEdges=[outlineGuide(speedShaft),outlineGuide(initialVector.cone)];
  let arrowLength=1,mainArrowMetresPerPixel=0;
  function sizeSpeedArrow(length,metresPerPixel){
    const shaftRadius=Math.min(length*.095,.24,Math.max(.065,2.4*metresPerPixel));
    const headLength=Math.min(length*.36,Math.max(.48,10*metresPerPixel));
    const headWidth=Math.min(length*.42,Math.max(.40,shaftRadius*4));
    initialVector.setLength(length,headLength,headWidth);
    speedShaft.position.y=(length-headLength)/2;
    speedShaft.scale.set(shaftRadius/.085,length-headLength,shaftRadius/.085);
  }
  const ball=part(scene,new T.SphereGeometry(1,48,32),alloy);
  for(const angle of [-.32,.32]){
    const belt=part(ball,new T.TorusGeometry(Math.cos(angle),.027,8,64),graphite,0,Math.sin(angle),0);
    belt.rotation.x=Math.PI/2;
  }
  const insert=part(ball,new T.TorusGeometry(1,.036,8,64),enamel);insert.rotation.x=Math.PI/2;
  const key=new T.DirectionalLight(0xffd3a3,2.45);
  key.position.set(-260,420,340); key.castShadow=true;
  Object.assign(key.shadow.camera,{left:-450,right:450,top:350,bottom:-350,near:1,far:1200});
  key.shadow.mapSize.set(2048,2048);key.shadow.normalBias=.4;scene.add(key);
  scene.add(new T.HemisphereLight(0xc4deef,0x645444,.84));
  const rim=new T.DirectionalLight(0xafcfe4,.94);rim.position.set(140,180,-250);scene.add(rim);
  const sunOffset=new T.Vector3(-38,34,-49);scene.add(key.target);
  const placeHarbour=createHarbour(T,scene);
  const updateEarth=createEarthCut(T,scene);
  let previousWidth=0, previousHeight=0, previousRatio=0;
  let cachedAngle, bounds;
  function cannonBounds(theta){
    if(theta===cachedAngle) return bounds;
    const angle=theta*Math.PI/180;
    barrel.rotation.z=angle;
    rig.position.set(-1.86*Math.cos(angle),-1.86*Math.sin(angle),0);
    rig.scale.setScalar(1);
    rig.updateMatrixWorld(true);
    bounds={left:Infinity,right:-Infinity,bottom:Infinity,top:-Infinity};
    const point=new T.Vector3();
    rig.traverse(mesh=>{
      if(!mesh.isMesh)return;
      const vertices=mesh.geometry.attributes.position;
      for(let i=0;i<vertices.count;i++){
        point.fromBufferAttribute(vertices,i).applyMatrix4(mesh.matrixWorld);
        const x=point.x-.48*point.z, y=point.y-.12*point.z;
        bounds.left=Math.min(bounds.left,x);bounds.right=Math.max(bounds.right,x);
        bounds.bottom=Math.min(bounds.bottom,y);bounds.top=Math.max(bounds.top,y);
      }
    });
    cachedAngle=theta;
    return bounds;
  }
  // Reuse camera-facing particles in both views, anchored to the contact point.
  const burst=new T.Group();scene.add(burst);burst.visible=false;
  function puffTexture(smoke){
    const c=document.createElement('canvas');c.width=c.height=96;
    const ctx=c.getContext('2d');
    for(let i=0;i<(smoke?9:1);i++){
      const a=i*2.4,r=smoke?Math.sqrt(i)*7:0;
      const x=48+Math.cos(a)*r,y=48+Math.sin(a)*r;
      const g=ctx.createRadialGradient(x,y,0,x,y,smoke?22:46);
      g.addColorStop(0,smoke?'rgba(255,255,255,.66)':'#fff8cb');
      g.addColorStop(.35,smoke?'rgba(255,255,255,.44)':'#ffad39');
      g.addColorStop(1,smoke?'rgba(255,255,255,0)':'rgba(255,67,8,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,96,96);
    }
    const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;return texture;
  }
  // Paint a broken warm rim around a darker contact stain. Its centre stays open.
  const stamp=document.createElement('canvas');stamp.width=stamp.height=192;
  const paint=stamp.getContext('2d'),pixels=paint.createImageData(192,192);
  function grit(x,y){const h=Math.sin(x*127.1+y*311.7)*43758.5453;return h-Math.floor(h);}
  for(let y=0;y<192;y++)for(let x=0;x<192;x++){
    const dx=(x-95.5)/94,dy=(y-95.5)/94,r=Math.hypot(dx,dy),a=Math.atan2(dy,dx);
    const n=grit(x,y),edge=.72+.05*Math.sin(7*a)+.026*Math.sin(17*a);
    const rim=Math.exp(-((r-edge)**2)/.0016)*(.42+.58*n);
    const ash=Math.exp(-((r-.50)**2)/.036)*(.50+.50*n);
    const i=(192*y+x)*4;
    pixels.data[i]=32+201*rim;pixels.data[i+1]=32+131*rim;pixels.data[i+2]=33+36*rim;
    pixels.data[i+3]=Math.round(230*Math.min(1,ash+rim));
  }
  paint.putImageData(pixels,0,0);
  const stainMap=new T.CanvasTexture(stamp);stainMap.colorSpace=T.SRGBColorSpace;
  const stain=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:stainMap,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,toneMapped:false}));
  stain.rotation.x=-Math.PI/2;scene.add(stain);stain.visible=false;
  // Discrete wakes let clear deck show through between the rolling dust banks.
  const wave=new T.Group();scene.add(wave);
  const dustTexture=puffTexture(true);
  const curls=Array.from({length:20},(_,i)=>{
    const sprite=new T.Sprite(new T.SpriteMaterial({map:dustTexture,transparent:true,
      depthWrite:false,color:i%2?0xafa18e:0x645f58,toneMapped:false}));
    wave.add(sprite);return sprite;
  });
  const splinters=new T.Group();scene.add(splinters);
  const chipShape=new T.IcosahedronGeometry(1,0);
  const chipMaterials=[0x353d40,0x756d62,0x525e60].map(color=>new T.MeshStandardMaterial({color,roughness:.83,flatShading:true}));
  const chips=Array.from({length:11},(_,i)=>{
    const chip=new T.Mesh(chipShape,chipMaterials[i%3]);splinters.add(chip);return chip;
  });
  // Use the original three-frame, direction-specific Pompom artwork from Spelling Bee-ker.
  const fetchEnabled=false;
  const catMaps=(fetchEnabled?['pompom-walk.webp','pompom-walk-left.webp']:[]).map(name=>{
    const texture=new T.TextureLoader().load('assets/projectile-v2/'+name);
    texture.repeat.set(1/3,1);
    if(T.sRGBEncoding)texture.encoding=T.sRGBEncoding;
    return texture;
  });
  const cat=new T.Sprite(new T.SpriteMaterial({map:catMaps[0]??null,transparent:true,depthWrite:false}));
  cat.name='Pompom';cat.center.set(.5,.015);scene.add(cat);
  const fetchedBall=ball.clone();
  fetchedBall.name='Retrieved ball';scene.add(fetchedBall);
  function showFetch(age,size,height){
    cat.visible=fetchedBall.visible=false;
    if(age<.7)return;
    const depth=-ball.position.clone().applyMatrix4(flightCamera.matrixWorldInverse).z;
    const pixel=2*depth/(height*flightCamera.projectionMatrix.elements[5]);
    const length=Math.max(1.8*size,32*pixel);
    const direction=flightCamera.matrixWorld.elements[0]>=0?1:-1;
    const approach=Math.min(1,(age-.7)/1.8),carry=Math.max(0,Math.min(1,(age-2.85)/1.8));
    const turn=age>=2.85,face=(turn?-1:1)*direction;
    const grip=.41*length,run=3.4*length;
    const centreX=ball.position.x-grip-run*(1-approach+carry);
    const ground=ball.position.y-ball.scale.y;
    const crouch=Math.sin(Math.PI*Math.min(1,Math.max(0,(age-2.5)/.35)));
    const tex=catMaps[face>0?0:1];
    const stride=Math.floor((approach+carry)*run/(length*.38)*3)%3;
    tex.offset.x=stride/3;cat.material.map=tex;
    cat.visible=true;cat.position.set(centreX,ground,0);
    cat.scale.set(length,length*(1-.16*crouch),1);
    if(age>=2.68){
      fetchedBall.visible=true;ball.visible=false;
      const blend=Math.min(1,(age-2.68)/.35);
      const mouth=turn?centreX-grip:centreX+grip;
      fetchedBall.position.set(ball.position.x+(mouth-ball.position.x)*blend,
        ground+ball.scale.y+(.32*length-ball.scale.y)*blend,.04*size);
      fetchedBall.scale.copy(ball.scale);
    }
  }
  const contactView=new T.Vector3();
  function frameStain(camera,height,size,age,landed){
    wave.visible=landed && age>=0 && age<1.65;
    splinters.visible=wave.visible && age<1.12;
    stain.visible=landed;if(!landed)return;
    stain.position.copy(ball.position);stain.position.y-=ball.scale.y-.022*size;
    camera.updateMatrixWorld();
    const depth=-contactView.copy(stain.position).applyMatrix4(camera.matrixWorldInverse).z;
    const pixel=2*depth/(height*camera.projectionMatrix.elements[5]);
    const diameter=Math.max(20*pixel,Math.min(44*pixel,1.6*size));
    stain.scale.setScalar(diameter*(age>=0?.78+.22*Math.min(1,age/.24):1));
    if(wave.visible){
      const progress=age/1.65;
      const reach=Math.min(108,Math.max(34,height*.17))*pixel;
      const start=Math.min(reach*.3,diameter*.48);
      wave.position.copy(stain.position);wave.position.y+=.012*size;
      wave.scale.setScalar(start+(reach-start)*(1-(1-progress)**3.4));
      curls.forEach((puff,i)=>{
        const cluster=Math.floor(i/4),j=i%4;
        const a=[.14,1.65,2.58,4.03,5.42][cluster]+j*.095;
        const t=Math.max(0,age-.055-.025*j),roll=t*(5.9+cluster*.22)+j*.82;
        const radius=.76+.13*Math.sin(cluster*3.7)+j*.028+.075*Math.sin(roll);
        puff.position.set(radius*Math.cos(a),.044+.07*(1-Math.cos(roll)),radius*Math.sin(a));
        const width=(.18+.13*j/3+.17*progress);
        puff.scale.set(width,width*(.62+.12*Math.sin(roll)),1);
        puff.material.rotation=a+.68*Math.sin(roll);
        puff.material.opacity=Math.min(1,t/.11)*(.68-.065*j)*(1-progress**1.6);
      });
      splinters.position.copy(stain.position);
      splinters.scale.setScalar(Math.max(19*pixel,Math.min(size,33*pixel)));
      chips.forEach((chip,i)=>{
        const a=i*2.4+.27,t=Math.max(0,age-.009*(i%4));
        const airtime=.46+.063*(i%7),u=Math.min(1,t/airtime);
        const radius=u*(.80+.26*(i%5));
        chip.position.set(Math.cos(a)*radius,.055+4*u*(1-u)*(.55+.20*(i%5)),Math.sin(a)*radius);
        chip.rotation.set(i+u*5.6,a+u*3.8,i*.7+u*4);
        const fade=Math.max(0,1-Math.max(0,t-airtime)/.20);
        chip.scale.set(.23*fade,.088*fade,(.10+i%3*.026)*fade);
      });
      burst.scale.setScalar(Math.max(size,Math.min(13,height*.017)*pixel));
    }
  }
  const flashMap=puffTexture(false),dustMap=puffTexture(true);
  function particle(map,color,bright){
    const sprite=new T.Sprite(new T.SpriteMaterial({map,color,transparent:true,depthWrite:false,
      blending:bright?T.AdditiveBlending:T.NormalBlending,toneMapped:false}));
    burst.add(sprite);return sprite;
  }
  const core=particle(flashMap,0xffffff,true);
  const sparks=Array.from({length:13},()=>particle(flashMap,0xffd486,true));
  const dust=Array.from({length:6},()=>particle(dustMap,0x8b8581,false));
  const drift=Array.from({length:9},()=>particle(dustMap,0xbb987b,false));
  function drawImpact(age,size){
    burst.visible=age>=0 && age<1;
    if(!burst.visible)return;
    burst.position.copy(ball.position);burst.position.y-=ball.scale.y;
    burst.scale.setScalar(size);
    core.position.y=.24;
    core.scale.setScalar(.55+2.2*Math.sin(Math.min(1,age/.24)*Math.PI*.64));
    core.material.opacity=Math.max(0,1-age/.25);
    sparks.forEach((spark,i)=>{
      const a=i*2.4,speed=.85+(i%5)*.43;
      const up=.10+(1.7+i%4*.68)*age-4.4*age*age;
      spark.position.set(Math.cos(a)*speed*age,Math.max(0,up),Math.sin(a)*speed*age);
      spark.scale.set(.048+.02*(i%3),.14*(1-age)+.055,1);spark.material.rotation=-Math.cos(a)*age*1.8;spark.material.opacity=up>0?Math.max(0,1-age/.62):0;
    });
    drift.forEach((puff,i)=>{
      const a=i*2.399,spread=(1-Math.exp(-age*6))*(.72+.07*(i%4));
      puff.position.set(Math.cos(a)*spread,.10+.13*age,Math.sin(a)*spread);
      puff.scale.set(.44+.50*age,.13+.20*age,1);
      puff.material.opacity=.57*Math.min(1,age/.055)*(1-age)**2;
    });
    dust.forEach((puff,i)=>{
      const a=i*2.4;
      puff.position.set(Math.cos(a)*age*(.56+i*.15),.17+age*(.46+i*.16),Math.sin(a)*age*.8);
      puff.scale.setScalar(.45+age*(1.1+i*.16));puff.material.rotation=a+.28*age;
      puff.material.opacity=.43*Math.min(1,age/.13)*(1-age)**1.4;
    });
  }
  function ease(t){t=Math.max(0,Math.min(1,t));return t*t*t*(10+t*(-15+6*t));}
  let lastFrame;
  function render({w,h,start,muzzleY,x,y,theta,size,view,flight,inset,ready,preview,impactAge,editSpeed,editable}){
    const ratio=Math.min(devicePixelRatio||1,2);
    if(w!==previousWidth || h!==previousHeight || ratio!==previousRatio){
      renderer.setPixelRatio(ratio);
      renderer.setSize(w,h,false);
      previousWidth=w; previousHeight=h; previousRatio=ratio;
    }

    const angle=theta*Math.PI/180;
    barrel.rotation.z=angle;
    const mx=start-w/2,my=h/2-muzzleY;
    rig.scale.setScalar(size);
    rig.position.set(mx-1.86*Math.cos(angle)*size,my-1.86*Math.sin(angle)*size,0);
    ball.scale.setScalar(Math.max(4,.235*size));
    ball.position.set(x-w/2,h/2-y,0);
    // Keep the sun shadow texels in metres as the flight framing changes scale.
    key.target.position.copy(rig.position);
    key.position.copy(rig.position).addScaledVector(sunOffset,size);
    const shadowCamera=key.shadow.camera;
    Object.assign(shadowCamera,{left:-22*size,right:22*size,top:20*size,bottom:-20*size,near:size,far:130*size});
    shadowCamera.updateProjectionMatrix();key.shadow.normalBias=.012*size;
    placeHarbour(rig.position.x,my-flight.y0*size-ball.scale.x,size,document.documentElement.dataset.theme==="tech");
    const landed=!ready && flight.T>0 && flight.time>=flight.T;
    const landedAge=landed?(impactAge<0?Infinity:impactAge):0;
    updateEarth(size,my-flight.y0*size-ball.scale.x,rig.position.y-1.118*size,rig.position.x,ball,document.documentElement.dataset.theme==="tech",mx,flight.time,flight.vx,landedAge);
    const phase=ready?0:Math.min(1,flight.time/Math.max(.001,flight.T));
    const sweep=ease(phase/.62),settle=ease((phase-.56)/.44);
    const opening=view.launchFrame;
    const yaw=(opening ? opening.yaw*(1-settle) : -.71+.36*sweep+.35*settle)+view.yaw;
    const sidePitch=25*Math.PI/180;
    const pitch=(opening ? opening.pitch+(sidePitch-opening.pitch)*settle : .245+.005*sweep+(sidePitch-.25)*settle)-view.pitch;
    flightCamera.rotation.set(-pitch,yaw,0,'YXZ');
    flightCamera.aspect=w/h;
    const inverse=flightCamera.quaternion.clone().invert();
    const points=[],bounds=new T.Box3(),v=new T.Vector3();
    function include(x,y,z){
      const q=new T.Vector3(x,y,z).sub(rig.position).applyQuaternion(inverse);
      points.push(q);bounds.expandByPoint(q);
    }
    const setup=preview || (ready?{theta,y0:flight.y0,v0:editSpeed}:null);
    rig.visible=!ready;platform.visible=!ready;
    const vectorParent=setup?pendingBarrel:barrel;
    if(initialVector.parent!==vectorParent)vectorParent.add(initialVector);
    if(angleGuide.parent!==vectorParent)vectorParent.add(angleGuide);
    angleGuide.visible=editable;
    pendingPlatform.getObjectByName('Lift direction').visible=editable;
    initialVector.visible=editable;
    const length=editSpeed*.16;
    arrowLength=length;
    sizeSpeedArrow(length,0); // Measure the rig independently of the preceding camera zoom.


    platform.getObjectByName('Lift direction').visible=editable&&!setup;
    if(setup){
      const tilt=setup.theta*Math.PI/180;
      const field=my-flight.y0*size-ball.scale.x;
      const floor=Math.min(field-.35*size,rig.position.y-1.118*size);
      pendingSetup.position.set(mx-1.86*Math.cos(tilt)*size,my+(setup.y0-flight.y0-1.86*Math.sin(tilt))*size,0);
      pendingSetup.scale.setScalar(size);
      pendingBarrel.rotation.z=tilt;
      const wheelBottom=-1.118;
      const rise=Math.max(.07,wheelBottom-(floor-pendingSetup.position.y)/size);
      pendingPlatform.setRise(rise);pendingPlatform.position.set(-.65,wheelBottom,0);
      const extent=new T.Box3().setFromObject(pendingSetup);
      for(const x of [extent.min.x,extent.max.x])for(const y of [extent.min.y,extent.max.y])for(const z of [extent.min.z,extent.max.z])include(x,y,z);
    }
    const carriage=new T.Box3().setFromObject(rig,true);
    for(const x of [carriage.min.x,carriage.max.x])for(const y of [carriage.min.y,carriage.max.y])for(const z of [carriage.min.z,carriage.max.z])include(x,y,z);
    for(let i=0;i<=32;i++){
      const t=flight.time*i/32;
      include(mx+flight.vx*t*size,my+(flight.vy0*t-flight.g*t*t/2)*size,0);
    }
    const aim=bounds.getCenter(v);
    const spread=.71+.15*ease(phase/.35),tan=Math.tan(flightCamera.fov*Math.PI/360);
    // The reference frames a 1.58 m wheel at roughly 8.5% of viewport height.
    // Reserve room ahead of and above the carriage while the shot is still wide.
    const minimumHeight=Math.max(18.6,28/flightCamera.aspect)*size;
    const lead=1-ease(phase/.65);
    aim.x+=minimumHeight*flightCamera.aspect*.21*lead;
    aim.y+=minimumHeight*.17*lead;
    let distance=minimumHeight/(2*tan);
    for(const q of points)distance=Math.max(distance,q.z+Math.max(
      (Math.abs(q.x-aim.x)+.24*size)/(tan*spread*w/h),
      (Math.abs(q.y-aim.y)+.24*size)/(tan*spread)));
    const ground=new T.Vector3(mx,my-flight.y0*size,0);
    const cameraLocal=new T.Vector3(aim.x,aim.y,distance);
    let zoom=view.zoom;
    if(opening && phase<1){
      // Keep the captured pose in metres relative to the launch origin across scene rescaling.
      const held=opening.offset.clone().multiplyScalar(size).add(ground).sub(rig.position).applyQuaternion(inverse);
      const follow=ease((phase-.10)/.58);
      cameraLocal.x=held.x+(aim.x-held.x)*follow;
      cameraLocal.y=held.y+(aim.y-held.y)*follow;
      zoom=opening.zoom+(1-opening.zoom)*settle;
      let fitted=distance;
      for(const q of points)fitted=Math.max(fitted,q.z+zoom*Math.max(
        (Math.abs(q.x-cameraLocal.x)+.24*size)/(tan*spread*w/h),
        (Math.abs(q.y-cameraLocal.y)+.24*size)/(tan*spread)));
      const wide=Math.max(held.z*zoom/opening.zoom,fitted);
      cameraLocal.z=held.z+(wide-held.z)*follow+(distance-wide)*settle;
    }
    flightCamera.position.copy(cameraLocal).applyQuaternion(flightCamera.quaternion).add(rig.position);
    flightCamera.zoom=zoom;flightCamera.updateProjectionMatrix();flightCamera.updateMatrixWorld();
    // Maintain a usable silhouette in a wide landing shot without moving the tip.
    const tipDepth=-initialVector.getWorldPosition(new T.Vector3()).applyMatrix4(flightCamera.matrixWorldInverse).z;
    const metrePerPixel=2*tipDepth/(h*size*flightCamera.projectionMatrix.elements[5]);
    mainArrowMetresPerPixel=metrePerPixel;
    sizeSpeedArrow(length,metrePerPixel);
    initialVector.line.visible=false;
    lastFrame={yaw,pitch,zoom,offset:flightCamera.position.clone().sub(ground).divideScalar(size)};

    cat.visible=fetchedBall.visible=false;ball.visible=true;
    drawImpact(landed?impactAge:-1,size);
    pendingSetup.visible=false;
    if(inset){
      const iw=inset.w, ih=inset.h;
      const radius=Math.min(32,ih*.095,iw*.08);
      const zoom=radius/ball.scale.x;
      alignSideCamera(portraitCamera,iw/zoom,ih/zoom,
        ball.position.x+iw*.08/zoom,ball.position.y,
        ball.position.x,ball.position.y+.55*size);
      const showRig=rig.visible;
      rig.visible=false;
      renderer.setViewport(0,0,iw,ih);renderer.setScissor(0,0,iw,ih);renderer.setScissorTest(true);
      frameStain(portraitCamera,ih,size,impactAge,landed);
      renderer.render(scene,portraitCamera);
      const source=renderer.domElement;
      const sw=Math.floor(iw*ratio),sh=Math.floor(ih*ratio);
      inset.ctx.clearRect(0,0,iw,ih);
      inset.ctx.drawImage(source,0,source.height-sh,sw,sh,0,0,iw,ih);
      renderer.setScissorTest(false);renderer.setViewport(0,0,w,h);
      rig.visible=showRig;

    }
    pendingSetup.visible=Boolean(setup);
    frameStain(flightCamera,h,size,impactAge,landed);
    if(fetchEnabled && landed)showFetch(impactAge,size,h);
    const activeRig=setup?pendingSetup:rig;
    const depth=-activeRig.position.clone().applyMatrix4(flightCamera.matrixWorldInverse).z;
    const pixelsPerMetre=h*flightCamera.projectionMatrix.elements[5]*size/(2*Math.max(1,depth));
    const keepOpen=stationCanvas.hasPointerCapture(stationPointer.value);
    const autoOpen=!ready && (keepOpen || pixelsPerMetre*3.5<=(stationPanel.hidden?95:112));
    stationPanel.hidden=!(render.stationOpen ?? autoOpen);
    stationToggle.setAttribute('aria-pressed',String(!stationPanel.hidden));
    if(!stationPanel.hidden){
      const width=stationCanvas.clientWidth,height=stationCanvas.clientHeight;
      const thetaRad=(setup?setup.theta:theta)*Math.PI/180;
      const tip=1.86+editSpeed*.16;
      const right=Math.max(2,tip*Math.cos(thetaRad)+.7),left=-3.8;
      const top=Math.max(1.4,tip*Math.sin(thetaRad)+.6),bottom=Math.min(-1.8,tip*Math.sin(thetaRad)-.5);
      const span=Math.max(top-bottom,(right-left)*height/width);
      stationCam.left=-span*size*width/height/2;stationCam.right=-stationCam.left;
      stationCam.top=span*size/2;stationCam.bottom=-stationCam.top;
      stationCam.position.copy(activeRig.position);
      stationCam.position.x+=(left+right)*size/2;
      stationCam.position.y+=(top+bottom)*size/2;
      stationCam.position.z+=45*size;
      stationCam.updateProjectionMatrix();stationCam.updateMatrixWorld();
      drawStation();
    }
    renderer.render(scene,flightCamera);
    return function project(horizontal,height){
      v.set(mx+horizontal*size,my+(height-flight.y0)*size,0).project(flightCamera);
      return {x:(v.x+1)*w/2,y:(1-v.y)*h/2};
    };
  };
  // A level camera parallel to the flight plane preserves its x/y ruler.
  // A lens shift frames that plane while foreground and background retain perspective.
  function alignSideCamera(cam,width,height,cx,cy,eyeX,eyeY){
    const distance=height/(2*Math.tan(T.MathUtils.degToRad(cam.fov/2)));
    cam.position.set(eyeX,eyeY,distance);
    cam.setViewOffset(width,height,cx-eyeX,eyeY-cy,width,height);
  }
  const flightCamera=new T.PerspectiveCamera(38,1,.1,200000);
  const portraitCamera=new T.PerspectiveCamera(34,1,.1,200000);
  const stationCam=new T.OrthographicCamera(-1,1,1,-1,.1,200000);
  const stationPanel=document.getElementById('rigInset'),stationCanvas=document.getElementById('rigInsetCanvas');
  const stationBackdrop=new T.Color(0x364b54);
  const stationToggle=document.getElementById('toggleRigInset');
  const stationPointer={value:-1};
  render.stationPointer=stationPointer;
  // Thin model-space guides need a wider luminous core in the small inset.
  const stationArcGeometry=new T.TorusGeometry(arcRadius,.092,8,20,outerAngle-innerAngle);
  const stationCueMaterials={};
  for(const key of ['theta','y0']){
    stationCueMaterials[key]=new T.MeshBasicMaterial({color:0xe6a1ff,transparent:true,
      toneMapped:false,fog:false,depthWrite:true});
  }
  let cuePulse=1,focusedCue=null;
  function stationGuide(group,key,enabled){
    const material=stationCueMaterials[key];
    const focused=focusedCue===key;
    material.color.setHex(focused?0xf8e4ff:0xe6a1ff);
    material.opacity=focused?1:focusedCue ? .65 : .86+.14*cuePulse;
    for(const mesh of group.children){
      if(enabled){
        mesh.userData.mainMaterial=mesh.material;
        mesh.material=material;
        if(mesh.geometry.type==='TorusGeometry'){
          mesh.userData.mainGeometry=mesh.geometry;mesh.geometry=stationArcGeometry;
        }else mesh.scale.set(1.3,1,1.3);
      }else{
        mesh.material=mesh.userData.mainMaterial;
        if(mesh.userData.mainGeometry)mesh.geometry=mesh.userData.mainGeometry;
        mesh.scale.set(1,1,1);
      }
      mesh.children[0].visible=!enabled;
    }
  }
  function drawStation(){
    if(stationPanel.hidden)return;
    const width=stationCanvas.clientWidth,height=stationCanvas.clientHeight,ratio=renderer.getPixelRatio();
    const sw=Math.floor(width*ratio),sh=Math.floor(height*ratio);
    if(!sw||!sh)return;
    if(stationCanvas.width!==sw||stationCanvas.height!==sh){stationCanvas.width=sw;stationCanvas.height=sh;}
    renderer.setViewport(0,0,width,height);renderer.setScissor(0,0,width,height);renderer.setScissorTest(true);
    const background=scene.background;scene.background=stationBackdrop;
    const showRig=rig.visible,showPlatform=platform.visible;
    if(pendingSetup.visible){rig.visible=false;platform.visible=false;}
    const root=pendingSetup.visible?pendingSetup:rig;
    sizeSpeedArrow(arrowLength,(stationCam.top-stationCam.bottom)/(height*root.scale.x));
    const lift=(pendingSetup.visible?pendingPlatform:platform).getObjectByName('Lift direction');
    stationGuide(angleGuide,'theta',true);stationGuide(lift,'y0',true);
    renderer.render(scene,stationCam);
    stationGuide(angleGuide,'theta',false);stationGuide(lift,'y0',false);
    sizeSpeedArrow(arrowLength,mainArrowMetresPerPixel);
    rig.visible=showRig;platform.visible=showPlatform;scene.background=background;
    stationCanvas.getContext('2d').drawImage(renderer.domElement,0,renderer.domElement.height-sh,sw,sh,0,0,sw,sh);
    renderer.setScissorTest(false);renderer.setViewport(0,0,previousWidth,previousHeight);
  }
  const platform=scene.getObjectByName('Launch platform');
  stationCam.layers.set(2);
  for(const group of [platform,rig,pendingSetup,angleGuide,initialVector])
    group.traverse(object=>object.layers.enable(2));
  scene.traverse(object=>{if(object.isLight)object.layers.enable(2);});
  const picker=new T.Raycaster(),plane=new T.Plane(new T.Vector3(0,0,1),0);
  function aimRay(x,y,cam,surface=canvas){
    const r=surface.getBoundingClientRect();
    picker.setFromCamera(new T.Vector2(2*(x-r.left)/r.width-1,1-2*(y-r.top)/r.height),cam);
  }
  render.pickControl=function(x,y,station=false){
    const surface=station?stationCanvas:canvas;
    aimRay(x,y,station?stationCam:flightCamera,surface);
    const parts=rig.visible?[[barrel,'theta'],[platform,'y0']]:[[platform,'y0']];
    if(pendingSetup.visible)parts.unshift([pendingBarrel,'theta'],[pendingPlatform,'y0']);
    for(const [object,key] of parts){
      if(picker.intersectObject(object,true).length)return key;
    }
    // The floor can cover the sides of a fully lowered platform.
    const guide=render.controlAnchor(station);
    const r=surface.getBoundingClientRect();
    if(Math.hypot(x-r.left-guide.base.x,y-r.top-guide.base.y)<11)return 'y0';
    return null;
  };
  render.controlAnchor=function(station=false){
    const cam=station?stationCam:flightCamera;
    const root=pendingSetup.visible?pendingSetup:rig,rect=(station?stationCanvas:canvas).getBoundingClientRect();
    function screen(x,y,z){
      const pt=root.localToWorld(new T.Vector3(x,y,z)).project(cam);
      return {x:(pt.x+1)*rect.width/2,y:(1-pt.y)*rect.height/2};
    }
    const angle=(pendingSetup.visible?pendingBarrel:barrel).rotation.z;
    const tip=initialVector.cone.getWorldPosition(new T.Vector3()).project(cam);
    const speedTip={x:(tip.x+1)*rect.width/2,y:(1-tip.y)*rect.height/2};
    return {speedTip,liftBadge:screen(-3,-.358,.64),onArc:(offset,radius)=>screen(radius*Math.cos(angle+offset),radius*Math.sin(angle+offset),.38),muzzle:screen(1.86*Math.cos(angle),1.86*Math.sin(angle),0),rear:screen(-2.2,-.9,0),base:screen(-.65,-1.118,1),pivot:screen(0,0,0),speed:screen(1,-.45,1)};
  };
  render.dragCoordinates=function(station=false){
    const cam=(station?stationCam:flightCamera).clone(),root=pendingSetup.visible?pendingSetup:rig;
    const centre=root.position.clone(),scale=root.scale.x;
    return (x,y)=>{
      aimRay(x,y,cam,station?stationCanvas:canvas);
      const pt=picker.ray.intersectPlane(plane,new T.Vector3());
      if(!pt)return null;
      pt.sub(centre).divideScalar(scale);
      return {horizontal:pt.x,height:pt.y,angle:Math.atan2(pt.y,pt.x)*180/Math.PI};
    };
  };
  const liftCueMaterials=[platform,pendingPlatform].map(lift=>lift.getObjectByName('Lift direction').children[0].material);
  render.cueColors={
    theta:'#'+arcMaterial.color.getHexString(),
    y0:'#'+liftCueMaterials[0].color.getHexString(),
    v0:'#'+initialVector.cone.material.color.getHexString()
  };
  render.angleGuidePoints=function(onArc){
    return [-1,1].flatMap(sign=>Array.from({length:11},(_,i)=>
      onArc(sign*(innerAngle+(outerAngle-innerAngle)*i/10),arcRadius)));
  };
  // Erase only the arrow's projected faces from the transparent trajectory layer.
  render.clearSpeedSilhouette=function(ctx,w,h){
    if(!initialVector.visible)return;
    ctx.save();ctx.globalCompositeOperation='destination-out';ctx.fillStyle='#fff';
    for(const mesh of [speedShaft,initialVector.cone]){
      const outline=mesh.children[0],geometry=outline.geometry,positions=geometry.attributes.position;
      const vertices=[];
      for(let i=0;i<positions.count;i++){
        const v=new T.Vector3().fromBufferAttribute(positions,i).applyMatrix4(outline.matrixWorld).project(flightCamera);
        vertices.push([(1+v.x)*w/2,(1-v.y)*h/2]);
      }
      const indices=geometry.index;
      ctx.beginPath();
      for(let i=0;i<(indices?indices.count:positions.count);i+=3){
        const [a,b,c]=[0,1,2].map(j=>vertices[indices?indices.getX(i+j):i+j]);
        if((b[0]-a[0])*(c[1]-a[1])<(b[1]-a[1])*(c[0]-a[0]))continue;
        ctx.moveTo(...a);ctx.lineTo(...b);ctx.lineTo(...c);ctx.closePath();
      }
      ctx.fill();
    }
    ctx.restore();
  };
  render.setCueOpacity=function(opacity,active){
    cuePulse=opacity;focusedCue=active;
    function level(key,base){
      if(active)return key===active?1:.2;
      return base*opacity;
    }
    for(const edge of arcEdges)edge.opacity=level('theta',.95);
    for(const edge of speedEdges)edge.opacity=level('v0',.95);
    for(const lift of [platform,pendingPlatform]){
      for(const edge of lift.getObjectByName('Lift direction').userData.edges)edge.opacity=level('y0',.95);
    }
    arcMaterial.opacity=level('theta',1);
    for(const material of liftCueMaterials)material.opacity=level('y0',.94);
    initialVector.line.material.opacity=initialVector.cone.material.opacity=level('v0',.98);
    drawStation();renderer.render(scene,flightCamera);
  };
  render.impactDurationMs=fetchEnabled?4750:1650;
  render.cameraFrame=()=>lastFrame;
  render.cannonBounds=cannonBounds;
  return render;
}
