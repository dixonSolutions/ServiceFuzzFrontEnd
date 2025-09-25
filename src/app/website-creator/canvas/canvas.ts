import { Component, OnInit, OnChanges, Input, Output, EventEmitter, ViewChild, ElementRef, OnDestroy, ChangeDetectorRef, Injector, SimpleChanges } from '@angular/core';
import { ComponentDefinition, ComponentParameter, ComponentInstance, WebsiteBuilderService } from '../../services/Business/WebsiteCreator/manual/website-builder';
import { ComponentType, ComponentRenderContext, WorkspaceComponentResponseDto } from '../../models/workspace.models';
import { ComponentRendererService } from '../../services/Business/WebsiteCreator/manual/components/component-renderer.service';
import { EnhancedWebsiteBuilderService } from '../../services/Business/WebsiteCreator/enhanced/enhanced-website-builder.service';
import { ComponentRenderer } from '../../services/Business/WebsiteCreator/rendering/component-renderer.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { ProgressBarModule } from 'primeng/progressbar';
import { AccordionModule } from 'primeng/accordion';
import { MessageService } from 'primeng/api';
import { ToastService } from '../../services/Main/messaging/toast.service';
import { WebsiteFilesService } from '../../services/Business/WebsiteCreator/developers/files/website-files.service';

export interface Page {
  id: string;
  name: string;
  route: string;
  isDeletable: boolean;
  isActive?: boolean;
  components: ComponentInstance[];
}

export interface BuiltInNavProperties {
  [key: string]: any;
}

