import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { WebsiteBuilderService, BusinessImage, BusinessImagesResponse } from '../../services/website-builder';

@Component({
  selector: 'app-asset-manager',
  standalone: false,
  templateUrl: './asset-manager.html',
  styleUrls: []
})
export class AssetManagerComponent implements OnInit {
  // Inputs from parent
  @Input() showImageUploadDialog = false;
  @Input() showAssetBrowserDialog = false;
  @Input() selectedComponentInstance: any = null;
  @Input() currentProject: any = null;
  
  // Outputs to parent
  @Output() showImageUploadDialogChange = new EventEmitter<boolean>();
  @Output() showAssetBrowserDialogChange = new EventEmitter<boolean>();
  @Output() imageSelected = new EventEmitter<{propertyName: string, imageUrl: string}>();
  @Output() builtInNavImageSelected = new EventEmitter<{propertyName: string, imageUrl: string}>();

  // Asset management properties
  businessImages: BusinessImage[] = [];
  isLoadingImages = false;
  imageUploadError: string | null = null;
  selectedImageFile: File | null = null;
  imageDescription = '';
  currentImageAssetProperty: string | null = null;
  currentBuiltInNavProperty: string | null = null;

  constructor(private websiteBuilder: WebsiteBuilderService) {}

  ngOnInit(): void {
    this.loadBusinessImages();
  }

  // Asset Loading
  loadBusinessImages(): void {
    if (!this.currentProject?.businessId) {
      console.warn('No business ID available for loading images');
      return;
    }

    this.isLoadingImages = true;
    this.imageUploadError = null;

    this.websiteBuilder.getBusinessImages(this.currentProject.businessId).subscribe({
      next: (response: BusinessImagesResponse) => {
        this.businessImages = response.images || [];
        this.isLoadingImages = false;
        console.log('Business images loaded:', this.businessImages.length);
      },
      error: (error) => {
        this.isLoadingImages = false;
        this.imageUploadError = 'Failed to load business images';
        console.error('Error loading business images:', error);
      }
    });
  }

  // File Upload
  uploadImage(): void {
    if (!this.selectedImageFile) {
      this.imageUploadError = 'Please select a file first';
      return;
    }

    if (!this.currentProject?.businessId) {
      this.imageUploadError = 'No business selected';
      return;
    }

    this.isLoadingImages = true;
    this.imageUploadError = null;

    this.websiteBuilder.uploadBusinessImage(
      this.currentProject.businessId,
      this.selectedImageFile,
      this.imageDescription || ''
    ).subscribe({
      next: (response) => {
        console.log('Image uploaded successfully:', response);
        this.selectedImageFile = null;
        this.imageDescription = '';
        this.showImageUploadDialog = false;
        this.showImageUploadDialogChange.emit(false);
        this.loadBusinessImages(); // Refresh the images list
      },
      error: (error) => {
        this.isLoadingImages = false;
        this.imageUploadError = 'Upload failed. Please try again.';
        console.error('Upload error:', error);
      }
    });
  }

  // File Selection
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) {
      this.selectedImageFile = null;
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.imageUploadError = 'Please select a valid image file';
      this.selectedImageFile = null;
      return;
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      this.imageUploadError = 'File size must be less than 10MB';
      this.selectedImageFile = null;
      return;
    }

    this.selectedImageFile = file;
    this.imageUploadError = null;
  }

  // Dialog Management
  openUploadDialog(): void {
    this.selectedImageFile = null;
    this.imageDescription = '';
    this.imageUploadError = null;
    this.showImageUploadDialog = true;
    this.showImageUploadDialogChange.emit(true);
  }

  cancelImageUpload(): void {
    this.selectedImageFile = null;
    this.imageDescription = '';
    this.imageUploadError = null;
    this.showImageUploadDialog = false;
    this.showImageUploadDialogChange.emit(false);
  }

  triggerFileInput(): void {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fileInput?.click();
  }

  removeSelectedFile(): void {
    this.selectedImageFile = null;
    this.imageUploadError = null;
  }

  onUploadButtonClick(): void {
    this.uploadImage();
  }

  // Asset Browser
  openAssetBrowser(propertyName: string): void {
    this.currentImageAssetProperty = propertyName;
    this.currentBuiltInNavProperty = null;
    this.showAssetBrowserDialog = true;
    this.showAssetBrowserDialogChange.emit(true);
  }

  openAssetBrowserForBuiltInNav(propertyName: string): void {
    this.currentBuiltInNavProperty = propertyName;
    this.currentImageAssetProperty = null;
    this.showAssetBrowserDialog = true;
    this.showAssetBrowserDialogChange.emit(true);
  }

  closeAssetBrowser(): void {
    this.currentImageAssetProperty = null;
    this.currentBuiltInNavProperty = null;
    this.showAssetBrowserDialog = false;
    this.showAssetBrowserDialogChange.emit(false);
  }

  selectImageFromAssetBrowser(image: BusinessImage): void {
    const imageUrl = this.getDisplayableImageUrl(image);
    
    if (this.currentImageAssetProperty) {
      // For regular component properties
      this.imageSelected.emit({
        propertyName: this.currentImageAssetProperty,
        imageUrl: imageUrl
      });
    } else if (this.currentBuiltInNavProperty) {
      // For built-in navigation properties
      this.builtInNavImageSelected.emit({
        propertyName: this.currentBuiltInNavProperty,
        imageUrl: imageUrl
      });
    }
    
    this.closeAssetBrowser();
  }

  // Image Operations
  selectImageForComponent(image: BusinessImage): void {
    if (!this.selectedComponentInstance) {
      console.warn('No component selected');
      return;
    }

    const imageUrl = this.getDisplayableImageUrl(image);
    
    // Update the selected component's image parameter
    if (this.selectedComponentInstance.parameters) {
      // Find image parameter and update it
      const imageParam = Object.keys(this.selectedComponentInstance.parameters)
        .find(key => key.toLowerCase().includes('image') || key.toLowerCase().includes('url'));
      
      if (imageParam) {
        this.selectedComponentInstance.parameters[imageParam] = imageUrl;
        console.log('Updated component image:', imageParam, imageUrl);
      }
    }
  }

  downloadImage(image: BusinessImage): void {
    const imageUrl = this.getDisplayableImageUrl(image);
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = image.fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Utility Methods
  getDisplayableImageUrl(image: BusinessImage): string {
    return image.imageUrl || image.fileName || '';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatUploadDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
}
