/* Procedural turbine assemblies. Both machines turn about their local z axis. */
function turbineMachine(T,scene,wind){
  const material=(color,metalness=.55,roughness=.31)=>new T.MeshStandardMaterial({color,metalness,roughness,side:T.DoubleSide});
  const alloy=material(0xc1cdd0),polish=material(0xdde3e1,.90,.16),graphite=material(0x36434b),teal=material(0x276774,.36),
    white=material(0xf2f0df,.25,.32),copper=material(0xba6834,.79,.27),brass=material(0xc6a364,.72),oxide=material(0xca653d,.34);
  function group(parent){const obj=new T.Group();parent.add(obj);return obj}
  function mesh(parent,geo,mat,x=0,y=0,z=0){const obj=new T.Mesh(geo,mat);obj.position.set(x,y,z);parent.add(obj);return obj}
  function cylinder(p,m,x,y,z,top,bottom,h,axis='z',sides=48){
    const o=mesh(p,new T.CylinderGeometry(top,bottom,h,sides),m,x,y,z);
    if(axis==='z')o.rotation.x=Math.PI/2;if(axis==='x')o.rotation.z=-Math.PI/2;return o
  }
  function ring(p,m,x,y,z,r,t){return mesh(p,new T.TorusGeometry(r,t,8,64),m,x,y,z)}
  function block(p,m,x,y,z,w,h,d){const c=Math.min(.06,h/5,w/5),s=new T.Shape();
    [[-w/2+c,-h/2],[w/2-c,-h/2],[w/2,-h/2+c],[w/2,h/2-c],[w/2-c,h/2],[-w/2+c,h/2],[-w/2,h/2-c],[-w/2,-h/2+c]].forEach(([a,b],i)=>i?s.lineTo(a,b):s.moveTo(a,b));s.closePath();
    return mesh(p,new T.ExtrudeGeometry(s,{depth:d,bevelSize:c*.35,bevelThickness:c*.35,bevelSegments:2}),m,x,y,z-d/2)}
  function bolts(p,x,y,z,r,n,size){for(let i=0;i<n;i++){const a=i*2*Math.PI/n;cylinder(p,polish,x+r*Math.cos(a),y+r*Math.sin(a),z,size,size,size*.85,'z',6)}}
  function generator(parent,r,length){
    const g=group(parent),rotating=group(g);
    cylinder(g,graphite,0,0,-length/2,r*.92,r*.92,length);
    for(let i=0;i<14;i++){const a=2*Math.PI*i/14;const rib=block(g,teal,r*.94*Math.cos(a),r*.94*Math.sin(a),-length/2,.10*r,.28*r,length*.83);rib.rotation.z=a+Math.PI/2}
    for(const z of [-length,0]){cylinder(g,alloy,0,0,z,r,r,.06);ring(g,polish,0,0,z+.035,r*.91,.025);bolts(g,0,0,z+.05,r*.83,10,.045*r)}
    cylinder(rotating,polish,0,0,.19,r*.19,r*.19,.4);
    return {g,rotating}
  }
  const machine=group(scene),rotor=group(machine),flow=group(machine);
  let radiusGroup,cover,innerRotor,jet,jetTraces,flowTurns,waterSpray;
  if(wind){
    // Direct-drive nacelle with a longitudinal cutaway and an annular generator.
    cylinder(machine,alloy,0,-1.7,-.43,.15,.27,3.46,'y');
    cylinder(machine,graphite,0,-3.44,-.43,.47,.49,.10,'y');
    for(let n=0;n<10;n++){const a=n*2*Math.PI/10;cylinder(machine,polish,.35*Math.cos(a),-3.36,-.43+.35*Math.sin(a),.033,.033,.07,'y',6)}
    for(const y of [-2.45,-1.24,-.17])cylinder(machine,polish,0,y,-.43,.225-(y+2.45)*.027,.23-(y+2.45)*.027,.045,'y');
    block(machine,graphite,0,-.17,-.44,.70,.12,1.52);
    cover=group(machine);block(cover,white,0,.105,-.45,.90,.87,1.45);
    for(let i=0;i<7;i++)block(cover,graphite,.458,.13,-.55-i*.073,.009,.19,.025);
    block(cover,teal,0,.08,-1.19,.79,.72,.025);
    block(cover,alloy,0,.56,-.55,.48,.028,.63);
    for(const x of [-.18,.18])for(const z of [-.78,-.35])cylinder(cover,graphite,x,.588,z,.018,.018,.018,'y',6);
    cylinder(cover,polish,0,.65,-.97,.017,.022,.23,'y');cylinder(cover,graphite,0,.785,-.97,.05,.05,.045,'y');
    for(let i=0;i<3;i++){const a=i*Math.PI*2/3;const sphere=mesh(cover,new T.SphereGeometry(.052,12,8),alloy,.108*Math.cos(a),.78,-.97+.108*Math.sin(a));sphere.scale.y=.6}
    block(machine,graphite,0,-3.09,-.175,.14,.47,.024);block(machine,white,0,-3.09,-.147,.118,.43,.015);
    block(machine,brass,.042,-3.10,-.133,.018,.045,.012);
    
    cylinder(machine,polish,0,.1,-.28,.085,.085,1.59);
    const stator=group(machine);stator.position.set(0,.1,-.56);
    innerRotor=group(stator);cylinder(innerRotor,graphite,0,0,0,.275,.275,.37);
    for(let n=0;n<12;n++){const a=n*Math.PI/6,x=Math.cos(a),y=Math.sin(a);
      const magnet=block(innerRotor,n%2?alloy:teal,.266*x,.266*y,0,.07,.088,.32);magnet.rotation.z=a;
      const winding=group(stator);winding.position.set(.34*x,.34*y,0);winding.rotation.z=a;
      block(winding,copper,0,0,0,.087,.103,.36);
      for(let j=0;j<6;j++)block(winding,brass,.045,0,-.145+j*.055,.009,.104,.012);
    }
    ring(stator,alloy,0,0,-.22,.35,.043);
    for(const z of [-1.02,.09]){cylinder(machine,teal,0,.1,z,.16,.16,.12);bolts(machine,0,.1,z+.07,.12,6,.018)}
    rotor.position.set(0,.10,.42);radiusGroup=group(rotor);
    // Spanwise airfoil sections: thick root, tapered chord, twist and swept tip.
    function blade(){
      const verts=[],indices=[],sections=28,around=22;
      for(let j=0;j<=sections;j++){const u=j/sections,r=.16+1.84*u;
        const chord=.032+.20*(1-u)**.65+.13*Math.exp(-((u-.21)**2)/.022);
        const twist=(22*(1-u)**2+2)*Math.PI/180;
        for(let k=0;k<around;k++){const angle=2*Math.PI*k/around,s=(1-Math.cos(angle))/2;
          const thick=(.12*(1-u)+.058)*Math.sin(angle)*(1.15-.60*s)*chord;
          const local=(s-.29)*chord,camber=.045*chord*Math.sin(Math.PI*s);
          verts.push(local*Math.cos(twist)+.13*u*u,r,(thick+camber)*Math.cos(twist)+local*Math.sin(twist)+.045*u*u)}
      }
      for(let j=0;j<sections;j++)for(let k=0;k<around;k++){const a=j*around+k,b=j*around+(k+1)%around;indices.push(a,b,a+around,b,b+around,a+around)}
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setIndex(indices);geo.computeVertexNormals();return geo
    }
    const foil=blade();for(let i=0;i<3;i++){const b=group(radiusGroup);b.rotation.z=i*Math.PI*2/3+.24;mesh(b,foil,white);cylinder(b,graphite,0,.18,0,.08,.085,.13,'y');cylinder(b,polish,0,.24,0,.082,.082,.035,'y')}
    cylinder(rotor,alloy,0,0,-.08,.195,.21,.23);const nose=mesh(rotor,new T.SphereGeometry(.235,40,24),white,0,0,.06);nose.scale.z=1.48;
    for(const x of [-1.15,-.62,.73,1.35]){const y=x*.34+.58;flow.add(new T.ArrowHelper(new T.Vector3(0,0,-1),new T.Vector3(x,y,1.74),.58,0x66a9b4,.13,.065))}
  }else{
    // A horizontal jet from the left drives the bottom of a vertical Pelton runner.
    // Side members leave a clear tailrace below the runner.
    for(const z of [-1.66,.66])block(machine,teal,-.4,-1.64,z,5.55,.24,.25);
    block(machine,teal,-2.29,-1.64,-.49,1.76,.24,2.22);
    block(machine,teal,1.97,-1.64,-.49,.75,.24,2.22);
    block(machine,graphite,-.08,-2.01,-.39,3.0,.12,2.13);
    for(const z of [-1.32,.52])block(machine,alloy,-.1,-1.89,z,3.15,.25,.055);
    for(let i=0;i<11;i++)block(machine,graphite,-1.47+i*.269,-1.82,-.39,.05,.09,1.80);
    
    for(const x of [-2.7,1.95])for(const z of [-1.55,.55])cylinder(machine,polish,x,-1.476,z,.07,.07,.08,'y',6);
    for(const z of [-.50,-1.48]){block(machine,graphite,.20,-.97,z,.74,1.10,.24);cylinder(machine,teal,.20,-.28,z,.37,.37,.28);bolts(machine,.2,-.28,z+.16,.26,6,.047)}
    const motor=generator(machine,.64,1);motor.g.position.set(.20,-.28,-.80);innerRotor=motor.rotating;
    block(machine,teal,.20,-1.12,-1.29,1.23,.43,1.02);block(machine,graphite,.64,.13,-1.26,.42,.32,.45);
    rotor.position.set(.20,-.28,0);cylinder(rotor,polish,0,0,-.55,.15,.15,1.9);
    cylinder(rotor,teal,0,0,0,.83,.83,.17);for(const z of [-.1,.1])ring(rotor,polish,0,0,z,.74,.047);
    cylinder(rotor,alloy,0,0,.16,.33,.33,.18);bolts(rotor,0,0,.27,.24,8,.044);
    // Loft each bucket half as a concave spoon. The two cups share the axial splitter.
    const bucketGeo=side=>{const vertices=[],idx=[],rows=10,cols=10;
      for(let j=0;j<=rows;j++)for(let k=0;k<=cols;k++){
        const u=j/rows,v=k/cols,radial=(u-.5)*.43;
        const breadth=.30*(.30+.70*Math.sin(Math.PI*u)**.48);
        const bowl=.16*Math.sin(Math.PI*u)**.72*Math.sin(Math.PI*v);
        vertices.push(.10-bowl+.08*(u-.5),.91+radial,side*(.01+v*breadth))}
      for(let j=0;j<rows;j++)for(let k=0;k<cols;k++){const a=j*(cols+1)+k;idx.push(a,a+1,a+cols+1,a+1,a+cols+2,a+cols+1)}
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setIndex(idx);geo.computeVertexNormals();return geo};
    const halves=[bucketGeo(-1),bucketGeo(1)];
    for(let i=0;i<18;i++){const b=group(rotor);b.rotation.z=i*Math.PI/9;halves.forEach(g=>mesh(b,g,polish));const lip=block(b,alloy,.105,.913,0,.038,.37,.032);lip.rotation.z=-.16}
    const y=-1.20;
    cylinder(machine,teal,-2.30,y,0,.285,.285,.93,'x');cylinder(machine,polish,-1.60,y,0,.125,.27,.55,'x');
    for(const x of [-2.67,-1.92]){cylinder(machine,graphite,x,y,0,.38,.38,.09,'x');for(let i=0;i<8;i++){const a=i*Math.PI/4;cylinder(machine,polish,x+.055,y+.32*Math.cos(a),.32*Math.sin(a),.034,.034,.07,'x',6)}}
    cylinder(machine,brass,-1.27,y,0,.174,.178,.11,'x');
    cylinder(machine,teal,-2.30,y+.28,0,.15,.21,.35,'y');
    cylinder(machine,polish,-2.30,y+.59,0,.046,.046,.43,'y');
    const handwheel=ring(machine,oxide,-2.30,y+.83,0,.32,.044);handwheel.rotation.x=Math.PI/2;
    for(let i=0;i<3;i++){const spoke=block(machine,oxide,-2.30,y+.83,0,.61,.035,.035);spoke.rotation.y=i*Math.PI/3}
    
    jet=cylinder(flow,material(0x60bcd1,.22,.18),-.535,y,0,.073,.073,1.37,'x');
    jetTraces=group(flow);for(let i=0;i<5;i++)cylinder(jetTraces,white,0,y+.018,.045,.008,.008,.11,'x',8);
    waterSpray=group(flow);for(const side of [-1,1]){
      const curve=new T.CatmullRomCurve3([new T.Vector3(.13,y+.02,0),new T.Vector3(.22,y+.05,side*.18),new T.Vector3(.15,y+.02,side*.36),new T.Vector3(.02,y-.12,side*.54)]);
      mesh(waterSpray,new T.TubeGeometry(curve,16,.027,8,false),jet.material)}
  }
  return {update(s,time,angle,inspect,showFlow){
    rotor.rotation.z=angle;innerRotor.rotation.z=angle;flow.visible=showFlow&&(wind||s.b>0);
    if(wind){radiusGroup.scale.setScalar(s.b/20);cover.visible=!inspect;
      flow.children.forEach((a,i)=>{a.position.z=1.70-(time*s.a*.16+i*.24)%1.1})}
    else{jet.scale.x=jet.scale.z=Math.sqrt(s.b/.2)*Math.pow(100/s.a,.25);
      jetTraces.children.forEach((p,i)=>{p.position.x=-1.20+((time*.45*Math.sqrt(s.a)+i*.262)%1.28)});jetTraces.visible=s.b>.055}
  }}
}
