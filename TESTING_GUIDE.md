# Testing Guide: Brain Check-in System

## Current Features to Test

### Feature 1: Dual Check-in Methods (October 25, 2025)
Two ways to complete a day's check-in:
1. **Button Check-in**: Selects ALL regions for the day
2. **Region Click Check-in**: Selects ONLY the clicked region

---

## Test Suite: Dual Check-in Methods

### Test 1: Region Click Check-in (30-day way)
**Setup:** Fresh start, 30-day way, Day 1

1. Open app (clear localStorage if needed)
2. Verify: Regions 1-3 are unlocked (blue outline) but not selected
3. Click region-3
4. ✅ Verify: ONLY region-3 becomes selected (green)
5. ✅ Verify: Button changes to "Day 1 Achieved" (disabled)
6. ✅ Verify: Current streak shows "Current: 1 day"
7. ✅ Verify: Max shows "Max: 1 day"

### Test 2: Manual Region Selection After Check-in
**Setup:** Continue from Test 1

1. Click region-1 (unlocked but not selected)
2. ✅ Verify: Region-1 becomes selected
3. ✅ Verify: Button still shows "Day 1 Achieved"
4. ✅ Verify: Streaks unchanged
5. Click region-2
6. ✅ Verify: Region-2 becomes selected
7. ✅ Verify: All regions 1-3 now selected

### Test 3: Unselect Region After Check-in
**Setup:** Continue from Test 2

1. Click region-3 to unselect
2. ✅ Verify: Region-3 becomes unselected (blue outline only)
3. ✅ Verify: Button STILL shows "Day 1 Achieved"
4. ✅ Verify: Day 1 completion NOT lost
5. Reload page
6. ✅ Verify: Regions 1-2 selected, region-3 unselected
7. ✅ Verify: Button shows "Day 1 Achieved"

### Test 4: Button Check-in (All Regions)
**Setup:** Fresh start, 30-day way, Day 1

1. Clear localStorage and reload
2. Click "Day 1 Check-in" button
3. ✅ Verify: ALL regions 1-3 become selected
4. ✅ Verify: Button changes to "Day 1 Achieved"
5. ✅ Verify: Streaks update correctly

### Test 5: 60-Day Way Region Click
**Setup:** Fresh start, 60-day way, Day 1

1. Clear localStorage
2. Change way dropdown to "60 Days"
3. Verify: Regions 1-2 unlocked (1.5 regions per day)
4. Click region-2
5. ✅ Verify: ONLY region-2 selected
6. ✅ Verify: Button shows "Day 1 Achieved"
7. ✅ Verify: Region-1 still unselected but can be clicked

### Test 6: 90-Day Way Region Click
**Setup:** Fresh start, 90-day way, Day 1

1. Clear localStorage
2. Change way dropdown to "90 Days"
3. Verify: ONLY region-1 unlocked (1 region per day)
4. Click region-1
5. ✅ Verify: Region-1 selected
6. ✅ Verify: Button shows "Day 1 Achieved"

### Test 7: Past Day Region Click (No Auto Check-in)
**Setup:** Simulate Day 3 with Day 1-2 completed

1. Use DevTools Console:
   ```javascript
   localStorage.setItem('brain-checkin-data', JSON.stringify({
     startDate: new Date(Date.now() - 2*24*60*60*1000).toISOString(),
     currentWay: 30,
     completedDays: [1, 2],
     checkedRegions: {1: [1,2,3], 2: [4,5,6]},
     maxDayReached: 2,
     currentStreakDays: 2
   }));
   location.reload();
   ```
2. Verify: On Day 3, regions 1-6 selected, 7-9 unlocked
3. Click region-2 (belongs to Day 1)
4. ✅ Verify: ONLY toggles (unselects) region-2
5. ✅ Verify: Does NOT trigger Day 3 check-in
6. ✅ Verify: Button still shows "Day 3 Check-in" (enabled)

### Test 8: Already Checked In - Region Toggle Only
**Setup:** Day 1 completed via button

1. Fresh start, complete Day 1 via button
2. All regions 1-3 selected
3. Click region-2
4. ✅ Verify: Region-2 unselects (toggle only)
5. ✅ Verify: No duplicate check-in
6. ✅ Verify: Button still "Day 1 Achieved"

### Test 9: Mixed Interaction Pattern
**Setup:** Fresh start, 30-day way

1. Clear localStorage, Day 1
2. Manually click region-1 (before checking in)
3. ✅ Verify: Region-1 selected, but button still "Day 1 Check-in"
4. ✅ Verify: Day NOT yet complete
5. Click region-2
6. ✅ Verify: Day NOW complete (auto-triggered)
7. ✅ Verify: Button changes to "Day 1 Achieved"
8. ✅ Verify: Regions 1-2 selected, region-3 still unselected

### Test 10: Reload Persistence
**Setup:** Day 1 completed via region-3 click only

1. Fresh start, click region-3 only
2. Day 1 complete, only region-3 selected
3. Reload page (F5 or Cmd+R)
4. ✅ Verify: Day 1 still complete
5. ✅ Verify: ONLY region-3 selected
6. ✅ Verify: Regions 1-2 unselected but can be clicked
7. ✅ Verify: Button shows "Day 1 Achieved"

### Test 11: Consecutive Days with Region Clicks
**Setup:** Multi-day streak with region clicks

1. Day 1: Click region-3 only
2. Simulate next day:
   ```javascript
   localStorage.setItem('brain-checkin-data', JSON.stringify({
     ...JSON.parse(localStorage.getItem('brain-checkin-data')),
     startDate: new Date(Date.now() - 24*60*60*1000).toISOString()
   }));
   location.reload();
   ```
