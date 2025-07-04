import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { 
  CreateWorkspaceDto, 
  UpdateWorkspaceDto, 
  WorkspaceResponseDto,
  CreateWorkspaceComponentDto,
  UpdateWorkspaceComponentDto,
  WorkspaceComponentResponseDto,
  ComponentType,
  DeployWorkspaceDto,
  WorkspaceDeployment,
  WorkspaceListResponse,
  ComponentListResponse,
  ComponentTypeListResponse,
  DeploymentListResponse,
  ApiResponse
} from '../models/workspace.models';

// Component Parameter Interface
export interface ComponentParameter {
  name: string;
  type: 'text' | 'number' | 'color' | 'image' | 'image-asset' | 'select' | 'boolean';
  label: string;
  defaultValue: any;
  options?: string[]; // For select type
  required?: boolean;
}

// Component Definition Interface
export interface ComponentDefinition {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  parameters: ComponentParameter[];
  template: string;
  styles?: string;
  defaultWidth?: number;
  defaultHeight?: number;
}

// Component Instance Interface
export interface ComponentInstance {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  parameters: { [key: string]: any };
  zIndex: number;
}

// Layout Interface
export interface WebsiteLayout {
  id: string;
  name: string;
  device: 'desktop' | 'tablet' | 'mobile';
  components: ComponentInstance[];
  width: number;
  height: number;
  background: string;
  createdAt: Date;
  updatedAt: Date;
}

// Website Project Interface
export interface WebsiteProject {
  id: string;
  name: string;
  description: string;
  layouts: { [device: string]: WebsiteLayout };
  currentDevice: 'desktop' | 'tablet' | 'mobile';
  createdAt: Date;
  updatedAt: Date;
}

// Page Interface
export interface WebsitePage {
  id: string;
  name: string;
  route: string;
  components: ComponentInstance[];
  isDeletable: boolean;
  isActive: boolean;
}

// Image Upload Response Interface
export interface ImageUploadResponse {
  success: boolean;
  imageUrl?: string;
  message?: string;
  error?: string;
}

// Business Image Interface
export interface BusinessImage {
  id: number;
  businessId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  uploadedAt: string;
  description: string | null;
  isActive: boolean;
  imageUrl: string;
  imageData: string; // Base64 encoded image data
}

// Business Images Response Interface
export interface BusinessImagesResponse {
  businessId: string;
  totalImages: number;
  images: BusinessImage[];
}

@Injectable({
  providedIn: 'root'
})
export class WebsiteBuilderService {
  // API Configuration
  private readonly apiBaseUrl = 'https://servicefuzzapi-atf8b4dqawc8dsa9.australiaeast-01.azurewebsites.net';

  // Signals for reactive state management
  private _currentProject = signal<WebsiteProject | null>(null);
  private _selectedComponent = signal<ComponentInstance | null>(null);
  private _isDragging = signal<boolean>(false);
  private _dragSource = signal<string>('');

  // Behavior subjects for observables
  private _components = new BehaviorSubject<ComponentInstance[]>([]);
  private _availableComponents = new BehaviorSubject<ComponentDefinition[]>([]);
  private _filteredComponents = new BehaviorSubject<ComponentDefinition[]>([]);
  private _searchTerm = new BehaviorSubject<string>('');
  private _selectedCategory = new BehaviorSubject<string>('All');
  private _pages = new BehaviorSubject<WebsitePage[]>([]);
  private _currentPageId = new BehaviorSubject<string>('home');

  // API Component Types Cache
  private _apiComponentTypes = new BehaviorSubject<ComponentType[]>([]);
  private _apiComponentTypesLoaded = false;

