export type FunctionType = 'x2' | 'sin' | 'x3' | 'exp' | 'log' | 'x4';

export interface FunctionDef {
    name: string;
    fn: (x: number) => number;
    derivative: (x: number) => number;
    domain: [number, number];
}

export const FUNCTIONS: Record<FunctionType, FunctionDef> = {
    x2: {
        name: 'f(x) = x²',
        fn: (x) => x * x,
        derivative: (x) => 2 * x,
        domain: [-5, 5],
    },
    sin: {
        name: 'f(x) = sin(x)',
        fn: (x) => Math.sin(x),
        derivative: (x) => Math.cos(x),
        domain: [-2 * Math.PI, 2 * Math.PI],
    },
    x3: {
        name: 'f(x) = x³',
        fn: (x) => x * x * x,
        derivative: (x) => 3 * x * x,
        domain: [-3, 3],
    },
    exp: {
        name: 'f(x) = eˣ',
        fn: (x) => Math.exp(x),
        derivative: (x) => Math.exp(x),
        domain: [-2, 2],
    },
    log: {
        name: 'f(x) = ln(x)',
        fn: (x) => Math.log(x),
        derivative: (x) => 1 / x,
        domain: [0.1, 5],
    },
    x4: {
        name: 'f(x) = x⁴',
        fn: (x) => x * x * x * x,
        derivative: (x) => 4 * x * x * x,
        domain: [-3, 3],
    },
};

export class DerivativeVisualizer {
    private canvas: HTMLCanvasElement | null;
    private ctx: CanvasRenderingContext2D | null;
    width: number;
    height: number;
    padding: number;
    currentX: number;
    selectedFunction: FunctionType;

