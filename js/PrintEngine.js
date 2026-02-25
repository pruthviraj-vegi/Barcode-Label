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

        // Bulk Print Modals & Elements
        this.bulkModal = document.getElementById('modal-bulk-print');
        this.btnConfirmBulk = document.getElementById('btn-confirm-bulk-print');
        this.btnCancelBulk = document.getElementById('btn-cancel-bulk-print');
        this.btnDownloadSample = document.getElementById('btn-download-csv-sample');
        this.btnUploadCSV = document.getElementById('btn-upload-csv');
        this.inputCSVUpload = document.getElementById('input-csv-upload');
        this.uploadStatus = document.getElementById('csv-upload-status');
        this.previewContainer = document.getElementById('csv-preview-container');
        this.groupBulkOption = document.getElementById('group-bulk-print-option');
        this.bulkOptionSelect = document.getElementById('bulk-print-option');
        this.groupBulkRowSelect = document.getElementById('group-bulk-row-select');
        this.bulkRowSelect = document.getElementById('bulk-row-select');
        this.bulkLayoutSelect = document.getElementById('bulk-print-layout');
        this.bulkGapInput = document.getElementById('bulk-print-gap');
        this.groupBulkGap = document.getElementById('group-bulk-print-gap');

        this.printZone = document.getElementById('printZone');

        this.variables = [];
        this.csvData = []; // Array of parsed row objects

        this.bindEvents();
    }

    bindEvents() {
        // Manual Print Events
        this.btnCancel.addEventListener('click', () => {
            this.modal.classList.remove('active');
        });

        this.btnConfirm.addEventListener('click', () => {
            this.executeManualPrint();
        });

        if (this.layoutSelect) {
            this.layoutSelect.addEventListener('change', (e) => {
                this.groupGap.style.display = e.target.value === '2' ? 'block' : 'none';
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
                this.groupBulkGap.style.display = e.target.value === '2' ? 'block' : 'none';
            });
        }

        if (this.btnDownloadSample) {
            this.btnDownloadSample.addEventListener('click', () => this.downloadSampleCSV());
        }

        if (this.btnUploadCSV) {
            this.btnUploadCSV.addEventListener('click', () => this.inputCSVUpload.click());
        }

        if (this.inputCSVUpload) {
            this.inputCSVUpload.addEventListener('change', (e) => this.handleCSVUpload(e));
        }

        if (this.bulkOptionSelect) {
            this.bulkOptionSelect.addEventListener('change', (e) => {
                if (e.target.value === 'selected') {
                    this.groupBulkRowSelect.style.display = 'block';
                } else {
                    this.groupBulkRowSelect.style.display = 'none';
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

    startBulkPrintFlow() {
        this.elementManager.selectElement(null);
        this.variables = this.getVariables();

        // Reset state
        this.csvData = [];
        if (this.uploadStatus) this.uploadStatus.textContent = 'Status: No file uploaded yet.';
        if (this.previewContainer) {
            this.previewContainer.innerHTML = '';
            this.previewContainer.style.display = 'none';
        }
        if (this.groupBulkOption) this.groupBulkOption.style.display = 'none';
        if (this.groupBulkRowSelect) this.groupBulkRowSelect.style.display = 'none';
        if (this.inputCSVUpload) this.inputCSVUpload.value = '';

        this.bulkModal.classList.add('active');
    }

    buildVariableForm() {
        if (!this.formContainer) return;
        this.formContainer.innerHTML = '';

        if (this.variables.length === 0) {
            this.formContainer.innerHTML = '<p style="color: #666; font-style: italic;">No variable fields found in this template.</p>';
            return;
        }

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

    downloadSampleCSV() {
        if (this.variables.length === 0) {
            alert("No variables found in your layout to create a sample CSV.");
            return;
        }

        const headers = ["copies", ...this.variables.map(v => v.name)].join(',');
        const sampleRow = ["1", ...this.variables.map(v => "SampleData")].join(',');
        const csvContent = headers + "\n" + sampleRow;

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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
            this.parseCSV(text);
        };
        reader.readAsText(file);
    }

    parseCSV(text) {
        if (!text.trim()) {
            alert("The uploaded CSV is empty.");
            return;
        }

        // Extremely basic CSV parsing (splits by newlines, then commas). 
        // Note: This does not handle commas inside double quotes.
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');

        if (lines.length < 2) {
            alert("The CSV must contain a header row and at least one data row.");
            return;
        }

        const headers = lines[0].split(',').map(h => h.trim());
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            const rowObj = {};

            headers.forEach((header, index) => {
                let val = values[index] ? values[index].trim() : '';

                // If this header maps to a variable, apply its formatter immediately
                const matchingVar = this.variables.find(v => v.name === header);
                if (matchingVar) {
                    val = this.applyFormatting(val, matchingVar.formatter);
                }

                rowObj[header] = val;
            });
            data.push(rowObj);
        }

        this.csvData = data;

        // Update UI
        this.uploadStatus.textContent = `Status: Loaded ${this.csvData.length} row(s) successfully.`;
        this.groupBulkOption.style.display = 'block';
        this.renderCSVPreview(headers);

        // Populate specific row select dropdown
        this.bulkRowSelect.innerHTML = '';
        this.csvData.forEach((row, index) => {
            const previewText = headers.length > 0 ? row[headers[0]] : `Row ${index + 1}`;
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `Row ${index + 1}: ${previewText}...`;
            this.bulkRowSelect.appendChild(option);
        });

        // If 'selected' was already chosen, show dropdown
        if (this.bulkOptionSelect.value === 'selected') {
            this.groupBulkRowSelect.style.display = 'block';
        }
    }

    renderCSVPreview(headers) {
        if (!this.previewContainer) return;

        if (this.csvData.length === 0) {
            this.previewContainer.style.display = 'none';
            return;
        }

        let html = '<table><thead><tr>';
        // Headers
        headers.forEach(h => {
            html += `<th>${h}</th>`;
        });
        html += '</tr></thead><tbody>';

        // Limit preview to first 5 rows to prevent massive DOM slowdowns on huge CSVs
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
        const copies = parseInt(this.copiesInput.value) || 1;
        const layout = parseInt(this.layoutSelect ? this.layoutSelect.value : 1) || 1;
        const gapMm = parseFloat(this.gapInput ? this.gapInput.value : 2) || 0;

        const formData = {};
        let hasError = false;

        this.variables.forEach(v => {
            const el = document.getElementById(`var-${v.name}`);
            if (!el) return;

            if (el.value.trim() === '') {
                // Highlight empty inputs
                el.style.borderColor = 'var(--danger-color)';
                el.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
                hasError = true;
            } else {
                // Remove highlight if filled
                el.style.borderColor = '';
                el.style.boxShadow = '';

                let val = el.value;
                val = this.applyFormatting(val, v.formatter);
                formData[v.name] = val;
            }
        });

        if (hasError) {
            alert('Please fill in all variable fields before printing.');
            return;
        }

        // Add default copies to formData so it can be picked up by buildPrintZone
        formData['_copies'] = copies;

        const rowsToPrint = [formData];

        this.modal.classList.remove('active');
        this.triggerBrowserPrint(rowsToPrint, layout, gapMm);
    }

    executeBulkPrint() {
        const layout = parseInt(this.bulkLayoutSelect ? this.bulkLayoutSelect.value : 1) || 1;
        const gapMm = parseFloat(this.bulkGapInput ? this.bulkGapInput.value : 2) || 0;

        if (this.csvData.length === 0) {
            alert("Please upload a valid CSV file first.");
            return;
        }

        let rowsToPrint = [];

        if (this.bulkOptionSelect.value === 'all') {
            rowsToPrint = this.csvData.map(row => {
                const formattedRow = {};
                this.variables.forEach(v => {
                    // Values were already formatted during parseCSV
                    formattedRow[v.name] = row[v.name] || '';
                });
                // Look for 'copies' column, default to 1
                const rowCopies = parseInt(row['copies']) || parseInt(row['Copies']) || 1;
                formattedRow['_copies'] = rowCopies;
                return formattedRow;
            });
        } else {
            const selectedIndex = parseInt(this.bulkRowSelect.value);
            if (isNaN(selectedIndex) || !this.csvData[selectedIndex]) {
                alert("Invalid row selected.");
                return;
            }
            const row = this.csvData[selectedIndex];
            const formattedRow = {};
            this.variables.forEach(v => {
                // Values were already formatted during parseCSV
                formattedRow[v.name] = row[v.name] || '';
            });
            const rowCopies = parseInt(row['copies']) || parseInt(row['Copies']) || 1;
            formattedRow['_copies'] = rowCopies;
            rowsToPrint.push(formattedRow);
        }

        this.bulkModal.classList.remove('active');
        this.triggerBrowserPrint(rowsToPrint, layout, gapMm);
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
        if (!val) return '';
        if (formatterStr === 'currency') {
            const num = parseFloat(val);
            if (!isNaN(num)) return num.toLocaleString();
        } else if (formatterStr === 'date-compact') {
            if (val.includes('-')) {
                const [y, m, d] = val.split('-');
                return `${d}${m}${y}`;
            }
            if (val.includes('/')) {
                return val.replace(/\//g, '');
            }
        } else if (formatterStr === 'uppercase') {
            return String(val).toUpperCase();
        } else if (formatterStr === 'lowercase') {
            return String(val).toLowerCase();
        }
        return val;
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
