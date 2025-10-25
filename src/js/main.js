import * as d3 from 'd3';

// Constants
const STORAGE_KEY = 'brain-checkin-data';
const LABEL_STORAGE_KEY = 'brain-label';
const WAY_STORAGE_KEY = 'brain-way';
const SELECTED_CLASS = 'selected';
const MAX_REGIONS = 90;

class BrainSelector {
  constructor() {
    this.checkInData = {
      startDate: null,
      currentWay: 30, // Default to 30 days
      completedDays: [], // Array of day numbers that were checked in via button (permanent)
      checkedRegions: {}, // Object mapping day -> [regions] that are currently checked (toggleable)
      maxDayReached: 0, // Track the highest day reached
      currentStreakDays: 0, // Track current consecutive streak
      lastFailDate: null // Track last date when fail button was clicked
    };
    this.svg = null;
    this.currentDayNumber = 0;
    this.hasCheckedInToday = false;
    this.brainLabel = 'My Brain Journey';
    this.currentWay = 30; // Default way
    
    this.init();
  }

  async init() {
    try {
      // Load check-in data from localStorage
      this.loadCheckInData();
      
      // Load brain label
      this.loadBrainLabel();
      
      // Load way setting
      this.loadWaySetting();
      
      // Calculate current day number
      this.calculateCurrentDay();
      
      // Load SVG
      await this.loadSVG();
      
      // Apply saved check-ins to regions
      this.applyCheckIns();
      
      // Update max day display
      this.updateMaxDayDisplay();
      
      // Set up event listeners
      this.setupEventListeners();
      
      console.log('Brain Selector initialized successfully!');
      console.log('Current day:', this.currentDayNumber);
      console.log('Current way:', this.currentWay);
      console.log('Has checked in today:', this.hasCheckedInToday);
      console.log('Storage format:', this.checkInData);
    } catch (error) {
      console.error('Error initializing Brain Selector:', error);
    }
  }


  async loadSVG() {
    try {
      // Load SVG file
      const response = await fetch('/main.svg');
      const svgText = await response.text();
      
      // Insert SVG into container
      const container = d3.select('#brain-svg-container');
      container.html(svgText);
      
      // Get the SVG element
      this.svg = container.select('svg');
      
      // Set up interactions for each region
      this.setupRegionInteractions();
      
    } catch (error) {
      console.error('Error loading SVG:', error);
      d3.select('#brain-svg-container').html(
        '<p style="color: red;">Error loading brain SVG. Please refresh the page.</p>'
      );
    }
  }

  setupRegionInteractions() {
    // If user failed today, lock ALL regions (no interactions allowed)
    if (this.hasFailedToday()) {
      for (let i = 1; i <= MAX_REGIONS; i++) {
        const region = this.svg.select(`#region-${i}`);
        if (!region.empty()) {
          region
            .style('pointer-events', 'none')
            .style('cursor', 'not-allowed')
            .classed('unlocked', false)
            .on('click', null);
        }
      }
      return; // Exit early, no regions should be interactive
    }
    
    // Calculate all regions that should be unlocked up to current day
    const allUnlockedRegionsUpToToday = this.getAllUnlockedRegionsUpToCurrentDay();
    
    // Update which regions are clickable based on unlocked regions
    for (let i = 1; i <= MAX_REGIONS; i++) {
      const region = this.svg.select(`#region-${i}`);
      
      if (!region.empty()) {
        if (allUnlockedRegionsUpToToday.includes(i)) {
          // Unlocked regions - make them clickable
          region
            .style('pointer-events', 'auto')
            .style('cursor', 'pointer')
            .classed('unlocked', true)
            .on('click', () => this.toggleRegion(i));
        } else {
          // Locked regions - disable clicking and remove unlocked class
          region
            .style('pointer-events', 'none')
            .style('cursor', 'not-allowed')
            .classed('unlocked', false)
            .on('click', null);
        }
      }
    }
  }
  