@Component({
  selector: 'app-canvas',
  standalone: false,
  templateUrl: './canvas.html',
  styleUrl: './canvas.css'
})
export class Canvas implements OnInit, OnChanges, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasElement!: ElementRef<HTMLDivElement>;

  // Inputs from parent component
  @Input() selectedDevice: string = 'desktop';
  @Input() builtInNavProperties: BuiltInNavProperties = {};
  @Input() isAiGenerating: boolean = false;
  @Input() aiGenerationError: string | null = null;
  @Input() currentWorkspaceId: string | null = null;
  
  // Outputs to parent component
  @Output() componentInstanceSelectionChange = new EventEmitter<ComponentInstance | null>();
  @Output() builtInNavPropertiesChange = new EventEmitter<BuiltInNavProperties>();
  @Output() pageDataChange = new EventEmitter<Page[]>();
  @Output() currentPageChange = new EventEmitter<string>();
  @Output() navigationClick = new EventEmitter<{event: MouseEvent, pageId: string}>();

  // Canvas State (migrated from main component)
  pages: Page[] = [];
  currentPageId: string = 'home';
  selectedComponentInstance: ComponentInstance | null = null;
  currentPageComponents: ComponentInstance[] = [];
  
  // Enhanced system state
  currentWorkspaceComponents: WorkspaceComponentResponseDto[] = [];
  availableComponentTypes: ComponentType[] = [];
  
  // Drag & Drop State (migrated from main component)
  private isDragging = false;
  private isResizing = false;
  private dragStart = { x: 0, y: 0 };
  private resizeMode = '';
  private draggedComponent: ComponentDefinition | null = null;
  
  // Device viewport
  deviceWidths: { [key: string]: string } = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px'
  };

  // Component rendering
  componentRenderContexts: ComponentRenderContext[] = [];
  private subscriptions: Subscription[] = [];
  private apiComponentTypesLoaded = false;

  constructor(
    private websiteBuilder: WebsiteBuilderService,
    private componentRenderer: ComponentRendererService,
    private enhancedWebsiteBuilder: EnhancedWebsiteBuilderService,
    private newComponentRenderer: ComponentRenderer,
    private domSanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    private toastService: ToastService,
    private injector: Injector
  ) { }

  ngOnInit(): void {
    console.log('🚀 Canvas component initialized with Enhanced v3.0 system');
    this.initializeCanvas();
    
    // Setup component system - it will handle the case where workspace ID is not yet available
    this.setupEnhancedComponentSystem().catch(error => {
      console.error('❌ Error setting up enhanced component system:', error);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Check if workspace ID changed and is now available
    if (changes['currentWorkspaceId'] && this.currentWorkspaceId) {
      console.log('🔄 Canvas: Workspace ID changed, setting up enhanced system:', this.currentWorkspaceId);
      
      // Setup component system if not already done
      if (!this.apiComponentTypesLoaded) {
        console.log('🔄 Canvas: API component types not loaded yet, setting up system...');
        this.setupEnhancedComponentSystem().catch(error => {
          console.error('❌ Error setting up enhanced component system:', error);
        });
      } else {
        console.log('✅ Canvas: API component types already loaded, initializing enhanced system...');
        // Initialize enhanced system
        this.initializeEnhancedSystem();
      }
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.cleanupEnhancedSystem();
  }

  // ===================== ENHANCED COMPONENT SYSTEM v3.0 =====================

  /**
   * Setup enhanced component system with event listeners
   */
  private async setupEnhancedComponentSystem(): Promise<void> {
    console.log('🔧 Setting up Enhanced Component System v3.0...');

    // Listen for component system events
    this.componentRenderer.addEventListener('componentSystemReady', (event) => {
      console.log('✅ Component System Ready:', event.detail);
    });

    this.componentRenderer.addEventListener('componentRendered', (event) => {
      console.log('🎨 Component Rendered:', event.detail);
    });

    this.componentRenderer.addEventListener('allComponentsRefreshed', (event) => {
      console.log('🔄 All Components Refreshed:', event.detail);
      this.cdr.detectChanges(); // Trigger Angular change detection
    });

    // Register components dynamically from API and detected patterns
    await this.registerDynamicComponents();
  }

  /**
   * Register components dynamically from API ONLY
   * NO HARDCODED COMPONENTS - Everything must be 100% dynamic and scalable
   */
  private async registerDynamicComponents(): Promise<void> {
    console.log('🔧 Registering components dynamically from API only - NO HARDCODED COMPONENTS...');
    
    try {
      // First, ensure API component types are loaded
      console.log('📡 Loading API component types...');
      const apiComponentTypes = await this.websiteBuilder.loadAndCacheApiComponentTypes().toPromise();
      
      if (!apiComponentTypes || apiComponentTypes.length === 0) {
        console.warn('⚠️ No API component types found - this might indicate an API issue');
        return;
      }
      
      console.log(`📡 Found ${apiComponentTypes.length} API component types`);
      
      // Register each API component type with the enhanced renderer
      apiComponentTypes.forEach(apiComponent => {
        try {
          // Parse the parameters schema dynamically
          let schema: any = {};
          if (apiComponent.parametersSchema) {
            const parsedSchema = typeof apiComponent.parametersSchema === 'string' 
              ? JSON.parse(apiComponent.parametersSchema) 
              : apiComponent.parametersSchema;
            
            // Convert API schema format to enhanced component system format
            if (Array.isArray(parsedSchema)) {
              parsedSchema.forEach((param: any) => {
                schema[param.name] = {
                  name: param.name,
                  type: param.type || 'text',
                  label: param.label || param.name,
                  defaultValue: param.defaultValue || '',
                  binding: param.binding || 'content',
                  required: param.required || false
                };
              });
            } else if (parsedSchema.parameters) {
              parsedSchema.parameters.forEach((param: any) => {
                schema[param.name] = {
                  name: param.name,
                  type: param.type || 'text',
                  label: param.label || param.name,
                  defaultValue: param.defaultValue || '',
                  binding: param.binding || 'content',
                  required: param.required || false
                };
              });
            }
          }
          
          // Register with enhanced component renderer
          this.componentRenderer.registerComponent(apiComponent.id, {
            schema: schema,
            template: apiComponent.htmlTemplate || `<div class="dynamic-component" data-type="${apiComponent.id}" data-instance-id="{{instanceId}}">{{content}}</div>`,
            styles: apiComponent.cssTemplate || `[data-instance-id="{{instanceId}}"] .dynamic-component { display: block; }`,
            metadata: {
              name: apiComponent.name,
              category: apiComponent.category || 'api',
              description: apiComponent.description || ''
            }
          });
          
          console.log(`✅ Registered API component: ${apiComponent.name} (${apiComponent.id})`);
        } catch (error) {
          console.warn(`⚠️ Failed to register API component ${apiComponent.id}:`, error);
        }
      });
      
      console.log('✅ Dynamic component registration completed - ALL FROM API');
      
      // Mark API component types as loaded
      this.apiComponentTypesLoaded = true;
      
      // Trigger component rendering now that types are available if workspace is ready
      if (this.currentWorkspaceId) {
        console.log('🔄 Workspace ID available, triggering component rendering...');
        this.updateComponentRenderContexts();
      } else {
        console.log('⏳ Workspace ID not available yet, deferring component rendering...');
      }
      
    } catch (error) {
      console.error('❌ Error during dynamic component registration:', error);
      console.error('❌ This might be due to API connectivity issues or authentication problems');
    }
  }

  /**
   * Fast refresh all components on current page
   */
  refreshPageComponents(forceRefresh = false): void {
    console.log('🔄 Fast refreshing page components...');
    
    if (forceRefresh) {
      this.componentRenderer.clearRenderCache();
    }
    
    // Re-render all components
    this.updateComponentRenderContexts();
    
    // Trigger Angular change detection
    this.cdr.detectChanges();
    
    console.log('✅ Page components refreshed');
  }

  /**
   * Update component parameters and re-render
   */
  updateComponentParameters(componentId: string, newParameters: any): void {
    console.log(`🔧 Updating parameters for component: ${componentId}`);
    
    const component = this.currentPageComponents.find(c => c.id === componentId);
    if (component) {
      component.parameters = { ...component.parameters, ...newParameters };
      
      // Clear cache for this component to force re-render
      this.componentRenderer.clearRenderCache(component.type);
      
      // Re-render components
      this.updateComponentRenderContexts();
      
      // Trigger change detection
      this.cdr.detectChanges();
      
      console.log('✅ Component parameters updated and re-rendered');
    } else {
      console.warn('❌ Component not found:', componentId);
    }
  }

  /**
   * Get component performance statistics
   */
  getComponentPerformanceStats(): any {
    return this.componentRenderer.getPerformanceStats();
  }

  /**
   * Manually trigger component loading from API (for debugging)
   */
  async forceLoadComponentsFromAPI(): Promise<void> {
    console.log(`🚀 [DEBUG] Manually triggering component load from API...`);
    if (this.currentWorkspaceId && this.currentPageId) {
      await this.loadPageComponentsFromAPI();
    } else {
      console.error(`🚀 [DEBUG] Cannot force load: missing workspace ID (${this.currentWorkspaceId}) or page ID (${this.currentPageId})`);
    }
  }

  /**
   * Manually trigger source code parsing (for debugging)
   */
  forceSampleComponents(): void {
    console.log(`🚀 [DEBUG] Manually triggering source code parsing...`);
    this.renderFromWebsiteSource();
  }

  /**
   * Force refresh current page to trigger new component system
   */
  forceRefreshPage(): void {
    console.log(`🚀 [DEBUG] Force refreshing page: ${this.currentPageId}`);
    this.updateCurrentPageComponents();
  }

  /**
   * Render page from website source code files - parse components dynamically
   */
  private async renderFromWebsiteSource(): Promise<void> {
    if (!this.currentWorkspaceId || !this.currentPageId) {
      console.warn('🚀 [DEBUG] Cannot render from source: missing workspace ID or page ID');
      return;
    }

    try {
      console.log(`🚀 [DEBUG] Parsing website source code for dynamic components: ${this.currentPageId}`);
      
      // Get all website files
      const websiteFilesService = this.injector.get(WebsiteFilesService);
      const files = await websiteFilesService.getFiles(this.currentWorkspaceId).toPromise();
      
      if (!files) {
        console.log(`🚀 [DEBUG] No files returned from service`);
        return;
      }

      // Get the HTML file for this page
      const pageFileName = this.currentPageId === 'home' ? 'index.html' : `${this.currentPageId}.html`;
      const htmlFile = files.find(f => f.fileName === pageFileName || f.fileName.endsWith(pageFileName));
      
      if (!htmlFile) {
        console.log(`🚀 [DEBUG] No HTML file found for page: ${this.currentPageId}`);
        return;
      }

      console.log(`🚀 [DEBUG] Parsing HTML source: ${htmlFile.fileName}`);
      
      // Parse the HTML source code to extract component instances
      const parsedComponents = await this.parseComponentsFromSource(htmlFile.content, files);
      
      if (parsedComponents.length > 0) {
        console.log(`🚀 [DEBUG] Found ${parsedComponents.length} components in source code`);
        this.currentPageComponents = parsedComponents;
        
        // If these are default components, add them to the source code
        if (htmlFile.content.includes('{{components}}')) {
          console.log(`🚀 [DEBUG] Adding default components to template source code`);
          await this.addComponentsToTemplateSource(parsedComponents, files);
        }
        
        this.updateComponentRenderContexts();
      } else {
        console.log(`🚀 [DEBUG] No components found in source code - rendering static HTML`);
        await this.injectWebsiteHTML(htmlFile.content || '');
      }
      
    } catch (error) {
      console.error(`🚀 [DEBUG] Error parsing website source:`, error);
    }
  }

  /**
   * Detect HTML patterns and convert them to editable components
   * 100% DYNAMIC - NO HARDCODED COMPONENT TYPES
   */
  private detectHtmlPatterns(doc: Document): NodeListOf<Element> {
    console.log(`🔍 Starting 100% dynamic HTML pattern detection...`);
    
    // First, let's see what's actually in the document
    const bodyContent = doc.body?.innerHTML || '';
    console.log(`📄 Document body content preview:`, bodyContent.substring(0, 1000));
    
    const detectedElements: Element[] = [];
    
    // Strategy 1: Analyze ALL elements dynamically without hardcoded types
    const allElements = doc.querySelectorAll('*:not([data-component-id])');
    console.log(`🔍 Analyzing ${allElements.length} elements dynamically...`);
    
    allElements.forEach(element => {
      // Skip script, style, meta, and other non-content elements
      const skipTags = ['script', 'style', 'meta', 'link', 'title', 'head', 'html', 'body'];
      if (skipTags.includes(element.tagName.toLowerCase())) {
        return;
      }
      
      // Analyze element characteristics dynamically
      const analysis = this.analyzeElementDynamically(element);
      
      if (analysis.shouldBeComponent) {
        const dynamicComponentType = this.generateDynamicComponentType(element, analysis);
        console.log(`📝 Dynamically detected component: ${dynamicComponentType} for element:`, element.tagName, element.className);
        
        this.markAsComponent(element, dynamicComponentType);
        detectedElements.push(element);
      }
    });
    
    console.log(`🔍 Detected ${detectedElements.length} HTML patterns as components dynamically`);
    
    // Return the marked elements from the document
    const markedElements = doc.querySelectorAll('[data-component-id]');
    console.log(`✅ Returning ${markedElements.length} marked elements for processing`);
    
    return markedElements;
  }
  
  /**
   * Analyze an element dynamically to determine if it should be a component
   */
  private analyzeElementDynamically(element: Element): any {
    const textContent = element.textContent?.trim() || '';
    const hasSignificantContent = textContent.length > 50;
    const hasChildren = element.children.length > 0;
    const hasClasses = element.className && element.className.length > 0;
    const hasId = element.id && element.id.length > 0;
    const tagName = element.tagName.toLowerCase();
    
    // Semantic HTML elements are always components
    const semanticTags = ['header', 'main', 'section', 'article', 'aside', 'footer', 'nav', 'form'];
    const isSemanticElement = semanticTags.includes(tagName);
    
    // Elements with significant content and structure
    const hasStructure = hasChildren && hasSignificantContent;
    
    // Elements with meaningful classes or IDs
    const hasMeaningfulAttributes = hasClasses || hasId;
    
    return {
      shouldBeComponent: isSemanticElement || hasStructure || (hasMeaningfulAttributes && hasSignificantContent),
      isSemanticElement,
      hasStructure,
      hasMeaningfulAttributes,
      textContent,
      hasChildren,
      hasClasses,
      hasId,
      tagName
    };
  }
  
  /**
   * Generate a dynamic component type based on element analysis
   */
  private generateDynamicComponentType(element: Element, analysis: any): string {
    // Use semantic tag name if available
    if (analysis.isSemanticElement) {
      return `dynamic-${analysis.tagName}`;
    }
    
    // Use class name if meaningful
    if (analysis.hasClasses) {
      const firstClass = element.className.split(' ')[0];
      if (firstClass && firstClass.length > 0) {
        return `dynamic-${firstClass.replace(/[^a-zA-Z0-9-]/g, '')}`;
      }
    }
    
    // Use ID if available
    if (analysis.hasId) {
      return `dynamic-${element.id.replace(/[^a-zA-Z0-9-]/g, '')}`;
    }
    
    // Generate based on content analysis
    const hasHeadings = element.querySelector('h1, h2, h3, h4, h5, h6');
    const hasImages = element.querySelector('img');
    const hasLinks = element.querySelector('a[href]');
    const hasForms = element.querySelector('form, input, textarea, button');
    
    if (hasHeadings && hasImages) {
      return 'dynamic-media-content';
    } else if (hasHeadings) {
      return 'dynamic-text-content';
    } else if (hasImages) {
      return 'dynamic-image-content';
    } else if (hasForms) {
      return 'dynamic-form-content';
    } else if (hasLinks) {
      return 'dynamic-navigation-content';
    }
    
    // Fallback to generic content block
    return `dynamic-content-${analysis.tagName}`;
  }
  
  /**
   * Mark an element as a component with proper attributes
   */
  private markAsComponent(element: Element, componentType: string): void {
    const componentId = `detected_${componentType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    element.setAttribute('data-component-id', componentId);
    element.setAttribute('data-component-type', componentType);
    element.classList.add('component-instance');
    
    // Extract parameters from the element content
    this.extractAndMarkParameters(element, componentType);
  }
  
  /**
   * Extract editable parameters from HTML element dynamically
   * 100% DYNAMIC - NO HARDCODED PARAMETER TYPES
   */
  private extractAndMarkParameters(element: Element, componentType: string): void {
    const params: any = {};
    
    // Dynamic parameter extraction based on element analysis
    const parameterAnalysis = this.analyzeElementForParameters(element);
    
    // Extract text content parameters
    parameterAnalysis.textElements.forEach((textEl: Element, index: number) => {
      const paramName = this.generateParameterName(textEl, index, 'text');
      const paramValue = textEl.textContent?.trim() || '';
      
      if (paramValue) {
        params[paramName] = paramValue;
        textEl.setAttribute(`data-param-${paramName}`, paramValue);
        console.log(`📝 Extracted text parameter: ${paramName} = "${paramValue.substring(0, 50)}..."`);
      }
    });
    
    // Extract link parameters
    parameterAnalysis.linkElements.forEach((linkEl: Element, index: number) => {
      const paramName = this.generateParameterName(linkEl, index, 'link');
      const linkText = linkEl.textContent?.trim() || '';
      const linkUrl = linkEl.getAttribute('href') || '#';
      
      if (linkText) {
        params[`${paramName}_text`] = linkText;
        params[`${paramName}_url`] = linkUrl;
        linkEl.setAttribute(`data-param-${paramName}_text`, linkText);
        linkEl.setAttribute(`data-param-${paramName}_url`, linkUrl);
        console.log(`🔗 Extracted link parameter: ${paramName} = "${linkText}" -> "${linkUrl}"`);
      }
    });
    
    // Extract image parameters
    parameterAnalysis.imageElements.forEach((imgEl: Element, index: number) => {
      const paramName = this.generateParameterName(imgEl, index, 'image');
      const imgSrc = imgEl.getAttribute('src') || '';
      const imgAlt = imgEl.getAttribute('alt') || '';
      
      if (imgSrc) {
        params[`${paramName}_src`] = imgSrc;
        params[`${paramName}_alt`] = imgAlt;
        imgEl.setAttribute(`data-param-${paramName}_src`, imgSrc);
        imgEl.setAttribute(`data-param-${paramName}_alt`, imgAlt);
        console.log(`🖼️ Extracted image parameter: ${paramName} = "${imgSrc}"`);
      }
    });
    
    // Extract form parameters
    parameterAnalysis.formElements.forEach((formEl: Element, index: number) => {
      const paramName = this.generateParameterName(formEl, index, 'form');
      const formAction = formEl.getAttribute('action') || '';
      const formMethod = formEl.getAttribute('method') || 'POST';
      
      params[`${paramName}_action`] = formAction;
      params[`${paramName}_method`] = formMethod;
      formEl.setAttribute(`data-param-${paramName}_action`, formAction);
      formEl.setAttribute(`data-param-${paramName}_method`, formMethod);
      console.log(`📋 Extracted form parameter: ${paramName} action="${formAction}" method="${formMethod}"`);
    });
    
    // Extract style parameters (colors, fonts, etc.)
    const computedStyle = window.getComputedStyle(element);
    if (computedStyle.backgroundColor && computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)') {
      params.backgroundColor = computedStyle.backgroundColor;
      element.setAttribute('data-param-backgroundColor', computedStyle.backgroundColor);
    }
    if (computedStyle.color) {
      params.textColor = computedStyle.color;
      element.setAttribute('data-param-textColor', computedStyle.color);
    }
    
    // Store parameters as data attribute for later extraction
    element.setAttribute('data-component-params', JSON.stringify(params));
    
    console.log(`🏷️ Dynamically extracted ${Object.keys(params).length} parameters for ${componentType}:`, params);
  }
  
  /**
   * Analyze element for extractable parameters
   */
  private analyzeElementForParameters(element: Element): any {
    return {
      textElements: Array.from(element.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div')).filter(el => {
        const text = el.textContent?.trim() || '';
        return text.length > 0 && text.length < 500 && !el.querySelector('*'); // Only leaf text elements
      }),
      linkElements: Array.from(element.querySelectorAll('a[href]')),
      imageElements: Array.from(element.querySelectorAll('img[src]')),
      formElements: Array.from(element.querySelectorAll('form')),
      inputElements: Array.from(element.querySelectorAll('input, textarea, select, button'))
    };
  }
  
  /**
   * Generate a dynamic parameter name based on element characteristics
   */
  private generateParameterName(element: Element, index: number, type: string): string {
    // Try to use meaningful class names or IDs
    if (element.id) {
      return `${type}_${element.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
    }
    
    if (element.className) {
      const firstClass = element.className.split(' ')[0];
      if (firstClass) {
        return `${type}_${firstClass.replace(/[^a-zA-Z0-9]/g, '_')}`;
      }
    }
    
    // Use tag name and index as fallback
    return `${type}_${element.tagName.toLowerCase()}_${index}`;
  }

  /**
   * Parse components from website source code
   */
  private async parseComponentsFromSource(htmlContent: string, allFiles: any[]): Promise<ComponentInstance[]> {
    console.log(`🚀 [DEBUG] Starting component parsing from source code`);
    const components: ComponentInstance[] = [];

    try {
      // Create a temporary DOM to parse the HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      // Look for component markers in the HTML
      // Components can be marked with data attributes or specific class patterns
      let componentElements = doc.querySelectorAll('[data-component-id], [data-component-type], .component-instance');
      
      // If no marked components found, try to detect common HTML patterns
      if (componentElements.length === 0) {
        console.log(`🚀 [DEBUG] No marked components found, detecting HTML patterns...`);
        componentElements = this.detectHtmlPatterns(doc);
      }
      
      console.log(`🚀 [DEBUG] Found ${componentElements.length} potential component elements`);
      console.log(`🚀 [DEBUG] HTML content preview:`, htmlContent.substring(0, 500));
      
      // Check if this is a template file with placeholders
      if (htmlContent.includes('{{components}}') || htmlContent.includes('{{page.')) {
        console.log(`🚀 [DEBUG] Detected template file with placeholders - returning empty components for actual rendering`);
        console.log(`🚀 [DEBUG] Template content contains:`, {
          hasComponentsPlaceholder: htmlContent.includes('{{components}}'),
          hasPagePlaceholder: htmlContent.includes('{{page.'),
          contentLength: htmlContent.length
        });
        // Return empty array instead of creating placeholder components
        return [];
      }
      
      for (let i = 0; i < componentElements.length; i++) {
        const element = componentElements[i];
        const componentData = await this.extractComponentFromElement(element, i);
        
        if (componentData) {
          components.push(componentData);
          console.log(`🚀 [DEBUG] Parsed component: ${componentData.type} (${componentData.id})`);
        }
      }

      // Also look for component patterns in comments or script tags
      const additionalComponents = await this.parseComponentsFromComments(htmlContent);
      components.push(...additionalComponents);

      // Parse CSS for component positioning and styling
      await this.parseComponentStyling(allFiles, components);

      console.log(`🚀 [DEBUG] Total components parsed: ${components.length}`);
      return components;

    } catch (error) {
      console.error(`🚀 [DEBUG] Error parsing components from source:`, error);
      return [];
    }
  }

  /**
   * Extract component data from DOM element
   */
  private async extractComponentFromElement(element: Element, index: number): Promise<ComponentInstance | null> {
    try {
      // Get component ID and type from data attributes
      let componentId = element.getAttribute('data-component-id') || 
                       element.getAttribute('id') || 
                       `parsed-component-${Date.now()}-${index}`;
      
      let componentType = element.getAttribute('data-component-type') || 
                         element.getAttribute('data-type') ||
                         this.inferComponentTypeFromElement(element);

      if (!componentType) {
        console.log(`🚀 [DEBUG] Could not determine component type for element:`, element);
        return null;
      }

      // Extract positioning from style attributes or CSS classes
      const positioning = this.extractPositioningFromElement(element);
      
      // Extract parameters from data attributes and content
      const parameters = this.extractParametersFromElement(element);

      const component: ComponentInstance = {
        id: componentId,
        type: componentType,
        x: positioning.x,
        y: positioning.y,
        width: positioning.width,
        height: positioning.height,
        zIndex: positioning.zIndex,
        parameters: parameters
      };

      return component;

    } catch (error) {
      console.error(`🚀 [DEBUG] Error extracting component from element:`, error);
      return null;
    }
  }

  /**
   * Infer component type from element structure
   */
  private inferComponentTypeFromElement(element: Element): string | null {
    const tagName = element.tagName.toLowerCase();
    const className = element.className || '';
    const innerHTML = element.innerHTML.toLowerCase();

    // Common component patterns
    if (className.includes('hero') || className.includes('banner')) return 'hero-section';
    if (className.includes('button') || tagName === 'button') return 'button';
    if (className.includes('card')) return 'card';
    if (className.includes('nav') || tagName === 'nav') return 'navigation';
    if (className.includes('footer') || tagName === 'footer') return 'footer';
    if (className.includes('header') || tagName === 'header') return 'header';
    if (className.includes('accordion') || innerHTML.includes('accordion')) return 'accordion';
    if (className.includes('carousel') || innerHTML.includes('carousel')) return 'carousel';
    if (className.includes('gallery')) return 'gallery';
    if (className.includes('testimonial')) return 'testimonial';
    if (className.includes('pricing')) return 'pricing-table';
    if (className.includes('contact') && className.includes('form')) return 'contact-form';
    if (tagName === 'form') return 'form';
    if (tagName === 'img' || className.includes('image')) return 'image';
    if (className.includes('text') || tagName === 'p') return 'text';
    if (tagName.match(/h[1-6]/)) return 'heading';

    // Default to generic component
    return 'generic-component';
  }

  /**
   * Extract positioning information from element
   */
  private extractPositioningFromElement(element: Element): {x: number, y: number, width: number, height: number, zIndex: number} {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    return {
      x: parseInt(element.getAttribute('data-x') || style.left || '0') || rect.left || 0,
      y: parseInt(element.getAttribute('data-y') || style.top || '0') || rect.top || 0,
      width: parseInt(element.getAttribute('data-width') || style.width || '300') || rect.width || 300,
      height: parseInt(element.getAttribute('data-height') || style.height || '100') || rect.height || 100,
      zIndex: parseInt(element.getAttribute('data-z-index') || style.zIndex || '1') || 1
    };
  }

  /**
   * Extract parameters from element attributes and content
   */
  private extractParametersFromElement(element: Element): {[key: string]: any} {
    const parameters: {[key: string]: any} = {};

    // Extract data-param-* attributes
    Array.from(element.attributes).forEach(attr => {
      if (attr.name.startsWith('data-param-')) {
        const paramName = attr.name.replace('data-param-', '');
        parameters[paramName] = attr.value;
      }
    });

    // Extract common content parameters
    const textContent = element.textContent?.trim();
    if (textContent) {
      parameters['text'] = textContent;
      parameters['content'] = textContent;
    }

    // Extract specific element properties
    if (element.tagName === 'IMG') {
      parameters['src'] = element.getAttribute('src') || '';
      parameters['alt'] = element.getAttribute('alt') || '';
    }

    if (element.tagName === 'A') {
      parameters['href'] = element.getAttribute('href') || '';
      parameters['target'] = element.getAttribute('target') || '';
    }

    // Extract style-based parameters
    const style = window.getComputedStyle(element);
    if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
      parameters['backgroundColor'] = style.backgroundColor;
    }
    if (style.color) {
      parameters['textColor'] = style.color;
    }

    return parameters;
  }

  /**
   * Parse components from HTML comments or script tags
   */
  private async parseComponentsFromComments(htmlContent: string): Promise<ComponentInstance[]> {
    const components: ComponentInstance[] = [];
    
    // Look for component definitions in comments
    const commentRegex = /<!--\s*COMPONENT:\s*(\{.*?\})\s*-->/gs;
    let match;
    
    while ((match = commentRegex.exec(htmlContent)) !== null) {
      try {
        const componentData = JSON.parse(match[1]);
        if (componentData.id && componentData.type) {
          components.push({
            id: componentData.id,
            type: componentData.type,
            x: componentData.x || 0,
            y: componentData.y || 0,
            width: componentData.width || 300,
            height: componentData.height || 100,
            zIndex: componentData.zIndex || 1,
            parameters: componentData.parameters || {}
          });
          console.log(`🚀 [DEBUG] Parsed component from comment: ${componentData.type}`);
        }
      } catch (error) {
        console.warn(`🚀 [DEBUG] Failed to parse component from comment:`, error);
      }
    }

    return components;
  }

  /**
   * Parse component styling from CSS files
   */
  private async parseComponentStyling(allFiles: any[], components: ComponentInstance[]): Promise<void> {
    const cssFiles = allFiles.filter(f => f.fileName.endsWith('.css'));
    
    for (const cssFile of cssFiles) {
      if (!cssFile.content) continue;
      
      // Parse CSS for component-specific styles
      components.forEach(component => {
        const componentSelector = `#${component.id}, .${component.id}`;
        const styleMatch = cssFile.content.match(new RegExp(`${componentSelector}\\s*\\{([^}]*)\\}`, 'i'));
        
        if (styleMatch) {
          console.log(`🚀 [DEBUG] Found CSS styles for component: ${component.id}`);
          // Parse CSS properties and update component parameters
          this.parseCSSPropertiesIntoParameters(styleMatch[1], component);
        }
      });
    }
  }


  /**
   * Add components to template source code
   */
  private async addComponentsToTemplateSource(components: ComponentInstance[], allFiles: any[]): Promise<void> {
    try {
      console.log(`🚀 [DEBUG] Converting template to actual HTML with ${components.length} components`);
      
      const websiteFilesService = this.injector.get(WebsiteFilesService);
      if (!this.currentWorkspaceId) return;
      
      const pageFileName = this.currentPageId === 'home' ? 'index.html' : `${this.currentPageId}.html`;
      const htmlFile = allFiles.find(f => f.fileName === pageFileName);
      
      if (!htmlFile || !htmlFile.content) return;
      
      // Generate HTML for all components
      let componentsHtml = '';
      components.forEach(component => {
        const componentHtml = this.generateComponentHTML(component);
        componentsHtml += componentHtml + '\n';
      });
      
      // Replace the {{components}} placeholder with actual component HTML
      let updatedHtml = htmlFile.content.replace('{{components}}', componentsHtml);
      
      // Replace other common placeholders
      updatedHtml = updatedHtml.replace('{{page.title}}', this.getPageTitle());
      updatedHtml = updatedHtml.replace('{{page.metaDescription}}', this.getPageDescription());
      updatedHtml = updatedHtml.replace('{{global.css}}', '');
      updatedHtml = updatedHtml.replace('{{page.css}}', '');
      updatedHtml = updatedHtml.replace('{{global.js}}', '');
      updatedHtml = updatedHtml.replace('{{page.js}}', '');
      
      // Update the HTML file
      await websiteFilesService.updateFile(htmlFile.id, updatedHtml).toPromise();
      
      // Update CSS with component styles
      await this.addComponentsToCSS(components, allFiles);
      
      console.log(`✅ Template converted to actual HTML with components`);
      
    } catch (error) {
      console.error(`🚀 [DEBUG] Error adding components to template:`, error);
    }
  }

  /**
   * Generate HTML for a component
   */
  private generateComponentHTML(component: ComponentInstance): string {
    const params = component.parameters;
    let html = '';
    
    switch (component.type) {
      case 'hero-section':
        html = `
    <section id="${component.id}" data-component-id="${component.id}" data-component-type="${component.type}" class="hero-section">
      <div class="hero-content">
        <h1 data-param-title="${params['title'] || ''}">${params['title'] || ''}</h1>
        <p data-param-subtitle="${params['subtitle'] || ''}">${params['subtitle'] || ''}</p>
        ${params['buttonText'] ? `<button data-param-buttonText="${params['buttonText']}" class="hero-button">${params['buttonText']}</button>` : ''}
      </div>
    </section>`;
        break;
        
      case 'header':
        html = `
    <header id="${component.id}" data-component-id="${component.id}" data-component-type="${component.type}" class="page-header">
      <h1 data-param-title="${params['title'] || ''}">${params['title'] || ''}</h1>
      ${params['subtitle'] ? `<p data-param-subtitle="${params['subtitle']}" class="header-subtitle">${params['subtitle']}</p>` : ''}
    </header>`;
        break;
        
      case 'text':
        html = `
    <div id="${component.id}" data-component-id="${component.id}" data-component-type="${component.type}" class="text-content">
      <p data-param-content="${params['content'] || ''}">${params['content'] || ''}</p>
    </div>`;
        break;
        
      case 'card':
        html = `
    <div id="${component.id}" data-component-id="${component.id}" data-component-type="${component.type}" class="card">
      <h3 data-param-title="${params['title'] || ''}">${params['title'] || 'Card Title'}</h3>
      <p data-param-content="${params['content'] || ''}">${params['content'] || 'Card content'}</p>
    </div>`;
        break;
        
      case 'gallery':
        html = `
    <div id="${component.id}" data-component-id="${component.id}" data-component-type="${component.type}" class="gallery">
      <h2 data-param-title="${params['title'] || ''}">${params['title'] || 'Gallery'}</h2>
      <div class="gallery-grid" data-param-columns="${params['columns'] || 3}">
        <!-- Gallery items will be added here -->
      </div>
    </div>`;
        break;
        
      default:
        html = `
    <div id="${component.id}" data-component-id="${component.id}" data-component-type="${component.type}" class="component">
      <p>Component: ${component.type}</p>
    </div>`;
        break;
    }
    
    return html;
  }

  /**
   * Add component styles to CSS
   */
  private async addComponentsToCSS(components: ComponentInstance[], allFiles: any[]): Promise<void> {
    try {
      const websiteFilesService = this.injector.get(WebsiteFilesService);
      const cssFile = allFiles.find(f => f.fileName.endsWith('.css'));
      
      if (!cssFile) return;
      
      let cssContent = cssFile.content || '';
      
      // Add styles for each component
      components.forEach(component => {
        const componentCSS = this.generateComponentCSS(component);
        cssContent += '\n' + componentCSS;
      });
      
      // Update the CSS file
      await websiteFilesService.updateFile(cssFile.id, cssContent).toPromise();
      
      console.log(`✅ Added CSS styles for ${components.length} components`);
      
    } catch (error) {
      console.error(`🚀 [DEBUG] Error adding component CSS:`, error);
    }
  }

  /**
   * Generate CSS for a component
   */
  private generateComponentCSS(component: ComponentInstance): string {
    const params = component.parameters;
    let css = `
#${component.id} {
  position: absolute;
  left: ${component.x}px;
  top: ${component.y}px;
  width: ${component.width}px;
  height: ${component.height}px;
  z-index: ${component.zIndex};`;

    // Add parameter-based styles
    if (params['backgroundColor']) css += `\n  background-color: ${params['backgroundColor']};`;
    if (params['textColor']) css += `\n  color: ${params['textColor']};`;
    if (params['fontSize']) css += `\n  font-size: ${params['fontSize']};`;
    if (params['fontFamily']) css += `\n  font-family: ${params['fontFamily']};`;
    if (params['borderRadius']) css += `\n  border-radius: ${params['borderRadius']};`;
    if (params['padding']) css += `\n  padding: ${params['padding']};`;
    if (params['margin']) css += `\n  margin: ${params['margin']};`;

    css += '\n}';
    
    // Add component-specific styles
    switch (component.type) {
      case 'hero-section':
        css += `
#${component.id} .hero-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  text-align: center;
}

#${component.id} .hero-button {
  margin-top: 20px;
  padding: 12px 24px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}`;
        break;
        
      case 'card':
        css += `
#${component.id} {
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}`;
        break;
        
      case 'gallery':
        css += `
#${component.id} .gallery-grid {
  display: grid;
  grid-template-columns: repeat(${params['columns'] || 3}, 1fr);
  gap: 20px;
  margin-top: 20px;
}`;
        break;
    }
    
    return css;
  }

  /**
   * Get page title based on current page
   */
  private getPageTitle(): string {
    switch (this.currentPageId) {
      case 'home': return 'Home';
      case 'about': return 'About';
      case 'shop': return 'Shop';
      default: return this.currentPageId.charAt(0).toUpperCase() + this.currentPageId.slice(1);
    }
  }

  /**
   * Get page description based on current page
   */
  private getPageDescription(): string {
    switch (this.currentPageId) {
      case 'home': return 'Welcome to our website - discover amazing products and services';
      case 'about': return 'Learn more about our company, mission, and team';
      case 'shop': return 'Browse our collection of high-quality products';
      default: return `${this.currentPageId} page of our website`;
    }
  }

  /**
   * Parse CSS properties into component parameters
   */
  private parseCSSPropertiesIntoParameters(cssText: string, component: ComponentInstance): void {
    const properties = cssText.split(';');
    
    properties.forEach(prop => {
      const [key, value] = prop.split(':').map(s => s.trim());
      if (!key || !value) return;
      
      // Map CSS properties to component parameters
      switch (key) {
        case 'background-color':
          component.parameters['backgroundColor'] = value;
          break;
        case 'color':
          component.parameters['textColor'] = value;
          break;
        case 'font-size':
          component.parameters['fontSize'] = value;
          break;
        case 'font-family':
          component.parameters['fontFamily'] = value;
          break;
        case 'border-radius':
          component.parameters['borderRadius'] = value;
          break;
        case 'padding':
          component.parameters['padding'] = value;
          break;
        case 'margin':
          component.parameters['margin'] = value;
          break;
      }
    });
  }

  /**
   * Inject HTML content into the canvas
   */
  private async injectWebsiteHTML(htmlContent: string): Promise<void> {
    console.log(`🚀 [DEBUG] Injecting HTML content into canvas`);
    
    if (!htmlContent.trim()) {
      console.log(`🚀 [DEBUG] HTML content is empty`);
      return;
    }

    try {
      // Create a container for the website content
      const canvasElement = this.canvasElement?.nativeElement;
      if (!canvasElement) {
        console.error(`🚀 [DEBUG] Canvas element not found`);
        return;
      }

      // Clear existing content
      const existingWebsiteContent = canvasElement.querySelector('.website-source-content');
      if (existingWebsiteContent) {
        existingWebsiteContent.remove();
      }

      // Create container for website source
      const websiteContainer = document.createElement('div');
      websiteContainer.className = 'website-source-content';
      websiteContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        overflow: auto;
        background: white;
        z-index: 1;
      `;

      // Extract body content if it's a full HTML document
      let contentToInject = htmlContent;
      const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) {
        contentToInject = bodyMatch[1];
        console.log(`🚀 [DEBUG] Extracted body content`);
      }

      // Inject the content
      websiteContainer.innerHTML = contentToInject;
      canvasElement.appendChild(websiteContainer);

      console.log(`✅ Website source code rendered successfully`);
    } catch (error) {
      console.error(`🚀 [DEBUG] Error injecting HTML content:`, error);
    }
  }

  /**
   * Add sample components to empty pages for demonstration
   */
  addSampleComponentsToPage(): void {
    if (this.currentPageComponents.length === 0 && this.currentPageId) {
      console.log(`➕ Adding sample components to empty page: ${this.currentPageId}`);
      
      // Add a hero section component
      const heroComponent: ComponentInstance = {
        id: `sample_hero_${Date.now()}`,
        type: 'hero-section',
        x: 0,
        y: 0,
        width: 800,
        height: 400,
        zIndex: 1,
        parameters: {
          title: `Welcome to ${this.currentPageId.charAt(0).toUpperCase() + this.currentPageId.slice(1)} Page`,
          subtitle: 'This is a sample component added by the Enhanced Component System v3.0',
          buttonText: 'Get Started',
          buttonColor: '#3b82f6'
        }
      };

      // Add to current page
      const currentPage = this.pages.find(p => p.id === this.currentPageId);
      if (currentPage) {
        if (!currentPage.components) {
          currentPage.components = [];
        }
        currentPage.components.push(heroComponent);
        this.updateCurrentPageComponents();
        
        console.log('✅ Sample hero component added to page');
      }
    }
  }

  /**
   * Cleanup enhanced system
   */
  private cleanupEnhancedSystem(): void {
    console.log('🧹 Cleaning up Enhanced Component System');
  }

  // Initialize canvas operations (migrated from main component)
  private initializeCanvas(): void {
    this.initializePages();
    this.subscribeToPageChanges();
    this.loadApiComponentTypes();
    this.initializeEnhancedSystem();
  }

  // Initialize enhanced website builder system
  private enhancedSystemInitialized = false;
  
  private initializeEnhancedSystem(): void {
    console.log('🎯 Canvas: Initializing enhanced system with workspace ID:', this.currentWorkspaceId);
    if (this.currentWorkspaceId && !this.enhancedSystemInitialized) {
      console.log('🎯 Canvas: Setting up enhanced system subscriptions');
      
      // Subscribe to enhanced system observables
      this.subscriptions.push(
        this.enhancedWebsiteBuilder.currentPageComponents$.subscribe(components => {
          console.log('🎯 Canvas: Enhanced system components updated:', components.length);
          this.currentWorkspaceComponents = components;
          this.cdr.detectChanges();
        })
      );

      this.subscriptions.push(
        this.enhancedWebsiteBuilder.availableComponentTypes$.subscribe(types => {
          console.log('🎯 Canvas: Enhanced system component types updated:', types.length);
          this.availableComponentTypes = types;
          this.cdr.detectChanges();
        })
      );

      this.subscriptions.push(
        this.enhancedWebsiteBuilder.currentPageId$.subscribe(pageId => {
          console.log('🎯 Canvas: Enhanced system page ID changed to:', pageId);
          if (pageId && pageId !== this.currentPageId) {
            this.currentPageId = pageId;
            this.currentPageChange.emit(pageId);
            
            // Load page components when page changes
            if (this.currentWorkspaceId) {
              this.enhancedWebsiteBuilder.loadPage(this.currentWorkspaceId, pageId).catch(error => {
                console.error('❌ Error loading page components in enhanced system:', error);
              });
            }
            
            this.cdr.detectChanges();
          }
        })
      );

      // Initialize the enhanced builder
      console.log('🎯 Canvas: Calling enhanced builder initialization');
      this.enhancedWebsiteBuilder.initializeBuilder(this.currentWorkspaceId).catch(error => {
        console.error('Failed to initialize enhanced website builder:', error);
        this.toastService.error('Failed to initialize website builder', 'Initialization Error');
      });
      
      this.enhancedSystemInitialized = true;
    } else if (!this.currentWorkspaceId) {
      console.log('⚠️ Canvas: Cannot initialize enhanced system - no workspace ID');
    } else {
      console.log('⚠️ Canvas: Enhanced system already initialized');
    }
  }

  private loadApiComponentTypes(): void {
    // Load API component types if not already loaded
    if (!this.websiteBuilder.areApiComponentTypesLoaded()) {
      this.websiteBuilder.loadAndCacheApiComponentTypes().subscribe({
        next: (componentTypes) => {
          console.log('✅ API component types loaded:', componentTypes.length);
          this.apiComponentTypesLoaded = true;
          // Defer render contexts to next tick to ensure page data is ready
          setTimeout(() => this.updateComponentRenderContexts(), 0);
        },
        error: (error) => {
          console.error('❌ Error loading API component types:', error);
        }
      });
    } else {
      console.log('✅ API component types already loaded');
      this.apiComponentTypesLoaded = true;
      this.updateComponentRenderContexts();
    }
  }

  private initializePages(): void {
    // Create default home page if none exists
    if (this.pages.length === 0) {
      this.pages = [{
        id: 'home',
        name: 'Home',
        route: '/',
        isDeletable: false,
        isActive: true,
        components: []
      }];
    }
    
    this.updateCurrentPageComponents();
  }

  private subscribeToPageChanges(): void {
    // Subscribe to website builder page changes
    this.websiteBuilder.pages$.subscribe((pages: any[]) => {
      const safePages = Array.isArray(pages) ? pages : [];
      this.pages = safePages.map(page => ({
        ...page,
        isActive: page.id === this.currentPageId
      }));
      this.updateCurrentPageComponents();
      // Defer context update slightly to allow types/load to settle
      setTimeout(() => this.updateComponentRenderContexts(), 0);
    });

    this.websiteBuilder.currentPageId$.subscribe((pageId: string) => {
      this.currentPageId = pageId;
      this.updateCurrentPageComponents();
      this.currentPageChange.emit(pageId);
    });

    this.websiteBuilder.components$.subscribe((components: ComponentInstance[]) => {
      this.currentPageComponents = Array.isArray(components) ? components : [];
    });
  }

  updateCurrentPageComponents(): void {
    console.log(`🚀 [DEBUG] updateCurrentPageComponents called for page: ${this.currentPageId}`);
    console.log(`🚀 [DEBUG] Current workspace ID: ${this.currentWorkspaceId}`);
    console.log(`🚀 [DEBUG] Available pages:`, this.pages.map(p => ({ id: p.id, name: p.name, hasComponents: !!p.components, componentCount: p.components?.length || 0 })));
    
    const currentPage = this.pages.find(p => p.id === this.currentPageId);
    if (currentPage && currentPage.components && Array.isArray(currentPage.components) && currentPage.components.length > 0) {
      // Page has components in memory
      this.currentPageComponents = currentPage.components;
      console.log(`📄 Loading ${this.currentPageComponents.length} components for page: ${this.currentPageId}`);
      this.updateComponentRenderContexts();
    } else {
      // Page has no components in memory OR components array is empty - try API
      if (this.currentWorkspaceId && this.currentPageId) {
        console.log(`🚀 [DEBUG] Page has no components (${currentPage?.components?.length || 0}), attempting to load from API...`);
        this.loadPageComponentsFromAPI();
      } else {
        // Handle missing workspace/page ID
        this.currentPageComponents = [];
        console.log(`📄 Cannot load components: missing workspace ID (${this.currentWorkspaceId}) or page ID (${this.currentPageId})`);
        this.componentRenderContexts = []; // Clear render contexts
      }
    }
  }

  /**
   * Load page components directly from API
   */
  private async loadPageComponentsFromAPI(): Promise<void> {
    if (!this.currentWorkspaceId || !this.currentPageId) {
      console.warn('🚀 [DEBUG] Cannot load components: missing workspace ID or page ID');
      return;
    }

    try {
      console.log(`🚀 [DEBUG] Loading components from API for page: ${this.currentPageId} in workspace: ${this.currentWorkspaceId}`);
      
      const components = await this.enhancedWebsiteBuilder.getPageComponents(this.currentWorkspaceId, this.currentPageId);
      console.log(`🚀 [DEBUG] API returned ${components.length} components`);
      
      if (components.length > 0) {
        // Convert API components to ComponentInstance format
        this.currentPageComponents = components.map(comp => ({
          id: comp.id,
          type: comp.componentType,
          x: comp.xPosition,
          y: comp.yPosition,
          width: comp.width,
          height: comp.height,
          zIndex: comp.zIndex,
          parameters: comp.parameters ? JSON.parse(comp.parameters) : {}
        }));
        
        console.log(`✅ Converted ${this.currentPageComponents.length} components for rendering`);
        this.updateComponentRenderContexts();
      } else {
        this.currentPageComponents = [];
        this.componentRenderContexts = [];
        console.log(`📄 No components found for page: ${this.currentPageId} - rendering from website source code`);
        console.log(`🚀 [DEBUG] *** TRIGGERING SOURCE CODE PARSING ***`);
        
        // Render from website source code instead of components
        await this.renderFromWebsiteSource();
      }
    } catch (error) {
      console.error(`🚀 [DEBUG] Error loading components from API:`, error);
      this.currentPageComponents = [];
      this.componentRenderContexts = [];
    }
  }

  // Enhanced Component Rendering Methods v3.0
  /**
   * Update render context for a single component (for parameter updates)
   */
  private updateSingleComponentRenderContext(component: ComponentInstance): void {
    if (!this.apiComponentTypesLoaded) {
      console.log('⏳ API component types not ready yet; deferring single component render');
      return;
    }

    const componentType = this.getApiComponentType(component.type);
    if (componentType) {
      // Remove existing render context for this component
      const existingIndex = this.componentRenderContexts.findIndex(ctx => ctx.component.id === component.id);
      
      // Convert instance and render using FAST rendering
      const modelComponent = this.convertToModelComponent(component);
      const renderContext = this.componentRenderer.renderComponentFast(componentType, modelComponent, true); // Force refresh
      
      // Apply styles immediately if available
      if (renderContext.appliedCSS) {
        this.injectComponentStyles(renderContext.appliedCSS, component.id);
      }
      
      if (existingIndex > -1) {
        // Replace existing render context
        this.componentRenderContexts[existingIndex] = renderContext;
      } else {
        // Add new render context
        this.componentRenderContexts.push(renderContext);
      }
      
      console.log('✅ Updated single component render context with styles:', component.id, component.type);
    } else {
      console.warn('❌ Component type not found for single update:', component.type);
    }
  }

  private updateComponentRenderContexts(): void {
    // Defer rendering until API component types are ready
    if (!this.apiComponentTypesLoaded) {
      console.log('⏳ API component types not ready yet; deferring render contexts');
      return;
    }

    this.componentRenderContexts = [];
    
    // Only log if there are actually components to render
    if (this.currentPageComponents.length > 0) {
      console.log('🚀 Enhanced v3.0: Updating component render contexts for', this.currentPageComponents.length, 'components');
    } else {
      console.log('📄 Current page has no components to render');
      return; // Exit early if no components
    }
    
    try {
      this.currentPageComponents.forEach(component => {
        const componentType = this.getApiComponentType(component.type);
        if (componentType) {
          console.log('✅ Found component type for', component.type, ':', componentType.name);
          
          // Convert instance and render using FAST rendering
          const modelComponent = this.convertToModelComponent(component);
          const renderContext = this.componentRenderer.renderComponentFast(componentType, modelComponent);
          
          // Apply styles immediately if available
          if (renderContext.appliedCSS) {
            this.injectComponentStyles(renderContext.appliedCSS, component.id);
          }
          
          // Check if this is a dynamic component (like accordion)
          const isDynamic = this.componentRenderer.isDynamicComponent(componentType);
          const behaviorType = this.componentRenderer.getComponentBehaviorType(componentType);
          
          if (isDynamic) {
            console.log('🎭 Dynamic component detected:', {
              name: componentType.name,
              id: componentType.id,
              behaviorType: behaviorType,
              hasAngularElements: renderContext.renderedHTML.includes('<p-accordion')
            });
          }
          
          this.componentRenderContexts.push(renderContext);
          
          console.log('⚡ Fast-rendered component:', component.type, 'with HTML length:', renderContext.renderedHTML.length);
        } else {
          console.warn('❌ Component type not found for:', component.type);
        }
      });
      
      console.log('📊 Total render contexts created:', this.componentRenderContexts.length);
      console.log('📈 Render performance:', this.componentRenderer.getPerformanceStats());
    } catch (e) {
      console.error('❌ Error while building render contexts:', e);
    }
  }

  private convertToModelComponent(component: any): any {
    return {
      id: component.id,
      componentTypeId: component.type,
      parameters: { ...(component.properties || component.parameters || {}) },
      customStyles: component.customStyles || {},
      xPosition: component.x || 0,
      yPosition: component.y || 0,
      width: component.width || 100,
      height: component.height || 100,
      zIndex: component.zIndex || 1
    };
  }

  getComponentRenderContext(componentId: string): ComponentRenderContext | undefined {
    return this.componentRenderContexts.find(ctx => ctx.component.id === componentId);
  }

  getSafeHtml(componentId: string): SafeHtml {
    const renderContext = this.getComponentRenderContext(componentId);
    if (renderContext?.renderedHTML) {
      return this.domSanitizer.bypassSecurityTrustHtml(renderContext.renderedHTML);
    }
    return this.domSanitizer.bypassSecurityTrustHtml('<div>Loading...</div>');
  }

  // Scalable Angular component detection and handling
  isAngularComponent(componentType: string): boolean {
    // Only components that are actually implemented in the switch statement
    const angularComponentIds = [
      'prime-accordion-001'
    ];
    
    const isAngular = angularComponentIds.includes(componentType);
    
    // Debug log for accordion detection
    if (componentType === 'prime-accordion-001') {
      console.log('🎯 ACCORDION DETECTION:', {
        componentType,
        isAngular,
        angularComponentIds,
        message: isAngular ? 'Using Angular rendering' : 'Using static rendering'
      });
    }
    
    return isAngular;
  }

  // Generic parameter value getter for any component
  getComponentParameterValue(componentId: string, paramName: string): any {
    const component = this.currentPageComponents.find(c => c.id === componentId);
    if (!component) return null;
    
    const renderContext = this.getComponentRenderContext(componentId);
    if (renderContext?.parameters) {
      return renderContext.parameters[paramName];
    }
    
    // Fallback to component parameters
    return component.parameters[paramName];
  }

  // Get accordion value for proper PrimeNG binding
  getAccordionValue(componentId: string): string[] {
    const component = this.currentPageComponents.find(c => c.id === componentId);
    if (!component) {
      console.warn('🎭 Component not found for accordion value:', componentId);
      return [];
    }

    // Get from component parameters directly for most up-to-date value
    const isExpanded = component.parameters?.['isExpanded'] ?? false;
    const result = isExpanded ? ['0'] : [];
    
    // Debug log for accordion state
    console.log('🎭 ACCORDION VALUE:', {
      componentId,
      isExpanded,
      result,
      componentParameters: component.parameters
    });
    
    return result;
  }

  // Handle accordion toggle interactions
  onAccordionToggle(componentId: string, event: any): void {
    console.log('🎭 ACCORDION TOGGLE EVENT FIRED!:', { 
      componentId, 
      event, 
      eventType: typeof event,
      timestamp: new Date().toISOString()
    });
    
    // PrimeNG accordion valueChange gives us the array of expanded panel values
    // If panel "0" is in the array, it's expanded; if not, it's collapsed
    const isExpanded = Array.isArray(event) && event.includes('0');
    
    console.log('🎭 ACCORDION NEW STATE:', { 
      componentId, 
      event,
      isExpanded,
      eventArray: event
    });
    
    // Update the component parameter directly
    const component = this.currentPageComponents.find(c => c.id === componentId);
    if (component) {
      if (!component.parameters) {
        component.parameters = {};
      }
      
      component.parameters['isExpanded'] = isExpanded;
      
      // Update the websiteBuilder service state
      this.websiteBuilder.updateComponent(componentId, { 
        parameters: { ...component.parameters } 
      });
      
      // Manually trigger change detection to update the view
      this.cdr.detectChanges();
      
      console.log('✅ ACCORDION SUCCESSFULLY UPDATED:', { 
        componentId, 
        isExpanded,
        newParameters: component.parameters,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('❌ Component not found for accordion toggle:', componentId);
    }
  }

  isNewComponentSystem(componentType: string): boolean {
    // All components should use the new dynamic system
    return true;
  }

  // Page Management (migrated from main component)
  onPageTabClick(pageId: string): void {
    this.currentPageId = pageId;
    this.pages.forEach(page => {
      page.isActive = page.id === pageId;
    });
    this.updateCurrentPageComponents();
    
    // Notify legacy website builder service
    this.websiteBuilder.setCurrentPage(pageId);
    
    // Load page in enhanced system
    if (this.currentWorkspaceId) {
      this.enhancedWebsiteBuilder.loadPage(this.currentWorkspaceId, pageId).catch(error => {
        console.error('❌ Error loading page in enhanced system:', error);
      });
    }
    
    this.currentPageChange.emit(pageId);
  }

  onDeletePage(pageId: string): void {
    const pageIndex = this.pages.findIndex(p => p.id === pageId);
    if (pageIndex > -1 && this.pages[pageIndex].isDeletable) {
      this.pages.splice(pageIndex, 1);
      
      // Switch to home page if deleted page was active
      if (pageId === this.currentPageId) {
        this.onPageTabClick('home');
      }
      
      this.pageDataChange.emit(this.pages);
    }
  }

  onAddPage(): void {
    const newPageId = 'page_' + Math.random().toString(36).substr(2, 9);
    const newPage: Page = {
      id: newPageId,
      name: `Page ${this.pages.length}`,
      route: `/${newPageId}`,
      isDeletable: true,
      isActive: false,
      components: []
    };
    
    this.pages.push(newPage);
    this.pageDataChange.emit(this.pages);
  }

  onDeviceChange(device: string): void {
    this.selectedDevice = device;
  }

  // Preview functionality
  onPreviewClick(): void {
    if (!this.currentWorkspaceId) {
      this.toastService.error('No workspace selected for preview', 'Preview Error');
      return;
    }

    this.toastService.info('Loading website preview...', 'Generating Preview');
    
    this.generatePreview();
  }

  private async generatePreview(): Promise<void> {
    try {
      const apiUrl = `https://servicefuzzapi-atf8b4dqawc8dsa9.australiaeast-01.azurewebsites.net/api/websitefiles/workspace/${this.currentWorkspaceId}/preview`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      const previewData = await response.json();
      
      if (previewData && previewData.previewUrl) {
        // Check if it's a data URL with HTML content
        if (previewData.previewUrl.startsWith('data:text/html')) {
          // Extract and decode the HTML content from the data URL
          const htmlContent = decodeURIComponent(previewData.previewUrl.split(',')[1]);
          
          // Open a new window and write the HTML content to it
          const previewWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
          
          if (!previewWindow) {
            this.toastService.warning('Please allow popups and try again', 'Popup Blocked');
          } else {
            // Write the decoded HTML content to the new window
            previewWindow.document.open();
            previewWindow.document.write(htmlContent);
            previewWindow.document.close();
            this.toastService.success('Website preview opened in new window', 'Preview Opened');
          }
        } else {
          // Handle regular URLs
          const previewWindow = window.open(previewData.previewUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
          
          if (!previewWindow) {
            this.toastService.warning('Please allow popups and try again', 'Popup Blocked');
          } else {
            this.toastService.success('Website preview opened in new window', 'Preview Opened');
          }
        }
      } else {
        throw new Error('Invalid response: missing previewUrl');
      }
      
    } catch (error) {
      this.toastService.error(
        error instanceof Error ? error.message : 'Unknown error occurred',
        'Preview Failed'
      );
    }
  }

  // Drag & Drop Operations (updated for enhanced system)
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const componentData = event.dataTransfer?.getData('application/json');
    if (!componentData) return;

    try {
      const component = JSON.parse(componentData);
      const rect = this.canvasElement.nativeElement.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      console.log('🎯 Dropping component:', component);

      // Calculate smart positioning to avoid overlaps
      let finalX = Math.max(0, x - 50);
      let finalY = Math.max(80, y - 25); // Start below navigation bar
      
      // If dropping near existing components, offset position
      if (this.currentWorkspaceComponents.length > 0) {
        const componentAtPosition = this.currentWorkspaceComponents.find(c => 
          Math.abs(c.xPosition - finalX) < 50 && Math.abs(c.yPosition - finalY) < 50
        );
        
        if (componentAtPosition) {
          // Offset by 20px to create a cascade effect
          const offset = (this.currentWorkspaceComponents.length % 10) * 20;
          finalX += offset;
          finalY += offset;
        }
      }

      // Use enhanced website builder service to add component
      if (this.currentWorkspaceId) {
        this.addComponentUsingEnhancedSystem(component.id, finalX, finalY);
      } else {
        // Fallback to legacy system
        this.addComponentUsingLegacySystem(component, finalX, finalY);
      }
    } catch (error) {
      console.error('❌ Error processing drop:', error);
      this.toastService.error('Failed to add component to canvas', 'Drop Error');
    }
  }

  // Add component using enhanced system
  private async addComponentUsingEnhancedSystem(componentTypeId: string, x: number, y: number): Promise<void> {
    try {
      if (!this.currentWorkspaceId) {
        throw new Error('No workspace ID available');
      }

      const currentPageId = this.currentPageId;
      if (!currentPageId) {
        throw new Error('No current page selected');
      }

      console.log('🎯 Adding component via enhanced system:', {
        componentTypeId,
        workspaceId: this.currentWorkspaceId,
        pageId: currentPageId,
        position: { x, y }
      });

      const instanceId = await this.enhancedWebsiteBuilder.addComponentToPage(
        this.currentWorkspaceId,
        currentPageId,
        componentTypeId,
        { x, y }
      );

      console.log('✅ Component added via enhanced system:', instanceId);
      this.toastService.success('Component added successfully', 'Success');
    } catch (error: any) {
      console.error('❌ Error adding component via enhanced system:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to add component';
      if (error?.status === 400) {
        errorMessage = 'Invalid component data. Please check the component configuration.';
      } else if (error?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error?.status === 403) {
        errorMessage = 'Permission denied. You may not have access to this workspace.';
      } else if (error?.status === 404) {
        errorMessage = 'Component type not found. Please refresh and try again.';
      } else if (error?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      this.toastService.error(errorMessage, 'Error');
      
      // Fallback to legacy system if enhanced system fails
      console.log('🔄 Falling back to legacy system...');
      const component = { id: componentTypeId, defaultWidth: 300, defaultHeight: 200 };
      this.addComponentUsingLegacySystem(component, x, y);
    }
  }

  // Fallback to legacy system
  private addComponentUsingLegacySystem(component: any, finalX: number, finalY: number): void {
    try {
      // Get default parameters for the component
      const defaultParameters = this.getDefaultProps(component.id);
      console.log('⚙️ Default parameters for component:', defaultParameters);

      // Calculate next z-index (ensure components don't overlap in z-space)
      const currentPage = this.pages.find(p => p.id === this.currentPageId);
      const maxZIndex = currentPage && currentPage.components.length > 0 
        ? Math.max(...currentPage.components.map(c => c.zIndex)) 
        : 0;

      // Use website builder service to add component (ensures proper component management)
      try {
        const newInstance = this.websiteBuilder.addComponent(component.id, finalX, finalY);
        
        // Update z-index to ensure new component is on top
        this.websiteBuilder.updateComponent(newInstance.id, { zIndex: maxZIndex + 1 });
        
        console.log('📋 Component added via legacy website builder service:', newInstance);

        // Select the newly created component
        this.selectedComponentInstance = newInstance;
        this.componentInstanceSelectionChange.emit(newInstance);
        
        // Update local page data from website builder service
        this.websiteBuilder.pages$.subscribe(pages => {
          this.pages = pages;
          this.pageDataChange.emit(this.pages);
        });
        
        console.log('✅ Component added to page and selected via legacy system:', newInstance);
      } catch (error) {
        console.error('❌ Error adding component via legacy website builder service:', error);
        // Fallback to manual addition if service fails
        console.log('🔄 Falling back to manual component addition...');

        // Create new component instance with proper positioning and z-index
        const newInstance: ComponentInstance = {
          id: this.generateUniqueId(),
          type: component.id,
          x: finalX,
          y: finalY,
          width: component.defaultWidth || 300,
          height: component.defaultHeight || 100,
          zIndex: maxZIndex + 1, // Ensure new component is on top
          parameters: defaultParameters
        };

        console.log('📋 Created new component instance manually:', newInstance);

        // Add to current page
        const currentPage = this.pages.find(p => p.id === this.currentPageId);
        if (currentPage) {
          currentPage.components.push(newInstance);
          this.updateCurrentPageComponents();
          this.pageDataChange.emit(this.pages);
          
          // Select the newly created component
          this.selectedComponentInstance = newInstance;
          this.componentInstanceSelectionChange.emit(newInstance);
          
          console.log('✅ Component added to page and selected manually:', newInstance);
        }
      }
    } catch (error) {
      console.error('❌ Error in legacy component addition:', error);
      this.toastService.error('Failed to add component', 'Legacy System Error');
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  private getDefaultProps(componentType: string): any {
    console.log('🔍 Getting default props for component type:', componentType);
    
    // Check if it's an API component first
    const componentDef = this.getComponentDefinition(componentType);
    if (componentDef) {
      console.log('✅ Found API component definition:', componentDef.name);
      const defaultProps: any = {};
      componentDef.parameters.forEach(param => {
        defaultProps[param.name] = param.defaultValue;
      });
      console.log('⚙️ API component default props:', defaultProps);
      return defaultProps;
    }

    console.log('❌ No component definition found for:', componentType);
    return {};
  }

  // Component Selection (migrated from main component)
  selectBuiltInNavigationHandler(): void {
    const builtInNavInstance = {
      id: 'built-in-nav',
      type: 'built-in-navigation',
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      zIndex: 0,
      parameters: this.builtInNavProperties
    };
    this.selectedComponentInstance = builtInNavInstance;
    this.componentInstanceSelectionChange.emit(builtInNavInstance);
  }

  // Select component instance
  selectComponentInstanceHandler(instance: ComponentInstance, event: MouseEvent): void {
    // Don't interfere with accordion header/content interactions
    if (instance.type === 'prime-accordion-001') {
      const target = event.target as HTMLElement;
      
      // Only select component if clicking outside accordion interactive elements
      if (!target.closest('p-accordion-header') && !target.closest('p-accordion-content')) {
        event.stopPropagation();
        this.selectedComponentInstance = instance;
        this.componentInstanceSelectionChange.emit(instance);
        console.log('🎯 Accordion component selected via wrapper click');
      } else {
        console.log('🎭 Ignoring click on accordion interactive area');
        // Let accordion handle its own clicks
        return;
      }
    } else {
      // Normal component selection
      event.stopPropagation();
      this.selectedComponentInstance = instance;
      this.componentInstanceSelectionChange.emit(instance);
    }
  }

  handleComponentClick(instance: ComponentInstance, event: Event): void {
    event.stopPropagation();
    console.log('🔍 Component clicked:', instance.type, instance.id);
    
    this.selectComponentInstanceHandler(instance, event as MouseEvent);
    
    // Handle any special component behaviors
    const properties = instance.parameters || {};
    
    // Handle button navigation
    if (instance.type === 'button' && properties['navigateTo']) {
      const navigateTo = properties['navigateTo'];
      const customUrl = properties['customUrl'] || '';
      const openInNewTab = properties['openInNewTab'] || false;
      
      this.handleButtonNavigation(navigateTo, customUrl, openInNewTab);
    }
  }

  // Handle selection for Angular components without blocking their functionality
  handleAngularComponentSelection(instance: ComponentInstance, event: Event): void {
    // Only select on background clicks, not on PrimeNG component clicks
    const target = event.target as HTMLElement;
    
    // If clicking on PrimeNG component elements, don't interfere
    if (target.closest('p-accordion, p-button, p-card, p-dialog, p-table, p-tabs, p-progressbar, p-carousel, p-timeline, p-chip, p-avatar, p-badge, p-tag, p-divider')) {
      return; // Let PrimeNG handle the click
    }
    
    // Only select if clicking on the wrapper itself
    if (target.classList.contains('angular-component-wrapper')) {
      event.stopPropagation();
      this.selectComponentInstanceHandler(instance, event as MouseEvent);
    }
  }

  // Handle drag for Angular components
  handleAngularComponentDrag(instance: ComponentInstance, event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    // Only allow drag from wrapper background, not from PrimeNG components
    if (target.closest('p-accordion, p-button, p-card, p-dialog, p-table, p-tabs, p-progressbar, p-carousel, p-timeline, p-chip, p-avatar, p-badge, p-tag, p-divider')) {
      return; // Don't interfere with PrimeNG component interactions
    }
    
    // Only drag if clicking on the wrapper itself
    if (target.classList.contains('angular-component-wrapper')) {
      this.startDragHandler(event, instance);
    }
  }

  private handleButtonNavigation(navigateTo: string, customUrl: string, openInNewTab: boolean): void {
    let targetUrl = '';
    
    if (customUrl) {
      targetUrl = customUrl;
    } else if (navigateTo) {
      // Check if it's a page ID
      const targetPage = this.pages.find(p => p.id === navigateTo);
      if (targetPage) {
        targetUrl = targetPage.route;
      }
    }
    
    if (targetUrl) {
      if (openInNewTab) {
        window.open(targetUrl, '_blank');
      } else {
        // Use Angular router or simple navigation
        if (targetUrl.startsWith('http') || targetUrl.startsWith('//')) {
          window.location.href = targetUrl;
        } else {
          // Internal navigation - emit event to parent to handle routing
          this.onNavigationClick(new Event('click'), navigateTo);
        }
      }
    }
  }

  // Component Manipulation (migrated from main component)
  startDragHandler(event: MouseEvent, instance: ComponentInstance): void {
    this.isDragging = true;
    this.dragStart = { x: event.clientX - instance.x, y: event.clientY - instance.y };

    const mouseMoveHandler = (e: MouseEvent) => {
      if (this.isDragging) {
        instance.x = e.clientX - this.dragStart.x;
        instance.y = e.clientY - this.dragStart.y;
        
        // Keep component within canvas bounds
        instance.x = Math.max(0, Math.min(instance.x, this.canvasElement.nativeElement.clientWidth - instance.width));
        instance.y = Math.max(0, Math.min(instance.y, this.canvasElement.nativeElement.clientHeight - instance.height));
      }
    };

    const mouseUpHandler = () => {
      this.isDragging = false;
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
      
      // Update source code after drag
      this.updateWebsiteSourceAfterModification(instance);
      
      this.pageDataChange.emit(this.pages);
    };

    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
  }

  startResizeHandler(event: MouseEvent, instance: ComponentInstance, direction: string): void {
    event.stopPropagation();
    this.isResizing = true;
    this.resizeMode = direction;
    this.dragStart = { x: event.clientX, y: event.clientY };

    const mouseMoveHandler = (e: MouseEvent) => {
      if (this.isResizing) {
        this.handleResize(e, instance, direction);
      }
    };

    const mouseUpHandler = () => {
      this.isResizing = false;
      this.resizeMode = '';
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
      
      // Update source code after resize
      this.updateWebsiteSourceAfterModification(instance);
      
      this.pageDataChange.emit(this.pages);
    };

    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
  }

  private handleResize(event: MouseEvent, instance: ComponentInstance, mode: string): void {
    const deltaX = event.clientX - this.dragStart.x;
    const deltaY = event.clientY - this.dragStart.y;

    switch (mode) {
      case 'se': // Southeast
        instance.width = Math.max(50, instance.width + deltaX);
        instance.height = Math.max(30, instance.height + deltaY);
        break;
      case 'sw': // Southwest
        const newWidth = Math.max(50, instance.width - deltaX);
        instance.x = instance.x + instance.width - newWidth;
        instance.width = newWidth;
        instance.height = Math.max(30, instance.height + deltaY);
        break;
      case 'ne': // Northeast
        instance.width = Math.max(50, instance.width + deltaX);
        const newHeight = Math.max(30, instance.height - deltaY);
        instance.y = instance.y + instance.height - newHeight;
        instance.height = newHeight;
        break;
      case 'nw': // Northwest
        const newW = Math.max(50, instance.width - deltaX);
        const newH = Math.max(30, instance.height - deltaY);
        instance.x = instance.x + instance.width - newW;
        instance.y = instance.y + instance.height - newH;
        instance.width = newW;
        instance.height = newH;
        break;
    }

    this.dragStart = { x: event.clientX, y: event.clientY };
  }

  deleteComponentHandler(event: Event, instanceId: string): void {
    event.stopPropagation();
    
    console.log('🗑️ Deleting component:', instanceId);
    
    // Try enhanced system first
    if (this.currentWorkspaceId && this.apiComponentTypesLoaded) {
      this.deleteComponentUsingEnhancedSystem(instanceId);
      return;
    }
    
    // Fallback to legacy system
    console.log('⚠️ Using legacy deletion system for component:', instanceId);
    const currentPage = this.pages.find(p => p.id === this.currentPageId);
    if (currentPage) {
      const componentIndex = currentPage.components.findIndex(c => c.id === instanceId);
      if (componentIndex > -1) {
        const deletedComponent = currentPage.components[componentIndex];
        currentPage.components.splice(componentIndex, 1);
        
        // Clear selection if deleted component was selected
        if (this.selectedComponentInstance?.id === instanceId) {
          this.selectedComponentInstance = null;
          this.componentInstanceSelectionChange.emit(null);
        }

        // Remove component styles
        this.removeComponentStyles(instanceId);
        
        // Remove from render contexts
        const renderContextIndex = this.componentRenderContexts.findIndex(ctx => ctx.component.id === instanceId);
        if (renderContextIndex > -1) {
          this.componentRenderContexts.splice(renderContextIndex, 1);
        }
        
        // Clear render cache for this component
        this.componentRenderer.clearRenderCache(deletedComponent.type);

        // Update source code to remove the component
        this.updateWebsiteSourceAfterDelete(deletedComponent);
        
        this.updateCurrentPageComponents();
        this.pageDataChange.emit(this.pages);
        
        // Force change detection
        this.cdr.detectChanges();
        
        console.log('✅ Component deleted successfully:', instanceId);
        this.toastService.success('Component deleted successfully', 'Success');
      }
    }
  }

  /**
   * Delete component using enhanced system
   */
  private async deleteComponentUsingEnhancedSystem(instanceId: string): Promise<void> {
    try {
      console.log('🗑️ Deleting component using enhanced system:', instanceId);
      
      // Find the component in current workspace components
      const component = this.currentWorkspaceComponents.find(c => c.id === instanceId);
      if (!component) {
        console.error('❌ Component not found in workspace components:', instanceId);
        this.toastService.error('Component not found', 'Error');
        return;
      }
      
      // Delete from backend
      await this.enhancedWebsiteBuilder.deleteComponent(instanceId);
      
      // Remove from local state
      this.currentWorkspaceComponents = this.currentWorkspaceComponents.filter(c => c.id !== instanceId);
      
      // Clear selection if deleted component was selected
      if (this.selectedComponentInstance?.id === instanceId) {
        this.selectedComponentInstance = null;
        this.componentInstanceSelectionChange.emit(null);
      }

      // Remove component styles
      this.removeComponentStyles(instanceId);
      
      // Remove from render contexts
      this.componentRenderContexts = this.componentRenderContexts.filter(ctx => ctx.component.id !== instanceId);
      
      // Clear render cache for this component type
      this.componentRenderer.clearRenderCache(component.componentType);
      
      // Remove from DOM
      const element = document.querySelector(`[data-instance-id="${instanceId}"]`);
      if (element) {
        element.remove();
      }
      
      // Force change detection
      this.cdr.detectChanges();
      
      console.log('✅ Component deleted successfully using enhanced system:', instanceId);
      this.toastService.success('Component deleted successfully', 'Success');
      
    } catch (error) {
      console.error('❌ Error deleting component using enhanced system:', error);
      this.toastService.error('Failed to delete component', 'Error');
    }
  }

  // Navigation Handling (migrated from main component)
  onNavigationClick(event: Event, pageId: string): void {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('🧭 Navigation clicked:', pageId);
    
    // Update current page
    this.currentPageId = pageId;
    
    // Update page active states
    this.pages.forEach(page => {
      page.isActive = page.id === pageId;
    });
    
    // Update current page components
    this.updateCurrentPageComponents();
    
    // Notify website builder service (legacy)
    this.websiteBuilder.setCurrentPage(pageId);
    
    // Load page in enhanced system
    if (this.currentWorkspaceId) {
      this.enhancedWebsiteBuilder.loadPage(this.currentWorkspaceId, pageId).catch(error => {
        console.error('❌ Error loading page in enhanced system:', error);
      });
    }
    
    // Emit navigation event to parent
    this.navigationClick.emit({ event: event as MouseEvent, pageId });
    this.currentPageChange.emit(pageId);
    
    // Clear component selection when navigating to new page
    this.selectedComponentInstance = null;
    this.componentInstanceSelectionChange.emit(null);
    
    console.log('✅ Navigation updated to page:', pageId);
  }

  // Utility Methods (migrated from main component)
  private generateUniqueId(): string {
    return 'comp_' + Math.random().toString(36).substr(2, 9);
  }

  getPageById(pageId: string): Page | undefined {
    return this.pages.find(page => page.id === pageId);
  }

  getComponentsCount(): number {
    return this.currentPageComponents.length;
  }

  trackByInstanceId(index: number, instance: ComponentInstance): string {
    return instance.id;
  }

  getArrayFromNumber(count: number): number[] {
    return Array(count).fill(0).map((_, i) => i);
  }

  // Component Property Helpers (delegate to service)
  getComponentDefinition(componentType: string): ComponentDefinition | undefined {
    return this.websiteBuilder.getComponentDefinition(componentType);
  }

  getApiComponentType(componentType: string): ComponentType | undefined {
    return this.websiteBuilder.getCachedApiComponentTypes().find(comp => comp.id === componentType);
  }

  getApiComponentTypeParameters(componentType: string): ComponentParameter[] {
    console.log('🔍 Canvas: Getting API component type parameters for:', componentType);
    const apiComponent = this.getApiComponentType(componentType);
    console.log('📋 Canvas: Found API component:', apiComponent);
    
    if (apiComponent && apiComponent.parametersSchema) {
      try {
        console.log('📝 Canvas: Raw parameters schema:', apiComponent.parametersSchema);
        
        // The parametersSchema is a JSON string, parse it directly
        let parameters;
        if (typeof apiComponent.parametersSchema === 'string') {
          parameters = JSON.parse(apiComponent.parametersSchema);
        } else {
          parameters = apiComponent.parametersSchema;
        }
        
        console.log('📄 Canvas: Parsed parameters:', parameters);
        
        // If it's an array, return it directly
        if (Array.isArray(parameters)) {
          console.log('⚙️ Canvas: Extracted parameters (array):', parameters);
          return parameters;
        }
        
        // If it's an object with parameters property, extract it
        if (parameters && parameters.parameters) {
          console.log('⚙️ Canvas: Extracted parameters (object.parameters):', parameters.parameters);
          return parameters.parameters;
        }
        
        console.log('⚠️ Canvas: Parameters schema format not recognized, returning empty array');
        return [];
        
      } catch (error) {
        console.error('❌ Canvas: Error parsing parameters schema:', error);
        console.error('📝 Canvas: Schema content was:', apiComponent.parametersSchema);
      }
    } else {
      console.log('❌ Canvas: No API component found or no parameters schema for:', componentType);
    }
    return [];
  }

  isApiComponent(componentType: string): boolean {
    return this.websiteBuilder.getCachedApiComponentTypes().some(comp => comp.id === componentType);
  }

  getParameterValue(instance: ComponentInstance, paramName: string): any {
    return instance.parameters?.[paramName] || this.getDefaultParameterValue(instance.type, paramName);
  }

  private getDefaultParameterValue(componentType: string, paramName: string): any {
    const componentDef = this.getComponentDefinition(componentType);
    if (componentDef) {
      const param = componentDef.parameters.find(p => p.name === paramName);
      return param?.defaultValue;
    }

    const apiComponentParams = this.getApiComponentTypeParameters(componentType);
    if (apiComponentParams.length > 0) {
      const param = apiComponentParams.find((p: ComponentParameter) => p.name === paramName);
      return param?.defaultValue;
    }

    return '';
  }

  // Parameter Type Helpers (adjusted for ComponentParameter interface)
  isTextInputParameter(param: ComponentParameter): boolean {
    return param.type === 'text';
  }

  getInputTypeFromParameter(param: ComponentParameter): string {
    switch (param.type) {
      case 'text': return 'text';
      case 'number': return 'number';
      case 'color': return 'color';
      default: return 'text';
    }
  }

  isButtonParameter(param: ComponentParameter): boolean {
    return param.name.toLowerCase().includes('button');
  }

  isImageParameter(param: ComponentParameter): boolean {
    return param.type === 'image' || param.type === 'image-asset';
  }

  isRatingParameter(param: ComponentParameter): boolean {
    return param.name.toLowerCase().includes('rating');
  }

  isProgressParameter(param: ComponentParameter): boolean {
    return param.name.toLowerCase().includes('progress');
  }

  isTextContentParameter(param: ComponentParameter): boolean {
    return param.name.toLowerCase().includes('content');
  }

  isLargeTextParameter(param: ComponentParameter): boolean {
    return param.name.toLowerCase().includes('title') || param.name.toLowerCase().includes('heading');
  }

  isMediumTextParameter(param: ComponentParameter): boolean {
    return param.name.toLowerCase().includes('subtitle');
  }

  isRegularTextParameter(param: ComponentParameter): boolean {
    return param.type === 'text' && !this.isLargeTextParameter(param) && !this.isMediumTextParameter(param);
  }

  isColorParameter(param: ComponentParameter): boolean {
    return param.type === 'color';
  }

  // Styling Helpers (migrated from main component)
  getAvatarSize(size: string): 'normal' | 'large' | 'xlarge' {
    switch (size) {
      case 'small': return 'normal';
      case 'normal': return 'normal';
      case 'large': return 'large';
      default: return 'normal';
    }
  }

  getImageLogoSize(size: string): string {
    switch (size) {
      case 'small': return '24px';
      case 'normal': return '32px';
      case 'large': return '48px';
      default: return '32px';
    }
  }

  getLogoSize(size: string): string {
    switch (size) {
      case 'small': return '20px';
      case 'normal': return '24px';
      case 'large': return '32px';
      default: return '24px';
    }
  }

  getButtonPadding(size: string): string {
    switch (size) {
      case 'small': return '4px 8px';
      case 'normal': return '8px 16px';
      case 'large': return '12px 24px';
      default: return '8px 16px';
    }
  }

  getButtonFontSize(size: string): string {
    switch (size) {
      case 'small': return '12px';
      case 'normal': return '14px';
      case 'large': return '16px';
      default: return '14px';
    }
  }

  generateStars(rating: number): string {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '⭐'.repeat(fullStars);
    if (hasHalfStar) {
      stars += '⭐';
    }
    stars += '☆'.repeat(emptyStars);
    
    return stars;
  }

  getRatingStars(rating: number): string {
    return this.generateStars(rating);
  }

  getOrderStatusColor(status: string): string {
    switch (status?.toLowerCase()) {
      case 'completed': return '#28a745';
      case 'cancelled': return '#dc3545';
      case 'pending': return '#ffc107';
      case 'upcoming': return '#007bff';
      case 'processing': return '#17a2b8';
      case 'confirmed': return '#6f42c1';
      default: return '#6c757d';
    }
  }

  getAlertBackgroundColor(type: string): string {
    switch (type) {
      case 'success': return '#d4edda';
      case 'warning': return '#fff3cd';
      case 'error': return '#f8d7da';
      case 'danger': return '#f8d7da';
      default: return '#d1ecf1';
    }
  }

  getAlertBorderColor(type: string): string {
    switch (type) {
      case 'success': return '#c3e6cb';
      case 'warning': return '#ffeaa7';
      case 'error': return '#f5c6cb';
      case 'danger': return '#f5c6cb';
      default: return '#bee5eb';
    }
  }

  getAlertTextColor(type: string): string {
    switch (type) {
      case 'success': return '#155724';
      case 'warning': return '#856404';
      case 'error': return '#721c24';
      case 'danger': return '#721c24';
      default: return '#0c5460';
    }
  }

  getAlertIcon(type: string): string {
    switch (type) {
      case 'success': return 'pi pi-check-circle';
      case 'warning': return 'pi pi-exclamation-triangle';
      case 'error': return 'pi pi-times-circle';
      case 'danger': return 'pi pi-times-circle';
      default: return 'pi pi-info-circle';
    }
  }

  // Method to load existing page data
  loadPageData(pages: Page[]): void {
    this.pages = pages;
    this.updateCurrentPageComponents();
  }


  // Method to refresh canvas after AI updates
  refreshCanvas(): void {
    console.log('🔄 Refreshing canvas after AI update');
    this.updateCurrentPageComponents();
    this.cdr.detectChanges();
  }

  /**
   * Update website source code after component deletion
   */
  private async updateWebsiteSourceAfterDelete(deletedComponent: ComponentInstance): Promise<void> {
    try {
      console.log(`🚀 [DEBUG] Updating source code after deleting component: ${deletedComponent.id}`);
      
      const websiteFilesService = this.injector.get(WebsiteFilesService);
      if (!this.currentWorkspaceId) return;
      const files = await websiteFilesService.getFiles(this.currentWorkspaceId).toPromise();
      
      if (!files) return;

      const pageFileName = this.currentPageId === 'home' ? 'index.html' : `${this.currentPageId}.html`;
      const htmlFile = files.find(f => f.fileName === pageFileName);
      
      if (!htmlFile || !htmlFile.content) return;

      // Remove component from HTML
      let updatedHtml = this.removeComponentFromHTML(htmlFile.content, deletedComponent);
      
      // Update the file
      await websiteFilesService.updateFile(htmlFile.id, updatedHtml).toPromise();
      
      console.log(`✅ Source code updated after component deletion`);
      
    } catch (error) {
      console.error(`🚀 [DEBUG] Error updating source code after deletion:`, error);
    }
  }

  /**
   * Update website source code after component modification
   */
  private async updateWebsiteSourceAfterModification(modifiedComponent: ComponentInstance): Promise<void> {
    try {
      console.log(`🚀 [DEBUG] Updating source code after modifying component: ${modifiedComponent.id}`);
      
      const websiteFilesService = this.injector.get(WebsiteFilesService);
      if (!this.currentWorkspaceId) return;
      const files = await websiteFilesService.getFiles(this.currentWorkspaceId).toPromise();
      
      if (!files) return;

      const pageFileName = this.currentPageId === 'home' ? 'index.html' : `${this.currentPageId}.html`;
      const htmlFile = files.find(f => f.fileName === pageFileName);
      
      if (!htmlFile || !htmlFile.content) return;

      // Update component in HTML
      let updatedHtml = this.updateComponentInHTML(htmlFile.content, modifiedComponent);
      
      // Update CSS if needed
      const cssFile = files.find(f => f.fileName.endsWith('.css'));
      if (cssFile && cssFile.content) {
        let updatedCss = this.updateComponentInCSS(cssFile.content, modifiedComponent);
        await websiteFilesService.updateFile(cssFile.id, updatedCss).toPromise();
      }
      
      // Update the HTML file
      await websiteFilesService.updateFile(htmlFile.id, updatedHtml).toPromise();
      
      console.log(`✅ Source code updated after component modification`);
      
    } catch (error) {
      console.error(`🚀 [DEBUG] Error updating source code after modification:`, error);
    }
  }

  /**
   * Remove component from HTML source code
   */
  private removeComponentFromHTML(htmlContent: string, component: ComponentInstance): string {
    // Remove by ID
    let updatedHtml = htmlContent.replace(new RegExp(`<[^>]*id="${component.id}"[^>]*>.*?</[^>]*>`, 'gs'), '');
    
    // Remove by data-component-id
    updatedHtml = updatedHtml.replace(new RegExp(`<[^>]*data-component-id="${component.id}"[^>]*>.*?</[^>]*>`, 'gs'), '');
    
    // Remove component comments
    updatedHtml = updatedHtml.replace(new RegExp(`<!--\\s*COMPONENT:\\s*\\{[^}]*"id"\\s*:\\s*"${component.id}"[^}]*\\}\\s*-->`, 'gs'), '');
    
    return updatedHtml;
  }

  /**
   * Update component in HTML source code
   */
  private updateComponentInHTML(htmlContent: string, component: ComponentInstance): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // Find the component element
    let element = doc.getElementById(component.id) || 
                  doc.querySelector(`[data-component-id="${component.id}"]`);
    
    if (element) {
      // Update data attributes
      element.setAttribute('data-component-id', component.id);
      element.setAttribute('data-component-type', component.type);
      element.setAttribute('data-x', component.x.toString());
      element.setAttribute('data-y', component.y.toString());
      element.setAttribute('data-width', component.width.toString());
      element.setAttribute('data-height', component.height.toString());
      element.setAttribute('data-z-index', component.zIndex.toString());
      
      // Update parameters as data attributes
      Object.entries(component.parameters).forEach(([key, value]) => {
        element!.setAttribute(`data-param-${key}`, value.toString());
      });
      
      // Update content based on component type
      this.updateElementContent(element, component);
    } else {
      // Component doesn't exist in HTML, add it
      this.addComponentToHTML(doc, component);
    }
    
    return doc.documentElement.outerHTML;
  }

  /**
   * Update element content based on component parameters
   */
  private updateElementContent(element: Element, component: ComponentInstance): void {
    try {
      const params = component.parameters;
      
      // Get the component type and re-render the content
      const componentType = this.getApiComponentType(component.type);
      if (componentType) {
        const modelComponent = this.convertToModelComponent(component);
        const renderContext = this.componentRenderer.renderComponentFast(componentType, modelComponent, true);
        
        // Update the element's inner HTML with the new rendered content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = renderContext.renderedHTML;
        const newContent = tempDiv.firstElementChild;
        
        if (newContent) {
          // Preserve the outer element but update its content
          element.innerHTML = newContent.innerHTML;
          
          // Copy any new attributes from the rendered content (except positioning ones)
          Array.from(newContent.attributes).forEach(attr => {
            if (!['id', 'data-component-id', 'data-instance-id', 'style', 'data-x', 'data-y', 'data-width', 'data-height', 'data-z-index'].includes(attr.name)) {
              element.setAttribute(attr.name, attr.value);
            }
          });
          
          // Re-inject component styles if available
          if (renderContext.appliedCSS) {
            this.injectComponentStyles(renderContext.appliedCSS, component.id);
            console.log('💄 Re-injected styles for component:', component.id);
          }
          
          console.log('✅ Updated element content using enhanced rendering:', component.id);
          return;
        }
      }
      
      // Fallback to legacy parameter-based updates
      console.log('⚠️ Using fallback content update for:', component.type);
      
      // Update text content
      if (params['text'] || params['content'] || params['title']) {
        element.textContent = params['text'] || params['content'] || params['title'];
      }
      
      // Update specific element attributes
      if (element.tagName === 'IMG' && params['src']) {
        element.setAttribute('src', params['src']);
        if (params['alt']) element.setAttribute('alt', params['alt']);
      }
      
      if (element.tagName === 'A' && params['href']) {
        element.setAttribute('href', params['href']);
        if (params['target']) element.setAttribute('target', params['target']);
      }
      
      // Update inline styles with enhanced parameter support
      let styleString = element.getAttribute('style') || '';
      
      // Color parameters
      if (params['backgroundColor']) styleString = this.updateStyleProperty(styleString, 'background-color', params['backgroundColor']);
      if (params['textColor']) styleString = this.updateStyleProperty(styleString, 'color', params['textColor']);
      
      // Typography parameters
      if (params['fontSize']) styleString = this.updateStyleProperty(styleString, 'font-size', params['fontSize'] + (typeof params['fontSize'] === 'number' ? 'px' : ''));
      if (params['fontFamily']) styleString = this.updateStyleProperty(styleString, 'font-family', params['fontFamily']);
      if (params['lineHeight']) styleString = this.updateStyleProperty(styleString, 'line-height', params['lineHeight']);
      if (params['textAlign']) styleString = this.updateStyleProperty(styleString, 'text-align', params['textAlign']);
      
      // Layout parameters
      if (params['padding']) styleString = this.updateStyleProperty(styleString, 'padding', params['padding'] + (typeof params['padding'] === 'number' ? 'px' : ''));
      if (params['borderRadius']) styleString = this.updateStyleProperty(styleString, 'border-radius', params['borderRadius'] + (typeof params['borderRadius'] === 'number' ? 'px' : ''));
      
      element.setAttribute('style', styleString);
      
    } catch (error) {
      console.error('❌ Error updating element content:', error);
    }
  }

  /**
   * Update a specific CSS property in a style string
   */
  private updateStyleProperty(styleString: string, property: string, value: string): string {
    const regex = new RegExp(`${property}\\s*:\\s*[^;]+;?`, 'i');
    const newProperty = `${property}: ${value};`;
    
    if (regex.test(styleString)) {
      return styleString.replace(regex, newProperty);
    } else {
      return styleString + (styleString.endsWith(';') ? ' ' : '; ') + newProperty;
    }
  }

  /**
   * Add new component to HTML
   */
  private addComponentToHTML(doc: Document, component: ComponentInstance): void {
    const element = this.createElementForComponent(doc, component);
    
    // Add to body or find appropriate container
    const body = doc.body || doc.querySelector('body');
    if (body) {
      body.appendChild(element);
    }
  }

  /**
   * Create HTML element for component
   */
  private createElementForComponent(doc: Document, component: ComponentInstance): Element {
    let tagName = 'div';
    
    // Choose appropriate tag based on component type
    switch (component.type) {
      case 'button': tagName = 'button'; break;
      case 'image': tagName = 'img'; break;
      case 'heading': tagName = 'h2'; break;
      case 'text': tagName = 'p'; break;
      case 'navigation': tagName = 'nav'; break;
      case 'header': tagName = 'header'; break;
      case 'footer': tagName = 'footer'; break;
      default: tagName = 'div'; break;
    }
    
    const element = doc.createElement(tagName);
    
    // Set basic attributes
    element.id = component.id;
    element.setAttribute('data-component-id', component.id);
    element.setAttribute('data-component-type', component.type);
    element.setAttribute('data-x', component.x.toString());
    element.setAttribute('data-y', component.y.toString());
    element.setAttribute('data-width', component.width.toString());
    element.setAttribute('data-height', component.height.toString());
    element.setAttribute('data-z-index', component.zIndex.toString());
    
    // Add parameters as data attributes
    Object.entries(component.parameters).forEach(([key, value]) => {
      element.setAttribute(`data-param-${key}`, value.toString());
    });
    
    // Set content
    this.updateElementContent(element, component);
    
    return element;
  }

  /**
   * Update component styling in CSS
   */
  private updateComponentInCSS(cssContent: string, component: ComponentInstance): string {
    const componentSelector = `#${component.id}`;
    const params = component.parameters;
    
    // Build CSS rules
    let cssRules = '';
    if (params['backgroundColor']) cssRules += `  background-color: ${params['backgroundColor']};\n`;
    if (params['textColor']) cssRules += `  color: ${params['textColor']};\n`;
    if (params['fontSize']) cssRules += `  font-size: ${params['fontSize']};\n`;
    if (params['fontFamily']) cssRules += `  font-family: ${params['fontFamily']};\n`;
    if (params['borderRadius']) cssRules += `  border-radius: ${params['borderRadius']};\n`;
    if (params['padding']) cssRules += `  padding: ${params['padding']};\n`;
    if (params['margin']) cssRules += `  margin: ${params['margin']};\n`;
    
    // Add positioning
    cssRules += `  position: absolute;\n`;
    cssRules += `  left: ${component.x}px;\n`;
    cssRules += `  top: ${component.y}px;\n`;
    cssRules += `  width: ${component.width}px;\n`;
    cssRules += `  height: ${component.height}px;\n`;
    cssRules += `  z-index: ${component.zIndex};\n`;
    
    if (!cssRules) return cssContent;
    
    const newRule = `${componentSelector} {\n${cssRules}}\n`;
    
    // Check if rule already exists
    const existingRuleRegex = new RegExp(`${componentSelector}\\s*\\{[^}]*\\}`, 'g');
    
    if (existingRuleRegex.test(cssContent)) {
      // Replace existing rule
      return cssContent.replace(existingRuleRegex, newRule);
    } else {
      // Add new rule
      return cssContent + '\n' + newRule;
    }
  }

  /**
   * Inject component-specific styles into the document
   */
  private injectComponentStyles(css: string, instanceId: string): void {
    const styleId = `component-styles-${instanceId}`;
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = css;
    console.log('💄 Injected styles for component:', instanceId);
  }

  /**
   * Remove component-specific styles from the document
   */
  private removeComponentStyles(instanceId: string): void {
    const styleId = `component-styles-${instanceId}`;
    const styleElement = document.getElementById(styleId);
    
    if (styleElement) {
      styleElement.remove();
      console.log('🧹 Removed styles for component:', instanceId);
    }
  }

  /**
   * Override component update to sync with source code
   */
  updateComponentInstance(updatedInstance: ComponentInstance): void {
    const currentPage = this.pages.find(p => p.id === this.currentPageId);
    if (currentPage) {
      const componentIndex = currentPage.components.findIndex(c => c.id === updatedInstance.id);
      if (componentIndex > -1) {
        currentPage.components[componentIndex] = updatedInstance;
        
        // Update the current page components array
        const currentComponentIndex = this.currentPageComponents.findIndex(c => c.id === updatedInstance.id);
        if (currentComponentIndex > -1) {
          this.currentPageComponents[currentComponentIndex] = updatedInstance;
        }
        
        // Clear render cache for this component to force re-render
        this.componentRenderer.clearRenderCache(updatedInstance.type);
        
        // Update the specific component's render context
        this.updateSingleComponentRenderContext(updatedInstance);
        
        // Force re-render of all component contexts to ensure consistency
        this.updateComponentRenderContexts();
        
        // Trigger Angular change detection
        this.cdr.detectChanges();
        
        // Update source code
        this.updateWebsiteSourceAfterModification(updatedInstance);
        
        this.pageDataChange.emit(this.pages);
        
        console.log('✅ Component instance updated and view refreshed:', updatedInstance.id);
      }
    }
  }
}
