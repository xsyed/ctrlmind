# Testing Guide: Missed Day Detection & Max Day Display

## Quick Test Steps

### Test 1: First Check-in (Max Day Display Appears)
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