    constructor(canvasId: string) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.ctx = this.canvas?.getContext('2d') || null;
        this.width = this.canvas?.width || 600;
        this.height = this.canvas?.height || 400;
        this.padding = 40;
        this.currentX = 0;
        this.selectedFunction = 'x2';
    }

    /**
     * Normalize a value from domain range to [0, 1]
     */
    private normalize(value: number, min: number, max: number): number {
        return (value - min) / (max - min);
    }

    /**
     * Convert domain x-coordinate to canvas x-coordinate
     */
    private canvasX(x: number, domainMin: number, domainMax: number): number {
        const normalized = this.normalize(x, domainMin, domainMax);
        return this.padding + normalized * (this.width - 2 * this.padding);
    }

    /**
     * Convert domain y-coordinate to canvas y-coordinate (flipped because canvas y increases downward)
     */
    private canvasY(y: number, domainMin: number, domainMax: number): number {
        const normalized = this.normalize(y, domainMin, domainMax);
        return this.height - this.padding - normalized * (this.height - 2 * this.padding);
    }

    /**
     * Draw the coordinate axes
     */
    private drawAxes(): void {
        if (!this.ctx) return;

        const funcDef = FUNCTIONS[this.selectedFunction];
        const [domainMin, domainMax] = funcDef.domain;

        // Compute y range by sampling the function
        let yMin = Infinity;
        let yMax = -Infinity;
        for (let x = domainMin; x <= domainMax; x += (domainMax - domainMin) / 100) {
            try {
                const y = funcDef.fn(x);
                if (isFinite(y)) {
                    yMin = Math.min(yMin, y);
                    yMax = Math.max(yMax, y);
                }
            } catch {
                // Skip values where function is undefined
            }
        }

        // Add padding to y range
        const yPadding = (yMax - yMin) * 0.1;
        yMin -= yPadding;
        yMax += yPadding;

        // Draw axes with light gray color
        this.ctx.strokeStyle = '#cccccc';
        this.ctx.lineWidth = 1;

        // Vertical axis (y-axis)
        const axisX = this.canvasX(0, domainMin, domainMax);
        if (axisX >= this.padding && axisX <= this.width - this.padding) {
            this.ctx.beginPath();
            this.ctx.moveTo(axisX, this.padding);
            this.ctx.lineTo(axisX, this.height - this.padding);
            this.ctx.stroke();
        }

        // Horizontal axis (x-axis)
        const axisY = this.canvasY(0, yMin, yMax);
        if (axisY >= this.padding && axisY <= this.height - this.padding) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.padding, axisY);
            this.ctx.lineTo(this.width - this.padding, axisY);
            this.ctx.stroke();
        }

        // Draw grid lines
        this.ctx.strokeStyle = '#f0f0f0';
        this.ctx.lineWidth = 0.5;

        // Vertical grid lines
        for (let i = 0; i <= 10; i++) {
            const x = domainMin + (i / 10) * (domainMax - domainMin);
            const canvasXPos = this.canvasX(x, domainMin, domainMax);
            this.ctx.beginPath();
            this.ctx.moveTo(canvasXPos, this.padding);
            this.ctx.lineTo(canvasXPos, this.height - this.padding);
            this.ctx.stroke();
        }

        // Horizontal grid lines
        for (let i = 0; i <= 10; i++) {
            const y = yMin + (i / 10) * (yMax - yMin);
            const canvasYPos = this.canvasY(y, yMin, yMax);
            this.ctx.beginPath();
            this.ctx.moveTo(this.padding, canvasYPos);
            this.ctx.lineTo(this.width - this.padding, canvasYPos);
            this.ctx.stroke();
        }

        // Store y range for later use
        (this as any)._yMin = yMin;
        (this as any)._yMax = yMax;
    }

    /**
     * Draw the function curve
     */
    private drawFunctionCurve(): void {
        if (!this.ctx) return;

        const funcDef = FUNCTIONS[this.selectedFunction];
        const [domainMin, domainMax] = funcDef.domain;
        const yMin = (this as any)._yMin;
        const yMax = (this as any)._yMax;

        this.ctx.strokeStyle = '#4a90e2';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();

        let isFirst = true;
        const step = (domainMax - domainMin) / 300;

        for (let x = domainMin; x <= domainMax; x += step) {
            try {
                const y = funcDef.fn(x);
                if (isFinite(y)) {
                    const canvasXPos = this.canvasX(x, domainMin, domainMax);
                    const canvasYPos = this.canvasY(y, yMin, yMax);

                    if (isFirst) {
                        this.ctx.moveTo(canvasXPos, canvasYPos);
                        isFirst = false;
                    } else {
                        this.ctx.lineTo(canvasXPos, canvasYPos);
                    }
                }
            } catch {
                // Skip values where function is undefined
            }
        }

        this.ctx.stroke();
    }

    /**
     * Draw the tangent line at currentX
     */
    private drawTangentLine(): void {
        if (!this.ctx) return;

        const funcDef = FUNCTIONS[this.selectedFunction];
        const [domainMin, domainMax] = funcDef.domain;
        const yMin = (this as any)._yMin;
        const yMax = (this as any)._yMax;

        try {
            const y = funcDef.fn(this.currentX);
            const slope = funcDef.derivative(this.currentX);

            // Only draw if values are finite
            if (!isFinite(y) || !isFinite(slope)) {
                return;
            }

            // Calculate two points on the tangent line
            const x1 = domainMin;
            const y1 = y + slope * (x1 - this.currentX);

            const x2 = domainMax;
            const y2 = y + slope * (x2 - this.currentX);

            // Convert to canvas coordinates
            const canvasX1 = this.canvasX(x1, domainMin, domainMax);
            const canvasY1 = this.canvasY(y1, yMin, yMax);
            const canvasX2 = this.canvasX(x2, domainMin, domainMax);
            const canvasY2 = this.canvasY(y2, yMin, yMax);

            // Draw dashed tangent line in red
            this.ctx.strokeStyle = '#ff6b6b';
            this.ctx.lineWidth = 1.5;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(canvasX1, canvasY1);
            this.ctx.lineTo(canvasX2, canvasY2);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        } catch {
            // Skip if derivative or function evaluation fails
        }
    }

    /**
     * Draw a circle marking the current point on the function
     */
    private drawCurrentPoint(): void {
        if (!this.ctx) return;

        const funcDef = FUNCTIONS[this.selectedFunction];
        const [domainMin, domainMax] = funcDef.domain;
        const yMin = (this as any)._yMin;
        const yMax = (this as any)._yMax;

        try {
            const y = funcDef.fn(this.currentX);

            if (!isFinite(y)) {
                return;
            }

            const canvasXPos = this.canvasX(this.currentX, domainMin, domainMax);
            const canvasYPos = this.canvasY(y, yMin, yMax);

            // Draw red circle
            this.ctx.fillStyle = '#ff6b6b';
            this.ctx.beginPath();
            this.ctx.arc(canvasXPos, canvasYPos, 5, 0, 2 * Math.PI);
            this.ctx.fill();

            // Draw white border
            this.ctx.strokeStyle = 'white';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        } catch {
            // Skip if function evaluation fails
        }
    }

    /**
     * Main draw function - clears canvas and draws everything
     */
    drawFunction(): void {
        if (!this.ctx || !this.canvas) return;

        // Clear canvas with white background
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw all components
        this.drawAxes();
        this.drawFunctionCurve();
        this.drawTangentLine();
        this.drawCurrentPoint();
    }

    /**
     * Update the current x position and redraw
     */
    setX(x: number): void {
        // Clamp to function domain
        const funcDef = FUNCTIONS[this.selectedFunction];
        const [domainMin, domainMax] = funcDef.domain;
        this.currentX = Math.max(domainMin, Math.min(domainMax, x));
        this.drawFunction();
    }

    /**
     * Change the selected function and redraw
     */
    setFunction(functionType: FunctionType): void {
        this.selectedFunction = functionType;
        const funcDef = FUNCTIONS[this.selectedFunction];
        const [domainMin, domainMax] = funcDef.domain;
        // Center x in the domain
        this.currentX = (domainMin + domainMax) / 2;
        this.drawFunction();
    }

    /**
     * Get current function value and derivative
     */
    getMetrics(): { fx: number; fpx: number } {
        const funcDef = FUNCTIONS[this.selectedFunction];
        try {
            const fx = funcDef.fn(this.currentX);
            const fpx = funcDef.derivative(this.currentX);
            return {
                fx: isFinite(fx) ? fx : 0,
                fpx: isFinite(fpx) ? fpx : 0,
            };
        } catch {
            return { fx: 0, fpx: 0 };
        }
    }
}
