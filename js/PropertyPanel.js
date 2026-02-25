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

        if (!meta) {
            this.container.innerHTML = '<p class="empty-state">Select an element to edit properties</p>';
            return;
        }

        let html = `
            <div class="prop-section">
                <h3>General</h3>
                <div class="form-group row">
                    <div class="col">
                        <label>X (mm)</label>
                        <input type="number" id="prop-x" value="${meta.x.toFixed(2)}" step="1">
                    </div>
                    <div class="col">
                        <label>Y (mm)</label>
                        <input type="number" id="prop-y" value="${meta.y.toFixed(2)}" step="1">
                    </div>
                </div>
                <div class="form-group row">
                    <div class="col">
                        <label>Width (mm)</label>
                        <input type="number" id="prop-w" value="${meta.width.toFixed(2)}" step="1">
                    </div>
                    <div class="col">
                        <label>Height (mm)</label>
                        <input type="number" id="prop-h" value="${meta.height.toFixed(2)}" step="1">
                    </div>
                </div>
                <div class="form-group row">
                    <button id="btn-bring-forward" class="btn secondary">Bring Forward</button>
                    <button id="btn-send-backward" class="btn secondary">Send Backward</button>
                </div>
            </div>
        `;

        if (meta.type === 'text' || meta.type === 'var-text') {
            html += `
                <div class="prop-section">
                    <h3>Text Properties</h3>
                    <div class="form-group">
                        <label>Font Family</label>
                        <select id="prop-font-family">
                            ${ElementRenderer.buildFontOptions(meta.fontFamily)}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Font Size (pt)</label>
                        <input type="number" id="prop-fs" value="${meta.fontSize}" step="1">
                    </div>
                    <div class="form-group">
                        <label>Font Weight</label>
                        <select id="prop-fw">
                            <option value="normal" ${meta.fontWeight === 'normal' ? 'selected' : ''}>Normal</option>
                            <option value="bold" ${meta.fontWeight === 'bold' ? 'selected' : ''}>Bold</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Alignment</label>
                        <select id="prop-align">
                            <option value="left" ${meta.textAlign === 'left' ? 'selected' : ''}>Left</option>
                            <option value="center" ${meta.textAlign === 'center' ? 'selected' : ''}>Center</option>
                            <option value="right" ${meta.textAlign === 'right' ? 'selected' : ''}>Right</option>
                        </select>
                    </div>
            `;

            if (meta.type === 'text') {
                html += `
                    <div class="form-group">
                        <label>Text Content</label>
                        <input type="text" id="prop-text" value="${meta.text}">
                    </div>
                `;
            } else {
                html += `
                    <div class="form-group">
                        <label>Variable Name</label>
                        <input type="text" id="prop-var-name" value="${meta.varName}" placeholder="e.g. batch_no">
                    </div>
                    <div class="form-group">
                        <label>Input Type</label>
                        <select id="prop-input-type">
                            <option value="text" ${meta.inputType === 'text' || !meta.inputType ? 'selected' : ''}>Text</option>
                            <option value="number" ${meta.inputType === 'number' ? 'selected' : ''}>Number</option>
                            <option value="date" ${meta.inputType === 'date' ? 'selected' : ''}>Date</option>
                            <option value="time" ${meta.inputType === 'time' ? 'selected' : ''}>Time</option>
                            <option value="color" ${meta.inputType === 'color' ? 'selected' : ''}>Color</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Output Formatter</label>
                        <select id="prop-formatter">
                            ${ValueFormatter.buildOptionsHtml(meta.formatter)}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Placeholder Text</label>
                        <input type="text" id="prop-text" value="${meta.text}">
                    </div>
                `;
            }

            html += `
            </div>`;
        } else if (meta.type === 'barcode' || meta.type === 'qrcode') {
            html += `
                <div class="prop-section">
                    <h3>${meta.type === 'barcode' ? 'Barcode' : 'QR Code'} Properties</h3>
                    <div class="form-group">
                        <label>Value Source</label>
                        <select id="prop-val-source">
                            <option value="fixed" ${!meta.isVariableValue ? 'selected' : ''}>Fixed Value</option>
                            <option value="variable" ${meta.isVariableValue ? 'selected' : ''}>From Variable</option>
                        </select>
                    </div>
            `;

            if (!meta.isVariableValue) {
                html += `
                    <div class="form-group">
                        <label>Fixed Value</label>
                        <input type="text" id="prop-val" value="${meta.value}">
                    </div>
                `;
            } else {
                html += `
                    <div class="form-group">
                        <label>Variable Name Map</label>
                        <input type="text" id="prop-var-name" value="${meta.varName || ''}" placeholder="e.g. batch_no">
                    </div>
                    <div class="form-group">
                        <label>Preview Value</label>
                        <input type="text" id="prop-val" value="${meta.value}">
                    </div>
                `;
            }

            if (meta.type === 'barcode') {
                html += `
                    <div class="form-group">
                        <label>Display Text Below Barcode</label>
                        <select id="prop-display-val">
                            <option value="true" ${meta.displayValue ? 'selected' : ''}>Yes</option>
                            <option value="false" ${!meta.displayValue ? 'selected' : ''}>No</option>
                        </select>
                    </div>
                `;
            }
            html += `</div>`;
        }

        html += `
            <div class="prop-section delete-section">
                <button id="btn-delete-el" class="btn danger full-width">Delete Element</button>
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
        document.getElementById('prop-fw')?.addEventListener('change', (e) => update('fontWeight', e.target.value));
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

        document.getElementById('btn-bring-forward')?.addEventListener('click', () => this.elementManager.bringForward());
        document.getElementById('btn-send-backward')?.addEventListener('click', () => this.elementManager.sendBackward());
        document.getElementById('btn-delete-el')?.addEventListener('click', () => {
            if (confirm("Are you sure?")) this.elementManager.deleteCurrentElement();
        });
    }
}
