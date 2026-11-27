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
  // Two level surfaces meet at a retaining face. Neither surface tilts toward the landing point.
  // The flat terrace spans both wheel tracks, including their front and rear edges.
  const groundGeometry=new T.BufferGeometry();
  const faceColors=[],indices=[];
  const bands=[0xffffff,0xffffff,0x665442];
  const columns=6, rows=4;
  const groundVertices=new Float32Array(columns*rows*3);
  for(let row=0;row<rows;row++){
    const tint=new T.Color(bands[Math.min(row,2)]);
    for(let col=0;col<columns;col++){
      faceColors.push(tint.r,tint.g,tint.b);
      if(row<rows-1 && col<columns-1){
        const i=row*columns+col;
        indices.push(i,i+columns,i+1,i+1,i+columns,i+columns+1);
      }
    }
  }
  groundGeometry.setIndex(indices);
  groundGeometry.setAttribute('position',new T.BufferAttribute(groundVertices,3));
  groundGeometry.setAttribute('color',new T.Float32BufferAttribute(faceColors,3));
  const fieldOrigin={value:0}, fieldUnit={value:1};
  const turf=new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide});
  turf.onBeforeCompile=shader=>{
    shader.uniforms.fieldOrigin=fieldOrigin;
    shader.uniforms.fieldUnit=fieldUnit;
    shader.vertexShader=shader.vertexShader.replace('#include <common>',
      '#include <common>\nuniform float fieldOrigin, fieldUnit; varying vec2 fieldMetres;')
      .replace('#include <begin_vertex>',
        '#include <begin_vertex>\nfieldMetres=vec2((position.x-fieldOrigin)/fieldUnit,position.z/fieldUnit);');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
      '#include <common>\nvarying vec2 fieldMetres;')
      .replace('#include <color_fragment>',`
        #include <color_fragment>
        vec2 q=fieldMetres;
        float footprint=max(fwidth(q.x),fwidth(q.y));
        float aa=max(.009,footprint*.65);
        // Alternating mowing passes, a red synthetic runway and painted sector markings.
        float stripe=smoothstep(-.09,.09,sin(q.x*.57));
        vec3 lawn=mix(vec3(.052,.216,.073),vec3(.083,.28,.094),stripe);
        float grain=fract(sin(dot(floor(q*85.),vec2(37.1,91.7)))*1738.3);
        lawn*=1.+(grain-.5)*.11*(1.-smoothstep(.004,.02,footprint));
        float endLine=1.8-.045*q.y*q.y;
        float lane=(1.-smoothstep(endLine-aa,endLine+aa,q.x))*(1.-smoothstep(2.5-aa,2.5+aa,abs(q.y)));
        vec3 surface=mix(lawn,vec3(.37,.082,.05),lane);
        float side=abs(abs(q.y)-2.44);
        float arc=abs(q.x-endLine);
        float paint=max((1.-smoothstep(.025,.025+aa,side))*step(q.x,endLine),
                        (1.-smoothstep(.045,.045+aa,arc))*step(abs(q.y),2.48));
        float spread=2.44+.34*max(0.,q.x-1.3);
        float boundary=abs(abs(q.y)-spread);
        paint=max(paint,(1.-smoothstep(.035,.035+aa,boundary))*step(1.3,q.x));
        float radius=length(vec2(q.x+4.,q.y));
        float distanceArc=abs(mod(radius+5.,10.)-5.);
        paint=max(paint,(1.-smoothstep(.04,.04+aa,distanceArc))*step(2.,q.x)*step(abs(q.y),spread));
        surface=mix(surface,vec3(.84,.87,.77),paint);

        float area=abs(dFdx(q.x)*dFdy(q.y)-dFdy(q.x)*dFdx(q.y));
        diffuseColor.rgb*=mix(vec3(.37,.29,.17),surface,step(.00000001,area));
      `);
  };
  const ground=part(scene,groundGeometry,turf);
  ground.castShadow=false;
  ground.frustumCulled=false;
  function groundUnderWheels(size,datum,landingX){
    const wheelX=rig.position.x, contact=rig.position.y-1.118*size;
    fieldOrigin.value=wheelX; fieldUnit.value=size;
    const field=datum-ball.scale.x;
    const edge=wheelX+(field>contact?4.2:1.12)*size;
    const xs=[wheelX-4000,wheelX-2.5*size,edge,edge,edge+size,Math.max(edge,landingX)+4000];
    // A constant depth keeps the long field edges parallel to the horizontal x axis.
    const back=-7*size, front=3.2*size;
    for(let col=0;col<columns;col++){
      const top=col<3?contact:field;
      for(let row=0;row<rows;row++){
        const i=3*(row*columns+col);
        groundVertices[i]=xs[col];
        groundVertices[i+1]=top-(row===2?.16*size:row===3?Math.max(2200,Math.abs(contact-field)+size):0);
        groundVertices[i+2]=row===0?back:front;
      }
    }
    groundGeometry.attributes.position.needsUpdate=true;
    groundGeometry.computeVertexNormals();
  }
  let previousWidth=0, previousHeight=0, previousRatio=0;
  let cachedAngle, bounds;
  function cannonBounds(theta){
    if(theta===cachedAngle) return bounds;
    const angle=theta*Math.PI/180;
    barrel.rotation.z=angle;
    rig.position.set(-1.48*Math.cos(angle),-1.48*Math.sin(angle),0);
    rig.scale.setScalar(1);
    rig.updateMatrixWorld(true);
    bounds={left:Infinity,right:-Infinity,bottom:Infinity,top:-Infinity};
    const point=new T.Vector3();
    rig.traverse(mesh=>{
      if(!mesh.isMesh)return;
      const vertices=mesh.geometry.attributes.position;
      for(let i=0;i<vertices.count;i++){
        point.fromBufferAttribute(vertices,i).applyMatrix4(mesh.matrixWorld);
        const x=point.x-.48*point.z, y=point.y-.28*point.z;
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
    orbit.rotation.set(0,view.yaw,0,'YXZ');
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
    projection[8]=-.48*2/w*camera.zoom; projection[9]=-.28*2/h*camera.zoom;
    projection[12]=camera.position.z*projection[8];
    projection[13]=camera.position.z*projection[9];

    const angle=theta*Math.PI/180;
    barrel.rotation.z=angle;
    const mx=start-w/2,my=h/2-muzzleY;
    rig.scale.setScalar(size);
    rig.position.set(mx-1.48*Math.cos(angle)*size,my-1.48*Math.sin(angle)*size,0);
    ball.scale.setScalar(Math.max(4,.235*size));
    ball.position.set(x-w/2,h/2-y,0);
    groundUnderWheels(size,my-flight.y0*size,mx+flight.vx*flight.T*size);
    updateLandscape(w,h,mx,my,size);
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
      matrix[8]=-.48*2*zoom/iw;matrix[9]=-.28*2*zoom/ih;
      matrix[12]+=900*matrix[8];matrix[13]+=900*matrix[9];
      // Keep distant hills in the shot with weaker parallax than the nearby turf.
      updateLandscape(iw/zoom,ih/zoom,mx-ball.position.x,my-ball.position.y,size);
      const offsetX=left+iw*.5/zoom;
      landscapeGroup.position.set(offsetX,ball.position.y,0);
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
      landscapeGroup.position.set(0,0,0);
      updateLandscape(w,h,mx,my,size);
    }
    renderer.render(scene,camera);
  };
  const portraitCamera=new T.OrthographicCamera(-1,1,1,-1,1,2000);
  portraitCamera.position.z=900;
  render.cannonBounds=cannonBounds;
  return render;
}
