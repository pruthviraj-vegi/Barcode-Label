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
        this.groupBulkGap = document.getElementById('group-bulk-gap');
        this.btnDownloadSample = document.getElementById('btn-download-sample');
        this.btnUploadCSV = document.getElementById('btn-upload-csv');
        this.inputCSVUpload = document.getElementById('input-csv-upload');
        this.uploadStatus = document.getElementById('upload-status');
        this.previewContainer = document.getElementById('csv-preview-container');
        this.groupBulkOption = document.getElementById('group-bulk-option');
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
