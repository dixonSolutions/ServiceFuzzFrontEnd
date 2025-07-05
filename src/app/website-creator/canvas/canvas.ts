import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { ComponentDefinition, ComponentParameter, ComponentInstance, WebsiteBuilderService } from '../../services/website-builder';
import { ComponentType, ComponentRenderContext } from '../../models/workspace.models';
import { ComponentRendererService } from '../../services/component-renderer.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { ProgressBarModule } from 'primeng/progressbar';

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
export class Canvas implements OnInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasElement!: ElementRef<HTMLDivElement>;

  // Inputs from parent component
  @Input() selectedDevice: string = 'desktop';
  @Input() builtInNavProperties: BuiltInNavProperties = {};
  
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

  constructor(
    private websiteBuilder: WebsiteBuilderService,
    private componentRenderer: ComponentRendererService,
    private domSanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.initializeCanvas();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // Initialize canvas operations (migrated from main component)
  private initializeCanvas(): void {
    this.initializePages();
    this.subscribeToPageChanges();
    this.loadApiComponentTypes();
  }

  private loadApiComponentTypes(): void {
    // Load API component types if not already loaded
    if (!this.websiteBuilder.areApiComponentTypesLoaded()) {
      this.websiteBuilder.loadAndCacheApiComponentTypes().subscribe({
        next: (componentTypes) => {
          console.log('✅ API component types loaded:', componentTypes.length);
          this.updateComponentRenderContexts();
        },
        error: (error) => {
          console.error('❌ Error loading API component types:', error);
        }
      });
    } else {
      console.log('✅ API component types already loaded');
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
      this.pages = pages.map(page => ({
        ...page,
        isActive: page.id === this.currentPageId
      }));
      this.updateCurrentPageComponents();
    });

    this.websiteBuilder.currentPageId$.subscribe((pageId: string) => {
      this.currentPageId = pageId;
      this.updateCurrentPageComponents();
      this.currentPageChange.emit(pageId);
    });

    this.websiteBuilder.components$.subscribe((components: ComponentInstance[]) => {
      this.currentPageComponents = components;
    });
  }

  updateCurrentPageComponents(): void {
    const currentPage = this.pages.find(p => p.id === this.currentPageId);
    if (currentPage) {
      this.currentPageComponents = currentPage.components;
      this.updateComponentRenderContexts();
    }
  }

  // Component Rendering Methods
  private updateComponentRenderContexts(): void {
    this.componentRenderContexts = [];
    
    console.log('🔄 Updating component render contexts for', this.currentPageComponents.length, 'components');
    
    this.currentPageComponents.forEach(component => {
      const componentType = this.getApiComponentType(component.type);
      if (componentType) {
        console.log('✅ Found component type for', component.type, ':', componentType.name);
        
        // Convert from website builder ComponentInstance to models ComponentInstance
        const modelComponent = this.convertToModelComponent(component);
        const renderContext = this.componentRenderer.renderComponent(componentType, modelComponent);
        this.componentRenderContexts.push(renderContext);
        
        console.log('🎨 Rendered component:', component.type, 'with HTML length:', renderContext.renderedHTML.length);
      } else {
        console.warn('❌ Component type not found for:', component.type);
        console.log('Available component types:', this.websiteBuilder.getCachedApiComponentTypes().map(ct => ct.id));
      }
    });
    
    console.log('📊 Total render contexts created:', this.componentRenderContexts.length);
  }

  private convertToModelComponent(component: any): any {
    return {
      id: component.id,
      componentTypeId: component.type,
      parameters: component.properties || component.parameters || {},
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
         this.websiteBuilder.setCurrentPage(pageId);
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

  // Drag & Drop Operations (migrated from main component)
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

      // Get default parameters for the component
      const defaultParameters = this.getDefaultProps(component.id);
      console.log('⚙️ Default parameters for component:', defaultParameters);

      // Calculate next z-index (ensure components don't overlap in z-space)
      const currentPage = this.pages.find(p => p.id === this.currentPageId);
      const maxZIndex = currentPage && currentPage.components.length > 0 
        ? Math.max(...currentPage.components.map(c => c.zIndex)) 
        : 0;

      // Calculate smart positioning to avoid overlaps
      let finalX = Math.max(0, x - 50);
      let finalY = Math.max(80, y - 25); // Start below navigation bar
      
      // If dropping near existing components, offset position
      if (currentPage && currentPage.components.length > 0) {
        const componentAtPosition = currentPage.components.find(c => 
          Math.abs(c.x - finalX) < 50 && Math.abs(c.y - finalY) < 50
        );
        
        if (componentAtPosition) {
          // Offset by 20px to create a cascade effect
          const offset = (currentPage.components.length % 10) * 20;
          finalX += offset;
          finalY += offset;
        }
      }

      // Use website builder service to add component (ensures proper component management)
      try {
        const newInstance = this.websiteBuilder.addComponent(component.id, finalX, finalY);
        
        // Update z-index to ensure new component is on top
        this.websiteBuilder.updateComponent(newInstance.id, { zIndex: maxZIndex + 1 });
        
        console.log('📋 Component added via website builder service:', newInstance);

        // Select the newly created component
        this.selectedComponentInstance = newInstance;
        this.componentInstanceSelectionChange.emit(newInstance);
        
        // Update local page data from website builder service
        this.websiteBuilder.pages$.subscribe(pages => {
          this.pages = pages;
          this.pageDataChange.emit(this.pages);
        });
        
        console.log('✅ Component added to page and selected:', newInstance);
      } catch (error) {
        console.error('❌ Error adding component via website builder service:', error);
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
      console.error('❌ Error dropping component:', error);
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

  selectComponentInstanceHandler(instance: ComponentInstance, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.selectedComponentInstance = instance;
    this.componentInstanceSelectionChange.emit(instance);
  }

  handleComponentClick(instance: ComponentInstance, event: Event): void {
    event.stopPropagation();
    
    // Check if this is a button component with navigation
    // Handle both 'parameters' and 'properties' (component data structure compatibility)
    if (instance.type === 'button') {
      const params = instance.parameters || (instance as any).properties || {};
      const navigateTo = params['navigateTo'];
      const customUrl = params['customUrl'];
      const openInNewTab = params['openInNewTab'];
      
      // Handle navigation if specified
      if (navigateTo || customUrl) {
        this.handleButtonNavigation(navigateTo, customUrl, openInNewTab);
        return; // Don't select the component, just navigate
      }
    }
    
    // Default behavior: select the component
    this.selectComponentInstanceHandler(instance, event);
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
    
    const currentPage = this.pages.find(p => p.id === this.currentPageId);
    if (currentPage) {
      const componentIndex = currentPage.components.findIndex(c => c.id === instanceId);
      if (componentIndex > -1) {
        currentPage.components.splice(componentIndex, 1);
        
        // Clear selection if deleted component was selected
        if (this.selectedComponentInstance?.id === instanceId) {
          this.selectedComponentInstance = null;
          this.componentInstanceSelectionChange.emit(null);
        }
        
        this.updateCurrentPageComponents();
        this.pageDataChange.emit(this.pages);
      }
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
    
    // Notify website builder service
    this.websiteBuilder.setCurrentPage(pageId);
    
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

  // Method to update specific component instance
  updateComponentInstance(updatedInstance: ComponentInstance): void {
    const currentPage = this.pages.find(p => p.id === this.currentPageId);
    if (currentPage) {
      const componentIndex = currentPage.components.findIndex(c => c.id === updatedInstance.id);
      if (componentIndex > -1) {
        currentPage.components[componentIndex] = updatedInstance;
        this.updateCurrentPageComponents();
        this.pageDataChange.emit(this.pages);
      }
    }
  }
}
