/* --- ElementRenderer.js --- */
/**
 * Shared element rendering utilities.
 * Used by both ElementManager (design canvas) and PrintEngine (print zone).
 */
const ElementRenderer = {

    /**
     * Shared font list used across the app.
     */
    FONTS: [
        'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat',
        'Oswald', 'Source Sans 3', 'Slabo 27px', 'Raleway', 'PT Sans',
        'Josefin Sans', 'Nunito', 'Ubuntu', 'Playfair Display', 'Rubik',
        'Merriweather', 'Noto Sans', 'Fira Sans', 'Work Sans', 'Quicksand',
        'Karla', 'Inconsolata', 'Cabin', 'Dancing Script', 'Pacifico'
    ],

    /**
     * Renders the inner content of an element container div.
     * Handles text, barcode, and qrcode types.
     * 
     * @param {HTMLElement} el - The container div to render into
     * @param {Object} meta - Element metadata
     * @param {number} pxPerMm - Pixels per millimeter conversion factor
     */
    renderContent(el, meta, pxPerMm) {
        el.innerHTML = '';

        if (meta.type === 'text' || meta.type === 'var-text') {
            this.loadFont(meta.fontFamily);
            const span = document.createElement('div');
            if (meta.autoWidth) {
                span.style.width = 'max-content';
                span.style.whiteSpace = 'pre';
            } else {
                span.style.width = '100%';
                span.style.whiteSpace = 'pre-wrap';
            }
            span.style.height = 'auto';
            span.style.fontFamily = `"${meta.fontFamily || 'Inter'}", sans-serif`;
            span.style.fontSize = `${meta.fontSize}pt`;
            span.style.fontWeight = meta.fontWeight;
            span.style.fontStyle = meta.fontStyle || 'normal';
            span.style.textAlign = meta.textAlign;
            span.style.wordBreak = 'break-word';
            span.style.overflow = 'hidden';
            span.style.lineHeight = '1.15';
            span.style.color = '#000';
            span.textContent = meta.text;
            el.appendChild(span);

        } else if (meta.type === 'barcode') {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            el.appendChild(svg);
            try {
                const hPx = meta.height * pxPerMm;
                JsBarcode(svg, meta.value || '1234', {
                    format: "CODE128",
                    width: 2,
                    height: hPx * 0.75,
                    displayValue: meta.displayValue,
                    margin: 0,
                    fontSize: 10
                });
                // Make SVG scale to fill container, preserving aspect ratio
                svg.setAttribute('width', '100%');
                svg.setAttribute('height', '100%');
                svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            } catch (e) {
                console.error("Barcode rendering error", e);
            }

        } else if (meta.type === 'qrcode') {
            const wPx = meta.width * pxPerMm;
            const hPx = meta.height * pxPerMm;
            const sizePx = Math.min(wPx, hPx);
            new QRCode(el, {
                text: meta.value || '1234',
                width: sizePx,
                height: sizePx,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.L
            });

        } else if (meta.type === 'line' || meta.type === 'square' || meta.type === 'circle') {
            const shapeDiv = document.createElement('div');
            shapeDiv.style.width = '100%';
            shapeDiv.style.height = '100%';
            shapeDiv.style.boxSizing = 'border-box';
            shapeDiv.style.position = 'absolute';
            shapeDiv.style.top = '0';
            shapeDiv.style.left = '0';
            shapeDiv.style.pointerEvents = 'none'; // CRITICAL: Let clicks pass through to to interact.js parent container
            shapeDiv.style.webkitPrintColorAdjust = 'exact'; // CRITICAL FOR PRINTING
            shapeDiv.style.printColorAdjust = 'exact'; // Standard property

            if (meta.type === 'line') {
                // Determine layout direction (horizontal vs vertical based on dimensions)
                if (meta.width >= meta.height) {
                    // Horizontal line centered vertically
                    shapeDiv.style.height = `${meta.strokeThickness || 1}px`;
                    shapeDiv.style.top = '50%';
                    shapeDiv.style.transform = 'translateY(-50%)';
                    shapeDiv.style.backgroundColor = meta.strokeColor || '#000000';
                } else {
                    // Vertical line centered horizontally
                    shapeDiv.style.width = `${meta.strokeThickness || 1}px`;
                    shapeDiv.style.left = '50%';
                    shapeDiv.style.transform = 'translateX(-50%)';
                    shapeDiv.style.backgroundColor = meta.strokeColor || '#000000';
                }
            } else {
                // Square or Circle
                shapeDiv.style.border = `${meta.strokeThickness || 1}px solid ${meta.strokeColor}`;
                if (meta.fillColor && meta.fillColor !== 'transparent') {
                    shapeDiv.style.backgroundColor = meta.fillColor;
                }

                if (meta.type === 'circle') {
                    shapeDiv.style.borderRadius = '50%';
                }
            }

            el.appendChild(shapeDiv);
        }
    },

    /**
     * Creates a standalone positioned element for print output.
     * 
     * @param {Object} meta - Element metadata  
     * @param {number} pxPerMm - Pixels per millimeter
     * @returns {HTMLElement}
     */
    createPrintElement(meta, pxPerMm) {
        const el = document.createElement('div');
        el.style.position = 'absolute';
        el.style.left = `${meta.x * pxPerMm}px`;
        el.style.top = `${meta.y * pxPerMm}px`;
        el.style.boxSizing = 'border-box';
        el.style.margin = '0';
        el.style.padding = '0';

        // Set container dimensions for ALL element types
        el.style.width = `${meta.width * pxPerMm}px`;
        el.style.height = `${meta.height * pxPerMm}px`;

        this.renderContent(el, meta, pxPerMm);
        return el;
    },

    /**
     * Dynamically loads a font if not already loaded.
     * @param {string} fontFamily
     */
    loadFont(fontFamily) {
        if (!fontFamily || fontFamily === 'Inter') return; // Inter is loaded by default
        
        const linkId = `font-${fontFamily.replace(/\s+/g, '-').toLowerCase()}`;
        if (!document.getElementById(linkId)) {
            const encoded = fontFamily.replace(/ /g, '+');
            let familyStr = `family=${encoded}:wght@400;600;700`;
            if (['Pacifico', 'Slabo 27px'].includes(fontFamily)) {
                familyStr = `family=${encoded}`;
            }
            
            const link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            link.href = `https://fonts.googleapis.com/css2?${familyStr}&display=swap`;
            document.head.appendChild(link);
        }
    },

    /**
     * Builds font <option> HTML for a select dropdown.
     * @param {string} selectedFont - Currently selected font family
     * @returns {string}
     */
    buildFontOptions(selectedFont) {
        return this.FONTS.map(f =>
            `<option value="${f}" ${selectedFont === f ? 'selected' : ''}>${f}</option>`
        ).join('\n');
    }
};


/* --- ValueFormatter.js --- */
/**
 * Registry of value formatters.
 * Easily add new formatters here to have them appear in the Property Panel
 * and automatically apply during the printing process.
 */
