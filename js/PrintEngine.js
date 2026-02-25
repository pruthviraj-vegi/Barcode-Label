class PrintEngine {
    constructor(canvasManager, elementManager) {
        this.canvasManager = canvasManager;
        this.elementManager = elementManager;
        this.modal = document.getElementById('modal-print');
        this.formContainer = document.getElementById('print-variables-form');
        this.btnConfirm = document.getElementById('btn-confirm-print');
        this.btnCancel = document.getElementById('btn-cancel-print');
        this.copiesInput = document.getElementById('print-copies');
        this.layoutSelect = document.getElementById('print-layout');
        this.gapInput = document.getElementById('print-gap');
        this.groupGap = document.getElementById('group-print-gap');
        this.printZone = document.getElementById('printZone');

        this.variables = [];

        this.bindEvents();
    }

    bindEvents() {
        this.btnCancel.addEventListener('click', () => {
            this.modal.classList.remove('active');
        });

        this.btnConfirm.addEventListener('click', () => {
            this.executePrint();
        });

        if (this.layoutSelect) {
            this.layoutSelect.addEventListener('change', (e) => {
                if (e.target.value === '2') {
                    this.groupGap.style.display = 'block';
                } else {
                    this.groupGap.style.display = 'none';
                }
            });
        }

        // Cleanup print zone after printing
        window.addEventListener('afterprint', () => {
            this.cleanupPrintZone();
        });
    }

    getVariables() {
        const vars = new Map();
        this.elementManager.elements.forEach(meta => {
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

    startPrintFlow() {
        this.elementManager.selectElement(null);
        this.variables = this.getVariables();
        this.buildVariableForm();
        this.modal.classList.add('active');
    }

    buildVariableForm() {
        this.formContainer.innerHTML = '';
        this.variables.forEach(v => {
            const group = document.createElement('div');
            group.className = 'form-group';
            group.innerHTML = `
                <label for="var-${v.name}">Field: ${v.name}</label>
                <input type="${v.type}" id="var-${v.name}" placeholder="Enter value for ${v.name}">
            `;
            this.formContainer.appendChild(group);
        });
    }

    executePrint() {
        const formData = {};
        this.variables.forEach(v => {
            let val = document.getElementById(`var-${v.name}`).value || '';

            // Apply Formatter
            if (v.formatter === 'currency') {
                const num = parseFloat(val);
                if (!isNaN(num)) val = num.toLocaleString();
            } else if (v.formatter === 'date-compact') {
                // expecting YYYY-MM-DD from date input
                if (val.includes('-')) {
                    const [y, m, d] = val.split('-');
                    val = `${d}${m}${y}`;
                }
            } else if (v.formatter === 'uppercase') {
                val = val.toUpperCase();
            } else if (v.formatter === 'lowercase') {
                val = val.toLowerCase();
            }

            formData[v.name] = val;
        });

        const copies = parseInt(this.copiesInput.value) || 1;
        const layout = parseInt(this.layoutSelect ? this.layoutSelect.value : 1) || 1;
        const gapMm = parseFloat(this.gapInput ? this.gapInput.value : 2) || 0;

        this.modal.classList.remove('active');

        // Build mapped elements with variable data injected
        const mappedElements = this.elementManager.elements.map(meta => {
            const clone = JSON.parse(JSON.stringify(meta));
            if (clone.type === 'var-text' && clone.varName) {
                clone.text = formData[clone.varName] || clone.text;
            }
            if ((clone.type === 'barcode' || clone.type === 'qrcode') && clone.isVariableValue && clone.varName) {
                clone.value = formData[clone.varName] || clone.value;
            }
            return clone;
        });

        // Set correct @page size for the chosen layout
        this.updatePageSize(layout, gapMm);

        // Build the print zone
        this.buildPrintZone(mappedElements, copies, layout, gapMm);

        // Delay for barcode/QR rendering, then print
        setTimeout(() => {
            window.print();
        }, 300);
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
     * Builds a separate hidden print zone with N copies of the label.
     * The main design canvas is NEVER modified.
     */
    buildPrintZone(mappedElements, copies, layout, gapMm) {
        this.printZone.innerHTML = '';

        const widthMm = this.canvasManager.widthMm;
        const heightMm = this.canvasManager.heightMm;
        const pxPerMm = this.canvasManager.pxPerMm;

        if (layout === 2) {
            const pairs = Math.ceil(copies / 2);
            for (let i = 0; i < pairs; i++) {
                const isLastOdd = (i === pairs - 1) && (copies % 2 !== 0);

                const rowContainer = document.createElement('div');
                rowContainer.className = 'print-label-row';
                rowContainer.style.cssText = `
                    width: ${(widthMm * 2) + gapMm}mm;
                    height: ${heightMm}mm;
                    display: flex;
                    page-break-after: always;
                    break-after: page;
                    background: white;
                `;

                rowContainer.appendChild(this.buildSingleLabel(mappedElements, widthMm, heightMm, pxPerMm));

                if (gapMm > 0) {
                    const gap = document.createElement('div');
                    gap.style.width = `${gapMm}mm`;
                    gap.style.flexShrink = '0';
                    rowContainer.appendChild(gap);
                }

                if (!isLastOdd) {
                    rowContainer.appendChild(this.buildSingleLabel(mappedElements, widthMm, heightMm, pxPerMm));
                }

                this.printZone.appendChild(rowContainer);
            }
        } else {
            for (let i = 0; i < copies; i++) {
                const labelPage = document.createElement('div');
                labelPage.className = 'print-label-page';
                labelPage.style.cssText = `
                    width: ${widthMm}mm;
                    height: ${heightMm}mm;
                    position: relative;
                    page-break-after: always;
                    break-after: page;
                    background: white;
                    overflow: hidden;
                `;

                mappedElements.forEach(meta => {
                    labelPage.appendChild(ElementRenderer.createPrintElement(meta, pxPerMm));
                });

                this.printZone.appendChild(labelPage);
            }
        }
    }

    buildSingleLabel(mappedElements, widthMm, heightMm, pxPerMm) {
        const label = document.createElement('div');
        label.style.cssText = `
            width: ${widthMm}mm;
            height: ${heightMm}mm;
            position: relative;
            background: white;
            overflow: hidden;
            flex-shrink: 0;
        `;

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
