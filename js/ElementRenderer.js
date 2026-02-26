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
            const span = document.createElement('div');
            span.style.width = '100%';
            span.style.height = '100%';
            span.style.fontFamily = `"${meta.fontFamily || 'Inter'}", sans-serif`;
            span.style.fontSize = `${meta.fontSize}pt`;
            span.style.fontWeight = meta.fontWeight;
            span.style.textAlign = meta.textAlign;
            span.style.wordBreak = 'break-word';
            span.style.overflow = 'hidden';
            span.style.lineHeight = '1.15';
            span.style.whiteSpace = 'pre-wrap';
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
     * Generates the Google Fonts URL from the shared FONTS array.
     * @returns {string}
     */
    getGoogleFontsUrl() {
        const families = this.FONTS.map(f => {
            const encoded = f.replace(/ /g, '+');
            // Decorative fonts don't need weight specs
            if (['Pacifico', 'Slabo 27px'].includes(f)) return `family=${encoded}`;
            return `family=${encoded}:wght@400;600;700`;
        });
        return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;
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