3. Verify: Day 2, regions 4-6 unlocked
4. Click region-5
5. ✅ Verify: Day 2 complete, ONLY region-5 selected
6. ✅ Verify: Current streak: 2 days
7. ✅ Verify: Max: 2 days

### Test 12: Missed Day After Region Click Check-in
**Setup:** Day 1 completed via region click, then miss a day

1. Day 1: Complete via region-2 click
2. Simulate missing 2 days:
   ```javascript
   localStorage.setItem('brain-checkin-data', JSON.stringify({
     ...JSON.parse(localStorage.getItem('brain-checkin-data')),
     startDate: new Date(Date.now() - 3*24*60*60*1000).toISOString()
   }));
   location.reload();
   ```
3. ✅ Verify: Alert shows "You missed 1 day check-in!"
4. ✅ Verify: Progress reset to Day 1
5. ✅ Verify: All regions unselected
6. ✅ Verify: Max day preserved (Max: 1 day)
7. ✅ Verify: Current streak reset to 0 (hidden)

---

## Previous Feature Tests

### Feature 2: Missed Day Detection & Max Day Display (October 24, 2025)
1. Open the app (fresh start or after clearing localStorage)
2. Click "Day 1 Check-in" button
3. ✅ Verify: "Max: 1 day" appears below the label container

### Test 2: Multiple Check-ins (Max Day Increases)
**Note:** This requires manipulating the date in browser DevTools

1. Check in for Day 1
2. Open browser DevTools (F12 or Cmd+Option+I)
3. Go to Console
4. Run this command to simulate next day:
   ```javascript
   localStorage.setItem('brain-checkin-data', JSON.stringify({
     ...JSON.parse(localStorage.getItem('brain-checkin-data')),
     startDate: new Date(Date.now() - 24*60*60*1000).toISOString()
   }));
   location.reload();
   ```
5. Check in for Day 2
6. ✅ Verify: "Max: 2 days" appears

### Test 3: Missed Day Detection (Automatic Reset)
**This is the main feature to test**

1. Check in for Day 1 (or have an active streak)
2. Open DevTools Console
3. Simulate missing a day by setting start date to 3 days ago:
   ```javascript
   localStorage.setItem('brain-checkin-data', JSON.stringify({
     ...JSON.parse(localStorage.getItem('brain-checkin-data')),
     startDate: new Date(Date.now() - 3*24*60*60*1000).toISOString()
   }));
   location.reload();
   ```
4. ✅ Verify: Alert appears saying "You missed 1 day check-in!"
5. ✅ Verify: All brain regions are cleared
6. ✅ Verify: Button shows "Day 1 Check-in"
7. ✅ Verify: Max day still shows previous highest (e.g., "Max: 2 days")

### Test 4: Manual Region Click Updates Max
1. Start fresh or at Day 1
2. Check in for Day 1 (fills regions 1-3 for 30-day way)
3. Manually click region 4 (belongs to Day 2)
4. ✅ Verify: "Max: 2 days" appears (even though technically still on Day 1)

### Test 5: Fail Button Preserves Max
1. Have some progress (e.g., Day 3, Max: 3 days)
2. Click "Fail" button
3. Confirm the reset
4. ✅ Verify: All regions cleared
5. ✅ Verify: Button shows "Day 1 Check-in"
6. ✅ Verify: "Max: 3 days" still shows

### Test 6: Existing Users (Backward Compatibility)
**If you have existing data in localStorage:**

1. Check current progress
2. Note your highest day number
3. Refresh the page
4. ✅ Verify: "Max: [your highest day]" appears automatically
5. ✅ Verify: All existing check-ins still work

## DevTools Shortcuts

### View Current Data
```javascript
console.log(JSON.parse(localStorage.getItem('brain-checkin-data')));
```

### Clear All Data (Fresh Start)
```javascript
localStorage.clear();
location.reload();
```

### Set Start Date to X Days Ago
```javascript
let data = JSON.parse(localStorage.getItem('brain-checkin-data'));
data.startDate = new Date(Date.now() - X * 24*60*60*1000).toISOString();
localStorage.setItem('brain-checkin-data', JSON.stringify(data));
location.reload();
// Replace X with number of days (e.g., 3 for 3 days ago)
```

### Manually Set Max Day
```javascript
let data = JSON.parse(localStorage.getItem('brain-checkin-data'));
data.maxDayReached = 10;
localStorage.setItem('brain-checkin-data', JSON.stringify(data));
location.reload();
```

## Expected Behaviors

### Max Day Display Rules
- Hidden when `maxDayReached = 0`
- Shows "Max: 1 day" for singular
- Shows "Max: X days" for plural
- Positioned below label container
- Subtle styling (gray, slightly transparent)

### Missed Day Alert Rules
- Shows exact number of days missed
- Singular: "You missed 1 day check-in!"
- Plural: "You missed X day check-ins!"
- Always includes encouragement message

### Reset Behavior
- Clears all check-ins
- Preserves way setting (30/60/90)
- Preserves max day reached
- Resets to Day 1
- Clears all visual selections

## Common Issues & Solutions

### Issue: Max day not showing
- Check browser console for errors
- Verify localStorage has `maxDayReached` property
- Try checking in once to trigger update

### Issue: No alert on missed day
- Ensure you have existing check-ins
- Verify start date is set correctly
- Check that multiple days have passed

### Issue: Regions not clearing on reset
- Check browser console for errors
- Verify SVG is loaded
- Try refreshing the page

## Success Criteria

✅ Max day displays correctly after first check-in
✅ Max day increases with daily check-ins
✅ Max day updates when manually clicking future day regions
✅ Missing a day triggers alert and reset
✅ Reset preserves max day
✅ Fail button preserves max day
✅ Existing users see their max day calculated automatically
✅ No console errors
✅ No layout issues on mobile/desktop
