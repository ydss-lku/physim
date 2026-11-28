import {Circle, Line, Rect, Txt, Scene2D, makeScene2D, Gradient} from '@motion-canvas/2d';
import {ReadOnlyTimeEvents} from '@motion-canvas/core/lib/scenes/timeEvents/ReadOnlyTimeEvents';
import {Logger, Vector2} from '@motion-canvas/core';

const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x)};
const rad=Math.PI/180;
const samples=(n,f)=>Array.from({length:n},(_,i)=>f(i/(n-1)));

// A retained Motion Canvas scene per viewport. Each keyed node keeps its identity
// across playback, scrubbing, resizing and editing the draft shot.
function surface(canvas){
  const scene=new Scene2D({...makeScene2D(function*(){}),name:canvas.id,
    size:new Vector2(800,400),resolutionScale:1,logger:new Logger(),
    playback:{time:0,state:1},timeEventsClass:ReadOnlyTimeEvents});
  const nodes=new Map(),view=scene.getView();
  function shape(key,Type,props){
    let node=nodes.get(key);
    if(!node){node=new Type({});nodes.set(key,node);view.add(node);}
    node.zIndex(order++);node.opacity(1);
    for(const [name,value] of Object.entries(props)){
      if(name==='opacity')continue;
      if((name==='fill'||name==='stroke') && typeof value==='string' && props.opacity!==undefined)
        node[name](value+Math.round(clamp(props.opacity)*255).toString(16).padStart(2,'0'));
      else node[name](value);
    }
    used.add(key);
    return node;
  }
  let order=0,used=new Set();
  let redraw;
  const paintFrame=(w,h,paint)=>scene.execute(()=>{
    const ratio=Math.min(devicePixelRatio||1,2);
    if(canvas.width!==Math.round(w*ratio)||canvas.height!==Math.round(h*ratio)){
      canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);
    }
    view.size([w,h]);view.position([0,0]);used.clear();order=0;
    const pen={
      line:(k,points,color,width=1,extra={})=>shape(k,Line,{points,stroke:color,lineWidth:width,lineCap:'round',...extra}),
      polygon:(k,points,color,extra={})=>shape(k,Line,{points,closed:true,fill:color,...extra}),
      disc:(k,position,size,fill,extra={})=>shape(k,Circle,{position,size,fill,...extra}),
      rect:(k,position,size,fill,extra={})=>shape(k,Rect,{position,size,fill,...extra}),
      text:(k,position,text,fontSize,fill,extra={})=>shape(k,Txt,{position,text,fontSize,fill,fontFamily:'system-ui',fontWeight:650,...extra})
    };
    paint(pen);for(const [key,node] of nodes)if(!used.has(key))node.opacity(0);
    redraw=()=>{
      const ctx=canvas.getContext('2d');
      ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,w,h);
      scene.draw(ctx);
    };
    redraw();
  });
  paintFrame.cueColors=colors=>scene.execute(()=>{
    for(const [key,color] of Object.entries(colors))nodes.get(key)?.stroke(color);
    redraw?.();
  });
  return paintFrame;
}
const ramp=(a,b,from,to)=>new Gradient({type:'linear',from,to,stops:[{offset:0,color:a},{offset:1,color:b}]});
function harbour(p,w,h,shift,clock){
  const horizon=h*.55;
  p.rect('sky',[w/2,h/2],[w,h],ramp('#132d47','#f0ac82',[0,-h*.5],[0,h*.17]));
  p.disc('sun',[w*.73+shift*.3,h*.23],h*.18,'#ffd5aa',{opacity:.79});
  for(let i=-2;i<21;i++){
    const x=i*w/17+shift*.35,tower=(1+Math.cos(i*5.12))*h*.065+h*.03;
    p.rect('skyline'+i,[x,horizon-tower/2],[w*.047,tower],'#546474');
    p.rect('rooftop'+i,[x-3,horizon-tower],[w*.02,5],'#546474');
  }
  p.rect('water',[w/2,(h+horizon)/2],[w,h-horizon],ramp('#567d88','#193e50',[0,-h*.23],[0,h*.23]));
  for(let i=0;i<32;i++){
    const y=horizon+(i%11)*h*.033,x=((i*137+Math.sin(clock+i)*5+shift)%(w+100)+w+100)%(w+100)-50;
    p.line('reflection'+i,[[x,y],[x+12+i%7*5,y]],i%5?'#78949b':'#d2a48e',1);
  }
  for(let i=0;i<16;i++){
    const x=i*w/15+shift*.35;
    for(let j=0;j<3;j++)p.line('windows'+i+'-'+j,[[x,horizon-8-j*4],[x+6,horizon-8-j*4]],'#85908d',1);
  }
  // An unbroken quay supports the skyline and gantries above the tide line.
  p.rect('quay',[w/2,horizon],[w,6],'#364e58');
  for(let i=-1;i<5;i++){
    const x=w*(i*.35+.15)+shift,y=horizon-2,s=h*.0029;
    const pt=(a,b)=>[x+a*s,y+b*s];
    p.polygon('wharf'+i,[pt(-70,-5),pt(90,-5),pt(89,1),pt(-70,1)],'#384b58');
    p.line('gantry'+i,[pt(-20,-4),pt(-16,-43),pt(10,-43),pt(16,-4)],'#394a58',3*s);
    p.line('boom'+i,[pt(-28,-40),pt(-12,-58),pt(49,-40),pt(-28,-40)],'#505762',2*s);
    p.line('brace'+i,[pt(-17,-8),pt(9,-35),pt(-15,-35),pt(14,-8)],'#56616a',1.4*s);
    p.line('cable'+i,[pt(39,-40),pt(39,-17)],'#55616a',s);
    for(let j=0;j<4;j++)p.rect('cargo'+i+'-'+j,pt(23+j*12,-8-j%2*2),[12*s,7*s],j%2?'#a36b57':'#55737a');
  }
  const shipX=w*.20+shift*.62+Math.sin(clock*.13)*4,shipY=horizon+9;
  const boat=(x,y)=>[shipX+x*h/400,shipY+y*h/400];
  p.polygon('ship-hull',[boat(-54,-4),boat(49,-4),boat(39,4),boat(-43,4)],'#344556');
  p.rect('ship-bridge',boat(-32,-11),[h*.026,h*.033],'#a3aaa5');
  for(let i=0;i<5;i++)p.rect('ship-box'+i,boat(-17+12*i,-7),[h*.026,h*.015],i%2?'#925f50':'#626c70');
}
function arrow(p,key,points,color,width,alpha,both=false){
  p.line(key,points,color,width,{endArrow:true,startArrow:both,arrowSize:Math.max(5,width*3.4),opacity:alpha});
}