const ValueFormatter = {

    /**
     * Define the available formatters.
     * key: the internal ID saved in element metadata
     * name: the human-readable name shown in the UI dropdown
     * format: the function that transforms the raw input string
     */
    registry: [
        {
            key: 'none',
            name: 'None',
            format: (val) => val
        },
        {
            key: 'currency',
            name: 'Currency (1,000)',
            format: (val) => {
                const num = parseFloat(val);
                if (isNaN(num)) {
                    console.warn(`ValueFormatter: Could not parse '${val}' as a number for currency formatting.`);
                    return val;
                }
                return num.toLocaleString();
            }
        },
        {
            key: 'date-compact',
            name: 'Date Compact (25022026)',
            format: (val) => {
                if (!val) return val;

                // expecting YYYY-MM-DD from HTML 'date' input
                if (val.includes('-')) {
                    const [y, m, d] = val.split('-');
                    return `${d}${m}${y}`;
                }

                // fallback for CSV inputs like DD/MM/YYYY
                if (val.includes('/')) {
                    return val.replace(/\//g, '');
                }

                return val;
            }
        },
        {
            key: 'uppercase',
            name: 'UPPERCASE',
            format: (val) => val ? val.toUpperCase() : val
        },
        {
            key: 'lowercase',
            name: 'lowercase',
            format: (val) => val ? val.toLowerCase() : val
        }
    ],

    /**
     * Apply a specific formatter by key to a value.
     */
    apply(key, value) {
        if (!value) return value;
        const formatter = this.registry.find(f => f.key === key);
        if (formatter && formatter.format) {
            return formatter.format(value);
        }
        return value;
    },

    /**
     * Generate HTML <option> tags for the Property Panel select dropdown.
     */
    buildOptionsHtml(selectedKey) {
        const active = selectedKey || 'none';
        return this.registry.map(f =>
            `<option value="${f.key}" ${active === f.key ? 'selected' : ''}>${f.name}</option>`
        ).join('\n');
    }

};


/* --- CanvasManager.js --- */
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


/* --- SnapGuides.js --- */
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

    precomputeTargets(dragId, elements, cm) {
        this.targets = [];
        const canvasW = this.canvas.offsetWidth;
        const canvasH = this.canvas.offsetHeight;
        for (let i = 0; i < elements.length; i++) {
            const m = elements[i];
            if (m.id === dragId) continue;
            const l = cm.mmToPx(m.x);
            const t = cm.mmToPx(m.y);
            const w = cm.mmToPx(m.width);
            const h = cm.mmToPx(m.height);
            this.targets.push(l, l + w, l + w / 2,   // x edges
                t, t + h, t + h / 2);  // y edges
        }
        // Canvas edges + center
        this.targets.push(0, canvasW, canvasW / 2, 0, canvasH, canvasH / 2);
    }

    /**
     * Call during drag-move.
     * Returns snapped { x, y } in canvas-px.
     */
    snap(xPx, yPx, wPx, hPx) {
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

        const targets = this.targets || [];

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


/* --- ElementManager.js --- */
const EYE_OPEN_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
const EYE_CLOSED_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

class ElementManager {
    constructor(canvasManager) {
        this.canvasManager = canvasManager;
        this.elements = [];
        this.selectedElement = null;
        this.elementIdCounter = 1;
        this.snapGuides = new SnapGuides(document.getElementById('design-canvas'), 3);
        this.groups = [];  // Array of { id, name, collapsed }
        this._groupIdCounter = 1;
        this._groupSortables = [];  // Track group Sortable instances to destroy on rebuild

        // Listeners for deselection
        const scrollContainer = document.querySelector('.canvas-container-scroll');
        if (scrollContainer) {
            scrollContainer.addEventListener('mousedown', (e) => {
                // If it's the scroll container itself, the wrapper, or the empty canvas face
                if (e.target.classList.contains('canvas-container-scroll') ||
                    e.target.classList.contains('canvas-wrapper') ||
                    e.target.id === 'design-canvas') {
                    this.selectElement(null);
                }
            });
        }


        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Don't intercept when typing in inputs/selects
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
            // Don't intercept when a modal is open
            if (document.querySelector('.modal.active')) return;

            if (!this.selectedElement) return;

            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                this.deleteCurrentElement();
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                const step = e.shiftKey ? 0.1 : 1; // Shift = fine nudge 0.1mm
                const updates = {};
                if (e.key === 'ArrowUp') updates.y = this.selectedElement.y - step;
                if (e.key === 'ArrowDown') updates.y = this.selectedElement.y + step;
                if (e.key === 'ArrowLeft') updates.x = this.selectedElement.x - step;
                if (e.key === 'ArrowRight') updates.x = this.selectedElement.x + step;
                this.updateCurrentMeta(updates);
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                this.duplicateCurrentElement();
            }
        });
    }

    addElement(type) {
        const id = `el-${this.elementIdCounter++}`;

        // Define default dimensions based on type
        let defaultWidth = 20, defaultHeight = 5;
        if (type === 'text' || type === 'var-text') {
            // Auto-size height from font: 10pt × 0.353 mm/pt × 1.15 line-height + 1mm padding
            const defaultFontSize = 10; // pt
            defaultHeight = Math.ceil(defaultFontSize * 0.353 * 1.15) + 1;
        }
        else if (type === 'barcode') { defaultWidth = 30; defaultHeight = 10; }
        else if (type === 'line') { defaultWidth = 30; defaultHeight = 2; }
        else if (type === 'square' || type === 'circle') { defaultWidth = 15; defaultHeight = 15; }

        const elMeta = {
            id,
            type,
            x: 5, // mm
            y: 5, // mm
            width: defaultWidth, // mm
            height: defaultHeight,  // mm
            autoWidth: (type === 'text' || type === 'var-text'),
            zIndex: this.elements.length + 1,
            // Specific properties
            text: type === 'text' ? 'Sample Text' : (type === 'var-text' ? 'Variable' : ''),
            varName: type === 'var-text' ? 'variable' : '',
            fontFamily: 'Inter', // Default
            fontSize: 10, // pt
            fontWeight: 'normal',
            fontStyle: 'normal',
            textAlign: 'left',
            value: type === 'barcode' || type === 'qrcode' ? '123456789' : '',
            isVariableValue: false, // For barcode/qrcode
            displayValue: true, // For barcode text
            inputType: type === 'var-text' ? 'text' : '', // For print form
            formatter: type === 'var-text' ? 'none' : '', // For output rendering

            // New Shape properties
            strokeColor: '#000000',
            strokeThickness: 1, // pt or mm equivalent visual weight
            fillColor: type === 'line' ? '' : 'transparent',
            group: null, // group id (null = ungrouped)
            visible: true,
        };

        this.elements.push(elMeta);
        this.renderElement(elMeta);

        // Auto select newly created Element (which internally calls buildLayersPanel)
        this.selectElement(elMeta);
    }

    renderElement(meta) {
        let el = document.getElementById(meta.id);
        if (!el) {
            el = document.createElement('div');
            el.id = meta.id;
            el.className = `designer-element type-${meta.type}`;
            this.canvasManager.getContainer().appendChild(el);

            // Setup interact.js on this element
            this.setupInteractJS(el);

            el.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectElement(meta);
            });

            el.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                if (meta.type === 'text' || meta.type === 'var-text') {
                    if (window.App && window.App.openTextEditModal) {
                        window.App.openTextEditModal(meta);
                    }
                }
            });
        }

        // Apply Common Styles
        let isVisible = meta.visible !== false;
        if (isVisible && meta.group) {
            const group = this.groups.find(g => g.id === meta.group);
            if (group && group.visible === false) {
                isVisible = false;
            }
        }
        
        if (!isVisible) {
            el.style.visibility = 'hidden';
            el.style.pointerEvents = 'none';
        } else {
            el.style.visibility = '';
            el.style.pointerEvents = '';
        }

        el.style.position = 'absolute';
        el.style.left = `${this.canvasManager.mmToPx(meta.x)}px`;
        el.style.top = `${this.canvasManager.mmToPx(meta.y)}px`;

        // Set container dimensions for ALL element types
        if ((meta.type === 'text' || meta.type === 'var-text') && meta.autoWidth) {
            el.style.width = 'auto';
        } else {
            el.style.width = `${this.canvasManager.mmToPx(meta.width)}px`;
        }

        if (meta.type === 'text' || meta.type === 'var-text') {
            el.style.height = 'auto'; // allow natural height for rendering
        } else {
            el.style.height = `${this.canvasManager.mmToPx(meta.height)}px`;
        }

        el.style.zIndex = meta.zIndex;

        // Use shared renderer for content
        ElementRenderer.renderContent(el, meta, this.canvasManager.pxPerMm);

        // For text elements, read back the natural height, save to meta, and fix the inline style
        if (meta.type === 'text' || meta.type === 'var-text') {
            const actualPxH = el.offsetHeight;
            if (actualPxH > 0) {
                meta.height = this.canvasManager.pxToMm(actualPxH);
                el.style.height = `${actualPxH}px`; // fix it so interact.js works and bounding box is exact
            }
            
            if (meta.autoWidth) {
                const actualPxW = el.offsetWidth;
                if (actualPxW > 0) {
                    meta.width = this.canvasManager.pxToMm(actualPxW);
                    el.style.width = `${actualPxW}px`;
                }
            }

            if (window.App && window.App.propertyPanel) {
                window.App.propertyPanel.updatePanelValues(meta);
            }
        }

        this.addResizeHandles(el);
    }

    addResizeHandles(el) {
        if (this.selectedElement && this.selectedElement.id === el.id) {
            el.classList.add('selected');
            const positions = ['tl', 'tr', 'bl', 'br', 'tm', 'mr', 'bm', 'ml'];
            positions.forEach(pos => {
                if (!el.querySelector(`.resize-handle.${pos}`)) {
                    const h = document.createElement('div');
                    h.className = `resize-handle ${pos}`;
                    el.appendChild(h);
                }
            });
        } else {
            el.classList.remove('selected');
            el.querySelectorAll('.resize-handle').forEach(h => h.remove());
        }
    }

    setupInteractJS(el) {
        interact(el)
            .draggable({
                ignoreFrom: '[contenteditable="true"]',
                modifiers: [
                    interact.modifiers.restrictRect({
                        restriction: 'parent',
                        endOnly: true
                    })
                ],
                listeners: {
                    start: (event) => {
                        const meta = this.elements.find(m => m.id === event.target.id);
                        if (meta) {
                            this._dragMap = this._dragMap || new Map();
                            this._dragMap.set(meta.id, {
                                rawX: this.canvasManager.mmToPx(meta.x),
                                rawY: this.canvasManager.mmToPx(meta.y)
                            });
                            if (this.snapGuides) {
                                this.snapGuides.precomputeTargets(meta.id, this.elements, this.canvasManager);
                            }
                        }
                    },
                    move: (event) => {
                        const target = event.target;
                        const meta = this.elements.find(m => m.id === target.id);
                        if (!meta) return;

                        const zoom = window.App ? window.App.zoomLevel || 1 : 1;

                        const dragData = this._dragMap ? this._dragMap.get(meta.id) : null;
                        if (!dragData) return;

                        // Accumulate deltas on the RAW (unsnapped) position
                        dragData.rawX += event.dx / zoom;
                        dragData.rawY += event.dy / zoom;

                        let xPx = dragData.rawX;
                        let yPx = dragData.rawY;
                        const wPx = this.canvasManager.mmToPx(meta.width);
                        const hPx = this.canvasManager.mmToPx(meta.height);

                        // Snap for display only (doesn't affect raw tracking)
                        if (this.snapGuides) {
                            const snapped = this.snapGuides.snap(xPx, yPx, wPx, hPx);
                            xPx = snapped.x;
                            yPx = snapped.y;
                        }

                        // Update DOM with snapped position
                        target.style.left = `${xPx}px`;
                        target.style.top = `${yPx}px`;

                        // Save snapped position to meta (for rendering/export)
                        meta.x = this.canvasManager.pxToMm(xPx);
                        meta.y = this.canvasManager.pxToMm(yPx);

                        if (App.propertyPanel) App.propertyPanel.updatePanelValues(meta);
                    },
                    end: (event) => {
                        const meta = this.elements.find(m => m.id === event.target.id);
                        if (meta && this._dragMap) {
                            this._dragMap.delete(meta.id);
                        }
                        if (this.snapGuides) this.snapGuides.clearGuides();
                    }
                }
            })
            .resizable({
                edges: {
                    left: '.resize-handle.tl, .resize-handle.bl, .resize-handle.ml',
                    right: '.resize-handle.tr, .resize-handle.br, .resize-handle.mr',
                    bottom: '.resize-handle.bl, .resize-handle.br, .resize-handle.bm',
                    top: '.resize-handle.tl, .resize-handle.tr, .resize-handle.tm'
                },
                modifiers: [
                    interact.modifiers.restrictEdges({
                        outer: 'parent'
                    }),
                    interact.modifiers.restrictSize({
                        min: { width: 10, height: 10 }
                    })
                ],
                listeners: {
                    move: (event) => {
                        const target = event.target;
                        const meta = this.elements.find(m => m.id === target.id);
                        if (!meta) return;

                        const zoom = window.App ? window.App.zoomLevel || 1 : 1;
                        let xPx = this.canvasManager.mmToPx(meta.x) + (event.deltaRect.left / zoom);
                        let yPx = this.canvasManager.mmToPx(meta.y) + (event.deltaRect.top / zoom);
                        let wPx = this.canvasManager.mmToPx(meta.width) + (event.deltaRect.width / zoom);
                        let hPx = this.canvasManager.mmToPx(meta.height) + (event.deltaRect.height / zoom);

                        target.style.width = `${wPx}px`;
                        target.style.height = `${hPx}px`;
                        target.style.left = `${xPx}px`;
                        target.style.top = `${yPx}px`;

                        meta.x = this.canvasManager.pxToMm(xPx);
                        meta.y = this.canvasManager.pxToMm(yPx);
                        meta.width = this.canvasManager.pxToMm(wPx);
                        meta.height = this.canvasManager.pxToMm(hPx);

                        // Only re-render content for text/shape (skip barcodes/QR during resize for perf)
                        if (meta.type !== 'barcode' && meta.type !== 'qrcode') {
                            if ((meta.type === 'text' || meta.type === 'var-text') && Math.abs(event.deltaRect.width) > 0.01) {
                                meta.autoWidth = false;
                            }
                            ElementRenderer.renderContent(target, meta, this.canvasManager.pxPerMm);
                            if (meta.type === 'text' || meta.type === 'var-text') {
                                target.style.height = 'auto';
                                const actualPx = target.offsetHeight;
                                if (actualPx > 0) {
                                    meta.height = this.canvasManager.pxToMm(actualPx);
                                    target.style.height = `${actualPx}px`;
                                }
                            }
                        }
                        if (App.propertyPanel) App.propertyPanel.updatePanelValues(meta);
                    },
                    end: (event) => {
                        const meta = this.elements.find(m => m.id === event.target.id);
                        if (meta && (meta.type === 'barcode' || meta.type === 'qrcode')) {
                            ElementRenderer.renderContent(event.target, meta, this.canvasManager.pxPerMm);
                        }
                    }
                }
            });
    }

    selectElement(meta) {
        const prevMeta = this.selectedElement;
        this.selectedElement = meta; // Update state first

        // Deselect previous — restore its original z-index
        if (prevMeta) {
            const prevEl = document.getElementById(prevMeta.id);
            if (prevEl) {
                prevEl.classList.remove('selected');
                prevEl.style.zIndex = prevMeta.zIndex; // Restore real z-index
                this.addResizeHandles(prevEl); // removes handles visually
            }
        }

        // Select new — boost z-index so it stays on top during interaction
        if (this.selectedElement) {
            const el = document.getElementById(this.selectedElement.id);
            if (el) {
                el.classList.add('selected');
                el.style.zIndex = 9999; // Temporarily above everything
                this.addResizeHandles(el); // adds handles visually
            }
        }

        // Notify PropertyPanel (full rebuild on selection change)
        if (App.propertyPanel) {
            App.propertyPanel.updatePanel(this.selectedElement);
        }

        this.buildLayersPanel();
    }

    buildLayersPanel() {
        const panel = document.getElementById('layers-panel');
        if (!panel) return;

        const sortedElements = [...this.elements].sort((a, b) => b.zIndex - a.zIndex);

        if (sortedElements.length === 0 && this.groups.length === 0) {
            panel.innerHTML = '<p class="empty-state" style="font-size:0.8rem; color:var(--text-muted); text-align:center; margin-top:10px;">No elements added.</p>';
            return;
        }

        panel.innerHTML = '';



        // Helper: create a layer-item div for an element
        const createLayerItem = (meta) => {
            const div = document.createElement('div');
            div.className = `layer-item ${this.selectedElement && this.selectedElement.id === meta.id ? 'active' : ''}`;

            let icon = 'T';
            let name = meta.text ? meta.text.substring(0, 15) : 'Text';
            if (meta.type === 'var-text') { icon = '{ }'; name = meta.text || `{${meta.varName}}` || 'Variable Text'; }
            else if (meta.type === 'barcode') { icon = '|||'; name = meta.value || 'Barcode'; }
            else if (meta.type === 'qrcode') { icon = 'QR'; name = meta.value || 'QR Code'; }
            else if (meta.type === 'line') { icon = '―'; name = 'Line'; }
            else if (meta.type === 'square') { icon = '□'; name = 'Square'; }
            else if (meta.type === 'circle') { icon = '○'; name = 'Circle'; }

            div.dataset.id = meta.id;

            const isVisible = meta.visible !== false;
            div.innerHTML = `
                <span class="visibility-toggle" style="cursor:pointer; margin-right:6px;" title="Toggle Visibility">${isVisible ? EYE_OPEN_SVG : EYE_CLOSED_SVG}</span>
                <span class="icon" style="font-family:monospace; min-width:20px; display:inline-block;">${icon}</span>
                <span class="name" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1;">${name}</span>
                <span class="drag-handle" style="cursor:grab; opacity:0.5; padding:0 5px;">⋮⋮</span>
            `;

            div.querySelector('.visibility-toggle').addEventListener('click', (e) => {
                e.stopPropagation();
                meta.visible = !isVisible;
                this.renderElement(meta);
                this.buildLayersPanel();
            });

            div.addEventListener('click', () => {
                this.selectElement(meta);
            });

            return div;
        };

        // Render groups
        this.groups.forEach(group => {
            const groupEls = sortedElements.filter(m => m.group === group.id);

            const details = document.createElement('details');
            details.className = 'layer-group';
            if (!group.collapsed) details.open = true;
            details.dataset.groupId = group.id;

            const summary = document.createElement('summary');
            summary.className = 'layer-group-header';
            const isGroupVisible = group.visible !== false;
            summary.innerHTML = `
                <span class="group-visibility-toggle" style="cursor:pointer; margin-right:6px;" title="Toggle Group Visibility">${isGroupVisible ? EYE_OPEN_SVG : EYE_CLOSED_SVG}</span>
                <span class="layer-group-name">${group.name}</span>
                <span class="layer-group-count">${groupEls.length}</span>
                <button class="layer-group-delete" title="Delete group">&times;</button>
            `;

            summary.querySelector('.group-visibility-toggle').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                group.visible = !isGroupVisible;
                // Re-render all elements in this group to apply visibility rules
                this.elements.filter(m => m.group === group.id).forEach(m => this.renderElement(m));
                this.buildLayersPanel();
            });

            // Toggle collapsed state
            details.addEventListener('toggle', () => {
                group.collapsed = !details.open;
            });

            // Delete group button
            summary.querySelector('.layer-group-delete').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Ungroup all elements in this group
                this.elements.forEach(m => { if (m.group === group.id) m.group = null; });
                this.groups = this.groups.filter(g => g.id !== group.id);
                this.buildLayersPanel();
            });

            details.appendChild(summary);

            const content = document.createElement('div');
            content.className = 'layer-group-content';
            content.dataset.groupId = group.id;
            groupEls.forEach(meta => content.appendChild(createLayerItem(meta)));
            details.appendChild(content);

            panel.appendChild(details);
        });

        // Render ungrouped elements
        const ungrouped = sortedElements.filter(m => !m.group);
        ungrouped.forEach(meta => panel.appendChild(createLayerItem(meta)));

        // SortableJS for ungrouped items
        if (window.Sortable) {
            if (this._sortableLayerInstance) {
                this._sortableLayerInstance.destroy();
            }

            // Shared handler: re-sync z-index + group assignment after any drag
            const onSortEnd = (evt) => {
                // Update group assignment for the moved item
                const movedId = evt.item.dataset.id;
                const movedMeta = this.elements.find(e => e.id === movedId);
                if (movedMeta) {
                    const targetGroupId = evt.to.dataset.groupId || null;
                    movedMeta.group = targetGroupId;
                }

                // Re-sync z-index from DOM order (all items across groups + root)
                const allItems = panel.querySelectorAll('.layer-item');
                let z = allItems.length;
                allItems.forEach(item => {
                    const meta = this.elements.find(e => e.id === item.dataset.id);
                    if (meta) {
                        meta.zIndex = z--;
                        // Only update z-index on canvas DOM, skip full re-render
                        const domEl = document.getElementById(meta.id);
                        if (domEl) domEl.style.zIndex = meta.zIndex;
                    }
                });

                this.buildLayersPanel();
            };

            this._sortableLayerInstance = new Sortable(panel, {
                animation: 150,
                handle: '.drag-handle',
                ghostClass: 'layer-item-ghost',
                draggable: '.layer-item',
                group: 'layers',
                onEnd: onSortEnd
            });

            // Destroy previous group Sortable instances to prevent leaks
            if (this._groupSortables && this._groupSortables.length) {
                this._groupSortables.forEach(s => s.destroy());
                this._groupSortables = [];
            }

            // SortableJS for each group content
            this.groups.forEach(group => {
                const groupContent = panel.querySelector(`.layer-group-content[data-group-id="${group.id}"]`);
                if (groupContent) {
                    const sortable = new Sortable(groupContent, {
                        animation: 150,
                        handle: '.drag-handle',
                        ghostClass: 'layer-item-ghost',
                        group: 'layers',
                        onEnd: onSortEnd
                    });
                    this._groupSortables.push(sortable);
                }
            });
        }
    }

    updateCurrentMeta(updates) {
        if (!this.selectedElement) return;

        Object.assign(this.selectedElement, updates);
        this.renderElement(this.selectedElement);

        // Only rebuild layers panel if a display-affecting property changed
        const layerKeys = ['text', 'value', 'varName', 'type', 'zIndex'];
        if (Object.keys(updates).some(k => layerKeys.includes(k))) {
            this.buildLayersPanel();
        }
    }

    /**
     * Properly clears all elements, unsetting interact.js listeners to prevent memory leaks.
     */
    clearAll() {
        this.elements.forEach(meta => {
            const el = document.getElementById(meta.id);
            if (el) {
                interact(el).unset();
                el.remove();
            }
        });
        this.elements = [];
        this.selectElement(null); // this will also call buildLayersPanel
    }

    deleteCurrentElement() {
        if (!this.selectedElement) return;
        const index = this.elements.indexOf(this.selectedElement);
        if (index > -1) {
            this.elements.splice(index, 1);
            const el = document.getElementById(this.selectedElement.id);
            if (el) {
                interact(el).unset();
                el.remove();
            }
            this.selectElement(null); // replaces deleted selection
        }
    }

    duplicateCurrentElement() {
        if (!this.selectedElement) return;
        
        // Deep clone meta, stripping out temp/dynamic properties
        const clone = JSON.parse(JSON.stringify(this.selectedElement));
        clone.id = `el-${this.elementIdCounter++}`;
        
        // Offset slightly so it's obvious it's a clone
        clone.x += 2;
        clone.y += 2;
        
        // Put it on top
        clone.zIndex = this.elements.length + 1;
        
        this.elements.push(clone);
        this.renderElement(clone);
        this.selectElement(clone);
    }

    bringForward() {
        const el = this.selectedElement;
        if (!el) return;
        const maxZ = Math.max(...this.elements.map(e => e.zIndex));
        if (el.zIndex < maxZ) {
            const above = this.elements
                .filter(e => e.zIndex > el.zIndex)
                .sort((a, b) => a.zIndex - b.zIndex)[0];
            if (above) {
                const temp = el.zIndex;
                el.zIndex = above.zIndex;
                above.zIndex = temp;
                this.renderElement(el);
                this.renderElement(above);
                this.buildLayersPanel();
            }
        }
    }

    sendBackward() {
        if (!this.selectedElement) return;
        if (this.selectedElement.zIndex > 1) {
            this.selectedElement.zIndex--;
            this.renderElement(this.selectedElement);
            this.buildLayersPanel();
        }
    }
}