  // Check if user failed today
  hasFailedToday() {
    if (!this.checkInData.lastFailDate) {
      console.log('hasFailedToday: No lastFailDate');
      return false;
    }
    const todayDateStr = this.getLocalDateString();
    const lastFailDateStr = this.getLocalDateString(this.checkInData.lastFailDate);
    const failed = lastFailDateStr === todayDateStr;
    console.log('hasFailedToday check:', {
      todayDateStr,
      lastFailDateStr,
      failed
    });
    return failed;
  }
  
  // Get all regions that should be unlocked up to current day
  getAllUnlockedRegionsUpToCurrentDay() {
    const unlockedRegions = new Set();
    
    // Include all regions that SHOULD be available up to current day
    // This allows users to fill in regions from previous days or current day
    for (let day = 1; day <= this.currentDayNumber; day++) {
      const regionsForDay = this.getRegionsForDay(day, this.currentWay);
      regionsForDay.forEach(region => unlockedRegions.add(region));
    }
    
    return Array.from(unlockedRegions).sort((a, b) => a - b);
  }

  // Handle manual region click (counts as check-in for that region's day)
  toggleRegion(regionNumber) {
    // Safety check: If user failed today, don't allow any region interactions
    if (this.hasFailedToday()) {
      console.log('Cannot interact with regions - failed today');
      return;
    }
    
    const regionId = `#region-${regionNumber}`;
    const region = this.svg.select(regionId);
    
    if (!region.empty()) {
      const isSelected = region.classed(SELECTED_CLASS);
      
      // AUTO CHECK-IN FEATURE: If clicking an unselected region that belongs to current day
      // and haven't checked in today, automatically mark day as completed
      // BUT only select the clicked region (not all regions for the day)
      if (!isSelected && !this.hasCheckedInToday) {
        const regionDay = this.findDayForRegion(regionNumber);
        
        // If this region belongs to current day, mark day as completed
        if (regionDay === this.currentDayNumber) {
          console.log(`Auto-check-in triggered: Region ${regionNumber} belongs to current day ${this.currentDayNumber}`);
          this.markDayAsCompleted(this.currentDayNumber);
          // Continue with normal toggle to select ONLY this region
        }
      }
      
      if (isSelected) {
        // If already selected, unselect it and remove from check-in data
        region.classed(SELECTED_CLASS, false);
        this.removeRegionFromCheckIn(regionNumber);
        console.log(`Region ${regionNumber} unselected`);
      } else {
        // If not selected, select it and add to appropriate day's check-in
        region.classed(SELECTED_CLASS, true);
        this.handleManualRegionClick(regionNumber);
        console.log(`Region ${regionNumber} selected and added to check-in`);
      }
      
      // Update check-in status and button state
      this.calculateCurrentDay();
      this.updateCheckInButton();
    }
  }
  
  // Find which day a region belongs to based on current way
  findDayForRegion(regionNumber) {
    const totalRegions = MAX_REGIONS;
    const regionsPerDay = totalRegions / this.currentWay;
    
    // Calculate which day this region belongs to
    const dayNumber = Math.ceil(regionNumber / regionsPerDay);
    return dayNumber;
  }
  
  // Handle manual region click - add to appropriate day's checked regions
  handleManualRegionClick(regionNumber) {
    // Determine which day this region belongs to
    const dayNumber = this.findDayForRegion(regionNumber);
    
    // Set start date if this is the first check-in
    if (!this.checkInData.startDate) {
      this.checkInData.startDate = this.getTodayTimestamp();
    }
    
    // Add region to checkedRegions for this day
    if (!this.checkInData.checkedRegions[dayNumber]) {
      this.checkInData.checkedRegions[dayNumber] = [];
    }
    
    if (!this.checkInData.checkedRegions[dayNumber].includes(regionNumber)) {
      this.checkInData.checkedRegions[dayNumber].push(regionNumber);
      this.checkInData.checkedRegions[dayNumber].sort((a, b) => a - b);
      console.log(`Added region ${regionNumber} to day ${dayNumber} checked regions`);
    }
    
    // Update currentWay in checkInData
    this.checkInData.currentWay = this.currentWay;
    
    // Save to localStorage
    this.saveCheckInData();
  }
  
