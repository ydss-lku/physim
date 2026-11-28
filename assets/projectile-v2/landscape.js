// Distant ridges surround the level field.
function createFlightLandscape(T,root){
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