/* --- PropertyPanel.js --- */
class PropertyPanel {
    constructor(elementManager) {
        this.elementManager = elementManager;
        this.container = document.getElementById('properties-panel');
        this._currentMetaId = null; // Track which element owns the current panel
    }

    /**
     * Full panel rebuild — called only on element selection change.
     */
    updatePanel(meta) {
        this._currentMetaId = meta ? meta.id : null;
        const topBar = document.querySelector('.top-properties-bar');

        if (!meta) {
            this.container.innerHTML = '';
            if (topBar) topBar.style.display = 'none';
            return;
        }

        if (topBar) topBar.style.display = 'flex';


        let html = `
            <div class="toolbar-group">
                <div class="toolbar-input-wrap">
                    <input type="number" id="prop-x" value="${meta.x.toFixed(2)}" step="0.1" title="X Position (mm)">
                </div>
                <div class="toolbar-input-wrap">
                    <input type="number" id="prop-y" value="${meta.y.toFixed(2)}" step="0.1" title="Y Position (mm)">
                </div>
            </div>

            <div class="toolbar-group">
                <div class="toolbar-input-wrap">
                    <input type="number" id="prop-w" value="${meta.width.toFixed(2)}" step="0.1" title="Width (mm)">
                </div>
                <div class="toolbar-input-wrap">
                    <input type="number" id="prop-h" value="${meta.height.toFixed(2)}" step="0.1" title="Height (mm)">
                </div>
            </div>
            
            <div class="toolbar-group">
                <button id="btn-bring-forward" class="btn secondary" style="padding:4px 8px; font-size:11px; height:26px;">Front</button>
                <button id="btn-send-backward" class="btn secondary" style="padding:4px 8px; font-size:11px; height:26px;">Back</button>
            </div>
        `;

        if (meta.type === 'text' || meta.type === 'var-text') {
            html += `
                <div class="toolbar-divider"></div>
                <div class="toolbar-group">
                    <div class="toolbar-input-wrap">
                        <select id="prop-font-family" title="Font Family">
                            ${ElementRenderer.buildFontOptions(meta.fontFamily)}
                        </select>
                    </div>
                    <div class="toolbar-input-wrap">
                        <input type="number" id="prop-fs" value="${meta.fontSize}" step="1" title="Font Size">
                    </div>
                    <div class="toolbar-input-wrap" style="gap:2px;">
                        <select id="prop-fw" class="small-dropdown" title="Font Style">
                            <option value="normal-normal" ${meta.fontWeight === 'normal' && meta.fontStyle !== 'italic' ? 'selected' : ''}>Regular</option>
                            <option value="bold-normal" ${meta.fontWeight === 'bold' && meta.fontStyle !== 'italic' ? 'selected' : ''}>Bold</option>
                            <option value="normal-italic" ${meta.fontWeight === 'normal' && meta.fontStyle === 'italic' ? 'selected' : ''}>Italic</option>
                            <option value="bold-italic" ${meta.fontWeight === 'bold' && meta.fontStyle === 'italic' ? 'selected' : ''}>Bold Italic</option>
                        </select>
                        <select id="prop-align" class="small-dropdown" title="Text Alignment">
                            <option value="left" ${meta.textAlign === 'left' ? 'selected' : ''}>Left</option>
                            <option value="center" ${meta.textAlign === 'center' ? 'selected' : ''}>Center</option>
                            <option value="right" ${meta.textAlign === 'right' ? 'selected' : ''}>Right</option>
                        </select>
                    </div>
                </div>
            `;

            if (meta.type === 'var-text') {
                html += `
                    <div class="toolbar-divider"></div>
                    <div class="toolbar-group">
                        <div class="toolbar-input-wrap">
                            <input type="text" id="prop-var-name" value="${meta.varName || ''}" placeholder="Key" title="Variable Key Map">
                        </div>
                        <div class="toolbar-input-wrap">
                            <select id="prop-input-type" title="Variable Type">
                                <option value="text" ${meta.inputType === 'text' || !meta.inputType ? 'selected' : ''}>Text</option>
                                <option value="number" ${meta.inputType === 'number' ? 'selected' : ''}>Number</option>
                                <option value="date" ${meta.inputType === 'date' ? 'selected' : ''}>Date</option>
                                <option value="time" ${meta.inputType === 'time' ? 'selected' : ''}>Time</option>
                                <option value="color" ${meta.inputType === 'color' ? 'selected' : ''}>Color</option>
                            </select>
                        </div>
                        <div class="toolbar-input-wrap">
                            <select id="prop-formatter" title="Formatter">
                                ${ValueFormatter.buildOptionsHtml(meta.formatter)}
                            </select>
                        </div>
                        <div class="toolbar-input-wrap">
                            <input type="text" id="prop-text" value="${meta.text}" placeholder="Default value" title="Default Fallback Value" style="flex:1;">
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div class="toolbar-divider"></div>
                    <div class="toolbar-group" style="flex:1;">
                        <div class="toolbar-input-wrap" style="flex:1;">
                            <input type="text" id="prop-text" value="${meta.text}" style="width:100%; min-width:150px;" placeholder="Text content..." title="Text Content">
                        </div>
                    </div>
                `;
            }
        } else if (meta.type === 'barcode' || meta.type === 'qrcode') {
            html += `
                <div class="toolbar-divider"></div>
                <div class="toolbar-group">
                    <div class="toolbar-input-wrap">
                        <select id="prop-val-source" title="Value Type">
                            <option value="fixed" ${!meta.isVariableValue ? 'selected' : ''}>Fixed</option>
                            <option value="variable" ${meta.isVariableValue ? 'selected' : ''}>Variable</option>
                        </select>
                    </div>
            `;

            if (!meta.isVariableValue) {
                html += `
                    <div class="toolbar-input-wrap" style="flex:1;">
                        <input type="text" id="prop-val" value="${meta.value}" style="width:100%; min-width:150px;" placeholder="Barcode Value..." title="Code Value">
                    </div>
                `;
            } else {
                html += `
                    <div class="toolbar-input-wrap">
                        <input type="text" id="prop-var-name" value="${meta.varName || ''}" placeholder="Variable Map Key" title="Variable Map Key">
                    </div>
                    <div class="toolbar-input-wrap" style="flex:1;">
                        <input type="text" id="prop-val" value="${meta.value}" style="width:100%; min-width:100px;" placeholder="Preview Output" title="Preview Resulting Value">
                    </div>
                `;
            }

            if (meta.type === 'barcode') {
                html += `
                    <div class="toolbar-input-wrap">
                        <select id="prop-display-val" title="Display Number Sequence Under Lines">
                            <option value="true" ${meta.displayValue ? 'selected' : ''}>Show Value</option>
                            <option value="false" ${!meta.displayValue ? 'selected' : ''}>Hide Value</option>
                        </select>
                    </div>
                `;
            }
            html += `</div>`;
        } else if (meta.type === 'line' || meta.type === 'square' || meta.type === 'circle') {
            html += `
                <div class="toolbar-divider"></div>
                <div class="toolbar-group">
                    <div class="toolbar-input-wrap">
                        <input type="color" id="prop-stroke-color" value="${meta.strokeColor || '#000000'}" title="Border Color">
                    </div>
                    <div class="toolbar-input-wrap">
                        <input type="number" id="prop-stroke-width" value="${meta.strokeThickness || 1}" min="0" step="1" title="Thickness/Width (px)">
                    </div>
            `;

            if (meta.type === 'square' || meta.type === 'circle') {
                const isTransparent = meta.fillColor === 'transparent' || !meta.fillColor;
                html += `
                    <div class="toolbar-input-wrap">
                        <input type="checkbox" id="prop-fill-transparent" ${isTransparent ? 'checked' : ''} style="margin:0;">
                        <label for="prop-fill-transparent" style="cursor:pointer;" title="Transparent Fill">Clear</label>
                    </div>
                    <div class="toolbar-input-wrap" style="display:${isTransparent ? 'none' : 'flex'};" id="prop-fill-color-group">
                        <input type="color" id="prop-fill-color" value="${isTransparent ? '#ffffff' : meta.fillColor}" title="Fill Color">
                    </div>
                `;
            }
            html += `</div>`;
        }

        html += `
            <div style="margin-left:auto;">
                <button id="btn-delete-el" class="btn danger" style="padding:6px 16px; height:30px; line-height:1;">Delete</button>
            </div>
        `;

        this.container.innerHTML = html;
        this.attachListeners(meta);
    }