  // Remove a region from checked regions
  removeRegionFromCheckIn(regionNumber) {
    // Find which day this region belongs to
    const dayNumber = this.findDayForRegion(regionNumber);
    
    // Remove from checkedRegions (visual state only, doesn't affect completion)
    if (this.checkInData.checkedRegions[dayNumber]) {
      const index = this.checkInData.checkedRegions[dayNumber].indexOf(regionNumber);
      if (index !== -1) {
        this.checkInData.checkedRegions[dayNumber].splice(index, 1);
        console.log(`Removed region ${regionNumber} from day ${dayNumber} checked regions`);
        
        // Clean up empty arrays (optional, keeps data structure clean)
        if (this.checkInData.checkedRegions[dayNumber].length === 0) {
          delete this.checkInData.checkedRegions[dayNumber];
        }
      }
    }
    
    // Save to localStorage
    this.saveCheckInData();
  }

  // Get current timestamp in UTC (ISO format with seconds precision)
  getTodayTimestamp() {
    return new Date().toISOString();
  }

  // Calculate which regions should be unlocked for a given day number and way
  getRegionsForDay(dayNumber, way) {
    const totalRegions = MAX_REGIONS;
    const regionsPerDay = totalRegions / way;
    
    const startRegion = Math.ceil((dayNumber - 1) * regionsPerDay) + 1;
    const endRegion = Math.ceil(dayNumber * regionsPerDay);
    
    const regions = [];
    for (let i = startRegion; i <= endRegion; i++) {
      if (i <= totalRegions) {
        regions.push(i);
      }
    }
    return regions;
  }

  // Get all regions that have been unlocked by previous check-ins
  getAllUnlockedRegions() {
    const unlockedRegions = new Set();
    
    // Iterate through checkedRegions to get all checked regions
    for (const dayNumber in this.checkInData.checkedRegions) {
      const regions = this.checkInData.checkedRegions[dayNumber];
      if (Array.isArray(regions)) {
        regions.forEach(region => unlockedRegions.add(region));
      }
    }
    
    return Array.from(unlockedRegions);
  }

  // Calculate actual regions to unlock, filling any gaps from way changes
  getActualRegionsToUnlock(dayNumber, way) {
    // Get last unlocked region number
    const allUnlockedRegions = this.getAllUnlockedRegions();
    const lastUnlockedRegion = allUnlockedRegions.length > 0 ? Math.max(...allUnlockedRegions) : 0;
    
    // Calculate today's regions based on current way
    const calculatedRegions = this.getRegionsForDay(dayNumber, way);
    const maxCalculatedRegion = Math.max(...calculatedRegions);
    
    // Fill gaps: unlock all regions from lastUnlocked + 1 to maxCalculated
    // This ensures no gaps when user changes ways mid-journey
    const actualRegionsToUnlock = [];
    for (let i = lastUnlockedRegion + 1; i <= maxCalculatedRegion; i++) {
      if (i <= MAX_REGIONS) {
        actualRegionsToUnlock.push(i);
      }
    }
    
    return actualRegionsToUnlock;
  }

