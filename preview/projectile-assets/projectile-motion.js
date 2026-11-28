const chartInk = {};
function refreshChartInk() {
  const styles = getComputedStyle(document.documentElement);
  for (const role of ["field", "grid", "muted", "axis", "ink", "trace", "measure", "component", "guide", "wash"]) {
    chartInk[role] = styles.getPropertyValue("--" + role).trim();
  }
}
refreshChartInk();
window.addEventListener("lab-theme-change", refreshChartInk);

  // ====== 物理與介面狀態 (預設：θ = +45°, y0 = 0 m, 角度範圍 0° ~ +90°) ======
  const state = {
    theta: 45,
    minTheta: 0,
    maxTheta: 90,
    v0: 20,
    y0: 0,
    g: 9.8,
    t: 0,
    playing: false,
    speedFactor: 1.0,
    mode: "trajectory",
    chart: "r",
    showCompare: false
  };

  const draft = {theta: state.theta, v0: state.v0, y0: state.y0, g: state.g};
  let launched = false;
  let observedTime = 0;
  function needsLaunch() {
    return !launched || Object.keys(draft).some(key => draft[key] !== state[key]);
  }

  let animFrameId = null;
  let lastTimestamp = null;

  // ====== DOM 元素 ======
  const sliderTheta = document.getElementById("sliderTheta");
  const angleAnalysis=document.getElementById('angleAnalysis');
  const sliderV0 = document.getElementById("sliderV0");
  const sliderY0 = document.getElementById("sliderY0");
  const sliderTime = document.getElementById("sliderTime");

  const valTheta = document.getElementById("valTheta");
  const sceneTheta=document.getElementById('sceneTheta');
  const sceneV0=document.getElementById('sceneV0');
  const sceneY0=document.getElementById('sceneY0');
  const speedPresets=document.querySelectorAll('[data-slider="sliderV0"] button');
  let displayedPresetSpeed;
  const valV0 = document.getElementById("valV0");
  const valY0 = document.getElementById("valY0");

  

  const outH = document.getElementById("outH");
  const outR = document.getElementById("outR");
  const outT = document.getElementById("outT");
  const outOptAngle = document.getElementById("outOptAngle");
  const outVx = document.getElementById("outVx");
  const outVy = document.getElementById("outVy");
  const hrFormulaBox = document.getElementById("hrFormulaBox");

  const livePosTag = document.getElementById("livePosTag");
  const timeLabel = document.getElementById("timeLabel");

  const btnLaunch = document.getElementById("btnLaunch");
  const btnSlow = document.getElementById("btnSlow");

  const chkCompare = document.getElementById("chkCompare");

  const trajCanvas = document.getElementById("trajCanvas");
  const hCanvas = document.getElementById("hCanvas");
  const rCanvas = document.getElementById("rCanvas");

  // ====== 物理計算核心 ======
  function calcPhysics(thetaDeg, v0, y0, g) {
    const rad = (thetaDeg * Math.PI) / 180;
    let vx = v0 * Math.cos(rad);
    let vy0 = v0 * Math.sin(rad);

    if (Math.abs(vx) < 1e-9) vx = 0;
    if (Math.abs(vy0) < 1e-9) vy0 = 0;

    const disc = Math.max(0, vy0 * vy0 + 2 * g * y0);
    let T = (vy0 + Math.sqrt(disc)) / g;
    if (T < 1e-9) T = 0;

    const R = vx * T;

    let H = y0;
    let tPeak = 0;
    if (vy0 > 0) {
      tPeak = vy0 / g;
      H = y0 + (vy0 * vy0) / (2 * g);
    }

    const optRad = Math.atan(v0 / Math.sqrt(v0 * v0 + 2 * g * y0));
    const optDeg = (optRad * 180) / Math.PI;

    return { vx, vy0, T, R, H, tPeak, optDeg };
  }

  function posAtTime(t, p) {
    const x = p.vx * t;
    const y = Math.max(0, state.y0 + p.vy0 * t - 0.5 * state.g * t * t);
    const vy = p.vy0 - state.g * t;
    return { x, y, vx: p.vx, vy };
  }

  function getEnvelopeBounds(v0, y0, g) {
    const maxH = y0 + (v0 * v0) / (2 * g);
    const optRad = Math.atan(v0 / Math.sqrt(v0 * v0 + 2 * g * y0));
    const optDeg = (optRad * 180) / Math.PI;
    const optP = calcPhysics(optDeg, v0, y0, g);
    const maxR = optP.R;
    return { maxH, maxR, optDeg };
  }

  // ====== Canvas 工具 ======
  function setupCanvas(canvas) {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(100, Math.floor(rect.width));
    const h = Math.max(100, Math.floor(rect.height));
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Use screen dimensions so a small plot or a narrow desktop window keeps its normal ink.
    const phoneScreen = Math.min(screen.width, screen.height) < 600 && matchMedia("(pointer: coarse)").matches;
    const strokeScale = phoneScreen ? Math.max(0.5, Math.min(0.75, w / 700)) : 1;
    return { ctx, w, h, strokeScale };
  }

  function fillRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
    }
    ctx.fill();
  }

  function drawArrow(ctx, x1, y1, x2, y2, color, lineWidth = 5, headSize = 15, dash = []) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 3) return;
    headSize = Math.min(headSize, len * 0.45);
    const angle = Math.atan2(dy, dx);

    const lineEndX = x2 - (headSize * 0.55) * Math.cos(angle);
    const lineEndY = y2 - (headSize * 0.55) * Math.sin(angle);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.setLineDash(dash);
    ctx.lineTo(dash.length ? x2 : lineEndX, dash.length ? y2 : lineEndY);
    ctx.strokeStyle=chartInk.field;ctx.lineWidth=lineWidth+2;ctx.stroke();
    ctx.strokeStyle=color;ctx.lineWidth=lineWidth;ctx.stroke();

    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x2 - headSize * Math.cos(angle - Math.PI / 6.5), y2 - headSize * Math.sin(angle - Math.PI / 6.5));
    ctx.lineTo(x2, y2);
    ctx.lineTo(x2 - headSize * Math.cos(angle + Math.PI / 6.5), y2 - headSize * Math.sin(angle + Math.PI / 6.5));
    if (dash.length) ctx.stroke();
    else { ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }

  function drawVectorLabel(ctx, text, x, y, color, canvasW, canvasH, strokeScale) {
    ctx.save();
    ctx.font = "bold 13px sans-serif";
    const tw = ctx.measureText(text).width + 10;
    const th = 20;
    let bx = x - tw / 2;
    let by = y - th / 2;
    bx = Math.max(6, Math.min(canvasW - tw - 6, bx));
    by = Math.max(6, Math.min(canvasH - th - 6, by));

    ctx.fillStyle = chartInk.field;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8 * strokeScale;
    fillRoundRect(ctx, bx, by, tw, th, 5);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, bx + tw / 2, by + th / 2 + 0.5);
    ctx.restore();
  }

  function axisLabel(value, step) {
    const precision = Math.max(0, -Math.floor(Math.log10(step)));
    return Number(value.toFixed(precision)).toString();
  }

  function niceStep(maxVal, targetTicks = 5) {
    const rough = maxVal / targetTicks;
    if (rough <= 0) return 1;
    const pow10 = Math.pow(10, Math.floor(Math.log10(rough)));
    const norm = rough / pow10;
    let step = 1;
    if (norm >= 5) step = 5;
    else if (norm >= 2) step = 2;
    else if (norm >= 1) step = 1;
    return step * pow10;
  }

  // ====== 1. 繪製即時拋射軌跡圖 ======
  let renderExhibit;
  try { renderExhibit=createProjectileExhibit(document.getElementById('exhibitCanvas')); }
  catch(error) { console.warn('Using the 2D flight view',error); }
  if(renderExhibit){
    const colors=renderExhibit.cueColors;
    sceneTheta.parentElement.style.color=colors.theta;
    sceneV0.parentElement.style.color=colors.v0;
    sceneY0.parentElement.style.color=colors.y0;
  }
  const view={launchFrame:null,active:false,yaw:0,pitch:0,zoom:1};
  const fingers=new Map();
  let canOrbit=false;
  function resetView(){
    Object.assign(view,{active:false,yaw:0,pitch:0,zoom:1});
    fingers.clear();
  }
  const ballInset=document.getElementById('ballInset');
  const insetCanvas=document.getElementById('insetCanvas');
  const insetToggle=document.getElementById('toggleInset');
  insetToggle.addEventListener('click',()=>{
    ballInset.hidden=!ballInset.hidden;
    insetToggle.setAttribute('aria-pressed',String(!ballInset.hidden));
    updateUI();
  });
  function drawCloseUp(ctx,w,h,vx,vy,maxSpeed,colors,flight){
    const x=w*.42,y=h/2,radius=Math.min(32,h*.095,w*.08);
    if(!renderExhibit){
      ctx.clearRect(0,0,w,h);
      ctx.beginPath();ctx.arc(x,y,radius,0,2*Math.PI);ctx.fillStyle=chartInk.muted;ctx.fill();
    }
    if(flight && launched && state.t>0 && state.t<flight.model.T){
      const metresToPixels=flight.scale*radius/flight.fieldRadius;
      drawFireTrail(ctx,flight.model,state.t,metresToPixels,
        px=>x+(px-flight.pos.x)*metresToPixels,
        py=>y-(py-flight.pos.y)*metresToPixels,w,h,radius);
    }
    const scale=Math.min(w*.39,h*.38)/maxSpeed;
    const dx=vx*scale,dy=-vy*scale;
    const horizontal=Math.abs(vy)<1e-8,vertical=Math.abs(vx)<1e-8;
    const tips=[[x+dx,y],[x,y+dy],[x+dx,y+dy]];
    if(!horizontal && !vertical){
      ctx.save();
      ctx.strokeStyle=chartInk.muted;ctx.lineWidth=1;ctx.setLineDash([3,3]);
      ctx.beginPath();ctx.moveTo(...tips[0]);ctx.lineTo(...tips[2]);ctx.lineTo(...tips[1]);ctx.stroke();
      ctx.restore();
      drawArrow(ctx,x,y,...tips[0],colors[0],3,9);
      drawArrow(ctx,x,y,...tips[1],colors[1],3,9);
    }
    drawArrow(ctx,x,y,...tips[2],colors[2],3,11);
    ctx.font='bold 16px sans-serif';
    const occupied=[];
    // Intersect the shaft with a padded label rectangle, including both arrow ends.
    function crosses(rect,tip){
      let enter=0,exit=1;
      for(const [origin,end,min,max] of [[x,tip[0],rect.l-3,rect.r+3],[y,tip[1],rect.t-3,rect.b+3]]){
        const delta=end-origin;
        if(Math.abs(delta)<1e-8){if(origin<min || origin>max)return false;continue;}
        const a=(min-origin)/delta,b=(max-origin)/delta;
        enter=Math.max(enter,Math.min(a,b));exit=Math.min(exit,Math.max(a,b));
      }
      return enter<=exit;
    }
    function label(text,i,preferredX,preferredY,side=0){
      const m=ctx.measureText(text);
      const width=Math.ceil(m.width)+4,ascent=Math.ceil(m.actualBoundingBoxAscent),height=ascent+Math.ceil(m.actualBoundingBoxDescent)+4;
      let best,cost=Infinity;
      function consider(l,t){
        l=Math.max(2,Math.min(w-width-2,l));t=Math.max(2,Math.min(h-height-2,t));
        const rect={l,t,r:l+width,b:t+height};
        if((side<0 && rect.b>y-2) || (side>0 && rect.t<y+2))return;
        if(occupied.some(o=>rect.l<o.r+3 && rect.r>o.l-3 && rect.t<o.b+3 && rect.b>o.t-3))return;
        const ballGap=Math.hypot(Math.max(l-x,0,x-rect.r),Math.max(t-y,0,y-rect.b));
        const score=(l-preferredX)**2+(t-preferredY)**2+
          (ballGap<radius+2?1e6:0)+tips.filter(tip=>crosses(rect,tip)).length*1e5;
        if(score<cost){cost=score;best=rect;}
      }
      consider(preferredX,preferredY);
      if(cost>0){
        for(let t=2;t<=h-height;t+=5)for(let l=2;l<=w-width;l+=5)consider(l,t);
      }
      occupied.push(best);
      const px=best.l+2,py=best.t+2+ascent;
      ctx.lineWidth=3;ctx.strokeStyle=chartInk.field;ctx.strokeText(text,px,py);
      ctx.fillStyle=colors[i];ctx.fillText(text,px,py);
    }
    if(horizontal && vertical){
      label('v = 0',2,x+radius+5,y-8);
    }else if(horizontal){
      label('v = vₓ',2,x+dx+5,y-8);
      label('vᵧ = 0',1,x-24,y+radius+5);
    }else if(vertical){
      label('v = vᵧ',2,x+5,y+dy-9);
      label('vₓ = 0',0,x+radius+5,y+5);
    }else{
      const rising=vy>0;
      label('vₓ',0,x+dx+4,y+(rising?4:-21),rising?1:-1);
      label('vᵧ',1,x-25,y+dy-9);
      label('v',2,x+dx+4,y+dy+(rising?-17:4),rising?-1:1);
    }
  }
  const probe=document.createElement('div'),pin=document.createElement('i');
  probe.className='flight-probe';pin.className='flight-probe-pin';
  trajCanvas.parentElement.append(pin,probe);
  function hideProbe(){probe.hidden=true;pin.hidden=true;}
  hideProbe();
  function inspectFlight(event){
    const {p,project}=trajectoryView,rect=trajCanvas.getBoundingClientRect();
    const x=event.clientX-rect.left,y=event.clientY-rect.top;
    let best=100,time=0,previous=project(0,state.y0);
    // Hit-test the same 80 projected segments used to paint the curve.
    for(let i=1;i<=80;i++){
      const point=posAtTime(p.T*i/80,p),next=project(point.x,point.y);
      const dx=next.x-previous.x,dy=next.y-previous.y;
      const u=Math.max(0,Math.min(1,((x-previous.x)*dx+(y-previous.y)*dy)/(dx*dx+dy*dy||1)));
      const distance=(x-previous.x-u*dx)**2+(y-previous.y-u*dy)**2;
      if(distance<best){best=distance;time=p.T*(i-1+u)/80;}
      previous=next;
    }
    if(best>=100){hideProbe();return;}
    const pos=posAtTime(time,p),anchor=project(pos.x,pos.y);
    const signed=(v,n)=>Math.abs(v)<.5*10**(-n)?(0).toFixed(n):(v>0?'+':'−')+Math.abs(v).toFixed(n);
    const times=[time],other=2*p.vy0/state.g-time;
    if(Math.abs(p.vx)<1e-8 && other>=0 && other<=p.T && Math.abs(other-time)>.01)times.push(other);
    probe.textContent=times.sort((a,b)=>a-b).map(t=>{
      const {vx,vy}=posAtTime(t,p),speed=Math.hypot(vx,vy);
      const angle=speed<.005?'—':signed(Math.atan2(vy,vx)*180/Math.PI,1)+'°';
      return 't   '+t.toFixed(2)+' s\nvₓ  '+signed(vx,2)+' m/s\nvᵧ  '+signed(vy,2)+' m/s\n|v| '+speed.toFixed(2)+' m/s\nθ   '+angle;
    }).join('\n\n');
    pin.hidden=probe.hidden=false;
    pin.style.left=anchor.x+'px';pin.style.top=anchor.y+'px';
    const width=probe.offsetWidth,height=probe.offsetHeight;
    probe.style.left=Math.max(2,Math.min(rect.width-width-2,anchor.x+width+15<rect.width?anchor.x+12:anchor.x-width-12))+'px';
    probe.style.top=Math.max(2,Math.min(rect.height-height-2,anchor.y-height/2))+'px';
  }
  function changeSetting(source,value){
    source.value=String(value);source.dispatchEvent(new Event('input',{bubbles:true}));
  }
  const stationSurface=document.getElementById('rigInsetCanvas'),stationLaunch=document.getElementById('rigInsetLaunch');
  const stationValue=document.getElementById('rigInsetValue');
  let stationDrag=null,stationHover=null;
  let modelDrag=null,hoverCue=null;
  const angleValue=document.createElement('output');
  angleValue.className='rig-angle-value';angleValue.hidden=true;
  trajCanvas.parentElement.append(angleValue);
  let arcPoints=[];
  function editTarget(event,station=false){
    const {muzzle,speedTip:end,liftBadge,onArc}=renderExhibit.controlAnchor(station);
    const rect=(station?stationSurface:trajCanvas).getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;
    if(Math.hypot(x-liftBadge.x,y-liftBadge.y)<16)return 'y0';

    const dx=end.x-muzzle.x,dy=end.y-muzzle.y;
    const t=Math.max(.15,Math.min(1,((x-muzzle.x)*dx+(y-muzzle.y)*dy)/(dx*dx+dy*dy||1)));
    if(Math.hypot(x-muzzle.x-t*dx,y-muzzle.y-t*dy)<10)return 'v0';
    if((station?renderExhibit.angleGuidePoints(onArc):arcPoints).some(p=>Math.hypot(x-p.x,y-p.y)<9))return 'theta';
    return renderExhibit.pickControl(event.clientX,event.clientY,station);
  }
  function placeRigHints(w,h){
    angleValue.hidden=true;
    if(state.playing)hoverCue=null;
    if(!renderExhibit || state.playing)return;
    const {muzzle,pivot,onArc,liftBadge,speedTip}=renderExhibit.controlAnchor();
    arcPoints=renderExhibit.angleGuidePoints(onArc);
    const tick=arcPoints[arcPoints.length-1],focused=modelDrag?.key ?? hoverCue;
    if(focused)angleValue.style.color=renderExhibit.cueColors[focused];
    if(focused==='theta'){
      angleValue.hidden=false;angleValue.textContent=draft.theta+'°';
      const dx=tick.x-pivot.x,dy=tick.y-pivot.y,len=Math.hypot(dx,dy)||1;
      angleValue.style.left=Math.max(2,Math.min(w-angleValue.offsetWidth-2,tick.x+dx/len*15-angleValue.offsetWidth/2))+'px';
      angleValue.style.top=Math.max(2,Math.min(h-angleValue.offsetHeight-2,tick.y+dy/len*15-angleValue.offsetHeight/2))+'px';
    }
    if(focused==='y0'){
      angleValue.textContent='y₀ = '+draft.y0+' m';
      angleValue.hidden=false;
      angleValue.style.left=Math.max(2,Math.min(w-angleValue.offsetWidth-2,liftBadge.x-angleValue.offsetWidth/2))+'px';
      angleValue.style.top=Math.max(2,Math.min(h-angleValue.offsetHeight-2,liftBadge.y-angleValue.offsetHeight-15))+'px';
    }
    if(focused==='v0'){
      angleValue.hidden=false;angleValue.textContent='v₀ = '+draft.v0+' m/s';
      const width=angleValue.offsetWidth,height=angleValue.offsetHeight;
      const dx=speedTip.x-muzzle.x,dy=speedTip.y-muzzle.y;
      const length=Math.hypot(dx,dy)||1;
      // Dock the nearest edge of the readout just beyond the projected arrowhead.
      const gap=4;
      const reach=gap+Math.min(width*length/(2*Math.abs(dx)||1e-6),height*length/(2*Math.abs(dy)||1e-6));
      const left=speedTip.x+dx/length*reach-width/2;
      const top=speedTip.y+dy/length*reach-height/2;
      angleValue.style.left=Math.max(2,Math.min(w-width-2,left))+'px';
      angleValue.style.top=Math.max(2,Math.min(h-height-2,top))+'px';
    }
  }
  const previewLabel=document.createElement('output');
  previewLabel.className='launch-preview';previewLabel.hidden=true;
  trajCanvas.parentElement.append(previewLabel);
  let trajectoryView;
  // Sample only elapsed simulation time so pausing and scrubbing reproduce the same flame.
  function drawFireTrail(ctx,p,t,scale,toX,toY,w,h,radius,project){
    const head=posAtTime(t,p);
    const speed=Math.hypot(head.vx,head.vy);

    const duration=Math.min(t,.23,86/Math.max(1,speed*scale));
    const stations=[];
    for(let j=0;j<=24;j++){
      const u=j/24,point=posAtTime(t-duration*u,p);
      const magnitude=Math.hypot(point.vx,point.vy)||1;
      const screen=project?project(point.x,point.y):{x:toX(point.x),y:toY(point.y)};
      stations.push({...screen,nx:point.vy/magnitude,ny:point.vx/magnitude,u});
    }
    const first=stations[0],last=stations[24];
    if(Math.hypot(last.x-first.x,last.y-first.y)<radius+2)return;
    ctx.save();
    ctx.beginPath();ctx.rect(0,0,w,h);ctx.moveTo(first.x+radius,first.y);
    ctx.arc(first.x,first.y,radius,0,2*Math.PI);ctx.clip('evenodd');
    function ribbon(reach,width,phase,stops){
      const end=Math.max(2,Math.round(24*reach)),tail=stations[end];
      const fill=ctx.createLinearGradient(first.x,first.y,tail.x,tail.y);
      stops.forEach(([at,color])=>fill.addColorStop(at,color));
      const edge=(j,side)=>{
        const q=stations[j],f=j/end;
        const wave=Math.sin(phase+f*9-t*21)+.4*Math.sin(f*17+t*13);
        const offset=radius*(wave*.32*f+side*width*(1-f)**.65*(1+.19*wave));
        return [q.x+q.nx*offset,q.y+q.ny*offset];
      };
      ctx.beginPath();ctx.moveTo(...edge(0,1));
      for(let j=1;j<=end;j++)ctx.lineTo(...edge(j,1));
      for(let j=end;j>=0;j--)ctx.lineTo(...edge(j,-1));
      ctx.closePath();ctx.fillStyle=fill;ctx.fill();
    }
    ribbon(1,1.3,.8,[[0,'#ff9b25'],[.38,'#ff641ad9'],[.76,'#de431381'],[1,'#bb351000']]);
    ribbon(.82,.82,2,[[0,'#fff4ab'],[.42,'#ffbc32'],[1,'#ff781000']]);
    ribbon(.52,.44,4,[[0,'#fffde5'],[.68,'#ffe484'],[1,'#ffbf3800']]);
    ctx.restore();
  }
  const landingRange=document.createElement('output');
  landingRange.className='landing-range';landingRange.hidden=true;
  trajCanvas.parentElement.append(landingRange);
  function placeRange(model,project,w,h){
    const end=project(model.R,0);
    landingRange.hidden=!(launched && model.T>0 && state.t>=model.T && !state.playing &&
      end.x>=0 && end.x<=w && end.y>=0 && end.y<=h);
    if(landingRange.hidden)return;
    const reading=model.R.toFixed(2)+' m';
    if(landingRange.textContent!==reading)landingRange.textContent=reading;
    const width=landingRange.offsetWidth,height=landingRange.offsetHeight;
    const curve=[];
    for(let i=0;i<=80;i++){
      const point=posAtTime(model.T*i/80,model);
      curve.push(project(point.x,point.y));
    }
    let best=-Infinity;
    for(const [dx,dy] of [[12,15],[-width-12,15],[12,-height-13],[-width-12,-height-13],[12,-height/2],[-width-12,-height/2]]){
      const x=Math.max(3,Math.min(w-width-3,end.x+dx)),y=Math.max(3,Math.min(h-height-3,end.y+dy));
      const clearance=Math.min(...curve.map(q=>Math.hypot(Math.max(x-q.x,0,q.x-x-width),Math.max(y-q.y,0,q.y-y-height))));
      const underInset=!ballInset.hidden && x<ballInset.offsetLeft+ballInset.offsetWidth && x+width>ballInset.offsetLeft && y<ballInset.offsetTop+ballInset.offsetHeight && y+height>ballInset.offsetTop;
      const score=Math.min(20,clearance)-(underInset?100:0);
      if(score>best){best=score;landingRange.style.left=x+'px';landingRange.style.top=y+'px';}
    }
  }
  let impactStart=null,impactFrame=0;
  function clearImpact(){
    if(impactFrame)cancelAnimationFrame(impactFrame);
    impactFrame=0;impactStart=null;
  }
  function beginImpact(){
    clearImpact();
    if(!renderExhibit)return;
    impactStart=performance.now();
    function fade(now){
      if(now-impactStart>=renderExhibit.impactDurationMs){impactFrame=0;drawTrajectory();return;}
      drawTrajectory();impactFrame=requestAnimationFrame(fade);
    }
    impactFrame=requestAnimationFrame(fade);
  }
  let cueTimer=0,cueStart=0;
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  function paintCues(){
    const phase=(performance.now()-cueStart)*2*Math.PI/1500;
    const opacity=reducedMotion.matches?1:.85+.15*Math.cos(phase);
    renderExhibit.setCueOpacity(cueTimer || !launched || canOrbit ? opacity : 1,stationDrag?.key ?? modelDrag?.key ?? stationHover ?? hoverCue);
  }
  function syncCues(enabled){
    if(enabled && !cueTimer){
      cueStart=performance.now();
      paintCues();
      cueTimer=setInterval(()=>{if(!document.hidden)paintCues();},50);
    }else if(!enabled && cueTimer){
      clearInterval(cueTimer);cueTimer=0;
      renderExhibit.setCueOpacity(1);
    }
  }
  function drawTrajectory() {
    const {ctx,w,h} = setupCanvas(trajCanvas);
    const p = calcPhysics(state.theta,state.v0,state.y0,state.g);
    const reference = angleAnalysis.open && state.showCompare ? calcPhysics(45,state.v0,state.y0,state.g) : null;
    canOrbit=Boolean(renderExhibit && launched && p.T>0 && state.t>=p.T && !state.playing);
    trajCanvas.classList.toggle('can-orbit',canOrbit);
    if(!canOrbit && (view.active || fingers.size))resetView();
    const pos=posAtTime(state.t,p);
    const ready=!launched && !!renderExhibit;
    const hull=renderExhibit?.cannonBounds(state.theta) || {left:-3.8,right:1,bottom:-2.7,top:1};
    const maxSpeed=Math.hypot(p.vx,p.vy0-state.g*p.T) || 1;
    // Fit the projected model and the current ball.
    // The two axes share one scale; the viewport aspect ratio sets the limiting axis.
    function frameAt(scale){
      const radius=Math.max(5,.27*scale);
      const bx=pos.x*scale, by=pos.y*scale, origin=state.y0*scale;
      return {
        left:Math.min(hull.left*scale,bx-radius),
        right:Math.max(hull.right*scale,bx+radius),
        bottom:Math.min(origin+hull.bottom*scale,by-radius),
        top:Math.max(origin+hull.top*scale,by+radius)
      };
    }
    let low=0,high=Math.max(w,h)*2;
    for(let i=0;i<24;i++){
      const mid=(low+high)/2, box=frameAt(mid);
      const fitsSubjects=box.right-box.left<=w-18 && box.top-box.bottom<=h-18;
      const fitsGroundMargin=ready || box.bottom>=-h*.22;
      if(fitsSubjects && fitsGroundMargin)low=mid;
      else high=mid;
    }
    const scale=low, box=frameAt(scale);
    const start=(w-box.right-box.left)/2;
    // Keep the lowest visible subject just inside the frame. In wide shots this
    // leaves the spare height above the field, instead of exposing the cutaway.
    const floor=h-9+box.bottom;
    const toPxX = x => start+x*scale;
    const toPxY = y => floor-y*scale;
    const inset=ballInset.hidden?null:setupCanvas(insetCanvas);
    const preview=draft.theta!==state.theta || draft.v0!==state.v0 || draft.y0!==state.y0 ? draft : null;
    previewLabel.hidden=!preview;
    if(preview)previewLabel.textContent=labLanguage.pick("Preview","預覽");
    const project=renderExhibit?renderExhibit({editable:!state.playing,editSpeed:draft.v0,ready,preview,impactAge:impactStart===null?-1:(performance.now()-impactStart)/1000,w,h,start,muzzleY:toPxY(state.y0),x:toPxX(pos.x),y:toPxY(pos.y),theta:state.theta,size:scale,view,inset,flight:{...p,time:state.t,y0:state.y0,g:state.g}}):
      (x,y)=>({x:toPxX(x),y:toPxY(y)});
    hideProbe();
    trajectoryView = {p,project};
    placeRange(p,project,w,h);
    stationLaunch.disabled=(!ready && !canOrbit) || btnLaunch.disabled;
    if(!canOrbit)stationHover=null;
    updateStationValue();
    placeRigHints(w,h);
    syncCues(Boolean(renderExhibit && (!launched || canOrbit)));
    ctx.clearRect(0,0,w,h);
    const styles = getComputedStyle(document.querySelector(".shell"));
    const colors = ["--horizontal","--vertical","--resultant"].map(key=>styles.getPropertyValue(key).trim());
    ctx.fillStyle=chartInk.grid;
    function path(model,end,color,dash,startTime=0,width=2,outline=false){
      ctx.beginPath();
      for(let i=0;i<=80;i++){
        const pos=posAtTime(startTime+(end-startTime)*i/80,model);
        const pt=project(pos.x,pos.y);
        if(i===0)ctx.moveTo(pt.x,pt.y);else ctx.lineTo(pt.x,pt.y);
      }
      ctx.save();ctx.lineCap="round";ctx.lineJoin="round";ctx.setLineDash(dash);
      if(outline){ctx.strokeStyle=chartInk.field;ctx.lineWidth=width+2;ctx.stroke();}
      ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();ctx.restore();
    }
    // The tilting launch rail ends at the ball centre at release.
    if(!renderExhibit){ctx.save();
    ctx.translate(start,toPxY(state.y0));
    ctx.fillStyle=chartInk.muted;
    ctx.fillRect(-17,8,20,4);
    ctx.fillRect(-10,4,4,7);
    ctx.rotate(-state.theta*Math.PI/180);
    ctx.strokeStyle=chartInk.muted;
    ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(-27,5);ctx.lineTo(2,5);ctx.stroke();
    for(let n=0;n<2;n++){
      ctx.beginPath();ctx.arc(-20+n*10,0,4,0,2*Math.PI);ctx.stroke();
    }
    ctx.restore();}
    if(preview && !renderExhibit){
      const a=preview.theta*Math.PI/180,len=preview.v0*.16*scale;
      ctx.save();ctx.translate(start,toPxY(preview.y0));ctx.rotate(-a);
      ctx.globalAlpha=.65;ctx.strokeStyle=ctx.fillStyle='#54cfc6';ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(-scale*1.86,0);ctx.lineTo(len,0);ctx.stroke();
      ctx.beginPath();ctx.moveTo(len,0);ctx.lineTo(len-7,-4);ctx.lineTo(len-7,4);ctx.fill();ctx.restore();
    }
    if(reference && launched)path(reference,Math.min(state.t,reference.T),chartInk.guide,[6,5]);

    path(p,state.t,chartInk.trace,[],0,1.8,true);
    if(launched){
      ctx.save();
      ctx.fillStyle='#ffe1a2';ctx.strokeStyle='#384344';ctx.lineWidth=1;
      for(let t=.5;t<=state.t;t+=.5){
        const sample=posAtTime(t,p),dot=project(sample.x,sample.y);
        ctx.beginPath();ctx.arc(dot.x,dot.y,3,0,2*Math.PI);ctx.fill();ctx.stroke();
      }
      ctx.restore();
    }
    const fieldRadius=renderExhibit?Math.max(4,.235*scale):6;
    if(launched && state.t>0 && state.t<p.T){
      drawFireTrail(ctx,p,state.t,scale,toPxX,toPxY,w,h,fieldRadius,project);
    }
    renderExhibit?.clearSpeedSilhouette(ctx,w,h);
    const x=toPxX(pos.x), y=toPxY(pos.y);
    // A common speed scale makes all three vectors comparable throughout the flight.

    if(inset)drawCloseUp(inset.ctx,inset.w,inset.h,p.vx,pos.vy,maxSpeed,colors,{model:p,pos,scale,fieldRadius});
    if(renderExhibit)return;
    ctx.beginPath();ctx.arc(x,y,6,0,2*Math.PI);ctx.fillStyle=chartInk.field;ctx.fill();ctx.strokeStyle=chartInk.ink;ctx.lineWidth=2.5;ctx.stroke();
  }

  function drawAngleChart(canvas, type) {
    const { ctx, w, h, strokeScale } = setupCanvas(canvas);
    ctx.clearRect(0, 0, w, h);

    const isH = type === "H";
    const mainColor = chartInk.trace;
    const fillColor = chartInk.wash;

    const pad = { left: 52, right: 20, top: 24, bottom: 42 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;

    const minDeg = state.minTheta;
    const maxDeg = state.maxTheta;
    const spanDeg = maxDeg - minDeg;

    const env = getEnvelopeBounds(state.v0, state.y0, state.g);
    const maxY = (isH ? env.maxH : env.maxR) * 1.15;

    const toPxX = (deg) => pad.left + ((deg - minDeg) / spanDeg) * plotW;
    const toPxY = (val) => pad.top + plotH - (val / maxY) * plotH;

    ctx.strokeStyle = chartInk.grid;
    ctx.lineWidth = 1.5 * strokeScale;
    ctx.font = "bold 11.5px sans-serif";
    ctx.fillStyle = chartInk.muted;

    const tickStep = spanDeg <= 90 ? 15 : 30;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let deg = minDeg; deg <= maxDeg; deg += tickStep) {
      const px = toPxX(deg);
      ctx.beginPath();
      ctx.moveTo(px, pad.top);
      ctx.lineTo(px, pad.top + plotH);
      ctx.stroke();
      ctx.fillText(`${deg > 0 ? "+" : ""}${deg}°`, px, pad.top + plotH + 7);
    }

    const yStep = niceStep(maxY, 4);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let y = 0; y <= maxY; y += yStep) {
      const py = toPxY(y);
      ctx.beginPath();
      ctx.moveTo(pad.left, py);
      ctx.lineTo(pad.left + plotW, py);
      ctx.stroke();
      ctx.fillText(axisLabel(y, yStep), pad.left - 7, py);
    }

    if (minDeg < 0) {
      ctx.save();
      ctx.strokeStyle = chartInk.guide;
      ctx.lineWidth = 2 * strokeScale;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(toPxX(0), pad.top);
      ctx.lineTo(toPxX(0), pad.top + plotH);
      ctx.stroke();
      ctx.restore();
    }

    ctx.strokeStyle = chartInk.axis;
    ctx.lineWidth = 2.6 * strokeScale;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, pad.top + plotH);
    ctx.lineTo(pad.left + plotW, pad.top + plotH);
    ctx.stroke();

    ctx.fillStyle = chartInk.ink;
    ctx.font = "bold 12.5px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("θ (°)", pad.left + plotW, pad.top + plotH + 24);
    ctx.textAlign = "left";
    ctx.fillText(isH ? "H (m)" : "R (m)", pad.left - 42, pad.top - 13);

    const points = [];
    for (let deg = minDeg; deg <= maxDeg; deg += 0.5) {
      const p = calcPhysics(deg, state.v0, state.y0, state.g);
      const val = isH ? p.H : p.R;
      points.push({ deg, val, px: toPxX(deg), py: toPxY(val) });
    }

    ctx.beginPath();
    ctx.moveTo(points[0].px, toPxY(0));
    for (const pt of points) ctx.lineTo(pt.px, pt.py);
    ctx.lineTo(points[points.length - 1].px, toPxY(0));
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();

    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      if (i === 0) ctx.moveTo(points[i].px, points[i].py);
      else ctx.lineTo(points[i].px, points[i].py);
    }
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 4.5 * strokeScale;
    ctx.lineJoin = "round";
    ctx.stroke();

    if (!isH && env.optDeg >= minDeg && env.optDeg <= maxDeg) {
      const optP = calcPhysics(env.optDeg, state.v0, state.y0, state.g);
      const ox = toPxX(env.optDeg);
      const oy = toPxY(optP.R);
      ctx.save();
      ctx.strokeStyle = chartInk.trace;
      ctx.lineWidth = 2 * strokeScale;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox, toPxY(0));
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = chartInk.trace;
      ctx.font = "bold 11.5px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(`θ*=${env.optDeg.toFixed(1)}°`, Math.min(Math.max(ox, pad.left + 32), pad.left + plotW - 32), Math.max(pad.top + 14, oy - 6));
    }

    const curP = calcPhysics(state.theta, state.v0, state.y0, state.g);
    const curVal = isH ? curP.H : curP.R;
    const cx = toPxX(state.theta);
    const cy = toPxY(curVal);

    ctx.save();
    ctx.strokeStyle = chartInk.ink;
    ctx.lineWidth = 1.6 * strokeScale;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(cx, pad.top);
    ctx.lineTo(cx, pad.top + plotH);
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, cy, 7.5 * strokeScale, 0, Math.PI * 2);
    ctx.fillStyle = chartInk.field;
    ctx.fill();
    ctx.lineWidth = 3.8 * strokeScale;
    ctx.strokeStyle = chartInk.ink;
    ctx.stroke();

    const tagText = `${state.theta > 0 ? "+" : ""}${state.theta}°, ${curVal.toFixed(1)}m`;
    ctx.font = "bold 12px sans-serif";
    const textW = ctx.measureText(tagText).width + 12;
    let boxX = cx + 10;
    if (boxX + textW > w - 6) boxX = cx - textW - 10;
    let boxY = cy - 26;
    if (boxY < 4) boxY = cy + 10;

    ctx.fillStyle = chartInk.ink;
    fillRoundRect(ctx, boxX, boxY, textW, 22, 5);
    ctx.fillStyle = chartInk.field;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(tagText, boxX + 6, boxY + 11);
  }

  // ====== 更新按鈕狀態 ======
  function updatePlayButtons() {
    const p = calcPhysics(state.theta, state.v0, state.y0, state.g);
    const next = calcPhysics(draft.theta,draft.v0,draft.y0,draft.g);
    btnLaunch.disabled = needsLaunch() ? next.T <= 0 : p.T <= 0;
    const label = needsLaunch() ? labLanguage.pick("Launch","發射") : state.playing ? labLanguage.pick("Pause","暫停")
      : state.t >= p.T && p.T > 0 ? labLanguage.pick("Replay","重播")
      : state.t > 0 ? labLanguage.pick("Resume","繼續") : labLanguage.pick("Play","播放");
    btnLaunch.querySelector(".action-label").textContent = label;
    btnLaunch.title = label;
    btnLaunch.setAttribute("aria-label", label);
    btnLaunch.querySelector("path").setAttribute("d", state.playing && !needsLaunch() ? "M8 5v14 M16 5v14" : "M6 4l14 8-14 8z");

  }

  // ====== 更新介面數據與重繪 ======
  const flightPhase=document.getElementById('flightPhase');
  const flightCharts=[...document.querySelectorAll('.flight-charts .flight-chart')];
  document.getElementById('jumpPeak')?.addEventListener('click',()=>{
    state.playing=false;
    stopAnimationLoop();
    state.t=calcPhysics(state.theta,state.v0,state.y0,state.g).tPeak;
    updatePlayButtons();
    updateUI();
  });
  const speedChart=document.querySelector('.speed-chart');
  function drawSpeedChart(p,t){
    const speedAt=time=>Math.hypot(p.vx,p.vy0-state.g*time);
    const ceiling=Math.max(5,5*Math.ceil(Math.max(speedAt(0),speedAt(p.T))/5));
    const x=time=>48+353*(p.T?time/p.T:0),y=time=>91-74*speedAt(time)/ceiling;
    const times=[0];
    if(t>0){
      for(let i=1;i<=64;i++)times.push(t*i/64);
      const apex=p.vy0/state.g;
      if(apex>0 && apex<t){times.push(apex);times.sort((a,b)=>a-b);}
    }
    speedChart.querySelector('.trace').setAttribute('d',times.map((time,i)=>(i?'L':'M')+x(time).toFixed(2)+' '+y(time).toFixed(2)).join(' '));
    const dot=speedChart.querySelector('circle');
    dot.setAttribute('cx',x(t));dot.setAttribute('cy',y(t));
    speedChart.querySelector('.upper').textContent=ceiling;
    speedChart.querySelector('.mid').textContent=ceiling/2;
    speedChart.querySelector('.end-time').textContent=p.T.toFixed(2);
    speedChart.querySelector('output').textContent=speedAt(t).toFixed(2)+' m/s';
  }
  function updateFlightPanels(p,t,vy){
  if(!flightPhase) return;
  const stage = !launched ? ["Ready to launch","準備發射"] : !p.T ? ['No flight','沒有飛行階段'] : !t ? ['Launch','發射一刻'] : t>=p.T ? ['At impact','觸地一刻'] : Math.abs(vy)<1e-8 ? ['Highest point','最高點'] : vy>0 ? ['Rising','上升中'] : ['Falling','下降中'];
  flightPhase.textContent=labLanguage.pick(...stage);
  const limit=Math.max(5,5*Math.ceil(Math.max(p.vx,Math.abs(p.vy0),Math.abs(p.vy0-state.g*p.T))/5));
  const x=49+278*(p.T?t/p.T:0);
  const level=value=>56-40*value/limit;
  flightCharts.forEach((panel,index)=>{
    const start=index?p.vy0:p.vx;
    const value=index && Math.abs(vy) < 1e-9 ? 0 : index ? vy : p.vx;
    const y=level(value);
    panel.querySelector('output').textContent=value.toFixed(2)+' m/s';
    panel.querySelector('.upper').textContent=limit;
    panel.querySelector('.lower').textContent=-limit;
    panel.querySelector('.end-time').textContent=p.T.toFixed(2);
    panel.querySelector('.trace').setAttribute('d',`M49 ${level(start)} L${x} ${y}`);
    panel.querySelector('circle').setAttribute('cx',x);
    panel.querySelector('circle').setAttribute('cy',y);
  });
}
  function updateUI() {

    valTheta.textContent = `${draft.theta > 0 ? "+" : ""}${draft.theta}°`;
    if(displayedPresetSpeed!==draft.v0){
      for(const preset of speedPresets)preset.setAttribute('aria-pressed',String(Number(preset.value)===draft.v0));
      displayedPresetSpeed=draft.v0;
    }
    sceneTheta.value=draft.theta+'°';
    sceneV0.value=draft.v0+' m/s';
    sceneY0.value=draft.y0+' m';
    valV0.textContent = `${draft.v0} m/s`;
    valY0.textContent = draft.y0;

    const p = calcPhysics(state.theta, state.v0, state.y0, state.g);

    outH.textContent = `${p.H.toFixed(2)} m`;
    outR.textContent = `${p.R.toFixed(2)} m`;
    outT.textContent = `${p.T.toFixed(2)} s`;
    outOptAngle.textContent = `${p.optDeg.toFixed(1)}°`;
    outVx.textContent = `${p.vx.toFixed(2)} m/s`;
    outVy.textContent = `${(Math.abs(p.vy0 - state.g * state.t) < 1e-9 ? 0 : p.vy0 - state.g * state.t).toFixed(2)} m/s`;

    hrFormulaBox.textContent = state.theta > 0
      ? "H = y₀ + (v₀ sin θ)² / (2g)"
      : "H = y₀";
    const ratio = p.T > 0 ? Math.min(1, state.t / p.T) : 0;

    sliderTime.disabled = !observedTime;
    document.getElementById('jumpPeak').disabled = !launched || observedTime < p.tPeak;
    sliderTime.value = ratio;
    const curT = p.T > 0 ? Math.min(state.t, p.T) : 0;
    const cur = posAtTime(curT, p);

    updateFlightPanels(p,curT,cur.vy);
    timeLabel.textContent = `${curT.toFixed(2)} / ${p.T.toFixed(2)} s`;
    livePosTag.textContent = `t = ${curT.toFixed(2)} s ｜ x = ${cur.x.toFixed(1)} m, y = ${cur.y.toFixed(1)} m`;

    drawTrajectory();
    if (angleAnalysis.open) {
      if (state.chart === "r") drawAngleChart(rCanvas, "R");
      else drawAngleChart(hCanvas, "H");
    }
  }

  // ====== 動畫迴圈 (確保從 t = 0 穩定起飛，絕不中途跳動) ======
  function stopAnimationLoop() {
    airSound.pause();
    whistleStarted=false;
    if (animFrameId !== null) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    lastTimestamp = null;
  }

  function animate(ts) {
    if (!state.playing) {
      stopAnimationLoop();
      return;
    }

    // 第一幀僅記錄起始時間戳記，確保先完整呈現 t=0 起點再推進
    if (lastTimestamp === null) {
      lastTimestamp = ts;
      animFrameId = requestAnimationFrame(animate);
      return;
    }

    const rawDt = (ts - lastTimestamp) / 1000;
    lastTimestamp = ts;
    // 限制單幀最大時間增量為 0.05s，防止分頁切換或瞬時延遲造成快轉至中途
    const dt = Math.min(0.05, Math.max(0, rawDt)) * state.speedFactor;

    const p = calcPhysics(state.theta, state.v0, state.y0, state.g);
    state.t += dt;
    if(state.t<p.T)syncWhistle(rawDt>0?dt/rawDt:state.speedFactor);
    observedTime = Math.max(observedTime,Math.min(state.t,p.T));

    if (state.t >= p.T) {
      state.t = p.T;
      beginImpact();
      if(soundSwitch.checked){
        impactSound.currentTime=0;
        impactSound.play().catch(()=>{});
      }
      state.playing = false;
      stopAnimationLoop();
      updatePlayButtons();
      updateUI();
      return;
    }

    updateUI();
    if (state.playing) {
      animFrameId = requestAnimationFrame(animate);
    }
  }

  const launchSound=new Audio('preview/projectile-assets/harbour-launch.mp3');
  launchSound.preload='auto';
  launchSound.volume=.48;
  const airSound=new Audio('preview/projectile-assets/air-descent.wav');
  const impactSound=new Audio('preview/projectile-assets/quay-impact.mp3?v=attack61');
  airSound.loop=false;airSound.preservesPitch=true;airSound.preload='auto';
  impactSound.preload='auto';impactSound.volume=.38;
  const whistleLength=3; // Seconds in the one-shot descent recording.
  let whistleStarted=false,shotDuration=0;
  airSound.volume=.20;
  function syncWhistle(clockRate){
    const offset=whistleLength-(shotDuration-state.t);
    if(!soundSwitch.checked || offset<0 || offset>=whistleLength)return;
    if(!whistleStarted){
      whistleStarted=true;
      airSound.currentTime=offset;
      airSound.playbackRate=Math.max(.1,Math.min(2,clockRate));
      airSound.play().catch(()=>{});
    }else{
      // Follow the simulation clock without seeking or retriggering the recording.
      const correction=(offset-airSound.currentTime)*.65;
      airSound.playbackRate=Math.max(.1,Math.min(2,clockRate+correction));
    }
  }
  const soundSwitch=document.getElementById('launchSound');
  try{soundSwitch.checked=localStorage.getItem('projectile-launch-sound')!=='off';}catch{}
  soundSwitch.addEventListener('change',()=>{
    if(!soundSwitch.checked){launchSound.pause();airSound.pause();whistleStarted=false;impactSound.pause();}
    else if(state.playing)syncWhistle(state.speedFactor);
    try{localStorage.setItem('projectile-launch-sound',soundSwitch.checked?'on':'off');}catch{}
  });
  function togglePauseResume() {
    const firing=needsLaunch() || (!state.playing && state.t >= calcPhysics(state.theta,state.v0,state.y0,state.g).T);
    if (firing) {
      view.launchFrame=launched && renderExhibit ? renderExhibit.cameraFrame() : null;
      resetView();
      clearImpact();
      stopAnimationLoop();
      Object.assign(state,draft);
      state.minTheta = state.y0 > 0 ? -90 : 0;
      state.t = 0;
      observedTime = 0;
      launched = true;
      state.playing = false;
    }
    const p = calcPhysics(state.theta, state.v0, state.y0, state.g);
    if (p.T <= 0) return;

    if (state.playing) {
      state.playing = false;
      stopAnimationLoop();
    } else {
      if (state.t >= p.T - 1e-6) state.t = 0;
      stopAnimationLoop();
      state.playing = true;
      if(firing){impactSound.pause();shotDuration=p.T;}
      syncWhistle(state.speedFactor);
      if(firing && soundSwitch.checked){
        launchSound.currentTime=0;
        launchSound.play().catch(()=>{});
      }
      animFrameId = requestAnimationFrame(animate);
    }
    updatePlayButtons();
  }

  function syncAngleRange() {
    const minAngle = draft.y0 > 0 ? -90 : 0;
    sliderTheta.min = minAngle;
    draft.theta = Math.max(draft.theta, minAngle);
    sliderTheta.value = draft.theta;
    for (const tick of document.querySelectorAll('[data-slider="sliderTheta"] button')) {
      const angle = Number(tick.value);
      tick.hidden = angle < minAngle;
      tick.disabled = tick.hidden;
      tick.style.left = (100 * (angle - minAngle) / (state.maxTheta - minAngle)) + "%";
    }
  }

  function onParamChanged() {

    updatePlayButtons();
    updateUI();
  }

  // ====== 事件綁定 ======
  sliderTheta.addEventListener("input", (e) => {
    draft.theta = parseInt(e.target.value, 10);
    onParamChanged();
  });

  sliderV0.addEventListener("input", (e) => {
    draft.v0 = parseInt(e.target.value, 10);
    onParamChanged();
  });

  sliderY0.addEventListener("input", (e) => {
    draft.y0 = parseInt(e.target.value, 10);
    syncAngleRange();
    onParamChanged();
  });

  sliderTime.addEventListener("input", (e) => {
    state.playing = false;
    stopAnimationLoop();
    const p = calcPhysics(state.theta, state.v0, state.y0, state.g);
    state.t = Math.min(observedTime, parseFloat(e.target.value) * p.T);
    updatePlayButtons();
    updateUI();
  });

  for (const scale of document.querySelectorAll(".scale-ticks")) {
    const slider = document.getElementById(scale.dataset.slider);
    scale.addEventListener("click", event => {
      const tick = event.target.closest("button");
      if (!tick) return;
      slider.value = tick.value;
      slider.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
  document.getElementById("gravityValue").addEventListener("change", event => {
    draft.g = Number(event.target.value);
    onParamChanged();
  });

  btnLaunch.addEventListener("click", togglePauseResume);


  btnSlow.addEventListener("click", () => {
    state.speedFactor = state.speedFactor === 1.0 ? 0.5 : 1.0;
    btnSlow.textContent = state.speedFactor === 1.0 ? "1×" : "½×";
  });

  chkCompare.addEventListener("change", (e) => { state.showCompare = e.target.checked; updateUI(); });

  function seekTrajectory(event) {
    const { p, project } = trajectoryView;
    const bounds = trajCanvas.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    let best = state.t;
    let distance = Infinity;
    // A vertical launch visits the same height twice. Keep the nearest time branch.
    for (let step = 0; step <= 500; step++) {
      const t = observedTime * step / 500;
      const point = posAtTime(t, p);
      const screen=project(point.x,point.y);
      const d=(screen.x-x)**2+(screen.y-y)**2;
      if (d < distance - 0.000001 || (Math.abs(d - distance) <= 0.000001 && Math.abs(t - state.t) < Math.abs(best - state.t))) {
        distance = d;
        best = t;
      }
    }
    state.t = best;
    updatePlayButtons();
    updateUI();
  }
  let zoomFrame=0;
  function zoomView(factor){
    const next=Math.min(6,Math.max(.35,view.zoom*factor));
    if(next===view.zoom)return;
    view.active=true;
    view.zoom=next;
    if(!zoomFrame)zoomFrame=requestAnimationFrame(()=>{
      zoomFrame=0;
      updateUI();
    });
  }
  function pinchDistance(){
    const [a,b]=fingers.values();
    return Math.hypot(a.x-b.x,a.y-b.y);
  }
  trajCanvas.addEventListener("wheel",event=>{
    if(!canOrbit)return;
    event.preventDefault();
    // Precision trackpads deliver a stream of fractional wheel deltas.
    const unit=event.deltaMode===1?16:event.deltaMode===2?trajCanvas.clientHeight:1;
    const pixels=event.deltaY*unit;
    const gain=event.ctrlKey?.004:.0013;
    const change=Math.max(-.10,Math.min(.10,-pixels*gain));
    zoomView(Math.exp(change));
  },{passive:false});
  function adjustFromPointer(drag,event){
      const {key,coords,start,value}=drag,pt=coords(event.clientX,event.clientY);
      if(pt){
        if(key==='v0'){
          const angle=draft.theta*Math.PI/180;
          const along=(pt.horizontal-start.horizontal)*Math.cos(angle)+(pt.height-start.height)*Math.sin(angle);
          changeSetting(sliderV0,Math.round(value+along/.16));
          return;
        }
        const delta=key==='y0'?pt.height-start.height:((pt.angle-start.angle+540)%360)-180;
        changeSetting(key==='y0'?sliderY0:sliderTheta,Math.round(value+delta));
      }
  }
  function updateStationValue(){
    const key=stationDrag?.key ?? stationHover;
    stationValue.textContent=key?({theta:'θ '+draft.theta+'°',y0:'y₀ '+draft.y0+' m',v0:'v₀ '+draft.v0+' m/s'})[key]:'';
    if(key)stationValue.style.color=renderExhibit.cueColors[key];
  }
  stationSurface.addEventListener('pointerdown',event=>{
    if((launched && !canOrbit) || !event.isPrimary || event.button!==0)return;
    const key=editTarget(event,true);
    if(!key)return;
    const coords=renderExhibit.dragCoordinates(true),start=coords(event.clientX,event.clientY);
    if(!start)return;
    stationDrag={id:event.pointerId,key,coords,start,value:draft[key]};
    renderExhibit.stationPointer.value=event.pointerId;
    stationSurface.setPointerCapture(event.pointerId);
    event.preventDefault();updateStationValue();paintCues();
  });
  stationSurface.addEventListener('pointermove',event=>{
    if(stationDrag?.id===event.pointerId){adjustFromPointer(stationDrag,event);updateStationValue();return;}
    if((launched && !canOrbit) || event.pointerType==='touch')return;
    const hit=editTarget(event,true);
    if(hit!==stationHover){stationHover=hit;updateStationValue();paintCues();}
    stationSurface.style.cursor=hit==='y0'?'ns-resize':hit?'grab':'';
  });
  stationSurface.addEventListener('lostpointercapture',()=>{
    stationDrag=stationHover=null;renderExhibit.stationPointer.value=-1;updateStationValue();paintCues();
  });
  stationSurface.addEventListener('pointerleave',()=>{
    if(stationHover){stationHover=null;updateStationValue();paintCues();}
  });
  const stationToggle=document.getElementById('toggleRigInset');
  stationToggle.hidden=!renderExhibit;
  stationToggle.addEventListener('click',()=>{
    renderExhibit.stationOpen=document.getElementById('rigInset').hidden;
    stationHover=null;drawTrajectory();
  });
  stationLaunch.addEventListener('click',()=>btnLaunch.click());
  let graphPress;
  trajCanvas.addEventListener("pointerdown", event => {
    hideProbe();
    if(event.button===0 && event.isPrimary && renderExhibit && !state.playing){
      const key=editTarget(event);
      if(key){
        const coords=renderExhibit.dragCoordinates(),start=coords(event.clientX,event.clientY);
        if(start){
          modelDrag={id:event.pointerId,key,coords,start,value:draft[key]};
          hoverCue=null;
          paintCues();
          placeRigHints(trajCanvas.clientWidth,trajCanvas.clientHeight);
          trajCanvas.setPointerCapture(event.pointerId);event.preventDefault();return;
        }
      }
    }
    if(canOrbit && event.button===0){
      fingers.set(event.pointerId,{x:event.clientX,y:event.clientY});
      trajCanvas.setPointerCapture(event.pointerId);
      return;
    }
    if (!event.isPrimary || event.button !== 0) return;
    graphPress = { id: event.pointerId, x: event.clientX, y: event.clientY, dragging: false };
    trajCanvas.setPointerCapture(event.pointerId);
    if (state.playing) {
      state.playing = false;
      stopAnimationLoop();
      updatePlayButtons();
    } else seekTrajectory(event);
  });
  trajCanvas.addEventListener("pointermove", event => {
    if(modelDrag && event.pointerId===modelDrag.id){
      adjustFromPointer(modelDrag,event);
      return;
    }
    if(!event.buttons && event.pointerType!=="touch" && renderExhibit && !state.playing){
      const hit=editTarget(event);
      setHoverCue(hit);
      if(hit)hideProbe();
      trajCanvas.style.cursor=hit==='y0'?'ns-resize':hit?'grab':'';
    }
    const previous=fingers.get(event.pointerId);
    if(previous){
      const distance=fingers.size===2?pinchDistance():0;
      fingers.set(event.pointerId,{x:event.clientX,y:event.clientY});
      if(distance>0){const next=pinchDistance();if(next>0)zoomView((next/distance)**.68);return;}
      if(fingers.size===1){
        view.active=true;
        const turnLimit=Math.PI;
        const deltaX=event.clientX-previous.x;
        const deltaY=event.clientY-previous.y;
        if(!deltaX && !deltaY)return;
        const tiltPerPixel=Math.PI/(2*trajCanvas.clientHeight);
        view.pitch=Math.max(-Math.PI/5,Math.min(Math.PI/18,view.pitch-deltaY*tiltPerPixel));
        const radiansPerPixel=Math.PI/(3*trajCanvas.clientWidth);
        view.yaw=Math.max(-turnLimit,Math.min(turnLimit,view.yaw-deltaX*radiansPerPixel));
        updateUI();
      }
      return;
    }
    if(!hoverCue && !event.buttons && event.pointerType!=="touch" && trajectoryView && launched && !state.playing && state.t>=trajectoryView.p.T && trajectoryView.p.T>0){
      inspectFlight(event);return;
    }
    if (graphPress?.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - graphPress.x, event.clientY - graphPress.y) >= 3) graphPress.dragging = true;
    if (graphPress.dragging) seekTrajectory(event);
  });
  trajCanvas.addEventListener("lostpointercapture", event => { fingers.delete(event.pointerId);if(modelDrag?.id===event.pointerId){modelDrag=null;paintCues();}angleValue.hidden=true;graphPress=null; });

  function setHoverCue(key){
    if(hoverCue===key)return;
    hoverCue=key;
    paintCues();
    placeRigHints(trajCanvas.clientWidth,trajCanvas.clientHeight);
  }
  trajCanvas.addEventListener("pointerleave",()=>{hideProbe();setHoverCue(null);trajCanvas.style.cursor='';});
  window.addEventListener('blur',()=>setHoverCue(null));

  function bindAngleChartScrub(canvas) {
    let dragging = false;
    function updateFromPointer(clientX) {
      const rect = canvas.getBoundingClientRect();
      const padLeft = 52;
      const padRight = 20;
      const plotW = rect.width - padLeft - padRight;
      const frac = Math.max(0, Math.min(1, (clientX - rect.left - padLeft) / plotW));
      const newTheta = Math.round(Number(sliderTheta.min) + frac * (state.maxTheta - Number(sliderTheta.min)));
      if (newTheta !== draft.theta) {
        draft.theta = newTheta;
        sliderTheta.value = newTheta;
        onParamChanged();
      }
    }

    canvas.addEventListener("pointerdown", (e) => {
      dragging = true;
      canvas.setPointerCapture(e.pointerId);
      updateFromPointer(e.clientX);
    });
    canvas.addEventListener("pointermove", (e) => { if (dragging) updateFromPointer(e.clientX); });
    canvas.addEventListener("pointerup", () => { dragging = false; });
    canvas.addEventListener("pointercancel", () => { dragging = false; });
  }

  bindAngleChartScrub(hCanvas);
  bindAngleChartScrub(rCanvas);

  const main = document.querySelector("main");
  function selectChart(chart) {
    state.chart = chart;
    for (const panel of main.querySelectorAll("[data-plot]")) panel.hidden = panel.dataset.plot !== chart;
    for (const button of main.querySelectorAll("button[data-chart]")) {
      button.setAttribute("aria-pressed", String(button.dataset.chart === chart));
    }
    updateUI();
  }
  for (const button of main.querySelectorAll("button[data-chart]")) {
    button.addEventListener("click", () => selectChart(button.dataset.chart));
  }
  angleAnalysis.addEventListener('toggle',updateUI);
  syncAngleRange();
  selectChart(state.chart);
  const ro = new ResizeObserver(() => updateUI());
  ro.observe(trajCanvas.parentElement);
  ro.observe(hCanvas.parentElement);
  ro.observe(rCanvas.parentElement);

  updatePlayButtons();
  updateUI();
