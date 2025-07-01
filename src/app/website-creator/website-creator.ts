import { Component, OnInit, ViewChild, ElementRef, effect } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebsiteBuilderService, ComponentDefinition, ComponentInstance } from '../services/website-builder';
import { WorkspaceProject } from './workspace-selection.component';

@Component({
  selector: 'app-website-creator',
  standalone: false,
  templateUrl: './website-creator.html',
  styleUrls: ['./website-creator.css']
})
export class WebsiteCreatorComponent implements OnInit {
  @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLDivElement>;

  // Workspace state
  showWorkspaceSelection = true;
  currentProject: WorkspaceProject | null = null;

  // Component data
  availableComponents: ComponentDefinition[] = [];
  filteredComponents: ComponentDefinition[] = [];
  pageComponents: ComponentInstance[] = [];
  selectedComponent: any = null;
  selectedComponentInstance: any = null;
  selectedCategory: string = 'All';
  searchTerm: string = '';
  selectedDevice: string = 'desktop';
  deviceOptions = [
    { label: 'Desktop', value: 'desktop' },
    { label: 'Tablet', value: 'tablet' }, 
    { label: 'Mobile', value: 'mobile' }
  ];
  showPropertiesPanel = false;

  // Pages
  pages: any[] = [];
  currentPageId = 'home';

