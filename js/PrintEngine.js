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
                rowContainer.style.cssText = `
                    width: ${(widthMm * 2) + gapMm}mm;
                    height: ${heightMm}mm;
                    display: flex;
                    page-break-after: always;
                    break-after: page;
                    background: white;
                `;

                // Add left label (if null, it's a padding element, add empty div context)
                if (allLabelsToPrint[i]) {
                    rowContainer.appendChild(this.buildSingleLabel(allLabelsToPrint[i], widthMm, heightMm, pxPerMm));
                } else {
                    const emptyLeft = document.createElement('div');
                    emptyLeft.style.cssText = `width: ${widthMm}mm; height: ${heightMm}mm; flex-shrink: 0;`;
                    rowContainer.appendChild(emptyLeft);
                }

                // Gap
                if (gapMm > 0) {
                    const gap = document.createElement('div');
                    gap.style.width = `${gapMm}mm`;
                    gap.style.flexShrink = '0';
                    rowContainer.appendChild(gap);
                }

                // Add right label if exists
                if (!isLastOdd) {
                    if (allLabelsToPrint[i + 1]) {
                        rowContainer.appendChild(this.buildSingleLabel(allLabelsToPrint[i + 1], widthMm, heightMm, pxPerMm));
                    } else {
                        const emptyRight = document.createElement('div');
                        emptyRight.style.cssText = `width: ${widthMm}mm; height: ${heightMm}mm; flex-shrink: 0;`;
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
            });
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
