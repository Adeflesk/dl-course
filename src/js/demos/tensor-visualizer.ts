export class TensorVisualizer {
    private canvasId: string;
    private canvas: HTMLCanvasElement | null;
    private ctx: CanvasRenderingContext2D | null;

    constructor(canvasId: string) {
        this.canvasId = canvasId;
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.ctx = this.canvas?.getContext('2d') || null;
    }

    // Draw a tensor as a 2D grid
    drawTensor(shape: number[], data: number[]) {
        if (!this.canvas || !this.ctx) return;

        const width = this.canvas.width;
        const height = this.canvas.height;
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0, 0, width, height);

        // For 2D tensors, draw as a grid
        if (shape.length === 2) {
            const [rows, cols] = shape;
            const cellWidth = (width - 40) / cols;
            const cellHeight = (height - 40) / rows;
            const startX = 20;
            const startY = 20;

            // Draw grid lines
            this.ctx.strokeStyle = '#ddd';
            this.ctx.lineWidth = 1;
            for (let i = 0; i <= rows; i++) {
                this.ctx.beginPath();
                this.ctx.moveTo(startX, startY + i * cellHeight);
                this.ctx.lineTo(startX + cols * cellWidth, startY + i * cellHeight);
                this.ctx.stroke();
            }
            for (let j = 0; j <= cols; j++) {
                this.ctx.beginPath();
                this.ctx.moveTo(startX + j * cellWidth, startY);
                this.ctx.lineTo(startX + j * cellWidth, startY + rows * cellHeight);
                this.ctx.stroke();
            }

            // Draw cell values
            this.ctx.fillStyle = '#333';
            this.ctx.font = '14px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    const idx = i * cols + j;
                    const value = data[idx] !== undefined ? data[idx] : 0;
                    const x = startX + (j + 0.5) * cellWidth;
                    const y = startY + (i + 0.5) * cellHeight;
                    this.ctx.fillText(value.toFixed(1), x, y);
                }
            }
        } else {
            // Fallback for 1D or 3D+ tensors
            this.ctx.fillStyle = '#333';
            this.ctx.font = '14px monospace';
            this.ctx.fillText(`Shape: [${shape.join(', ')}]`, 20, 30);
            this.ctx.fillText(`Size: ${data.length}`, 20, 60);
        }
    }

    clear() {
        if (this.ctx && this.canvas) {
            this.ctx.fillStyle = '#fff';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
}
