import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { ComponentDefinition, ComponentParameter, BusinessImage, BusinessImagesResponse, WebsiteBuilderService } from '../../services/website-builder';

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
  @Input() selectedComponentInstance: any = null;
  @Input() currentProject: any = null;
  @Input() builtInNavProperties: any = {};

  // Outputs to parent component
  @Output() tabChange = new EventEmitter<'components' | 'assets'>();
  @Output() searchChange = new EventEmitter<Event>();
  @Output() categoryChange = new EventEmitter<string>();
  @Output() refreshApiComponents = new EventEmitter<void>();
  @Output() dragStart = new EventEmitter<{ event: DragEvent, component: ComponentDefinition }>();
  @Output() builtInNavPropertiesChange = new EventEmitter<{[key: string]: any}>();
  @Output() componentInstanceUpdated = new EventEmitter<any>();

  // Asset Management Properties (moved from main component)
  businessImages: BusinessImage[] = [];
  isLoadingImages = false;
  imageUploadError: string | null = null;
  selectedImageFile: File | null = null;
  imageDescription = '';
  showImageUploadDialog = false;
  showAssetBrowserDialog = false;
  currentImageAssetProperty: string | null = null;

  constructor(private websiteBuilder: WebsiteBuilderService) { }

  ngOnInit(): void {
  }

  // Event handlers that emit to parent
  onTabChange(tab: 'components' | 'assets'): void {
    this.activeTab = tab;
    this.tabChange.emit(tab);
    if (tab === 'assets' && this.businessImages.length === 0) {
      this.loadBusinessImages();
    }
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

  // Asset Management Business Logic (migrated from main component)
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

  onSelectImageForComponent(image: BusinessImage): void {
    if (this.selectedComponentInstance?.type === 'image') {
      // Update the selected image component with the chosen image
      const imageUrl = this.getDisplayableImageUrl(image);
      this.selectedComponentInstance.parameters['imageUrl'] = imageUrl;
      this.selectedComponentInstance.parameters['altText'] = image.description || image.fileName;
      
      // Emit the updated component instance to parent for persistence
      this.componentInstanceUpdated.emit(this.selectedComponentInstance);
      
      console.log('Image selected for component:', image.fileName);
    }
  }

  onDownloadImage(image: BusinessImage): void {
    const link = document.createElement('a');
    link.href = this.getDisplayableImageUrl(image);
    link.download = image.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  onUploadButtonClick(): void {
    console.log('Upload button clicked, selectedImageFile:', this.selectedImageFile);
    this.uploadImage();
  }

  onOpenUploadDialog(): void {
    console.log('Opening upload dialog');
    this.selectedImageFile = null;
    this.imageDescription = '';
    this.imageUploadError = null;
    this.showImageUploadDialog = true;
  }

  onTriggerFileInput(): void {
    console.log('Triggering file input, fileInput:', this.fileInput);
    if (this.fileInput && this.fileInput.nativeElement) {
      console.log('Clicking file input element');
      this.fileInput.nativeElement.click();
    } else {
      console.error('File input not found or not available');
    }
  }

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

  onRemoveSelectedFile(): void {
    this.selectedImageFile = null;
    this.imageUploadError = null;
    // Reset file input
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  // Asset Browser for component image properties
  openAssetBrowser(propertyName: string): void {
    this.currentImageAssetProperty = propertyName;
    this.showAssetBrowserDialog = true;
    // Load business images if not already loaded
    if (this.businessImages.length === 0 && !this.isLoadingImages) {
      this.loadBusinessImages();
    }
  }

  closeAssetBrowser(): void {
    this.showAssetBrowserDialog = false;
    this.currentImageAssetProperty = null;
  }

  selectImageFromAssetBrowser(image: BusinessImage): void {
    if (this.selectedComponentInstance && this.currentImageAssetProperty) {
      const imageUrl = this.getDisplayableImageUrl(image);
      
      // Handle built-in navigation separately
      if (this.selectedComponentInstance.id === 'built-in-nav') {
        const updatedNavProperties = { ...this.builtInNavProperties };
        updatedNavProperties[this.currentImageAssetProperty] = imageUrl;
        this.builtInNavPropertiesChange.emit(updatedNavProperties);
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
      
      // Emit the updated component instance to parent for persistence
      this.componentInstanceUpdated.emit(this.selectedComponentInstance);
      
      console.log('Image selected from asset browser:', image.fileName);
      this.closeAssetBrowser();
    }
  }

  // Utility methods (these need to be provided from parent or imported from service)
  @Input() getFilteredComponentsByCategory!: (category: string) => ComponentDefinition[];
  @Input() getComponentIcon!: (icon: string) => string;
  @Input() isApiComponent!: (componentId: string) => boolean;
}
