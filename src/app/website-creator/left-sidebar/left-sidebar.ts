import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { ComponentDefinition, ComponentParameter, BusinessImage, BusinessImagesResponse, WebsiteBuilderService } from '../../services/website-builder';
import { ComponentType } from '../../models/workspace.models';

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
  @Input() selectedComponentInstance: any = null;
  @Input() currentProject: any = null;
  @Input() builtInNavProperties: any = {};

  // Outputs to parent component
  @Output() tabChange = new EventEmitter<'components' | 'assets'>();
  @Output() searchChange = new EventEmitter<Event>();
  @Output() categoryChange = new EventEmitter<string>();
  @Output() dragStart = new EventEmitter<{ event: DragEvent, component: ComponentDefinition }>();
  @Output() builtInNavPropertiesChange = new EventEmitter<{[key: string]: any}>();
  @Output() componentInstanceUpdated = new EventEmitter<any>();
  @Output() componentSelectionChange = new EventEmitter<any>();

  // Component Management State (migrated from main component)
  availableComponents: ComponentDefinition[] = [];
  filteredComponents: ComponentDefinition[] = [];
  apiComponentTypes: ComponentType[] = [];
  isLoadingApiComponents = false;
  apiComponentsLoadError: string | null = null;
  componentCategories: { name: string; count: number }[] = [];

  // Asset Management Properties (existing)
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
    this.initializeComponentManagement();
  }

  // Initialize component management (migrated from main component)
  private initializeComponentManagement(): void {
    // Subscribe to component updates
    this.websiteBuilder.availableComponents$.subscribe((components: ComponentDefinition[]) => {
      this.availableComponents = components;
      this.updateComponentCategories();
      this.filterComponents();
    });

    this.websiteBuilder.filteredComponents$.subscribe((filtered: ComponentDefinition[]) => {
      this.filteredComponents = filtered;
    });

    // Subscribe to API component types
    this.subscribeToApiComponentTypes();
  }

  // API Component Management (migrated from main component)
  loadApiComponentTypes(): void {
    if (!this.currentProject?.businessId) {
      console.log('No business ID available for loading API components');
      return;
    }

    this.isLoadingApiComponents = true;
    this.apiComponentsLoadError = null;
    
    this.websiteBuilder.getApiComponentTypesForBusinessWorkspace().subscribe({
      next: (componentTypes: ComponentType[]) => {
        this.apiComponentTypes = componentTypes;
        this.isLoadingApiComponents = false;
        console.log('✅ API Component types loaded successfully:', componentTypes.length, 'components');
        
        // Register API components with the website builder service
        this.registerApiComponentsWithBuilder(componentTypes);
        
        // Update component categories
        this.updateComponentCategories();
      },
      error: (error) => {
        this.isLoadingApiComponents = false;
        this.apiComponentsLoadError = 'Failed to load component types from API';
        console.error('❌ Error loading API component types:', error);
        
        // Reset cache on error
        this.websiteBuilder.resetApiComponentTypesCache();
      }
    });
  }

  private subscribeToApiComponentTypes(): void {
    this.websiteBuilder.apiComponentTypes$.subscribe({
      next: (componentTypes: ComponentType[]) => {
        this.apiComponentTypes = componentTypes;
        this.updateComponentCategories();
      },
      error: (error) => {
        console.error('Error in API component types subscription:', error);
      }
    });
  }

  private registerApiComponentsWithBuilder(apiComponents: ComponentType[]): void {
    const convertedComponents = apiComponents.map(this.convertApiComponentToDefinition);
    
    // Register with builder service for drag/drop
    convertedComponents.forEach(component => {
      this.websiteBuilder.registerComponent(component);
    });
  }

  private convertApiComponentToDefinition(apiComponent: ComponentType): ComponentDefinition {
    // Parse parameters from schema if available
    let parameters: ComponentParameter[] = [];
    if (apiComponent.parametersSchema) {
      try {
        const schema = JSON.parse(apiComponent.parametersSchema);
        parameters = schema.parameters || [];
      } catch (error) {
        console.error('Error parsing parameters schema:', error);
      }
    }

    return {
      id: apiComponent.id,
      name: apiComponent.name,
      icon: apiComponent.icon || 'pi pi-box',
      category: apiComponent.category,
      description: apiComponent.description || '',
      parameters: parameters,
      template: '', // API components don't have templates in this context
      styles: '',
      defaultWidth: apiComponent.defaultWidth || 300,
      defaultHeight: apiComponent.defaultHeight || 100
    };
  }

  // Component Filtering (migrated from main component)
  private filterComponents(): void {
    let components: ComponentDefinition[] = [];
    
    if (this.selectedCategory === 'All') {
      components = [...this.availableComponents, ...this.getApiComponentDefinitions()];
    } else {
      components = [
        ...this.getRawLocalComponentsByCategory(this.selectedCategory),
        ...this.getApiComponentsByCategory(this.selectedCategory).map(this.convertApiComponentToDefinition)
      ];
    }

    if (this.searchTerm) {
      components = components.filter(comp =>
        comp.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        comp.category.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    this.filteredComponents = components;
  }

  private getRawLocalComponentsByCategory(category: string): ComponentDefinition[] {
    return this.availableComponents.filter(comp => comp.category === category);
  }

  private getApiComponentDefinitions(): ComponentDefinition[] {
    return this.apiComponentTypes.map(this.convertApiComponentToDefinition);
  }

  getApiComponentsByCategory(category: string): ComponentType[] {
    return this.websiteBuilder.getCachedApiComponentTypesByCategory(category);
  }

  // Category Management (migrated from main component)
  updateComponentCategories(): void {
    const localCategories = this.websiteBuilder.getComponentCategories();
    const apiCategories = this.websiteBuilder.getApiComponentCategories();
    
    // Combine and count categories
    const categoryMap = new Map<string, number>();
    
    // Add local categories
    localCategories.forEach(cat => {
      categoryMap.set(cat.name, cat.count);
    });
    
    // Add API categories
    apiCategories.forEach(category => {
      const count = this.getApiComponentsByCategory(category).length;
      const existing = categoryMap.get(category) || 0;
      categoryMap.set(category, existing + count);
    });

    this.componentCategories = Array.from(categoryMap.entries()).map(([name, count]) => ({
      name,
      count
    }));
  }

  // Component Utility Methods (migrated from main component)
  getFilteredComponentsByCategory(category: string): ComponentDefinition[] {
    if (category === 'All') {
      return [...this.availableComponents, ...this.getApiComponentDefinitions()];
    }
    return [
      ...this.getRawLocalComponentsByCategory(category),
      ...this.getApiComponentsByCategory(category).map(this.convertApiComponentToDefinition)
    ];
  }

  getComponentIcon(icon: string): string {
    return icon || 'pi pi-box';
  }

  isApiComponent(componentId: string): boolean {
    return this.apiComponentTypes.some(comp => comp.id === componentId);
  }

  getApiComponentType(componentId: string): ComponentType | undefined {
    return this.apiComponentTypes.find(comp => comp.id === componentId);
  }

  getApiComponentTypeParameters(componentId: string): ComponentParameter[] {
    const apiComponent = this.getApiComponentType(componentId);
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

  // Event handlers
  onTabChange(tab: 'components' | 'assets'): void {
    this.activeTab = tab;
    this.tabChange.emit(tab);
    if (tab === 'assets' && this.businessImages.length === 0) {
      this.loadBusinessImages();
    }
  }

  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm = target.value;
    this.filterComponents();
    this.searchChange.emit(event);
  }

  onCategoryChange(category: string): void {
    this.selectedCategory = category;
    this.filterComponents();
    this.categoryChange.emit(category);
  }

  onRefreshApiComponents(): void {
    this.loadApiComponentTypes();
  }

  onDragStart(event: DragEvent, component: ComponentDefinition): void {
    // Set drag data on the event directly for the canvas to use
    event.dataTransfer?.setData('application/json', JSON.stringify(component));
    
    // Also emit to parent for coordination
    this.dragStart.emit({ event, component });
  }

  // Component Selection
  onComponentSelect(instance: any): void {
    this.componentSelectionChange.emit(instance);
  }

  // Asset Management Business Logic (existing)
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
        this.loadBusinessImages();
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
      const imageUrl = this.getDisplayableImageUrl(image);
      this.selectedComponentInstance.parameters['imageUrl'] = imageUrl;
      this.selectedComponentInstance.parameters['altText'] = image.description || image.fileName;
      
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
    this.uploadImage();
  }

  onOpenUploadDialog(): void {
    this.selectedImageFile = null;
    this.imageDescription = '';
    this.imageUploadError = null;
    this.showImageUploadDialog = true;
  }

  onTriggerFileInput(): void {
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.click();
    }
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.imageUploadError = 'Please select an image file';
        return;
      }
      
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        this.imageUploadError = 'Image must be less than 10MB';
        return;
      }
      
      this.selectedImageFile = file;
      this.imageUploadError = null;
    }
  }

  onRemoveSelectedFile(): void {
    this.selectedImageFile = null;
    this.imageUploadError = null;
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  openAssetBrowser(propertyName: string): void {
    this.currentImageAssetProperty = propertyName;
    this.showAssetBrowserDialog = true;
    
    if (this.businessImages.length === 0) {
      this.loadBusinessImages();
    }
  }

  closeAssetBrowser(): void {
    this.showAssetBrowserDialog = false;
    this.currentImageAssetProperty = null;
  }

  selectImageFromAssetBrowser(image: BusinessImage): void {
    if (this.currentImageAssetProperty && this.selectedComponentInstance) {
      const imageUrl = this.getDisplayableImageUrl(image);
      
      // Update component parameter
      this.selectedComponentInstance.parameters[this.currentImageAssetProperty] = imageUrl;
      
      // Special handling for image components
      if (this.selectedComponentInstance.type === 'image' && this.currentImageAssetProperty === 'imageUrl') {
        this.selectedComponentInstance.parameters['altText'] = image.description || image.fileName;
      }
      
      // Emit updated component instance
      this.componentInstanceUpdated.emit(this.selectedComponentInstance);
      
      // Close asset browser
      this.closeAssetBrowser();
    }
  }

  // Method to trigger API component loading when project changes
  onProjectChange(project: any): void {
    this.currentProject = project;
    if (project?.businessId) {
      this.loadApiComponentTypes();
    }
  }
}
