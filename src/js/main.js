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
      checkIns: [], // Array of {dayNumber, regions: [], timestamp, way}
      maxDayReached: 0 // Track the highest day reached
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
  
  // Get all regions that should be unlocked up to current day
  getAllUnlockedRegionsUpToCurrentDay() {
    const unlockedRegions = new Set();
    
    // Add all regions from check-ins
    this.checkInData.checkIns.forEach(checkIn => {
      if (checkIn.regions && Array.isArray(checkIn.regions)) {
        checkIn.regions.forEach(region => unlockedRegions.add(region));
      }
    });
    
    // Also include all regions that SHOULD be available up to current day
    // This allows users to fill in regions from previous days or current day
    for (let day = 1; day <= this.currentDayNumber; day++) {
      const regionsForDay = this.getRegionsForDay(day, this.currentWay);
      regionsForDay.forEach(region => unlockedRegions.add(region));
    }
    
    return Array.from(unlockedRegions).sort((a, b) => a - b);
  }

  // Handle manual region click (counts as check-in for that region's day)
  toggleRegion(regionNumber) {
    const regionId = `#region-${regionNumber}`;
    const region = this.svg.select(regionId);
    
    if (!region.empty()) {
      const isSelected = region.classed(SELECTED_CLASS);
      
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
  
  // Handle manual region click - add to appropriate day's check-in
  handleManualRegionClick(regionNumber) {
    // Determine which day this region belongs to
    const dayNumber = this.findDayForRegion(regionNumber);
    
    // Set start date if this is the first check-in
    if (!this.checkInData.startDate) {
      this.checkInData.startDate = this.getTodayTimestamp();
    }
    
    // Find if there's already a check-in for this day
    const existingCheckIn = this.checkInData.checkIns.find(ci => ci.dayNumber === dayNumber);
    
    if (existingCheckIn) {
      // Add region to existing check-in if not already present
      if (!existingCheckIn.regions.includes(regionNumber)) {
        existingCheckIn.regions.push(regionNumber);
        existingCheckIn.regions.sort((a, b) => a - b); // Keep sorted
        console.log(`Added region ${regionNumber} to existing day ${dayNumber} check-in`);
      }
    } else {
      // Create new check-in for this day
      const newCheckIn = {
        dayNumber: dayNumber,
        regions: [regionNumber],
        timestamp: this.getTodayTimestamp(),
        way: this.currentWay
      };
      this.checkInData.checkIns.push(newCheckIn);
      // Sort check-ins by day number
      this.checkInData.checkIns.sort((a, b) => a.dayNumber - b.dayNumber);
      console.log(`Created new check-in for day ${dayNumber} with region ${regionNumber}`);
    }
    
    // Update max day reached
    if (dayNumber > this.checkInData.maxDayReached) {
      this.checkInData.maxDayReached = dayNumber;
    }
    
    // Update currentWay in checkInData
    this.checkInData.currentWay = this.currentWay;
    
    // Save to localStorage
    this.saveCheckInData();
    
    // Update max day display
    this.updateMaxDayDisplay();
  }
  
  // Remove a region from check-in data
  removeRegionFromCheckIn(regionNumber) {
    // Find which check-in contains this region
    for (let checkIn of this.checkInData.checkIns) {
      const index = checkIn.regions.indexOf(regionNumber);
      if (index !== -1) {
        checkIn.regions.splice(index, 1);
        console.log(`Removed region ${regionNumber} from day ${checkIn.dayNumber} check-in`);
        
        // If no regions left in this check-in, remove the entire check-in
        if (checkIn.regions.length === 0) {
          const checkInIndex = this.checkInData.checkIns.indexOf(checkIn);
          this.checkInData.checkIns.splice(checkInIndex, 1);
          console.log(`Removed empty check-in for day ${checkIn.dayNumber}`);
        }
        break;
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
    this.checkInData.checkIns.forEach(checkIn => {
      if (checkIn.regions && Array.isArray(checkIn.regions)) {
        checkIn.regions.forEach(region => unlockedRegions.add(region));
      } else if (checkIn.region) {
        // Handle old format where single region was stored
        unlockedRegions.add(checkIn.region);
      }
    });
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
        
        // Handle migration from old format to new format
        if (loadedData.checkIns && loadedData.checkIns.length > 0) {
          const firstCheckIn = loadedData.checkIns[0];
          
          // Old format: {region: number, timestamp: string}
          // New format: {dayNumber: number, regions: [], timestamp: string, way: number}
          if (firstCheckIn.region && !firstCheckIn.regions) {
            // Migrate old format: assume 90-day way (1 region per day)
            loadedData.checkIns = loadedData.checkIns.map((checkIn, index) => ({
              dayNumber: index + 1,
              regions: [checkIn.region],
              timestamp: checkIn.timestamp,
              way: 90 // Old format was 1 region per day
            }));
            loadedData.currentWay = 90;
          }
        }
        
        // Ensure currentWay exists
        if (!loadedData.currentWay) {
          loadedData.currentWay = 30; // Default to 30 days
        }
        
        // Ensure maxDayReached exists
        if (!loadedData.maxDayReached) {
          // Calculate max day from existing check-ins
          const maxDay = loadedData.checkIns.length > 0
            ? Math.max(...loadedData.checkIns.map(ci => ci.dayNumber))
            : 0;
          loadedData.maxDayReached = maxDay;
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
        checkIns: [],
        maxDayReached: 0
      };
      this.currentWay = 30;
    }
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
    
    // Get the last check-in day to detect missed days
    const lastCheckInDayNumber = this.checkInData.checkIns.length > 0
      ? Math.max(...this.checkInData.checkIns.map(ci => ci.dayNumber))
      : 0;
    
    // Check if user missed a day (gap between last check-in and expected day)
    // If expectedDayNumber is more than 1 day ahead of lastCheckInDayNumber, user missed a day
    if (lastCheckInDayNumber > 0 && expectedDayNumber > lastCheckInDayNumber + 1) {
      // User missed a day! Reset progress
      const missedDays = expectedDayNumber - lastCheckInDayNumber - 1;
      this.resetProgressDueToMissedDay(missedDays);
      return; // Exit early as reset will recalculate
    }

    this.currentDayNumber = expectedDayNumber;

    // Check if already checked in today
    // A day is considered "checked in" if there's a check-in entry for today's day number
    // and it has at least one region from today's range
    const todayCheckIn = this.checkInData.checkIns.find(ci => ci.dayNumber === this.currentDayNumber);
    
    if (todayCheckIn && todayCheckIn.regions.length > 0) {
      // Check if any region in the check-in belongs to today's day
      const todaysRegions = this.getRegionsForDay(this.currentDayNumber, this.currentWay);
      const hasRegionFromToday = todayCheckIn.regions.some(region => 
        todaysRegions.includes(region)
      );
      this.hasCheckedInToday = hasRegionFromToday;
    } else {
      this.hasCheckedInToday = false;
    }
  }

  // Reset progress when user misses a day
  resetProgressDueToMissedDay(missedDays) {
    // Update max day reached before reset
    const currentMax = Math.max(...this.checkInData.checkIns.map(ci => ci.dayNumber), 0);
    if (currentMax > this.checkInData.maxDayReached) {
      this.checkInData.maxDayReached = currentMax;
    }
    
    // Clear check-ins but keep current way and max day
    const currentWay = this.checkInData.currentWay;
    const maxDay = this.checkInData.maxDayReached;
    
    this.checkInData = {
      startDate: null,
      currentWay: currentWay,
      checkIns: [],
      maxDayReached: maxDay
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

  // Check in for today
  checkIn() {
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

    // Check if there's already a check-in for current day (from manual clicks)
    const existingCheckIn = this.checkInData.checkIns.find(ci => ci.dayNumber === this.currentDayNumber);
    
    if (existingCheckIn) {
      // Merge regions: add any missing regions from regionsToUnlock
      regionsToUnlock.forEach(region => {
        if (!existingCheckIn.regions.includes(region)) {
          existingCheckIn.regions.push(region);
        }
      });
      existingCheckIn.regions.sort((a, b) => a - b);
      console.log(`Merged check-in button regions with existing day ${this.currentDayNumber} check-in`);
    } else {
      // Create new check-in for the current day with UTC timestamp and multiple regions
      const checkIn = {
        dayNumber: this.currentDayNumber,
        regions: regionsToUnlock,
        timestamp: todayTimestamp,
        way: this.currentWay
      };
      this.checkInData.checkIns.push(checkIn);
    }
    
    this.hasCheckedInToday = true;

    // Update max day reached
    if (this.currentDayNumber > this.checkInData.maxDayReached) {
      this.checkInData.maxDayReached = this.currentDayNumber;
    }

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
    const currentMax = Math.max(...this.checkInData.checkIns.map(ci => ci.dayNumber), 0);
    if (currentMax > this.checkInData.maxDayReached) {
      this.checkInData.maxDayReached = currentMax;
    }

    // Clear the data but keep current way setting and max day
    this.checkInData = {
      startDate: null,
      currentWay: this.currentWay,
      checkIns: [],
      maxDayReached: this.checkInData.maxDayReached
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

    // Save to localStorage (preserves way setting and max day)
    this.saveCheckInData();

    console.log('All check-ins reset');
    
    // Update the button state
    this.updateCheckInButton();
    
    // Update max day display
    this.updateMaxDayDisplay();
    
    alert('All check-ins have been reset.');
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
    
    if (this.hasCheckedInToday) {
      // Already checked in today - disable button and show achievement
      btn
        .property('disabled', true)
        .text(`Day ${this.currentDayNumber} Achieved`);
    } else {
      // Can check in - enable button and show day number
      btn
        .property('disabled', false)
        .text(`Day ${this.currentDayNumber} Check-in`);
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
    // Get or create max day display element
    let maxDayDisplay = d3.select('#max-day-display');
    
    if (maxDayDisplay.empty()) {
      // Create the element if it doesn't exist
      const labelContainer = d3.select('.label-container');
      maxDayDisplay = labelContainer
        .append('div')
        .attr('id', 'max-day-display')
        .attr('class', 'max-day-display');
    }
    
    // Update the text
    if (this.checkInData.maxDayReached > 0) {
      maxDayDisplay.text(`Max: ${this.checkInData.maxDayReached} day${this.checkInData.maxDayReached > 1 ? 's' : ''}`);
    } else {
      maxDayDisplay.text('');
    }
  }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new BrainSelector();
});

// Export for testing purposes
export default BrainSelector;
