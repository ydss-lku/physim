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
  const sliderV0 = document.getElementById("sliderV0");
  const sliderY0 = document.getElementById("sliderY0");
  const sliderTime = document.getElementById("sliderTime");

  const valTheta = document.getElementById("valTheta");
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
    ctx.stroke();

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
  const view={active:false,yaw:0,pitch:0,zoom:1};
  const fingers=new Map();
  const viewTools=document.getElementById('viewTools');
  const orbitAngle=document.getElementById('orbitAngle');
  const orbitValue=document.getElementById('orbitValue');
  orbitAngle.addEventListener('input',()=>{
    const degrees=Number(orbitAngle.value);
    view.yaw=degrees*Math.PI/180;
    view.active=Boolean(degrees || view.zoom!==1);
    orbitValue.value=degrees+'°';
    updateUI();
  });
  function resetView(){
    orbitAngle.value=0;
    orbitValue.value='0°';
    Object.assign(view,{active:false,yaw:0,pitch:0,zoom:1});
    fingers.clear();
  }
  document.getElementById('sideView').onclick=()=>{resetView();updateUI();};
  const ballInset=document.getElementById('ballInset');
  const insetCanvas=document.getElementById('insetCanvas');
  const insetToggle=document.getElementById('toggleInset');
  insetToggle.addEventListener('click',()=>{
    ballInset.hidden=!ballInset.hidden;
    insetToggle.setAttribute('aria-pressed',String(!ballInset.hidden));
    updateUI();
  });
  function vectorOffsets(dx,dy){
    // Translate parallel arrows without changing their lengths or directions.
    const shifts=[[0,0],[0,0],[0,0]];
    if(Math.abs(dx)>=Math.abs(dy) && dx!==0){
      const gap=(dy>0?1:-1)*Math.max(0,7-Math.abs(dy)*.35);
      shifts[0][1]=-gap;shifts[2][1]=gap;
    }else if(dy!==0){
      const gap=Math.max(0,7-Math.abs(dx)*.35);
      shifts[1][0]=-gap;shifts[2][0]=gap;
    }
    return shifts;
  }
  function drawCloseUp(ctx,w,h,vx,vy,maxSpeed,colors){
    const x=w*.42,y=h/2,radius=Math.min(32,h*.095,w*.08);
    if(!renderExhibit){
      ctx.clearRect(0,0,w,h);
      ctx.beginPath();ctx.arc(x,y,radius,0,2*Math.PI);ctx.fillStyle=chartInk.muted;ctx.fill();
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
  let trajectoryView;
  function drawTrajectory() {
    const {ctx,w,h} = setupCanvas(trajCanvas);
    const p = calcPhysics(state.theta,state.v0,state.y0,state.g);
    const reference = state.mode === "analysis" && state.showCompare ? calcPhysics(45,state.v0,state.y0,state.g) : null;
    const canOrbit=Boolean(renderExhibit && launched && p.T>0 && state.t>=p.T && !state.playing);
    viewTools.hidden=!canOrbit;
    trajCanvas.classList.toggle('can-orbit',canOrbit);
    if(!canOrbit && (view.active || fingers.size))resetView();
    const pos=posAtTime(state.t,p);
    const ready=!launched && !!renderExhibit;
    const hull=renderExhibit?.cannonBounds(state.theta) || {left:-3.8,right:1,bottom:-2.7,top:1};
    const maxSpeed=Math.hypot(p.vx,p.vy0-state.g*p.T) || 1;
    // Fit the projected model and the current ball, including screen-sized arrow tips.
    // The two axes share one scale; the viewport aspect ratio sets the limiting axis.
    function frameAt(scale){
      const radius=Math.max(5,.27*scale);
      const dx=42*p.vx/maxSpeed, dy=42*pos.vy/maxSpeed;
      const bx=pos.x*scale, by=pos.y*scale, origin=state.y0*scale;
      return {
        left:Math.min(hull.left*scale,bx-radius),
        right:Math.max(hull.right*scale,bx+radius,bx+dx+2),
        bottom:Math.min(origin+hull.bottom*scale,by-radius,by+dy-2),
        top:Math.max(origin+hull.top*scale,by+radius,by+dy+2)
      };
    }
    let low=0,high=Math.max(w,h)*2;
    for(let i=0;i<24;i++){
      const mid=(low+high)/2, box=frameAt(mid);
      const fitsSubjects=box.right-box.left<=w-18 && box.top-box.bottom<=h-18;
      const fitsGroundMargin=box.bottom>=-h*.22;
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
    trajectoryView = {p,toPxX,toPxY};
    ctx.clearRect(0,0,w,h);
    const styles = getComputedStyle(document.querySelector(".shell"));
    const colors = ["--horizontal","--vertical","--resultant"].map(key=>styles.getPropertyValue(key).trim());
    ctx.fillStyle=chartInk.grid;
    if(!ready)ctx.fillRect(0,floor,w,2);
    ctx.font="12px sans-serif";
    ctx.fillStyle=chartInk.muted;
    const step=niceStep((w-start)/scale,5);
    for(let x=0;!ready && toPxX(x)<w-22;x+=step){
      ctx.fillRect(toPxX(x),floor,1,6);
      ctx.fillText(x+" m",toPxX(x)-5,floor+21<h-2 ? floor+21 : floor-5);
    }
    function path(model,end,color,dash){
      ctx.beginPath();
      for(let i=0;i<=80;i++){
        const pos=posAtTime(end*i/80,model);
        if(i===0)ctx.moveTo(toPxX(pos.x),toPxY(pos.y));
        else ctx.lineTo(toPxX(pos.x),toPxY(pos.y));
      }
      ctx.setLineDash(dash);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();ctx.setLineDash([]);
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
    if(reference && launched)path(reference,Math.min(state.t,reference.T),chartInk.guide,[6,5]);

    path(p,state.t,chartInk.trace,[]);
    const x=toPxX(pos.x), y=toPxY(pos.y);
    // A common speed scale makes all three vectors comparable throughout the flight.

    const fieldOffsets=vectorOffsets(42*p.vx/maxSpeed,-42*pos.vy/maxSpeed);
    [[p.vx,0],[0,pos.vy],[p.vx,pos.vy]].forEach(([vx,vy],i)=>{
      const length=Math.hypot(vx,vy);
      const dx=42*vx/maxSpeed, dy=-42*vy/maxSpeed;
      const dial=document.querySelectorAll(".dial")[i];
      const needle=dial.querySelector(".needle");
      const tip=46*length/maxSpeed, head=Math.min(7,tip*.45);
      needle.setAttribute("d",length<1e-8?"":"M0 1.5 L"+(tip-head)+" 1.5 v3 l"+head+" -4.5 -"+head+" -4.5 v3 H0 Z");
      needle.setAttribute("transform","rotate("+Math.atan2(-vy,vx)*180/Math.PI+")");
      const reading=[vx,vy,length][i];
      dial.querySelector("output").textContent=(Math.abs(reading)<1e-8?0:reading).toFixed(2);
      const [ox,oy]=fieldOffsets[i];
      if(!ready)drawArrow(ctx,x+ox,y+oy,x+ox+dx,y+oy+dy,colors[i],i===2?2:3,8);
    });
    const inset=ballInset.hidden?null:setupCanvas(insetCanvas);
    if(renderExhibit){
      if(view.active)ctx.clearRect(0,0,w,h);
      renderExhibit({w,h,start,muzzleY:toPxY(state.y0),x,y,theta:state.theta,size:scale,
        view,colors,inset,flight:{...p,y0:state.y0,g:state.g,color:chartInk.trace}});
    }
    if(inset)drawCloseUp(inset.ctx,inset.w,inset.h,p.vx,pos.vy,maxSpeed,colors);
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
  const flightCharts=[...document.querySelectorAll('.flight-chart')];
  document.getElementById('jumpPeak')?.addEventListener('click',()=>{
    state.playing=false;
    stopAnimationLoop();
    state.t=calcPhysics(state.theta,state.v0,state.y0,state.g).tPeak;
    updatePlayButtons();
    updateUI();
  });
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
    valV0.textContent = `${draft.v0} m/s`;
    valY0.textContent = `${draft.y0} m`;

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
    if (state.mode === "analysis") {
      if (state.chart === "r") drawAngleChart(rCanvas, "R");
      else drawAngleChart(hCanvas, "H");
    }
  }

  // ====== 動畫迴圈 (確保從 t = 0 穩定起飛，絕不中途跳動) ======
  function stopAnimationLoop() {
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
    observedTime = Math.max(observedTime,Math.min(state.t,p.T));

    if (state.t >= p.T) {
      state.t = p.T;
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

  function togglePauseResume() {
    if (needsLaunch() || (!state.playing && state.t >= calcPhysics(state.theta,state.v0,state.y0,state.g).T)) {
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
    const { p, toPxX, toPxY } = trajectoryView;
    const bounds = trajCanvas.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    let best = state.t;
    let distance = Infinity;
    // A vertical launch visits the same height twice. Keep the nearest time branch.
    for (let step = 0; step <= 500; step++) {
      const t = observedTime * step / 500;
      const point = posAtTime(t, p);
      const d = (toPxX(point.x) - x) ** 2 + (toPxY(point.y) - y) ** 2;
      if (d < distance - 0.000001 || (Math.abs(d - distance) <= 0.000001 && Math.abs(t - state.t) < Math.abs(best - state.t))) {
        distance = d;
        best = t;
      }
    }
    state.t = best;
    updatePlayButtons();
    updateUI();
  }
  function zoomView(factor){
    view.active=true;
    view.zoom=Math.min(6,Math.max(.35,view.zoom*factor));
    updateUI();
  }
  function pinchDistance(){
    const [a,b]=fingers.values();
    return Math.hypot(a.x-b.x,a.y-b.y);
  }
  trajCanvas.addEventListener("wheel",event=>{
    if(viewTools.hidden)return;
    event.preventDefault();
    zoomView(Math.exp(-Math.sign(event.deltaY)*.12));
  },{passive:false});
  let graphPress;
  trajCanvas.addEventListener("pointerdown", event => {
    if(!viewTools.hidden && event.button===0){
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
    const previous=fingers.get(event.pointerId);
    if(previous){
      const distance=fingers.size===2?pinchDistance():0;
      fingers.set(event.pointerId,{x:event.clientX,y:event.clientY});
      if(distance>0){zoomView(pinchDistance()/distance);return;}
      if(fingers.size===1){
        view.active=true;
        const turnLimit=Math.PI;
        const deltaX=event.clientX-previous.x;
        if(!deltaX)return;
        const radiansPerPixel=Math.PI/(3*trajCanvas.clientWidth);
        view.yaw=Math.max(-turnLimit,Math.min(turnLimit,view.yaw-deltaX*radiansPerPixel));
        orbitAngle.value=Math.round(view.yaw*180/Math.PI);
        orbitValue.value=orbitAngle.value+"°";
        updateUI();
      }
      return;
    }
    if (graphPress?.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - graphPress.x, event.clientY - graphPress.y) >= 3) graphPress.dragging = true;
    if (graphPress.dragging) seekTrajectory(event);
  });
  trajCanvas.addEventListener("lostpointercapture", event => { fingers.delete(event.pointerId); graphPress = null; });

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
  for (const button of main.querySelectorAll("button[data-mode]")) {
    button.addEventListener("click", () => {
      state.mode = main.dataset.mode = button.dataset.mode;
      if (state.mode === "analysis" && state.playing) {
        state.playing = false;
        stopAnimationLoop();
      }
      for (const choice of main.querySelectorAll("button[data-mode]")) {
        choice.setAttribute("aria-pressed", String(choice === button));
      }
      updatePlayButtons();
      updateUI();
    });
  }
  syncAngleRange();
  selectChart(state.chart);
  const ro = new ResizeObserver(() => updateUI());
  ro.observe(trajCanvas.parentElement);
  ro.observe(hCanvas.parentElement);
  ro.observe(rCanvas.parentElement);

  updatePlayButtons();
  updateUI();
