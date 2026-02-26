/**
 * SnapGuides — Photoshop-style smart alignment guides.
 *
 * Optimised: reuses two persistent guide-line DOM elements
 * instead of creating/removing them every frame.
 */
class SnapGuides {
    /**
     * @param {HTMLElement} canvas  — the #design-canvas element
     * @param {number} threshold   — snap tolerance in canvas-px
     */
    constructor(canvas, threshold = 3) {
        this.canvas = canvas;
        this.threshold = threshold;

        // Create persistent guide elements (hidden by default)
        this.vLine = this._createGuide('snap-guide snap-guide-v');
        this.hLine = this._createGuide('snap-guide snap-guide-h');
    }

    _createGuide(className) {
        const el = document.createElement('div');
        el.className = className;
        el.style.display = 'none';
        this.canvas.appendChild(el);
        return el;
    }

    /**
     * Call during drag-move.
     * Returns snapped { x, y } in canvas-px.
     */
    snap(dragId, xPx, yPx, wPx, hPx, elements, cm) {
        const T = this.threshold;
        const canvasW = this.canvas.offsetWidth;
        const canvasH = this.canvas.offsetHeight;

        // Dragged element edges & center
        const dLeft = xPx;
        const dRight = xPx + wPx;
        const dTop = yPx;
        const dBottom = yPx + hPx;
        const dCX = xPx + wPx / 2;
        const dCY = yPx + hPx / 2;

        let bestDx = T + 1;
        let bestDy = T + 1;
        let snapX = xPx;
        let snapY = yPx;
        let guideX = null;
        let guideY = null;

        // Collect target edges from other elements + canvas
        const targets = [];
        for (let i = 0; i < elements.length; i++) {
            const m = elements[i];
            if (m.id === dragId) continue;
            const l = cm.mmToPx(m.x);
            const t = cm.mmToPx(m.y);
            const w = cm.mmToPx(m.width);
            const h = cm.mmToPx(m.height);
            targets.push(l, l + w, l + w / 2,   // x edges: left, right, centerX
                t, t + h, t + h / 2);  // y edges: top, bottom, centerY
        }
        // Canvas edges + center
        targets.push(0, canvasW, canvasW / 2, 0, canvasH, canvasH / 2);

        // X-axis checks: compare drag left, right, center against each target x
        const dragXEdges = [dLeft, dRight, dCX];
        for (let i = 0; i < targets.length; i += 6) {
            const txArr = [targets[i], targets[i + 1], targets[i + 2]];
            for (const dx of dragXEdges) {
                for (const tx of txArr) {
                    const diff = Math.abs(dx - tx);
                    if (diff < bestDx) {
                        bestDx = diff;
                        snapX = xPx + (tx - dx);
                        guideX = tx;
                    }
                }
            }
        }

        // Y-axis checks
        const dragYEdges = [dTop, dBottom, dCY];
        for (let i = 0; i < targets.length; i += 6) {
            const tyArr = [targets[i + 3], targets[i + 4], targets[i + 5]];
            for (const dy of dragYEdges) {
                for (const ty of tyArr) {
                    const diff = Math.abs(dy - ty);
                    if (diff < bestDy) {
                        bestDy = diff;
                        snapY = yPx + (ty - dy);
                        guideY = ty;
                    }
                }
            }
        }

        // Show / hide vertical guide
        if (bestDx <= T && guideX !== null) {
            this.vLine.style.display = 'block';
            this.vLine.style.left = `${guideX}px`;
            this.vLine.style.top = '0';
            this.vLine.style.height = `${canvasH}px`;
        } else {
            this.vLine.style.display = 'none';
            snapX = xPx; // no snap
        }

        // Show / hide horizontal guide
        if (bestDy <= T && guideY !== null) {
            this.hLine.style.display = 'block';
            this.hLine.style.top = `${guideY}px`;
            this.hLine.style.left = '0';
            this.hLine.style.width = `${canvasW}px`;
        } else {
            this.hLine.style.display = 'none';
            snapY = yPx; // no snap
        }

        return { x: snapX, y: snapY };
    }

    /** Hide guides (call on drag end) */
    clearGuides() {
        this.vLine.style.display = 'none';
        this.hLine.style.display = 'none';
    }
}
