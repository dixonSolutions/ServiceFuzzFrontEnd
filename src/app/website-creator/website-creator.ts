import { Component, OnInit, ViewChild, ElementRef, effect } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebsiteBuilderService, ComponentDefinition, ComponentInstance, BusinessImage, BusinessImagesResponse } from '../services/website-builder';
import { WorkspaceProject } from './workspace-selection.component';
import { CreateWorkspaceDto, UpdateWorkspaceDto } from '../models/workspace.models';

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

  // Assets Management
  activeTab: 'components' | 'assets' = 'components';
  businessImages: BusinessImage[] = [];
  isLoadingImages = false;
  imageUploadError: string | null = null;
  selectedImageFile: File | null = null;
  imageDescription = '';
  showImageUploadDialog = false;
  showAssetBrowserDialog = false;
  currentImageAssetProperty: string | null = null;
  
  // Built-in navigation properties (separate from page components)
  builtInNavProperties: { [key: string]: any } = {
    logoType: 'text',
    logoText: 'Your Business',
    logoImage: '',
    logoShape: 'square',
    logoSize: 'normal',
    backgroundColor: '#f8f9fa',
    textColor: '#2c3e50',
    showShadow: true
  };

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
        logoType: 'text',
        logoText: 'My Website',
        logoImage: '',
        logoShape: 'square',
        logoSize: 'normal',
        backgroundColor: '#ffffff',
        textColor: '#000000',
        isSticky: true,
        showShadow: true
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
    if (!this.currentProject) {
      alert('No project selected to save');
      return;
    }

    console.log('Saving project...', this.currentProject);
    
    // Convert current website state to JSON
    const websiteJson = this.exportWebsiteDataAsJson();
    
    // Update the current project with the website data
    this.currentProject.websiteJson = JSON.stringify(websiteJson);
    this.currentProject.lastModified = new Date();

    // Save or update the workspace
    if (this.currentProject.isNew) {
      this.saveNewWorkspace();
    } else {
      this.updateExistingWorkspace();
    }
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
    
    // Load existing website data if available
    if (project.websiteJson) {
      this.loadWebsiteDataFromJson(project.websiteJson);
    }
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

  // Assets Management Methods
  onTabChange(tab: 'components' | 'assets'): void {
    this.activeTab = tab;
    if (tab === 'assets' && this.businessImages.length === 0) {
      this.loadBusinessImages();
    }
  }

  loadBusinessImages(): void {
    if (!this.currentProject?.businessId) {
      this.imageUploadError = 'No business selected. Please select a business to view images.';
      return;
    }

    this.isLoadingImages = true;
    this.imageUploadError = null;

    this.websiteBuilder.getBusinessImages(this.currentProject.businessId)
      .subscribe({
        next: (response: BusinessImagesResponse) => {
          this.businessImages = response.images;
          this.isLoadingImages = false;
        },
        error: (error) => {
          this.imageUploadError = 'Failed to load images. Please try again.';
          this.isLoadingImages = false;
        }
      });
  }



  uploadImage(): void {
    if (!this.selectedImageFile) {
      this.imageUploadError = 'No file selected';
      return;
    }

    let businessId = this.currentProject?.businessId;
    if (!businessId) {
      this.imageUploadError = 'No business selected. Please select a business first.';
      return;
    }

    this.isLoadingImages = true;
    this.imageUploadError = null;

    this.websiteBuilder.uploadBusinessImage(
      businessId,
      this.selectedImageFile,
      this.imageDescription
    ).subscribe({
      next: (response) => {
        this.selectedImageFile = null;
        this.imageDescription = '';
        this.showImageUploadDialog = false;
        this.isLoadingImages = false;
        this.loadBusinessImages(); // Refresh the images list
      },
      error: (error) => {
        this.imageUploadError = 'Failed to upload image. Please try again.';
        this.isLoadingImages = false;
      }
    });
  }

  cancelImageUpload(): void {
    this.selectedImageFile = null;
    this.imageDescription = '';
    this.showImageUploadDialog = false;
    this.imageUploadError = null;
  }

  getDisplayableImageUrl(image: BusinessImage): string {
    return this.websiteBuilder.getDisplayableImageUrl(image);
  }

  formatFileSize(bytes: number): string {
    return this.websiteBuilder.formatFileSize(bytes);
  }

  formatUploadDate(dateString: string): string {
    return this.websiteBuilder.formatUploadDate(dateString);
  }

  selectImageForComponent(image: BusinessImage): void {
    if (this.selectedComponentInstance?.type === 'image') {
      // Update the selected image component with the chosen image
      const imageUrl = this.getDisplayableImageUrl(image);
      this.selectedComponentInstance.parameters['imageUrl'] = imageUrl;
      this.selectedComponentInstance.parameters['altText'] = image.description || image.fileName;
      
      // Update in the service/page data
      const currentPage = this.websiteBuilder.getCurrentPage();
      if (currentPage) {
        const componentIndex = currentPage.components.findIndex(c => c.id === this.selectedComponentInstance.id);
        if (componentIndex !== -1) {
          currentPage.components[componentIndex].parameters['imageUrl'] = imageUrl;
          currentPage.components[componentIndex].parameters['altText'] = image.description || image.fileName;
        }
      }
      
      console.log('Image selected for component:', image.fileName);
    }
  }

  downloadImage(image: BusinessImage): void {
    const link = document.createElement('a');
    link.href = this.getDisplayableImageUrl(image);
    link.download = image.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }



  // Simplified upload button click handler
  onUploadButtonClick(): void {
    this.uploadImage();
  }

  // User-friendly method to open upload dialog
  openUploadDialog(): void {
    this.selectedImageFile = null;
    this.imageDescription = '';
    this.imageUploadError = null;
    this.showImageUploadDialog = true;
  }

  // Trigger file input click
  triggerFileInput(): void {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  // Handle file selection in dialog (replaces onImageFileSelected)
  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.imageUploadError = 'Please select a valid image file';
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        this.imageUploadError = 'File size must be less than 10MB';
        return;
      }
      
      this.selectedImageFile = file;
      this.imageUploadError = null;
    }
  }

  // Remove selected file
  removeSelectedFile(): void {
    this.selectedImageFile = null;
    this.imageUploadError = null;
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  // Open asset browser for image selection
  openAssetBrowser(propertyName: string): void {
    this.currentImageAssetProperty = propertyName;
    this.showAssetBrowserDialog = true;
    // Load business images if not already loaded
    if (this.businessImages.length === 0 && !this.isLoadingImages) {
      this.loadBusinessImages();
    }
  }

  // Close asset browser
  closeAssetBrowser(): void {
    this.showAssetBrowserDialog = false;
    this.currentImageAssetProperty = null;
  }

  // Select image from asset browser for component property
  selectImageFromAssetBrowser(image: BusinessImage): void {
    if (this.selectedComponentInstance && this.currentImageAssetProperty) {
      const imageUrl = this.getDisplayableImageUrl(image);
      
      // Handle built-in navigation separately
      if (this.selectedComponentInstance.id === 'built-in-nav') {
        this.builtInNavProperties[this.currentImageAssetProperty] = imageUrl;
        console.log('Logo selected for built-in navigation:', image.fileName);
        this.closeAssetBrowser();
        return;
      }
      
      // Update the component instance
      this.selectedComponentInstance.parameters[this.currentImageAssetProperty] = imageUrl;
      
      // Also update alt text if it's the default
      if (this.currentImageAssetProperty === 'imageUrl' && 
          this.selectedComponentInstance.parameters['altText'] === 'Image description') {
        this.selectedComponentInstance.parameters['altText'] = image.description || image.fileName;
      }
      
      // Update in the service/page data
      const currentPage = this.websiteBuilder.getCurrentPage();
      if (currentPage) {
        const componentIndex = currentPage.components.findIndex(c => c.id === this.selectedComponentInstance.id);
        if (componentIndex !== -1) {
          currentPage.components[componentIndex].parameters[this.currentImageAssetProperty] = imageUrl;
          if (this.currentImageAssetProperty === 'imageUrl' && 
              currentPage.components[componentIndex].parameters['altText'] === 'Image description') {
            currentPage.components[componentIndex].parameters['altText'] = image.description || image.fileName;
          }
        }
      }
      
      console.log('Image selected from asset browser:', image.fileName);
      this.closeAssetBrowser();
    }
  }

  // Select built-in navigation for editing
  selectBuiltInNavigation(): void {
    this.selectedComponentInstance = {
      id: 'built-in-nav',
      type: 'built-in-navigation',
      parameters: this.builtInNavProperties
    };
    this.showPropertiesPanel = true;
  }

  // Update built-in navigation property
  updateBuiltInNavProperty(propertyName: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    let value: any = target.value;
    
    if (target.type === 'checkbox') {
      value = target.checked;
    } else if (target.type === 'number') {
      value = Number(value);
    }
    
    this.builtInNavProperties[propertyName as keyof typeof this.builtInNavProperties] = value;
  }

  // Open asset browser for built-in navigation
  openAssetBrowserForBuiltInNav(propertyName: string): void {
    this.currentImageAssetProperty = propertyName;
    this.showAssetBrowserDialog = true;
    // Load business images if not already loaded
    if (this.businessImages.length === 0 && !this.isLoadingImages) {
      this.loadBusinessImages();
    }
  }

  // Helper methods for logo sizing
  getLogoSize(size: string): string {
    const sizes = {
      'small': '1.2rem',
      'normal': '1.5rem',
      'large': '1.8rem'
    };
    return sizes[size as keyof typeof sizes] || sizes.normal;
  }

  getAvatarSize(size: string): 'normal' | 'large' | 'xlarge' {
    const sizeMap = {
      'small': 'normal' as const,  // Map small to normal since PrimeNG doesn't have small
      'normal': 'normal' as const,
      'large': 'large' as const
    };
    return sizeMap[size as keyof typeof sizeMap] || 'normal';
  }

  getImageLogoSize(size: string): string {
    const sizes = {
      'small': '28px',
      'normal': '36px',
      'large': '44px'
    };
    return sizes[size as keyof typeof sizes] || sizes.normal;
  }

  onBuiltInNavPropertiesChange(properties: { [key: string]: any }): void {
    this.builtInNavProperties = { ...properties };
  }

  // ===================== WORKSPACE SAVE/LOAD METHODS =====================

  /**
   * Export current website data as JSON object
   */
  private exportWebsiteDataAsJson(): any {
    return {
      id: this.currentProject?.id || this.generateUniqueId(),
      name: this.currentProject?.name || "New Website",
      builtInNavigation: this.builtInNavProperties,
      pages: this.pages.map(page => ({
        id: page.id,
        name: page.name,
        route: page.route,
        components: page.components.map((comp: any) => ({
          id: comp.id,
          type: comp.type,
          x: comp.x,
          y: comp.y,
          width: comp.width,
          height: comp.height,
          zIndex: comp.zIndex,
          parameters: comp.parameters
        }))
      }))
    };
  }

  /**
   * Load website data from JSON string
   */
  private loadWebsiteDataFromJson(jsonString: string): void {
    try {
      if (!jsonString) {
        console.log('No JSON data to load');
        return;
      }

      const websiteData = JSON.parse(jsonString);
      console.log('Loading website data:', websiteData);

      // Load built-in navigation properties
      if (websiteData.builtInNavigation) {
        this.builtInNavProperties = { ...websiteData.builtInNavigation };
      }

      // Load pages and components
      if (websiteData.pages && Array.isArray(websiteData.pages)) {
        // Update the website builder with loaded data
        this.pages = websiteData.pages.map((page: any) => ({
          id: page.id,
          name: page.name,
          route: page.route,
          components: page.components.map((comp: any) => ({
            id: comp.id,
            type: comp.type,
            x: comp.x || 0,
            y: comp.y || 0,
            width: comp.width || 300,
            height: comp.height || 100,
            zIndex: comp.zIndex || 1,
            parameters: comp.parameters || {}
          })),
          isDeletable: page.id !== 'home',
          isActive: page.id === this.currentPageId
        }));

        // Update the current page components
        const currentPage = this.pages.find(p => p.id === this.currentPageId);
        if (currentPage) {
          this.pageComponents = currentPage.components;
        }
      }

      console.log('Website data loaded successfully');
    } catch (error) {
      console.error('Error loading website data:', error);
      alert('Error loading website data. Using default configuration.');
    }
  }

  /**
   * Save a new workspace to the API
   */
  private async saveNewWorkspace(): Promise<void> {
    if (!this.currentProject) return;

    try {
      const workspaceDto: CreateWorkspaceDto = {
        userId: this.currentProject.userId,
        businessId: this.currentProject.businessId,
        name: this.currentProject.name,
        description: this.currentProject.description,
        websiteJson: this.currentProject.websiteJson
      };

      this.websiteBuilder.createWorkspace(workspaceDto).subscribe({
        next: (response) => {
          this.currentProject!.id = response.workspaceId;
          this.currentProject!.isNew = false;
          console.log('New workspace saved with ID:', response.workspaceId);
          alert('Website project saved successfully!');
        },
        error: (error) => {
          console.error('Error saving workspace:', error);
          alert('Error saving website project. Please try again.');
        }
      });
    } catch (error) {
      console.error('Error saving new workspace:', error);
      alert('Error saving website project. Please try again.');
    }
  }

  /**
   * Update an existing workspace in the API
   */
  private async updateExistingWorkspace(): Promise<void> {
    if (!this.currentProject) return;

    try {
      const workspaceId = this.currentProject.id;
      const updates: UpdateWorkspaceDto = {
        name: this.currentProject.name,
        description: this.currentProject.description,
        websiteJson: this.currentProject.websiteJson
      };

      this.websiteBuilder.updateWorkspace(workspaceId, updates).subscribe({
        next: (response) => {
          this.currentProject!.lastModified = new Date();
          console.log('Workspace updated:', response);
          alert('Website project updated successfully!');
        },
        error: (error) => {
          console.error('Error updating workspace:', error);
          alert('Error updating website project. Please try again.');
        }
      });
    } catch (error) {
      console.error('Error updating workspace:', error);
      alert('Error updating website project. Please try again.');
    }
  }

} 