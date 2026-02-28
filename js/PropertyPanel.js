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
