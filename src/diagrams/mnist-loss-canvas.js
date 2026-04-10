// src/diagrams/mnist-loss-canvas.js
export function initMNISTLossCurve(canvas) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  // Responsive sizing
  function getSize() {
    const containerW = canvas.parentElement.clientWidth - 32;
    const W = Math.max(320, Math.min(560, containerW));
    const H = Math.round(W * (240 / 560));
    return { W, H };
  }

  let { W, H } = getSize();

  function setupCanvas() {
    ({ W, H } = getSize());
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Actual training data
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

  function getPad() {
    return {
      l: Math.round(W * 55 / 560),
      r: Math.round(W * 55 / 560),
      t: Math.round(H * 25 / 240),
      b: Math.round(H * 40 / 240),
    };
  }

  function toX(epoch) {
    const PAD = getPad();
    return PAD.l + (epoch / 9) * (W - PAD.l - PAD.r);
  }
  function toLossY(loss) {
    const PAD = getPad();
    return PAD.t + (1 - (loss / 0.30)) * (H - PAD.t - PAD.b);
  }
  function toAccY(acc) {
    const PAD = getPad();
    return PAD.t + (1 - ((acc - 95) / 4)) * (H - PAD.t - PAD.b);
  }

  let revealedEpochs = 0; // animate: how many epochs are revealed

  function draw() {
    setupCanvas();
    const PAD = getPad();
    const PW = W - PAD.l - PAD.r;
    const PH = H - PAD.t - PAD.b;
    const fontSize = Math.round(W * 10 / 560);

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

    // Loss curve (orange) — animated
    const visibleEpochs = Math.min(revealedEpochs, epochs.length);
    if (visibleEpochs > 0) {
      ctx.beginPath();
      ctx.strokeStyle = '#e87e3e';
      ctx.lineWidth = 2;
      for (let i = 0; i < visibleEpochs; i++) {
        const x = toX(epochs[i]), y = toLossY(losses[i]);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Loss dots
      for (let i = 0; i < visibleEpochs; i++) {
        ctx.beginPath();
        ctx.arc(toX(epochs[i]), toLossY(losses[i]), 3, 0, Math.PI * 2);
        ctx.fillStyle = '#e87e3e';
        ctx.fill();
      }
    }

    // Accuracy curve (accent blue) — animated, only at measured epochs
    const visibleAcc = accData.filter(d => d.epoch < revealedEpochs);
    if (visibleAcc.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = '#7ec8e3';
      ctx.lineWidth = 2;
      visibleAcc.forEach(({ epoch, acc }, i) => {
        const x = toX(epoch), y = toAccY(acc);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Accuracy dots
      visibleAcc.forEach(({ epoch, acc }) => {
        ctx.beginPath();
        ctx.arc(toX(epoch), toAccY(acc), 4, 0, Math.PI * 2);
        ctx.fillStyle = '#7ec8e3';
        ctx.fill();
      });

      // Label on latest accuracy point
      const latest = visibleAcc[visibleAcc.length - 1];
      ctx.fillStyle = '#7ec8e3';
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.textAlign = 'left';
      ctx.fillText(`${latest.acc}%`, toX(latest.epoch) + 8, toAccY(latest.acc) - 6);
    }

    // X axis labels
    ctx.fillStyle = '#555';
    ctx.font = `${fontSize}px monospace`;
    ctx.textAlign = 'center';
    epochs.forEach(ep => {
      ctx.fillText(ep, toX(ep), H - Math.round(H * 10 / 240));
    });
    ctx.fillText('epoch', PAD.l + PW / 2, H - 1);

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
    ctx.font = `${fontSize}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#e87e3e';
    ctx.fillText('── loss', PAD.l + 8, PAD.t + Math.round(H * 14 / 240));
    ctx.fillStyle = '#7ec8e3';
    ctx.fillText('── test acc', PAD.l + Math.round(W * 70 / 560), PAD.t + Math.round(H * 14 / 240));

    // Status
    if (revealedEpochs <= epochs.length) {
      ctx.fillStyle = '#444';
      ctx.textAlign = 'right';
      ctx.fillText(
        revealedEpochs >= epochs.length ? 'training complete ✓' : `epoch ${Math.max(0, revealedEpochs - 1)}...`,
        PAD.l + PW - 4,
        PAD.t + Math.round(H * 14 / 240)
      );
    }
  }

  draw();

  // Animate: reveal one epoch at a time
  function startAnimation() {
    revealedEpochs = 0;
    draw();

    const timer = setInterval(() => {
      revealedEpochs++;
      draw();
      if (revealedEpochs > epochs.length) {
        clearInterval(timer);
        // Restart after pause
        setTimeout(startAnimation, 3000);
      }
    }, 500);
  }

  startAnimation();

  window.addEventListener('resize', () => {
    draw();
  });
}
