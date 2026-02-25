class ElementManager {
    constructor(canvasManager) {
        this.canvasManager = canvasManager;
        this.elements = [];
        this.selectedElement = null;
        this.elementIdCounter = 1;

        // Listeners for deselection
        this.canvasManager.getContainer().addEventListener('click', (e) => {
            if (e.target.id === 'design-canvas') {
                this.selectElement(null);
            }
        });

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
            }
        });
    }

    addElement(type) {
        const id = `el-${this.elementIdCounter++}`;
        const elMeta = {
            id,
            type,
            x: 5, // mm
            y: 5, // mm
            width: type === 'barcode' ? 30 : 20, // mm
            height: type === 'barcode' ? 10 : 5,  // mm
            zIndex: this.elements.length + 1,
            // Specific properties
            text: type === 'text' ? 'Sample Text' : (type === 'var-text' ? 'Variable' : ''),
            varName: type === 'var-text' ? 'variable' : '',
            fontFamily: 'Inter', // Default
            fontSize: 10, // pt
            fontWeight: 'normal',
            textAlign: 'left',
            value: type === 'barcode' || type === 'qrcode' ? '123456789' : '',
            isVariableValue: false, // For barcode/qrcode
            displayValue: true, // For barcode text
            inputType: type === 'var-text' ? 'text' : '', // For print form
            formatter: type === 'var-text' ? 'none' : '', // For output rendering
        };

        this.elements.push(elMeta);
        this.renderElement(elMeta);

        // Auto select newly created Element
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

            // Manual double-click detection (more reliable than 'dblclick' when interact.js intercepts drags)
            let clickTimeout = null;
            let clickCount = 0;

            el.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectElement(meta);

                clickCount++;
                if (clickCount === 1) {
                    clickTimeout = setTimeout(() => {
                        clickCount = 0; // reset after timeout
                    }, 300); // 300ms window for double click
                } else if (clickCount === 2) {
                    clearTimeout(clickTimeout);
                    clickCount = 0;

                    // Trigger double click logic
                    if (meta.type === 'text' || meta.type === 'var-text') {
                        if (window.App && window.App.openTextEditModal) {
                            window.App.openTextEditModal(meta);
                        }
                    }
                }
            });
        }

        // Apply Common Styles
        el.style.position = 'absolute';
        el.style.left = `${this.canvasManager.mmToPx(meta.x)}px`;
        el.style.top = `${this.canvasManager.mmToPx(meta.y)}px`;

        // Set container dimensions for ALL element types
        el.style.width = `${this.canvasManager.mmToPx(meta.width)}px`;
        el.style.height = `${this.canvasManager.mmToPx(meta.height)}px`;

        el.style.zIndex = meta.zIndex;

        // Use shared renderer for content
        ElementRenderer.renderContent(el, meta, this.canvasManager.pxPerMm);

        this.addResizeHandles(el);
    }

    addResizeHandles(el) {
        // Interact.js creates handles virtually, but UI needs visual cues if selected
        if (this.selectedElement && this.selectedElement.id === el.id) {
            el.classList.add('selected');

            // Add custom DOM handles for all 4 corners
            if (!el.querySelector('.resize-handle.tl')) {
                const tl = document.createElement('div');
                tl.className = 'resize-handle tl';
                el.appendChild(tl);
            }
            if (!el.querySelector('.resize-handle.tr')) {
                const tr = document.createElement('div');
                tr.className = 'resize-handle tr';
                el.appendChild(tr);
            }
            if (!el.querySelector('.resize-handle.bl')) {
                const bl = document.createElement('div');
                bl.className = 'resize-handle bl';
                el.appendChild(bl);
            }
            if (!el.querySelector('.resize-handle.br')) {
                const br = document.createElement('div');
                br.className = 'resize-handle br';
                el.appendChild(br);
            }
        } else {
            el.classList.remove('selected');
            // Cleanup visually
            const handles = el.querySelectorAll('.resize-handle');
            handles.forEach(h => h.remove());
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
                    move: (event) => {
                        const target = event.target;
                        const meta = this.elements.find(m => m.id === target.id);
                        if (!meta) return;

                        // Calculate new pixels, respecting zoom scale
                        const zoom = window.App ? window.App.zoomLevel || 1 : 1;
                        let xPx = this.canvasManager.mmToPx(meta.x) + (event.dx / zoom);
                        let yPx = this.canvasManager.mmToPx(meta.y) + (event.dy / zoom);

                        // Update DOM
                        target.style.left = `${xPx}px`;
                        target.style.top = `${yPx}px`;

                        // Update Meta
                        meta.x = this.canvasManager.pxToMm(xPx);
                        meta.y = this.canvasManager.pxToMm(yPx);

                        if (App.propertyPanel) App.propertyPanel.updatePanelValues(meta);
                    }
                }
            })
            .resizable({
                edges: {
                    left: '.resize-handle.tl, .resize-handle.bl',
                    right: '.resize-handle.tr, .resize-handle.br',
                    bottom: '.resize-handle.bl, .resize-handle.br',
                    top: '.resize-handle.tl, .resize-handle.tr'
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

                        // Re-render content internally if needed
                        ElementRenderer.renderContent(target, meta, this.canvasManager.pxPerMm);
                        this.addResizeHandles(target);
                        if (App.propertyPanel) App.propertyPanel.updatePanelValues(meta);
                    }
                }
            });
    }

    selectElement(meta) {
        const prevMeta = this.selectedElement;
        this.selectedElement = meta; // Update state first

        // Deselect previous
        if (prevMeta) {
            const prevEl = document.getElementById(prevMeta.id);
            if (prevEl) {
                prevEl.classList.remove('selected');
                this.addResizeHandles(prevEl); // removes handles visually
            }
        }

        // Select new
        if (this.selectedElement) {
            const el = document.getElementById(this.selectedElement.id);
            if (el) {
                el.classList.add('selected');
                this.addResizeHandles(el); // adds handles visually
            }
        }

        // Notify PropertyPanel (full rebuild on selection change)
        if (App.propertyPanel) {
            App.propertyPanel.updatePanel(this.selectedElement);
        }
    }

    updateCurrentMeta(updates) {
        if (!this.selectedElement) return;

        Object.assign(this.selectedElement, updates);
        this.renderElement(this.selectedElement);
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
        this.selectedElement = null;
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
            this.selectElement(null);
        }
    }

    bringForward() {
        if (!this.selectedElement) return;
        this.selectedElement.zIndex++;
        this.renderElement(this.selectedElement);
    }

    sendBackward() {
        if (!this.selectedElement) return;
        if (this.selectedElement.zIndex > 1) {
            this.selectedElement.zIndex--;
            this.renderElement(this.selectedElement);
        }
    }
}
