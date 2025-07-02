import { Component, OnInit, ViewChild, ElementRef, effect } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebsiteBuilderService, ComponentDefinition, ComponentParameter, ComponentInstance, BusinessImage, BusinessImagesResponse } from '../services/website-builder';
import { WorkspaceProject } from './workspace-selection.component';
import { CreateWorkspaceDto, UpdateWorkspaceDto, ComponentType } from '../models/workspace.models';

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
  
  // API Component Types
  apiComponentTypes: ComponentType[] = [];
  isLoadingApiComponents = false;
  apiComponentsLoadError: string | null = null;
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

  // Assets Management (moved to left sidebar)
  activeTab: 'components' | 'assets' = 'components';
  isSaving = false;
  
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
    
    // Subscribe to API component types changes (but don't load yet)
    this.subscribeToApiComponentTypes();
  }

  // API Component Types Methods
  private loadApiComponentTypes(): void {
    console.log('🚀 loadApiComponentTypes method called');
    console.log('🚀 Initial state:', {
      isLoadingApiComponents: this.isLoadingApiComponents,
      apiComponentsLoadError: this.apiComponentsLoadError,
      apiComponentTypesLength: this.apiComponentTypes.length
    });
    
    this.isLoadingApiComponents = true;
    this.apiComponentsLoadError = null;
    
    console.log('🚀 Loading API component types...');
    console.log('🚀 Current project:', this.currentProject);
    console.log('🚀 Business ID:', this.currentProject?.businessId);
    
    this.websiteBuilder.getApiComponentTypesForBusinessWorkspace().subscribe({
      next: (componentTypes: ComponentType[]) => {
        this.apiComponentTypes = componentTypes;
        this.isLoadingApiComponents = false;
        console.log('✅ API Component types loaded successfully:', componentTypes.length, 'components');
        console.log('Available categories:', this.websiteBuilder.getApiComponentCategories());
        console.log('Component types:', componentTypes.map(c => ({ id: c.id, name: c.name, category: c.category })));
        
        // Register API components with the website builder service for drag/drop
        this.registerApiComponentsWithBuilder(componentTypes);
        
        // Update component categories with newly loaded API components
        this.updateComponentCategories();
      },
      error: (error) => {
        this.isLoadingApiComponents = false;
        this.apiComponentsLoadError = 'Failed to load component types from API';
        console.error('❌ Error loading API component types:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          statusText: error.statusText,
          url: error.url
        });
        
        // Reset cache on error to allow retry
        this.websiteBuilder.resetApiComponentTypesCache();
      }
    });
  }

  private subscribeToApiComponentTypes(): void {
    // Subscribe to real-time updates of API component types
    this.websiteBuilder.apiComponentTypes$.subscribe({
      next: (componentTypes: ComponentType[]) => {
        this.apiComponentTypes = componentTypes;
        console.log('API Component types updated:', componentTypes.length, 'components');
        
        // Update component categories when API components change
        this.updateComponentCategories();
      },
      error: (error) => {
        console.error('Error in API component types subscription:', error);
      }
    });
  }

  // Get API component types by category
  getApiComponentsByCategory(category: string): ComponentType[] {
    if (category === 'All') {
      return this.apiComponentTypes;
    }
    return this.websiteBuilder.getCachedApiComponentTypesByCategory(category);
  }

  // Check if API components are available
  hasApiComponents(): boolean {
    return this.apiComponentTypes.length > 0;
  }

  // Get combined categories from both local and API components
  getAllAvailableCategories(): string[] {
    const localCategories = this.websiteBuilder.getComponentCategories().map(cat => cat.name);
    const apiCategories = this.websiteBuilder.getApiComponentCategories();
    const allCategories = [...new Set([...localCategories, ...apiCategories])];
    return ['All', ...allCategories];
  }

  // Refresh API component types
  refreshApiComponentTypes(): void {
    console.log('🔄 Refreshing API component types...');
    this.isLoadingApiComponents = true;
    this.apiComponentsLoadError = null;
    
    // Clear any existing cache first
    this.websiteBuilder.resetApiComponentTypesCache();
    
    this.websiteBuilder.refreshApiComponentTypes().subscribe({
      next: (componentTypes: ComponentType[]) => {
        this.apiComponentTypes = componentTypes;
        this.isLoadingApiComponents = false;
        console.log('✅ API Component types refreshed successfully:', componentTypes.length, 'components');
        
        // Update component categories after refresh
        this.updateComponentCategories();
      },
      error: (error) => {
        this.isLoadingApiComponents = false;
        this.apiComponentsLoadError = 'Failed to refresh component types';
        console.error('❌ Error refreshing API component types:', error);
      }
    });
  }

  // Convert API ComponentType to local ComponentDefinition format for consistency
  private convertApiComponentToDefinition(apiComponent: ComponentType): ComponentDefinition {
    const parametersSchema = apiComponent.parametersSchema ? JSON.parse(apiComponent.parametersSchema) : [];
    const defaultParameters = apiComponent.defaultParameters ? JSON.parse(apiComponent.defaultParameters) : {};

    return {
      id: apiComponent.id,
      name: apiComponent.name,
      category: apiComponent.category,
      icon: apiComponent.icon || 'pi pi-box',
      description: apiComponent.description || '',
      parameters: parametersSchema,
      template: `<div class="api-component-${apiComponent.id}"></div>`, // Basic template
      defaultWidth: apiComponent.defaultWidth,
      defaultHeight: apiComponent.defaultHeight
    };
  }

  // Register API components with website builder for drag/drop functionality
  private registerApiComponentsWithBuilder(apiComponents: ComponentType[]): void {
    console.log('📝 Registering', apiComponents.length, 'API components with website builder...');
    
    // Convert API components to ComponentDefinition format and add to available components
    const apiComponentDefinitions = apiComponents.map(apiComp => this.convertApiComponentToDefinition(apiComp));
    
    // Add them to the website builder's component registry
    apiComponentDefinitions.forEach(compDef => {
      this.websiteBuilder.registerComponent(compDef);
    });
    
    console.log('✅ API components registered successfully for drag/drop');
  }

  // Get raw local components by category (without search filtering)
  private getRawLocalComponentsByCategory(category: string): ComponentDefinition[] {
    if (category === 'All') {
      return this.availableComponents;
    }
    return this.availableComponents.filter(comp => 
      comp.category.toLowerCase() === category.toLowerCase()
    );
  }

  // Get combined components (local + API) for display
  getCombinedComponentsByCategory(category: string): ComponentDefinition[] {
    const localComponents = this.getRawLocalComponentsByCategory(category);
    
    if (!this.hasApiComponents()) {
      return localComponents;
    }

    const apiComponents = this.getApiComponentsByCategory(category)
      .map(apiComp => this.convertApiComponentToDefinition(apiComp));
    
    // Combine and deduplicate by ID
    const combinedComponents = [...localComponents, ...apiComponents];
    const uniqueComponents = combinedComponents.filter((component, index, self) => 
      index === self.findIndex(c => c.id === component.id)
    );

    return uniqueComponents;
  }

  // Debug method to get API component status
  getApiComponentStatus(): string {
    if (this.isLoadingApiComponents) {
      return 'Loading API components...';
    }
    if (this.apiComponentsLoadError) {
      return `Error: ${this.apiComponentsLoadError}`;
    }
    if (this.apiComponentTypes.length === 0) {
      return 'No API components loaded';
    }
    return `${this.apiComponentTypes.length} API components loaded`;
  }

  // Check if a component is from API
  isApiComponent(componentId: string): boolean {
    return this.apiComponentTypes.some(comp => comp.id === componentId);
  }

  // Get API component type by ID
  getApiComponentType(componentId: string): ComponentType | undefined {
    return this.apiComponentTypes.find(comp => comp.id === componentId);
  }

  // Get API component type parameters by parsing the parametersSchema
  getApiComponentTypeParameters(componentId: string): ComponentParameter[] {
    const apiComponent = this.getApiComponentType(componentId);
    if (!apiComponent || !apiComponent.parametersSchema) {
      return [];
    }
    
    try {
      return JSON.parse(apiComponent.parametersSchema);
    } catch (error) {
      console.error('Error parsing parametersSchema for component:', componentId, error);
      return [];
    }
  }

  // Universal helper method to get parameter values with multiple naming conventions
  getParameterValue(instance: any, parameterName: string): any {
    if (!instance || !instance.parameters) {
      return null;
    }
    
    // Direct parameter name
    if (instance.parameters[parameterName] !== undefined) {
      return instance.parameters[parameterName];
    }
    
    // Try common variations
    const variations = [
      parameterName.toLowerCase(),
      parameterName.charAt(0).toLowerCase() + parameterName.slice(1), // camelCase
      parameterName.replace(/([A-Z])/g, '_$1').toLowerCase(), // snake_case
      parameterName.replace(/([A-Z])/g, ' $1').trim(), // Space separated
      parameterName.replace(/([a-z])([A-Z])/g, '$1 $2'), // Add spaces before caps
    ];
    
    for (const variation of variations) {
      if (instance.parameters[variation] !== undefined) {
        return instance.parameters[variation];
      }
    }
    
    return null;
  }

  // Check if a component has a specific parameter
  hasParameter(instance: any, parameterName: string): boolean {
    return this.getParameterValue(instance, parameterName) !== null;
  }

  // UNIVERSAL SCALABLE COMPONENT RENDERING METHODS
  // These methods work for ANY component by analyzing parameter characteristics

  // Detect if parameter should render as a text input field
  isTextInputParameter(param: ComponentParameter): boolean {
    const inputKeywords = ['input', 'field', 'placeholder', 'search', 'email', 'password', 'url'];
    return param.type === 'text' && inputKeywords.some(keyword => 
      param.name.toLowerCase().includes(keyword) || param.label.toLowerCase().includes(keyword)
    );
  }

  // Detect if parameter should render as a button
  isButtonParameter(param: ComponentParameter): boolean {
    const buttonKeywords = ['button', 'btn', 'action', 'submit', 'cta', 'call to action'];
    return buttonKeywords.some(keyword => 
      param.name.toLowerCase().includes(keyword) || param.label.toLowerCase().includes(keyword)
    );
  }

  // Detect if parameter should render as an image
  isImageParameter(param: ComponentParameter): boolean {
    const imageKeywords = ['image', 'img', 'photo', 'picture', 'avatar', 'logo', 'icon'];
    return param.type === 'image-asset' || 
           imageKeywords.some(keyword => param.name.toLowerCase().includes(keyword)) ||
           (param.type === 'text' && this.getParameterValue({ type: '', parameters: { [param.name]: 'test' } }, param.name)?.toString().includes('http') && 
            this.getParameterValue({ type: '', parameters: { [param.name]: 'test' } }, param.name)?.toString().match(/\.(jpg|jpeg|png|gif|svg|webp)/i));
  }

  // Detect if parameter should render as a rating display
  isRatingParameter(param: ComponentParameter): boolean {
    const ratingKeywords = ['rating', 'rate', 'star', 'score', 'review'];
    return (param.type === 'number' || param.type === 'select') && 
           ratingKeywords.some(keyword => 
             param.name.toLowerCase().includes(keyword) || param.label.toLowerCase().includes(keyword)
           );
  }

  // Detect if parameter should render as a progress bar
  isProgressParameter(param: ComponentParameter): boolean {
    const progressKeywords = ['progress', 'percent', 'completion', 'value', 'level'];
    return param.type === 'number' && 
           progressKeywords.some(keyword => 
             param.name.toLowerCase().includes(keyword) || param.label.toLowerCase().includes(keyword)
           ) &&
           !this.isRatingParameter(param); // Don't treat ratings as progress
  }

  // Detect if parameter should render as text content
  isTextContentParameter(param: ComponentParameter): boolean {
    return param.type === 'text' && 
           !this.isTextInputParameter(param) && 
           !this.isButtonParameter(param) && 
           !this.isImageParameter(param);
  }

  // Detect if parameter should render as large text (titles, quotes)
  isLargeTextParameter(param: ComponentParameter): boolean {
    const largeTextKeywords = ['title', 'quote', 'heading', 'headline', 'name', 'header'];
    return this.isTextContentParameter(param) && 
           largeTextKeywords.some(keyword => 
             param.name.toLowerCase().includes(keyword) || param.label.toLowerCase().includes(keyword)
           );
  }

  // Detect if parameter should render as medium text (subtitles, author names)
  isMediumTextParameter(param: ComponentParameter): boolean {
    const mediumTextKeywords = ['subtitle', 'author', 'by', 'from', 'subheading', 'caption'];
    return this.isTextContentParameter(param) && 
           !this.isLargeTextParameter(param) &&
           mediumTextKeywords.some(keyword => 
             param.name.toLowerCase().includes(keyword) || param.label.toLowerCase().includes(keyword)
           );
  }

  // Detect if parameter should render as regular text (descriptions, content)
  isRegularTextParameter(param: ComponentParameter): boolean {
    return this.isTextContentParameter(param) && 
           !this.isLargeTextParameter(param) && 
           !this.isMediumTextParameter(param);
  }

  // Detect if parameter should render as a color display
  isColorParameter(param: ComponentParameter): boolean {
    return param.type === 'color' || 
           param.name.toLowerCase().includes('color') || 
           param.label.toLowerCase().includes('color');
  }

  // Get appropriate input type for text input parameters
  getInputTypeFromParameter(param: ComponentParameter): string {
    const name = param.name.toLowerCase();
    const label = param.label.toLowerCase();
    
    if (name.includes('email') || label.includes('email')) return 'email';
    if (name.includes('password') || label.includes('password')) return 'password';
    if (name.includes('url') || label.includes('url')) return 'url';
    if (name.includes('tel') || name.includes('phone') || label.includes('phone')) return 'tel';
    if (name.includes('number') || param.type === 'number') return 'number';
    
    return 'text';
  }

  // Generate star display for ratings
  generateStars(rating: number): string {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const emptyStars = 5 - Math.ceil(rating);
    
    let stars = '';
    
    // Full stars
    for (let i = 0; i < fullStars; i++) {
      stars += '★';
    }
    
    // Half star
    if (hasHalfStar) {
      stars += '☆';
    }
    
    // Empty stars
    for (let i = 0; i < emptyStars; i++) {
      stars += '☆';
    }
    
    return stars;
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
    this.invalidateComponentsCache(); // Force refresh for new page
  }

  onNavigationClick(event: MouseEvent, pageId: string): void {
    // Prevent the component from being selected when clicking navigation
    event.stopPropagation();
    this.websiteBuilder.setCurrentPage(pageId);
    this.invalidateComponentsCache(); // Force refresh for new page
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
        
        // Invalidate cache to force refresh
        this.invalidateComponentsCache();
        
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

    if (this.isSaving) {
      return; // Prevent multiple save requests
    }

    this.isSaving = true;
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
    // Use combined components (local + API)
    let filtered = this.getCombinedComponentsByCategory(category);
    
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

  private _currentPageComponents: ComponentInstance[] = [];
  private _lastPageId: string = '';

  get currentPageComponents() {
    const currentPage = this.websiteBuilder.getCurrentPage();
    const currentPageId = currentPage?.id || '';
    
    // Only update the cached array if the page has changed or components have changed
    if (currentPageId !== this._lastPageId || !currentPage) {
      this._lastPageId = currentPageId;
      this._currentPageComponents = currentPage ? [...currentPage.components] : [];
    }
    
    return this._currentPageComponents;
  }

  private invalidateComponentsCache() {
    this._lastPageId = ''; // Force refresh on next getter call
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
        
        // Invalidate cache to force refresh
        this.invalidateComponentsCache();
        
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
    // Get all available categories from both local and API components
    const allCategories = this.getAllAvailableCategories();
    
    // Calculate counts for each category
    this.componentCategories = allCategories.map(categoryName => {
      if (categoryName === 'All') {
        const localCount = this.availableComponents.length;
        const apiCount = this.apiComponentTypes.length;
        return { name: categoryName, count: localCount + apiCount };
      } else {
        const localCount = this.availableComponents.filter(c => 
          c.category.toLowerCase() === categoryName.toLowerCase()
        ).length;
        const apiCount = this.getApiComponentsByCategory(categoryName).length;
        return { name: categoryName, count: localCount + apiCount };
      }
    });
    
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
    console.log('🔥 onWorkspaceProjectSelected called with project:', project);
    console.log('🔥 Current state before selection:', {
      showWorkspaceSelection: this.showWorkspaceSelection,
      currentProject: this.currentProject,
      isLoadingApiComponents: this.isLoadingApiComponents,
      apiComponentTypesLength: this.apiComponentTypes.length
    });
    
    this.currentProject = project;
    this.showWorkspaceSelection = false;
    
    // Now that we have a project with business context, load API components
    console.log('🔥 About to load API components for business:', project.businessId);
    this.loadApiComponentTypes();
    
    // Initialize the website builder with this project
    this.websiteBuilder.createNewProject(project.name, project.description);
    this.initializeWebsiteBuilder();
    
    // Load existing website data if available
    if (project.websiteJson) {
      try {
        // Use the service method to properly load workspace data
        this.websiteBuilder.loadWorkspaceData(project.websiteJson);
        
        // Also load built-in navigation properties locally
        const websiteData = JSON.parse(project.websiteJson);
        if (websiteData.builtInNavigation) {
          this.builtInNavProperties = { ...websiteData.builtInNavigation };
        }
      } catch (error) {
        console.error('Error loading workspace data:', error);
        alert('Error loading workspace data. Starting with a blank workspace.');
      }
    }
    
    console.log('🔥 onWorkspaceProjectSelected completed');
  }

  onWorkspaceProjectCreated(project: WorkspaceProject): void {
    console.log('New project created:', project);
    this.currentProject = project;
    this.showWorkspaceSelection = false;
    
    // Now that we have a project with business context, load API components
    console.log('Loading API components for business:', project.businessId);
    this.loadApiComponentTypes();
    
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

    // Ensure API components are loaded (safeguard in case project selection didn't trigger it)
    this.ensureApiComponentsLoaded();

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

  // Safeguard method to ensure API components are loaded
  private ensureApiComponentsLoaded(): void {
    if (!this.isLoadingApiComponents && this.apiComponentTypes.length === 0 && !this.apiComponentsLoadError) {
      console.log('🔒 Safeguard: API components not loaded, triggering load...');
      this.loadApiComponentTypes();
    } else {
      console.log('API components status:', {
        isLoading: this.isLoadingApiComponents,
        hasComponents: this.apiComponentTypes.length > 0,
        hasError: !!this.apiComponentsLoadError
      });
    }
  }

  // Assets Management Methods
  onTabChange(tab: 'components' | 'assets'): void {
    this.activeTab = tab;
    // Asset loading is now handled by left sidebar component
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
    // Asset browser functionality has been moved to the left sidebar component
    // For now, this is a placeholder - the left sidebar would need to be expanded to handle this
    console.log('Asset browser for built-in nav should be handled by left sidebar');
  }

  // Placeholder for opening asset browser from properties panel
  openAssetBrowser(propertyName: string): void {
    // Asset browser functionality has been moved to the left sidebar component
    // This would need to be handled by the left sidebar component
    console.log('Asset browser should be handled by left sidebar for property:', propertyName);
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
    switch (size) {
      case 'small': return '32px';
      case 'large': return '56px';
      default: return '44px'; // normal
    }
  }

  // Helper methods for button component
  getButtonPadding(size: string): string {
    switch (size) {
      case 'small': return '6px 12px';
      case 'large': return '12px 24px';
      default: return '8px 16px'; // medium
    }
  }

  getButtonFontSize(size: string): string {
    switch (size) {
      case 'small': return '12px';
      case 'large': return '16px';
      default: return '14px'; // medium
    }
  }

  onBuiltInNavPropertiesChange(properties: { [key: string]: any }): void {
    this.builtInNavProperties = { ...properties };
  }

  onComponentInstanceUpdated(updatedInstance: any): void {
    // Update in the service/page data
    const currentPage = this.websiteBuilder.getCurrentPage();
    if (currentPage) {
      const componentIndex = currentPage.components.findIndex(c => c.id === updatedInstance.id);
      if (componentIndex !== -1) {
        currentPage.components[componentIndex] = { ...updatedInstance };
        this.invalidateComponentsCache();
      }
    }
    console.log('Component instance updated from left sidebar:', updatedInstance);
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
          this.isSaving = false;
        },
        error: (error) => {
          console.error('Error saving workspace:', error);
          alert('Error saving website project. Please try again.');
          this.isSaving = false;
        }
      });
    } catch (error) {
      console.error('Error saving new workspace:', error);
      alert('Error saving website project. Please try again.');
      this.isSaving = false;
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
          this.isSaving = false;
        },
        error: (error) => {
          console.error('Error updating workspace:', error);
          alert('Error updating workspace project. Please try again.');
          this.isSaving = false;
        }
      });
    } catch (error) {
      console.error('Error updating workspace:', error);
      alert('Error updating website project. Please try again.');
      this.isSaving = false;
    }
  }

  // Helper methods for alert component
  getAlertBackgroundColor(type: string): string {
    switch (type) {
      case 'success': return '#d4edda';
      case 'warning': return '#fff3cd';
      case 'error': return '#f8d7da';
      case 'danger': return '#f8d7da';
      default: return '#d1ecf1'; // info
    }
  }

  getAlertBorderColor(type: string): string {
    switch (type) {
      case 'success': return '#c3e6cb';
      case 'warning': return '#ffeaa7';
      case 'error': return '#f5c6cb';
      case 'danger': return '#f5c6cb';
      default: return '#bee5eb'; // info
    }
  }

  getAlertTextColor(type: string): string {
    switch (type) {
      case 'success': return '#155724';
      case 'warning': return '#856404';
      case 'error': return '#721c24';
      case 'danger': return '#721c24';
      default: return '#0c5460'; // info
    }
  }

  getAlertIcon(type: string): string {
    switch (type) {
      case 'success': return 'pi pi-check-circle';
      case 'warning': return 'pi pi-exclamation-triangle';
      case 'error': return 'pi pi-times-circle';
      case 'danger': return 'pi pi-times-circle';
      default: return 'pi pi-info-circle'; // info
    }
  }

  // Helper method for order status colors
  getOrderStatusColor(status: string): string {
    switch (status?.toLowerCase()) {
      case 'completed': return '#28a745';
      case 'cancelled': return '#dc3545';
      case 'pending': return '#ffc107';
      case 'upcoming': return '#007bff';
      case 'processing': return '#17a2b8';
      case 'confirmed': return '#6f42c1';
      default: return '#6c757d'; // default gray
    }
  }

  // Helper method for generating rating stars
  getRatingStars(rating: number): string {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '⭐'.repeat(fullStars);
    if (hasHalfStar) {
      stars += '⭐'; // Using full star for simplicity, could use half-star character
    }
    stars += '☆'.repeat(emptyStars);
    
    return stars;
  }

} 