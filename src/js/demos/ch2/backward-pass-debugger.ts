/**
 * Backward Pass Debugger for Chapter 2
 * Shows computational graph and step-by-step gradient propagation
 */

import { FUNCTIONS, FunctionType } from './derivative-visualizer';

export interface ComputationNode {
  id: string;
  label: string;
  value: number;
  gradient: number;
}

export class BackwardPassDebugger {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  padding: number = 50;

  currentX: number = 0;
  selectedFunction: FunctionType = 'x2';
  nodes: ComputationNode[] = [];

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.width = this.canvas.width;
    this.height = this.canvas.height;
  }

  /**
   * Build computation graph for the selected function
   */
  buildGraph() {
    const func = FUNCTIONS[this.selectedFunction];
    const outputValue = func.fn(this.currentX);

    this.nodes = [
      {
        id: 'input',
        label: 'x',
        value: this.currentX,
        gradient: 0,
      },
      {
        id: 'operation',
        label: this.getFunctionLabel(),
        value: outputValue,
        gradient: 0,
      },
      {
        id: 'loss',
        label: 'L',
        value: outputValue,
        gradient: 1.0, // ∂L/∂L = 1
      },
    ];
  }

  /**
   * Propagate gradients backward through the graph
   */
  backpropagate() {
    const func = FUNCTIONS[this.selectedFunction];
    const derivative = func.derivative(this.currentX);

    // ∂L/∂output = 1 (already set)
    // ∂L/∂x = ∂L/∂output * ∂output/∂x = 1 * derivative
    const nodeIndex = this.nodes.findIndex(n => n.id === 'operation');
    if (nodeIndex >= 0) {
      this.nodes[nodeIndex].gradient = derivative;
    }

    const inputIndex = this.nodes.findIndex(n => n.id === 'input');
    if (inputIndex >= 0) {
      this.nodes[inputIndex].gradient = derivative;
    }
  }

  /**
   * Draw the computational graph
   */
  drawGraph() {
    // Clear canvas
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.width, this.height);

    const nodeRadius = 45;
    const nodeY = this.height / 2;
    const spacing = (this.width - 4 * this.padding) / Math.max(this.nodes.length - 1, 1);

    // Draw nodes
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      const nodeX = this.padding * 2 + i * spacing;

      // Node circle
      this.ctx.fillStyle = '#4a90e2';
      this.ctx.beginPath();
      this.ctx.arc(nodeX, nodeY, nodeRadius, 0, Math.PI * 2);
      this.ctx.fill();

      // Node label and value
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 14px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(node.label, nodeX, nodeY - 10);

      this.ctx.font = '12px monospace';
      this.ctx.fillText(node.value.toFixed(2), nodeX, nodeY + 10);

      // Gradient annotation below node
      if (i > 0) { // Don't show gradient for input node
        this.ctx.fillStyle = '#ff6b6b';
        this.ctx.font = '11px monospace';
        this.ctx.fillText(`∂L/∂ = ${node.gradient.toFixed(4)}`, nodeX, nodeY + nodeRadius + 25);
      }

      // Edge to next node
      if (i < this.nodes.length - 1) {
        const nextX = this.padding * 2 + (i + 1) * spacing;
        this.ctx.strokeStyle = '#cccccc';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(nodeX + nodeRadius, nodeY);
        this.ctx.lineTo(nextX - nodeRadius, nodeY);
        this.ctx.stroke();

        // Forward pass label
        this.ctx.fillStyle = '#4a90e2';
        this.ctx.font = '10px sans-serif';
        this.ctx.fillText('forward', (nodeX + nextX) / 2, nodeY - 20);
      }
    }

    // Draw backward pass arrows
    for (let i = this.nodes.length - 1; i > 0; i--) {
      const fromX = this.padding * 2 + i * spacing;
      const toX = this.padding * 2 + (i - 1) * spacing;
      const arrowY = nodeY + nodeRadius + 50;

      // Backward arrow
      this.ctx.strokeStyle = '#ff6b6b';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(fromX, arrowY);
      this.ctx.lineTo(toX, arrowY);
      this.ctx.stroke();

      // Arrowhead
      const arrowSize = 8;
      this.ctx.beginPath();
      this.ctx.moveTo(toX, arrowY);
      this.ctx.lineTo(toX + arrowSize, arrowY - arrowSize);
      this.ctx.lineTo(toX + arrowSize, arrowY + arrowSize);
      this.ctx.closePath();
      this.ctx.fill();

      // Label
      this.ctx.fillStyle = '#ff6b6b';
      this.ctx.font = '10px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('backward', (fromX + toX) / 2, arrowY - 10);
    }
  }

  /**
   * Generate a readable label for the function operation
   */
  private getFunctionLabel(): string {
    switch (this.selectedFunction) {
      case 'x2': return 'Square';
      case 'sin': return 'Sin';
      case 'x3': return 'Cube';
      case 'exp': return 'Exp';
      case 'log': return 'Log';
      case 'x4': return 'x⁴';
      default: return 'Op';
    }
  }

  /**
   * Get debug table data
   */
  getTableData(): { label: string; value: string; gradient: string }[] {
    return this.nodes.map(node => ({
      label: node.label,
      value: node.value.toFixed(4),
      gradient: node.gradient.toFixed(4),
    }));
  }
}
