/* A steady cross-section in canvas CSS pixels keeps the light the same width
   when the ray rotates or the display pixel density changes. */
function drawGoldenBeamHalo(ctx, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (!length) return;

  const radius = 17;
  const nx = -dy * radius / length;
  const ny = dx * radius / length;
  const glow = ctx.createLinearGradient(x1 - nx, y1 - ny, x1 + nx, y1 + ny);
  for (const [distance, color] of [
    [1, 'rgba(255,155,18,0)'],
    [0.72, 'rgba(255,163,20,0.09)'],
    [0.42, 'rgba(255,179,24,0.32)'],
    [0.20, 'rgba(255,197,40,0.76)'],
    [0.08, '#ffe16c']
  ]) {
    glow.addColorStop((1 - distance) / 2, color);
    glow.addColorStop((1 + distance) / 2, color);
  }
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineCap = 'butt';
  ctx.lineWidth = radius * 2;
  ctx.strokeStyle = glow;
  ctx.stroke();
  ctx.restore();
}
