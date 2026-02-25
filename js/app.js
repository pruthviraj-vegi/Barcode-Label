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
    },

    setupModals() {
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

        // Auto-select the input text so user can just start typing
        setTimeout(() => {
            if (meta.type === 'text') {
                this.inputEditTextVal.select();
            } else if (meta.type === 'var-text') {
                this.inputEditVarName.select();
            }
        }, 50); // slight delay for modal CSS transition
    },

    initializeWorkspace(widthMm, heightMm) {
        if (this.canvasManager) {
            // If already initialized, just resize the existing workspace and clear it
            this.canvasManager.resize(widthMm, heightMm);
            this.elementManager.clearAll();
            this.canvasManager.clear();

            // Note: Keep zoom level intact
            return;
        }

        // Instantiate managers (only happens once on boot)
        this.canvasManager = new CanvasManager('design-canvas', widthMm, heightMm);
        this.elementManager = new ElementManager(this.canvasManager);
        this.propertyPanel = new PropertyPanel(this.elementManager);
        this.templateManager = new TemplateManager(this.canvasManager, this.elementManager);
        this.printEngine = new PrintEngine(this.canvasManager, this.elementManager);

        this.zoomLevel = 2;

        // Apply initial zoom
        const canvas = document.getElementById('design-canvas');
        canvas.style.transformOrigin = 'center center';
        canvas.style.transform = `scale(${this.zoomLevel})`;
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
    },

    setupTopActions() {
        document.getElementById('btn-new-project').addEventListener('click', () => {
            // Show the dimensions modal to start a new project
            document.getElementById('modal-dimensions').classList.add('active');
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