  // Getters
  get currentProject() { return this._currentProject(); }
  get selectedComponent() { return this._selectedComponent(); }
  get isDragging() { return this._isDragging(); }
  get dragSource() { return this._dragSource(); }
  get components$(): Observable<ComponentInstance[]> { return this._components.asObservable(); }
  get availableComponents$(): Observable<ComponentDefinition[]> { return this._availableComponents.asObservable(); }
  get filteredComponents$(): Observable<ComponentDefinition[]> { return this._filteredComponents.asObservable(); }
  get searchTerm$(): Observable<string> { return this._searchTerm.asObservable(); }
  get selectedCategory$(): Observable<string> { return this._selectedCategory.asObservable(); }
  get pages$(): Observable<WebsitePage[]> { return this._pages.asObservable(); }
  get currentPageId$(): Observable<string> { return this._currentPageId.asObservable(); }
  
  // API Component Types getters
  get apiComponentTypes$(): Observable<ComponentType[]> { return this._apiComponentTypes.asObservable(); }
  get apiComponentTypes(): ComponentType[] { return this._apiComponentTypes.value; }

  constructor(private http: HttpClient) {
    this.initializeComponents();
    
    // Initialize filtered components to show all components by default
    this.filterComponents();
    
    // Auto-load API component types for immediate availability
    this.loadAndCacheApiComponentTypes().subscribe({
      next: () => console.log('API Component types loaded and cached'),
      error: (error) => console.warn('Failed to load API component types:', error)
    });
  }

  // Initialize available components - now all components come from API
  private initializeComponents(): void {
    // Start with empty components - all components loaded from API
    this._availableComponents.next([]);
    console.log('🔄 Components will be loaded from API');
  }

