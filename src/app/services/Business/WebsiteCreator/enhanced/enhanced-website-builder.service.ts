import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { 
  ComponentType, 
  WorkspaceComponentResponseDto, 
  CreateWorkspaceComponentDto, 
  UpdateWorkspaceComponentDto,
  EnhancedWebsitePage,
  WorkspaceResponseDto,
  ComponentTypeListResponse,
  ComponentListResponse
} from '../../../../models/workspace.models';
import { DataSvrService } from '../../../Other/data-svr.service';
import { ComponentRenderer } from '../rendering/component-renderer.service';

export interface ComponentPosition {
  xPosition: number;
  yPosition: number;
  width: number;
  height: number;
  zIndex: number;
}

export interface CreateComponentRequest {
  workspaceId: string;
  pageId: string;
  componentId: string;
  componentType: string;
  xPosition?: number;
  yPosition?: number;
  width?: number;
  height?: number;
  zIndex?: number;
  parameters?: string;
}

export interface ParameterSchema {
  type: 'object';
  properties: {
    [parameterName: string]: {
      type: 'string' | 'number' | 'boolean' | 'array' | 'object';
      description?: string;
      default?: any;
      enum?: any[];
      format?: string;
      minimum?: number;
      maximum?: number;
      items?: any;
    };
  };
  required?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class EnhancedWebsiteBuilderService {
  private readonly apiBaseUrl = 'https://servicefuzzapi-atf8b4dqawc8dsa9.australiaeast-01.azurewebsites.net';

  // State management
  private _currentWorkspaceId = new BehaviorSubject<string | null>(null);
  private _currentPageId = new BehaviorSubject<string | null>(null);
  private _availableComponentTypes = new BehaviorSubject<ComponentType[]>([]);
  private _currentPageComponents = new BehaviorSubject<WorkspaceComponentResponseDto[]>([]);
  private _workspacePages = new BehaviorSubject<EnhancedWebsitePage[]>([]);

  // Public observables
  public currentWorkspaceId$ = this._currentWorkspaceId.asObservable();
  public currentPageId$ = this._currentPageId.asObservable();
  public availableComponentTypes$ = this._availableComponentTypes.asObservable();
  public currentPageComponents$ = this._currentPageComponents.asObservable();
  public workspacePages$ = this._workspacePages.asObservable();

  constructor(
    private http: HttpClient,
    private dataSvr: DataSvrService,
    private componentRenderer: ComponentRenderer
  ) {}

  // ===================== INITIALIZATION =====================

  /**
   * Initialize website builder for a workspace
   */
  async initializeBuilder(workspaceId: string): Promise<void> {
    try {
      this._currentWorkspaceId.next(workspaceId);

      // Load workspace details
      const workspace = await this.getWorkspace(workspaceId);
      
      // Load all pages
      const pages = await this.getWorkspacePages(workspaceId);
      this._workspacePages.next(pages);
      
      // Load available component types
      const componentTypes = await this.getAvailableComponents();
      this._availableComponentTypes.next(componentTypes);
      
      // Set initial page (homepage or first page)
      const homepage = pages.find(page => page.isHomePage) || pages[0];
      if (homepage) {
        console.log('🏠 Loading initial page:', homepage.id, 'from pages:', pages.map(p => ({id: p.id, name: p.pageName})));
        await this.loadPage(workspaceId, homepage.id);
      } else {
        console.log('⚠️ No pages found in workspace:', workspaceId);
      }

      console.log('✅ Website builder initialized for workspace:', workspaceId);
    } catch (error) {
      console.error('❌ Error initializing website builder:', error);
      throw error;
    }
  }

  // ===================== WORKSPACE MANAGEMENT =====================

  /**
   * Get workspace details
   */
  async getWorkspace(workspaceId: string): Promise<WorkspaceResponseDto> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    try {
      const response = await this.http.get<WorkspaceResponseDto>(
        `${this.apiBaseUrl}/api/BusinessWebsite/workspaces/${workspaceId}`,
        {
          headers: {
            'Authorization': `Bearer ${jwtToken}`
          }
        }
      ).toPromise();

      return response!;
    } catch (error) {
      console.error('Error fetching workspace:', error);
      throw error;
    }
  }

  // ===================== PAGE MANAGEMENT =====================

