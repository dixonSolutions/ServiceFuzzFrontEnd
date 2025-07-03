import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebsiteBuilderService, ComponentDefinition, ComponentParameter, ComponentInstance, BusinessImage, BusinessImagesResponse } from '../services/website-builder';
import { WorkspaceProject } from './workspace-selection.component';
import { CreateWorkspaceDto, UpdateWorkspaceDto, ComponentType } from '../models/workspace.models';
import { LeftSidebar } from './left-sidebar/left-sidebar';
import { Canvas, Page } from './canvas/canvas';

@Component({
  selector: 'app-website-creator',
  standalone: false,
  templateUrl: './website-creator.html',
  styleUrls: ['./website-creator.css']
})
export class WebsiteCreatorComponent implements OnInit {
  @ViewChild('leftSidebar') leftSidebar!: LeftSidebar;
  @ViewChild('canvas') canvas!: Canvas;

  // Workspace state
  showWorkspaceSelection = true;
  currentProject: WorkspaceProject | null = null;

  // Component selection and properties state
  selectedComponentInstance: any = null;
  selectedDevice: string = 'desktop';
  
  // Dialogs
  showNewProjectDialog = false;
  showExportDialog = false;
  showImportDialog = false;
  showJsonEditor = false;
  newProjectDescription = '';
  newProjectName = '';
  exportData = '';
  importData = '';

  // Assets Management
  activeTab: 'components' | 'assets' = 'components';
  isSaving = false;
  
  // Built-in navigation properties (shared state)
  builtInNavProperties: { [key: string]: any } = {
    logoType: 'text',
    logoText: 'Your Business',
    logoImage: '',
    logoShape: 'square',
    logoSize: 'normal',
    backgroundColor: '#f8f9fa',
    textColor: '#2c3e50',
    showShadow: true
  };

  // Page data (coordinated between components)
  pages: Page[] = [];
  currentPageId = 'home';

  constructor(
    private websiteBuilder: WebsiteBuilderService,
    private router: Router
  ) {}

  ngOnInit() {
    // Show workspace selection first
    console.log('Website Creator initialized - showing workspace selection');
  }

  // Workspace Management
  onWorkspaceProjectSelected(project: WorkspaceProject): void {
    console.log('Project selected:', project);
    this.currentProject = project;
    this.showWorkspaceSelection = false;
    
    // Initialize the website builder with this project
    this.websiteBuilder.createNewProject(project.name, project.description);
    this.initializeWebsiteBuilder();
    
    // Notify left sidebar to load API components
    if (this.leftSidebar) {
      this.leftSidebar.onProjectChange(project);
    }
    
    // Load existing website data if available
    if (project.websiteJson) {
      this.loadWebsiteDataFromJson(project.websiteJson);
    }
  }

  onWorkspaceProjectCreated(project: WorkspaceProject): void {
    console.log('New project created:', project);
    this.currentProject = project;
    this.showWorkspaceSelection = false;
    
    // Initialize the website builder with this project
    this.websiteBuilder.createNewProject(project.name, project.description);
    this.initializeWebsiteBuilder();
    
    // Notify left sidebar to load API components
    if (this.leftSidebar) {
      this.leftSidebar.onProjectChange(project);
    }
  }

  onBackToWorkspace(): void {
    this.showWorkspaceSelection = true;
    this.currentProject = null;
    this.selectedComponentInstance = null;
  }

  private initializeWebsiteBuilder(): void {
    this.websiteBuilder.initializePages();
    
    // Subscribe to page changes
    this.websiteBuilder.pages$.subscribe((pages: any[]) => {
      this.pages = pages;
      if (this.canvas) {
        this.canvas.loadPageData(pages);
      }
    });

    this.websiteBuilder.currentPageId$.subscribe((pageId: string) => {
      this.currentPageId = pageId;
    });
  }

  // Component Selection Coordination
  onComponentInstanceSelectionChange(instance: ComponentInstance | null): void {
    this.selectedComponentInstance = instance;
    console.log('Component selection changed:', instance);
  }

  onComponentSelectionChange(instance: any): void {
    this.selectedComponentInstance = instance;
  }

  // Page Management Coordination
  onPageDataChange(pages: Page[]): void {
    this.pages = pages;
    // Update website builder with new page data
    console.log('Pages updated:', pages);
  }

  onCurrentPageChange(pageId: string): void {
    this.currentPageId = pageId;
    console.log('Current page changed to:', pageId);
  }

  // Component Instance Updates
  onComponentInstanceUpdated(updatedInstance: any): void {
    if (this.selectedComponentInstance?.id === updatedInstance.id) {
      this.selectedComponentInstance = updatedInstance;
    }
    
    // Update canvas with new component data
    if (this.canvas) {
      this.canvas.updateComponentInstance(updatedInstance);
    }
    
    console.log('Component instance updated:', updatedInstance);
  }

  // Navigation Handling
  onNavigationClick(event: {event: MouseEvent, pageId: string}): void {
    console.log('Navigation clicked:', event.pageId);
    // Handle navigation between pages
    this.currentPageId = event.pageId;
  }

