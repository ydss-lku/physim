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
  const camera = new T.OrthographicCamera();
  camera.position.z = 900;
  camera.near = 1;
  camera.far = 2000;
  const rig = new T.Group(), barrel = new T.Group();
  scene.add(rig);
  rig.add(barrel);
  // Broad studio reflections give polished edges and rough cast surfaces distinct highlights.
  const studio = document.createElement('canvas');
  studio.width=512; studio.height=256;
  const ink=studio.getContext('2d');
  ink.fillStyle='#48535b'; ink.fillRect(0,0,512,256);
  for(const [x,y,w,h,color] of [[25,20,145,88,'#fff5df'],[270,55,48,130,'#f0f7ff'],[360,18,120,45,'#b6d6e6'],[0,177,512,79,'#282422']]){
    ink.fillStyle=color; ink.fillRect(x,y,w,h);
  }
  const texture=new T.CanvasTexture(studio);
  texture.mapping=T.EquirectangularReflectionMapping;
  const generator=new T.PMREMGenerator(renderer);
  const environment=generator.fromEquirectangular(texture);
  scene.environment=environment.texture;
  generator.dispose(); texture.dispose();
  const metal=(color,metalness,roughness)=>new T.MeshStandardMaterial({color,metalness,roughness});
  const bronze=metal(0x926a35,.83,.34), brass=metal(0xcfaa67,.82,.24);
  const iron=metal(0x313b40,.68,.38), wood=metal(0x745039,.12,.57), dark=metal(0x171c20,.45,.48);
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
  const profile=[[0,-1.85],[.14,-1.81],[.16,-1.65],[.31,-1.57],[.40,-1.36],[.415,-1.16],[.39,-.95],[.35,-.60],[.305,.05],[.285,.79],[.30,1.18],[.355,1.33],[.355,1.48],[.24,1.48],[.23,1.12],[0,1.10]];
  const tube=part(barrel,new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),96),bronze);
  tube.rotation.z=-Math.PI/2;
  for(const [x,r] of [[-1.2,.42],[-.95,.40],[-.46,.356],[.73,.30],[1.36,.356]]){
    const band=part(barrel,new T.TorusGeometry(r,.026,12,80),brass,x);band.rotation.y=Math.PI/2;
  }
  cylinder(rig,.12,.12,1.57,iron,0,-.22,0);
  for(const side of [-1,1]){
    const z=side*.72, y=-.32;
    ring(rig,.76,.115,.14,wood,0,y,z);
    ring(rig,.79,.045,.17,iron,0,y,z);
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6;
      const spoke=part(rig,new T.CylinderGeometry(.037,.055,.61,8),wood,.37*Math.cos(a),y+.37*Math.sin(a),z);
      spoke.rotation.z=a-Math.PI/2;
    }
    cylinder(rig,.17,.17,.235,brass,0,y,z);
    cylinder(rig,.10,.10,.26,iron,0,y,z);
    const plate=new T.Shape();
    plate.moveTo(-2.2,-.89);plate.lineTo(-2.12,-1.04);plate.lineTo(.40,-.4);plate.lineTo(.36,-.04);plate.lineTo(-.13,.08);plate.closePath();
    part(rig,new T.ExtrudeGeometry(plate,{depth:.13,bevelThickness:.025,bevelSize:.025,bevelSegments:3}),wood,0,0,side*.37);
    for(const x of [-1.76,-.86,.16])cylinder(rig,.052,.052,.17,brass,x,-.30+.32*x,side*.37+.065);
  }
  const ball=part(scene,new T.SphereGeometry(1,64,48),metal(0x61707b,.82,.27));
  const key=new T.DirectionalLight(0xffe9c9,2.3);
  key.position.set(-260,420,340); key.castShadow=true;
  Object.assign(key.shadow.camera,{left:-450,right:450,top:350,bottom:-350,near:1,far:1200});
  key.shadow.mapSize.set(1024,1024);key.shadow.normalBias=.4;scene.add(key);
  scene.add(new T.HemisphereLight(0xe4f5ff,0x795940,1.35));
  const rim=new T.DirectionalLight(0xa5d6ff,1.8);rim.position.set(140,180,-250);scene.add(rim);
  const floor=part(scene,new T.PlaneGeometry(2400,1800),new T.ShadowMaterial({opacity:.25}));
  floor.rotation.x=-Math.PI/2;floor.castShadow=false;
  let previousWidth=0, previousHeight=0, previousRatio=0;
  return function render({w,h,start,muzzleY,x,y,theta,ready}){
    const ratio=Math.min(devicePixelRatio||1,2);
    if(w!==previousWidth || h!==previousHeight || ratio!==previousRatio){
      renderer.setPixelRatio(ratio);
      renderer.setSize(w,h,false);
      previousWidth=w; previousHeight=h; previousRatio=ratio;
    }
    camera.left=-w/2;camera.right=w/2;camera.top=h/2;camera.bottom=-h/2;camera.updateProjectionMatrix();
    // Oblique depth reveals the front rim and both wheels without skewing measured x or y.
    const projection=camera.projectionMatrix.elements;
    projection[8]=-.48*2/w; projection[9]=-.28*2/h;
    projection[12]=camera.position.z*projection[8];
    projection[13]=camera.position.z*projection[9];
    const size=ready?Math.min(w/5.8,h/4.7):Math.min(23,w/20);
    const angle=theta*Math.PI/180;
    barrel.rotation.z=angle;
    const mx=start-w/2,my=h/2-muzzleY;
    rig.scale.setScalar(size);
    rig.position.set(mx-1.48*Math.cos(angle)*size,my-1.48*Math.sin(angle)*size,0);
    ball.scale.setScalar(ready?.235*size:Math.max(5,.235*size));
    ball.position.set(x-w/2,h/2-y,0);
    floor.position.y=rig.position.y-1.11*size;
    renderer.render(scene,camera);
  };
}
