class CanvasManager {
    constructor(containerId, widthMm, heightMm) {
        this.container = document.getElementById(containerId);
        this.widthMm = widthMm;
        this.heightMm = heightMm;

        // Browsers generally use 96 DPI CSS pixels
        // 1 inch = 25.4 mm => 1 mm = 96 / 25.4 pixels
        this.pxPerMm = 96 / 25.4;

        this.initCanvas();
    }

    initCanvas() {
        // Convert to pixels
        const widthPx = Math.round(this.widthMm * this.pxPerMm);
        const heightPx = Math.round(this.heightMm * this.pxPerMm);

        this.container.style.width = `${widthPx}px`;
        this.container.style.height = `${heightPx}px`;
        this.container.style.position = 'relative'; // ensure elements position absolutely relative to this

        this.updatePrintStyles();
    }

    updatePrintStyles() {
        // Remove old style if it exists
        let oldStyle = document.getElementById('print-page-style');
        if (oldStyle) {
            oldStyle.remove();
        }

        // Create new style block dynamically
        const style = document.createElement('style');
        style.id = 'print-page-style';

        // Exact physical dimensions for `@page`
        const css = `
            @page {
                size: ${this.widthMm}mm ${this.heightMm}mm;
                margin: 0;
            }
        `;

        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);
    }

    mmToPx(mm) {
        return mm * this.pxPerMm;
    }

    pxToMm(px) {
        return px / this.pxPerMm;
    }

    getContainer() {
        return this.container;
    }

    resize(widthMm, heightMm) {
        this.widthMm = widthMm;
        this.heightMm = heightMm;
        this.initCanvas();
    }

    clear() {
        this.container.innerHTML = '';
    }
}
