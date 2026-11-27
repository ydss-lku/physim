// Local terrain coordinates are independent of the camera zoom.
function createEarthCut(T,scene){
  const root=new T.Group();
  scene.add(root);
  let seed=41829;
  function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  // The two arms meet beside the launch point and remain open toward negative x.
  function edgeX(z){
    return 3.05-.50*Math.abs(z)+.11*Math.sin(z*1.4)+.045*Math.sin(z*4.6);
  }
  const zs=[-640,-320,-160,-80];
  for(let i=-200;i<=200;i++)zs.push(i*.22);
  zs.push(80,160,320,640);
  const positions=[],weights=[],offsets=[],kinds=[],indices=[];
  const rows=[[-720,0,0,1],[-3,0,0,1],[-1.2,0,0,1],[-.66,.07,.06,1],
    [-.43,.23,.12,2],[-.29,.51,.16,2],[-.12,.80,.10,2],[.035,.96,.06,3],
    [0,1,.03,3],[.30,1,.02,0],[1,1,0,0],[720,1,0,0]];
  rows.forEach(([delta,weight,jitter,kind],row)=>{
    zs.forEach((z,i)=>{
      const offset=(random()-.5)*jitter;
      positions.push(edgeX(z)+delta+(random()-.5)*jitter,offset,z);
      weights.push(weight);offsets.push(offset);kinds.push(kind);
      if(row && i){const j=row*zs.length+i,k=j-zs.length;indices.push(k-1,k,j-1,k,j,j-1);}
    });
  });
  const geo=new T.BufferGeometry();
  const pos=new T.Float32BufferAttribute(positions,3);
  geo.setAttribute('position',pos);geo.setAttribute('kind',new T.Float32BufferAttribute(kinds,1));geo.setIndex(indices);
  const darkness={value:0},shadow={value:new T.Vector3()};
  const marks={value:new T.Vector3()};
  const mat=new T.MeshStandardMaterial({side:T.DoubleSide,roughness:1,envMapIntensity:.16});
  mat.onBeforeCompile=s=>{
    s.uniforms.marks=marks;s.uniforms.darkness=darkness;s.uniforms.ballShadow=shadow;
    s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute float kind;varying float soilKind;varying vec3 soilPos;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nsoilKind=kind;soilPos=position;');
    s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
      varying vec3 soilPos;varying float soilKind;uniform float darkness;uniform vec3 ballShadow;uniform vec3 marks;
      float earthHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
      float soilNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(mix(earthHash(i),earthHash(i+vec3(1,0,0)),f.x),mix(earthHash(i+vec3(0,1,0)),earthHash(i+vec3(1,1,0)),f.x),f.y),
          mix(mix(earthHash(i+vec3(0,0,1)),earthHash(i+vec3(1,0,1)),f.x),mix(earthHash(i+vec3(0,1,1)),earthHash(i+vec3(1)),f.x),f.y),f.z);}
      `).replace('#include <color_fragment>',`#include <color_fragment>
      vec3 p=soilPos;
      float broad=soilNoise(p*1.4), crumb=soilNoise(p*12.+broad), fine=soilNoise(p*52.);
      vec3 grass=mix(vec3(.034,.056,.018),vec3(.14,.19,.058),broad*.55+crumb*.45);
      vec3 loam=mix(vec3(.061,.032,.018),vec3(.255,.156,.079),.45*broad+.55*crumb);
      float seam=soilNoise(vec3(p.x*1.3,p.y*8.+2.*broad,p.z*1.3));
      loam*=.69+.52*seam;
      loam=mix(loam,vec3(.19,.142,.098),smoothstep(.70,.89,crumb)*.42);
      vec3 earth=mix(grass,loam,smoothstep(.18,.9,soilKind));
      earth*=1.-.35*smoothstep(2.3,2.96,soilKind);
      float resolution=1.-smoothstep(.008,.05,length(fwidth(p)));
      earth*=1.+(fine-.5)*.42*resolution;
      float dist=length(p.xz-vec2(ballShadow.x,0.))/max(.01,ballShadow.z);
      earth*=1.-.33*exp(-dist*dist/(1.+ballShadow.y*.5))/(1.+ballShadow.y*.38);
      vec2 radial=p.xz-vec2(marks.x,0.);
      float radius=length(radial), band=floor(radius/10.+.5)*10.;
      float aa=max(fwidth(radius),.025);
      float stroke=1.-smoothstep(.05,.05+aa,abs(radius-band));
      float sector=1.-smoothstep(.53,.55,abs(radial.y)/max(.01,radial.x));
      float age=marks.y-band/max(.00001,marks.z);
      float reveal=smoothstep(0.,.35,age)*step(10.,band)*step(.01,radial.x);
      earth*=mix(1.,.64,darkness);
      earth=mix(earth,vec3(.86,.89,.80),stroke*sector*reveal*(1.-smoothstep(.05,.20,soilKind)));
      diffuseColor.rgb*=earth;`)
      .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      vec3 ex=dFdx(vViewPosition),ey=dFdy(vViewPosition);
      vec3 east=cross(ey,normal),north=cross(normal,ex);
      float det=dot(ex,east);
      float relief=(crumb*.014+fine*.003)*max(.12,resolution);
      vec3 slope=dFdx(relief)*east+dFdy(relief)*north;
      normal=normalize(normal+clamp(slope*sign(det)/max(abs(det),.00001),vec3(-.19),vec3(.19)));
      `);
  };
  const earth=new T.Mesh(geo,mat);earth.receiveShadow=true;earth.castShadow=true;root.add(earth);
  // Clumps of blades with curved tips break the grass silhouette from side views.
  const blades=[],bladeColors=[];
  const greens=[0x657745,0x84905a,0x526538,0x939063].map(c=>new T.Color(c));
  for(let j=0;j<750;j++){
    const z0=(random()-.5)*95,x0=edgeX(z0)+.11+random()**3*13;
    const abundance=random()**2,spread=.07+.53*random(),height=.036+.22*random()**1.6;
    const count=2+Math.floor(52*abundance);
    for(let k=0;k<count;k++){
      const z=z0+(random()-.5)*spread*2,x=x0+(random()-.5)*spread*2;
      if(x<edgeX(z)+.06)continue;
      const phi=random()*6.283,h=height*(.48+random()),w=.005+.008*random();
      const dx=w*Math.cos(phi),dz=w*Math.sin(phi),lean=h*(.20+.42*random());
      const mx=x+lean*.32,mz=z+lean*.19,tx=x+lean, tz=z+lean*Math.sin(phi);
      blades.push(x-dx,0,z-dz,x+dx,0,z+dz,mx+dx*.55,h*.56,mz+dz*.55,
        x-dx,0,z-dz,mx+dx*.55,h*.56,mz+dz*.55,mx-dx*.55,h*.56,mz-dz*.55,
        mx-dx*.55,h*.56,mz-dz*.55,mx+dx*.55,h*.56,mz+dz*.55,tx,h,tz);
      const col=greens[Math.floor(random()*greens.length)];
      for(const factor of [.48,.48,.8,.48,.8,.8,.8,.8,1])bladeColors.push(col.r*factor,col.g*factor,col.b*factor);
    }
  }
  const bg=new T.BufferGeometry();bg.setAttribute('position',new T.Float32BufferAttribute(blades,3));bg.setAttribute('color',new T.Float32BufferAttribute(bladeColors,3));
  const grass=new T.Mesh(bg,new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide}));root.add(grass);
  const toe=new T.Group();root.add(toe);
  const stones=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),new T.MeshStandardMaterial({color:0x76654e,roughness:1,envMapIntensity:.1}),220);
  const item=new T.Object3D();for(let i=0;i<stones.count;i++){
    const z=(random()-.5)*32,k=.03+random()**2*.13;
    item.position.set(edgeX(z)-1.25-random()**2*2.2,-k*.025,z);
    item.rotation.set((random()-.5)*.10,random()*6,(random()-.5)*.10);
    item.scale.set(k*(1.2+random()),k*(.17+.09*random()),k*(.55+.4*random()));
    item.updateMatrix();stones.setMatrixAt(i,item.matrix);
    stones.setColorAt(i,new T.Color().setHSL(.082+random()*.035,.10+random()*.13,.28+random()*.16));
  }
  toe.add(stones);stones.castShadow=true;stones.receiveShadow=true;
  // Short branching root ends hang immediately below the broken sod.
  const roots=[];
  for(let j=0;j<215;j++){
    const z=(random()-.5)*38,x=edgeX(z),h=.045+random()**2*.23;
    const mx=x+(random()-.5)*.07,mz=z+(random()-.5)*.07;
    roots.push(x,.018,z,mx,-h*.55,mz,mx,-h*.55,mz,mx+.02,-h,mz+.025);
  }
  const rg=new T.BufferGeometry();rg.setAttribute('position',new T.Float32BufferAttribute(roots,3));
  const rootlets=new T.LineSegments(rg,new T.LineBasicMaterial({color:0x655039}));root.add(rootlets);
  const pedestal=new T.Mesh(new T.BoxGeometry(3.35,1,2.1),new T.MeshStandardMaterial({color:0x746550,roughness:1}));
  pedestal.castShadow=true;pedestal.receiveShadow=true;root.add(pedestal);
  let previousDepth=NaN;
  return function update(size,field,contact,wheelX,ball,night,originX,time,vx){
    const wheelLevel=(contact-field)/size;
    const depth=Math.min(-.35,wheelLevel);
    const rise=wheelLevel-depth;
    pedestal.visible=rise>.001;pedestal.scale.y=Math.max(.001,rise);
    pedestal.position.set(-.65,depth+rise/2,0);
    marks.value.set((originX-wheelX)/size,time,vx);
    root.position.set(wheelX,field,0);root.scale.setScalar(size);toe.position.y=depth;
    if(Math.abs(depth-previousDepth)>.001 || !Number.isFinite(previousDepth)){
      for(let i=0;i<pos.count;i++)pos.setY(i,depth*(1-weights[i])+offsets[i]);
      pos.needsUpdate=true;geo.computeVertexNormals();geo.computeBoundingSphere();previousDepth=depth;
    }
    darkness.value=night;grass.material.color.setScalar(night?.73:1);
    shadow.value.set((ball.position.x-wheelX)/size,Math.max(0,(ball.position.y-field)/ball.scale.x-1),ball.scale.x/size);
  };
}