    /**
     * Lightweight value-only update — used during drag/resize to avoid full DOM rebuild.
     * Only updates position/size input values if the panel belongs to this element.
     */
    updatePanelValues(meta) {
        if (!meta || this._currentMetaId !== meta.id) return;

        const propX = document.getElementById('prop-x');
        const propY = document.getElementById('prop-y');
        const propW = document.getElementById('prop-w');
        const propH = document.getElementById('prop-h');

        if (propX && document.activeElement !== propX) propX.value = meta.x.toFixed(2);
        if (propY && document.activeElement !== propY) propY.value = meta.y.toFixed(2);
        if (propW && document.activeElement !== propW) propW.value = meta.width.toFixed(2);
        if (propH && document.activeElement !== propH) propH.value = meta.height.toFixed(2);
    }

    attachListeners(meta) {
        const update = (key, val) => {
            const updates = {};
            updates[key] = val;
            this.elementManager.updateCurrentMeta(updates);
        };

        const safeFloat = (id) => parseFloat(document.getElementById(id).value) || 0;

        document.getElementById('prop-x')?.addEventListener('input', () => update('x', safeFloat('prop-x')));
        document.getElementById('prop-y')?.addEventListener('input', () => update('y', safeFloat('prop-y')));
        document.getElementById('prop-w')?.addEventListener('change', () => update('width', safeFloat('prop-w')));
        document.getElementById('prop-h')?.addEventListener('change', () => update('height', safeFloat('prop-h')));

        document.getElementById('prop-font-family')?.addEventListener('change', (e) => update('fontFamily', e.target.value));
        document.getElementById('prop-fs')?.addEventListener('input', () => update('fontSize', safeFloat('prop-fs')));
        document.getElementById('prop-fw')?.addEventListener('change', (e) => {
            const [weight, style] = e.target.value.split('-');
            update('fontWeight', weight);
            update('fontStyle', style);
        });
        document.getElementById('prop-align')?.addEventListener('change', (e) => update('textAlign', e.target.value));
        document.getElementById('prop-text')?.addEventListener('input', (e) => update('text', e.target.value));
        document.getElementById('prop-var-name')?.addEventListener('input', (e) => update('varName', e.target.value));
        document.getElementById('prop-input-type')?.addEventListener('change', (e) => update('inputType', e.target.value));
        document.getElementById('prop-formatter')?.addEventListener('change', (e) => update('formatter', e.target.value));

        document.getElementById('prop-val-source')?.addEventListener('change', (e) => {
            update('isVariableValue', e.target.value === 'variable');
            this.updatePanel(this.elementManager.selectedElement);
        });
        document.getElementById('prop-val')?.addEventListener('input', (e) => update('value', e.target.value));
        document.getElementById('prop-display-val')?.addEventListener('change', (e) => update('displayValue', e.target.value === 'true'));

        // Shape listeners
        document.getElementById('prop-stroke-color')?.addEventListener('input', (e) => update('strokeColor', e.target.value));
        document.getElementById('prop-stroke-width')?.addEventListener('input', (e) => update('strokeThickness', safeFloat('prop-stroke-width')));

        const fillTransparentCb = document.getElementById('prop-fill-transparent');
        fillTransparentCb?.addEventListener('change', (e) => {
            const isTransparent = e.target.checked;
            const group = document.getElementById('prop-fill-color-group');
            if (isTransparent) {
                group.style.display = 'none';
                update('fillColor', 'transparent');
            } else {
                group.style.display = 'flex';
                // Pick up the current color input value when toggling off transparent
                const currentColor = document.getElementById('prop-fill-color').value;
                update('fillColor', currentColor);
            }
        });
        document.getElementById('prop-fill-color')?.addEventListener('input', (e) => update('fillColor', e.target.value));

        document.getElementById('btn-bring-forward')?.addEventListener('click', () => this.elementManager.bringForward());
        document.getElementById('btn-send-backward')?.addEventListener('click', () => this.elementManager.sendBackward());
        document.getElementById('btn-delete-el')?.addEventListener('click', () => {
            if (confirm("Are you sure?")) this.elementManager.deleteCurrentElement();
        });
    }
}