  // Device Management
  onDeviceChange(device: 'desktop' | 'tablet' | 'mobile'): void {
    this.selectedDevice = device;
  }

  // Built-in Navigation Properties
  updateBuiltInNavProperty(propertyName: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    let value: any = target.value;
    
    if (target.type === 'checkbox') {
      value = target.checked;
    } else if (target.type === 'number') {
      value = Number(value);
    }
    
    this.builtInNavProperties[propertyName] = value;
  }

  onBuiltInNavPropertiesChange(properties: { [key: string]: any }): void {
    this.builtInNavProperties = { ...properties };
  }

  openAssetBrowserForBuiltInNav(propertyName: string): void {
    if (this.leftSidebar) {
      this.leftSidebar.openAssetBrowser(propertyName);
    }
  }

  // Component Actions
  updateComponentParameter(parameterName: string, event: Event): void {
    if (!this.selectedComponentInstance) return;
    
    const target = event.target as HTMLInputElement;
    let value: any = target.value;
    
    if (target.type === 'checkbox') {
      value = target.checked;
    } else if (target.type === 'number') {
      value = parseFloat(value) || 0;
    }
    
    this.selectedComponentInstance.parameters[parameterName] = value;
    
    // Notify canvas of the update
    if (this.canvas) {
      this.canvas.updateComponentInstance(this.selectedComponentInstance);
    }
    
    console.log('Updated parameter:', parameterName, 'to:', value);
  }

  duplicateComponent(): void {
    if (!this.selectedComponentInstance || this.selectedComponentInstance.type === 'built-in-navigation') return;
    
    const original = this.selectedComponentInstance;
    const newInstance = {
      ...original,
      id: this.generateUniqueId(),
      x: original.x + 20,
      y: original.y + 20,
      parameters: { ...original.parameters }
    };
    
    // Add to current page through canvas
    if (this.canvas) {
      const currentPage = this.canvas.pages.find(p => p.id === this.currentPageId);
      if (currentPage) {
        currentPage.components.push(newInstance);
        // Component list will update automatically through canvas internal logic
        this.selectedComponentInstance = newInstance;
      }
    }
  }

  deleteSelectedComponent(): void {
    if (!this.selectedComponentInstance || this.selectedComponentInstance.type === 'built-in-navigation') return;
    
    // Delete through canvas
    if (this.canvas) {
      this.canvas.deleteComponentHandler(new MouseEvent('click'), this.selectedComponentInstance.id);
    }
    this.selectedComponentInstance = null;
  }

  openAssetBrowser(propertyName: string): void {
    if (this.leftSidebar) {
      this.leftSidebar.openAssetBrowser(propertyName);
    }
  }

  // Project Management
  onSave(): void {
    if (!this.currentProject) return;
    
    this.isSaving = true;
    
    // Export current website data
    this.currentProject.websiteJson = this.exportWebsiteDataAsJson();
    
    // Save based on whether it's a new project or existing
    if (this.currentProject.isNew) {
      this.saveNewWorkspace();
    } else {
      this.updateExistingWorkspace();
    }
  }

  onPreview(): void {
    console.log('Preview clicked');
    // Implement preview functionality
  }

  onJsonEditor(): void {
    this.showJsonEditor = !this.showJsonEditor;
  }

  // Tab Management
  onTabChange(tab: 'components' | 'assets'): void {
    this.activeTab = tab;
  }

  // Drag and Drop
  onDragStart(event: DragEvent, component: ComponentDefinition): void {
    // Delegate to canvas for handling
    if (this.canvas) {
      event.dataTransfer?.setData('application/json', JSON.stringify(component));
    }
  }

  // Project Dialog Management
  onCreateNewProject(): void {
    if (!this.newProjectName.trim()) {
      alert('Please enter a project name');
      return;
    }
    
    this.showNewProjectDialog = false;
    // Handle project creation logic here if needed
    console.log('Creating new project:', this.newProjectName, this.newProjectDescription);
  }

  onImportConfirm(): void {
    if (!this.importData.trim()) {
      alert('Please paste project data');
      return;
    }
    
    try {
      this.loadWebsiteDataFromJson(this.importData);
      this.showImportDialog = false;
      this.importData = '';
      console.log('Project imported successfully');
    } catch (error) {
      console.error('Error importing project:', error);
      alert('Error importing project. Please check the data format.');
    }
  }

  // Dialog Management
  copyToClipboard(): void {
    navigator.clipboard.writeText(this.exportData).then(() => {
      console.log('Copied to clipboard');
    });
  }

  // Helper Methods
  private generateUniqueId(): string {
    return 'comp_' + Math.random().toString(36).substr(2, 9);
  }

  getPageById(pageId: string): any {
    return this.pages.find(p => p.id === pageId);
  }

  getLogoSize(size: string): string {
    switch (size) {
      case 'small': return '20px';
      case 'normal': return '24px';
      case 'large': return '32px';
      default: return '24px';
    }
  }

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

