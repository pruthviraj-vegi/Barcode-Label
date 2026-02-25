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
            elementIdCounter: this.elementManager.elementIdCounter
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
