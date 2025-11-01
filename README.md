# CtrlMind - Interactive Brain Visualization with Daily Check-ins

**CtrlMind** is an interactive brain visualization app built with D3.js that implements a daily check-in system for habit tracking. Users can select brain regions across a 30/60/90-day journey, with progress tracked via localStorage.

## Live demo

You can view the production site here: https://ctrlmind.netlify.app/

The app features a unique dual check-in system:
- **Button check-in**: Selects all regions for the current day
- **Region click check-in**: Selects individual regions while still completing the day

## Development Commands

```bash
# Start development server (opens at http://localhost:3000)
npm run dev

# Build for production (outputs to dist/)
npm run build

# Preview production build
npm run preview
```

## Architecture

### Core Application Structure

The application is a single-page app with all logic in `src/js/main.js` (~1000 lines). The `BrainSelector` class manages:

1. **State Management** - All data stored in localStorage with UTC timestamps
2. **SVG Manipulation** - D3.js for region interactions and visual updates
3. **Check-in Logic** - Dual system (button vs region click)
4. **Streak Calculation** - Current streak = consecutive days from highest day backwards

### Key Data Structure

All data persists in localStorage as `brain-checkin-data`:

```javascript
{
  startDate: "2025-10-22T23:15:30.456Z",  // UTC timestamp (ISO 8601)
  currentWay: 30,                          // 30/60/90 day journey
  completedDays: [1, 2, 3],               // Days marked complete (permanent)
  checkedRegions: {                        // Toggleable region selections
    "1": [1, 2, 3],                       // Day -> [region numbers]
    "2": [4, 5, 6]
  },
  maxDayReached: 3,                        // Highest day number achieved
  currentStreakDays: 3,                    // Consecutive days from max backwards
  lastFailDate: null                       // UTC timestamp of last fail click
}
```

**Critical Design Principles:**
- **Store in UTC, display in local timezone** - All timestamps use `toISOString()` for storage
- **Dual completion tracking** - `completedDays` (permanent) vs `checkedRegions` (toggleable)
- **Fail button lock** - After clicking "Fail", all regions lock until next calendar day

### Region Distribution

- 90 total brain regions (numbered 1-90)
- Distribution formula: `regionsPerDay = 90 / way`
  - 30 days = 3 regions/day
  - 60 days = 1.5 regions/day
  - 90 days = 1 region/day
- Region-to-day mapping: `dayNumber = Math.ceil(regionNumber / regionsPerDay)`

### Critical Functions

**Region Selection Flow:**
- `setupRegionInteractions()` - Sets up D3 click handlers, locks all regions if failed today
- `handleRegionClick(regionNumber)` - Determines if click completes day or just toggles region
- `markDayAsCompleted(dayNumber)` - Adds day to completedDays array (permanent)
- `handleManualRegionClick(regionNumber)` - Adds region to checkedRegions (toggleable)

**Fail Button Behavior:**
- Sets `lastFailDate` to current UTC timestamp
- `hasFailedToday()` - Checks if fail was clicked today (compares local dates)
- Locks ALL regions via `setupRegionInteractions()` - sets `pointer-events: none`
- Disables both check-in and fail buttons until next calendar day

**Streak Calculation:**
```javascript
// Current streak = consecutive days from highest day backwards
// Example: completedDays = [1, 2, 3, 5, 6] → streak = 2 (days 6, 5)
calculateCurrentStreak(completedDays)
```

## File Locations

- **Main application**: `src/js/main.js` (BrainSelector class)
- **Styles**: `src/css/style.css` (includes mobile-optimized touch styles)
- **SVG brain**: `public/main.svg` (90 regions with IDs `region-1` through `region-90`)
- **Region metadata**: `public/regions.json` (region names and descriptions)
- **Entry point**: `index.html`

## Testing

Comprehensive test scenarios documented in `TESTING_GUIDE.md` covering:
- Dual check-in methods (button vs region click)
- All three way settings (30/60/90 days)
- Fail button locking behavior
- Region selection/deselection persistence
- Streak calculation edge cases

Use browser DevTools console to simulate different days:
```javascript
// Simulate Day 5 with Days 1-4 completed
const data = JSON.parse(localStorage.getItem('brain-checkin-data'));
data.completedDays = [1, 2, 3, 4];
data.startDate = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
localStorage.setItem('brain-checkin-data', JSON.stringify(data));
location.reload();
```

## Important Implementation Notes

### Date Handling
- Always use `getTodayTimestamp()` for storage (returns UTC ISO string)
- Use `getLocalDateString()` for day comparisons (extracts YYYY-MM-DD in local timezone)
- This ensures timezone-safe day boundary detection

### Region Locking States
Three visual states applied via CSS classes:
1. **Locked** (default) - Gray, no outline, not-allowed cursor
2. **Unlocked** - Blue outline, pointer cursor, clickable
3. **Selected** - Green fill, clickable (can deselect)

### Check-in vs Region Selection
- **completedDays array**: Permanent record, marks day as achieved
- **checkedRegions object**: Visual state only, toggleable by clicking regions
- A day can be in completedDays with zero regions in checkedRegions (valid state)

### Gap Filling on Way Changes
When user changes way mid-journey, `getActualRegionsToUnlock()` fills gaps to ensure all previous regions are covered based on new distribution.


## Development Notes

- D3.js v7 used for all SVG manipulation
- Vite for build tooling (ES modules)
- No backend - 100% client-side with localStorage
- Mobile-optimized with touch event handling and overscroll prevention