  // Device viewport
  deviceWidths: { [key: string]: string } = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px'
  };

  // Properties panel state
  activeProperties: any = {};

  // Dialogs
  showNewProjectDialog = false;
  showExportDialog = false;
  showImportDialog = false;
  showJsonEditor = false;
  newProjectDescription = '';
  newProjectName = '';
  exportData = '';
  importData = '';

  componentCategories: { name: string; count: number }[] = [];
  selectedPageId: string = '1';

  constructor(
    private websiteBuilder: WebsiteBuilderService,
    private router: Router
  ) {
    // Initially show workspace selection, don't auto-create project
  }

  ngOnInit() {
    // Show workspace selection first - don't initialize builder until project is selected
    console.log('Website Creator initialized - showing workspace selection');
  }

  // Search and filter methods
  onSearchChange(event: any): void {
    this.websiteBuilder.updateSearchTerm(event.target.value);
  }

  onCategoryChange(category: string): void {
    this.websiteBuilder.updateSelectedCategory(category);
  }

  private filterComponents(): void {
    this.websiteBuilder.updateSearchTerm(this.searchTerm);
  }

  // Page management methods
  onPageTabClick(pageId: string): void {
    this.websiteBuilder.setCurrentPage(pageId);
  }

  onNavigationClick(event: MouseEvent, pageId: string): void {
    // Prevent the component from being selected when clicking navigation
    event.stopPropagation();
    this.websiteBuilder.setCurrentPage(pageId);
  }

  onAddPage(): void {
    const name = prompt('Enter page name:');
    const route = prompt('Enter page route (e.g., /new-page):');
    
    if (name && route) {
      this.websiteBuilder.addPage(name, route);
    }
  }

  onDeletePage(pageId: string): void {
    if (confirm('Are you sure you want to delete this page?')) {
      this.websiteBuilder.deletePage(pageId);
    }
  }

  // Component methods
  onDragStart(event: DragEvent, component: ComponentDefinition): void {
    console.log('Drag started for component:', component.name, component);
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', JSON.stringify(component));
      event.dataTransfer.effectAllowed = 'copy';
    }
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    const componentData = event.dataTransfer?.getData('text/plain');
    
    console.log('Drop event triggered, data:', componentData);
    
    if (componentData) {
      try {
        const component = JSON.parse(componentData);
        
        // Get canvas position for component placement
        const target = event.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        console.log('Attempting to add component:', component.id, 'at position:', x, y);
        
        // Use the website builder service to add the component
        const newInstance = this.websiteBuilder.addComponent(component.id, x, y);
        
        console.log('Component added successfully:', newInstance);
        
        // Select the new instance
        this.selectedComponentInstance = newInstance;
        
      } catch (error) {
        console.error('Error parsing dropped component:', error);
      }
    }
  }

  private getDefaultProps(componentType: string): any {
    const defaultProps: { [key: string]: any } = {
      'top-navigation': {
        brandName: 'Your Brand',
        menuItems: ['Home', 'About', 'Services', 'Contact']
      },
      'hero-section': {
        title: 'Welcome to Our Service',
        subtitle: 'Professional solutions for your business',
        buttonText: 'Get Started',
        backgroundColor: '#4f46e5',
        textColor: '#ffffff',
        buttonColor: '#ffffff',
        textAlign: 'center'
      },
      'text-block': {
        heading: 'Text Heading',
        content: 'Your text content goes here...',
        textAlign: 'left',
        textColor: '#000000',
        fontSize: 16
      },
      'image': {
        imageUrl: 'https://via.placeholder.com/400x300',
        altText: 'Placeholder image',
        width: 400,
        height: 300,
        alignment: 'center'
      },
      'button': {
        text: 'Click Me',
        backgroundColor: '#4f46e5',
        textColor: '#ffffff',
        size: 'medium',
        alignment: 'center'
      },
      'card-grid': {
        columns: 3,
        cardCount: 6
      },
      'footer': {
        companyName: 'Your Company',
        description: 'Company description goes here',
        backgroundColor: '#1f2937',
        textColor: '#ffffff',
        links: ['About', 'Services', 'Contact', 'Privacy'],
        copyrightText: '© 2024 Your Company. All rights reserved.'
      },
      'services-gallery': {
        serviceCount: 4
      },
      'product-grid': {
        productCount: 6,
        columns: 3
      }
    };
    
    return defaultProps[componentType] || {};
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onComponentClick(component: ComponentInstance): void {
    this.selectedComponent = component;
    this.activeProperties = { ...component.parameters };
    this.showPropertiesPanel = true;
  }

  onPropertyChange(propertyName: string, value: any): void {
    if (this.selectedComponent) {
      this.activeProperties[propertyName] = value;
      this.websiteBuilder.updateComponent(this.selectedComponent.id, {
        parameters: { ...this.selectedComponent.parameters, [propertyName]: value }
      });
    }
  }

  onDeleteComponent(componentId: string): void {
    this.websiteBuilder.deleteComponent(componentId);
    if (this.selectedComponent?.id === componentId) {
      this.selectedComponent = null;
      this.showPropertiesPanel = false;
    }
  }

  // Device viewport methods
  onDeviceChange(device: 'desktop' | 'tablet' | 'mobile'): void {
    this.selectedDevice = device;
    this.websiteBuilder.switchDevice(device);
  }

  // Project methods
  onNewProject(): void {
    this.showNewProjectDialog = true;
  }

  onCreateNewProject(): void {
    if (this.newProjectName.trim() && this.newProjectDescription.trim()) {
      this.websiteBuilder.createNewProject(this.newProjectName, this.newProjectDescription);
      this.showNewProjectDialog = false;
      this.newProjectName = '';
      this.newProjectDescription = '';
    }
  }

  onExportProject(): void {
    this.exportData = this.websiteBuilder.exportProject();
    this.showExportDialog = true;
  }

  onImportProject(): void {
    this.showImportDialog = true;
  }

  onImportConfirm(): void {
    try {
      this.websiteBuilder.importProject(this.importData);
      this.showImportDialog = false;
      this.importData = '';
    } catch (error) {
      alert('Invalid project data format');
    }
  }

  onPreview(): void {
    console.log('Preview functionality to be implemented');
  }

  onSave(): void {
    console.log('Save functionality to be implemented');
  }

  onJsonEditor(): void {
    this.showJsonEditor = !this.showJsonEditor;
  }

  onBack(): void {
    this.router.navigate(['/']);
  }

  // Utility methods
  getComponentIcon(icon: string): string {
    return icon || 'pi pi-box';
  }

  closePropertiesPanel(): void {
    this.showPropertiesPanel = false;
    this.selectedComponent = null;
  }

  // Component filtering helper
  getFilteredComponentsByCategory(category: string): ComponentDefinition[] {
    let filtered = this.availableComponents;
    
    // Filter by category
    if (category !== 'All') {
      filtered = filtered.filter(comp => comp.category === category);
    }
    
    // Filter by search term
    if (this.searchTerm) {
      filtered = filtered.filter(comp => 
        comp.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        comp.description.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }

  // Helper method to get component by ID
  getComponentById(id: string): ComponentDefinition | undefined {
    return this.availableComponents.find(comp => comp.id === id);
  }

  // Helper method to get page by ID
  getPageById(pageId: string): any {
    return this.pages.find(page => page.id === pageId);
  }

  // Event handling helpers
  handleInputChange(event: Event, propertyName: string): void {
    const target = event.target as HTMLInputElement;
    this.onPropertyChange(propertyName, target.value);
  }

  handleSelectChange(event: Event, propertyName: string): void {
    const target = event.target as HTMLSelectElement;
    this.onPropertyChange(propertyName, target.value);
  }

  handleCheckboxChange(event: Event, propertyName: string): void {
    const target = event.target as HTMLInputElement;
    this.onPropertyChange(propertyName, target.checked);
  }

  // Clipboard helper
  copyToClipboard(): void {
    navigator.clipboard.writeText(this.exportData).then(() => {
      console.log('Copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  }

  get currentPageComponents() {
    const currentPage = this.websiteBuilder.getCurrentPage();
    return currentPage ? currentPage.components : [];
  }

  getCurrentPageComponents() {
    return this.currentPageComponents;
  }

  trackByInstanceId(index: number, instance: any) {
    return instance.id;
  }

  private selectionTimeout: any = null;

  selectComponentInstance(instance: any) {
    // Debounce the selection to prevent rapid-fire updates
    if (this.selectionTimeout) {
      clearTimeout(this.selectionTimeout);
    }
    
    this.selectionTimeout = setTimeout(() => {
    this.selectedComponentInstance = instance;
    console.log('Selected component instance:', instance);
      this.selectionTimeout = null;
    }, 50); // 50ms debounce
  }

  getArrayFromNumber(count: number): number[] {
    return Array.from({ length: count }, (_, i) => i);
  }

  getComponentDefinition(componentType: string): ComponentDefinition | undefined {
    return this.websiteBuilder.getComponentDefinition(componentType);
  }

  // Component interaction methods
  private isDragging = false;
  private isResizing = false;
  private dragStart = { x: 0, y: 0 };
  private resizeMode = '';

  startResize(event: MouseEvent, instance: any, mode: string) {
    event.stopPropagation();
    event.preventDefault();
    
    this.isResizing = true;
    this.resizeMode = mode;
    this.selectedComponentInstance = instance;
    
    const mouseMoveHandler = (e: MouseEvent) => {
      if (!this.isResizing || !this.selectedComponentInstance) return;
      
      this.handleResize(e, this.selectedComponentInstance, mode);
    };
    
    const mouseUpHandler = () => {
      this.isResizing = false;
      this.resizeMode = '';
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
    };
    
    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
  }

  private handleResize(event: MouseEvent, instance: any, mode: string) {
    const rect = event.currentTarget as HTMLElement;
    
    // Update instance dimensions based on resize mode
    switch (mode) {
      case 'se': // Southeast - bottom right
        instance.width = Math.max(100, event.clientX - instance.x);
        instance.height = Math.max(50, event.clientY - instance.y);
        break;
      case 'sw': // Southwest - bottom left  
        const newWidth = Math.max(100, instance.width - (event.clientX - instance.x));
        instance.x = instance.x + instance.width - newWidth;
        instance.width = newWidth;
        instance.height = Math.max(50, event.clientY - instance.y);
        break;
      case 'ne': // Northeast - top right
        instance.width = Math.max(100, event.clientX - instance.x);
        const newHeight = Math.max(50, instance.height - (event.clientY - instance.y));
        instance.y = instance.y + instance.height - newHeight;
        instance.height = newHeight;
        break;
      case 'nw': // Northwest - top left
        const newW = Math.max(100, instance.width - (event.clientX - instance.x));
        const newH = Math.max(50, instance.height - (event.clientY - instance.y));
        instance.x = instance.x + instance.width - newW;
        instance.y = instance.y + instance.height - newH;
        instance.width = newW;
        instance.height = newH;
        break;
    }
  }

  deleteComponent(event: MouseEvent, componentId: string) {
    event.stopPropagation();
    
    if (confirm('Are you sure you want to delete this component?')) {
      // Remove from current page
      const currentPage = this.websiteBuilder.getCurrentPage();
      if (currentPage) {
        currentPage.components = currentPage.components.filter(c => c.id !== componentId);
        
        // Update pages array
        const currentPages = this.pages;
        const updatedPages = currentPages.map(page => 
          page.id === currentPage.id ? currentPage : page
        );
        this.pages = updatedPages;
        
        // Clear selection if deleted component was selected
        if (this.selectedComponentInstance?.id === componentId) {
          this.selectedComponentInstance = null;
        }
        
        console.log('Component deleted:', componentId);
      }
    }
  }

  startDrag(event: MouseEvent, instance: any) {
    // Only drag if not clicking on resize handle or delete button
    if ((event.target as HTMLElement).classList.contains('resize-handle') ||
        (event.target as HTMLElement).classList.contains('delete-btn')) {
      return;
    }
    
    event.preventDefault();
    this.isDragging = true;
    this.selectedComponentInstance = instance;
    
    const startX = event.clientX - instance.x;
    const startY = event.clientY - instance.y;
    
    const mouseMoveHandler = (e: MouseEvent) => {
      if (!this.isDragging || !this.selectedComponentInstance) return;
      
      const newX = Math.max(0, e.clientX - startX);
      const newY = Math.max(0, e.clientY - startY);
      
      this.selectedComponentInstance.x = newX;
      this.selectedComponentInstance.y = newY;
    };
    
    const mouseUpHandler = () => {
      this.isDragging = false;
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
    };
    
    document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
  }

  updateComponentCategories() {
    this.componentCategories = [
      { name: 'All', count: this.availableComponents.length },
      { name: 'UI', count: this.availableComponents.filter(c => c.category === 'UI').length },
      { name: 'Data', count: this.availableComponents.filter(c => c.category === 'Data').length }
    ];
    console.log('Updated category counts:', this.componentCategories);
  }

  updateComponentParameter(parameterName: string, event: Event): void {
    if (!this.selectedComponentInstance) return;
    
    const target = event.target as HTMLInputElement;
    let value: any = target.value;
    
    // Handle different input types
    if (target.type === 'checkbox') {
      value = target.checked;
    } else if (target.type === 'number') {
      value = parseFloat(value) || 0;
    }
    
    // Update the component instance parameters
    this.selectedComponentInstance.parameters[parameterName] = value;
    
    // Update in the service/page data
    const currentPage = this.websiteBuilder.getCurrentPage();
    if (currentPage) {
      const componentIndex = currentPage.components.findIndex(c => c.id === this.selectedComponentInstance.id);
      if (componentIndex !== -1) {
        currentPage.components[componentIndex].parameters[parameterName] = value;
      }
    }
    
    console.log('Updated parameter:', parameterName, 'to:', value);
  }

  duplicateComponent(): void {
    if (!this.selectedComponentInstance) return;
    
    const original = this.selectedComponentInstance;
    const newInstance = {
      ...original,
      id: this.generateUniqueId(),
      x: original.x + 20,
      y: original.y + 20,
      parameters: { ...original.parameters }
    };
    
    const currentPage = this.websiteBuilder.getCurrentPage();
    if (currentPage) {
      currentPage.components.push(newInstance);
      this.selectedComponentInstance = newInstance;
    }
  }

  deleteSelectedComponent(): void {
    if (!this.selectedComponentInstance) return;
    
    this.deleteComponent(new MouseEvent('click'), this.selectedComponentInstance.id);
    this.selectedComponentInstance = null;
  }

  private generateUniqueId(): string {
    return 'comp_' + Math.random().toString(36).substr(2, 9);
  }

  // Workspace selection methods
  onWorkspaceProjectSelected(project: WorkspaceProject): void {
    console.log('Project selected:', project);
    this.currentProject = project;
    this.showWorkspaceSelection = false;
    
    // Initialize the website builder with this project
    this.websiteBuilder.createNewProject(project.name, project.description);
    this.initializeWebsiteBuilder();
  }

  onWorkspaceProjectCreated(project: WorkspaceProject): void {
    console.log('New project created:', project);
    this.currentProject = project;
    this.showWorkspaceSelection = false;
    
    // Initialize the website builder with this project
    this.websiteBuilder.createNewProject(project.name, project.description);
    this.initializeWebsiteBuilder();
  }

  onBackToWorkspace(): void {
    this.showWorkspaceSelection = true;
    this.currentProject = null;
    // Clear the current project state
    this.selectedComponentInstance = null;
    this.pageComponents = [];
  }

  private initializeWebsiteBuilder(): void {
    // Initialize pages and components after project is set
    this.websiteBuilder.initializePages();

    // Subscribe to observables
    this.websiteBuilder.availableComponents$.subscribe((components: ComponentDefinition[]) => {
      this.availableComponents = components;
      this.updateComponentCategories();
      this.filterComponents();
      console.log('Available components loaded:', components.length, components.map(c => c.name));
    });

    this.websiteBuilder.filteredComponents$.subscribe((filtered: ComponentDefinition[]) => {
      this.filteredComponents = filtered;
      console.log('Filtered components updated:', filtered.length);
    });

    this.websiteBuilder.components$.subscribe((components: ComponentInstance[]) => {
      this.pageComponents = components;
      console.log('Page components updated:', components.length);
    });

    this.websiteBuilder.pages$.subscribe((pages: any[]) => {
      this.pages = pages;
      console.log('Pages updated:', pages.length);
    });

    this.websiteBuilder.currentPageId$.subscribe((pageId: string) => {
      this.currentPageId = pageId;
      console.log('Current page changed to:', pageId);
    });

    this.websiteBuilder.searchTerm$.subscribe((term: string) => {
      this.searchTerm = term;
    });

    this.websiteBuilder.selectedCategory$.subscribe((category: string) => {
      this.selectedCategory = category;
    });
  }
} 