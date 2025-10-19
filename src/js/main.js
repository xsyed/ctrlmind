import * as d3 from 'd3';

import regionsData from '../data/regions.json';

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
      this.loadRegionsMetadata();
      
      await this.loadSVG();
      
      this.loadSelections();
      
      this.setupEventListeners();
      
      // Initialize UI
      this.updateLegend();
      this.populateAllRegionsList();
      
      console.log('Brain Selector initialized successfully!');
    } catch (error) {
      console.error('Error initializing Brain Selector:', error);
    }
  }

  loadRegionsMetadata() {
    // Create a map of region ID to metadata
    regionsData.regions.forEach(region => {
      this.regionsMap.set(region.id, region);
    });
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
        const regionId = region.attr('data-region');
        this.toggleRegion(regionId, region);
      })
      .on('mouseenter', (event) => {
        const region = d3.select(event.currentTarget);
        const regionId = region.attr('data-region');
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
    this.updateLegend();
    
    // Add animation feedback
    this.animateSelection(regionElement);
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
          const region = this.svg.select(`[data-region="${regionId}"]`);
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

  updateLegend() {
    const selectedList = d3.select('#selected-regions-list');
    
    if (this.selectedRegions.size === 0) {
      selectedList.html('<p class="empty-message">No regions selected yet. Click on the brain!</p>');
      return;
    }
    
    // Create list items for selected regions
    const items = selectedList
      .selectAll('.selected-item')
      .data(Array.from(this.selectedRegions), d => d);
    
    // Remove old items
    items.exit()
      .transition()
      .duration(300)
      .style('opacity', 0)
      .remove();
    
    // Add new items
    const newItems = items.enter()
      .append('div')
      .attr('class', 'selected-item')
      .style('opacity', 0);
    
    newItems.append('span')
      .attr('class', 'region-name');
    
    newItems.append('button')
      .attr('class', 'remove-btn')
      .text('×')
      .on('click', (event, regionId) => {
        const region = this.svg.select(`[data-region="${regionId}"]`);
        this.toggleRegion(regionId, region);
      });
    
    // Update all items
    const allItems = newItems.merge(items);
    
    allItems.select('.region-name')
      .text(d => {
        const metadata = this.regionsMap.get(d);
        return metadata ? metadata.name : d;
      });
    
    allItems
      .transition()
      .duration(300)
      .style('opacity', 1);
  }

  populateAllRegionsList() {
    const list = d3.select('#all-regions-list');
    
    regionsData.regions.forEach(region => {
      list.append('li')
        .text(region.name)
        .attr('title', region.description)
        .on('click', () => {
          // Scroll to and highlight region in SVG
          const regionElement = this.svg.select(`[data-region="${region.id}"]`);
          if (!regionElement.empty()) {
            this.highlightRegion(regionElement);
          }
        });
    });
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
    
    // Update UI
    this.updateLegend();
    
    console.log('All selections reset');
  }

  setupEventListeners() {
    // Reset button
    d3.select('#reset-btn').on('click', () => {
      if (confirm('Are you sure you want to reset all selections?')) {
        this.resetSelections();
      }
    });
    
    // Toggle legend button
    d3.select('#toggle-legend-btn').on('click', () => {
      const legendPanel = d3.select('#legend-panel');
      const isHidden = legendPanel.classed('hidden');
      legendPanel.classed('hidden', !isHidden);
      
      d3.select('#toggle-legend-btn')
        .text(isHidden ? 'Hide Legend' : 'Show Legend');
    });
  }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new BrainSelector();
});

// Export for testing purposes
export default BrainSelector;