  // Data Import/Export
  private exportWebsiteDataAsJson(): string {
    const websiteData = {
      builtInNavigation: this.builtInNavProperties,
      pages: this.pages.map(page => ({
        id: page.id,
        name: page.name,
        route: page.route,
        components: page.components.map(comp => ({
          id: comp.id,
          type: comp.type,
          x: comp.x,
          y: comp.y,
          width: comp.width,
          height: comp.height,
          zIndex: comp.zIndex,
          parameters: comp.parameters
        }))
      }))
    };
    
    return JSON.stringify(websiteData, null, 2);
  }

  private loadWebsiteDataFromJson(jsonString: string): void {
    try {
      if (!jsonString) return;

      const websiteData = JSON.parse(jsonString);
      
      // Load built-in navigation properties
      if (websiteData.builtInNavigation) {
        this.builtInNavProperties = { ...websiteData.builtInNavigation };
      }

      // Load pages and components
      if (websiteData.pages && Array.isArray(websiteData.pages)) {
        this.pages = websiteData.pages.map((page: any) => ({
          id: page.id,
          name: page.name,
          route: page.route,
          components: page.components.map((comp: any) => ({
            id: comp.id,
            type: comp.type,
            x: comp.x || 0,
            y: comp.y || 0,
            width: comp.width || 300,
            height: comp.height || 100,
            zIndex: comp.zIndex || 1,
            parameters: comp.parameters || {}
          })),
          isDeletable: page.id !== 'home',
          isActive: page.id === this.currentPageId
        }));

        // Load pages into canvas
        if (this.canvas) {
          this.canvas.loadPageData(this.pages);
        }
      }

      console.log('Website data loaded successfully');
    } catch (error) {
      console.error('Error loading website data:', error);
      alert('Error loading website data. Using default configuration.');
    }
  }

  private async saveNewWorkspace(): Promise<void> {
    if (!this.currentProject) return;

    try {
      const workspaceDto: CreateWorkspaceDto = {
        userId: this.currentProject.userId,
        businessId: this.currentProject.businessId,
        name: this.currentProject.name,
        description: this.currentProject.description,
        websiteJson: this.currentProject.websiteJson
      };

      this.websiteBuilder.createWorkspace(workspaceDto).subscribe({
        next: (response) => {
          this.currentProject!.id = response.workspaceId;
          this.currentProject!.isNew = false;
          console.log('New workspace saved with ID:', response.workspaceId);
          alert('Website project saved successfully!');
          this.isSaving = false;
        },
        error: (error) => {
          console.error('Error saving workspace:', error);
          alert('Error saving website project. Please try again.');
          this.isSaving = false;
        }
      });
    } catch (error) {
      console.error('Error saving new workspace:', error);
      alert('Error saving website project. Please try again.');
      this.isSaving = false;
    }
  }

  private async updateExistingWorkspace(): Promise<void> {
    if (!this.currentProject) return;

    try {
      const workspaceId = this.currentProject.id;
      const updates: UpdateWorkspaceDto = {
        name: this.currentProject.name,
        description: this.currentProject.description,
        websiteJson: this.currentProject.websiteJson
      };

      this.websiteBuilder.updateWorkspace(workspaceId, updates).subscribe({
        next: (response) => {
          this.currentProject!.lastModified = new Date();
          console.log('Workspace updated:', response);
          alert('Website project updated successfully!');
          this.isSaving = false;
        },
        error: (error) => {
          console.error('Error updating workspace:', error);
          alert('Error updating workspace project. Please try again.');
          this.isSaving = false;
        }
      });
    } catch (error) {
      console.error('Error updating workspace:', error);
      alert('Error updating website project. Please try again.');
      this.isSaving = false;
    }
  }

  // Styling helper methods (for component rendering)
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

  getRatingStars(rating: number): string {
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

  // Method to select built-in navigation
  selectBuiltInNavigation(): void {
    this.selectedComponentInstance = {
      id: 'built-in-nav',
      type: 'built-in-navigation',
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      zIndex: 0,
      parameters: this.builtInNavProperties
    };
  }

  // Helper methods for parameter types (used in template)
  isTextInputParameter(param: ComponentParameter): boolean {
    return param.type === 'text';
  }

  isColorParameter(param: ComponentParameter): boolean {
    return param.type === 'color';
  }

  isImageParameter(param: ComponentParameter): boolean {
    return param.type === 'image' || param.type === 'image-asset';
  }

  getComponentDefinition(componentType: string): ComponentDefinition | undefined {
    return this.websiteBuilder.getComponentDefinition(componentType);
  }

  // Get API component info (delegate to left sidebar)
  getApiComponentType(componentType: string): ComponentType | undefined {
    if (this.leftSidebar) {
      return this.leftSidebar.getApiComponentType(componentType);
    }
    return undefined;
  }

  getApiComponentTypeParameters(componentType: string): ComponentParameter[] {
    if (this.leftSidebar) {
      return this.leftSidebar.getApiComponentTypeParameters(componentType);
    }
    return [];
  }

  isApiComponent(componentType: string): boolean {
    if (this.leftSidebar) {
      return this.leftSidebar.isApiComponent(componentType);
    }
    return false;
  }
} 