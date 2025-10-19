import * as d3 from 'd3';

// Constants
const STORAGE_KEY = 'brain-selected-regions';
const SELECTED_CLASS = 'selected';

class BrainSelector {
  constructor() {
    this.selectedRegions = new Set();
    this.regionsMap = new Map();
    this.svg = null;
    this.tooltip = null;
    
    this.init();
  }

  async init() {
    try {
      
      await this.loadSVG();
      
      this.loadSelections();
      
      this.setupEventListeners();
      

      console.log('Brain Selector initialized successfully!');
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
    
    regions
      .on('click', (event, d) => {
        const region = d3.select(event.currentTarget);
        const regionId = region.attr('id');
        this.toggleRegion(regionId, region);
      })
      .on('mouseenter', (event) => {
        const region = d3.select(event.currentTarget);
        const regionId = region.attr('id');
        const regionName = region.attr('data-name');
        // this.showTooltip(event, regionId, regionName);
      })
      .on('mousemove', (event) => {
        this.moveTooltip(event);
      })
      .on('mouseleave', () => {
        this.hideTooltip();
      });
  }

  toggleRegion(regionId, regionElement) {
    if (this.selectedRegions.has(regionId)) {
      // Deselect
      this.selectedRegions.delete(regionId);
      regionElement.classed(SELECTED_CLASS, false);
    } else {
      // Select
      this.selectedRegions.add(regionId);
      regionElement.classed(SELECTED_CLASS, true);
    }
    
    // Save to localStorage
    this.saveSelections();
    
    // Update UI
    // this.updateLegend();
    
    // Add animation feedback
    // this.animateSelection(regionElement);
  }

  animateSelection(element) {
    element
      .transition()
      .duration(200)
      .attr('transform', 'scale(1.05)')
      .transition()
      .duration(200)
      .attr('transform', 'scale(1)');
  }

  showTooltip(event, regionId, regionName) {
    const tooltip = d3.select('#tooltip');
    const metadata = this.regionsMap.get(regionId);
    
    let content = `<h4>${regionName}</h4>`;
    
    if (metadata) {
      content += `<p><strong>Function:</strong> ${metadata.description}</p>`;
    }
    
    tooltip
      .html(content)
      .style('display', 'block')
      .style('left', (event.pageX + 15) + 'px')
      .style('top', (event.pageY - 30) + 'px');
  }

  moveTooltip(event) {
    d3.select('#tooltip')
      .style('left', (event.pageX + 15) + 'px')
      .style('top', (event.pageY - 30) + 'px');
  }

  hideTooltip() {
    d3.select('#tooltip').style('display', 'none');
  }

  saveSelections() {
    const selectionsArray = Array.from(this.selectedRegions);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectionsArray));
    console.log('Selections saved:', selectionsArray);
  }

  loadSelections() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const selectionsArray = JSON.parse(saved);
        this.selectedRegions = new Set(selectionsArray);
        
        // Apply selected class to regions
        selectionsArray.forEach(regionId => {
          const region = this.svg.select(`[id="${regionId}"]`);
          if (!region.empty()) {
            region.classed(SELECTED_CLASS, true);
          }
        });
        
        console.log('Selections loaded:', selectionsArray);
      }
    } catch (error) {
      console.error('Error loading selections:', error);
    }
  }



  highlightRegion(regionElement) {
    // Temporarily highlight the region
    const originalFill = regionElement.style('fill');
    
    regionElement
      .transition()
      .duration(300)
      .style('fill', '#ffd700')
      .transition()
      .duration(300)
      .style('fill', originalFill);
  }

  resetSelections() {
    // Clear all selections
    this.selectedRegions.clear();
    
    // Remove selected class from all regions
    this.svg.selectAll('.brain-region')
      .classed(SELECTED_CLASS, false);
    
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEY);
    
    console.log('All selections reset');
  }

  setupEventListeners() {
    // Fail button - Reset all selections
    d3.select('#fail-btn').on('click', () => {
      this.resetSelections();
    });
    
    // Done button - Toggle one random unselected region
    d3.select('#done-btn').on('click', () => {
      this.toggleRandomRegion();
    });
  }

  toggleRandomRegion() {
    // Get all brain regions
    const allRegions = this.svg.selectAll('.brain-region');
    const allRegionIds = [];
    
    // Collect all region IDs
    allRegions.each(function() {
      const regionId = d3.select(this).attr('id');
      if (regionId) {
        allRegionIds.push(regionId);
      }
    });
    
    // Filter out already selected regions
    const unselectedRegions = allRegionIds.filter(id => !this.selectedRegions.has(id));
    
    // Check if there are any unselected regions
    if (unselectedRegions.length === 0) {
      console.log('All regions are already selected!');
      // Optional: Show a message to the user
      alert('All brain regions are already selected! 🎉');
      return;
    }
    
    // Pick a random unselected region
    const randomIndex = Math.floor(Math.random() * unselectedRegions.length);
    const randomRegionId = unselectedRegions[randomIndex];
    
    // Get the region element and toggle it
    const regionElement = this.svg.select(`[id="${randomRegionId}"]`);
    if (!regionElement.empty()) {
      this.toggleRegion(randomRegionId, regionElement);
      console.log(`Randomly selected region: ${randomRegionId}`);
    }
  }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new BrainSelector();
});

// Export for testing purposes
export default BrainSelector;
