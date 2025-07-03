import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { ComponentDefinition, ComponentParameter, ComponentInstance, WebsiteBuilderService } from '../../services/website-builder';
import { ComponentType } from '../../models/workspace.models';

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
export class Canvas implements OnInit {
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

  constructor(private websiteBuilder: WebsiteBuilderService) { }

  ngOnInit(): void {
    this.initializeCanvas();
  }

  // Initialize canvas operations (migrated from main component)
  private initializeCanvas(): void {
    this.initializePages();
    this.subscribeToPageChanges();
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
    }
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

      // Create new component instance
      const newInstance: ComponentInstance = {
        id: this.generateUniqueId(),
        type: component.id,
        x: Math.max(0, x - 50),
        y: Math.max(0, y - 25),
        width: 300,
        height: 100,
        zIndex: 1,
        parameters: this.getDefaultProps(component.id)
      };

      // Add to current page
      const currentPage = this.pages.find(p => p.id === this.currentPageId);
      if (currentPage) {
        currentPage.components.push(newInstance);
        this.updateCurrentPageComponents();
        this.pageDataChange.emit(this.pages);
      }

      console.log('Component dropped:', newInstance);
    } catch (error) {
      console.error('Error dropping component:', error);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  private getDefaultProps(componentType: string): any {
    // Get component definition from service
    const componentDef = this.websiteBuilder.getComponentDefinition(componentType);
    if (componentDef) {
      const props: any = {};
      componentDef.parameters.forEach(param => {
        props[param.name] = param.defaultValue;
      });
      return props;
    }

    // Check if it's an API component
    const apiComponent = this.getApiComponentType(componentType);
    if (apiComponent) {
      const props: any = {};
      // Parse parameters from schema if available
      if (apiComponent.defaultParameters) {
        try {
          return JSON.parse(apiComponent.defaultParameters);
        } catch (error) {
          console.error('Error parsing default parameters:', error);
        }
      }
      return props;
    }

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

  selectComponentInstanceHandler(instance: ComponentInstance): void {
    this.selectedComponentInstance = instance;
    this.componentInstanceSelectionChange.emit(instance);
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
    this.navigationClick.emit({event: event as MouseEvent, pageId});
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
    const apiComponent = this.getApiComponentType(componentType);
    if (apiComponent && apiComponent.parametersSchema) {
      try {
        const schema = JSON.parse(apiComponent.parametersSchema);
        return schema.parameters || [];
      } catch (error) {
        console.error('Error parsing parameters schema:', error);
      }
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
