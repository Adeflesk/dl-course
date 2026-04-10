// src/diagrams/autodiff-canvas.js
export function initAutodiffDiagram(canvas) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  // Responsive sizing
  function getSize() {
    const containerW = canvas.parentElement.clientWidth - 32; // account for padding
    const W = Math.max(320, Math.min(560, containerW));
    const H = Math.round(W * (220 / 560));
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

  // Scale factor relative to base 560px design
  function s(val) { return val * (W / 560); }

  const baseNodes = [
    { id: 'x',    label: 'x',    x: 60,  y: 80  },
    { id: 'w',    label: 'w',    x: 60,  y: 160 },
    { id: 'mul',  label: '×',    x: 200, y: 120 },
    { id: 'b',    label: 'b',    x: 200, y: 200 },
    { id: 'add',  label: '+',    x: 340, y: 140 },
    { id: 'loss', label: 'loss', x: 480, y: 140 },
  ];

  const edges = [
    { from: 'x',   to: 'mul'  },
    { from: 'w',   to: 'mul'  },
    { from: 'mul', to: 'add'  },
    { from: 'b',   to: 'add'  },
    { from: 'add', to: 'loss' },
  ];

  function getNodes() {
    return baseNodes.map(n => ({
      ...n,
      x: s(n.x),
      y: s(n.y),
    }));
  }

  const backwardOrder = [
    ['add', 'loss'],
    ['mul', 'add'], ['b', 'add'],
    ['x', 'mul'],   ['w', 'mul'],
  ];

  let step = -1;
  let litEdges = new Set();

  function draw() {
    setupCanvas();
    const nodes = getNodes();
    const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
    const R = s(20);

    ctx.clearRect(0, 0, W, H);

    // Draw forward edges
    for (const e of edges) {
      const a = byId[e.from], b = byId[e.to];
      const key = `${e.from}-${e.to}`;
      const lit = litEdges.has(key);

      ctx.beginPath();
      ctx.moveTo(a.x + R + 2, a.y);
      ctx.lineTo(b.x - R - 2, b.y);
      ctx.strokeStyle = lit ? '#333' : '#333';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Forward arrow head
      if (!lit) {
        const dx = (b.x - R - 2) - (a.x + R + 2);
        const dy = b.y - a.y;
        const angle = Math.atan2(dy, dx);
        const ax = b.x - R - 2, ay = b.y;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - s(8) * Math.cos(angle - 0.4), ay - s(8) * Math.sin(angle - 0.4));
        ctx.lineTo(ax - s(8) * Math.cos(angle + 0.4), ay - s(8) * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fillStyle = '#333';
        ctx.fill();
      }
    }

    // Draw backward (gradient) arrows for lit edges
    for (const e of edges) {
      const key = `${e.from}-${e.to}`;
      if (!litEdges.has(key)) continue;

      const a = byId[e.from], b = byId[e.to];

      // Backward arrow: from b toward a (gradient direction), offset slightly above
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const nx = -dy / len * s(5);
      const ny = dx / len * s(5);

      const startX = b.x - R - 2 + nx;
      const startY = b.y + ny - s(3);
      const endX = a.x + R + 2 + nx;
      const endY = a.y + ny - s(3);

      ctx.beginPath();
      ctx.setLineDash([s(4), s(3)]);
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = '#7ec8e3';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);

      // Backward arrow head (pointing toward 'from' node)
      const angle = Math.atan2(endY - startY, endX - startX);
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(endX - s(8) * Math.cos(angle - 0.4), endY - s(8) * Math.sin(angle - 0.4));
      ctx.lineTo(endX - s(8) * Math.cos(angle + 0.4), endY - s(8) * Math.sin(angle + 0.4));
      ctx.closePath();
      ctx.fillStyle = '#7ec8e3';
      ctx.fill();
    }

    // Draw nodes
    for (const n of nodes) {
      const isLeaf = n.id === 'x' || n.id === 'w' || n.id === 'b';
      const isLoss = n.id === 'loss';
      ctx.beginPath();
      ctx.arc(n.x, n.y, R, 0, Math.PI * 2);
      ctx.fillStyle = isLoss ? '#1a3a1a' : isLeaf ? '#1a1a2e' : '#1e1e1e';
      ctx.fill();
      ctx.strokeStyle = isLoss ? '#4caf50' : '#444';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#ccc';
      ctx.font = `bold ${Math.round(s(13))}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(n.label, n.x, n.y);
    }

    // Sublabels
    ctx.fillStyle = '#555';
    ctx.font = `${Math.round(s(10))}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('input', s(60), s(55));
    ctx.fillText('weight', s(60), s(185));
    ctx.fillText('bias', s(200), s(220));

    // Status text
    ctx.fillStyle = '#444';
    ctx.font = `${Math.round(s(11))}px monospace`;
    ctx.textAlign = 'left';
    if (step < 0) {
      ctx.fillText('Forward pass →  (click to step backward)', s(8), s(16));
    } else {
      ctx.fillStyle = '#7ec8e3';
      ctx.fillText(`← Backward pass (step ${step + 1}/${backwardOrder.length})`, s(8), s(16));
    }
  }

  function tick() {
    step++;
    if (step < backwardOrder.length) {
      const [from, to] = backwardOrder[step];
      litEdges.add(`${from}-${to}`);
    } else {
      step = -1;
      litEdges.clear();
    }
    draw();
  }

  draw();

  let timer = setInterval(() => {
    if (step === backwardOrder.length - 1) {
      clearInterval(timer);
      setTimeout(() => {
        step = -1;
        litEdges.clear();
        draw();
        timer = setInterval(tick, 900);
      }, 2000);
    } else {
      tick();
    }
  }, 900);

  canvas.addEventListener('click', () => {
    clearInterval(timer);
    tick();
  });

  window.addEventListener('resize', () => {
    draw();
  });
}
