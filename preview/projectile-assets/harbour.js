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
  // A service bridge meets the underside of the launch end; the wharf sits below its sightline.
  quay(-27,-13,32);block(steel,-11,-6,-4,19,1.1,3.1);
  for(const z of [-5.3,-2.7])beam(cladding,[-20,-13,z],[-5,-6,z],.54);
  for(const [x,z,len] of [[15,-43,55],[116,-108,88],[144,120,94],[305,19,92],[-92,65,76]]){
    quay(x,z,len);crane(x-12,z);
    for(let i=0;i<8;i++)block(i%3===0?warm:steel,x+4+(i%4)*5.4,-12.7,z-3+Math.floor(i/4)*3,5,2.5,2.6);
  }
  for(let i=0;i<90;i++){
    const a=i*2.39996,r=275+(i%7)*22,x=82+Math.cos(a)*r,z=Math.sin(a)*r;
    const w=6+(i*7%13),h=15+(i*17%48);
    block(cladding,x,-33+h/2,z,w,h,w*.76);
    block(steel,x,-33+h,z,w*.74,3,w*.62);
    for(let y=-21;y<h-34;y+=5)block(i%4?steel:light,x,y,z,w*1.04,.48,w*.8);
  }
  for(const [color,matrices] of batches){
    const mat=new T.MeshStandardMaterial({color,roughness:.68,metalness:.33});
    const mesh=new T.InstancedMesh(new T.BoxGeometry(),mat,matrices.length);
    matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));district.add(mesh);
  }
  const sea=new T.Mesh(new T.CircleGeometry(1300,96),new T.MeshStandardMaterial({color:0x456e78,roughness:.38,metalness:.48}));
  sea.rotation.x=-Math.PI/2;sea.position.y=-32;district.add(sea);
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
