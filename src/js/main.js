import * as d3 from 'd3';

// Constants
const STORAGE_KEY = 'brain-checkin-data';
const SELECTED_CLASS = 'selected';
const MAX_REGIONS = 90;

class BrainSelector {
  constructor() {
    this.checkInData = {
      startDate: null,
      checkIns: []
    };
    this.svg = null;
    this.currentDayNumber = 0;
    this.hasCheckedInToday = false;
    
    this.init();
  }

  async init() {
    try {
      // Load check-in data from localStorage
      this.loadCheckInData();
      
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
    const regions = this.svg.selectAll('.brain-region');
    
    // Update which regions are clickable based on unlocked regions
    for (let i = 1; i <= MAX_REGIONS; i++) {
      const region = this.svg.select(`#region-${i}`);
      
      if (!region.empty()) {
        if (i <= this.currentDayNumber) {
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
        this.checkInData = JSON.parse(saved);
        console.log('Check-in data loaded:', this.checkInData);
      }
    } catch (error) {
      console.error('Error loading check-in data:', error);
      this.checkInData = {
        startDate: null,
        checkIns: []
      };
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

    this.checkInData.checkIns.forEach(checkIn => {
      const regionId = `#region-${checkIn.region}`;
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

    // Check if we've exceeded the maximum regions
    if (this.currentDayNumber > MAX_REGIONS) {
      alert('Congratulations! You have completed all 90 days! 🎉');
      return;
    }

    // Add check-in for the current day with UTC timestamp
    const checkIn = {
      region: this.currentDayNumber,
      timestamp: todayTimestamp // Store full UTC timestamp
    };
    this.checkInData.checkIns.push(checkIn);
    this.hasCheckedInToday = true;

    // Save to localStorage
    this.saveCheckInData();

    // Update the visual
    const regionId = `#region-${this.currentDayNumber}`;
    const region = this.svg.select(regionId);
    if (!region.empty()) {
      region.classed(SELECTED_CLASS, true);
      const localDateStr = this.getLocalDateString(todayTimestamp);
      console.log(`Checked in region ${this.currentDayNumber} on ${localDateStr} (UTC: ${todayTimestamp})`);
    }

    // Update region interactions to make the newly unlocked region clickable
    this.setupRegionInteractions();

    // Update the button state
    this.updateCheckInButton();
  }

  // Reset all check-ins
  resetAllCheckIns() {
    if (!confirm('Are you sure you want to reset all check-ins? This cannot be undone.')) {
      return;
    }

    // Clear the data
    this.checkInData = {
      startDate: null,
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

    // Clear localStorage
    localStorage.removeItem(STORAGE_KEY);

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
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new BrainSelector();
});

// Export for testing purposes
export default BrainSelector;
