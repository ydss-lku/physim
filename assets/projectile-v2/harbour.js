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
    for(const dx of [-2.8,2.8])for(const dz of [-2.4,2.4]){
      block(0x384650,x+dx,-13.75,z+dz,1.55,.40,1.16);
      block(cladding,x+dx,-13.40,z+dz,1.12,.28,.94);
    }
    block(steel,x,-1.5,z,5.7,1.5,4.8);block(cladding,x-1,.3,z,3,2.3,3);
    for(const dz of [-.72,.72]){
      const line=z+dz;
      beam(warm,[x-5,1,line],[x+12,5,line],.35);
      beam(warm,[x-5,2.4,line],[x+12,6.4,line],.27);
      for(let i=0;i<6;i++)beam(steel,[x-5+i*2.8,1+i*.66,line],[x-2.2+i*2.8,3.06+i*.66,line],.16);
    }
    // Enclosed operator cab, slanted glazing, service platform and access ladder.
    block(0x24464e,x+.72,.72,z+1.64,2.9,1.85,1.3);
    block(0xc5aa85,x+.72,1.74,z+1.64,3.35,.20,1.65);
    block(warm,x+.72,-.24,z+1.64,3.1,.35,1.4);
    for(const dx of [-.9,0,.9])block(cladding,x+.72+dx,.87,z+2.33,.08,1.18,.09);
    block(steel,x-1.7,-.4,z+2.55,4.3,.24,1.15);
    beam(warm,[x-3.8,.65,z+3],[x+.45,.65,z+3],.10);
    for(let j=0;j<5;j++)block(warm,x-3.8+j,-.02,z+3,.085,1.32,.085);
    for(const dx of [-.32,.32])beam(steel,[x-2.3+dx,-13.8,z+2.55],[x-2.3+dx,-.4,z+2.55],.092);
    for(let y=-13.4;y<-.4;y+=.48)block(cladding,x-2.3,y,z+2.55,.71,.078,.09);
    beam(steel,[x-4.8,2.3,z],[x-1,6.5,z],.36);
    beam(steel,[x-1,6.5,z],[x+11,5.4,z],.16);
    block(0x657b7c,x-4.6,1.9,z,2.7,1.7,2.55);
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
  // Layered headlands rise from the reclaimed shoreline behind the town.
  const ridgePoints=[],ridgeIndices=[],ridgeTones=[];
  for(let ring=0;ring<6;ring++)for(let i=0;i<=256;i++){
    const a=i*Math.PI/128,rad=328+ring*52+18*Math.sin(a*5+.6*ring);
    const crest=Math.pow(.5+.5*Math.cos(3*a+.8*Math.sin(7*a)),1.45);
    const profile=[0,.33,.70,1,.64,.23][ring];
    const high=(14+46*crest+7*Math.sin(a*17)+3*Math.cos(a*31))*profile;
    ridgePoints.push(82+Math.cos(a)*rad,-2+high,Math.sin(a)*rad);
    const shade=new T.Color().setHSL(.526,.13,.255+.12*profile+.026*Math.sin(a*17));
    ridgeTones.push(shade.r,shade.g,shade.b);
    if(ring && i){const n=ring*257+i;ridgeIndices.push(n-258,n-1,n,n-258,n,n-257);}
  }
  const ridge=new T.BufferGeometry();
  ridge.setAttribute('position',new T.Float32BufferAttribute(ridgePoints,3));
  ridge.setAttribute('color',new T.Float32BufferAttribute(ridgeTones,3));
  ridge.setIndex(ridgeIndices);ridge.computeVertexNormals();
  district.add(new T.Mesh(ridge,new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide})));
  // A continuous quay connects the rear of the flight deck to the western waterfront.
  block(0x565f5c,-125,-8,0,238,12,32);
  for(const z of [-16,16])block(cladding,-125,-2.25,z,238,.6,.9);
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
  function span(a,b,width,height){
    const start=new T.Vector3(...a),end=new T.Vector3(...b);
    const direction=end.clone().sub(start),length=direction.length();
    const side=new T.Vector3(-direction.z,0,direction.x).normalize();
    function at(t,lateral,up){
      const v=start.clone().lerp(end,t).addScaledVector(side,lateral);
      return [v.x,v.y+up,v.z];
    }
    const bays=Math.ceil(length/5);
    for(const edge of [-width/2,width/2]){
      beam(steel,at(0,edge,0),at(1,edge,0),.27);
      beam(cladding,at(0,edge,height),at(1,edge,height),.19);
      for(let i=0;i<bays;i++){
        beam(steel,at(i/bays,edge,i%2?height:0),at((i+1)/bays,edge,i%2?0:height),.16);
      }
    }
    for(let i=0;i<=bays;i++)beam(steel,at(i/bays,-width/2,0),at(i/bays,width/2,0),.2);
  }
  for(const x of [-86,-130])shed(x,4);
  // Open-sided fitting bay. The yard rails pass along its loading face.
  for(const x of [-59,-52,-45,-38]){
    for(const z of [1,12])block(steel,x,1.4,z,.37,6.8,.37);
    beam(cladding,[x,4.8,.8],[x,6,6.5],.32);
    beam(cladding,[x,6,6.5],[x,4.8,12.2],.32);
  }
  for(const z of [3.55,9.45]){
    pose.position.set(-48.5,5.42,z);pose.rotation.set(z<6?-.2:.2,0,0);
    pose.scale.set(23,.19,6.2);pose.updateMatrix();batches.get(steel).push(pose.matrix.clone());
  }
  for(const z of [-7.2,-5.4])block(steel,-70,-1.92,z,111,.13,.13);
  for(let x=-124;x<-15;x+=2.2)block(0x534d45,x,-1.995,-6.3,.27,.12,2.75);
  for(const x of [-35,-31])for(const z of [-7.2,-5.4])block(steel,x,-1.62,z,.77,.53,.35);
  block(warm,-33,-1.21,-6.3,6,.37,2.9);
  for(const x of [-54,-44])block(0x635641,x,-1.65,4,1,.7,4);
  span([-56,-1.25,4],[-42,-1.25,4],2.9,1.65);
  // The diagonal approach links the rail yard to the crane berth.
  const approachA=[-47,-2.05,-14],approachB=[-10,-3.95,-43];
  span(approachA,approachB,4.5,1.7);
  for(let i=0;i<46;i++){
    const t=(i+.5)/46;
    block(cladding,-47+37*t,-2.05-1.9*t,-14-29*t,1.09,.20,4.55,Math.atan2(29,37));
    if(i%10===5)block(steel,-47+37*t,-7.7,-14-29*t,.70,10,.70);
  }
  for(const [x,z,len] of [[15,-43,55],[-101,21,53]]){
    const startCounts=new Map([...batches].map(([k,v])=>[k,v.length]));
    quay(x,z,len);
    for(let j=0;j<3;j++){
      const bx=x-len*.38+j*len*.38;
      block(0x34434a,bx,-13.83,z+5.3,1.18,.19,.86);
      block(0xb48652,bx,-13.51,z+5.3,.52,.60,.53);
      block(0xb4946c,bx,-13.24,z+5.3,.95,.19,.65);
    }
if(z<0)crane(x-12,z);
    for(let dx=-len/2+1;dx<len/2;dx+=2.6)block(0x485e60,x+dx,-16.1,z+6.42,.49,3.7,.34);
    for(let j=0;j<(z<0?6:2);j++)cargo(x+3+(j%3)*6.3,-12.60,z-2+Math.floor(j/3)*2.7,[0x835948,0x476d72,0x69786a][j%3]);
    if(z<0)cargo(x+3,-10.05,z-2,0x526b7a);
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
  tug(10,-32);tug(-101,31);
  for(let i=0;i<72;i++){
    const cluster=Math.floor(i/12),slot=i%12;
    const a=cluster*1.04+.06*(slot%4)+.022*Math.sin(i*4);
    const r=coastRadius(a)+28+Math.floor(slot/4)*32;
    const x=82+Math.cos(a)*r,z=Math.sin(a)*r;
    const w=8+(i*7%11),h=(slot<4?6:18)+(i*17%(slot<4?6:34)),base=-1.8;
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
          float mask=1.-smoothstep(.035,.25,fwidth(q.x+q.z));
          diffuseColor.rgb*=.83+.13*wear+.048*ribs*mask;`);
    };
    matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.castShadow=true;mesh.receiveShadow=true;district.add(mesh);
  }
  // Break up reflections into bands of wind ripples, anchored to harbour metres.
  const water=new T.ShaderMaterial({
    uniforms:{time:{value:0},dusk:{value:0}},
    vertexShader:`varying vec2 metres;varying vec3 eye;
      void main(){vec4 world=modelMatrix*vec4(position,1.);metres=position.xy;eye=cameraPosition-world.xyz;
        gl_Position=projectionMatrix*viewMatrix*world;}`,
    fragmentShader:`varying vec2 metres;varying vec3 eye;uniform float time,dusk;
      float waveHash(vec2 p){vec3 q=fract(p.xyx*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
      float waveNoise(vec2 p){vec2 i=floor(p),u=fract(p);u=u*u*(3.-2.*u);
        return mix(mix(waveHash(i),waveHash(i+vec2(1,0)),u.x),mix(waveHash(i+vec2(0,1)),waveHash(i+1.),u.x),u.y);}
      void main(){
        vec2 p=metres;float t=time;
        float bend=waveNoise(p*.091+vec2(t*.027,0.));
        vec2 q=vec2(p.x*.41+p.y*.11,p.y*1.37-p.x*.18)+vec2(bend*3.,t*.32);
        float detail=1.-smoothstep(.07,.75,length(fwidth(p)));
        float a=waveNoise(q)-.5,b=waveNoise(q*2.35+vec2(t*.09,0.))-.5;
        float c=waveNoise(q*.39+3.)-.5;
        vec3 n=normalize(vec3(.085*c+.07*a,1.,.17*c+.16*a+.09*b*detail));
        vec3 v=normalize(eye),r=reflect(-v,n);
        float fres=pow(1.-max(.0,dot(v,n)),3.);
        float current=.5+.5*sin(p.x*.085+p.y*.046+.9*bend);
        vec3 deep=mix(vec3(.018,.092,.106),vec3(.036,.14,.145),current);
        vec3 horizon=mix(vec3(.34,.48,.51),vec3(.37,.40,.46),dusk);
        vec3 reflection=mix(horizon,vec3(.105,.245,.34),smoothstep(.02,.75,r.y));
        vec3 sun=normalize(vec3(-.61,.34,-.72));
        float lobe=max(.0,dot(r,sun));
        vec3 col=mix(deep,reflection,.16+.57*fres)+vec3(1.,.62,.32)*(.09*pow(lobe,24.)+.56*pow(lobe,200.));
        gl_FragColor=vec4(col,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const sea=new T.Mesh(new T.CircleGeometry(1300,96),water);
  sea.rotation.x=-Math.PI/2;sea.position.y=-6.6;district.add(sea);
  const skies=['day','dusk'].map(mood=>{
    const tex=new T.TextureLoader().load('assets/projectile-v2/harbour-light-'+mood+'.webp');
    tex.mapping=T.EquirectangularReflectionMapping;tex.colorSpace=T.SRGBColorSpace;return tex;
  });
  scene.fog=new T.FogExp2(0x789299,.003);
  return function place(x,y,size,night){
    water.uniforms.time.value=performance.now()*.001;water.uniforms.dusk.value=night?1:0;
    district.position.set(x,y,0);district.scale.setScalar(size);
    scene.fog.density=.00225/size;scene.fog.color.setHex(night?0x909da5:0xa8b9bd);
    scene.background=skies[night?1:0];
  };
}