/* --- TemplateManager.js --- */
class TemplateManager {
    constructor(canvasManager, elementManager) {
        this.canvasManager = canvasManager;
        this.elementManager = elementManager;
    }

    serialize() {
        return {
            canvas: {
                width: this.canvasManager.widthMm,
                height: this.canvasManager.heightMm
            },
            elements: this.elementManager.elements,
            elementIdCounter: this.elementManager.elementIdCounter,
            groups: this.elementManager.groups,
            groupIdCounter: this.elementManager._groupIdCounter
        };
    }

    deserialize(data) {
        if (!data || !data.canvas || !data.elements) return;

        // Reset and apply canvas size
        this.canvasManager.resize(data.canvas.width, data.canvas.height);

        // Properly clear all elements (unsets interact.js listeners)
        this.elementManager.clearAll();
        this.canvasManager.clear();

        // Restore elements
        data.elements.forEach(meta => {
            this.elementManager.elements.push(meta);
            this.elementManager.renderElement(meta);
        });

        // Restore counter (saved value or recalculate)
        if (data.elementIdCounter) {
            this.elementManager.elementIdCounter = data.elementIdCounter;
        } else {
            let maxId = 0;
            data.elements.forEach(meta => {
                const num = parseInt(meta.id.replace('el-', ''));
                if (num > maxId) maxId = num;
            });
            this.elementManager.elementIdCounter = maxId + 1;
        }

        // Restore groups
        this.elementManager.groups = data.groups || [];
        this.elementManager._groupIdCounter = data.groupIdCounter || 1;

        this.elementManager.selectElement(null);
    }

    exportToFile() {
        let fileName = prompt("Enter a name for your template:", "label-template");
        if (fileName === null) return; // User cancelled
        if (fileName.trim() === "") fileName = "label-template";
        if (!fileName.endsWith(".json")) fileName += ".json";

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.serialize(), null, 2));
        const anchor = document.createElement('a');
        anchor.setAttribute("href", dataStr);
        anchor.setAttribute("download", fileName);
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
    }

    importFromFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.deserialize(data);
                document.getElementById('modal-dimensions').classList.remove('active');
            } catch (err) {
                alert('Invalid JSON file.');
            }
        };
        reader.readAsText(file);
    }
}


/* --- CSVParser.js --- */
/**
 * Standalone utility class for parsing CSV strings into structured JSON data.
 * It also immediately applies formatting from the ValueFormatter registry
 * based on the provided variables mapping.
 */
class CSVParser {
    /**
     * Parses a raw CSV string.
     * 
     * @param {string} text - The raw CSV string from the uploaded file
     * @param {Array} variables - Array of variable metadata objects (from ElementManager)
     * @returns {Object} Result object containing { success, data, headers, error }
     */
    static parse(text, variables = []) {
        if (!text || !text.trim()) {
            return { success: false, error: "The uploaded CSV is empty." };
        }

        // Extremely basic CSV parsing (splits by newlines, then commas). 
        // Note: This does not handle commas inside double quotes.
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');

        if (lines.length < 2) {
            return { success: false, error: "The CSV must contain a header row and at least one data row." };
        }

        const headers = lines[0].split(',').map(h => h.trim());
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            const rowObj = {};

            headers.forEach((header, index) => {
                let val = values[index] ? values[index].trim() : '';

                // If this header maps to a variable, apply its formatter immediately
                const matchingVar = variables.find(v => v.name === header);
                if (matchingVar) {
                    val = ValueFormatter.apply(matchingVar.formatter, val);
                }

                rowObj[header] = val;
            });
            data.push(rowObj);
        }

