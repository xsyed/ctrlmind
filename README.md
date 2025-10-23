# 🧠 Interactive Brain SVG Selector

A fully interactive brain visualization tool built with D3.js that allows users to select brain regions, view detailed information, and persist their selections across sessions.

![Brain Selector](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Features

- **Interactive SVG Brain**: Click on different brain regions to select/deselect them
- **Visual Feedback**: 
  - Hover effects with color changes
  - Selected regions highlighted in green
  - Smooth animations and transitions
- **Smart Tooltips**: Hover over regions to see their name and function
- **Persistent Storage**: Selections automatically saved to `localStorage` and restored on page reload
- **Region Legend**: 
  - View all selected regions in a sidebar
  - See complete list of brain regions
  - Quick deselect from the legend
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Reset Functionality**: Clear all selections with one click

## 🧩 Brain Regions

The brain model includes 8 major regions:

1. **Frontal Lobe** - Decision making, problem solving, motor control
2. **Parietal Lobe** - Spatial awareness, touch perception, navigation
3. **Temporal Lobe** - Hearing, memory formation, language
4. **Occipital Lobe** - Visual processing, color recognition
5. **Cerebellum** - Balance, coordination, motor learning
6. **Brain Stem** - Breathing, heart rate, blood pressure
7. **Motor Cortex** - Voluntary movement, motor planning
8. **Prefrontal Cortex** - Executive functions, personality, social behavior

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd nnn
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:3000`

### Build for Production

```bash
npm run build
```

The production files will be in the `dist` directory.

## 📁 Project Structure

```
brain-selector/
│
├── index.html                  # Main HTML file
├── package.json               # Dependencies and scripts
├── vite.config.js            # Vite configuration
│
├── src/
│   ├── assets/
│   │   └── brain.svg         # Brain SVG with regions
│   │
│   ├── css/
│   │   └── style.css         # All styling
│   │
│   ├── js/
│   │   └── main.js           # Main application logic
│   │
│   └── data/
│       └── regions.json      # Brain regions metadata
│
└── README.md
```

## 🛠️ Technology Stack

| Technology | Purpose |
|------------|---------|
| **HTML5** | Structure and markup |
| **CSS3** | Styling, animations, responsive design |
| **JavaScript (ES6+)** | Application logic |
| **D3.js v7** | SVG manipulation, data binding, transitions |
| **Vite** | Build tool and dev server |
| **localStorage API** | Client-side data persistence |

## 💡 How It Works

### 1. SVG Loading
The brain SVG is loaded dynamically using the Fetch API and inserted into the DOM. Each region has:
- Unique `data-region` ID
- `data-name` attribute for display
- `.brain-region` class for styling

### 2. Selection Management
```javascript
// Selections stored in a Set
this.selectedRegions = new Set();

// Toggle on click
toggleRegion(regionId) {
  if (this.selectedRegions.has(regionId)) {
    this.selectedRegions.delete(regionId);
  } else {
    this.selectedRegions.add(regionId);
  }
  this.saveSelections();
}
```

### 3. Persistence
```javascript
// Save to localStorage
saveSelections() {
  const array = Array.from(this.selectedRegions);
  localStorage.setItem('brain-selected-regions', JSON.stringify(array));
}

// Load on page load
loadSelections() {
  const saved = localStorage.getItem('brain-selected-regions');
  this.selectedRegions = new Set(JSON.parse(saved));
}
```

### 4. D3.js Integration
```javascript
// Set up region interactions
regions
  .on('click', (event) => this.toggleRegion(event))
  .on('mouseenter', (event) => this.showTooltip(event))
  .on('mouseleave', () => this.hideTooltip());
```

## 💾 Data Storage Format

The application stores check-in data in `localStorage` using UTC timestamps for data integrity and local timezone for display.

### Storage Structure

```javascript
{
  "startDate": "2025-10-22T23:15:30.456Z",  // UTC timestamp of first check-in
  "checkIns": [
    {
      "region": 1,                            // Region number (1-90)
      "timestamp": "2025-10-22T23:15:30.456Z" // UTC timestamp with seconds precision
    },
    {
      "region": 2,
      "timestamp": "2025-10-23T14:22:45.789Z"
    }
  ]
}
```

### Design Principles

- **Store in UTC**: All timestamps stored in UTC (ISO 8601 format) for consistency across timezones
- **Display in Local**: Dates displayed to users in their local timezone
- **Seconds Precision**: Full timestamp including seconds for accurate audit trail
- **Clean Implementation**: No legacy format support - all data uses ISO timestamps

### Example Data Flow

1. **User checks in** (at 11:15 PM PST on Oct 22, 2025):
   - Stored: `"2025-10-23T07:15:30.456Z"` (UTC)
   - Displayed: "Oct 22, 2025" (local date)

2. **Day calculation**:
   - Compare local dates extracted from UTC timestamps
   - Ensures day boundaries respect user's timezone

## 🎨 Customization

### Adding New Regions

1. Add a new path to `src/assets/brain.svg`:
```xml
<path
   data-region="new-region-id"
   data-name="New Region Name"
   class="brain-region"
   d="M ..." />
```

2. Add metadata to `src/data/regions.json`:
```json
{
  "id": "new-region-id",
  "name": "New Region Name",
  "description": "Function description",
  "functions": ["Function 1", "Function 2"]
}
```

### Changing Colors

Edit the CSS in `src/css/style.css`:
```css
.brain-region {
  fill: #e0e0e0;  /* Default color */
}

.brain-region.selected {
  fill: #4CAF50;  /* Selected color */
}
```

## 🧪 Testing

To test the application:

1. **Click Interaction**: Click various regions to select/deselect
2. **Hover Tooltips**: Hover over regions to see tooltips
3. **Persistence**: Select regions, reload the page, verify selections persist
4. **Reset**: Click "Reset All Selections" to clear everything
5. **Legend**: Verify selected regions appear in the sidebar
6. **Responsive**: Test on different screen sizes

## 🐛 Troubleshooting

### SVG Not Loading
- Check that `brain.svg` exists in `src/assets/`
- Verify the fetch path is correct
- Check browser console for errors

### Selections Not Persisting
- Check if localStorage is enabled in your browser
- Verify no browser extensions are blocking localStorage
- Check browser console for storage errors

### Tooltip Not Showing
- Ensure regions have `data-region` and `data-name` attributes
- Check that tooltip element exists in HTML
- Verify z-index in CSS

## 📝 License

MIT License - feel free to use this project for educational or commercial purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For questions or feedback, please open an issue on GitHub.

---

Built with ❤️ using D3.js and modern web technologies
