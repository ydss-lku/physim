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
    showStrobe: true,
    showCompare: false
  };

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

  
  const thetaQuickBtns = document.getElementById("thetaQuickBtns");

  const outH = document.getElementById("outH");
  const outR = document.getElementById("outR");
  const outT = document.getElementById("outT");
  const outOptAngle = document.getElementById("outOptAngle");
  const outVx = document.getElementById("outVx");
  const outVy = document.getElementById("outVy");
  const outHRRatio = document.getElementById("outHRRatio");
  const outQuarterTan = document.getElementById("outQuarterTan");
  const hrFormulaBox = document.getElementById("hrFormulaBox");

  const livePosTag = document.getElementById("livePosTag");
  const timeLabel = document.getElementById("timeLabel");

  const btnRangePos = document.getElementById("btnRangePos");
  const btnRangeFull = document.getElementById("btnRangeFull");
  const btnLaunch = document.getElementById("btnLaunch");
  const btnSlow = document.getElementById("btnSlow");
  const btnResetDefaults = document.getElementById("btnResetDefaults");
  const btnG98 = document.getElementById("btnG98");
  const btnG10 = document.getElementById("btnG10");

  const chkStrobe = document.getElementById("chkStrobe");
  const chkCompare = document.getElementById("chkCompare");

  const trajCanvas = document.getElementById("trajCanvas");
  const hCanvas = document.getElementById("hCanvas");
  const rCanvas = document.getElementById("rCanvas");
  const hrCanvas = document.getElementById("hrCanvas");

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
    const maxH = Math.max(10, y0 + (v0 * v0) / (2 * g));
    const optRad = Math.atan(v0 / Math.sqrt(v0 * v0 + 2 * g * y0));
    const optDeg = (optRad * 180) / Math.PI;
    const optP = calcPhysics(optDeg, v0, y0, g);
    const maxR = Math.max(10, optP.R);
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
    return { ctx, w, h };
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

  function drawVectorLabel(ctx, text, x, y, color, canvasW, canvasH) {
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
    ctx.lineWidth = 1.8;
    fillRoundRect(ctx, bx, by, tw, th, 5);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, bx + tw / 2, by + th / 2 + 0.5);
    ctx.restore();
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
  let trajectoryView;
  function drawTrajectory() {
    const { ctx, w, h } = setupCanvas(trajCanvas);
    ctx.clearRect(0, 0, w, h);

    const pad = { left: 62, right: 42, top: 32, bottom: 48 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;

    const p = calcPhysics(state.theta, state.v0, state.y0, state.g);
    const env = getEnvelopeBounds(state.v0, state.y0, state.g);

    const worldMaxX = env.maxR * 1.15;
    const worldMaxY = env.maxH * 1.18;

    const scaleX = plotW / worldMaxX;
    const scaleY = plotH / worldMaxY;

    const toPxX = (x) => pad.left + x * scaleX;
    const toPxY = (y) => pad.top + plotH - y * scaleY;

    trajectoryView = { p, toPxX, toPxY };
    // 格線
    const xStep = niceStep(worldMaxX, 6);
    const yStep = niceStep(worldMaxY, 5);

    ctx.strokeStyle = chartInk.grid;
    ctx.lineWidth = 1.5;
    ctx.font = "bold 13px sans-serif";
    ctx.fillStyle = chartInk.muted;

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let x = 0; x <= worldMaxX; x += xStep) {
      const px = toPxX(x);
      ctx.beginPath();
      ctx.moveTo(px, pad.top);
      ctx.lineTo(px, pad.top + plotH);
      ctx.stroke();
      ctx.fillText(x.toFixed(0), px, pad.top + plotH + 8);
    }

    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let y = 0; y <= worldMaxY; y += yStep) {
      const py = toPxY(y);
      ctx.beginPath();
      ctx.moveTo(pad.left, py);
      ctx.lineTo(pad.left + plotW, py);
      ctx.stroke();
      ctx.fillText(y.toFixed(0), pad.left - 10, py);
    }

    ctx.fillStyle = chartInk.grid;
    ctx.fillRect(pad.left, toPxY(0), plotW, 8);

    // 主軸
    ctx.strokeStyle = chartInk.axis;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, pad.top + plotH);
    ctx.lineTo(pad.left + plotW, pad.top + plotH);
    ctx.stroke();

    ctx.fillStyle = chartInk.ink;
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("x (m)", pad.left + plotW, pad.top + plotH + 30);
    ctx.textAlign = "left";
    ctx.fillText("y (m)", pad.left - 50, pad.top - 16);

    // 高台
    if (state.y0 > 0) {
      const platTop = toPxY(state.y0);
      const platBot = toPxY(0);
      ctx.fillStyle = chartInk.grid;
      ctx.strokeStyle = chartInk.axis;
      ctx.lineWidth = 2;
      ctx.fillRect(pad.left - 22, platTop, 22, platBot - platTop);
      ctx.strokeRect(pad.left - 22, platTop, 22, platBot - platTop);
    }

    // 對照線 (+45° 參考軌跡)
    if (state.mode === "analysis" && state.showCompare && state.theta !== 45) {
      const p45 = calcPhysics(45, state.v0, state.y0, state.g);
      ctx.save();
      ctx.strokeStyle = chartInk.guide;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      for (let i = 0; i <= 80; i++) {
        const tt = (p45.T * i) / 80;
        const pt45 = posAtTime(tt, p45);
        if (i === 0) ctx.moveTo(toPxX(pt45.x), toPxY(pt45.y));
        else ctx.lineTo(toPxX(pt45.x), toPxY(pt45.y));
      }
      ctx.stroke();
      ctx.restore();
    }

    // 拋射軌跡線
    if (p.T > 0) {
      ctx.save();
      ctx.strokeStyle = state.mode === "velocity" ? chartInk.axis : chartInk.trace;
      ctx.lineWidth = state.mode === "velocity" ? 1.5 : 4.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      const steps = 120;
      for (let i = 0; i <= steps; i++) {
        const tt = (p.T * i) / steps;
        const pt = posAtTime(tt, p);
        const px = toPxX(pt.x);
        const py = toPxY(pt.y);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 等時距閃光點
    if (state.mode === "trajectory" && state.showStrobe && p.T > 0) {
      const dt = p.T / 10;
      for (let i = 0; i <= 10; i++) {
        const tt = i * dt;
        const pt = posAtTime(tt, p);
        const px = toPxX(pt.x);
        const py = toPxY(pt.y);

        if (i > 0 && p.vx > 0) {
          ctx.save();
          ctx.strokeStyle = chartInk.guide;
          ctx.lineWidth = 1.8;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px, toPxY(0));
          ctx.stroke();
          ctx.restore();
        }

        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fillStyle = chartInk.field;
        ctx.fill();
        ctx.lineWidth = 2.8;
        ctx.strokeStyle = chartInk.trace;
        ctx.stroke();
      }
    }

    // 最大高度 H 標記
    if (state.mode !== "velocity" && p.H > 0) {
      const peakX = state.theta > 0 ? p.vx * p.tPeak : 0;
      const pxPeak = toPxX(peakX);
      const pyPeak = toPxY(p.H);
      const pyGround = toPxY(0);

      ctx.save();
      ctx.strokeStyle = chartInk.measure;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(pxPeak, pyPeak);
      ctx.lineTo(pxPeak, pyGround);
      ctx.stroke();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(pxPeak, pyPeak, 6, 0, Math.PI * 2);
      ctx.fillStyle = chartInk.measure;
      ctx.fill();

      ctx.fillStyle = chartInk.measure;
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      const labelX = Math.min(pxPeak + 8, pad.left + plotW - 110);
      ctx.fillText(`H = ${p.H.toFixed(1)} m`, labelX, Math.max(pad.top + 16, pyPeak - 6));
    }

    // 水平射程 R 標記
    if (state.mode !== "velocity" && p.R > 0.1) {
      const pxEnd = toPxX(p.R);
      const pyGround = toPxY(0);

      ctx.beginPath();
      ctx.arc(pxEnd, pyGround, 6.5, 0, Math.PI * 2);
      ctx.fillStyle = chartInk.measure;
      ctx.fill();

      ctx.fillStyle = chartInk.measure;
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(`R = ${p.R.toFixed(1)} m`, Math.min(pxEnd, pad.left + plotW - 48), pyGround - 10);
    }

    // 發射角度參考弧線
    const startX = toPxX(0);
    const startY = toPxY(state.y0);
    ctx.save();
    ctx.strokeStyle = chartInk.axis;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + 60, startY);
    ctx.stroke();
    ctx.restore();

    if (state.theta !== 0) {
      const rad = (state.theta * Math.PI) / 180;
      ctx.save();
      ctx.strokeStyle = chartInk.trace;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(startX, startY, 36, 0, -rad, state.theta > 0);
      ctx.stroke();
      ctx.restore();
    }

    // 目前球體位置與加長速度向量
    const curT = Math.min(state.t, p.T);
    const cur = posAtTime(curT, p);
    const ballPxX = toPxX(cur.x);
    const ballPxY = toPxY(cur.y);

    if (state.mode === "velocity") {
      const vImpact = Math.sqrt(state.v0 * state.v0 + 2 * state.g * state.y0);
      const vRef = Math.max(state.v0, vImpact * 0.78);
      const targetLenPx = Math.min(plotW, plotH) * 0.36;
      const vScale = targetLenPx / vRef;

      const tipX = ballPxX + cur.vx * vScale;
      const tipY = ballPxY - cur.vy * vScale;

      const horizontalOnly = Math.abs(cur.vy) < 1e-9;
      const verticalOnly = Math.abs(cur.vx) < 1e-9;
      if (Math.abs(cur.vx) > 0.2 && Math.abs(cur.vy) > 0.2) {
        ctx.save();
        ctx.strokeStyle = chartInk.guide;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(tipX, ballPxY);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(ballPxX, tipY);
        ctx.stroke();
        ctx.restore();
      }

      if (!horizontalOnly && Math.abs(cur.vx) > 0.1) {
        drawArrow(ctx, ballPxX, ballPxY, tipX, ballPxY, chartInk.component, 2.5, 12, [9, 5]);
        const lblY = cur.vy >= 0 ? ballPxY + 20 : ballPxY - 20;
        drawVectorLabel(ctx, `vₓ=${cur.vx.toFixed(1)}`, (ballPxX + tipX) / 2, lblY, chartInk.component, w, h);
      }

      if (!verticalOnly && Math.abs(cur.vy) > 0.1) {
        drawArrow(ctx, ballPxX, ballPxY, ballPxX, tipY, chartInk.component, 2.5, 12, [2, 4]);
        drawVectorLabel(ctx, `vᵧ=${cur.vy.toFixed(1)}`, ballPxX - 42, (ballPxY + tipY) / 2, chartInk.component, w, h);
      }

      const vTotal = Math.hypot(cur.vx, cur.vy);
      if (vTotal > 0.1) {
        drawArrow(ctx, ballPxX, ballPxY, tipX, tipY, chartInk.trace, 5.5, 17);
        const offsetX = cur.vx >= 0 ? 18 : -18;
        const offsetY = cur.vy >= 0 ? -16 : 16;
        const name = horizontalOnly ? "v = vₓ" : verticalOnly ? (cur.vy < 0 ? "v = |vᵧ|" : "v = vᵧ") : "v";
        drawVectorLabel(ctx, `${name}=${vTotal.toFixed(1)}`, tipX + offsetX, tipY + offsetY, chartInk.trace, w, h);
      }
      if (horizontalOnly || verticalOnly) {
        const zero = horizontalOnly && verticalOnly ? "vₓ = vᵧ = 0" : horizontalOnly ? "vᵧ = 0" : "vₓ = 0";
        drawVectorLabel(ctx, zero, ballPxX - 40, ballPxY + 19, chartInk.component, w, h);
      }
    }

    // 拋體球本體
    ctx.beginPath();
    ctx.arc(ballPxX, ballPxY, 10.5, 0, Math.PI * 2);
    ctx.fillStyle = chartInk.ink;
    ctx.fill();
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = chartInk.ink;
    ctx.stroke();

    if (state.mode === "velocity") {
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      ctx.fillStyle = chartInk.component;
      ctx.fillText("m/s", w - 16, 10);
    }
  }

  // ====== 2. 繪製 H(θ) 與 R(θ) 圖表 ======
  function drawAngleChart(canvas, type) {
    const { ctx, w, h } = setupCanvas(canvas);
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
    ctx.lineWidth = 1.5;
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
      ctx.fillText(y.toFixed(0), pad.left - 7, py);
    }

    if (minDeg < 0) {
      ctx.save();
      ctx.strokeStyle = chartInk.guide;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(toPxX(0), pad.top);
      ctx.lineTo(toPxX(0), pad.top + plotH);
      ctx.stroke();
      ctx.restore();
    }

    ctx.strokeStyle = chartInk.axis;
    ctx.lineWidth = 2.6;
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
    ctx.lineWidth = 4.5;
    ctx.lineJoin = "round";
    ctx.stroke();

    if (!isH && env.optDeg >= minDeg && env.optDeg <= maxDeg) {
      const optP = calcPhysics(env.optDeg, state.v0, state.y0, state.g);
      const ox = toPxX(env.optDeg);
      const oy = toPxY(optP.R);
      ctx.save();
      ctx.strokeStyle = chartInk.trace;
      ctx.lineWidth = 2;
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
    ctx.lineWidth = 1.6;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(cx, pad.top);
    ctx.lineTo(cx, pad.top + plotH);
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, cy, 7.5, 0, Math.PI * 2);
    ctx.fillStyle = chartInk.field;
    ctx.fill();
    ctx.lineWidth = 3.8;
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

  // ====== 3. 繪製 H 與 R 關係圖 (H vs R) ======
  let hrCurvePoints = [];
  function drawHRChart() {
    const { ctx, w, h } = setupCanvas(hrCanvas);
    ctx.clearRect(0, 0, w, h);

    const pad = { left: 52, right: 22, top: 24, bottom: 42 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;

    const env = getEnvelopeBounds(state.v0, state.y0, state.g);
    const maxR = env.maxR * 1.15;
    const maxH = env.maxH * 1.15;

    const toPxX = (r) => pad.left + (r / maxR) * plotW;
    const toPxY = (heightVal) => pad.top + plotH - (heightVal / maxH) * plotH;

    ctx.strokeStyle = chartInk.grid;
    ctx.lineWidth = 1.5;
    ctx.font = "bold 11.5px sans-serif";
    ctx.fillStyle = chartInk.muted;

    const xStep = niceStep(maxR, 4);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let x = 0; x <= maxR; x += xStep) {
      const px = toPxX(x);
      ctx.beginPath();
      ctx.moveTo(px, pad.top);
      ctx.lineTo(px, pad.top + plotH);
      ctx.stroke();
      ctx.fillText(x.toFixed(0), px, pad.top + plotH + 7);
    }

    const yStep = niceStep(maxH, 4);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let y = 0; y <= maxH; y += yStep) {
      const py = toPxY(y);
      ctx.beginPath();
      ctx.moveTo(pad.left, py);
      ctx.lineTo(pad.left + plotW, py);
      ctx.stroke();
      ctx.fillText(y.toFixed(0), pad.left - 7, py);
    }

    ctx.strokeStyle = chartInk.axis;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, pad.top + plotH);
    ctx.lineTo(pad.left + plotW, pad.top + plotH);
    ctx.stroke();

    ctx.fillStyle = chartInk.ink;
    ctx.font = "bold 12.5px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("R (m)", pad.left + plotW, pad.top + plotH + 24);
    ctx.textAlign = "left";
    ctx.fillText("H (m)", pad.left - 42, pad.top - 13);

    hrCurvePoints = [];
    for (let deg = state.minTheta; deg <= state.maxTheta; deg += 0.5) {
      const p = calcPhysics(deg, state.v0, state.y0, state.g);
      hrCurvePoints.push({
        deg,
        R: p.R,
        H: p.H,
        px: toPxX(p.R),
        py: toPxY(p.H)
      });
    }

    ctx.beginPath();
    for (let i = 0; i < hrCurvePoints.length; i++) {
      if (i === 0) ctx.moveTo(hrCurvePoints[i].px, hrCurvePoints[i].py);
      else ctx.lineTo(hrCurvePoints[i].px, hrCurvePoints[i].py);
    }
    ctx.strokeStyle = chartInk.trace;
    ctx.lineWidth = 4.5;
    ctx.lineJoin = "round";
    ctx.stroke();

    const p0 = calcPhysics(0, state.v0, state.y0, state.g);
    const pOpt = calcPhysics(env.optDeg, state.v0, state.y0, state.g);
    const p90 = calcPhysics(90, state.v0, state.y0, state.g);

    ctx.font = "bold 11px sans-serif";

    ctx.beginPath();
    ctx.arc(toPxX(pOpt.R), toPxY(pOpt.H), 4.5, 0, Math.PI * 2);
    ctx.fillStyle = chartInk.measure;
    ctx.fill();
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText(`θ*=${env.optDeg.toFixed(0)}° (Rₘₐₓ)`, toPxX(pOpt.R) - 6, toPxY(pOpt.H) - 4);

    ctx.beginPath();
    ctx.arc(toPxX(p0.R), toPxY(p0.H), 4.5, 0, Math.PI * 2);
    ctx.fillStyle = chartInk.trace;
    ctx.fill();
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText("0°", toPxX(p0.R) + 6, toPxY(p0.H) - 3);

    ctx.beginPath();
    ctx.arc(toPxX(p90.R), toPxY(p90.H), 4.5, 0, Math.PI * 2);
    ctx.fillStyle = chartInk.measure;
    ctx.fill();
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("+90° (Hₘₐₓ)", toPxX(p90.R) + 7, toPxY(p90.H) + 2);

    const curP = calcPhysics(state.theta, state.v0, state.y0, state.g);
    const cx = toPxX(curP.R);
    const cy = toPxY(curP.H);

    if (state.y0 === 0 && curP.R > 0.2) {
      ctx.save();
      ctx.strokeStyle = chartInk.ink;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(toPxX(0), toPxY(0));
      ctx.lineTo(cx, cy);
      ctx.stroke();
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(cx, cy, 7.5, 0, Math.PI * 2);
    ctx.fillStyle = chartInk.field;
    ctx.fill();
    ctx.lineWidth = 3.8;
    ctx.strokeStyle = chartInk.ink;
    ctx.stroke();

    const tagText = `R=${curP.R.toFixed(1)}, H=${curP.H.toFixed(1)}`;
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

  // ====== 角度控制按鈕 ======
  function rebuildAngleControls() {
    sliderTheta.min = state.minTheta;
    sliderTheta.max = state.maxTheta;
    if (state.theta < state.minTheta) state.theta = state.minTheta;
    if (state.theta > state.maxTheta) state.theta = state.maxTheta;
    sliderTheta.value = state.theta;

    if (state.minTheta === 0) {

      const presets = [0, 15, 30, 45, 60, 75, 90];
      thetaQuickBtns.innerHTML = presets.map(d =>
        `<button class="btn-mini" data-theta="${d}">${d > 0 ? "+" + d : d}°</button>`
      ).join("");
    } else {

      const presets = [-90, -45, 0, 30, 45, 60, 90];
      thetaQuickBtns.innerHTML = presets.map(d =>
        `<button class="btn-mini" data-theta="${d}">${d > 0 ? "+" + d : d}°</button>`
      ).join("");
    }

    thetaQuickBtns.querySelectorAll("[data-theta]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.theta = parseInt(btn.dataset.theta, 10);
        sliderTheta.value = state.theta;
        onParamChanged();
      });
    });
  }

  // ====== 更新按鈕狀態 ======
  function updatePlayButtons() {
    const p = calcPhysics(state.theta, state.v0, state.y0, state.g);
    btnLaunch.disabled = p.T <= 0;
    const label = state.playing ? labLanguage.pick("Pause","暫停")
      : state.t >= p.T && p.T > 0 ? labLanguage.pick("Replay","重播")
      : state.t > 0 ? labLanguage.pick("Resume","繼續") : labLanguage.pick("Play","播放");
    btnLaunch.title = label;
    btnLaunch.setAttribute("aria-label", label);
    btnLaunch.querySelector("path").setAttribute("d", state.playing ? "M8 5v14 M16 5v14" : "M6 4l14 8-14 8z");

  }

  // ====== 更新介面數據與重繪 ======
  function updateUI() {
    valTheta.textContent = `${state.theta > 0 ? "+" : ""}${state.theta}°`;
    valV0.textContent = `${state.v0} m/s`;
    valY0.textContent = `${state.y0} m`;

    const p = calcPhysics(state.theta, state.v0, state.y0, state.g);

    outH.textContent = `${p.H.toFixed(2)} m`;
    outR.textContent = `${p.R.toFixed(2)} m`;
    outT.textContent = `${p.T.toFixed(2)} s`;
    outOptAngle.textContent = `${p.optDeg.toFixed(1)}°`;
    outVx.textContent = `${p.vx.toFixed(2)} m/s`;
    outVy.textContent = `${(p.vy0 - state.g * state.t).toFixed(2)} m/s`;

    outHRRatio.textContent = p.R > 1e-9 ? (p.H / p.R).toFixed(3) : "—";
    outQuarterTan.hidden = !(state.y0 === 0 && p.R > 1e-9);
    outQuarterTan.textContent = " = ¼ tan θ";
    hrFormulaBox.textContent = state.theta > 0
      ? "H = y₀ + (v₀ sin θ)² / (2g)"
      : "H = y₀";
    const ratio = p.T > 0 ? Math.min(1, state.t / p.T) : 0;
    sliderTime.value = ratio;
    const curT = p.T > 0 ? Math.min(state.t, p.T) : 0;
    const cur = posAtTime(curT, p);

    timeLabel.textContent = `${curT.toFixed(2)} / ${p.T.toFixed(2)} s`;
    livePosTag.textContent = `t = ${curT.toFixed(2)} s ｜ x = ${cur.x.toFixed(1)} m, y = ${cur.y.toFixed(1)} m`;

    drawTrajectory();
    if (state.mode === "analysis") {
      if (state.chart === "hr") drawHRChart();
      else if (state.chart === "r") drawAngleChart(rCanvas, "R");
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

  function onParamChanged() {
    state.playing = false;
    stopAnimationLoop();
    state.t = 0;
    updatePlayButtons();
    updateUI();
  }

  // ====== 事件綁定 ======
  btnRangePos.addEventListener("click", () => {
    state.minTheta = 0;
    state.maxTheta = 90;
    btnRangePos.classList.add("active");
    btnRangeFull.classList.remove("active");
    rebuildAngleControls();
    onParamChanged();
  });

  btnRangeFull.addEventListener("click", () => {
    state.minTheta = -90;
    state.maxTheta = 90;
    btnRangeFull.classList.add("active");
    btnRangePos.classList.remove("active");
    rebuildAngleControls();
    onParamChanged();
  });

  sliderTheta.addEventListener("input", (e) => {
    state.theta = parseInt(e.target.value, 10);
    onParamChanged();
  });

  sliderV0.addEventListener("input", (e) => {
    state.v0 = parseInt(e.target.value, 10);
    onParamChanged();
  });

  sliderY0.addEventListener("input", (e) => {
    state.y0 = parseInt(e.target.value, 10);
    onParamChanged();
  });

  sliderTime.addEventListener("input", (e) => {
    state.playing = false;
    stopAnimationLoop();
    const p = calcPhysics(state.theta, state.v0, state.y0, state.g);
    state.t = parseFloat(e.target.value) * p.T;
    updatePlayButtons();
    updateUI();
  });

  document.querySelectorAll("[data-y0]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.y0 = parseInt(btn.dataset.y0, 10);
      sliderY0.value = state.y0;
      onParamChanged();
    });
  });

  function setG(val) {
    state.g = val;
    btnG98.classList.toggle("active", val === 9.8);
    btnG10.classList.toggle("active", val === 10);
    onParamChanged();
  }

  btnG98.addEventListener("click", () => setG(9.8));
  btnG10.addEventListener("click", () => setG(10));

  btnLaunch.addEventListener("click", togglePauseResume);


  btnSlow.addEventListener("click", () => {
    state.speedFactor = state.speedFactor === 1.0 ? 0.5 : 1.0;
    btnSlow.textContent = state.speedFactor === 1.0 ? "1×" : "½×";
  });

  btnResetDefaults.addEventListener("click", () => {
    state.minTheta = 0;
    state.maxTheta = 90;
    state.theta = 45;
    state.v0 = 20;
    state.y0 = 0;
    btnRangePos.classList.add("active");
    btnRangeFull.classList.remove("active");
    rebuildAngleControls();
    sliderV0.value = 20;
    sliderY0.value = 0;
    setG(9.8);
  });

  chkStrobe.addEventListener("change", (e) => { state.showStrobe = e.target.checked; updateUI(); });
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
      const t = p.T * step / 500;
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
  let graphPress;
  trajCanvas.addEventListener("pointerdown", event => {
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
    if (graphPress?.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - graphPress.x, event.clientY - graphPress.y) >= 3) graphPress.dragging = true;
    if (graphPress.dragging) seekTrajectory(event);
  });
  trajCanvas.addEventListener("lostpointercapture", () => { graphPress = null; });

  function bindAngleChartScrub(canvas) {
    let dragging = false;
    function updateFromPointer(clientX) {
      const rect = canvas.getBoundingClientRect();
      const padLeft = 52;
      const padRight = 20;
      const plotW = rect.width - padLeft - padRight;
      const frac = Math.max(0, Math.min(1, (clientX - rect.left - padLeft) / plotW));
      const newTheta = Math.round(state.minTheta + frac * (state.maxTheta - state.minTheta));
      if (newTheta !== state.theta) {
        state.theta = newTheta;
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

  function bindHRChartScrub(canvas) {
    let dragging = false;
    function updateFromPointer(clientX, clientY) {
      if (!hrCurvePoints.length) return;
      const rect = canvas.getBoundingClientRect();
      const mx = clientX - rect.left;
      const my = clientY - rect.top;
      let bestDeg = state.theta;
      let bestDist = Infinity;
      for (const pt of hrCurvePoints) {
        const d = (pt.px - mx) ** 2 + (pt.py - my) ** 2;
        if (d < bestDist) {
          bestDist = d;
          bestDeg = Math.round(pt.deg);
        }
      }
      if (bestDeg !== state.theta) {
        state.theta = bestDeg;
        sliderTheta.value = bestDeg;
        onParamChanged();
      }
    }

    canvas.addEventListener("pointerdown", (e) => {
      dragging = true;
      canvas.setPointerCapture(e.pointerId);
      updateFromPointer(e.clientX, e.clientY);
    });
    canvas.addEventListener("pointermove", (e) => { if (dragging) updateFromPointer(e.clientX, e.clientY); });
    canvas.addEventListener("pointerup", () => { dragging = false; });
    canvas.addEventListener("pointercancel", () => { dragging = false; });
  }

  bindAngleChartScrub(hCanvas);
  bindAngleChartScrub(rCanvas);
  bindHRChartScrub(hrCanvas);

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
  selectChart(state.chart);
  const ro = new ResizeObserver(() => updateUI());
  ro.observe(trajCanvas.parentElement);
  ro.observe(hCanvas.parentElement);
  ro.observe(rCanvas.parentElement);
  ro.observe(hrCanvas.parentElement);

  rebuildAngleControls();
  updatePlayButtons();
  updateUI();
