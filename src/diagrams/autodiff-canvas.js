// src/diagrams/autodiff-canvas.js
export function initAutodiffDiagram(canvas) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width  = 560;
  const H = canvas.height = 220;

  const nodes = [
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

  const byId = Object.fromEntries(nodes.map(n => [n.id, n]));

  const backwardOrder = [
    ['add', 'loss'],
    ['mul', 'add'], ['b', 'add'],
    ['x', 'mul'],   ['w', 'mul'],
  ];

  let step = -1;
  let litEdges = new Set();

  function draw() {
    ctx.clearRect(0, 0, W, H);

    for (const e of edges) {
      const a = byId[e.from], b = byId[e.to];
      const key = `${e.from}-${e.to}`;
      const lit = litEdges.has(key);
      ctx.beginPath();
      ctx.moveTo(a.x + 22, a.y);
      ctx.lineTo(b.x - 22, b.y);
      ctx.strokeStyle = lit ? '#7ec8e3' : '#333';
      ctx.lineWidth = lit ? 2 : 1;
      ctx.stroke();

      const dx = b.x - 22 - (a.x + 22);
      const dy = b.y - a.y;
      const angle = Math.atan2(dy, dx);
      const ax = b.x - 22, ay = b.y;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - 8 * Math.cos(angle - 0.4), ay - 8 * Math.sin(angle - 0.4));
      ctx.lineTo(ax - 8 * Math.cos(angle + 0.4), ay - 8 * Math.sin(angle + 0.4));
      ctx.closePath();
      ctx.fillStyle = lit ? '#7ec8e3' : '#333';
      ctx.fill();
    }

    for (const n of nodes) {
      const isLeaf = n.id === 'x' || n.id === 'w' || n.id === 'b';
      const isLoss = n.id === 'loss';
      ctx.beginPath();
      ctx.arc(n.x, n.y, 20, 0, Math.PI * 2);
      ctx.fillStyle = isLoss ? '#1a3a1a' : isLeaf ? '#1a1a2e' : '#1e1e1e';
      ctx.fill();
      ctx.strokeStyle = isLoss ? '#4caf50' : '#444';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#ccc';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(n.label, n.x, n.y);
    }

    ctx.fillStyle = '#555';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('input', 60, 100);
    ctx.fillText('weight', 60, 180);
    ctx.fillText('bias', 200, 220);

    ctx.fillStyle = '#444';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(step < 0 ? 'Forward pass →' : `Backward pass (step ${step + 1}/${backwardOrder.length})`, 8, 16);
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
}