window.createProjectileExhibit=function(canvas){
  const main=surface(canvas),close=surface(document.getElementById('insetCanvas'));
  let frame,anchors,rigOrigin,world,latest,active,pulse=1;
  function render(s){
    latest=s;
    const {w,h,flight:f,preview,view,ready,editSpeed}=s,t=f.time;
    const phase=ready?0:clamp(t/Math.max(.001,f.T)),settle=ease((phase-.56)/.44);
    const opening=view.launchFrame;
    const yaw=(opening?opening.yaw*(1-settle):-.38*(1-ease(phase)))+view.yaw;
    const pitch=(opening?opening.pitch+(25*rad-opening.pitch)*settle:.32+(25*rad-.32)*ease(phase))-view.pitch;
    const cx=Math.cos(yaw),sx=Math.sin(yaw),cy=Math.cos(pitch),sy=Math.sin(pitch);
    const pos=u=>[f.vx*u,f.y0+f.vy0*u-f.g*u*u/2];
    const [bx,by]=pos(t),apex=pos(clamp(f.vy0/f.g,0,t))[1];
    const span=Math.max(17,bx+8),height=Math.max(10,apex+4,preview?preview.y0+4:0);
    const autoScale=Math.min(w*.84/span,h*.68/height);
    const follow=ease((phase-.1)/.55);
    const zoom=view.zoom;
    const scale=(opening&&phase<1?opening.scale+(autoScale-opening.scale)*follow:autoScale)*zoom;
    const centreX=opening&&phase<1?opening.centreX+(bx*.43+3-opening.centreX)*follow:bx*.43+3;
    const centreY=opening&&phase<1?opening.centreY+(height*.38-opening.centreY)*follow:height*.38;
    frame={yaw,pitch,scale,centreX,centreY};
    world=(x,y,z=0)=>[w*.47+scale*((x-centreX)*cx+z*sx),h*.47-scale*((y-centreY)*cy-(x-centreX)*sx*sy+z*cx*sy)];
    const settings=preview||{theta:s.theta,y0:f.y0,v0:editSpeed},a=settings.theta*rad;
    const pivot=[-1.86*Math.cos(a),settings.y0-1.86*Math.sin(a)];
    rigOrigin=pivot;
    const polar=(ang,r)=>world(pivot[0]+r*Math.cos(ang),pivot[1]+r*Math.sin(ang));
    const pair=pt=>({x:pt[0],y:pt[1]});
    anchors={muzzle:pair(polar(a,1.86)),speedTip:pair(polar(a,1.86+editSpeed*.16)),pivot:pair(world(...pivot)),
      liftBadge:pair(world(pivot[0]-2.8,pivot[1]-.3)),onArc:(offset,r)=>pair(polar(a+offset,r))};
    const level=k=>active?(active===k?1:.2):pulse;
    main(w,h,p=>{
      harbour(p,w,h,Math.sin(yaw)*w*.15-centreX*.6,t);
      const deck=(x,z)=>world(x,0,z);
      const corners=[deck(-6,4),deck(260,85),deck(260,-85),deck(-6,-4)];
      p.polygon('fascia',[corners[3],corners[2],world(260,-1.5,-85),world(-6,-1.5,-4)],'#21343c');
      p.polygon('deck',corners,'#344c52');
      for(let x=-5;x<=250;x+=5){
        const z=Math.max(3,4+(x+6)*.30);
        p.line('seam'+x,[deck(x,z),deck(x,-z)],'#415b60',1);
      }
      for(const sign of [-1,1])p.line('edge'+sign,[deck(-6,sign*4),deck(260,sign*85)],'#d4a865',2);
      for(let r=10;r<=bx+.00001;r+=10){
        const opacity=ease((t-r/Math.max(.0001,f.vx)+Math.max(0,s.impactAge))/.35);
        p.line('arc'+r,samples(27,u=>deck(r*Math.cos((u-.5)*.58),r*Math.sin((u-.5)*.58))),'#a1d8d0',1.5,{opacity});
        p.text('meter'+r,deck(r+.5,-r*.17),r+' m',Math.max(9,Math.min(15,scale*.65)),'#b8e3d9',{opacity});
      }
      const well=[[-5,1.5],[.7,1.5],[.7,-1.6],[-5,-1.6]];
      p.polygon('lift-well',well.map(([x,z])=>deck(x,z)),'#1b333c');
      p.line('lift-well-rim',[...well,well[0]].map(([x,z])=>deck(x,z)),'#ac986f',1.6);
      const assembly=(k,angle,baseH,opacity)=>{
        const v=angle*rad,px=-1.86*Math.cos(v),py=baseH-1.86*Math.sin(v);
        const local=(x,y)=>world(px+x,py+y);
        const fill=(name,pts,color)=>p.polygon(k+name,pts.map(([x,y])=>local(x,y)),color,{opacity});
        const top=py-.67,bottom=Math.min(-2.8,top-.32);
        for(const x of [-1.5,.55]){
          p.line(k+'ram'+x,[world(px+x,bottom),world(px+x,top)],'#9cb3b1',Math.max(2,.21*scale),{opacity});
          p.line(k+'sleeve'+x,[world(px+x,bottom),world(px+x,(bottom+top)*.5)],'#435b65',Math.max(3,.38*scale),{opacity});
        }
        fill('lift',[[-2,-.69],[1,-.69],[1,-.95],[-2,-.95]],'#dbac69');
        for(let j=0;j<5;j++)fill('hazard'+j,[[-1.85+j*.54,-.7],[-1.64+j*.54,-.7],[-1.8+j*.54,-.94],[-2+j*.54,-.94]],'#48585b');
        fill('carriage',[[-1.85,-.57],[-.45,.32],[.32,.26],[.68,-.57]],'#29404b');
        const barrelPoint=(x,y)=>local(x*Math.cos(v)-y*Math.sin(v),x*Math.sin(v)+y*Math.cos(v));
        const barrel=(name,pts,color)=>p.polygon(k+name,pts.map(([x,y])=>barrelPoint(x,y)),color,{opacity});
        barrel('tube',[[-.65,-.27],[1.83,-.15],[1.83,.17],[-.65,.33]],'#91adae');
        barrel('breech',[[-.73,-.32],[.29,-.32],[.42,.32],[-.73,.38]],'#486473');
        barrel('rail',[[-.44,.24],[1.5,.13],[1.5,.18],[-.44,.32]],'#d3e2d9');
        for(let j=0;j<4;j++)barrel('vent'+j,[[-.58+j*.16,.12],[-.52+j*.16,.12],[-.57+j*.16,-.06],[-.63+j*.16,-.06]],'#203541');
        barrel('muzzle',[[1.52,-.23],[1.88,-.23],[1.88,.24],[1.52,.24]],'#e0b06d');
        for(const [i,r,c] of [[0,.52,'#162e3b'],[1,.36,'#789092'],[2,.19,'#e3b574']])
          p.disc(k+'axle'+i,local(-.23,-.14),2*r*scale,c,{opacity});
      };
      if(preview&&!ready)assembly('old',s.theta,f.y0,.38);
      assembly('rig',settings.theta,settings.y0,preview||ready?.74:1);
      if(s.editable){
        arrow(p,'theta',samples(18,u=>polar(a+(u-.5)*1.1,1.5)),'#ffda91',2.4,level('theta'),true);
        arrow(p,'lift',[-.98,.42].map(y=>world(pivot[0]-2.8,pivot[1]+y)),'#f3f5e9',2.8,level('y0'),true);
        arrow(p,'speed',[polar(a,1.86),polar(a,1.86+editSpeed*.16)],'#83ead8',2.8,level('v0'));
      }
      if(s.reference && t>0){
        const r=s.reference;
        p.line('reference',samples(60,u=>{const v=u*Math.min(t,r.T);return world(r.vx*v,f.y0+r.vy0*v-f.g*v*v/2)}),'#a3b8bf',1,{lineDash:[5,5]});
      }
      if(t>0){
        p.line('trajectory',samples(85,u=>world(...pos(t*u))),'#f3e8ce',2);
        for(let u=.5;u<=t;u+=.5)p.disc('dot'+u,world(...pos(u)),5,'#ffc777');
        if(phase<1)p.line('trail',samples(15,u=>world(...pos(Math.max(0,t-.14*(1-u))))),'#fba65c',4);
      }
      const point=world(bx,by),diam=Math.max(5,scale*.42);
      p.disc('ball',point,diam,'#203f4a',{stroke:'#d8d8be',lineWidth:1.2});
      if(s.impactAge>=0 && s.impactAge<1.3){
        const life=s.impactAge/1.3;
        p.disc('impact',world(bx,0),[8+70*life,4+15*life],null,{stroke:'#ffc880',lineWidth:2,opacity:1-life});
        for(let j=0;j<10;j++)p.disc('chip'+j,[point[0]+Math.cos(j*2.4)*life*42,point[1]-Math.sin(life*Math.PI)*Math.abs(Math.sin(j))*24],3,'#d8ae75',{opacity:1-life});
      }
    });
    if(s.inset){
      close(s.inset.w,s.inset.h,p=>{
        const {w:iw,h:ih}=s.inset,origin=[iw*.29,ih*.52],vy=f.vy0-f.g*t;
        harbour(p,iw,ih,-bx*.6,t);
        const k=Math.min(iw*.52,ih*.38)/Math.max(1,Math.hypot(f.vx,vy));
        if(t>0&&phase<1)p.line('trail',[origin,[origin[0]-f.vx*k*.6,origin[1]+vy*k*.6]],'#ffae6d',4);
        p.disc('ball',origin,Math.max(10,ih*.16),'#385862',{stroke:'#d7e3d4',lineWidth:2});
        const sign=vy>=0?1:-1;
        for(const [key,x,y,color,label,offset] of [['x',f.vx,0,'#8ce7ff','vₓ',sign*10],['y',0,vy,'#ffabbe','vᵧ',0],['v',f.vx,vy,'#ffda83','v',-sign*10]]){
          const end=[origin[0]+x*k,origin[1]-y*k];
          if(Math.hypot(x,y)>.01)arrow(p,key,[origin,end],color,2,1);
          p.text(key+'label',[end[0]+(key==='y'?-9:5),end[1]+offset],label,11,color);
        }
      });
    }
    return (x,y)=>pair(world(x,y));
  }
  render.drawsFlight=true;
  render.controlAnchor=()=>anchors;
  render.cameraFrame=()=>frame;
  render.cannonBounds=()=>({left:-4,right:2,bottom:-3,top:1});
  render.pickControl=(x,y)=>{
    const r=canvas.getBoundingClientRect(),pivot=anchors.pivot;
    return Math.hypot(x-r.left-pivot.x,y-r.top-pivot.y)<12?'theta':null;
  };
  render.dragCoordinates=()=>{
    const r=canvas.getBoundingClientRect(),o=world(...rigOrigin),{yaw,pitch,scale}=frame;
    return (x,y)=>{
      const horizontal=(x-r.left-o[0])/(scale*Math.cos(yaw));
      const height=((o[1]-y+r.top)/scale+horizontal*Math.sin(yaw)*Math.sin(pitch))/Math.cos(pitch);
      return {horizontal,height,angle:Math.atan2(height,horizontal)/rad};
    };
  };
  render.setCueOpacity=(value,key)=>{
    pulse=value;active=key;
    if(!latest?.editable)return;
    const color=(base,id)=>base+Math.round(255*(key?(key===id?1:.2):pulse)).toString(16).padStart(2,'0');
    main.cueColors({theta:color('#ffda91','theta'),lift:color('#f3f5e9','y0'),speed:color('#83ead8','v0')});
  };
  return render;
};