        return {
            success: true,
            headers: headers,
            data: data
        };
    }

    /**
     * Generates a sample CSV string based on currently defined variables.
     * 
     * @param {Array} variables - Array of variable metadata objects
     * @returns {string|null} The generated CSV string or null if no variables exist
     */
    static generateSample(variables) {
        if (!variables || variables.length === 0) {
            return null;
        }

        const headers = ["copies", ...variables.map(v => v.name)].join(',');
        const sampleRow = ["1", ...variables.map(v => "SampleData")].join(',');
        return headers + "\n" + sampleRow;
    }
}


/* --- PrintUIController.js --- */
/**
 * Handles the UI interactions for both Manual Print and Bulk (CSV) Print modals.
 * Gathers user input and passes clean data arrays to the core PrintEngine.
 */
class PrintUIController {
    constructor(printEngine, elementManager) {
        this.printEngine = printEngine;
        this.elementManager = elementManager;

        // Manual Print DOM
        this.modal = document.getElementById('modal-print');
        this.btnCancel = document.getElementById('btn-cancel-print');
        this.btnConfirm = document.getElementById('btn-confirm-print');
        this.copiesInput = document.getElementById('print-copies');
        this.layoutSelect = document.getElementById('print-layout');
        this.gapInput = document.getElementById('print-gap');
        this.groupGap = document.getElementById('group-gap');
        this.variablesForm = document.getElementById('print-variables-form');

        // Bulk Print DOM
        this.bulkModal = document.getElementById('modal-bulk-print');
        this.btnCancelBulk = document.getElementById('btn-cancel-bulk-print');
        this.btnConfirmBulk = document.getElementById('btn-confirm-bulk-print');
        this.bulkLayoutSelect = document.getElementById('bulk-print-layout');
        this.bulkGapInput = document.getElementById('bulk-print-gap');
        this.groupBulkGap = document.getElementById('group-bulk-print-gap');
        this.btnDownloadSample = document.getElementById('btn-download-csv-sample');
        this.btnUploadCSV = document.getElementById('btn-upload-csv');
        this.inputCSVUpload = document.getElementById('input-csv-upload');
        this.uploadStatus = document.getElementById('csv-upload-status');
        this.previewContainer = document.getElementById('csv-preview-container');
        this.groupBulkOption = document.getElementById('group-bulk-print-option');
        this.bulkOptionSelect = document.getElementById('bulk-print-option');
        this.groupBulkRowSelect = document.getElementById('group-bulk-row-select');
        this.bulkRowSelect = document.getElementById('bulk-row-select');

        // State
        this.variables = [];
        this.csvData = [];

        this.bindEvents();
    }

    bindEvents() {
        // Manual Print Events
        if (this.btnCancel) {
            this.btnCancel.addEventListener('click', () => {
                this.modal.classList.remove('active');
            });
        }

        if (this.btnConfirm) {
            this.btnConfirm.addEventListener('click', () => {
                this.executeManualPrint();
            });
        }

        if (this.layoutSelect) {
            this.layoutSelect.addEventListener('change', (e) => {
                if (this.groupGap) this.groupGap.style.display = e.target.value === '2' ? 'block' : 'none';
            });
        }

        // Bulk Print Events
        if (this.btnCancelBulk) {
            this.btnCancelBulk.addEventListener('click', () => {
                this.bulkModal.classList.remove('active');
            });
        }

        if (this.btnConfirmBulk) {
            this.btnConfirmBulk.addEventListener('click', () => {
                this.executeBulkPrint();
            });
        }

        if (this.bulkLayoutSelect) {
            this.bulkLayoutSelect.addEventListener('change', (e) => {
                if (this.groupBulkGap) this.groupBulkGap.style.display = e.target.value === '2' ? 'block' : 'none';
            });
        }

        if (this.btnDownloadSample) {
            this.btnDownloadSample.addEventListener('click', () => this.downloadSampleCSV());
        }

        if (this.btnUploadCSV && this.inputCSVUpload) {
            this.btnUploadCSV.addEventListener('click', () => this.inputCSVUpload.click());
        }

        if (this.inputCSVUpload) {
            this.inputCSVUpload.addEventListener('change', (e) => this.handleCSVUpload(e));
        }

        if (this.bulkOptionSelect) {
            this.bulkOptionSelect.addEventListener('change', (e) => {
                if (this.groupBulkRowSelect) {
                    this.groupBulkRowSelect.style.display = e.target.value === 'selected' ? 'block' : 'none';
                }
            });
        }

        const handlePrintEnter = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.executeManualPrint();
            }
        };

        if (this.copiesInput) this.copiesInput.addEventListener('keydown', handlePrintEnter);
        if (this.gapInput) this.gapInput.addEventListener('keydown', handlePrintEnter);
        if (this.layoutSelect) this.layoutSelect.addEventListener('keydown', handlePrintEnter);
    }

    /**
     * Extracts all unique variables defined in the current canvas elements.
     */
    getVariables() {
        const vars = new Map();
        // Sort by zIndex ascending (bottom layer first, reverse of Layers panel)
        const sorted = [...this.elementManager.elements].sort((a, b) => a.zIndex - b.zIndex);
        sorted.forEach(meta => {
            if (meta.type === 'var-text' && meta.varName) {
                vars.set(meta.varName, {
                    type: meta.inputType || 'text',
                    formatter: meta.formatter || 'none'
                });
            }
            if ((meta.type === 'barcode' || meta.type === 'qrcode') && meta.isVariableValue && meta.varName) {
                if (!vars.has(meta.varName)) {
                    vars.set(meta.varName, { type: 'text', formatter: 'none' });
                }
            }
        });
        return Array.from(vars.entries()).map(([name, config]) => ({ name, type: config.type, formatter: config.formatter }));
    }

    /**
     * Opens the standard Manual Print modal.
     */
    startPrintFlow() {
        this.elementManager.selectElement(null);
        this.variables = this.getVariables();
        this.buildVariableForm();

        if (this.modal) {
            this.modal.classList.add('active');

            // Auto-focus the first variable input, or the copies input if no variables
            setTimeout(() => {
                const firstVarInput = document.querySelector('#print-variables-form input');
                if (firstVarInput) {
                    firstVarInput.focus();
                } else if (this.copiesInput) {
                    this.copiesInput.focus();
                }
            }, 50);
        }
    }

    /**
     * Opens the Bulk (CSV) Print modal and resets its state.
     */
    startBulkPrintFlow() {
        this.elementManager.selectElement(null);
        this.variables = this.getVariables();

        // Reset the UI state
        if (this.inputCSVUpload) this.inputCSVUpload.value = '';
        if (this.uploadStatus) this.uploadStatus.textContent = 'Status: Waiting for CSV upload...';
        if (this.groupBulkOption) this.groupBulkOption.style.display = 'none';
        if (this.groupBulkRowSelect) this.groupBulkRowSelect.style.display = 'none';
        if (this.previewContainer) {
            this.previewContainer.innerHTML = '';
            this.previewContainer.style.display = 'none';
        }
        this.csvData = [];

        if (this.bulkModal) this.bulkModal.classList.add('active');
    }

    /**
     * Dynamically builds the inputs for the Manual Print modal based on active variables.
     */
    buildVariableForm() {
        if (!this.variablesForm) return;

        if (this.variables.length === 0) {
            this.variablesForm.style.display = 'none';
            this.variablesForm.innerHTML = '';
            return;
        }

        this.variablesForm.style.display = 'block';
        let html = '';

        this.variables.forEach(v => {
            let inputHtml = '';
            if (v.type === 'date') {
                inputHtml = `<input type="date" id="var-${v.name}" class="var-input" required>`;
            } else {
                inputHtml = `<input type="text" id="var-${v.name}" class="var-input" required>`;
            }

            // Using the standard .form-group layout from other modals (e.g., New Label)
            let hintHtml = v.formatter !== 'none' ? ` <span style="text-transform:none; font-weight:normal;">(Format: ${v.formatter})</span>` : '';

            html += `
                <div class="form-group">
                    <label for="var-${v.name}">${v.name}${hintHtml}</label>
                    ${inputHtml}
                </div>
            `;
        });

        this.variablesForm.innerHTML = html;

        // Attach Enter key listener to dynamically created inputs
        const handlePrintEnter = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.executeManualPrint();
            }
        };
        const dynamicInputs = this.variablesForm.querySelectorAll('input');
        dynamicInputs.forEach(input => input.addEventListener('keydown', handlePrintEnter));
    }

    downloadSampleCSV() {
        const csvString = CSVParser.generateSample(this.variables);
        if (!csvString) {
            alert("No variables found in your layout to create a sample CSV.");
            return;
        }
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "label-sample.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    handleCSVUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const result = CSVParser.parse(text, this.variables);

            if (!result.success) {
                alert(result.error);
                return;
            }

            this.csvData = result.data;

            // Update UI
            if (this.uploadStatus) this.uploadStatus.textContent = `Status: Loaded ${this.csvData.length} row(s) successfully.`;
            if (this.groupBulkOption) this.groupBulkOption.style.display = 'block';
            this.renderCSVPreview(result.headers);

            // Populate specific row select dropdown
            if (this.bulkRowSelect) {
                this.bulkRowSelect.innerHTML = '';
                this.csvData.forEach((row, index) => {
                    const previewText = result.headers.length > 0 ? row[result.headers[0]] : `Row ${index + 1}`;
                    const option = document.createElement('option');
                    option.value = index;
                    option.textContent = `Row ${index + 1}: ${previewText}...`;
                    this.bulkRowSelect.appendChild(option);
                });
            }

            // If 'selected' was already chosen, show dropdown
            if (this.bulkOptionSelect && this.bulkOptionSelect.value === 'selected') {
                if (this.groupBulkRowSelect) this.groupBulkRowSelect.style.display = 'block';
            }
        };
        reader.readAsText(file);
    }

    renderCSVPreview(headers) {
        if (!this.previewContainer) return;

        if (this.csvData.length === 0) {
            this.previewContainer.style.display = 'none';
            return;
        }

        let html = '<table><thead><tr>';
        headers.forEach(h => { html += `<th>${h}</th>`; });
        html += '</tr></thead><tbody>';

        // Limit preview to first 5 rows
        const rowsToShow = Math.min(this.csvData.length, 5);
        for (let i = 0; i < rowsToShow; i++) {
            html += '<tr>';
            const row = this.csvData[i];
            headers.forEach(h => {
                const val = row[h] !== undefined ? row[h] : '';
                html += `<td>${val}</td>`;
            });
            html += '</tr>';
        }

        html += '</tbody></table>';

        if (this.csvData.length > 5) {
            html += `<div style="padding: 8px; text-align: center; color: var(--text-muted); font-size: 11px;">Showing first 5 rows of ${this.csvData.length} total.</div>`;
        }

        this.previewContainer.innerHTML = html;
        this.previewContainer.style.display = 'block';
    }

    executeManualPrint() {
        const copies = parseInt(this.copiesInput ? this.copiesInput.value : 1) || 1;
        const layout = parseInt(this.layoutSelect ? this.layoutSelect.value : 1) || 1;
        const gapMm = parseFloat(this.gapInput ? this.gapInput.value : 2) || 0;

        const formData = {};
        let hasError = false;

        this.variables.forEach(v => {
            const el = document.getElementById(`var-${v.name}`);
            if (!el) return;

            if (el.value.trim() === '') {
                el.style.borderColor = 'var(--danger-color)';
                el.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
                hasError = true;
            } else {
                el.style.borderColor = '';
                el.style.boxShadow = '';
                // Formatting is applied live during input via ValueFormatter inside the print engine mapped flow,
                // but we also apply it here immediately for safety.
                formData[v.name] = ValueFormatter.apply(v.formatter, el.value);
            }
        });

        if (hasError) {
            alert('Please fill in all variable fields before printing.');
            return;
        }

        formData['_copies'] = copies;
        const rowsToPrint = [formData];

        if (this.modal) this.modal.classList.remove('active');
        this.printEngine.triggerBrowserPrint(rowsToPrint, layout, gapMm);
    }

    executeBulkPrint() {
        const layout = parseInt(this.bulkLayoutSelect ? this.bulkLayoutSelect.value : 1) || 1;
        const gapMm = parseFloat(this.bulkGapInput ? this.bulkGapInput.value : 2) || 0;

        if (this.csvData.length === 0) {
            alert("Please upload a valid CSV file first.");
            return;
        }

        let rowsToPrint = [];

        if (this.bulkOptionSelect && this.bulkOptionSelect.value === 'all') {
            rowsToPrint = this.csvData.map(row => {
                const formattedRow = {};
                this.variables.forEach(v => {
                    formattedRow[v.name] = row[v.name] || '';
                });
                const rowCopies = parseInt(row['copies']) || parseInt(row['Copies']) || 1;
                formattedRow['_copies'] = rowCopies;
                return formattedRow;
            });
        } else {
            const selectedIndex = parseInt(this.bulkRowSelect ? this.bulkRowSelect.value : 0);
            if (isNaN(selectedIndex) || !this.csvData[selectedIndex]) {
                alert("Invalid row selected.");
                return;
            }
            const row = this.csvData[selectedIndex];
            const formattedRow = {};
            this.variables.forEach(v => {
                formattedRow[v.name] = row[v.name] || '';
            });
            const rowCopies = parseInt(row['copies']) || parseInt(row['Copies']) || 1;
            formattedRow['_copies'] = rowCopies;
            rowsToPrint.push(formattedRow);
        }

        if (this.bulkModal) this.bulkModal.classList.remove('active');
        this.printEngine.triggerBrowserPrint(rowsToPrint, layout, gapMm);
    }
}


