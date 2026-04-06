// src/diagrams/mnist-loss-canvas.js
export function initMNISTLossCurve(canvas) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width  = 560;
  const H = canvas.height = 240;

  // Actual training data (epochs 0,2,4,6,8,9 have test acc; all have loss)
  const epochs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const losses  = [0.2661, 0.1273, 0.1021, 0.0846, 0.0797, 0.0698, 0.0655, 0.0596, 0.0579, 0.0540];
  const accData = [
    { epoch: 0, acc: 96.9 },
    { epoch: 2, acc: 97.8 },
    { epoch: 4, acc: 98.1 },
    { epoch: 6, acc: 98.0 },
    { epoch: 8, acc: 98.3 },
    { epoch: 9, acc: 98.5 },
  ];

  const PAD = { l: 55, r: 55, t: 25, b: 40 };
  const PW = W - PAD.l - PAD.r;
  const PH = H - PAD.t - PAD.b;

  function toX(epoch) { return PAD.l + (epoch / 9) * PW; }
  function toLossY(loss) { return PAD.t + (1 - (loss / 0.30)) * PH; }
  function toAccY(acc)  { return PAD.t + (1 - ((acc - 95) / 4)) * PH; }

  ctx.clearRect(0, 0, W, H);

  // Grid lines
  ctx.strokeStyle = '#1e1e1e';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = PAD.t + (i / 4) * PH;
    ctx.beginPath();
    ctx.moveTo(PAD.l, y);
    ctx.lineTo(PAD.l + PW, y);
    ctx.stroke();
  }

  // Axes
  ctx.strokeStyle = '#333';
  ctx.beginPath();
  ctx.moveTo(PAD.l, PAD.t);
  ctx.lineTo(PAD.l, PAD.t + PH);
  ctx.lineTo(PAD.l + PW, PAD.t + PH);
  ctx.stroke();

  // Right axis
  ctx.beginPath();
  ctx.moveTo(PAD.l + PW, PAD.t);
  ctx.lineTo(PAD.l + PW, PAD.t + PH);
  ctx.stroke();

  // Loss curve (orange)
  ctx.beginPath();
  ctx.strokeStyle = '#e87e3e';
  ctx.lineWidth = 2;
  epochs.forEach((ep, i) => {
    const x = toX(ep), y = toLossY(losses[i]);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Accuracy curve (accent blue) — only at measured epochs
  ctx.beginPath();
  ctx.strokeStyle = '#7ec8e3';
  ctx.lineWidth = 2;
  accData.forEach(({ epoch, acc }, i) => {
    const x = toX(epoch), y = toAccY(acc);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Dots
  accData.forEach(({ epoch, acc }) => {
    ctx.beginPath();
    ctx.arc(toX(epoch), toAccY(acc), 4, 0, Math.PI * 2);
    ctx.fillStyle = '#7ec8e3';
    ctx.fill();
  });

  // X axis labels
  ctx.fillStyle = '#555';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  epochs.forEach(ep => {
    ctx.fillText(ep, toX(ep), H - 10);
  });
  ctx.fillText('epoch', PAD.l + PW / 2, H - 0);

  // Left axis labels (loss)
  ctx.textAlign = 'right';
  [0, 0.10, 0.20, 0.30].forEach(l => {
    ctx.fillText(l.toFixed(2), PAD.l - 6, toLossY(l) + 4);
  });

  // Right axis labels (acc %)
  ctx.textAlign = 'left';
  [95, 96, 97, 98, 99].forEach(a => {
    if (a <= 100) ctx.fillText(a + '%', PAD.l + PW + 6, toAccY(a) + 4);
  });

  // Legend
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#e87e3e';
  ctx.fillText('── loss', PAD.l + 8, PAD.t + 14);
  ctx.fillStyle = '#7ec8e3';
  ctx.fillText('── test acc', PAD.l + 70, PAD.t + 14);
}
