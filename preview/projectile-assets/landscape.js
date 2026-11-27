// Scenic flats at distinct depths. The painted horizon is independent of the flight scale.
function createFlightLandscape(T,scene){
  const palettes={
    paper:['#a4bbc4','#8da6a9','#768f91','#80978a','#708879','#637b72','#4a685a','#3b584b','#536d57'],
    tech:['#344952','#30444c','#2f4249','#293e42','#263c3d','#243738','#203535','#1b3030','#263c38']
  };
  const layers=[];
  const textures=new Map();
  function paint(layer,palette){
    const canvas=document.createElement('canvas');
    canvas.width=2048;canvas.height=512;
    const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
    let seed=725+layer;
    function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
    function polygon(points,color){
      c.fillStyle=color;c.beginPath();
      points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
      c.closePath();c.fill();
    }
    function ridge(base,amplitude,frequency,color){
      const points=[];
      for(let x=-12;x<=w+12;x+=12){
        const y=base+amplitude*(.55*Math.sin(x*frequency)+.32*Math.sin(x*frequency*2.7+1)+.13*Math.cos(x*frequency*5.1))+random()*3;
        points.push([x,y]);
      }
      polygon([...points,[w+12,h],[-12,h]],color);
      return points;
    }
    if(layer===0){
      const points=ridge(147,69,.009,palette[0]);
      for(let i=2;i<points.length-3;i++){
        const [x,y]=points[i];
        if(y<points[i-1][1] && y<points[i+1][1]){
          polygon([[x,y+1],[x+7,y+16],[x+4,y+23],[x+28,y+44],[x+52,y+64],[x+16,y+50]],palette[1]);
        }
      }
      ridge(219,44,.011,palette[1]);
    }else if(layer===1){
      const line=ridge(257,34,.013,palette[3]);
      for(const [x,y] of line){
        for(let j=0;j<3;j++){
          const height=3+random()*9, cx=x+random()*11;
          polygon([[cx-height*.31,y+3],[cx,y-height],[cx+height*.31,y+3]],palette[3]);
        }
      }
      ridge(306,23,.008,palette[4]);
    }else{
      const landY=x=>337+15*Math.sin(x*.012)+8*Math.cos(x*.019);
      const points=Array.from({length:258},(_,i)=>[(i-1)*8,landY((i-1)*8)]);
      polygon([...points,[w+8,h],[-8,h]],palette[5]);
      function pine(x,height){
        const y=landY(x)+3;
        c.fillStyle=palette[7];c.fillRect(x-height*.023,y-height*.85,height*.046,height*.88);
        for(let k=0;k<6;k++){
          const width=height*(.045+.028*k), top=y-height+height*k*.106;
          polygon([[x,top],[x-width*.7,top+height*.15],[x-width,top+height*.22],[x-width*.38,top+height*.195],[x,top+height*.235],[x+width,top+height*.20],[x+width*.49,top+height*.115]],k%2?palette[6]:palette[7]);
        }
      }
      for(let x=12;x<w;x+=16+random()*34){
        const cluster=(1+Math.cos(x*.021))/2;
        if(random()<cluster*.85)pine(x,22+cluster*48*random());
      }
      for(let i=0;i<150;i++){
        const x=random()*w,y=landY(x)+12+random()*130;
        polygon([[x,y],[x+7,y-1],[x+17,y],[x+5,y+1]],palette[8]);
      }
    }
    const texture=new T.CanvasTexture(canvas);
    texture.colorSpace=T.SRGBColorSpace;
    return texture;
  }
  for(let layer=0;layer<3;layer++){
    const material=new T.MeshBasicMaterial({transparent:true,depthWrite:false,toneMapped:false,side:T.DoubleSide});
    const mesh=new T.Mesh(new T.PlaneGeometry(1,1),material);
    mesh.renderOrder=-10+layer;
    scene.add(mesh);layers.push(mesh);
  }
  let currentTheme;
  return function update(w,h,originX,originY,scale){
    const theme=document.documentElement.dataset.theme==='tech'?'tech':'paper';
    if(theme!==currentTheme){
      if(!textures.has(theme))textures.set(theme,layers.map((_,i)=>paint(i,palettes[theme])));
      layers.forEach((mesh,i)=>{mesh.material.map=textures.get(theme)[i];mesh.material.needsUpdate=true;});
      currentTheme=theme;
    }
    layers.forEach((mesh,i)=>{
      const depth=-w*(.75-i*.15);
      const height=h*(1.02+.08*i)+Math.min(scale,100)*(.10+.04*i);
      mesh.scale.set(Math.max(w*3.3,height*4),height,1);
      mesh.position.set(.48*depth+originX*(.05+i*.045),.28*depth-h*.22+originY*(.04+i*.03),depth);
    });
  };
}
