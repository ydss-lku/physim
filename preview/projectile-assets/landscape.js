// Continuous mountain silhouettes and a low stadium bowl surround the field on every side.
function createFlightLandscape(T,root){
  const stone=new T.MeshStandardMaterial({color:0x26323a,roughness:.82});
  const seat=new T.MeshStandardMaterial({color:0x263338,roughness:.68});
  const trim=new T.MeshStandardMaterial({color:0x535f60,metalness:.65,roughness:.39});
  function ring(radius,height,outer,outerHeight,material){
    const a=[],idx=[];
    for(let i=0;i<=240;i++){
      const t=Math.PI*2*i/240;
      const x=28+Math.cos(t)*86,z=Math.sin(t)*35;
      for(const [r,y] of [[radius,height],[outer,outerHeight]])a.push(x+r*Math.cos(t),y,z+r*Math.sin(t));
      if(i<240){const n=2*i;idx.push(n,n+1,n+2,n+1,n+3,n+2);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(a,3));
    g.setIndex(idx);g.computeVertexNormals();material.side=T.DoubleSide;
    root.add(new T.Mesh(g,material));
  }
  for(let i=0;i<9;i++){
    const r=14+i*.9,y=.32+i*.39;
    ring(r,y,r+.88,y,seat);ring(r+.88,y,r+.90,y+.39,stone);
  }
  ring(22,3.9,22.7,3.94,trim);
  const mountains=[];
  for(let layer=0;layer<2;layer++){
    const a=[],idx=[];
    for(let i=0;i<=360;i++){
      const t=2*Math.PI*i/360, r=135+layer*63;
      const crest=9+layer*9+4*Math.sin(5*t+.7*layer)+2.8*Math.cos(12*t)+1.4*Math.sin(29*t+layer)+.7*Math.cos(67*t);
      for(const [dr,y] of [[-10,-3],[0,crest*.54],[7,crest],[15,crest-4]]){
        a.push(28+(r+dr)*Math.cos(t),y,(r+dr)*Math.sin(t));
      }
      if(i<360)for(let j=0;j<3;j++){const n=4*i+j;idx.push(n,n+1,n+4,n+1,n+5,n+4);}
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(a,3));geo.setIndex(idx);geo.computeVertexNormals();
    const mat=new T.MeshLambertMaterial({side:T.DoubleSide});
    root.add(new T.Mesh(geo,mat));mountains.push(mat);
  }
  return function place(x,y,scale,night){
    root.position.set(x,y,0);root.scale.setScalar(scale);
    mountains[0].color.setHex(night?0x263541:0x718e98);
    mountains[1].color.setHex(night?0x394956:0xa3b6bd);
  };
}
