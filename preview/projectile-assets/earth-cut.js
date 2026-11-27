// Local terrain coordinates are independent of the camera zoom.
function createEarthCut(T,scene){
  const root=new T.Group();
  scene.add(root);
  let seed=41829;
  function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  const slices=104;
  const outline=[];
  for(let i=0;i<slices;i++){
    const a=i/slices*Math.PI*2;
    const rough=.11*Math.sin(3*a+.7)+.065*Math.sin(7*a)+.04*Math.sin(13*a)+.027*(random()-.5);
    outline.push({x:-.35+(3.5+rough)*Math.cos(a)*(1+.13*Math.sin(2*a)),
      z:-1.1+(5.3+rough*2)*Math.sin(a),a,chip:random()});
  }
  const positions=[],weights=[],offsets=[],kinds=[],indices=[];
  // From the level floor out across broken earth, roots, an overhanging sod lip, and turf.
  const rings=[[.001,0,0,1],[.70,0,0,1],[.83,.06,.1,1],[.90,.19,.3,2],
    [.93,.41,.5,2],[.97,.68,.7,2],[.99,.86,.5,2],[1.008,.96,.25,3],
    [.995,1,.15,3],[1.055,1,.12,0],[1.3,1,.04,0],[2,1,0,0],[160,1,0,0]];
  rings.forEach(([r,weight,jitter,kind],row)=>{
    outline.forEach((point,i)=>{
      const d=(random()-.5)*jitter*.23;
      const x=-.35+(point.x+.35)*(r+d),z=-1.1+(point.z+1.1)*(r+d);
      const offset=(random()-.5)*jitter*.30+(row===8?.07*point.chip:0);
      positions.push(x,offset,z);weights.push(weight);offsets.push(offset);kinds.push(kind);
      if(row){const j=row*slices+i,k=row*slices+(i+1)%slices;indices.push(j-slices,k-slices,j,k-slices,k,j);}
    });
  });
  for(let i=1;i<slices-1;i++)indices.push(0,i+1,i);
  const geo=new T.BufferGeometry();
  const pos=new T.Float32BufferAttribute(positions,3);
  geo.setAttribute('position',pos);geo.setAttribute('kind',new T.Float32BufferAttribute(kinds,1));geo.setIndex(indices);
  const darkness={value:0},shadow={value:new T.Vector3()};
  const mat=new T.MeshStandardMaterial({side:T.DoubleSide,roughness:1,envMapIntensity:.16});
  mat.onBeforeCompile=s=>{
    s.uniforms.darkness=darkness;s.uniforms.ballShadow=shadow;
    s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute float kind;varying float soilKind;varying vec3 soilPos;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nsoilKind=kind;soilPos=position;');
    s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
      varying vec3 soilPos;varying float soilKind;uniform float darkness;uniform vec3 ballShadow;
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
      diffuseColor.rgb*=earth*mix(1.,.64,darkness);`)
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
  for(let j=0;j<2700;j++){
    const i=Math.floor(random()*slices),a=outline[i],b=outline[(i+1)%slices],u=random();
    const r=j<1550?1.025+.055*random():1.12+random()**2*4;
    const x=-.35+((1-u)*a.x+u*b.x+.35)*r,z=-1.1+((1-u)*a.z+u*b.z+1.1)*r;
    for(let k=0;k<5;k++){
      const phi=random()*Math.PI*2,h=.045+random()**2*.15,w=.009+random()*.011;
      const px=x+(random()-.5)*.095,pz=z+(random()-.5)*.095;
      const dx=w*Math.cos(phi),dz=w*Math.sin(phi),bend=.24*h;
      blades.push(px-dx,0,pz-dz,px+dx,0,pz+dz,px+bend*Math.sin(phi),h,pz+bend*Math.cos(phi));
      const col=greens[Math.floor(random()*greens.length)];
      for(const factor of [.46,.66,1])bladeColors.push(col.r*factor,col.g*factor,col.b*factor);
    }
  }
  const bg=new T.BufferGeometry();bg.setAttribute('position',new T.Float32BufferAttribute(blades,3));bg.setAttribute('color',new T.Float32BufferAttribute(bladeColors,3));
  const grass=new T.Mesh(bg,new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide}));root.add(grass);
  const toe=new T.Group();root.add(toe);
  const stones=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),new T.MeshStandardMaterial({color:0x76654e,roughness:1,envMapIntensity:.1}),220);
  const item=new T.Object3D();for(let i=0;i<stones.count;i++){
    const a=outline[Math.floor(random()*slices)],r=.64+.17*random(),k=.026+random()**3*.105;
    item.position.set(-.35+(a.x+.35)*r,k*.29,-1.1+(a.z+1.1)*r);item.rotation.set(random(),random()*6,random());
    item.scale.set(k*1.6,k*.72,k);item.updateMatrix();stones.setMatrixAt(i,item.matrix);
    stones.setColorAt(i,new T.Color().setHSL(.074+random()*.035,.12+random()*.15,.12+random()*.10));
  }
  toe.add(stones);stones.castShadow=true;stones.receiveShadow=true;
  // Short branching root ends hang immediately below the broken sod.
  const roots=[];
  for(let j=0;j<215;j++){
    const a=outline[Math.floor(random()*slices)],x=a.x,z=a.z,h=.045+random()**2*.23;
    const mx=x+(random()-.5)*.07,mz=z+(random()-.5)*.07;
    roots.push(x,.018,z,mx,-h*.55,mz,mx,-h*.55,mz,mx+.02,-h,mz+.025);
  }
  const rg=new T.BufferGeometry();rg.setAttribute('position',new T.Float32BufferAttribute(roots,3));
  const rootlets=new T.LineSegments(rg,new T.LineBasicMaterial({color:0x655039}));root.add(rootlets);
  let previousDepth=NaN;
  return function update(size,field,contact,wheelX,ball,night){
    const depth=(contact-field)/size;
    root.position.set(wheelX,field,0);root.scale.setScalar(size);toe.position.y=depth;
    if(Math.abs(depth-previousDepth)>.001 || !Number.isFinite(previousDepth)){
      for(let i=0;i<pos.count;i++)pos.setY(i,depth*(1-weights[i])+offsets[i]);
      pos.needsUpdate=true;geo.computeVertexNormals();geo.computeBoundingSphere();previousDepth=depth;
    }
    darkness.value=night;grass.material.color.setScalar(night?.73:1);
    shadow.value.set((ball.position.x-wheelX)/size,Math.max(0,(ball.position.y-field)/ball.scale.x-1),ball.scale.x/size);
  };
}
