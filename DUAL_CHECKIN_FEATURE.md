# Dual Check-in Feature Documentation

## Overview
Users can now complete their daily check-in using TWO different methods, each with different behaviors:

### Method 1: Button Check-in (All Regions)
- Click the "Day X Check-in" button
- **Result**: ALL regions for that day become selected
- Use case: User wants to fill all regions at once

### Method 2: Region Click Check-in (Single Region)
- Click ANY region belonging to the current day
- **Result**: ONLY the clicked region becomes selected
- Use case: User wants minimal interaction or selective region filling

## Key Differences

| Feature | Button Check-in | Region Click Check-in |
|---------|----------------|----------------------|
| **Trigger** | Click button | Click any current-day region |
| **Day Completion** | ✅ Yes | ✅ Yes |
| **Regions Selected** | ALL regions for the day | ONLY the clicked region |
| **Button State** | Changes to "Day X Achieved" | Changes to "Day X Achieved" |
| **Next Day Unlocked** | ✅ Yes | ✅ Yes |
| **Streak Update** | ✅ Yes | ✅ Yes |

## Examples

### 30-Day Way, Day 1 (Regions 1-3)

**Button Check-in:**
1. Click "Day 1 Check-in"
2. Result: Regions 1, 2, AND 3 all selected ✅

**Region Click Check-in:**
1. Click region-2
2. Result: ONLY region-2 selected ✅
3. Can still click regions 1 and 3 to select them manually

### 60-Day Way, Day 1 (Regions 1-2)

**Button Check-in:**
1. Click "Day 1 Check-in"
2. Result: Regions 1 AND 2 both selected ✅

**Region Click Check-in:**
1. Click region-1
2. Result: ONLY region-1 selected ✅
3. Can still click region-2 to select it manually

### 90-Day Way, Day 1 (Region 1)

**Button Check-in:**
1. Click "Day 1 Check-in"
2. Result: Region 1 selected ✅

**Region Click Check-in:**
1. Click region-1
2. Result: Region 1 selected ✅

(In 90-day way, both methods have same effect since only 1 region per day)

## User Workflows

### Workflow 1: Minimalist User
**Goal:** Complete daily check-in with minimal clicks

- Day 1: Click any one region (e.g., region-3) → Done! ✅
- Day 2: Click any one region (e.g., region-5) → Done! ✅
- Day 3: Click any one region (e.g., region-7) → Done! ✅

### Workflow 2: Completionist User
**Goal:** Fill all regions every day

- Day 1: Click "Day 1 Check-in" button → All regions 1-3 filled ✅
- Day 2: Click "Day 2 Check-in" button → All regions 4-6 filled ✅
- Day 3: Click "Day 3 Check-in" button → All regions 7-9 filled ✅

### Workflow 3: Mixed User
**Goal:** Flexible approach

- Day 1: Click region-2 → Only region-2 selected, then manually click regions 1 and 3 ✅
- Day 2: Click "Day 2 Check-in" button → All regions 4-6 filled ✅
- Day 3: Click region-9 → Only region-9 selected, leave others empty ✅

### Workflow 4: Selective Collector
**Goal:** Collect specific regions over time

- Day 1: Click region-3 to check in, leave regions 1-2 unselected
- Day 5: Go back and click region-1 (from Day 1)
- Day 10: Go back and click region-2 (from Day 1)
- Result: Can collect regions across multiple days after check-in

## Important Behaviors

### Day Completion is Permanent
- Once a day is marked complete (either method), it stays complete
- Unselecting regions does NOT undo the check-in
- Button will show "Day X Achieved" regardless of region selection state

**Example:**
1. Day 1: Click region-3 → Day 1 complete ✅
2. Unclick region-3 → Region unselected, but Day 1 STILL complete ✅
3. Reload page → Button still shows "Day 1 Achieved" ✅

### Past Day Regions Only Toggle
- Clicking regions from past days only toggles them
- Does NOT trigger a new check-in

**Example:**
1. Currently on Day 5
2. Click region-2 (belongs to Day 1)
3. Result: Only toggles region-2, does NOT check in Day 5

### Already Checked-in Days
- After day is complete, clicking same-day regions only toggles them
- No duplicate check-ins possible

**Example:**
1. Day 1 complete via button (all regions 1-3 selected)
2. Click region-2 → Unselects region-2 only
3. Day 1 still complete

## Edge Cases

### Can I unselect the region that triggered check-in?
**Yes!** The day completion is independent of region selection.

**Example:**
1. Click region-3 on Day 1 → Day complete, region-3 selected
2. Click region-3 again → Region-3 unselected
3. Day 1 still complete, button still "Day 1 Achieved"

### What if I manually click a region before checking in?
The day is NOT complete until you either:
- Click a region belonging to current day (triggers auto check-in), OR
- Click the "Day X Check-in" button

**Example:**
1. Day 1: Manually click region-1 (from past day or before checking in)
2. Region-1 selected, but Day 1 NOT complete yet
3. Button still shows "Day 1 Check-in" (enabled)
4. Click region-2 (current day) → NOW Day 1 is complete

### Can I fill regions from past days?
**Yes!** All unlocked regions up to current day remain clickable.

**Example:**
1. Day 5: Check in via region-15
2. Can still go back and click regions 1-14 from Days 1-4
3. Useful for collectors who want to fill the whole brain

### What happens after missed day reset?
Both check-in methods work the same after reset.

**Example:**
1. Miss a day → Reset to Day 1
2. Can use either button or region click to restart
3. Previous max day is preserved

## Technical Implementation

### Data Structure
```javascript
{
  completedDays: [1, 2, 3, ...],  // Days marked as complete
  checkedRegions: {
    1: [1, 2, 3],                  // Day 1: regions selected
    2: [5],                        // Day 2: only region 5 selected
    3: []                          // Day 3: no regions selected
  }
}
```

**Key Point:** `completedDays` and `checkedRegions` are INDEPENDENT!
- A day can be in `completedDays` with empty `checkedRegions`
- This allows day completion without forcing region selection

### Code Flow

**Region Click Check-in:**
1. User clicks region belonging to current day
2. `toggleRegion()` detects it's current day + not checked in
3. Calls `markDayAsCompleted(dayNumber)`
4. Continues with normal toggle to select clicked region
5. Result: Day complete, one region selected

**Button Check-in:**
1. User clicks "Day X Check-in" button
2. `checkIn()` called
3. Adds day to `completedDays`
4. Adds ALL day's regions to `checkedRegions`
5. Selects all regions visually
6. Result: Day complete, all regions selected

## Benefits

1. **Flexibility**: Users choose their preferred method
2. **Accessibility**: Lower friction for minimalist users
3. **Gamification**: Collectors can still fill all regions
4. **Independence**: Day completion separate from region collection
5. **Persistence**: State survives page reloads correctly

## Migration from Old Behavior

No action needed! Existing users' data is automatically compatible:
- Old check-ins remain in `completedDays`
- Old regions remain in `checkedRegions`
- Both check-in methods work immediately

---

**Last Updated:** October 25, 2025  
**Feature Version:** 2.0  
**Backward Compatible:** Yes ✅
