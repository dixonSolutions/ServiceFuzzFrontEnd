import { Component, OnInit, OnChanges, SimpleChanges, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { ComponentDefinition, ComponentParameter, BusinessImage, BusinessImagesResponse, WebsiteBuilderService } from '../../services/website-builder';
import { ComponentType } from '../../models/workspace.models';
import { ComponentRendererService } from '../../services/component-renderer.service';

@Component({
  selector: 'app-left-sidebar',
  standalone: false,
  templateUrl: './left-sidebar.html',
  styleUrl: './left-sidebar.css'
})
export class LeftSidebar implements OnInit, OnChanges {
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef<HTMLInputElement>;

  // Inputs from parent component
  @Input() activeTab: 'components' | 'properties' | 'assets' = 'components';
  @Input() searchTerm: string = '';
  @Input() selectedCategory: string = 'All';
  @Input() selectedComponentInstance: any = null;
  @Input() currentProject: any = null;
  @Input() builtInNavProperties: any = {};

  // Outputs to parent component
  @Output() tabChange = new EventEmitter<'components' | 'properties' | 'assets'>();
  @Output() searchChange = new EventEmitter<Event>();
  @Output() categoryChange = new EventEmitter<string>();
  @Output() dragStart = new EventEmitter<{ event: DragEvent, component: ComponentDefinition }>();
  @Output() builtInNavPropertiesChange = new EventEmitter<{[key: string]: any}>();
  @Output() componentInstanceUpdated = new EventEmitter<any>();
  @Output() componentSelectionChange = new EventEmitter<any>();

  // Component Management State (unified - only use website builder service)
  availableComponents: ComponentDefinition[] = [];
  filteredComponents: ComponentDefinition[] = [];
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

  // Component Properties Management
  componentParameterForm: { [key: string]: any } = {};
  componentFormErrors: { [key: string]: string } = {};

  constructor(
    private websiteBuilder: WebsiteBuilderService,
    private componentRenderer: ComponentRendererService
  ) { }

  ngOnInit(): void {
    console.log('🚀 LEFT SIDEBAR STARTING INITIALIZATION');
    console.log('🔍 Initial currentProject:', this.currentProject);
    console.log('🔍 Initial availableComponents count:', this.availableComponents.length);
    this.initializeComponentManagement();
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('🔄 LEFT SIDEBAR: Input changes detected:', changes);
    
    if (changes['currentProject'] && changes['currentProject'].currentValue) {
      const project = changes['currentProject'].currentValue;
      console.log('🔍 Project changed via @Input:', project);
      console.log('🔍 Business ID from @Input:', project?.businessId);
      
      if (project?.businessId) {
        console.log('✅ Business ID available via @Input, loading components...');
        this.loadApiComponentTypes();
      }
    }
  }

  // Initialize component management (migrated from main component)
  private initializeComponentManagement(): void {
    // Subscribe to component updates
    this.websiteBuilder.availableComponents$.subscribe((components: ComponentDefinition[]) => {
      console.log('🔄 Left sidebar received components update:', components.length);
      console.log('📋 Component names in left sidebar:', components.map(c => c.name));
      
      this.availableComponents = components;
      this.updateComponentCategories();
      this.filterComponents();
      
      // Check for duplicates in left sidebar
      const names = components.map(c => c.name);
      const uniqueNames = [...new Set(names)];
      if (uniqueNames.length !== names.length) {
        console.warn('⚠️ Left sidebar detected duplicate components!');
        names.forEach((name, index) => {
          const firstIndex = names.indexOf(name);
          if (firstIndex !== index) {
            console.log(`  - Left sidebar duplicate: "${name}" at index ${index} (first at ${firstIndex})`);
          }
        });
      }
    });

    this.websiteBuilder.filteredComponents$.subscribe((filtered: ComponentDefinition[]) => {
      this.filteredComponents = filtered;
    });

    // Load API components immediately when left sidebar initializes
    this.loadApiComponentTypes();
  }

  // API Component Management (unified through website builder service)
  loadApiComponentTypes(): void {
    console.log('🔄 loadApiComponentTypes called in left sidebar');
    console.log('🔍 Current project:', this.currentProject);
    
    // GUARD: Prevent multiple concurrent API calls
    if (this.isLoadingApiComponents) {
      console.log('⚠️ API components already loading, skipping duplicate call');
      return;
    }
    
    if (!this.currentProject?.businessId) {
      console.log('No business ID available for loading API components');
      return;
    }

    console.log('✅ Business ID available, loading components...');
    this.isLoadingApiComponents = true;
    this.apiComponentsLoadError = null;
    
    // Force refresh API components in website builder service
    this.websiteBuilder.refreshApiComponentTypes().subscribe({
      next: (componentTypes: ComponentType[]) => {
        this.isLoadingApiComponents = false;
        console.log('✅ API Component types refreshed successfully:', componentTypes.length, 'components');
        
        // The website builder service handles the conversion and registration automatically
        // Components will be available through availableComponents$ subscription
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

  // Removed duplicate component registration methods - handled by website builder service

  // Component Filtering (migrated from main component)
  private filterComponents(): void {
    let components: ComponentDefinition[] = [];
    
    // Only use available components from website builder service (which are already converted from API)
    if (this.selectedCategory === 'All') {
      components = [...this.availableComponents];
    } else {
      components = this.availableComponents.filter(comp => comp.category === this.selectedCategory);
    }

    if (this.searchTerm) {
      components = components.filter(comp =>
        comp.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        comp.category.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    console.log('🔍 FILTERED COMPONENTS for display:');
    console.log('📋 Total filtered components:', components.length);
    console.log('📋 Component names for display:', components.map(c => c.name));
    
    // Check for duplicates in what will be displayed
    const displayNames = components.map(c => c.name);
    const uniqueDisplayNames = [...new Set(displayNames)];
    if (uniqueDisplayNames.length !== displayNames.length) {
      console.warn('⚠️ DUPLICATES IN DISPLAY LIST!');
      displayNames.forEach((name, index) => {
        const firstIndex = displayNames.indexOf(name);
        if (firstIndex !== index) {
          console.log(`  - Display duplicate: "${name}" at index ${index} (first at ${firstIndex})`);
          console.log(`    First component ID:`, components[firstIndex].id);
          console.log(`    Duplicate component ID:`, components[index].id);
        }
      });
    } else {
      console.log('✅ No duplicates in display list');
    }

    this.filteredComponents = components;
  }

  // Removed unused helper methods - now using only website builder service components

  // Category Management (migrated from main component)
  updateComponentCategories(): void {
    // Only use categories from website builder service (which are already converted from API)
    const categories = this.websiteBuilder.getComponentCategories();
    this.componentCategories = categories;
  }

  // Component Utility Methods (migrated from main component)
  getFilteredComponentsByCategory(category: string): ComponentDefinition[] {
    let filtered: ComponentDefinition[];
    if (category === 'All') {
      filtered = [...this.availableComponents];
    } else {
      filtered = this.availableComponents.filter(comp => comp.category === category);
    }
    
    // Apply search filter if present
    if (this.searchTerm) {
      filtered = filtered.filter(comp =>
        comp.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        comp.category.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }

  getComponentIcon(icon: string): string {
    return icon || 'pi pi-box';
  }

  isApiComponent(componentId: string): boolean {
    return this.websiteBuilder.getCachedApiComponentTypes().some((comp: ComponentType) => comp.id === componentId);
  }

  getApiComponentType(componentId: string): ComponentType | undefined {
    return this.websiteBuilder.getCachedApiComponentTypes().find((comp: ComponentType) => comp.id === componentId);
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
  onTabChange(tab: 'components' | 'properties' | 'assets'): void {
    this.activeTab = tab;
    this.tabChange.emit(tab);
    if (tab === 'assets' && this.businessImages.length === 0) {
      this.loadBusinessImages();
    }
    
    // Initialize component properties form when properties tab is selected
    if (tab === 'properties' && this.selectedComponentInstance) {
      this.initializeComponentPropertiesForm();
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
  // Component Properties Management
  initializeComponentPropertiesForm(): void {
    if (!this.selectedComponentInstance) {
      return;
    }

    const componentType = this.getApiComponentType(this.selectedComponentInstance.type);
    if (!componentType || !componentType.parametersSchema) {
      return;
    }

    const parameters = this.componentRenderer.parseParameterSchema(componentType.parametersSchema);
    const currentParameters = this.selectedComponentInstance.parameters || {};

    this.componentParameterForm = this.componentRenderer.generateFormFields(parameters, currentParameters);
    this.componentFormErrors = {};
  }

  onParameterChange(parameterName: string, value: any): void {
    this.componentParameterForm[parameterName].value = value;
    
    // Update the component instance
    if (this.selectedComponentInstance) {
      if (!this.selectedComponentInstance.parameters) {
        this.selectedComponentInstance.parameters = {};
      }
      this.selectedComponentInstance.parameters[parameterName] = value;
      
      // Emit updated instance
      this.componentInstanceUpdated.emit(this.selectedComponentInstance);
    }
    
    // Clear any previous errors for this parameter
    if (this.componentFormErrors[parameterName]) {
      delete this.componentFormErrors[parameterName];
    }
  }

  getParameterFormField(parameterName: string): any {
    return this.componentParameterForm[parameterName];
  }

  hasParameterError(parameterName: string): boolean {
    return !!this.componentFormErrors[parameterName];
  }

  getParameterError(parameterName: string): string {
    return this.componentFormErrors[parameterName] || '';
  }

  getSelectedComponentParameters(): any[] {
    if (!this.selectedComponentInstance) {
      return [];
    }

    const componentType = this.getApiComponentType(this.selectedComponentInstance.type);
    if (!componentType || !componentType.parametersSchema) {
      return [];
    }

    return this.componentRenderer.parseParameterSchema(componentType.parametersSchema);
  }

  onProjectChange(project: any): void {
    console.log('🔄 LEFT SIDEBAR: Project changed!');
    console.log('🔍 New project:', project);
    console.log('🔍 Business ID:', project?.businessId);
    
    this.currentProject = project;
    if (project?.businessId) {
      console.log('✅ Business ID found, calling loadApiComponentTypes...');
      this.loadApiComponentTypes();
    } else {
      console.log('❌ No business ID, skipping component loading');
    }
  }
}
