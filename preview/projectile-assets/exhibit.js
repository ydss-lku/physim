// Orthographic exhibit scene. The flight plane z=0 maps directly to the measurement overlay.
function createProjectileExhibit(canvas) {
  const T = window.THREE;
  const renderer = new T.WebGLRenderer({canvas, alpha:true, antialias:true});
  renderer.setClearColor(0,0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
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
  const ball=part(scene,new T.SphereGeometry(1,48,32),alloy);
  for(const angle of [-.32,.32]){
    const belt=part(ball,new T.TorusGeometry(Math.cos(angle),.027,8,64),graphite,0,Math.sin(angle),0);
    belt.rotation.x=Math.PI/2;
  }
  const insert=part(ball,new T.TorusGeometry(1,.036,8,64),enamel);insert.rotation.x=Math.PI/2;
  const key=new T.DirectionalLight(0xffdaaa,2.55);
  key.position.set(-260,420,340); key.castShadow=true;
  Object.assign(key.shadow.camera,{left:-450,right:450,top:350,bottom:-350,near:1,far:1200});
  key.shadow.mapSize.set(2048,2048);key.shadow.normalBias=.4;scene.add(key);
  scene.add(new T.HemisphereLight(0xe4f5ff,0x795940,1.35));
  const rim=new T.DirectionalLight(0xa5d6ff,1.8);rim.position.set(140,180,-250);scene.add(rim);
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
  function ease(t){t=Math.max(0,Math.min(1,t));return t*t*t*(10+t*(-15+6*t));}
  function render({w,h,start,muzzleY,x,y,theta,size,view,flight,inset,ready}){
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
    updateEarth(size,my-flight.y0*size-ball.scale.x,rig.position.y-1.118*size,rig.position.x,ball,document.documentElement.dataset.theme==="tech",mx,flight.time,flight.vx);
    const phase=ready?0:Math.min(1,flight.time/Math.max(.001,flight.T));
    const sweep=ease(phase/.62),settle=ease((phase-.56)/.44);
    const yaw=-.71+.36*sweep+.35*settle+view.yaw;
    const pitch=.48-.18*sweep+(25*Math.PI/180-.30)*settle-view.pitch;
    flightCamera.rotation.set(-pitch,yaw,0,'YXZ');
    flightCamera.aspect=w/h;
    const inverse=flightCamera.quaternion.clone().invert();
    const points=[],bounds=new T.Box3(),v=new T.Vector3();
    function include(x,y,z){
      const q=new T.Vector3(x,y,z).sub(rig.position).applyQuaternion(inverse);
      points.push(q);bounds.expandByPoint(q);
    }
    const carriage=new T.Box3().setFromObject(rig,true);
    for(const x of [carriage.min.x,carriage.max.x])for(const y of [carriage.min.y,carriage.max.y])for(const z of [carriage.min.z,carriage.max.z])include(x,y,z);
    for(let i=0;i<=32;i++){
      const t=flight.time*i/32;
      include(mx+flight.vx*t*size,my+(flight.vy0*t-flight.g*t*t/2)*size,0);
    }
    const aim=bounds.getCenter(v);
    const spread=.57+.29*ease(phase/.35),tan=Math.tan(flightCamera.fov*Math.PI/360);
    // The reference frames a 1.58 m wheel at roughly 8.5% of viewport height.
    // Reserve room ahead of and above the carriage while the shot is still wide.
    const minimumHeight=Math.max(18.6,28/flightCamera.aspect)*size;
    const lead=1-ease(phase/.65);
    aim.x+=minimumHeight*flightCamera.aspect*.24*lead;
    aim.y+=minimumHeight*.23*lead;
    let distance=minimumHeight/(2*tan);
    for(const q of points)distance=Math.max(distance,q.z+Math.max(
      (Math.abs(q.x-aim.x)+.24*size)/(tan*spread*w/h),
      (Math.abs(q.y-aim.y)+.24*size)/(tan*spread)));
    flightCamera.position.set(aim.x,aim.y,distance).applyQuaternion(flightCamera.quaternion).add(rig.position);
    flightCamera.zoom=view.zoom;flightCamera.updateProjectionMatrix();flightCamera.updateMatrixWorld();
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
      renderer.render(scene,portraitCamera);
      const source=renderer.domElement;
      const sw=Math.floor(iw*ratio),sh=Math.floor(ih*ratio);
      inset.ctx.clearRect(0,0,iw,ih);
      inset.ctx.drawImage(source,0,source.height-sh,sw,sh,0,0,iw,ih);
      renderer.setScissorTest(false);renderer.setViewport(0,0,w,h);
      rig.visible=showRig;

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
  render.cannonBounds=cannonBounds;
  return render;
}