  /**
   * Get all pages in workspace
   */
  async getWorkspacePages(workspaceId: string): Promise<EnhancedWebsitePage[]> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      console.error('❌ No JWT token available for workspace pages API call');
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    const apiUrl = `${this.apiBaseUrl}/api/BusinessWebsite/workspaces/${workspaceId}/pages`;
    console.log('🌐 Making API call to get workspace pages:', apiUrl);

    try {
      const response = await this.http.get<{pages: EnhancedWebsitePage[]}>(
        apiUrl,
        {
          headers: {
            'Authorization': `Bearer ${jwtToken}`
          }
        }
      ).toPromise();

      console.log('📡 API response for workspace pages:', response);
      const pages = response?.pages || [];
      console.log('📄 Extracted pages:', pages.length, 'pages found');
      console.log('📄 Page details:', pages.map(p => ({ id: p.id, name: p.pageName, route: p.route, isHomePage: p.isHomePage })));
      
      return pages;
    } catch (error) {
      console.error('❌ Error fetching workspace pages:', error);
      console.error('❌ API URL was:', apiUrl);
      console.error('❌ Workspace ID:', workspaceId);
      return [];
    }
  }

  /**
   * Load and display a specific page
   */
  async loadPage(workspaceId: string, pageId: string): Promise<void> {
    try {
      console.log('🔄 Loading page:', pageId, 'in workspace:', workspaceId);
      this._currentPageId.next(pageId);

      // Clear existing content
      this.componentRenderer.clearPageContainer();

      // Load page details
      const page = await this.getPageDetails(workspaceId, pageId);
      console.log('📄 Page details loaded:', page);

      // Apply page-specific CSS/JS
      if (page.customCSS) {
        this.injectPageCSS(page.customCSS, pageId);
      }
      if (page.customJS) {
        this.injectPageJS(page.customJS, pageId);
      }

      // Load and render components
      await this.componentRenderer.loadPageComponents(workspaceId, pageId);

      // Update current page components
      const components = await this.getPageComponents(workspaceId, pageId);
      console.log('🧩 Page components loaded:', components.length, 'components');
      this._currentPageComponents.next(components);

      console.log('✅ Page loaded:', pageId);
    } catch (error) {
      console.error('❌ Error loading page:', error);
      throw error;
    }
  }

  /**
   * Get page details
   */
  async getPageDetails(workspaceId: string, pageId: string): Promise<EnhancedWebsitePage> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    try {
      const response = await this.http.get<EnhancedWebsitePage>(
        `${this.apiBaseUrl}/api/BusinessWebsite/workspaces/${workspaceId}/pages/${pageId}`,
        {
          headers: {
            'Authorization': `Bearer ${jwtToken}`
          }
        }
      ).toPromise();

      return response!;
    } catch (error) {
      console.error('Error fetching page details:', error);
      throw error;
    }
  }

  // ===================== COMPONENT TYPE MANAGEMENT =====================

  /**
   * Get all available component types
   */
  async getAvailableComponents(): Promise<ComponentType[]> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    try {
      const response = await this.http.get<ComponentTypeListResponse>(
        `${this.apiBaseUrl}/api/BusinessWebsite/component-types`,
        {
          headers: {
            'Authorization': `Bearer ${jwtToken}`
          }
        }
      ).toPromise();

      return response?.componentTypes || [];
    } catch (error) {
      console.error('Error fetching available components:', error);
      return [];
    }
  }

  /**
   * Get components by category
   */
  async getComponentsByCategory(category: string): Promise<ComponentType[]> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    try {
      const response = await this.http.get<ComponentTypeListResponse>(
        `${this.apiBaseUrl}/api/BusinessWebsite/component-types/category/${category}`,
        {
          headers: {
            'Authorization': `Bearer ${jwtToken}`
          }
        }
      ).toPromise();

      return response?.componentTypes || [];
    } catch (error) {
      console.error('Error fetching components by category:', error);
      return [];
    }
  }

  /**
   * Get component type details
   */
  async getComponentTypeDetails(componentTypeId: string): Promise<ComponentType | null> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    try {
      const response = await this.http.get<ComponentType>(
        `${this.apiBaseUrl}/api/BusinessWebsite/component-types/${componentTypeId}`,
        {
          headers: {
            'Authorization': `Bearer ${jwtToken}`
          }
        }
      ).toPromise();

      return response || null;
    } catch (error) {
      console.error('Error fetching component type details:', error);
      return null;
    }
  }

  // ===================== COMPONENT INSTANCE MANAGEMENT =====================

  /**
   * Get all components for a specific page (ENHANCED DEBUGGING)
   */
  async getPageComponents(workspaceId: string, pageId: string): Promise<WorkspaceComponentResponseDto[]> {
    console.log(`🚀 [DEBUG] getPageComponents called for page: ${pageId} in workspace: ${workspaceId}`);
    console.log(`🚀 [DEBUG] Timestamp: ${new Date().toISOString()}`);
    
    const jwtToken = this.dataSvr.jwtToken;
    console.log(`🚀 [DEBUG] JWT Token available: ${!!jwtToken}`);
    console.log(`🚀 [DEBUG] JWT Token length: ${jwtToken?.length || 0}`);
    
    if (!jwtToken) {
      console.error('🚀 [DEBUG] No JWT token available for page components API call');
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    const apiUrl = `${this.apiBaseUrl}/api/BusinessWebsite/workspaces/${workspaceId}/pages/${pageId}/components`;
    console.log('🚀 [DEBUG] Making API call to get page components:', apiUrl);
    console.log('🚀 [DEBUG] API Base URL:', this.apiBaseUrl);
    console.log('🚀 [DEBUG] Full request details:', {
      method: 'GET',
      url: apiUrl,
      headers: {
        'Authorization': `Bearer ${jwtToken.substring(0, 20)}...`
      }
    });

    try {
      console.log('🚀 [DEBUG] Sending HTTP GET request...');
      const response = await this.http.get<ComponentListResponse>(
        apiUrl,
        {
          headers: {
            'Authorization': `Bearer ${jwtToken}`
          }
        }
      ).toPromise();

      console.log('🚀 [DEBUG] Raw API response received:', response);
      console.log('🚀 [DEBUG] Response type:', typeof response);
      console.log('🚀 [DEBUG] Response keys:', response ? Object.keys(response) : 'null');
      
      const components = response?.components || [];
      console.log('🚀 [DEBUG] Extracted components array:', components);
      console.log('🚀 [DEBUG] Components count:', components.length);
      
      if (components.length > 0) {
        console.log('🚀 [DEBUG] First component details:', {
          id: components[0].id,
          componentType: components[0].componentType,
          xPosition: components[0].xPosition,
          yPosition: components[0].yPosition,
          parameters: components[0].parameters
        });
      } else {
        console.warn('🚀 [DEBUG] No components found in API response');
        console.log('🚀 [DEBUG] This could mean:');
        console.log('🚀 [DEBUG] 1. The page has no components added yet');
        console.log('🚀 [DEBUG] 2. The API endpoint is incorrect');
        console.log('🚀 [DEBUG] 3. The workspace/page IDs are wrong');
        console.log('🚀 [DEBUG] 4. There\'s an authentication issue');
      }
      
      return components;
    } catch (error) {
      console.error('🚀 [DEBUG] Error fetching page components:', error);
      console.error('🚀 [DEBUG] Error type:', (error as any)?.constructor?.name || 'Unknown');
      console.error('🚀 [DEBUG] Error message:', (error as any)?.message || 'No message');
      console.error('🚀 [DEBUG] Error status:', (error as any)?.status);
      console.error('🚀 [DEBUG] Error statusText:', (error as any)?.statusText);
      console.error('🚀 [DEBUG] Error response body:', (error as any)?.error);
      console.error('🚀 [DEBUG] API URL was:', apiUrl);
      console.error('🚀 [DEBUG] Workspace ID:', workspaceId);
      console.error('🚀 [DEBUG] Page ID:', pageId);
      console.error('🚀 [DEBUG] Timestamp:', new Date().toISOString());
      return [];
    }
  }

  /**
   * Add component to page
   */
  async addComponentToPage(
    workspaceId: string, 
    pageId: string, 
    componentTypeId: string, 
    position: { x: number, y: number }
  ): Promise<string> {
    try {
      // Get component type details
      const componentType = await this.getComponentTypeDetails(componentTypeId);
      if (!componentType) {
        throw new Error(`Component type ${componentTypeId} not found`);
      }

      // Generate unique component ID
      const componentId = `${componentType.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

      // Create component instance
      const createRequest: CreateWorkspaceComponentDto = {
        workspaceId,
        pageId,
        componentId,
        componentType: componentTypeId,
        xPosition: position.x,
        yPosition: position.y,
        width: componentType.defaultWidth,
        height: componentType.defaultHeight,
        zIndex: 1,
        parameters: componentType.defaultParameters
      };

      const instanceId = await this.createComponent(createRequest);

      // Render the new component
      const component: WorkspaceComponentResponseDto = {
        id: instanceId,
        workspaceId,
        pageId,
        componentId,
        componentType: componentTypeId,
        xPosition: position.x,
        yPosition: position.y,
        width: componentType.defaultWidth,
        height: componentType.defaultHeight,
        zIndex: 1,
        parameters: componentType.defaultParameters,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.componentRenderer.renderComponent(component);

      // Update current page components
      const updatedComponents = await this.getPageComponents(workspaceId, pageId);
      this._currentPageComponents.next(updatedComponents);

      console.log('✅ Component added to page:', instanceId);
      return instanceId;
    } catch (error) {
      console.error('❌ Error adding component to page:', error);
      throw error;
    }
  }

  /**
   * Create component instance
   */
  private async createComponent(request: CreateWorkspaceComponentDto): Promise<string> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    try {
      const response = await this.http.post<{componentId: string}>(
        `${this.apiBaseUrl}/api/BusinessWebsite/workspaces/components`,
        request,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
          }
        }
      ).toPromise();

      return response?.componentId || '';
    } catch (error) {
      console.error('Error creating component:', error);
      throw error;
    }
  }

  /**
   * Update component parameters
   */
  async updateComponentParameters(componentId: string, parameters: any): Promise<void> {
    try {
      // Save to backend
      await this.updateComponent(componentId, {
        parameters: JSON.stringify(parameters)
      });

      // Get updated component instance
      const component = await this.getComponentInstance(componentId);
      if (component) {
        // Re-render with new parameters
        await this.componentRenderer.updateComponentRendering(component);
      }

      console.log('✅ Component parameters updated:', componentId);
    } catch (error) {
      console.error('❌ Error updating component parameters:', error);
      throw error;
    }
  }

  /**
   * Update component position
   */
  async updateComponentPosition(componentId: string, position: ComponentPosition): Promise<void> {
    try {
      await this.updateComponent(componentId, position);

      // Update DOM element position
      const wrapper = document.querySelector(`[data-instance-id="${componentId}"]`) as HTMLElement;
      if (wrapper) {
        wrapper.style.left = `${position.xPosition}px`;
        wrapper.style.top = `${position.yPosition}px`;
        wrapper.style.width = `${position.width}px`;
        wrapper.style.height = `${position.height}px`;
        wrapper.style.zIndex = position.zIndex.toString();
      }

      console.log('✅ Component position updated:', componentId);
    } catch (error) {
      console.error('❌ Error updating component position:', error);
      throw error;
    }
  }

  /**
   * Delete component
   */
  async deleteComponent(componentId: string): Promise<void> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    try {
      await this.http.delete(
        `${this.apiBaseUrl}/api/BusinessWebsite/workspaces/components/${componentId}`,
        {
          headers: {
            'Authorization': `Bearer ${jwtToken}`
          }
        }
      ).toPromise();

      // Remove from DOM
      this.componentRenderer.removeComponent(componentId);

      // Update current page components
      const currentWorkspaceId = this._currentWorkspaceId.value;
      const currentPageId = this._currentPageId.value;
      if (currentWorkspaceId && currentPageId) {
        const updatedComponents = await this.getPageComponents(currentWorkspaceId, currentPageId);
        this._currentPageComponents.next(updatedComponents);
      }

      console.log('✅ Component deleted:', componentId);
    } catch (error) {
      console.error('❌ Error deleting component:', error);
      throw error;
    }
  }

  /**
   * Update component
   */
  private async updateComponent(componentId: string, updates: UpdateWorkspaceComponentDto): Promise<void> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    try {
      await this.http.put(
        `${this.apiBaseUrl}/api/BusinessWebsite/workspaces/components/${componentId}`,
        updates,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
          }
        }
      ).toPromise();
    } catch (error) {
      console.error('Error updating component:', error);
      throw error;
    }
  }

  /**
   * Get component instance
   */
  private async getComponentInstance(componentId: string): Promise<WorkspaceComponentResponseDto | null> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    try {
      const response = await this.http.get<WorkspaceComponentResponseDto>(
        `${this.apiBaseUrl}/api/BusinessWebsite/workspaces/components/${componentId}`,
        {
          headers: {
            'Authorization': `Bearer ${jwtToken}`
          }
        }
      ).toPromise();

      return response || null;
    } catch (error) {
      console.error('Error fetching component instance:', error);
      return null;
    }
  }

  // ===================== PARAMETER SYSTEM =====================

  /**
   * Get component's parameter schema
   */
  async getComponentParameterSchema(componentTypeId: string): Promise<ParameterSchema> {
    const componentType = await this.getComponentTypeDetails(componentTypeId);
    if (!componentType || !componentType.parametersSchema) {
      return { type: 'object', properties: {} };
    }

    try {
      return JSON.parse(componentType.parametersSchema);
    } catch (error) {
      console.error('Error parsing parameter schema:', error);
      return { type: 'object', properties: {} };
    }
  }

  /**
   * Get default parameters
   */
  async getComponentDefaultParameters(componentTypeId: string): Promise<any> {
    const componentType = await this.getComponentTypeDetails(componentTypeId);
    if (!componentType || !componentType.defaultParameters) {
      return {};
    }

    try {
      return JSON.parse(componentType.defaultParameters);
    } catch (error) {
      console.error('Error parsing default parameters:', error);
      return {};
    }
  }

  /**
   * Validate parameters against schema
   */
  validateParameters(parameters: any, schema: ParameterSchema): boolean {
    // Basic validation - you can enhance this with a proper JSON schema validator
    if (!schema.required) return true;

    for (const requiredField of schema.required) {
      if (!(requiredField in parameters)) {
        return false;
      }
    }

    return true;
  }

  // ===================== BULK OPERATIONS =====================

  /**
   * Bulk update multiple components
   */
  async bulkUpdateComponents(updates: Array<{componentId: string, changes: UpdateWorkspaceComponentDto}>): Promise<void> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    try {
      await this.http.put(
        `${this.apiBaseUrl}/api/BusinessWebsite/workspaces/components/bulk`,
        {
          operation: 'update',
          updates
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
          }
        }
      ).toPromise();

      console.log('✅ Bulk component update completed');
    } catch (error) {
      console.error('❌ Error in bulk component update:', error);
      throw error;
    }
  }

  /**
   * Bulk create components
   */
  async bulkCreateComponents(components: CreateWorkspaceComponentDto[]): Promise<string[]> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    try {
      const response = await this.http.post<{componentIds: string[]}>(
        `${this.apiBaseUrl}/api/BusinessWebsite/workspaces/components/bulk`,
        {
          operation: 'create',
          components
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
          }
        }
      ).toPromise();

      return response?.componentIds || [];
    } catch (error) {
      console.error('❌ Error in bulk component creation:', error);
      throw error;
    }
  }

  // ===================== UTILITY METHODS =====================

  /**
   * Inject page-specific CSS
   */
  private injectPageCSS(css: string, pageId: string): void {
    const styleId = `page-style-${pageId}`;
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    styleElement.textContent = css;
  }

  /**
   * Inject page-specific JavaScript
   */
  private injectPageJS(js: string, pageId: string): void {
    const scriptId = `page-script-${pageId}`;
    const existingScript = document.getElementById(scriptId);

    if (existingScript) {
      existingScript.remove();
    }

    const scriptElement = document.createElement('script');
    scriptElement.id = scriptId;
    scriptElement.textContent = js;
    document.body.appendChild(scriptElement);
  }

  /**
   * Save entire workspace
   */
  async saveWorkspace(workspaceId: string): Promise<void> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    try {
      await this.http.post(
        `${this.apiBaseUrl}/api/BusinessWebsite/workspaces/${workspaceId}/save`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${jwtToken}`
          }
        }
      ).toPromise();

      console.log('✅ Workspace saved:', workspaceId);
    } catch (error) {
      console.error('❌ Error saving workspace:', error);
      throw error;
    }
  }

  /**
   * Generate and preview website
   */
  async previewWebsite(workspaceId: string): Promise<string> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    try {
      const response = await this.http.get<{previewUrl: string}>(
        `${this.apiBaseUrl}/api/BusinessWebsite/workspaces/${workspaceId}/preview`,
        {
          headers: {
            'Authorization': `Bearer ${jwtToken}`
          }
        }
      ).toPromise();

      return response?.previewUrl || '';
    } catch (error) {
      console.error('❌ Error generating preview:', error);
      throw error;
    }
  }
}