/* --- PrintEngine.js --- */
class PrintEngine {
    constructor(canvasManager, elementManager) {
        this.canvasManager = canvasManager;
        this.elementManager = elementManager;

        this.printZone = document.getElementById('print-zone');

        // Initialize the new UI Controller and link it back to this engine
        this.uiController = new PrintUIController(this, elementManager);

        // Cleanup print zone after printing
        window.addEventListener('afterprint', () => {
            this.cleanupPrintZone();
        });
    }

    /**
     * Entry points called by app.js toolbar buttons.
     * These immediately delegate to the UI Controller.
     */
    startPrintFlow() {
        this.uiController.startPrintFlow();
    }

    startBulkPrintFlow() {
        this.uiController.startBulkPrintFlow();
    }

    triggerBrowserPrint(rowsToPrint, layout, gapMm) {
        this.updatePageSize(layout, gapMm);
        this.printZone.innerHTML = ''; // Ensure clear

        // Setup a container specifically for handling multi-page flow effectively
        this.buildPrintZone(rowsToPrint, layout, gapMm);

        // Delay for barcode/QR rendering, then print
        setTimeout(() => {
            window.print();
        }, 500); // Increased slightly for bulk generation reliability
    }

    applyFormatting(val, formatterStr) {
        return ValueFormatter.apply(formatterStr, val);
    }

    /**
     * Dynamically updates @page size based on layout mode.
     */
    updatePageSize(layout, gapMm) {
        const widthMm = this.canvasManager.widthMm;
        const heightMm = this.canvasManager.heightMm;

        const pageWidth = layout === 2 ? (widthMm * 2) + gapMm : widthMm;
        const pageHeight = heightMm;

        let style = document.getElementById('print-page-style');
        if (!style) {
            style = document.createElement('style');
            style.id = 'print-page-style';
            document.head.appendChild(style);
        }
        style.textContent = `@page { size: ${pageWidth}mm ${pageHeight}mm; margin: 0; }`;
    }

    /**
     * Builds a separate hidden print zone with N copies of the label across M rows.
     */
    buildPrintZone(rowsToPrint, layout, gapMm) {
        const widthMm = this.canvasManager.widthMm;
        const heightMm = this.canvasManager.heightMm;
        const pxPerMm = this.canvasManager.pxPerMm;

        // Flatten all labels into a single continuous array
        // e.g. Row 1 (2 copies), Row 2 (2 copies) -> [Label1, Label1, Label2, Label2]
        const allLabelsToPrint = [];

        rowsToPrint.forEach(formData => {
            const mappedElements = this.elementManager.elements.filter(meta => {
                let isVisible = meta.visible !== false;
                if (isVisible && meta.group) {
                    const group = this.elementManager.groups.find(g => g.id === meta.group);
                    if (group && group.visible === false) {
                        isVisible = false;
                    }
                }
                return isVisible;
            }).map(meta => {
                const clone = JSON.parse(JSON.stringify(meta));
                if (clone.type === 'var-text' && clone.varName) {
                    clone.text = formData[clone.varName] || clone.text;
                }
                if ((clone.type === 'barcode' || clone.type === 'qrcode') && clone.isVariableValue && clone.varName) {
                    clone.value = formData[clone.varName] || clone.value;
                }
                return clone;
            });

            const rowCopies = formData['_copies'] || 1;
            for (let i = 0; i < rowCopies; i++) {
                allLabelsToPrint.push(mappedElements);
            }

            // If we are in 2-up layout and this specific data row resulted in an odd number of labels,
            // we pad the array with a 'null' marker so the next data row starts fresh on a new line.
            if (layout === 2 && rowCopies % 2 !== 0) {
                allLabelsToPrint.push(null); // Represents a blank label
            }
        });

        if (layout === 2) {
            // Group into pairs of 2 labels
            for (let i = 0; i < allLabelsToPrint.length; i += 2) {
                const isLastOdd = (i === allLabelsToPrint.length - 1); // True if there's no pair for the last item

                const rowContainer = document.createElement('div');
                rowContainer.className = 'print-label-row';
                rowContainer.style.width = `${(widthMm * 2) + gapMm}mm`;
                rowContainer.style.height = `${heightMm}mm`;

                // Add left label (if null, it's a padding element, add empty div context)
                if (allLabelsToPrint[i]) {
                    rowContainer.appendChild(this.buildSingleLabel(allLabelsToPrint[i], widthMm, heightMm, pxPerMm));
                } else {
                    const emptyLeft = document.createElement('div');
                    emptyLeft.className = 'print-empty-label';
                    emptyLeft.style.width = `${widthMm}mm`;
                    emptyLeft.style.height = `${heightMm}mm`;
                    rowContainer.appendChild(emptyLeft);
                }

                // Gap
                if (gapMm > 0) {
                    const gap = document.createElement('div');
                    gap.className = 'print-gap';
                    gap.style.width = `${gapMm}mm`;
                    rowContainer.appendChild(gap);
                }

                // Add right label if exists
                if (!isLastOdd) {
                    if (allLabelsToPrint[i + 1]) {
                        rowContainer.appendChild(this.buildSingleLabel(allLabelsToPrint[i + 1], widthMm, heightMm, pxPerMm));
                    } else {
                        const emptyRight = document.createElement('div');
                        emptyRight.className = 'print-empty-label';
                        emptyRight.style.width = `${widthMm}mm`;
                        emptyRight.style.height = `${heightMm}mm`;
                        rowContainer.appendChild(emptyRight);
                    }
                }

                this.printZone.appendChild(rowContainer);
            }
        } else {
            // Standard 1-Up layout
            allLabelsToPrint.forEach(mappedElements => {
                const labelPage = document.createElement('div');
                labelPage.className = 'print-label-page';
                labelPage.style.width = `${widthMm}mm`;
                labelPage.style.height = `${heightMm}mm`;

                mappedElements.forEach(meta => {
                    labelPage.appendChild(ElementRenderer.createPrintElement(meta, pxPerMm));
                });

                this.printZone.appendChild(labelPage);
            });
        }
    }

