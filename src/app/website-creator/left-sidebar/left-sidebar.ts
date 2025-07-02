import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { ComponentDefinition, ComponentParameter, BusinessImage } from '../../services/website-builder';

@Component({
  selector: 'app-left-sidebar',
  standalone: false,
  templateUrl: './left-sidebar.html',
  styleUrl: './left-sidebar.css'
})
export class LeftSidebar implements OnInit {
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef<HTMLInputElement>;

  // Inputs from parent component
  @Input() activeTab: 'components' | 'assets' = 'components';
  @Input() searchTerm: string = '';
  @Input() selectedCategory: string = 'All';
  @Input() componentCategories: { name: string; count: number }[] = [];
  @Input() isLoadingApiComponents: boolean = false;
  @Input() apiComponentsLoadError: string | null = null;
  @Input() businessImages: BusinessImage[] = [];
  @Input() isLoadingImages: boolean = false;
  @Input() imageUploadError: string | null = null;
  @Input() selectedComponentInstance: any = null;
  @Input() selectedImageFile: File | null = null;
  @Input() imageDescription: string = '';
  @Input() showImageUploadDialog: boolean = false;
  @Input() showAssetBrowserDialog: boolean = false;

  // Outputs to parent component
  @Output() tabChange = new EventEmitter<'components' | 'assets'>();
  @Output() searchChange = new EventEmitter<Event>();
  @Output() categoryChange = new EventEmitter<string>();
  @Output() refreshApiComponents = new EventEmitter<void>();
  @Output() dragStart = new EventEmitter<{ event: DragEvent, component: ComponentDefinition }>();
  @Output() uploadDialogOpen = new EventEmitter<void>();
  @Output() imageSelect = new EventEmitter<BusinessImage>();
  @Output() imageDownload = new EventEmitter<BusinessImage>();
  @Output() fileSelected = new EventEmitter<Event>();
  @Output() imageDescriptionChange = new EventEmitter<string>();
  @Output() uploadButtonClick = new EventEmitter<void>();
  @Output() uploadCancel = new EventEmitter<void>();
  @Output() fileInputTrigger = new EventEmitter<void>();
  @Output() fileRemove = new EventEmitter<void>();

  constructor() { }

  ngOnInit(): void {
  }

  // Event handlers that emit to parent
  onTabChange(tab: 'components' | 'assets'): void {
    this.tabChange.emit(tab);
  }

  onSearchChange(event: Event): void {
    this.searchChange.emit(event);
  }

  onCategoryChange(category: string): void {
    this.categoryChange.emit(category);
  }

  onRefreshApiComponents(): void {
    this.refreshApiComponents.emit();
  }

  onDragStart(event: DragEvent, component: ComponentDefinition): void {
    this.dragStart.emit({ event, component });
  }

  onOpenUploadDialog(): void {
    this.uploadDialogOpen.emit();
  }

  onSelectImageForComponent(image: BusinessImage): void {
    this.imageSelect.emit(image);
  }

  onDownloadImage(image: BusinessImage): void {
    this.imageDownload.emit(image);
  }

  onFileSelected(event: Event): void {
    this.fileSelected.emit(event);
  }

  onImageDescriptionChange(description: string): void {
    this.imageDescriptionChange.emit(description);
  }

  onUploadButtonClick(): void {
    this.uploadButtonClick.emit();
  }

  onCancelImageUpload(): void {
    this.uploadCancel.emit();
  }

  onTriggerFileInput(): void {
    this.fileInputTrigger.emit();
  }

  onRemoveSelectedFile(): void {
    this.fileRemove.emit();
  }

  // Utility methods (these will need to be provided from parent or imported from service)
  @Input() getFilteredComponentsByCategory!: (category: string) => ComponentDefinition[];
  @Input() getComponentIcon!: (icon: string) => string;
  @Input() isApiComponent!: (componentId: string) => boolean;
  @Input() getDisplayableImageUrl!: (image: BusinessImage) => string;
  @Input() formatFileSize!: (bytes: number) => string;
  @Input() formatUploadDate!: (dateString: string) => string;
}