  // Project Management
  createNewProject(name: string, description: string = ''): WebsiteProject {
    const project: WebsiteProject = {
      id: this.generateId(),
      name,
      description,
      currentDevice: 'desktop',
      layouts: {
        desktop: this.createDefaultLayout('desktop'),
        tablet: this.createDefaultLayout('tablet'),
        mobile: this.createDefaultLayout('mobile')
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this._currentProject.set(project);
    this.updateComponents();
    return project;
  }

  private createDefaultLayout(device: 'desktop' | 'tablet' | 'mobile'): WebsiteLayout {
    const dimensions = {
      desktop: { width: 1200, height: 800 },
      tablet: { width: 768, height: 1024 },
      mobile: { width: 375, height: 667 }
    };

    return {
      id: this.generateId(),
      name: `${device.charAt(0).toUpperCase() + device.slice(1)} Layout`,
      device,
      components: [],
      width: dimensions[device].width,
      height: dimensions[device].height,
      background: '#ffffff',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  // Component Management
  addComponent(componentType: string, x: number, y: number): ComponentInstance {
    const componentDef = this._availableComponents.value.find(c => c.id === componentType);
    if (!componentDef) {
      throw new Error(`Component type ${componentType} not found`);
    }

    const currentPage = this.getCurrentPage();
    if (!currentPage) {
      throw new Error('No active page');
    }

    const component: ComponentInstance = {
      id: this.generateId(),
      type: componentType,
      x,
      y,
      width: componentDef.defaultWidth || 200,
      height: componentDef.defaultHeight || 100,
      parameters: this.getDefaultParameters(componentDef.parameters),
      zIndex: currentPage.components.length
    };

    // Add component to current page
    currentPage.components.push(component);
    
    // Update the pages array with the modified page
    const currentPages = this._pages.value;
    const updatedPages = currentPages.map(page => 
      page.id === currentPage.id ? currentPage : page
    );
    this._pages.next(updatedPages);
    
    // Update current page components to refresh the canvas
    this.updateCurrentPageComponents();

    return component;
  }

  updateComponent(componentId: string, updates: Partial<ComponentInstance>): void {
    const currentPage = this.getCurrentPage();
    if (!currentPage) return;

    const componentIndex = currentPage.components.findIndex(c => c.id === componentId);
    
    if (componentIndex !== -1) {
      currentPage.components[componentIndex] = { ...currentPage.components[componentIndex], ...updates };
      
      // Update the pages array with the modified page
      const currentPages = this._pages.value;
      const updatedPages = currentPages.map(page => 
        page.id === currentPage.id ? currentPage : page
      );
      this._pages.next(updatedPages);
      
      // Update current page components to refresh the canvas
      this.updateCurrentPageComponents();
    }
  }

  deleteComponent(componentId: string): void {
    const currentPage = this.getCurrentPage();
    if (!currentPage) return;

    // Remove component from current page
    currentPage.components = currentPage.components.filter(c => c.id !== componentId);
    
    // Update the pages array with the modified page
    const currentPages = this._pages.value;
    const updatedPages = currentPages.map(page => 
      page.id === currentPage.id ? currentPage : page
    );
    this._pages.next(updatedPages);
    
    // Update current page components to refresh the canvas
    this.updateCurrentPageComponents();
  }

  selectComponent(componentId: string | null): void {
    const project = this._currentProject();
    if (!project) return;

    const component = componentId 
      ? project.layouts[project.currentDevice].components.find(c => c.id === componentId)
      : null;

    this._selectedComponent.set(component || null);
  }

  // Device Management
  switchDevice(device: 'desktop' | 'tablet' | 'mobile'): void {
    const project = this._currentProject();
    if (!project) return;

    project.currentDevice = device;
    project.updatedAt = new Date();
    this._currentProject.set(project);
    this.updateComponents();
  }

  // Drag and Drop
  startDrag(source: string): void {
    this._isDragging.set(true);
    this._dragSource.set(source);
  }

  stopDrag(): void {
    this._isDragging.set(false);
    this._dragSource.set('');
  }

  // Utility Methods
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private getDefaultParameters(parameters: ComponentParameter[]): { [key: string]: any } {
    const defaults: { [key: string]: any } = {};
    parameters.forEach(param => {
      defaults[param.name] = param.defaultValue;
    });
    return defaults;
  }

  private updateComponents(): void {
    // Use page-based approach if pages are available, otherwise fall back to project layouts
    const pages = this._pages.value;
    if (pages && pages.length > 0) {
      this.updateCurrentPageComponents();
    } else {
    const project = this._currentProject();
    if (project) {
      this._components.next(project.layouts[project.currentDevice].components);
    } else {
      this._components.next([]);
      }
    }
  }

  // Export/Import
  exportProject(): string {
    const project = this._currentProject();
    if (!project) throw new Error('No project to export');
    return JSON.stringify(project, null, 2);
  }

  importProject(jsonData: string): WebsiteProject {
    try {
      const project = JSON.parse(jsonData) as WebsiteProject;
      this._currentProject.set(project);
      this.updateComponents();
      return project;
    } catch (error) {
      throw new Error('Invalid project data');
    }
  }

  /**
   * Load workspace data from JSON string into the page-based structure
   */
  loadWorkspaceData(jsonString: string): void {
    try {
      if (!jsonString) {
        console.log('No JSON data to load');
        return;
      }

      const websiteData = JSON.parse(jsonString);
      console.log('Loading workspace data into service:', websiteData);

      // Load pages and components
      if (websiteData.pages && Array.isArray(websiteData.pages)) {
        const loadedPages: WebsitePage[] = websiteData.pages.map((page: any) => ({
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
          isActive: page.id === this._currentPageId.value
        }));

        // Update the pages in the service
        this._pages.next(loadedPages);
        
        // Set the current page components based on the current page
        this.updateCurrentPageComponents();
        
        console.log('Workspace data loaded successfully into service');
      }
    } catch (error) {
      console.error('Error loading workspace data into service:', error);
      throw new Error('Failed to load workspace data');
    }
  }

  /**
   * Update the current page components based on the current page ID
   */
  private updateCurrentPageComponents(): void {
    const currentPageId = this._currentPageId.value;
    const currentPage = this._pages.value.find(p => p.id === currentPageId);
    
    if (currentPage) {
      this._components.next(currentPage.components);
      console.log('Updated current page components:', currentPage.components.length);
    } else {
      this._components.next([]);
    }
  }

  // Get component definition
  getComponentDefinition(componentType: string): ComponentDefinition | undefined {
    return this._availableComponents.value.find(c => c.id === componentType);
  }

  // Get all component definitions by category
  getComponentsByCategory(): { [category: string]: ComponentDefinition[] } {
    const components = this._availableComponents.value;
    const categories: { [category: string]: ComponentDefinition[] } = {};
    
    components.forEach(component => {
      if (!categories[component.category]) {
        categories[component.category] = [];
      }
      categories[component.category].push(component);
    });
    
    return categories;
  }

  // Component categories
  getComponentCategories(): { name: string; count: number }[] {
    const components = this._availableComponents.value;
    const categories = [
      { name: 'All', count: components.length },
      { name: 'UI', count: components.filter(c => c.category === 'UI').length },
      { name: 'Data', count: components.filter(c => c.category === 'Data').length }
    ];
    return categories;
  }

  // Search and filter methods
  updateSearchTerm(term: string): void {
    this._searchTerm.next(term);
    this.filterComponents();
  }

  updateSelectedCategory(category: string): void {
    this._selectedCategory.next(category);
    this.filterComponents();
  }

  private filterComponents(): void {
    const allComponents = this._availableComponents.value;
    const searchTerm = this._searchTerm.value.toLowerCase();
    const selectedCategory = this._selectedCategory.value;

    let filtered = allComponents;

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(c => c.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(searchTerm) ||
        c.description.toLowerCase().includes(searchTerm)
      );
    }

    this._filteredComponents.next(filtered);
  }

  // Page management methods
  initializePages(): void {
    const defaultPages: WebsitePage[] = [
      {
        id: 'home',
        name: 'Home',
        route: '/',
        components: [],
        isDeletable: false,
        isActive: true
      },
      {
        id: 'about',
        name: 'About',
        route: '/about',
        components: [],
        isDeletable: false,
        isActive: false
      },
      {
        id: 'shop',
        name: 'Shop',
        route: '/shop',
        components: [],
        isDeletable: false,
        isActive: false
      },
      {
        id: 'checkout',
        name: 'Checkout',
        route: '/checkout',
        components: [],
        isDeletable: false,
        isActive: false
      },
      {
        id: 'past-orders',
        name: 'Past Orders',
        route: '/past-orders',
        components: [],
        isDeletable: false,
        isActive: false
      }
    ];

    this._pages.next(defaultPages);
  }

  // Load existing pages data (used when loading from JSON)
  loadPagesData(pages: WebsitePage[]): void {
    console.log('📥 Loading pages data into website builder service:', pages);
    this._pages.next(pages);
    
    // Set the current page to the first active page or home if none are active
    const activePage = pages.find(p => p.isActive);
    const currentPageId = activePage ? activePage.id : 'home';
    this._currentPageId.next(currentPageId);
    
    console.log('✅ Pages loaded into website builder service, current page:', currentPageId);
  }

  addPage(name: string, route: string): void {
    const currentPages = this._pages.value;
    const newPage: WebsitePage = {
      id: this.generateId(),
      name,
      route: route.startsWith('/') ? route : `/${route}`,
      components: [],
      isDeletable: true,
      isActive: false
    };

    this._pages.next([...currentPages, newPage]);
  }

  deletePage(pageId: string): void {
    const currentPages = this._pages.value;
    const page = currentPages.find(p => p.id === pageId);
    
    if (!page || !page.isDeletable) {
      return; // Cannot delete home page or non-deletable pages
    }

    const updatedPages = currentPages.filter(p => p.id !== pageId);
    this._pages.next(updatedPages);

    // If deleted page was current, switch to home
    if (this._currentPageId.value === pageId) {
      this.setCurrentPage('home');
    }
  }

  updatePageName(pageId: string, newName: string): void {
    const currentPages = this._pages.value;
    const updatedPages = currentPages.map(page => 
      page.id === pageId ? { ...page, name: newName } : page
    );
    this._pages.next(updatedPages);
  }

  updatePageRoute(pageId: string, newRoute: string): void {
    const currentPages = this._pages.value;
    const page = currentPages.find(p => p.id === pageId);
    
    if (!page || page.id === 'home') {
      return; // Cannot change home page route
    }

    const route = newRoute.startsWith('/') ? newRoute : `/${newRoute}`;
    const updatedPages = currentPages.map(page => 
      page.id === pageId ? { ...page, route } : page
    );
    this._pages.next(updatedPages);
  }

  setCurrentPage(pageId: string): void {
    this._currentPageId.next(pageId);
    
    // Update page active states
    const currentPages = this._pages.value;
    const updatedPages = currentPages.map(page => ({
      ...page,
      isActive: page.id === pageId
    }));
    this._pages.next(updatedPages);
    
    // Update current page components
    this.updateCurrentPageComponents();
  }

  getCurrentPage(): WebsitePage | undefined {
    const currentPageId = this._currentPageId.value;
    return this._pages.value.find(p => p.id === currentPageId);
  }

  // Navigation menu generation for Top Navigation component
  getNavigationMenuItems(): { name: string; route: string; isActive: boolean }[] {
    return this._pages.value.map(page => ({
      name: page.name,
      route: page.route,
      isActive: page.isActive
    }));
  }

  // Image upload method for business websites
  uploadBusinessImage(businessId: string, file: File, description: string = ''): Observable<ImageUploadResponse> {
    // Create FormData object for multipart/form-data request
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('description', description);

    // Construct the API endpoint URL
    const uploadUrl = `${this.apiBaseUrl}/api/BusinessWebsite/images/upload/${businessId}`;

    // Set headers - Content-Type will be automatically set by the browser for FormData
    const headers = new HttpHeaders({
      'accept': '*/*'
    });

    // Make the POST request
    return this.http.post<ImageUploadResponse>(uploadUrl, formData, { headers });
  }

  // Fetch business images
  getBusinessImages(businessId: string, activeOnly: boolean = true): Observable<BusinessImagesResponse> {
    // Construct the API endpoint URL
    const fetchUrl = `${this.apiBaseUrl}/api/BusinessWebsite/images/business/${businessId}`;
    
    // Set query parameters using Angular's HttpParams
    let params = new HttpParams();
    if (activeOnly) {
      params = params.set('activeOnly', 'true');
    }

    // Set headers
    const headers = new HttpHeaders({
      'accept': '*/*'
    });

    // Make the GET request
    return this.http.get<BusinessImagesResponse>(fetchUrl, { headers, params });
  }

  // Convert base64 image data to data URL for display
  convertImageDataToDataUrl(imageData: string, contentType: string): string {
    return `data:${contentType};base64,${imageData}`;
  }

  // Helper method to get displayable image URL from BusinessImage
  getDisplayableImageUrl(image: BusinessImage): string {
    return this.convertImageDataToDataUrl(image.imageData, image.contentType);
  }

  // Format file size for display
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Format upload date for display
  formatUploadDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }

  // ===================== WORKSPACE METHODS =====================

  /**
   * Creates a new workspace
   */
  createWorkspace(workspace: CreateWorkspaceDto): Observable<{ workspaceId: string; message: string }> {
    return this.http.post<{ workspaceId: string; message: string }>(
      `${this.apiBaseUrl}/api/businesswebsite/workspaces`, 
      workspace
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Gets a workspace by ID
   */
  getWorkspace(workspaceId: string): Observable<WorkspaceResponseDto> {
    return this.http.get<WorkspaceResponseDto>(
      `${this.apiBaseUrl}/api/businesswebsite/workspaces/${workspaceId}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Gets all workspaces for a specific user
   */
  getWorkspacesByUser(userId: string): Observable<WorkspaceListResponse> {
    return this.http.get<WorkspaceListResponse>(
      `${this.apiBaseUrl}/api/businesswebsite/workspaces/user/${userId}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Gets all workspaces for a specific business
   */
  getWorkspacesByBusiness(businessId: string): Observable<WorkspaceListResponse> {
    return this.http.get<WorkspaceListResponse>(
      `${this.apiBaseUrl}/api/businesswebsite/workspaces/business/${businessId}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Updates an existing workspace
   */
  updateWorkspace(workspaceId: string, updates: UpdateWorkspaceDto): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.apiBaseUrl}/api/businesswebsite/workspaces/${workspaceId}`, 
      updates
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Deletes a workspace
   */
  deleteWorkspace(workspaceId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiBaseUrl}/api/businesswebsite/workspaces/${workspaceId}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Deploys a workspace
   */
  deployWorkspace(workspaceId: string, deployedBy: string): Observable<{ message: string }> {
    const deployDto: DeployWorkspaceDto = { workspaceId, deployedBy };
    return this.http.post<{ message: string }>(
      `${this.apiBaseUrl}/api/businesswebsite/workspaces/${workspaceId}/deploy`, 
      deployDto
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Gets deployment history for a workspace
   */
  getWorkspaceDeployments(workspaceId: string): Observable<DeploymentListResponse> {
    return this.http.get<DeploymentListResponse>(
      `${this.apiBaseUrl}/api/businesswebsite/workspaces/${workspaceId}/deployments`
    ).pipe(
      catchError(this.handleError)
    );
  }

  // ===================== WORKSPACE COMPONENT METHODS =====================

  /**
   * Creates a new workspace component
   */
  createWorkspaceComponent(component: CreateWorkspaceComponentDto): Observable<{ componentId: string; message: string }> {
    return this.http.post<{ componentId: string; message: string }>(
      `${this.apiBaseUrl}/api/businesswebsite/workspaces/components`, 
      component
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Gets a workspace component by ID
   */
  getWorkspaceComponent(componentId: string): Observable<WorkspaceComponentResponseDto> {
    return this.http.get<WorkspaceComponentResponseDto>(
      `${this.apiBaseUrl}/api/businesswebsite/workspaces/components/${componentId}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Gets all components for a workspace
   */
  getWorkspaceComponents(workspaceId: string): Observable<ComponentListResponse> {
    return this.http.get<ComponentListResponse>(
      `${this.apiBaseUrl}/api/businesswebsite/workspaces/${workspaceId}/components`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Gets all components for a specific page within a workspace
   */
  getWorkspaceComponentsByPage(workspaceId: string, pageId: string): Observable<ComponentListResponse> {
    return this.http.get<ComponentListResponse>(
      `${this.apiBaseUrl}/api/businesswebsite/workspaces/${workspaceId}/pages/${pageId}/components`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Updates a workspace component
   */
  updateWorkspaceComponent(componentId: string, updates: UpdateWorkspaceComponentDto): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.apiBaseUrl}/api/businesswebsite/workspaces/components/${componentId}`, 
      updates
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Deletes a workspace component
   */
  deleteWorkspaceComponent(componentId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiBaseUrl}/api/businesswebsite/workspaces/components/${componentId}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  // ===================== COMPONENT TYPE METHODS =====================

  /**
   * Gets all available component types
   */
  getAllComponentTypes(): Observable<ComponentTypeListResponse> {
    return this.http.get<ComponentTypeListResponse>(
      `${this.apiBaseUrl}/api/businesswebsite/component-types`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Gets component types by category
   */
  getComponentTypesByCategory(category: string): Observable<ComponentTypeListResponse> {
    return this.http.get<ComponentTypeListResponse>(
      `${this.apiBaseUrl}/api/businesswebsite/component-types/category/${category}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Gets a specific component type by ID
   */
  getComponentType(componentTypeId: string): Observable<ComponentType> {
    return this.http.get<ComponentType>(
      `${this.apiBaseUrl}/api/businesswebsite/component-types/${componentTypeId}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Gets all component types for business workspaces and caches them
   * This method loads from API and stores in local cache for immediate access
   */
  loadAndCacheApiComponentTypes(): Observable<ComponentType[]> {
    if (this._apiComponentTypesLoaded) {
      // Return cached data if already loaded
      console.log('Returning cached API component types:', this._apiComponentTypes.value.length, 'components');
      return this._apiComponentTypes.asObservable();
    }

    console.log('Making API call to fetch component types...');
    console.log('API URL:', `${this.apiBaseUrl}/api/businesswebsite/component-types`);

    return this.getAllComponentTypes().pipe(
      tap(response => {
        console.log('✅ Raw API response received:', response);
        this._apiComponentTypes.next(response.componentTypes);
        this._apiComponentTypesLoaded = true;
        console.log('✅ API component types cached successfully');
        
        // Register API components as available components for drag and drop
        response.componentTypes.forEach(apiComponent => {
          const componentDefinition = this.convertApiComponentToDefinition(apiComponent);
          this.registerComponent(componentDefinition);
        });
        
        console.log('✅ API components registered for drag and drop');
      }),
      map(response => response.componentTypes),
      catchError(error => {
        console.error('❌ API component types request failed:', error);
        console.error('Request URL:', `${this.apiBaseUrl}/api/businesswebsite/component-types`);
        // Ensure cache flag remains false on error
        this._apiComponentTypesLoaded = false;
        return this.handleError(error);
      })
    );
  }

  /**
   * Forces a refresh of the API component types cache
   */
  refreshApiComponentTypes(): Observable<ComponentType[]> {
    this._apiComponentTypesLoaded = false;
    return this.loadAndCacheApiComponentTypes();
  }

  /**
   * Gets cached API component types synchronously (returns empty array if not loaded)
   * Use loadAndCacheApiComponentTypes() first to ensure data is available
   */
  getCachedApiComponentTypes(): ComponentType[] {
    return this._apiComponentTypes.value;
  }

  /**
   * Gets API component types by category from cache
   */
  getCachedApiComponentTypesByCategory(category: string): ComponentType[] {
    return this._apiComponentTypes.value.filter(component => 
      component.category?.toLowerCase() === category.toLowerCase()
    );
  }

  /**
   * Gets all unique categories from cached API component types
   */
  getApiComponentCategories(): string[] {
    const categories = this._apiComponentTypes.value
      .map(component => component.category)
      .filter(category => !!category) as string[];
    
    return [...new Set(categories)];
  }

  /**
   * Convenience method for components to get API component types
   * Returns cached data immediately if available, otherwise loads from API
   */
  getApiComponentTypesForBusinessWorkspace(): Observable<ComponentType[]> {
    if (this._apiComponentTypesLoaded && this._apiComponentTypes.value.length > 0) {
      return this._apiComponentTypes.asObservable();
    }
    return this.loadAndCacheApiComponentTypes();
  }

  /**
   * Check if API component types are loaded and available
   */
  areApiComponentTypesLoaded(): boolean {
    return this._apiComponentTypesLoaded && this._apiComponentTypes.value.length > 0;
  }

  /**
   * Reset API component types cache (useful for error recovery)
   */
  resetApiComponentTypesCache(): void {
    this._apiComponentTypesLoaded = false;
    this._apiComponentTypes.next([]);
  }

  /**
   * Convert API component type to component definition
   */
  private convertApiComponentToDefinition(apiComponent: ComponentType): ComponentDefinition {
    // Parse parameters from schema if available
    let parameters: ComponentParameter[] = [];
    if (apiComponent.parametersSchema) {
      try {
        const schema = JSON.parse(apiComponent.parametersSchema);
        parameters = schema.parameters || [];
      } catch (error) {
        console.error('Error parsing parameters schema:', error);
      }
    }

    return {
      id: apiComponent.id,
      name: apiComponent.name,
      icon: apiComponent.icon || 'pi pi-box',
      category: apiComponent.category,
      description: apiComponent.description || '',
      parameters: parameters,
      template: '', // API components don't have templates in this context
      styles: '',
      defaultWidth: apiComponent.defaultWidth || 300,
      defaultHeight: apiComponent.defaultHeight || 100
    };
  }

  /**
   * Register a component definition (for API components)
   */
  registerComponent(componentDef: ComponentDefinition): void {
    const currentComponents = this._availableComponents.value;
    
    // Check if component already exists, update if it does, add if new
    const existingIndex = currentComponents.findIndex(comp => comp.id === componentDef.id);
    
    if (existingIndex >= 0) {
      currentComponents[existingIndex] = componentDef;
    } else {
      currentComponents.push(componentDef);
    }
    
    this._availableComponents.next([...currentComponents]);
    
    // Update filtered components to include newly registered component
    this.filterComponents();
    
    console.log('Component registered:', componentDef.id, componentDef.name);
  }

  // ===================== WORKSPACE HELPER METHODS =====================

  /**
   * Saves workspace as JSON
   */
  saveWorkspaceAsJson(workspaceId: string, websiteJson: any): Observable<{ message: string }> {
    const updates: UpdateWorkspaceDto = {
      websiteJson: JSON.stringify(websiteJson)
    };
    return this.updateWorkspace(workspaceId, updates);
  }

  /**
   * Bulk update component positions (useful for drag & drop)
   */
  updateComponentPositions(components: Array<{id: string, x: number, y: number, zIndex?: number}>): Observable<any[]> {
    const updatePromises = components.map(comp => {
      const updates: UpdateWorkspaceComponentDto = {
        xPosition: comp.x,
        yPosition: comp.y,
        zIndex: comp.zIndex
      };
      return this.updateWorkspaceComponent(comp.id, updates);
    });

    return new Observable(observer => {
      Promise.all(updatePromises.map(obs => obs.toPromise()))
        .then(results => {
          observer.next(results);
          observer.complete();
        })
        .catch(error => observer.error(error));
    });
  }

  /**
   * Converts local ComponentInstance to CreateWorkspaceComponentDto
   */
  convertToWorkspaceComponent(workspaceId: string, pageId: string, component: ComponentInstance): CreateWorkspaceComponentDto {
    return {
      workspaceId,
      pageId,
      componentId: component.id,
      componentType: component.type,
      xPosition: component.x,
      yPosition: component.y,
      width: component.width,
      height: component.height,
      zIndex: component.zIndex,
      parameters: JSON.stringify(component.parameters)
    };
  }

  /**
   * Converts WorkspaceComponentResponseDto to local ComponentInstance
   */
  convertFromWorkspaceComponent(workspaceComponent: WorkspaceComponentResponseDto): ComponentInstance {
    return {
      id: workspaceComponent.componentId,
      type: workspaceComponent.componentType,
      x: workspaceComponent.xPosition,
      y: workspaceComponent.yPosition,
      width: workspaceComponent.width,
      height: workspaceComponent.height,
      zIndex: workspaceComponent.zIndex,
      parameters: workspaceComponent.parameters ? JSON.parse(workspaceComponent.parameters) : {}
    };
  }

  /**
   * Sync current page components to workspace
   */
  syncPageComponentsToWorkspace(workspaceId: string, pageId: string): Observable<any> {
    const currentPage = this.getCurrentPage();
    if (!currentPage || currentPage.id !== pageId) {
      throw new Error('Current page does not match provided pageId');
    }

    const componentPromises = currentPage.components.map(component => {
      const workspaceComponent = this.convertToWorkspaceComponent(workspaceId, pageId, component);
      return this.createWorkspaceComponent(workspaceComponent);
    });

    return new Observable(observer => {
      Promise.all(componentPromises.map(obs => obs.toPromise()))
        .then(results => {
          observer.next(results);
          observer.complete();
        })
        .catch(error => observer.error(error));
    });
  }

  /**
   * Load page components from workspace
   */
  loadPageComponentsFromWorkspace(workspaceId: string, pageId: string): Observable<ComponentInstance[]> {
    return this.getWorkspaceComponentsByPage(workspaceId, pageId).pipe(
      tap(response => {
        const components = response.components.map(wc => this.convertFromWorkspaceComponent(wc));
        
        // Update the current page with loaded components
        const currentPages = this._pages.value;
        const updatedPages = currentPages.map(page => 
          page.id === pageId ? { ...page, components } : page
        );
        this._pages.next(updatedPages);
        
        // Update components observable if this is the current page
        if (this._currentPageId.value === pageId) {
          this._components.next(components);
        }
      }),
      map(response => response.components.map(wc => this.convertFromWorkspaceComponent(wc))),
      catchError(this.handleError)
    );
  }

  /**
   * Error handling for workspace methods
   */
  private handleError = (error: any): Observable<never> => {
    console.error('Workspace API Error:', error);
    throw error;
  }
}