  // Extract local date string (YYYY-MM-DD) from a timestamp or Date object
  getLocalDateString(dateInput) {
    const date = dateInput ? new Date(dateInput) : new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Calculate days between two date strings (YYYY-MM-DD format)
  daysBetween(dateStr1, dateStr2) {
    // Parse as local dates at midnight
    const d1 = new Date(dateStr1 + 'T00:00:00');
    const d2 = new Date(dateStr2 + 'T00:00:00');
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  // Load check-in data from localStorage
  loadCheckInData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const loadedData = JSON.parse(saved);
        
        // Migration from old format (checkIns array) to new format (completedDays + checkedRegions)
        if (loadedData.checkIns && !loadedData.completedDays) {
          console.log('Migrating from old checkIns format to new completedDays + checkedRegions format');
          
          // Initialize new structure
          loadedData.completedDays = [];
          loadedData.checkedRegions = {};
          
          // Process old checkIns array
          if (Array.isArray(loadedData.checkIns)) {
            loadedData.checkIns.forEach(checkIn => {
              // Extract day number
              const dayNumber = checkIn.dayNumber;
              
              // Assume all check-ins in old format were button-based completions
              if (!loadedData.completedDays.includes(dayNumber)) {
                loadedData.completedDays.push(dayNumber);
              }
              
              // Migrate regions to checkedRegions
              if (checkIn.regions && Array.isArray(checkIn.regions)) {
                loadedData.checkedRegions[dayNumber] = [...checkIn.regions];
              }
            });
            
            // Sort completedDays
            loadedData.completedDays.sort((a, b) => a - b);
          }
          
          // Remove old checkIns array
          delete loadedData.checkIns;
        }
        
        // Ensure completedDays exists
        if (!loadedData.completedDays) {
          loadedData.completedDays = [];
        }
        
        // Ensure checkedRegions exists
        if (!loadedData.checkedRegions) {
          loadedData.checkedRegions = {};
        }
        
        // Ensure currentWay exists
        if (!loadedData.currentWay) {
          loadedData.currentWay = 30; // Default to 30 days
        }
        
        // Ensure maxDayReached exists
        if (!loadedData.maxDayReached) {
          // Calculate max day from completedDays
          const maxDay = loadedData.completedDays.length > 0
            ? Math.max(...loadedData.completedDays)
            : 0;
          loadedData.maxDayReached = maxDay;
        }
        
        // Ensure currentStreakDays exists
        if (loadedData.currentStreakDays === undefined) {
          // Calculate current streak from completedDays
          loadedData.currentStreakDays = this.calculateCurrentStreak(loadedData.completedDays);
        }
        
        // Ensure lastFailDate exists
        if (!loadedData.lastFailDate) {
          loadedData.lastFailDate = null;
        }
        
        this.checkInData = loadedData;
        this.currentWay = loadedData.currentWay;
        console.log('Check-in data loaded:', this.checkInData);
      }
    } catch (error) {
      console.error('Error loading check-in data:', error);
      this.checkInData = {
        startDate: null,
        currentWay: 30,
        completedDays: [],
        checkedRegions: {},
        maxDayReached: 0,
        currentStreakDays: 0,
        lastFailDate: null
      };
      this.currentWay = 30;
    }
  }

  // Calculate current streak from completed days
  // Current streak = number of consecutive days from the highest day backwards
  calculateCurrentStreak(completedDays) {
    if (!completedDays || completedDays.length === 0) {
      return 0;
    }
    
    // Get all unique day numbers and sort them descending
    const dayNumbers = [...new Set(completedDays)].sort((a, b) => b - a);
    
    if (dayNumbers.length === 0) {
      return 0;
    }
    
    // Start from the highest day and count consecutive days backwards
    let streak = 0;
    let expectedDay = dayNumbers[0];
    
    for (const day of dayNumbers) {
      if (day === expectedDay) {
        streak++;
        expectedDay--;
      } else {
        // Gap found, stop counting
        break;
      }
    }
    
    return streak;
  }

  // Save check-in data to localStorage
  saveCheckInData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.checkInData));
      console.log('Check-in data saved:', this.checkInData);
    } catch (error) {
      console.error('Error saving check-in data:', error);
    }
  }

  // Calculate current day number and check if already checked in today
  calculateCurrentDay() {
    const todayDateStr = this.getLocalDateString(); // Get local date string (YYYY-MM-DD)
    
    // Check if user clicked fail today - if so, they cannot check in today
    if (this.checkInData.lastFailDate) {
      const lastFailDateStr = this.getLocalDateString(this.checkInData.lastFailDate);
      if (lastFailDateStr === todayDateStr) {
        // User failed today, cannot check in
        this.currentDayNumber = 1;
        this.hasCheckedInToday = true; // Disable check-in button
        console.log('User clicked fail today. Check-in disabled for today.');
        return;
      }
    }
    
    // If no start date, this is day 1 (user will check in for day 1)
    if (!this.checkInData.startDate) {
      this.currentDayNumber = 1;
      this.hasCheckedInToday = false;
      return;
    }

    // Extract local date from stored UTC timestamp
    const startDateStr = this.getLocalDateString(this.checkInData.startDate);
    
    // Calculate days since start date (using local dates)
    const daysSinceStart = this.daysBetween(startDateStr, todayDateStr);
    const expectedDayNumber = daysSinceStart + 1;
    
    // Get the last completed day
    const lastCompletedDay = this.checkInData.completedDays.length > 0
      ? Math.max(...this.checkInData.completedDays)
      : 0;
    
    // Check if user missed a day (gap between last completed day and expected day)
    if (lastCompletedDay > 0 && expectedDayNumber > lastCompletedDay + 1) {
      // User missed a day! Reset progress
      const missedDays = expectedDayNumber - lastCompletedDay - 1;
      this.resetProgressDueToMissedDay(missedDays);
      return; // Exit early as reset will recalculate
    }

    this.currentDayNumber = expectedDayNumber;

    // Check if already checked in today (day is in completedDays)
    this.hasCheckedInToday = this.checkInData.completedDays.includes(this.currentDayNumber);
  }

  // Reset progress when user misses a day
  resetProgressDueToMissedDay(missedDays) {
    // Update max day reached before reset
    const currentMax = this.checkInData.completedDays.length > 0
      ? Math.max(...this.checkInData.completedDays)
      : 0;
    if (currentMax > this.checkInData.maxDayReached) {
      this.checkInData.maxDayReached = currentMax;
    }
    
    // Clear the data but keep current way and max day
    const currentWay = this.checkInData.currentWay;
    const maxDay = this.checkInData.maxDayReached;
    
    this.checkInData = {
      startDate: null,
      currentWay: currentWay,
      completedDays: [],
      checkedRegions: {},
      maxDayReached: maxDay,
      currentStreakDays: 0,
      lastFailDate: null
    };
    this.currentDayNumber = 1;
    this.hasCheckedInToday = false;

    // Remove selected class from all regions
    if (this.svg) {
      this.svg.selectAll('.brain-region')
        .classed(SELECTED_CLASS, false);
      
      // Reset region interactions (all should be disabled now)
      this.setupRegionInteractions();
    }

    // Save to localStorage
    this.saveCheckInData();

    console.log(`Missed ${missedDays} day(s). Progress reset to day 1.`);
    
    // Update the button state
    this.updateCheckInButton();
    
    // Update max day display
    this.updateMaxDayDisplay();
    
    // Show alert to user
    alert(`You missed ${missedDays} day check-in${missedDays > 1 ? 's' : ''}! Your progress has been reset back to Day 1. Stay consistent to build your streak!`);
  }

  // Apply saved check-ins to the SVG regions
  applyCheckIns() {
    if (!this.svg) return;

    const unlockedRegions = this.getAllUnlockedRegions();
    unlockedRegions.forEach(regionNum => {
      const regionId = `#region-${regionNum}`;
      const region = this.svg.select(regionId);
      if (!region.empty()) {
        region.classed(SELECTED_CLASS, true);
      }
    });
  }

  // Mark a day as completed (without selecting all regions)
  // This is used when a user clicks a region belonging to current day
  markDayAsCompleted(dayNumber) {
    const todayTimestamp = this.getTodayTimestamp();
    
    // If this is the first check-in, set the start date
    if (!this.checkInData.startDate) {
      this.checkInData.startDate = todayTimestamp;
      this.currentDayNumber = 1;
    }
    
    // Add day to completedDays if not already there
    if (!this.checkInData.completedDays.includes(dayNumber)) {
      this.checkInData.completedDays.push(dayNumber);
      this.checkInData.completedDays.sort((a, b) => a - b);
      console.log(`Day ${dayNumber} marked as completed via region click`);
    }
    
    // Update hasCheckedInToday flag
    this.hasCheckedInToday = true;
    
    // Update max day reached
    if (dayNumber > this.checkInData.maxDayReached) {
      this.checkInData.maxDayReached = dayNumber;
    }
    
    // Recalculate current streak
    this.checkInData.currentStreakDays = this.calculateCurrentStreak(this.checkInData.completedDays);
    
    // Update currentWay in checkInData
    this.checkInData.currentWay = this.currentWay;
    
    // Save to localStorage
    this.saveCheckInData();
    
    // Update button state to show "Day X Achieved"
    this.updateCheckInButton();
    
    // Update streak display
    this.updateMaxDayDisplay();
    
    console.log(`Day ${dayNumber} completion processed. Current streak: ${this.checkInData.currentStreakDays}, Max: ${this.checkInData.maxDayReached}`);
  }

  // Check in for today
  checkIn() {
    // Safety check: If user failed today, don't allow check-in
    if (this.hasFailedToday()) {
      console.log('Cannot check in - failed today');
      return;
    }
    
    const todayTimestamp = this.getTodayTimestamp(); // Get UTC timestamp with seconds precision

    // Check if already checked in today
    if (this.hasCheckedInToday) {
      return;
    }

    // If this is the first check-in, set the start date with timestamp
    if (!this.checkInData.startDate) {
      this.checkInData.startDate = todayTimestamp;
      this.currentDayNumber = 1;
    }

    // Calculate which regions to unlock based on current day and way
    // This includes gap-filling to handle mid-journey way changes
    const regionsToUnlock = this.getActualRegionsToUnlock(this.currentDayNumber, this.currentWay);
    
    // Check if any regions exceed the maximum
    const maxRegion = Math.max(...regionsToUnlock);
    if (maxRegion > MAX_REGIONS) {
      alert('Congratulations! You have completed all 90 days! 🎉');
      return;
    }

    // Mark this day as completed (permanent)
    if (!this.checkInData.completedDays.includes(this.currentDayNumber)) {
      this.checkInData.completedDays.push(this.currentDayNumber);
      this.checkInData.completedDays.sort((a, b) => a - b);
    }
    
    // Add regions to checkedRegions for this day
    if (!this.checkInData.checkedRegions[this.currentDayNumber]) {
      this.checkInData.checkedRegions[this.currentDayNumber] = [];
    }
    
    // Merge regions: add any missing regions from regionsToUnlock
    regionsToUnlock.forEach(region => {
      if (!this.checkInData.checkedRegions[this.currentDayNumber].includes(region)) {
        this.checkInData.checkedRegions[this.currentDayNumber].push(region);
      }
    });
    this.checkInData.checkedRegions[this.currentDayNumber].sort((a, b) => a - b);
    
    this.hasCheckedInToday = true;

    // Update max day reached
    if (this.currentDayNumber > this.checkInData.maxDayReached) {
      this.checkInData.maxDayReached = this.currentDayNumber;
    }
    
    // Recalculate current streak
    this.checkInData.currentStreakDays = this.calculateCurrentStreak(this.checkInData.completedDays);

    // Update currentWay in checkInData
    this.checkInData.currentWay = this.currentWay;

    // Save to localStorage
    this.saveCheckInData();

    // Update the visuals for all unlocked regions
    regionsToUnlock.forEach(regionNum => {
      const regionId = `#region-${regionNum}`;
      const region = this.svg.select(regionId);
      if (!region.empty()) {
        region.classed(SELECTED_CLASS, true);
      }
    });

    const localDateStr = this.getLocalDateString(todayTimestamp);
    console.log(`Checked in day ${this.currentDayNumber} - regions ${regionsToUnlock.join(', ')} on ${localDateStr} (UTC: ${todayTimestamp})`);

    // Update region interactions to make the newly unlocked regions clickable
    this.setupRegionInteractions();

    // Update the button state
    this.updateCheckInButton();
    
    // Update max day display
    this.updateMaxDayDisplay();
  }

  // Reset all check-ins
  resetAllCheckIns() {
    if (!confirm('Are you sure you want to reset all check-ins? This cannot be undone.')) {
      return;
    }

    // Update max day reached before reset
    const currentMax = this.checkInData.completedDays.length > 0
      ? Math.max(...this.checkInData.completedDays)
      : 0;
    if (currentMax > this.checkInData.maxDayReached) {
      this.checkInData.maxDayReached = currentMax;
    }

    // Record the date when fail button was clicked
    const todayTimestamp = this.getTodayTimestamp();

    // Clear the data but keep current way setting and max day
    this.checkInData = {
      startDate: null,
      currentWay: this.currentWay,
      completedDays: [],
      checkedRegions: {},
      maxDayReached: this.checkInData.maxDayReached,
      currentStreakDays: 0,
      lastFailDate: todayTimestamp // Record today's date
    };
    this.currentDayNumber = 1;
    this.hasCheckedInToday = true; // Disable check-in for today
    
    console.log('Reset complete:', {
      lastFailDate: this.checkInData.lastFailDate,
      hasCheckedInToday: this.hasCheckedInToday,
      currentDayNumber: this.currentDayNumber
    });

    // Remove selected class from all regions
    if (this.svg) {
      this.svg.selectAll('.brain-region')
        .classed(SELECTED_CLASS, false);
      
      // Reset region interactions (all should be disabled now)
      this.setupRegionInteractions();
    }

    // Save to localStorage (preserves way setting and max day)
    this.saveCheckInData();

    console.log('All check-ins reset. Cannot check in again today.');
    
    // Update the button state
    this.updateCheckInButton();
    
    // Update max day display
    this.updateMaxDayDisplay();
    
    alert('All check-ins have been reset. You cannot check in again today. Come back tomorrow for a fresh start!');
  }

  setupEventListeners() {
    // Fail button - Reset all check-ins
    d3.select('#fail-btn').on('click', () => {
      this.resetAllCheckIns();
    });
    
    // Done/Check-in button - Check in for today
    d3.select('#done-btn').on('click', () => {
      this.checkIn();
    });
    
    // Label edit button
    d3.select('#edit-label-btn').on('click', () => {
      this.showLabelEdit();
    });
    
    // Label save button
    d3.select('#save-label-btn').on('click', () => {
      this.saveBrainLabel();
    });
    
    // Label input - save on Enter key
    d3.select('#label-input').on('keypress', (event) => {
      if (event.key === 'Enter') {
        this.saveBrainLabel();
      }
    });
    
    // Way dropdown - update way setting
    d3.select('#way-dropdown').on('change', (event) => {
      this.updateWaySetting(parseInt(event.target.value));
    });
    
    // Update check-in button state
    this.updateCheckInButton();
  }
  
  updateCheckInButton() {
    const btn = d3.select('#done-btn');
    const failBtn = d3.select('#fail-btn');
    
    console.log('updateCheckInButton called:', {
      hasCheckedInToday: this.hasCheckedInToday,
      hasFailedToday: this.hasFailedToday(),
      currentDay: this.currentDayNumber
    });
    
    if (this.hasCheckedInToday) {
      // Check if user failed today using helper method
      const failedToday = this.hasFailedToday();
      
      if (failedToday) {
        // User clicked fail today - disable both buttons
        console.log('Disabling both buttons - user failed today');
        btn
          .attr('disabled', 'disabled')
          .property('disabled', true)
          .text('Come back tomorrow');
        failBtn
          .attr('disabled', 'disabled')
          .property('disabled', true);
      } else {
        // Already checked in today - disable check-in button only, enable fail button
        console.log('Disabling check-in only - already checked in');
        btn
          .attr('disabled', 'disabled')
          .property('disabled', true)
          .text(`Day ${this.currentDayNumber} Achieved`);
        failBtn
          .attr('disabled', null)
          .property('disabled', false);
      }
    } else {
      // Can check in - enable both buttons
      console.log('Enabling both buttons - can check in');
      btn
        .attr('disabled', null)
        .property('disabled', false)
        .text(`Day ${this.currentDayNumber} Check-in`);
      failBtn
        .attr('disabled', null)
        .property('disabled', false);
    }
  }

  // Load brain label from localStorage
  loadBrainLabel() {
    try {
      const saved = localStorage.getItem(LABEL_STORAGE_KEY);
      if (saved) {
        this.brainLabel = saved;
        d3.select('#label-text').text(this.brainLabel);
        console.log('Brain label loaded:', this.brainLabel);
      }
    } catch (error) {
      console.error('Error loading brain label:', error);
    }
  }

  // Show label edit mode
  showLabelEdit() {
    const displayDiv = d3.select('#label-display');
    const editDiv = d3.select('#label-edit');
    const input = d3.select('#label-input');
    
    // Hide display, show edit
    displayDiv.style('display', 'none');
    editDiv.style('display', 'flex');
    
    // Set current value and focus
    input.node().value = this.brainLabel;
    input.node().focus();
    input.node().select();
  }

  // Save brain label
  saveBrainLabel() {
    const input = d3.select('#label-input');
    const newLabel = input.node().value.trim();
    
    if (newLabel === '') {
      alert('Label cannot be empty');
      return;
    }
    
    // Update label
    this.brainLabel = newLabel;
    d3.select('#label-text').text(this.brainLabel);
    
    // Save to localStorage
    try {
      localStorage.setItem(LABEL_STORAGE_KEY, this.brainLabel);
      console.log('Brain label saved:', this.brainLabel);
    } catch (error) {
      console.error('Error saving brain label:', error);
    }
    
    // Hide edit, show display
    d3.select('#label-display').style('display', 'flex');
    d3.select('#label-edit').style('display', 'none');
  }

  // Load way setting from localStorage
  loadWaySetting() {
    try {
      // First try to get from checkInData if it exists
      if (this.checkInData.currentWay) {
        this.currentWay = this.checkInData.currentWay;
      } else {
        // Fallback to default
        this.currentWay = 30;
      }
      
      // Update dropdown to match current way
      const dropdown = d3.select('#way-dropdown');
      if (!dropdown.empty()) {
        dropdown.property('value', this.currentWay.toString());
      }
      
      console.log('Way setting loaded:', this.currentWay);
    } catch (error) {
      console.error('Error loading way setting:', error);
      this.currentWay = 30;
    }
  }

  // Update way setting
  updateWaySetting(newWay) {
    if (![30, 60, 90].includes(newWay)) {
      console.error('Invalid way setting:', newWay);
      return;
    }
    
    this.currentWay = newWay;
    this.checkInData.currentWay = newWay;
    
    // Save to localStorage
    this.saveCheckInData();
    
    console.log('Way setting updated to:', this.currentWay);
    
    // Refresh region interactions to show updated available regions
    // This will display any gap-filling regions that need to be unlocked
    if (this.svg) {
      this.setupRegionInteractions();
    }
    
    // Update button text to show next check-in info
    this.updateCheckInButton();
  }

  // Update the max day display
  updateMaxDayDisplay() {
    // Get or create streak display element
    let streakDisplay = d3.select('#streak-display');
    
    if (streakDisplay.empty()) {
      // Create the element if it doesn't exist
      const labelContainer = d3.select('.label-container');
      streakDisplay = labelContainer
        .append('div')
        .attr('id', 'streak-display')
        .attr('class', 'streak-display');
    }
    
    // Build the display text
    let displayParts = [];
    
    // Only show current if > 0
    if (this.checkInData.currentStreakDays > 0) {
      displayParts.push(`Current: ${this.checkInData.currentStreakDays} day${this.checkInData.currentStreakDays > 1 ? 's' : ''}`);
    }
    
    // Only show max if > 0
    if (this.checkInData.maxDayReached > 0) {
      displayParts.push(`Max: ${this.checkInData.maxDayReached} day${this.checkInData.maxDayReached > 1 ? 's' : ''}`);
    }
    
    // Update the text
    if (displayParts.length > 0) {
      streakDisplay.text(displayParts.join('  •  '));
    } else {
      streakDisplay.text('');
    }
  }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new BrainSelector();
});

// Export for testing purposes
export default BrainSelector;
