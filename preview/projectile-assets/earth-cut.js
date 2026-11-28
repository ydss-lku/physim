// Local terrain coordinates are independent of the camera zoom.
function createEarthCut(T,scene){
  const root=new T.Group();
  scene.add(root);
  let seed=41829;
  function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  // The two arms meet beside the launch point and remain open toward negative x.
  function edgeX(z){
    return 3.05-.43*(Math.sqrt(z*z+6.)-2.45)+.78*Math.sin(z*.46)+.25*Math.sin(z*1.17)+.09*Math.sin(z*2.8);
  }
  const originalHalfAngle=Math.atan(.85);
  const halfAngle=originalHalfAngle*.70;
  const sectorSlope=Math.tan(halfAngle);
  const halfWidth=185*Math.sin(halfAngle)/Math.sin(originalHalfAngle);
  const zs=[];
  for(let i=-150;i<=150;i++)zs.push(i*.22);

  // Keep the fine bank mesh near the carriage. The distant field needs fewer cross sections.
  for(let z=35;z<halfWidth;z+=2){zs.unshift(-z);zs.push(z);}
  zs.unshift(-halfWidth);zs.push(halfWidth);
  const positions=[],weights=[],offsets=[],kinds=[],indices=[];
  const rows=[[-720,0,0,1],[-3,0,0,1],[-1.2,0,0,1],[-.91,.07,.09,1],
    [-.62,.23,.14,2],[-.29,.51,.16,2],[-.12,.80,.10,2],[.035,.96,.06,3],
    [.13,1,.03,3],[.30,1,.02,0],[1,1,0,0],[510,1,0,0]];
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
  const loader=new T.TextureLoader();
  function surface(name){
    const map=loader.load('preview/projectile-assets/'+name+'.webp');
    map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=4;
    return {value:map};
  }
  const meadow=surface('meadow'),bank=surface('bank');
  const mat=new T.MeshStandardMaterial({side:T.DoubleSide,roughness:1,envMapIntensity:.16});
  mat.onBeforeCompile=s=>{
    s.uniforms.meadow=meadow;s.uniforms.bank=bank;s.uniforms.marks=marks;s.uniforms.darkness=darkness;s.uniforms.ballShadow=shadow;
    s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute float kind;varying float soilKind;varying vec3 soilPos;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nsoilKind=kind;soilPos=position;');
    s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
      uniform sampler2D meadow,bank;varying vec3 soilPos;varying float soilKind;uniform float darkness;uniform vec3 ballShadow;uniform vec3 marks;
      float earthHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
      float soilNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(mix(earthHash(i),earthHash(i+vec3(1,0,0)),f.x),mix(earthHash(i+vec3(0,1,0)),earthHash(i+vec3(1,1,0)),f.x),f.y),
          mix(mix(earthHash(i+vec3(0,0,1)),earthHash(i+vec3(1,0,1)),f.x),mix(earthHash(i+vec3(0,1,1)),earthHash(i+vec3(1)),f.x),f.y),f.z);}
      `).replace('#include <color_fragment>',`#include <color_fragment>
      vec3 p=soilPos;
      float broad=soilNoise(p*1.4), crumb=soilNoise(p*12.+broad), fine=soilNoise(p*52.);
      vec2 uv=p.xz;
      float meadowVariation=soilNoise(vec3(uv*.24,2.));
      mat2 turn=mat2(.8,.6,-.6,.8);
      vec4 turf=mix(texture2D(meadow,uv*.42),texture2D(meadow,turn*uv*.27+.37),smoothstep(.23,.77,meadowVariation));
      vec3 face=abs(normalize(cross(dFdx(p),dFdy(p))));
      vec2 cutUV=vec2(p.z+.28*p.x,p.y+.16*p.x);
      vec4 clay=mix(texture2D(bank,cutUV*.83),texture2D(bank,uv*.64),smoothstep(.42,.83,face.y));
      vec3 grass=pow(turf.rgb,vec3(1.83))*vec3(.60,1.16,.88)*(.83+.36*meadowVariation);
      vec3 loam=pow(clay.rgb,vec3(1.63))*vec3(1.18,.95,.82);
      grass*=.82+.36*turf.a;loam*=.75+.50*clay.a;
      float worn=1.-smoothstep(3.,10.,length(uv*vec2(.85,.7))+3.*(meadowVariation-.5));
      float soil=smoothstep(.18,.9,soilKind)*max(worn,smoothstep(1.,1.75,soilKind));
      vec2 deck=vec2(p.z,-p.x);
      vec2 plateUV=vec2(deck.x/5.4+mod(floor(deck.y/2.7),2.)*.5,deck.y/2.7);
      vec2 border=.5-abs(fract(plateUV)-.5);
      float gap=min(border.x*5.4,border.y*2.7);
      float seamAA=max(.012,fwidth(gap));
      float plate=smoothstep(.015,.015+seamAA,gap);
      float tile=earthHash(vec3(floor(plateUV),.5));
      vec3 steel=mix(vec3(.055,.087,.106),vec3(.145,.195,.205),tile*.55+crumb*.45);
      vec3 earth=mix(vec3(.019,.027,.034),steel,plate);
      earth=mix(earth,mix(vec3(.058,.067,.077),vec3(.18,.20,.21),clay.r),soil*.77);
      float lane=abs(abs(p.z)-1.85);
      float dash=1.-smoothstep(.55,.61,fract((p.x+p.z*.55)*.68));
      float paint=(1.-smoothstep(.06,.06+fwidth(lane),lane))*dash*(1.-smoothstep(2.,5.,abs(p.x)));
      earth=mix(earth,vec3(.76,.39,.035),paint*.9);
      float resolution=1.-smoothstep(.008,.05,length(fwidth(p)));
      earth*=1.+(fine-.5)*.42*resolution;
      float dist=length(p.xz-vec2(ballShadow.x,0.))/max(.01,ballShadow.z);
      earth*=1.-.33*exp(-dist*dist/(1.+ballShadow.y*.5))/(1.+ballShadow.y*.38);
      vec2 radial=p.xz-vec2(marks.x,0.);
      float radius=length(radial), band=floor(radius/10.+.5)*10.;
      float aa=max(fwidth(radius),.025);
      float major=1.-step(1.,mod(band,20.));
      float stroke=1.-smoothstep(.045+.03*major,.045+.03*major+aa,abs(radius-band));
      // Rounded launch end joins two straight sector sidelines.
      float side=radial.x < -1.8 ? length(radial+vec2(1.8,0.))-2.5 : (abs(radial.y)-2.5-${sectorSlope}*(radial.x+1.8))*${Math.cos(halfAngle)};
      float edgeAA=max(.018,fwidth(side));
      float sector=1.-smoothstep(-edgeAA,edgeAA,side);
      earth*=mix(.84,1.,sector);
      float rim=1.-smoothstep(.028,.028+edgeAA,abs(side));
      float rimBed=1.-smoothstep(.12,.12+edgeAA,abs(side));
      float pigment=.80+.17*crumb;
      earth=mix(earth,vec3(.026,.045,.055),rimBed*.80);
      earth=mix(earth,vec3(.89,.39,.055),rim*pigment);
      float age=marks.y-band/max(.00001,marks.z);
      float reveal=smoothstep(0.,.65,age)*step(10.,band)*step(.01,radial.x);
      earth*=mix(1.,.64,darkness);
      float inkMask=sector*reveal*(1.-smoothstep(.05,.20,soilKind));
      float groove=1.-smoothstep(.11+.04*major,.11+.04*major+aa,abs(radius-band));
      earth=mix(earth,vec3(.018,.048,.059),groove*inkMask*.82);
      vec3 enamel=mix(vec3(.11,.50,.52),vec3(.20,.73,.69),major);
      earth=mix(earth,enamel,stroke*inkMask*pigment);
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
  const grass=new T.Mesh(bg,new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide}));grass.visible=false;root.add(grass);
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
  stones.visible=false;toe.add(stones);stones.castShadow=true;stones.receiveShadow=true;
  // Short branching root ends hang immediately below the broken sod.
  const roots=[];
  for(let j=0;j<215;j++){
    const z=(random()-.5)*38,x=edgeX(z),h=.045+random()**2*.23;
    const mx=x+(random()-.5)*.07,mz=z+(random()-.5)*.07;
    roots.push(x,.018,z,mx,-h*.55,mz,mx,-h*.55,mz,mx+.02,-h,mz+.025);
  }
  const rg=new T.BufferGeometry();rg.setAttribute('position',new T.Float32BufferAttribute(roots,3));
  const rootlets=new T.LineSegments(rg,new T.LineBasicMaterial({color:0x655039}));rootlets.visible=false;root.add(rootlets);
  const pedestal=new T.Mesh(new T.BoxGeometry(3.35,1,2.1),new T.MeshStandardMaterial({color:0x384852,roughness:1}));
  pedestal.castShadow=true;pedestal.receiveShadow=true;root.add(pedestal);
  const labels=[];
  function makeLabel(radius){
    const canvas=document.createElement('canvas');
    canvas.width=512;canvas.height=128;
    const ctx=canvas.getContext('2d');
    ctx.font='600 96px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.lineJoin='round';ctx.lineWidth=8;ctx.strokeStyle='#15383f';
    ctx.strokeText(radius+' m',256,67);
    ctx.fillStyle=radius%20===0?'#93eadb':'#80d8d3';ctx.fillText(radius+' m',256,67);
    const map=new T.CanvasTexture(canvas);map.anisotropy=4;map.colorSpace=T.SRGBColorSpace;
    // Lay the lettering on a narrow annular strip, following the paint on the turf.
    const height=1.22*Math.min(3.1,1.35+radius*.024),width=height*4;
    // Centre the inscription on the sector bisector.
    const coords=[],uv=[],indices=[];
    for(let j=0;j<=16;j++){
      const u=j/16,t=(u-.5)*width/radius;
      for(let v=0;v<=1;v++){
        const r=radius+.16+v*height;
        coords.push(r*Math.cos(t),.012,r*Math.sin(t));uv.push(u,v);
      }
      if(j){const n=2*j;indices.push(n-2,n-1,n,n,n-1,n+1);}
    }
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(coords,3));
    geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);
    const label=new T.Mesh(geometry,new T.MeshBasicMaterial({map,transparent:true,
      depthWrite:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,toneMapped:false}));
    root.add(label);return label;
  }
  function leftEdge(z,origin){
    const az=Math.abs(z);
    return origin-9+(Math.hypot(az,7)-7)/sectorSlope+1.2*Math.sin(z*.44)+.55*Math.sin(z*1.37);
  }
  function rightEdge(z,origin){
    return origin+Math.sqrt(280*280-z*z)+2.8*Math.sin(z*.17);
  }
  // Both sides of the turf mesh provide the exact upper seam for the rock shell.
  const rim=[];
  for(let i=0;i<zs.length;i++)rim.push(i);
  for(let row=1;row<rows.length;row++)rim.push((row+1)*zs.length-1);
  for(let i=zs.length-2;i>=0;i--)rim.push((rows.length-1)*zs.length+i);
  for(let row=rows.length-2;row>0;row--)rim.push(row*zs.length);
  const cliffGeometry=new T.BufferGeometry(),cliffPoints=[],cliffColors=[],cliffUV=[];
  const levels=[[0,0,0x70838a],[.065,.004,0x35444f],[.12,.004,0x2ca7a0],[.16,.018,0x202e39],[.28,.018,0x74838a],[.33,.056,0x23303a],[.67,.17,0x52606c],[.82,.23,0x263038],[1,.47,0x393e49]];
  const rock=new T.MeshStandardMaterial({vertexColors:true,metalness:.54,roughness:.52,flatShading:true,side:T.DoubleSide});
  const cliff=new T.Mesh(cliffGeometry,rock);root.add(cliff);cliff.receiveShadow=true;
  function buildCliff(){
    cliffPoints.length=cliffColors.length=cliffUV.length=0;
    function vertex(index,level){
      const j=rim[index%rim.length],x=pos.getX(j),z=pos.getZ(j);
      const [drop,inset,tint]=levels[level];
      const seam=Math.sin(x*.49+z*.52)+.48*Math.sin(x*1.14-z*.7);
      const depth=7+4*Math.cos(z*.21+x*.08)+4*(1+Math.sin(x*.14-z*.31));
      const shift=inset*(1+.18*seam);
      const xx=x+(86-x)*shift,zz=z*(1-shift);
      const yy=pos.getY(j)-drop*depth;
      cliffPoints.push(xx,yy,zz);
      const color=new T.Color(tint).multiplyScalar(1.8+.22*seam);
      cliffColors.push(color.r,color.g,color.b);
      cliffUV.push((xx*.71+zz*.53)*.37,yy*.37);
    }
    for(let i=0;i<rim.length;i++){
      for(let k=1;k<levels.length;k++){
        vertex(i,k-1);vertex(i+1,k);vertex(i+1,k-1);
        vertex(i,k-1);vertex(i,k);vertex(i+1,k);
      }
      vertex(i,levels.length-1);vertex(i+1,levels.length-1);
      cliffPoints.push(86,-22,0);cliffColors.push(.18,.16,.15);cliffUV.push(0,0);
    }
    for(const [key,data,n] of [['position',cliffPoints,3],['color',cliffColors,3],['uv',cliffUV,2]])cliffGeometry.setAttribute(key,new T.Float32BufferAttribute(data,n));
    cliffGeometry.computeVertexNormals();cliffGeometry.computeBoundingSphere();
  }
  function trimDetails(geometry,coords,stride,origin){
    const kept=[];
    for(let i=0;i<coords.length;i+=stride){
      if(coords[i]<leftEdge(coords[i+2],origin)+.12)continue;
      for(let j=0;j<stride/3;j++)kept.push(i/3+j);
    }
    geometry.setIndex(kept);
  }
  const placement=stones.instanceMatrix.array.slice(),tints=stones.instanceColor.array.slice();
  function trimDecoration(origin){
    trimDetails(bg,blades,27,origin);trimDetails(rg,roots,12,origin);
    let count=0;
    for(let j=0;j<placement.length;j+=16){
      if(placement[j+12]<leftEdge(placement[j+14],origin)+.3)continue;
      stones.instanceMatrix.array.set(placement.subarray(j,j+16),count*16);
      const c=j/16*3;
      stones.instanceColor.array.set(tints.subarray(c,c+3),count++*3);
    }
    stones.count=count;stones.instanceMatrix.needsUpdate=true;stones.instanceColor.needsUpdate=true;
    stones.computeBoundingSphere();
  }
  let previousDepth=NaN,previousOrigin=NaN;
  return function update(size,field,contact,wheelX,ball,night,originX,time,vx){
    const wheelLevel=(contact-field)/size;
    const depth=Math.min(-.35,wheelLevel);
    const rise=wheelLevel-depth;
    pedestal.visible=rise>.001;pedestal.scale.y=Math.max(.001,rise);
    pedestal.position.set(-.65,depth+rise/2,0);
    marks.value.set((originX-wheelX)/size,time,vx);
    const reached=Math.floor(time*vx/10);
    while(labels.length<reached)labels.push(makeLabel((labels.length+1)*10));
    labels.forEach((label,index)=>{
      const radius=(index+1)*10;
      label.visible=index<reached;
      if(!label.visible)return;
      const fade=Math.min(1,Math.max(0,(time-radius/vx)/.65));
      label.material.opacity=fade*fade*(3-2*fade);
      label.position.x=marks.value.x;
    });
    root.position.set(wheelX,field,0);root.scale.setScalar(size);toe.position.y=depth;
    const origin=marks.value.x;
    const moved=!Number.isFinite(previousOrigin)||Math.abs(origin-previousOrigin)>.0001;
    if(moved)trimDecoration(origin);
    if(moved||Math.abs(depth-previousDepth)>.001){
      for(let i=0;i<zs.length;i++){
        const boundary=leftEdge(zs[i],origin);
        let rimHeight=depth;
        for(let row=0;row<rows.length;row++){
          const j=row*zs.length+i,x=positions[j*3],y=depth*(1-weights[j])+offsets[j];
          if(row && positions[(j-zs.length)*3]<boundary && x>=boundary){
            const k=j-zs.length,px=positions[k*3],py=depth*(1-weights[k])+offsets[k];
            rimHeight=py+(y-py)*(boundary-px)/(x-px);
            for(let n=i;n<j;n+=zs.length)pos.setY(n,rimHeight);
          }
          pos.setX(j,Math.min(rightEdge(zs[i],origin),Math.max(boundary,x)));pos.setY(j,y);
        }
      }
      pos.needsUpdate=true;geo.computeVertexNormals();geo.computeBoundingSphere();
      buildCliff();previousOrigin=origin;previousDepth=depth;
    }
    darkness.value=night;grass.material.color.setScalar(night?.73:1);
    shadow.value.set((ball.position.x-wheelX)/size,Math.max(0,(ball.position.y-field)/ball.scale.x-1),ball.scale.x/size);
  };
}
