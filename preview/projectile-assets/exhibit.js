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
  const landscapeGroup=new T.Group();
  scene.add(landscapeGroup);
  const updateLandscape=createFlightLandscape(T,landscapeGroup);
  const camera = new T.OrthographicCamera();
  camera.position.z = 48000;
  camera.near = 1;
  camera.far = 100000;
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
  const bronze=metal(0x926a35,.83,.34), brass=metal(0xcfaa67,.82,.24);
  const iron=metal(0x313b40,.68,.38), wood=metal(0x745039,.12,.57), dark=metal(0x171c20,.45,.48);
  const grain=document.createElement('canvas');grain.width=512;grain.height=128;
  const gc=grain.getContext('2d');gc.fillStyle='#bfa58b';gc.fillRect(0,0,512,128);
  for(let i=0;i<170;i++){
    gc.strokeStyle=i%3?'rgba(66,38,23,.15)':'rgba(255,235,207,.19)';
    gc.beginPath();
    for(let x=0;x<=512;x+=8){const y=i*.78+2*Math.sin(x*.017+i*.2)+Math.sin(x*.043+i);if(x)gc.lineTo(x,y);else gc.moveTo(x,y);}
    gc.stroke();
  }
  wood.map=new T.CanvasTexture(grain);wood.map.wrapS=wood.map.wrapT=T.RepeatWrapping;
  wood.map.colorSpace=T.SRGBColorSpace;wood.color.setHex(0x916340);
  bronze.roughness=.29;brass.roughness=.25;
  wood.bumpMap=wood.map;wood.bumpScale=.015;
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
  // Offset the barrel along its own axis so its rear clears the carriage in the opening pose.
  tube.position.x=.38;
  for(const [x,r] of [[-1.2,.42],[-.95,.40],[-.46,.356],[.73,.30],[1.36,.356]]){
    const band=part(barrel,new T.TorusGeometry(r,.026,12,80),brass,x+.38);band.rotation.y=Math.PI/2;
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
    const boss=part(rig,new T.SphereGeometry(.092,32,18),bronze,0,y,z+side*.128);
    boss.scale.z=.36;
    for(const [r,t] of [[.151,.009],[.106,.006]]){
      part(rig,new T.TorusGeometry(r,t,8,56),brass,0,y,z+side*.125);
    }
    for(let k=0;k<6;k++){
      const t=k*Math.PI/3;
      cylinder(rig,.014,.014,.026,iron,.128*Math.cos(t),y+.128*Math.sin(t),z+side*.13);
    }
    for(let n=0;n<8;n++){
      const t=n*Math.PI/4;
      cylinder(rig,.018,.018,.038,brass,.735*Math.cos(t),y+.735*Math.sin(t),z+side*.092);
    }
    const plate=new T.Shape();
    plate.moveTo(-2.2,-.89);plate.lineTo(-2.12,-1.04);plate.lineTo(.40,-.4);plate.lineTo(.36,-.04);plate.lineTo(-.13,.08);plate.closePath();
    part(rig,new T.ExtrudeGeometry(plate,{depth:.13,bevelThickness:.025,bevelSize:.025,bevelSegments:3}),wood,0,0,side*.37);
    for(const x of [-1.76,-.86,.16])cylinder(rig,.052,.052,.17,brass,x,-.30+.32*x,side*.37+.065);
  }
  const ball=part(scene,new T.SphereGeometry(1,64,48),metal(0x728391,.91,.22));
  const key=new T.DirectionalLight(0xffdaaa,2.55);
  key.position.set(-260,420,340); key.castShadow=true;
  Object.assign(key.shadow.camera,{left:-450,right:450,top:350,bottom:-350,near:1,far:1200});
  key.shadow.mapSize.set(2048,2048);key.shadow.normalBias=.4;scene.add(key);
  scene.add(new T.HemisphereLight(0xe4f5ff,0x795940,1.35));
  const rim=new T.DirectionalLight(0xa5d6ff,1.8);rim.position.set(140,180,-250);scene.add(rim);
  // Cross-section scenery: build each horizontal surface and each vertical soil face separately.
  const groundGeometry=new T.BufferGeometry();
  const groundVertices=new T.Float32BufferAttribute(new Float32Array(9*6*3),3);
  const surfaceKinds=new T.Float32BufferAttribute(new Float32Array(9*6),1);
  groundGeometry.setAttribute('position',groundVertices);
  groundGeometry.setAttribute('surfaceKind',surfaceKinds);
  [0,2,1,2,0,0,0,2,2].forEach((kind,face)=>{
    for(let n=0;n<6;n++)surfaceKinds.setX(face*6+n,kind);
  });
  const nightTurf={value:1};
  const fieldOrigin={value:0}, fieldUnit={value:1};
  const ballContact={value:new T.Vector3()};
  const turf=new T.MeshStandardMaterial({side:T.DoubleSide,roughness:.96,envMapIntensity:.15});
  turf.onBeforeCompile=shader=>{
    shader.uniforms.ballContact=ballContact;shader.uniforms.nightTurf=nightTurf;
    shader.uniforms.fieldOrigin=fieldOrigin;
    shader.uniforms.fieldUnit=fieldUnit;
    shader.vertexShader=shader.vertexShader.replace('#include <common>',
      '#include <common>\nattribute float surfaceKind;uniform float fieldOrigin, fieldUnit; varying vec2 fieldMetres;varying vec2 earthFace;varying float materialId;')
      .replace('#include <begin_vertex>',
        '#include <begin_vertex>\nfieldMetres=vec2((position.x-fieldOrigin)/fieldUnit,position.z/fieldUnit);earthFace=vec2(position.z+position.x,position.y)/fieldUnit;materialId=surfaceKind;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
      '#include <common>\nvarying vec2 fieldMetres;varying vec2 earthFace;varying float materialId; uniform vec3 ballContact;uniform float nightTurf;')
      .replace('#include <color_fragment>',`
        #include <color_fragment>
        vec2 q=fieldMetres;
        float footprint=max(fwidth(q.x),fwidth(q.y));
        float aa=max(.009,footprint*.65);
        float patches=.5+.23*sin(q.x*.39+sin(q.y*.66))+.17*cos(q.y*.52-q.x*.23);
        vec3 surface=mix(vec3(.052,.098,.038),vec3(.118,.159,.066),patches);
        if(materialId>.5 && materialId<1.5){
          surface=mix(vec3(.125,.078,.044),vec3(.23,.159,.087),patches);
        }else if(materialId>1.5){
          float strata=earthFace.y*14.+.7*sin(earthFace.x*2.7)+.4*cos(earthFace.x*4.9);
          surface=mix(vec3(.13,.077,.041),vec3(.27,.167,.088),.5+.35*sin(strata)+.15*cos(strata*2.4));
        }
        // Soft contact darkening narrows as the ball approaches the turf.
        vec2 separation=(q-vec2(ballContact.x,0.))/ballContact.z;
        float clearance=ballContact.y/ballContact.z;
        float penumbra=1.0+.30*clearance;
        float contactShade=exp(-dot(separation,separation)/(penumbra*penumbra));
        surface*=1.-.45*contactShade/(1.+clearance*.38);

        surface*=mix(1.,.36,nightTurf);
        float farField=smoothstep(22.,75.,length(q*vec2(.38,1.)));
        surface=mix(surface,mix(vec3(.18,.23,.21),vec3(.026,.042,.046),nightTurf),farField*.86);
        float fibre=fract(sin(dot(floor(q*19.),vec2(17.1,41.7)))*1483.3);
        surface*=1.+(fibre-.5)*.19*(1.-smoothstep(.02,.12,footprint));
        diffuseColor.rgb*=surface;
      `);
  };
  const ground=part(scene,groundGeometry,turf);
  ground.castShadow=false;
  ground.frustumCulled=false;
  function groundUnderWheels(size,datum,landingX){
    const wheelX=rig.position.x, contact=rig.position.y-1.118*size;
    fieldOrigin.value=wheelX; fieldUnit.value=size;
    const field=datum-ball.scale.x;
    const left=wheelX-3.25*size,right=wheelX+2.45*size;
    const below=ball.position.x>=left && ball.position.x<=right?contact:field;
    ballContact.value.set((ball.position.x-wheelX)/size,
      Math.max(0,ball.position.y-ball.scale.x-below)/size,ball.scale.x/size);
    const extent=Math.max(400,Math.abs(landingX-wheelX)/size+80)*size;
    const profile=[[wheelX-extent,field],[left,field],[left,contact],
      [right,contact],[right,field],[wheelX+extent,field]];
    let i=0;
    function quad(a,b,c,d){
      for(const point of [a,b,c,c,b,d])groundVertices.setXYZ(i++,...point);
    }
    const near=3.7*size,far=-6.4*size;
    for(let j=0;j<5;j++){
      const [a,b]=profile.slice(j,j+2);
      const z0=j===0 || j===4?-extent:far,z1=j===0 || j===4?extent:near;
      quad([...a,z0],[...a,z1],[...b,z0],[...b,z1]);
    }
    for(const [lo,hi] of [[-extent,far],[near,extent]])
      quad([left,field,lo],[left,field,hi],[right,field,lo],[right,field,hi]);
    for(const z of [far,near])
      quad([left,field,z],[left,contact,z],[right,field,z],[right,contact,z]);
    groundVertices.needsUpdate=true;
    groundGeometry.computeVertexNormals();
  }
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
  const orbit=new T.Group();
  orbit.rotation.order='YXZ';
  orbit.add(camera);
  scene.add(orbit);
  const track=new T.Line(new T.BufferGeometry(),new T.LineBasicMaterial());
  const vertices=new Float32Array(97*3);
  track.geometry.setAttribute('position',new T.BufferAttribute(vertices,3));
  track.frustumCulled=false;
  scene.add(track);
  function render({w,h,start,muzzleY,x,y,theta,size,view,flight,inset}){
    orbit.rotation.set(view.active?Math.min(-.10,view.pitch-.32):0,view.yaw,0,'YXZ');
    camera.zoom=view.zoom;
    track.visible=view.active;
    if(view.active){
      for(let i=0;i<97;i++){
        const t=flight.T*i/96;
        vertices[i*3]=start-w/2+flight.vx*t*size;
        vertices[i*3+1]=h/2-muzzleY+(flight.vy0*t-flight.g*t*t/2)*size;
      }
      track.geometry.attributes.position.needsUpdate=true;
      track.material.color.set(flight.color);
    }
    const ratio=Math.min(devicePixelRatio||1,2);
    if(w!==previousWidth || h!==previousHeight || ratio!==previousRatio){
      renderer.setPixelRatio(ratio);
      renderer.setSize(w,h,false);
      previousWidth=w; previousHeight=h; previousRatio=ratio;
    }
    camera.left=-w/2;camera.right=w/2;camera.top=h/2;camera.bottom=-h/2;camera.updateProjectionMatrix();
    // Oblique depth reveals the front rim and both wheels without skewing measured x or y.
    const projection=camera.projectionMatrix.elements;
    projection[8]=view.active?0:-.48*2/w*camera.zoom; projection[9]=view.active?0:-.12*2/h*camera.zoom;
    projection[12]=camera.position.z*projection[8];
    projection[13]=camera.position.z*projection[9];

    const angle=theta*Math.PI/180;
    barrel.rotation.z=angle;
    const mx=start-w/2,my=h/2-muzzleY;
    rig.scale.setScalar(size);
    rig.position.set(mx-1.86*Math.cos(angle)*size,my-1.86*Math.sin(angle)*size,0);
    ball.scale.setScalar(Math.max(4,.235*size));
    ball.position.set(x-w/2,h/2-y,0);
    nightTurf.value=document.documentElement.dataset.theme==="tech"?1:0;
    groundUnderWheels(size,my-flight.y0*size,mx+flight.vx*flight.T*size);
    updateLandscape(rig.position.x,my-flight.y0*size-ball.scale.x,size,document.documentElement.dataset.theme==="tech");
    if(view.active){
      // Frame the arc in the rotated camera's own plane, including its apex.
      scene.updateMatrixWorld(true);
      let left=Infinity,right=-Infinity,bottom=Infinity,top=-Infinity;
      const point=new T.Vector3();
      function include(x,y,z,margin){
        point.set(x,y,z).applyMatrix4(camera.matrixWorldInverse);
        left=Math.min(left,point.x-margin);right=Math.max(right,point.x+margin);
        bottom=Math.min(bottom,point.y-margin);top=Math.max(top,point.y+margin);
      }
      for(let i=0;i<=96;i++)include(vertices[3*i],vertices[3*i+1],0,ball.scale.x+3);
      include(rig.position.x,rig.position.y,0,size*2.3);
      const fit=Math.max((right-left)/(w*.90),(top-bottom)/(h*.86),.34);
      const cx=(left+right)/2,cy=(top+bottom)/2;
      camera.left=cx-w*fit*.5;camera.right=cx+w*fit*.5;
      camera.top=cy+h*fit*.5;camera.bottom=cy-h*fit*.5;
      camera.updateProjectionMatrix();
    }
    if(inset){
      const iw=inset.w, ih=inset.h;
      const radius=Math.min(32,ih*.095,iw*.08);
      const zoom=radius/ball.scale.x;
      const left=ball.position.x-iw*.42/zoom;
      portraitCamera.left=left;portraitCamera.right=left+iw/zoom;
      portraitCamera.top=ball.position.y+ih*.5/zoom;
      portraitCamera.bottom=portraitCamera.top-ih/zoom;
      portraitCamera.updateProjectionMatrix();
      const matrix=portraitCamera.projectionMatrix.elements;
      matrix[8]=-.48*2*zoom/iw;matrix[9]=-.12*2*zoom/ih;
      matrix[12]+=portraitCamera.position.z*matrix[8];matrix[13]+=portraitCamera.position.z*matrix[9];
      const showTrack=track.visible, showRig=rig.visible;
      track.visible=false;rig.visible=false;
      renderer.setViewport(0,0,iw,ih);renderer.setScissor(0,0,iw,ih);renderer.setScissorTest(true);
      renderer.render(scene,portraitCamera);
      const source=renderer.domElement;
      const sw=Math.floor(iw*ratio),sh=Math.floor(ih*ratio);
      inset.ctx.clearRect(0,0,iw,ih);
      inset.ctx.drawImage(source,0,source.height-sh,sw,sh,0,0,iw,ih);
      renderer.setScissorTest(false);renderer.setViewport(0,0,w,h);
      track.visible=showTrack;rig.visible=showRig;

    }
    renderer.render(scene,camera);
  };
  const portraitCamera=new T.OrthographicCamera(-1,1,1,-1,1,100000);
  portraitCamera.position.z=48000;
  render.cannonBounds=cannonBounds;
  return render;
}