    buildSingleLabel(mappedElements, widthMm, heightMm, pxPerMm) {
        const label = document.createElement('div');
        label.className = 'print-single-label';
        label.style.width = `${widthMm}mm`;
        label.style.height = `${heightMm}mm`;

        mappedElements.forEach(meta => {
            label.appendChild(ElementRenderer.createPrintElement(meta, pxPerMm));
        });

        return label;
    }

    cleanupPrintZone() {
        this.printZone.innerHTML = '';
        // Restore @page to original canvas dimensions
        this.canvasManager.updatePrintStyles();
    }
}


/* --- app.js --- */
// Global state structure
const App = {
    canvasManager: null,
    elementManager: null,
    propertyPanel: null,
    templateManager: null,
    printEngine: null,

    init() {
        this.setupThemeToggle();
        this.setupModals();
        this.setupTopActions();
        this.setupToolPanel();
        this.setupZoomControls();

        // Initialize default workspace on boot so tools (Import/Print) function immediately
        this.initializeWorkspace(50, 25);

        // Register Service Worker for PWA
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js').then((registration) => {
                    console.log('SW registered: ', registration);
                }).catch((registrationError) => {
                    console.log('SW registration failed: ', registrationError);
                });
            });
        }
    },

    setupThemeToggle() {
        const toggle = document.getElementById('checkbox-theme');
        const themeIcon = document.getElementById('theme-icon');

        const isDark = localStorage.getItem('theme') === 'dark';
        if (isDark) {
            document.body.setAttribute('data-theme', 'dark');
            toggle.checked = true;
            themeIcon.textContent = '☀️';
        }

        // Grid Toggle Setup
        const gridToggle = document.getElementById('checkbox-grid');
        const showGrid = localStorage.getItem('showGrid') === 'true';
        if (showGrid) {
            document.body.classList.add('show-grid');
            gridToggle.checked = true;
        }

        toggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.body.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                themeIcon.textContent = '☀️';
            } else {
                document.body.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
                themeIcon.textContent = '🌙';
            }
        });

        gridToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.body.classList.add('show-grid');
                localStorage.setItem('showGrid', 'true');
            } else {
                document.body.classList.remove('show-grid');
                localStorage.setItem('showGrid', 'false');
            }
        });

        // Global Esc key listener to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const activeModal = document.querySelector('.modal.active');
                if (activeModal) {
                    activeModal.classList.remove('active');
                }
            }
        });
    },

    setupModals() {
        // Setup Modal Close Buttons (the 'X' icons)
        const closeBtns = document.querySelectorAll('.modal-close-btn');
        closeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.classList.remove('active');
                }
            });
        });

        const modalDimensions = document.getElementById('modal-dimensions');
        const btnCreateCanvas = document.getElementById('btn-create-canvas');

        // Startup Dimensions
        const handleCreateWorkspace = () => {
            const width = parseFloat(document.getElementById('label-width').value);
            const height = parseFloat(document.getElementById('label-height').value);

            if (width > 0 && height > 0) {
                modalDimensions.classList.remove('active');
                this.initializeWorkspace(width, height);
            } else {
                alert('Please enter valid dimensions');
            }
        };

        btnCreateCanvas.addEventListener('click', handleCreateWorkspace);

        const handleDimensionsEnter = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleCreateWorkspace();
            }
        };

        document.getElementById('label-width').addEventListener('keydown', handleDimensionsEnter);
        document.getElementById('label-height').addEventListener('keydown', handleDimensionsEnter);

        // Text Edit Modal logic setup
        this.setupTextEditModal();
    },

    setupTextEditModal() {
        this.modalTextEdit = document.getElementById('modal-text-edit');
        this.inputEditTextVal = document.getElementById('edit-text-val');
        this.inputEditVarName = document.getElementById('edit-var-name');
        this.groupEditVar = document.getElementById('group-edit-var');

        document.getElementById('btn-cancel-text-edit').addEventListener('click', () => {
            this.modalTextEdit.classList.remove('active');
            this._editingMeta = null;
        });

        const handleSaveTextEdit = () => {
            if (this._editingMeta) {
                const updates = { text: this.inputEditTextVal.value };
                if (this._editingMeta.type === 'var-text') {
                    updates.varName = this.inputEditVarName.value;
                }

                // Ensure the property panel gets updated if this is the currently selected element
                if (this.elementManager.selectedElement && this.elementManager.selectedElement.id === this._editingMeta.id) {
                    this.elementManager.updateCurrentMeta(updates);
                } else {
                    // Update meta manually if it wasn't strictly selected
                    Object.assign(this._editingMeta, updates);
                    this.elementManager.renderElement(this._editingMeta);
                }
            }
            this.modalTextEdit.classList.remove('active');
            this._editingMeta = null;
        };

        document.getElementById('btn-save-text-edit').addEventListener('click', handleSaveTextEdit);

        const handleTextEditEnter = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSaveTextEdit();
            }
        };

        this.inputEditTextVal.addEventListener('keydown', handleTextEditEnter);
        this.inputEditVarName.addEventListener('keydown', handleTextEditEnter);
    },

    openTextEditModal(meta) {
        this._editingMeta = meta;
        this.inputEditTextVal.value = meta.text || '';
        if (meta.type === 'var-text') {
            this.groupEditVar.style.display = 'block';
            this.inputEditVarName.value = meta.varName || '';
        } else {
            this.groupEditVar.style.display = 'none';
        }
        this.modalTextEdit.classList.add('active');

        // Auto-select the text content input so user can just start typing
        setTimeout(() => {
            this.inputEditTextVal.select();
        }, 50); // slight delay for modal CSS transition
    },

    initializeWorkspace(widthMm, heightMm) {
        if (this.canvasManager) {
            // If already initialized, just resize the existing workspace and clear it
            this.canvasManager.resize(widthMm, heightMm);
            this.elementManager.clearAll(); // Note: clearAll() already calls buildLayersPanel internally now

            // Note: Keep zoom level intact
            return;
        }

        // Instantiate managers (only happens once on boot)
        this.canvasManager = new CanvasManager('design-canvas', widthMm, heightMm);
        this.elementManager = new ElementManager(this.canvasManager);
        this.elementManager.buildLayersPanel(); // Show empty layers state
        this.propertyPanel = new PropertyPanel(this.elementManager);
        this.templateManager = new TemplateManager(this.canvasManager, this.elementManager);
        this.printEngine = new PrintEngine(this.canvasManager, this.elementManager);

        this.zoomLevel = 2;

        // Apply initial zoom
        const canvas = document.getElementById('design-canvas');
        canvas.style.transformOrigin = 'center center';
        canvas.style.transform = `scale(${this.zoomLevel})`;
        canvas.style.setProperty('--zoom', this.zoomLevel);
    },

    setupZoomControls() {
        const slider = document.getElementById('zoom-slider');
        const readout = document.getElementById('zoom-readout');
        const canvas = document.getElementById('design-canvas');

        slider.addEventListener('input', (e) => {
            this.zoomLevel = parseFloat(e.target.value);
            readout.textContent = `${Math.round(this.zoomLevel * 100)}%`;
            canvas.style.transformOrigin = 'center center';
            canvas.style.transform = `scale(${this.zoomLevel})`;
            canvas.style.setProperty('--zoom', this.zoomLevel);
        });
    },

    setupToolPanel() {
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (!this.elementManager) return;
                const toolType = e.currentTarget.dataset.tool;
                this.elementManager.addElement(toolType);
            });
        });

        // New Group button
        const newGroupBtn = document.getElementById('btn-new-group');
        if (newGroupBtn) {
            newGroupBtn.addEventListener('click', () => {
                if (!this.elementManager) return;
                const name = prompt('Group name:', `Group ${this.elementManager._groupIdCounter}`);
                if (!name) return;
                const group = {
                    id: `group-${this.elementManager._groupIdCounter++}`,
                    name: name,
                    collapsed: false,
                    visible: true
                };
                this.elementManager.groups.push(group);

                // If an element is selected, assign it to the new group
                if (this.elementManager.selectedElement) {
                    this.elementManager.selectedElement.group = group.id;
                }
                this.elementManager.buildLayersPanel();
            });
        }
    },

    setupTopActions() {
        document.getElementById('btn-new-project').addEventListener('click', () => {
            // Show the dimensions modal to start a new project
            document.getElementById('modal-dimensions').classList.add('active');
            setTimeout(() => {
                document.getElementById('label-width').focus();
            }, 50);
        });

        document.getElementById('btn-export-json').addEventListener('click', () => {
            if (this.templateManager) this.templateManager.exportToFile();
        });

        const importBtn = document.getElementById('btn-import-json');
        const importInput = document.getElementById('import-file-input');

        importBtn.addEventListener('click', () => {
            importInput.click();
        });

        importInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0 && this.templateManager) {
                this.templateManager.importFromFile(e.target.files[0]);
                e.target.value = ''; // Reset
            }
        });

        document.getElementById('btn-print').addEventListener('click', () => {
            if (this.printEngine) this.printEngine.startPrintFlow();
        });

        document.getElementById('btn-bulk-print').addEventListener('click', () => {
            if (this.printEngine) this.printEngine.startBulkPrintFlow();
        });
    }
};

// Start app when DOM loaded
document.addEventListener('DOMContentLoaded', () => {
    window.App = App;
    App.init();
});


