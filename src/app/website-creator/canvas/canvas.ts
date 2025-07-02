import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { ComponentDefinition, ComponentParameter, ComponentInstance } from '../../services/website-builder';

export interface Page {
  id: string;
  name: string;
  route: string;
  isDeletable: boolean;
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
  // Inputs from parent component
  @Input() pages: Page[] = [];
  @Input() currentPageId: string = '';
  @Input() selectedDevice: string = 'desktop';
  @Input() currentPageComponents: ComponentInstance[] = [];
  @Input() selectedComponentInstance: ComponentInstance | null = null;
  @Input() builtInNavProperties: BuiltInNavProperties = {};
  @Input() getComponentDefinition!: (type: string) => ComponentDefinition | undefined;
  @Input() getApiComponentType!: (type: string) => any;
  @Input() getApiComponentTypeParameters!: (type: string) => ComponentParameter[];
  @Input() isApiComponent!: (type: string) => boolean;
  @Input() getParameterValue!: (instance: ComponentInstance, paramName: string) => any;
  @Input() trackByInstanceId!: (index: number, instance: ComponentInstance) => string;
  @Input() getAvatarSize!: (size: string) => string;
  @Input() getImageLogoSize!: (size: string) => string;
  @Input() getLogoSize!: (size: string) => string;
  @Input() getRatingStars!: (rating: number) => string;
  @Input() getOrderStatusColor!: (status: string) => string;
  @Input() getAlertBackgroundColor!: (type: string) => string;
  @Input() getAlertBorderColor!: (type: string) => string;
  @Input() getAlertTextColor!: (type: string) => string;
  @Input() getAlertIcon!: (type: string) => string;
  @Input() getButtonPadding!: (size: string) => string;
  @Input() getButtonFontSize!: (size: string) => string;
  @Input() generateStars!: (rating: number) => string;
  @Input() isTextInputParameter!: (param: ComponentParameter) => boolean;
  @Input() getInputTypeFromParameter!: (param: ComponentParameter) => string;
  @Input() isButtonParameter!: (param: ComponentParameter) => boolean;
  @Input() isImageParameter!: (param: ComponentParameter) => boolean;
  @Input() isRatingParameter!: (param: ComponentParameter) => boolean;
  @Input() isProgressParameter!: (param: ComponentParameter) => boolean;
  @Input() isTextContentParameter!: (param: ComponentParameter) => boolean;
  @Input() isLargeTextParameter!: (param: ComponentParameter) => boolean;
  @Input() isMediumTextParameter!: (param: ComponentParameter) => boolean;
  @Input() isRegularTextParameter!: (param: ComponentParameter) => boolean;
  @Input() isColorParameter!: (param: ComponentParameter) => boolean;

  // Outputs to parent component with correct types
  @Output() pageTabClick = new EventEmitter<string>();
  @Output() deletePage = new EventEmitter<string>();
  @Output() addPage = new EventEmitter<void>();
  @Output() deviceChange = new EventEmitter<'desktop' | 'tablet' | 'mobile'>();
  @Output() drop = new EventEmitter<DragEvent>();
  @Output() dragOver = new EventEmitter<DragEvent>();
  @Output() selectBuiltInNavigation = new EventEmitter<void>();
  @Output() selectComponentInstance = new EventEmitter<ComponentInstance>();
  @Output() startDrag = new EventEmitter<{event: MouseEvent, instance: ComponentInstance}>();
  @Output() navigationClick = new EventEmitter<{event: MouseEvent, pageId: string}>();
  @Output() startResize = new EventEmitter<{event: MouseEvent, instance: ComponentInstance, direction: string}>();
  @Output() deleteComponent = new EventEmitter<{event: MouseEvent, instanceId: string}>();

  constructor() { }

  ngOnInit(): void {
  }

  // Event handlers
  onPageTabClick(pageId: string): void {
    this.pageTabClick.emit(pageId);
  }

  onDeletePage(pageId: string): void {
    this.deletePage.emit(pageId);
  }

  onAddPage(): void {
    this.addPage.emit();
  }

  onDeviceChange(device: string): void {
    this.deviceChange.emit(device as 'desktop' | 'tablet' | 'mobile');
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.drop.emit(event);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.emit(event);
  }

  selectBuiltInNavigationHandler(): void {
    this.selectBuiltInNavigation.emit();
  }

  selectComponentInstanceHandler(instance: ComponentInstance): void {
    this.selectComponentInstance.emit(instance);
  }

  startDragHandler(event: MouseEvent, instance: ComponentInstance): void {
    this.startDrag.emit({event, instance});
  }

  onNavigationClick(event: Event, pageId: string): void {
    this.navigationClick.emit({event: event as MouseEvent, pageId});
  }

  startResizeHandler(event: MouseEvent, instance: ComponentInstance, direction: string): void {
    this.startResize.emit({event, instance, direction});
  }

  deleteComponentHandler(event: Event, instanceId: string): void {
    this.deleteComponent.emit({event: event as MouseEvent, instanceId});
  }

  // Helper methods
  getPageById(pageId: string): Page | undefined {
    return this.pages.find(page => page.id === pageId);
  }

  getComponentsCount(): number {
    return this.currentPageComponents.length;
  }
}
