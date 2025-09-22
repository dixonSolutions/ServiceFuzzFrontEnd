import { Injectable } from '@angular/core';
import { ComponentType, WorkspaceComponent, WorkspaceComponentResponseDto } from '../../../../models/workspace.models';
import { DataSvrService } from '../../../Other/data-svr.service';
import { HttpClient } from '@angular/common/http';

export interface TemplateVariables {
  instanceId: string;
  componentId: string;
  componentName: string;
  componentClass: string;
  parametersJson: string;
  [parameterName: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class ComponentRenderer {
  private readonly apiBaseUrl = 'https://servicefuzzapi-atf8b4dqawc8dsa9.australiaeast-01.azurewebsites.net';
  private loadedComponents = new Map<string, ComponentType>();

  constructor(
    private http: HttpClient,
    private dataSvr: DataSvrService
  ) {}

  /**
   * Load and render all components on a page
   */
  async loadPageComponents(workspaceId: string, pageId: string): Promise<void> {
    try {
      console.log('🎨 ComponentRenderer: Loading components for page:', pageId, 'in workspace:', workspaceId);
      
      // 1. Get component instances
      const components = await this.getPageComponents(workspaceId, pageId);
      console.log('🎨 ComponentRenderer: Retrieved', components.length, 'components from API');
      
      if (components.length === 0) {
        console.log('⚠️ ComponentRenderer: No components found for this page');
        return;
      }
      
      // 2. Load component type definitions
      for (const component of components) {
        console.log('🎨 ComponentRenderer: Loading component type:', component.componentType);
        if (!this.loadedComponents.has(component.componentType)) {
          const componentType = await this.getComponentTypeDetails(component.componentType);
          if (componentType) {
            this.loadedComponents.set(component.componentType, componentType);
            console.log('✅ ComponentRenderer: Loaded component type definition:', component.componentType);
          } else {
            console.error('❌ ComponentRenderer: Failed to load component type:', component.componentType);
          }
        }
      }
      
      // 3. Sort by loading priority and z-index
      const sortedComponents = components.sort((a, b) => {
        const aType = this.loadedComponents.get(a.componentType);
        const bType = this.loadedComponents.get(b.componentType);
        
        if (aType && bType) {
          // First by loading priority (lower = higher priority)
          if (aType.loadingPriority !== bType.loadingPriority) {
            return (aType.loadingPriority || 5) - (bType.loadingPriority || 5);
          }
        }
        
        // Then by z-index
        return a.zIndex - b.zIndex;
      });
      
      console.log('🎨 ComponentRenderer: Rendering', sortedComponents.length, 'components in priority order');
      
      // 4. Load components in priority order
      for (const component of sortedComponents) {
        console.log('🎨 ComponentRenderer: Rendering component:', component.componentId, 'of type:', component.componentType);
        await this.renderComponent(component);
      }
      
      console.log('✅ ComponentRenderer: Finished loading all page components');
    } catch (error) {
      console.error('❌ ComponentRenderer: Error loading page components:', error);
    }
  }

  /**
   * Render individual component
   */
  async renderComponent(component: WorkspaceComponentResponseDto): Promise<void> {
    try {
      const componentType = this.loadedComponents.get(component.componentType);
      if (!componentType) {
        console.error(`Component type ${component.componentType} not found`);
        return;
      }

      // Parse parameters
      const parameters = component.parameters ? 
        JSON.parse(component.parameters) : 
        JSON.parse(componentType.defaultParameters || '{}');

      // Template variables
      const templateVars: TemplateVariables = {
        instanceId: component.id,
        componentId: component.componentId,
        componentName: this.toPascalCase(componentType.name),
        componentClass: this.toKebabCase(componentType.name),
        parametersJson: JSON.stringify(parameters),
        ...parameters
      };

      // Process templates
      const html = this.processTemplate(componentType.htmlTemplate || '', templateVars);
      const css = this.processTemplate(componentType.cssTemplate || '', templateVars);
      const js = this.processTemplate(componentType.javaScriptTemplate || '', templateVars);

      // Inject CSS (scoped to instance)
      if (css) {
        this.injectCSS(css, component.id);
      }

      // Inject JavaScript (scoped to instance)
      if (js) {
        this.injectJavaScript(js, component.id);
      }

      // Render HTML with positioning
      this.renderHTML(component, html);
    } catch (error) {
      console.error('Error rendering component:', error);
    }
  }

  /**
   * Get all components for a specific page
   */
  private async getPageComponents(workspaceId: string, pageId: string): Promise<WorkspaceComponentResponseDto[]> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    try {
      const response = await this.http.get<{components: WorkspaceComponentResponseDto[]}>(
        `${this.apiBaseUrl}/api/BusinessWebsite/workspaces/${workspaceId}/pages/${pageId}/components`,
        {
          headers: {
            'Authorization': `Bearer ${jwtToken}`
          }
        }
      ).toPromise();

      return response?.components || [];
    } catch (error) {
      console.error('Error fetching page components:', error);
      return [];
    }
  }

  /**
   * Get component type details
   */
  private async getComponentTypeDetails(componentTypeId: string): Promise<ComponentType | null> {
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

  /**
   * Process template with variables
   */
  private processTemplate(template: string, variables: TemplateVariables): string {
    let processed = template;
    Object.keys(variables).forEach(key => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(placeholder, String(variables[key] || ''));
    });
    return processed;
  }

  /**
   * Inject scoped CSS
   */
  private injectCSS(css: string, instanceId: string): void {
    const styleId = `component-style-${instanceId}`;
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    styleElement.textContent = css;
  }

  /**
   * Inject scoped JavaScript
   */
  private injectJavaScript(js: string, instanceId: string): void {
    const scriptId = `component-script-${instanceId}`;
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
   * Render HTML with positioning
   */
  private renderHTML(component: WorkspaceComponentResponseDto, html: string): void {
    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-component-type', component.componentType);
    wrapper.setAttribute('data-instance-id', component.id);
    wrapper.setAttribute('data-component-id', component.componentId);
    wrapper.className = 'component-wrapper';

    // Apply positioning styles
    wrapper.style.position = 'absolute';
    wrapper.style.left = `${component.xPosition}px`;
    wrapper.style.top = `${component.yPosition}px`;
    wrapper.style.width = `${component.width}px`;
    wrapper.style.height = `${component.height}px`;
    wrapper.style.zIndex = component.zIndex.toString();

    wrapper.innerHTML = html;

    const container = document.getElementById('page-container');
    if (container) {
      container.appendChild(wrapper);
    }
  }

  /**
   * Clear page container
   */
  clearPageContainer(): void {
    const container = document.getElementById('page-container');
    if (container) {
      container.innerHTML = '';
    }
  }

  /**
   * Remove component from DOM
   */
  removeComponent(instanceId: string): void {
    // Remove HTML wrapper
    const wrapper = document.querySelector(`[data-instance-id="${instanceId}"]`);
    if (wrapper) {
      wrapper.remove();
    }

    // Remove CSS
    const styleElement = document.getElementById(`component-style-${instanceId}`);
    if (styleElement) {
      styleElement.remove();
    }

    // Remove JavaScript
    const scriptElement = document.getElementById(`component-script-${instanceId}`);
    if (scriptElement) {
      scriptElement.remove();
    }
  }

  /**
   * Update component rendering with new parameters
   */
  async updateComponentRendering(component: WorkspaceComponentResponseDto): Promise<void> {
    // Remove existing rendering
    this.removeComponent(component.id);
    
    // Re-render with updated data
    await this.renderComponent(component);
  }

  /**
   * Utility methods
   */
  private toPascalCase(str: string): string {
    return str.replace(/(?:^|\s)\w/g, match => match.toUpperCase()).replace(/\s/g, '');
  }

  private toKebabCase(str: string): string {
    return str.toLowerCase().replace(/\s+/g, '-');
  }
}
