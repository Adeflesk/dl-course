// src/diagrams/gradient-descent-canvas.js
export function initGradientDescentDiagram(canvas) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width  = 560;
  const H = canvas.height = 260;

  // Loss function: L(w) = 0.5*(w-2)^2 + 0.1 (1D parabola)
  const lossMin = 2.0;   // w* = 2
  function loss(w) { return 0.5 * (w - lossMin) ** 2 + 0.1; }
  function dloss(w) { return w - lossMin; }

  const PAD_L = 60, PAD_R = 40, PAD_T = 30, PAD_B = 50;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const wMin = -2, wMax = 6;
  const lMin = 0, lMax = 8.5;

  function toScreen(w, l) {
    return {
      x: PAD_L + (w - wMin) / (wMax - wMin) * plotW,
      y: PAD_T + (1 - (l - lMin) / (lMax - lMin)) * plotH,
    };
  }

  // SGD with lr=0.3
  const lr = 0.3;
  let w = -1.5;
  const history = [{ w, l: loss(w) }];
  for (let i = 0; i < 12; i++) {
    w = w - lr * dloss(w);
    history.push({ w, l: loss(w) });
  }

  let frame = 0;

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD_L, PAD_T);
    ctx.lineTo(PAD_L, PAD_T + plotH);
    ctx.lineTo(PAD_L + plotW, PAD_T + plotH);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#555';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('weight value \u2192', PAD_L + plotW / 2, H - 8);
    ctx.save();
    ctx.translate(14, PAD_T + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('loss \u2192', 0, 0);
    ctx.restore();

    // Draw loss curve
    ctx.beginPath();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 200; i++) {
      const ww = wMin + (wMax - wMin) * i / 200;
      const { x, y } = toScreen(ww, loss(ww));
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw gradient descent steps up to current frame
    const steps = Math.min(frame, history.length - 1);
    for (let i = 0; i < steps; i++) {
      const a = toScreen(history[i].w, history[i].l);
      const b = toScreen(history[i + 1].w, history[i + 1].l);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = '#7ec8e3';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Dot at previous position
      ctx.beginPath();
      ctx.arc(a.x, a.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? '#e87e3e' : '#7ec8e3';
      ctx.fill();
    }

    // Current position dot
    const cur = toScreen(history[steps].w, history[steps].l);
    ctx.beginPath();
    ctx.arc(cur.x, cur.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = steps === history.length - 1 ? '#4caf50' : '#fff';
    ctx.fill();

    // Label
    ctx.fillStyle = '#555';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    const done = steps === history.length - 1;
    ctx.fillText(done ? 'converged \u2713' : `step ${steps} / ${history.length - 1}  lr=${lr}`, PAD_L + 4, PAD_T + 14);
  }

  draw();

  let timer = setInterval(() => {
    if (frame < history.length - 1) {
      frame++;
      draw();
    } else {
      clearInterval(timer);
      setTimeout(() => {
        frame = 0;
        draw();
        timer = setInterval(() => {
          if (frame < history.length - 1) { frame++; draw(); }
          else { clearInterval(timer); }
        }, 400);
      }, 2500);
    }
  }, 400);

  canvas.addEventListener('click', () => {
    clearInterval(timer);
    frame = (frame + 1) % history.length;
    draw();
  });
}
