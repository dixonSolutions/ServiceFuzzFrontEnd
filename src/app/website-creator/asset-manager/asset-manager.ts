import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { WebsiteBuilderService, BusinessImage, BusinessImagesResponse } from '../../services/Business/WebsiteCreator/manual/website-builder';
import { ToastService } from '../../services/Main/messaging/toast.service';

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

  constructor(
    private websiteBuilder: WebsiteBuilderService,
    private toastService: ToastService
  ) {}

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

  // ===== NEW IMAGE MANAGEMENT METHODS =====

  /**
   * Delete a business image
   * @param image - The image to delete
   */
  deleteImage(image: BusinessImage): void {
    if (!confirm(`Are you sure you want to delete "${image.fileName}"?`)) {
      return;
    }

    this.websiteBuilder.deleteBusinessImage(image.id).subscribe({
      next: (response) => {
        this.toastService.success(response.message || 'Image deleted successfully', 'Image Deleted');
        this.loadBusinessImages(); // Refresh the list
      },
      error: (error) => {
        console.error('Error deleting image:', error);
        this.toastService.error('Failed to delete image. Please try again.', 'Delete Error');
      }
    });
  }

  /**
   * Update image description
   * @param image - The image to update
   * @param newDescription - The new description
   */
  updateImageDescription(image: BusinessImage, newDescription: string): void {
    if (newDescription === image.description) {
      return; // No change
    }

    this.websiteBuilder.updateImageDescription(image.id, newDescription).subscribe({
      next: (response) => {
        this.toastService.success(response.message || 'Description updated successfully', 'Description Updated');
        image.description = newDescription; // Update local copy
      },
      error: (error) => {
        console.error('Error updating description:', error);
        this.toastService.error('Failed to update description. Please try again.', 'Update Error');
      }
    });
  }

  /**
   * Toggle image active/inactive status
   * @param image - The image to toggle
   */
  toggleImageStatus(image: BusinessImage): void {
    this.websiteBuilder.toggleImageStatus(image.id).subscribe({
      next: (response) => {
        const statusText = image.isActive ? 'deactivated' : 'activated';
        this.toastService.success(response.message || `Image ${statusText} successfully`, 'Status Updated');
        image.isActive = !image.isActive; // Update local copy
      },
      error: (error) => {
        console.error('Error toggling status:', error);
        this.toastService.error('Failed to update image status. Please try again.', 'Status Error');
      }
    });
  }

  /**
   * Get image URL for display
   * @param image - The image to get URL for
   * @returns Promise with image URL
   */
  async getImageUrl(image: BusinessImage): Promise<string> {
    try {
      // First try to use existing imageUrl or imageData
      if (image.imageUrl) {
        return image.imageUrl;
      } else if (image.imageData && image.contentType) {
        return this.websiteBuilder.convertImageDataToDataUrl(image.imageData, image.contentType);
      }
      
      // Fallback to blob URL - convert to promise properly
      const urlObservable = this.websiteBuilder.getImageUrl(image.id);
      return new Promise<string>((resolve) => {
        urlObservable.subscribe({
          next: (url) => resolve(url),
          error: () => resolve('')
        });
      });
    } catch (error) {
      console.error('Error getting image URL:', error);
      this.toastService.error('Failed to load image. Please try again.', 'Image Load Error');
      return '';
    }
  }

  /**
   * Enhanced download image file using blob API
   * @param image - The image to download
   */
  downloadImageBlob(image: BusinessImage): void {
    this.websiteBuilder.getImageBlob(image.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = image.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.toastService.success('Image downloaded successfully', 'Download Complete');
      },
      error: (error) => {
        console.error('Error downloading image:', error);
        this.toastService.error('Failed to download image. Please try again.', 'Download Error');
      }
    });
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
