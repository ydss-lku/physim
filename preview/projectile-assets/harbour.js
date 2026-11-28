// Harbour coordinates use the same metres and datum as the island deck.
function createHarbour(T,scene){
  const district=new T.Group();scene.add(district);
  const batches=new Map(),pose=new T.Object3D();
  const steel=0x334f59,cladding=0x70868a,warm=0xaf7746,light=0xf2b479;
  function block(color,x,y,z,w,h,d,angle=0){
    pose.position.set(x,y,z);pose.rotation.set(0,angle,0);pose.scale.set(w,h,d);pose.updateMatrix();
    if(!batches.has(color))batches.set(color,[]);
    batches.get(color).push(pose.matrix.clone());
  }
  function beam(color,a,b,width){
    const start=new T.Vector3(...a),end=new T.Vector3(...b),axis=end.clone().sub(start);
    pose.position.copy(start).lerp(end,.5);pose.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),axis.clone().normalize());
    pose.scale.set(width,axis.length(),width);pose.updateMatrix();
    if(!batches.has(color))batches.set(color,[]);batches.get(color).push(pose.matrix.clone());
  }
  function quay(x,z,length){
    block(cladding,x,-15,z,length,2.2,13);
    block(warm,x,-14.05,z+6.6,length,.28,.25);
    for(let i=-length/2+4;i<length/2;i+=9){
      block(steel,x+i,-23,z-4,1,16,1);block(steel,x+i,-23,z+4,1,16,1);
      beam(steel,[x+i,-26,z+4],[x+i+7,-16,z+4],.55);
    }
  }
  function crane(x,z){
    for(const dx of [-2.8,2.8])for(const dz of [-2.4,2.4])
      beam(warm,[x+dx,-14,z+dz],[x+dx*.58,-2,z+dz*.65],.54);
    block(steel,x,-1.5,z,5.7,1.5,4.8);block(cladding,x-1,.3,z,3,2.3,3);
    for(const dz of [-.72,.72]){
      const line=z+dz;
      beam(warm,[x-5,1,line],[x+12,5,line],.35);
      beam(warm,[x-5,2.4,line],[x+12,6.4,line],.27);
      for(let i=0;i<6;i++)beam(steel,[x-5+i*2.8,1+i*.66,line],[x-2.2+i*2.8,3.06+i*.66,line],.16);
    }
    beam(steel,[x+10,5,z],[x+10,-4,z],.11);block(warm,x+10,-4,z,2,.4,.65);
  }
  // The reclaimed waterfront follows an inner basin; the city occupies the land behind it.
  const land=new T.MeshStandardMaterial({color:0x596460,roughness:.94,side:T.DoubleSide});
  function coastRadius(a){return 237+19*Math.sin(3*a+.4)+12*Math.cos(7*a);}
  const shore=[],faces=[];
  for(let i=0;i<=192;i++){
    const a=i*Math.PI/96,r=coastRadius(a),c=Math.cos(a),sn=Math.sin(a);
    for(const [radius,y] of [[r-2,-13],[r,-2.2],[r+5,-1.8],[1150,-1.8]])
      shore.push(82+c*radius,y,sn*radius);
    if(i)for(let k=0;k<3;k++){const n=i*4+k;faces.push(n-4,n,n-3,n,n+1,n-3);}
  }
  const bank=new T.BufferGeometry();bank.setAttribute('position',new T.Float32BufferAttribute(shore,3));bank.setIndex(faces);bank.computeVertexNormals();
  district.add(new T.Mesh(bank,land));
  // A continuous quay connects the rear of the flight deck to the western waterfront.
  block(0x565f5c,-122,-8,0,244,12,32);
  for(const z of [-16,16])block(cladding,-122,-2.25,z,244,.6,.9);
  function cargo(x,y,z,tint){
    block(tint,x,y,z,6.05,2.55,2.44);
    for(const side of [-1,1]){
      for(let j=0;j<11;j++)block(tint,x-2.7+j*.54,y,z+side*1.23,.09,2.28,.10);
      for(const dy of [-1.19,1.19])block(steel,x,y+dy,z+side*1.22,6.1,.10,.12);
      block(cladding,x+3.05,y,z+side*.67,.09,2.18,.08);
    }
  }
  function shed(x,z){
    block(0x596d70,x,2,z,22,8,12);
    for(const side of [-1,1]){
      for(let i=-9;i<=9;i+=3)block(steel,x+i,2,z+side*6.1,.24,8,.26);
      for(let i=-8;i<=8;i+=4)block(0x344951,x+i,1,z+side*6.08,3.5,5.8,.14);
      block(light,x,4.3,z+side*6.25,20,.14,.36);
      const roofCentre=new T.Vector3(x,6.9,z+side*3.1);
      pose.position.copy(roofCentre);pose.rotation.set(side*.27,0,0);pose.scale.set(23,.32,6.5);pose.updateMatrix();batches.get(steel).push(pose.matrix.clone());
    }
  }
  for(const x of [-46,-85,-130])shed(x,4);
  for(const [x,z,len] of [[15,-43,55],[116,-108,88],[144,120,94],[305,19,92],[-92,65,76]]){
    const startCounts=new Map([...batches].map(([k,v])=>[k,v.length]));
    quay(x,z,len);crane(x-12,z);
    for(let j=0;j<6;j++)cargo(x+3+(j%3)*6.3,-12.60,z-2+Math.floor(j/3)*2.7,[0x835948,0x476d72,0x69786a][j%3]);
    cargo(x+3,-10.05,z-2,0x526b7a);
    for(let i=-len/2+2;i<len/2;i+=6){
      block(0x293a40,x+i,-15.9,z+6.7,.85,2.9,.58);
      block(warm,x+i,-13.62,z+5.7,.54,.52,.54);
    }
    for(const [color,list] of batches)for(let j=startCounts.get(color)||0;j<list.length;j++)list[j].elements[13]+=10;
  }
  // A moored harbour tug gives the retaining wall and cargo apron a waterline reference.
  function tug(x,z){
    const sides=[],idx=[];
    for(const [along,beam] of [[-8,1.6],[-6,2.65],[3,2.7],[6,2],[8,.16]]){
      for(const [lateral,height] of [[-beam*.72,-7.6],[-beam,-5.4],[-beam*.95,-4.85],[beam*.95,-4.85],[beam,-5.4],[beam*.72,-7.6]])sides.push(x+along,height,z+lateral);
    }
    for(let i=1;i<5;i++)for(let j=0;j<5;j++){const n=i*6+j;idx.push(n-6,n,n-5,n,n+1,n-5);}
    idx.push(0,1,2,0,2,3,0,3,4,0,4,5);
    const hull=new T.BufferGeometry();hull.setAttribute('position',new T.Float32BufferAttribute(sides,3));hull.setIndex(idx);hull.computeVertexNormals();
    district.add(new T.Mesh(hull,new T.MeshStandardMaterial({color:0x31444b,roughness:.62,side:T.DoubleSide})));
    block(cladding,x-1,-3.95,z,6,1.8,3.8);block(0x21414c,x-.4,-2.55,z,3.9,1.25,3.4);
    block(0xd8b78c,x-.4,-1.87,z,4.4,.19,3.8);block(warm,x-3.5,-2.7,z,1.1,2.4,1.2);
    for(const side of [-1,1])for(let i=-6;i<=4;i+=2)block(steel,x+i,-5.48,z+side*2.62,.85,.89,.42);
    beam(cladding,[x,-1.8,z],[x,.5,z],.12);
  }
  tug(14,-53);tug(-62,20);
  for(let i=0;i<90;i++){
    const a=i*2.39996,r=coastRadius(a)+25+(i%7)*19,x=82+Math.cos(a)*r,z=Math.sin(a)*r;
    const w=6+(i*7%13),h=12+(i*17%45),base=-1.8;
    block(0x48585d,x,base+1.1,z,w+4,2.2,w*.76+4);
    block(cladding,x,base+h/2+2,z,w,h,w*.76);
    block(steel,x,base+h+2.5,z,w*.72,2,w*.60);
    for(let y=base+5;y<base+h;y+=3.4)block(i%5?steel:light,x,y,z,w*1.02,.32,w*.78);
  }
  for(const [color,matrices] of batches){
    const mat=new T.MeshStandardMaterial({color,roughness:.68,metalness:.33});
    const mesh=new T.InstancedMesh(new T.BoxGeometry(),mat,matrices.length);
    mat.onBeforeCompile=shader=>{
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 yardUV;')
        .replace('#include <begin_vertex>','#include <begin_vertex>\nyardUV=(instanceMatrix*vec4(position,1.)).xyz;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 yardUV;')
        .replace('#include <color_fragment>',`#include <color_fragment>
          vec3 q=yardUV;
          float ribs=sin((q.x+q.z)*15.);
          float wear=.5+.5*sin(q.z*1.7+sin(q.x*1.1))*sin(q.x*.91+q.y*.63);
          diffuseColor.rgb*=.65+.19*wear+.16*ribs*(1.-smoothstep(.05,.33,fwidth(q.x+q.z)));`);
    };
    matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));district.add(mesh);
  }
  // Break up reflections into bands of wind ripples, anchored to harbour metres.
  const water=new T.MeshStandardMaterial({color:0xffffff,roughness:.44,metalness:.22});
  water.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 waterPoint;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nwaterPoint=position.xy;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 waterPoint;')
      .replace('#include <color_fragment>',`#include <color_fragment>
        vec2 q=waterPoint;
        float drift=sin(q.x*.18+q.y*.11)+.57*sin(q.x*.41-q.y*.27);
        float swell=sin(q.y*1.68+drift*2.+sin(q.x*.07));
        float ripple=sin(q.y*5.2+drift*3.+sin(q.x*.61));
        float glint=smoothstep(.46,1.54,swell+.55*ripple)*(1.-smoothstep(.12,.95,fwidth(q.y)));
        float lane=.5+.5*sin(q.x*.12+q.y*.034+sin(q.y*.09));
        diffuseColor.rgb=mix(vec3(.013,.055,.073),vec3(.054,.137,.147),.5+.5*drift/1.57)
          +glint*mix(vec3(.073,.15,.165),vec3(.25,.145,.064),pow(lane,5.));`); 
  };
  const sea=new T.Mesh(new T.CircleGeometry(1300,96),water);
  sea.rotation.x=-Math.PI/2;sea.position.y=-6.6;district.add(sea);
  const skies=['day','dusk'].map(mood=>{
    const tex=new T.TextureLoader().load('preview/projectile-assets/harbour-sphere-'+mood+'.webp');
    tex.mapping=T.EquirectangularReflectionMapping;tex.colorSpace=T.SRGBColorSpace;return tex;
  });
  scene.fog=new T.FogExp2(0x789299,.003);
  return function place(x,y,size,night){
    district.position.set(x,y,0);district.scale.setScalar(size);
    scene.fog.density=.0032/size;scene.fog.color.setHex(night?0x66818c:0xa0b0ae);
    scene.background=skies[night?1:0];
  };
}
