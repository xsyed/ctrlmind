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
      checkIns: [] // Array of {dayNumber, regions: [], timestamp, way}
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
    const unlockedRegions = this.getAllUnlockedRegions();
    
    // Update which regions are clickable based on unlocked regions
    for (let i = 1; i <= MAX_REGIONS; i++) {
      const region = this.svg.select(`#region-${i}`);
      
      if (!region.empty()) {
        if (unlockedRegions.includes(i)) {
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

  // Toggle a region's selection state
  toggleRegion(regionNumber) {
    const regionId = `#region-${regionNumber}`;
    const region = this.svg.select(regionId);
    
    if (!region.empty()) {
      const isSelected = region.classed(SELECTED_CLASS);
      region.classed(SELECTED_CLASS, !isSelected);
      console.log(`Region ${regionNumber} toggled to ${!isSelected ? 'selected' : 'unselected'}`);
    }
  }

  // Get current timestamp in UTC (ISO format with seconds precision)
  getTodayTimestamp() {
    return new Date().toISOString();
  }

  // Calculate which regions should be unlocked for a given day number and way
  getRegionsForDay(dayNumber, way) {
    const totalRegions = MAX_REGIONS;
    const regionsPerDay = totalRegions / way;
    
    const startRegion = Math.floor((dayNumber - 1) * regionsPerDay) + 1;
    const endRegion = Math.floor(dayNumber * regionsPerDay);
    
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
        
        this.checkInData = loadedData;
        this.currentWay = loadedData.currentWay;
        console.log('Check-in data loaded:', this.checkInData);
      }
    } catch (error) {
      console.error('Error loading check-in data:', error);
      this.checkInData = {
        startDate: null,
        currentWay: 30,
        checkIns: []
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
    this.currentDayNumber = daysSinceStart + 1;

    // Check if already checked in today (compare local date strings)
    const todayCheckIn = this.checkInData.checkIns.find(ci => {
      const checkInDateStr = this.getLocalDateString(ci.timestamp);
      return checkInDateStr === todayDateStr;
    });
    this.hasCheckedInToday = !!todayCheckIn;
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
    const regionsToUnlock = this.getRegionsForDay(this.currentDayNumber, this.currentWay);
    
    // Check if any regions exceed the maximum
    const maxRegion = Math.max(...regionsToUnlock);
    if (maxRegion > MAX_REGIONS) {
      alert('Congratulations! You have completed all 90 days! 🎉');
      return;
    }

    // Add check-in for the current day with UTC timestamp and multiple regions
    const checkIn = {
      dayNumber: this.currentDayNumber,
      regions: regionsToUnlock,
      timestamp: todayTimestamp,
      way: this.currentWay
    };
    this.checkInData.checkIns.push(checkIn);
    this.hasCheckedInToday = true;

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
  }

  // Reset all check-ins
  resetAllCheckIns() {
    if (!confirm('Are you sure you want to reset all check-ins? This cannot be undone.')) {
      return;
    }

    // Clear the data but keep current way setting
    this.checkInData = {
      startDate: null,
      currentWay: this.currentWay,
      checkIns: []
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

    // Save to localStorage (preserves way setting)
    this.saveCheckInData();

    console.log('All check-ins reset');
    
    // Update the button state
    this.updateCheckInButton();
    
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
    
    // Note: This only affects future check-ins, not past ones
    // Update button text to show next check-in info
    this.updateCheckInButton();
  }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new BrainSelector();
});

// Export for testing purposes
export default BrainSelector;
