### 🧠 **Project Title:**

**Interactive Brain SVG Selector**

---

### 🎯 **Goal:**

Display a brain SVG where each region is **clickable**, toggles color on selection, shows a **tooltip/legend** on hover, and **persists selections** using `localStorage`.

There is an example SVG of a brain with regions defined by `<path>` elements. Each region should be identifiable by a unique ID or `data-region` attribute.

The file name is brain.svg and it is located in the root directory.

---

### 🧩 **Core Features:**

1. **Display SVG Brain Image**

   * Inline embed the provided SVG for accessibility and interactivity.
   * Each brain region should have a unique ID or `data-region` attribute.

2. **Click Interaction**

   * When a user clicks a region, it toggles its fill color (selected/unselected state).

3. **Persistence**

   * Selected regions are stored in `localStorage`.
   * On page reload, previously selected regions are restored with their color.

4. **Tooltip / Legend**

   * On hover, display the name of the region as a tooltip.
   * Optionally, create a small floating legend showing selected regions.

5. **No Backend**

   * 100% client-side (pure frontend implementation).

---

### ⚙️ **Technology Stack:**

| Area                  | Tool / Library                                  | Purpose                                                                      |
| --------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------- |
| **Base UI**           | **HTML5 + CSS3**                                | For structure and styling.                                                   |
| **Interactivity**     | **JavaScript (ES6)**                            | For click handling, localStorage, and DOM manipulation.                      |
| **SVG Handling**      | **D3.js (v7+)**                                 | For advanced SVG selection, hover animations, transitions, and data binding. |
| **Tooltips**          | **Tippy.js** *(optional)* or custom CSS tooltip | For hover tooltips on brain regions.                                         |
| **State Persistence** | **localStorage API**                            | To save and restore selected regions.                                        |
| **Build/Run Setup**   | **Vite** *(recommended)* or simple static HTML  | For quick development and live reloading.                                    |
| **Version Control**   | **Git + GitHub**                                | For code versioning and collaboration.                                       |

---

### 📁 **Recommended Folder Structure:**

```
brain-selector/
│
├── index.html
├── src/
│   ├── assets/
│   │   └── brain.svg
│   ├── js/
│   │   └── main.js
│   ├── css/
│   │   └── style.css
│   └── data/
│       └── regions.json   # Optional: region names or metadata
│
├── package.json
└── README.md
```

---

### 🧠 **Enhancement Ideas (optional):**

* Animate color transitions with D3 easing.
* Add a reset button to clear all selections.
* Allow multiple color schemes (e.g., active/inactive themes).
* Display selected region names in a sidebar list.

---

