# Barcode Label Designer

A lightweight, purely client-side web application for designing and printing custom barcode labels. Built with vanilla JavaScript, HTML5, and CSS3, this tool allows users to visually arrange text and barcodes on a specific label dimension, save templates, and print them accurately.

## 🚀 Features

- **Drag and Drop Interface:** Intuitive design canvas to precisely place label elements.
- **Custom Label Dimensions:** Define exact width and height (in millimeters) for your label roll.
- **Multiple Element Types Supported:**
  - **Fixed Text:** Static text content with customizable fonts and sizes.
  - **Variable Text:** Dynamic text blocks intended for programmatic or sequential data printing.
  - **Code128 Barcode:** Industry-standard linear barcodes.
  - **QR Code:** 2D matrix barcodes.
- **Property Editing:** Real-time property panel to modify positions, sizes, text content, and variable names.
- **Template Management:** Save and load your designs locally in the browser.
- **Import / Export:** Export designs to JSON files and share or back them up, import them anytime.
- **Advanced Printing Engine:**
  - Print multiple copies seamlessly.
  - Support for custom layouts such as **1-Up (Single Column)** and **2-Up (Two Columns)** layouts.
  - Configurable horizontal gap parsing between columns.
- **Design Experience:**
  - Zoom Controls for fine detailing (50% up to 600%).
  - Grid overlay toggle for alignment assistance.
  - Dark Mode & Light Mode support for comfortable viewing.

## 🛠️ Technology Stack

- **Core:** Vanilla JavaScript, HTML5, CSS3
- **Fonts:** Assorted Web Fonts retrieved via Google Fonts
- **Dependencies (Loaded via CDN):**
  - [interact.js](https://interactjs.io/) - For smooth drag-and-drop and resizing interactions.
  - [JsBarcode](https://lindell.me/JsBarcode/) - For generating Code128 barcodes.
  - [QRCode.js](https://davidshimjs.github.io/qrcodejs/) - For rendering high-quality QR codes.

## 📂 Project Structure

```text
barcode-printer/
├── css/
│   └── styles.css           # Main cascading stylesheet including themes and layout
├── js/
│   ├── app.js               # Application initialization and UI event binding
│   ├── CanvasManager.js     # Manages canvas initialization, scaling, and grid
│   ├── ElementManager.js    # Handles elements creation, selection state, and positioning
│   ├── ElementRenderer.js   # Responsible for DOM injection and rendering of tools
│   ├── PrintEngine.js       # Prepares the hidden DOM printable area and processes layouts
│   ├── PropertyPanel.js     # Hooks element properties to the right sidebar UI form
│   ├── TemplateManager.js   # Controls localStorage saves and JSON File API Import/Export
│   └── ValueFormatter.js    # Processes dynamic text evaluation for variables
├── index.html               # Main HTML architecture and layout
└── README.md                # Project documentation
```

## 💻 Getting Started

This application requires zero build steps or server-side setups.

1. Clone or download the repository.
2. Open `index.html` directly in your favorite modern web browser (Chrome, Firefox, Edge, Safari).
3. Set your label dimensions (e.g., 50mm x 25mm) upon opening.
4. Use the left **Tools** sidebar to drag elements to the design canvas.
5. Setup the properties on the right **Properties** side panel.
6. Click **Print** when your design is ready!

## 📄 License

_(Add your license here)_
