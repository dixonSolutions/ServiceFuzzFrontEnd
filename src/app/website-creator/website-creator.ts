import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebsiteBuilderService, ComponentDefinition, ComponentParameter, ComponentInstance, BusinessImage, BusinessImagesResponse } from '../services/website-builder';
import { DataSvrService } from '../services/data-svr.service';
import { WorkspaceProject } from './workspace-selection.component';
import { CreateWorkspaceDto, UpdateWorkspaceDto, ComponentType, DeploymentListResponse, WorkspaceDeployment, WebsiteNameValidation } from '../models/workspace.models';
import { LeftSidebar } from './left-sidebar/left-sidebar';
import { Canvas, Page } from './canvas/canvas';

interface DeploymentLimitCheck {
  currentCount: number;
  maxAllowed: number;
  canDeploy: boolean;
  isAtWarningThreshold: boolean;
  message?: string;
}

interface DeployWorkspaceDto {
  workspaceId: string;
  deployedBy: string;
  websiteName: string;
}

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
  activeTab: 'components' | 'properties' | 'assets' = 'components';
  isSaving = false;
  isDeploying = false;
  
  // Deployment History
  showDeploymentHistory = false;
  deploymentHistory: WorkspaceDeployment[] = [];
  isLoadingDeployments = false;

  // Deployment limits
  deploymentLimitCheck: DeploymentLimitCheck | null = null;
  showDeploymentLimitWarning = false;

  // Delete deployment states
  showDeleteConfirmation = false;
  showDeleteAllConfirmation = false;
  deploymentToDelete: WorkspaceDeployment | null = null;
  isDeletingDeployment = false;
  isDeletingAllDeployments = false;

  // Deployment Dialog
  showDeploymentDialog = false;
  websiteName = '';
  websiteNameValidation: WebsiteNameValidation = { isValid: false };
  suggestedWebsiteName = '';
  
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
    private router: Router,
    private dataSvrService: DataSvrService
  ) {}

  ngOnInit(): void {
    console.log('🚀 WEBSITE CREATOR: Starting initialization');
    
    // Initialize pages first
    this.websiteBuilder.initializePages();
    
    // Components will be loaded by the left sidebar - no need to load them here
    console.log('🔄 WEBSITE CREATOR: Components will be loaded by left sidebar');
    
    // Subscribe to pages changes
    this.websiteBuilder.pages$.subscribe(pages => {
      console.log('📄 WEBSITE CREATOR: Pages updated:', pages.length);
      this.pages = pages;
    });
    
    // Subscribe to current page changes
    this.websiteBuilder.currentPageId$.subscribe(pageId => {
      console.log('📄 WEBSITE CREATOR: Current page changed:', pageId);
      this.currentPageId = pageId;
    });
    
    console.log('✅ WEBSITE CREATOR: Initialization complete');
  }

  // Workspace Management
  onWorkspaceProjectSelected(project: WorkspaceProject): void {
    console.log('🎯 Project selected:', project);
    this.currentProject = project;
    this.showWorkspaceSelection = false;
    
    // Initialize the website builder with this project
    this.websiteBuilder.createNewProject(project.name, project.description);
    
    // CRITICAL FIX: Load existing website data BEFORE initializing pages
    // This prevents the default pages from overriding the loaded data
    if (project.websiteJson) {
      console.log('📥 Loading existing website data first...');
      this.loadWebsiteDataFromJson(project.websiteJson);
    }
    
    // Initialize website builder with proper page data
    this.initializeWebsiteBuilder();
    
    // Notify left sidebar to load API components
    if (this.leftSidebar) {
      this.leftSidebar.onProjectChange(project);
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
    // Only initialize default pages if no pages have been loaded from JSON
    if (!this.pages || this.pages.length === 0) {
      console.log('🆕 No existing pages found, initializing default pages...');
      this.websiteBuilder.initializePages();
    } else {
      console.log('✅ Using existing pages from JSON:', this.pages);
      // Convert Page[] to WebsitePage[] format and load into website builder
      const websitePages = this.pages.map(page => ({
        ...page,
        isActive: page.isActive !== undefined ? page.isActive : (page.id === this.currentPageId)
      }));
      this.websiteBuilder.loadPagesData(websitePages);
    }
    
    // Subscribe to page changes
    this.websiteBuilder.pages$.subscribe((pages: any[]) => {
      console.log('📄 Website builder pages updated:', pages);
      this.pages = pages;
      if (this.canvas) {
        this.canvas.loadPageData(pages);
      }
    });

    this.websiteBuilder.currentPageId$.subscribe((pageId: string) => {
      console.log('📍 Website builder current page ID updated:', pageId);
      this.currentPageId = pageId;
    });
  }

  // Component Selection Coordination
  onComponentInstanceSelectionChange(instance: ComponentInstance | null): void {
    this.selectedComponentInstance = instance;
    console.log('🎯 Component selection changed:', instance);
    
    // Debug the parameters that should be available
    if (instance && instance.type !== 'built-in-navigation') {
      console.log('🔍 Component type:', instance.type);
      console.log('📋 Current parameters:', instance.parameters);
      
      const apiParams = this.getApiComponentTypeParameters(instance.type);
      console.log('⚙️ Available API parameters:', apiParams);
      
      const componentDef = this.getComponentDefinition(instance.type);
      console.log('📝 Component definition:', componentDef);
    }
    
    // Force change detection for parameters
    this.updateSelectedComponentParameters();
  }

  // Computed property for selected component parameters
  selectedComponentParameters: ComponentParameter[] = [];

  private updateSelectedComponentParameters(): void {
    if (!this.selectedComponentInstance || this.selectedComponentInstance.type === 'built-in-navigation') {
      this.selectedComponentParameters = [];
      return;
    }

    // First try to get parameters from API component (since these are more comprehensive)
    const apiParams = this.getApiComponentTypeParameters(this.selectedComponentInstance.type);
    if (apiParams && apiParams.length > 0) {
      this.selectedComponentParameters = apiParams;
      console.log('📊 Using API component parameters:', this.selectedComponentParameters);
      return;
    }

    // Fallback to component definition parameters
    const componentDef = this.getComponentDefinition(this.selectedComponentInstance.type);
    if (componentDef && componentDef.parameters) {
      this.selectedComponentParameters = componentDef.parameters;
      console.log('📊 Using component definition parameters:', this.selectedComponentParameters);
      return;
    }

    // No parameters found
    this.selectedComponentParameters = [];
    console.log('📊 No parameters found for component type:', this.selectedComponentInstance.type);
  }

  onComponentSelectionChange(instance: any): void {
    this.selectedComponentInstance = instance;
    this.updateSelectedComponentParameters();
  }

  // Page Management Coordination
  onPageDataChange(pages: Page[]): void {
    console.log('📄 Page data changed, updating main component...', pages);
    
    // Deep copy to ensure we have our own reference
    this.pages = pages.map(page => ({
      ...page,
      components: page.components.map(comp => ({ ...comp }))
    }));
    
    // Update website builder with new page data
    console.log('✅ Pages updated in main component:', this.pages);
    
    // Also update the current page components if needed
    this.updateCurrentPageComponents();
  }

  onCurrentPageChange(pageId: string): void {
    this.currentPageId = pageId;
    console.log('📍 Current page changed to:', pageId);
    this.updateCurrentPageComponents();
  }
  
  private updateCurrentPageComponents(): void {
    // Ensure we have the latest data for the current page
    const currentPage = this.pages.find(p => p.id === this.currentPageId);
    if (currentPage) {
      console.log(`🔄 Current page (${this.currentPageId}) has ${currentPage.components.length} components`);
    }
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
    
    // Initialize parameters object if it doesn't exist
    if (!this.selectedComponentInstance.parameters) {
      this.selectedComponentInstance.parameters = {};
    }
    
    this.selectedComponentInstance.parameters[parameterName] = value;
    
    // Notify canvas of the update
    if (this.canvas) {
      this.canvas.updateComponentInstance(this.selectedComponentInstance);
    }
    
    // Emit component instance update for other components that need it
    this.onComponentInstanceUpdated(this.selectedComponentInstance);
    
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
  async onSave(): Promise<void> {
    if (!this.currentProject) return;
    
    this.isSaving = true;
    
    try {
      // CRITICAL FIX: Get the latest page data from canvas before saving
      // This ensures all components from all pages are included
      if (this.canvas && this.canvas.pages && this.canvas.pages.length > 0) {
        console.log('📋 Getting latest page data from canvas for save...');
        this.pages = [...this.canvas.pages]; // Deep sync with canvas data
        console.log('✅ Synced pages with canvas:', this.pages);
      } else {
        console.warn('⚠️ Canvas data not available, using main component pages');
      }
      
      // Export current website data with latest page data
      this.currentProject.websiteJson = this.exportWebsiteDataAsJson();
      
      console.log('💾 Saving website data:', this.currentProject.websiteJson);
      
      // Save based on whether it's a new project or existing
      if (this.currentProject.isNew) {
        await this.saveNewWorkspace();
      } else {
        await this.updateExistingWorkspace();
      }
    } finally {
      this.isSaving = false;
    }
  }

  onPreview(): void {
    console.log('Preview clicked');
    // Implement preview functionality
  }

  onPublish(): void {
    if (!this.currentProject) {
      console.error('No project selected for publishing');
      return;
    }

    // Generate suggested website name
    this.suggestedWebsiteName = this.websiteBuilder.generateWebsiteName(this.currentProject.name);
    this.websiteName = this.suggestedWebsiteName;
    
    // Validate the suggested name
    this.validateCurrentWebsiteName();
    
    // Check deployment limits when opening dialog
    this.checkDeploymentLimitsForDialog();
    
    // Show the deployment dialog
    this.showDeploymentDialog = true;
  }

  private async checkDeploymentLimitsForDialog(): Promise<void> {
    if (!this.currentProject) return;
    
    try {
      const response = await this.websiteBuilder.getWorkspaceDeployments(this.currentProject.id).toPromise();
      
      if (response?.deployments) {
        this.deploymentHistory = response.deployments;
        this.deploymentLimitCheck = this.websiteBuilder.checkDeploymentLimit(this.deploymentHistory);
      }
    } catch (error) {
      console.warn('⚠️ Could not check deployment limits:', error);
      this.deploymentLimitCheck = null;
    }
  }

  async confirmDeployment(): Promise<void> {
    if (!this.currentProject || !this.websiteNameValidation.isValid) {
      return;
    }

    // Check deployment limits before deploying
    if (this.deploymentHistory.length > 0) {
      const limitCheck = this.websiteBuilder.checkDeploymentLimit(this.deploymentHistory);
      
      if (!limitCheck.canDeploy) {
        this.showErrorMessage(limitCheck.message || 'Deployment limit reached');
        return;
      }
      
      // Auto-cleanup if enabled
      try {
        this.deploymentHistory = await this.websiteBuilder.autoCleanupDeployments(
          this.currentProject.id, 
          this.deploymentHistory
        );
      } catch (error) {
        console.warn('⚠️ Auto-cleanup failed:', error);
      }
    }

    this.isDeploying = true;
    this.showDeploymentDialog = false;

    try {
      // Save project first
      await this.onSave();

             const response = await this.websiteBuilder.deployWorkspace(
         this.currentProject.id,
                   this.dataSvrService.currentUser?.userID || 'unknown',
         this.websiteName
       ).toPromise();
      
      if (response?.deploymentUrl) {
        // Show success message with deployment details
        const confirmationMessage = `
🎉 Website published successfully!

📍 Your website is now live at:
${response.deploymentUrl}

🆔 Deployment ID: ${response.deploymentId}
📅 Published: ${new Date().toLocaleString()}

Would you like to visit your website now?
        `.trim();

        if (confirm(confirmationMessage)) {
          window.open(response.deploymentUrl, '_blank');
        }

        console.log('✅ Deployment successful:', response);
        
        // Refresh deployment history if dialog is open
        if (this.showDeploymentHistory) {
          await this.onShowDeploymentHistory();
        }
      }
      
    } catch (error: any) {
      console.error('❌ Error deploying workspace:', error);
      
      // Handle specific error cases
      let errorMessage = 'Unknown error occurred';
      if (error.message) {
        if (error.message.includes('already taken')) {
          errorMessage = 'Website name is already taken. Please choose a different name.';
        } else if (error.message.includes('lowercase letters')) {
          errorMessage = 'Invalid website name format. Use only lowercase letters, numbers, and hyphens.';
        } else {
          errorMessage = error.message;
        }
      }
      
      alert(`❌ Failed to publish website: ${errorMessage}`);
    } finally {
      this.isDeploying = false;
    }
  }

  onWebsiteNameChange(): void {
    this.validateCurrentWebsiteName();
  }

  private validateCurrentWebsiteName(): void {
    this.websiteNameValidation = this.websiteBuilder.validateWebsiteName(this.websiteName);
  }

  onCloseDeploymentDialog(): void {
    this.showDeploymentDialog = false;
    this.websiteName = '';
    this.websiteNameValidation = { isValid: false };
  }

  getPreviewUrl(): string {
    if (!this.websiteName) return '';
    return `https://servicefuzz.com/${this.websiteName}`;
  }

  isValidCharacters(): boolean {
    return /^[a-z0-9-]*$/.test(this.websiteName);
  }

  hasValidLength(): boolean {
    return this.websiteName.length >= 3 && this.websiteName.length <= 50;
  }

  isLowercase(): boolean {
    return this.websiteName === this.websiteName.toLowerCase();
  }

  hasValidHyphens(): boolean {
    return !this.websiteName.startsWith('-') && !this.websiteName.endsWith('-');
  }

  async onShowDeploymentHistory(): Promise<void> {
    this.showDeploymentHistory = true;
    this.isLoadingDeployments = true;
    
    if (this.currentProject) {
      try {
        const response = await this.websiteBuilder.getWorkspaceDeployments(this.currentProject.id).toPromise();
        
        if (response?.deployments) {
          this.deploymentHistory = response.deployments;
          
          // Check deployment limits
          this.deploymentLimitCheck = this.websiteBuilder.checkDeploymentLimit(this.deploymentHistory);
          this.showDeploymentLimitWarning = this.deploymentLimitCheck.isAtWarningThreshold || !this.deploymentLimitCheck.canDeploy;
          
          console.log('✅ Deployment history loaded:', response);
        }
      } catch (error) {
        console.error('❌ Error loading deployment history:', error);
        this.deploymentHistory = [];
        this.deploymentLimitCheck = null;
      } finally {
        this.isLoadingDeployments = false;
      }
    }
  }

  onCloseDeploymentHistory(): void {
    this.showDeploymentHistory = false;
    this.deploymentHistory = [];
  }

  openDeploymentUrl(url: string): void {
    if (url) {
      window.open(url, '_blank');
    }
  }

  getDeploymentStatusColor(status: string): string {
    switch (status?.toLowerCase()) {
      case 'deployed': return '#28a745';
      case 'deploying': return '#ffc107';
      case 'failed': return '#dc3545';
      default: return '#6c757d';
    }
  }

  getDeploymentStatusIcon(status: string): string {
    switch (status?.toLowerCase()) {
      case 'deployed': return 'pi-check-circle';
      case 'deploying': return 'pi-spin pi-spinner';
      case 'failed': return 'pi-times-circle';
      default: return 'pi-question-circle';
    }
  }

  formatDeploymentDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  onJsonEditor(): void {
    this.showJsonEditor = !this.showJsonEditor;
  }

  // Tab Management
  onTabChange(tab: 'components' | 'properties' | 'assets'): void {
    this.activeTab = tab;
    
    // Switch to properties tab when component is selected
    if (this.selectedComponentInstance && tab === 'properties') {
      // Properties tab will auto-initialize when component is selected
    }
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
    console.log('📤 Exporting website data...');
    console.log('📄 Pages to export:', this.pages);
    
    // Validate that we have proper page data
    if (!this.pages || this.pages.length === 0) {
      console.warn('⚠️ No pages found, creating default home page');
      this.pages = [{
        id: 'home',
        name: 'Home',
        route: '/',
        isDeletable: false,
        isActive: true,
        components: []
      }];
    }
    
    // Count total components across all pages
    const totalComponents = this.pages.reduce((total, page) => total + page.components.length, 0);
    console.log(`📊 Exporting ${this.pages.length} pages with ${totalComponents} total components`);
    
    const websiteData = {
      builtInNavigation: this.builtInNavProperties,
      pages: this.pages.map(page => {
        console.log(`📋 Page "${page.name}" (${page.id}): ${page.components.length} components`);
        return {
          id: page.id,
          name: page.name,
          route: page.route,
          isDeletable: page.isDeletable,
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
        };
      })
    };
    
    const jsonString = JSON.stringify(websiteData, null, 2);
    console.log('✅ Website data exported successfully');
    
    return jsonString;
  }

  private loadWebsiteDataFromJson(jsonString: string): void {
    try {
      if (!jsonString) {
        console.warn('⚠️ No JSON data to load');
        return;
      }

      console.log('📥 Loading website data from JSON...');
      const websiteData = JSON.parse(jsonString);

      // Load built-in navigation properties
      if (websiteData.builtInNavigation) {
        this.builtInNavProperties = { ...websiteData.builtInNavigation };
        console.log('✅ Built-in navigation properties loaded');
      }

      // Load pages and components
      if (websiteData.pages && Array.isArray(websiteData.pages)) {
        this.pages = websiteData.pages.map((page: any) => {
          const loadedPage = {
            id: page.id,
            name: page.name,
            route: page.route,
            isDeletable: page.isDeletable !== undefined ? page.isDeletable : (page.id !== 'home'),
            isActive: page.id === this.currentPageId,
            components: page.components.map((comp: any) => ({
              id: comp.id,
              type: comp.type,
              x: comp.x || 0,
              y: comp.y || 0,
              width: comp.width || 300,
              height: comp.height || 100,
              zIndex: comp.zIndex || 1,
              parameters: comp.parameters || {}
            }))
          };
          
          console.log(`📋 Loaded page "${loadedPage.name}" (${loadedPage.id}): ${loadedPage.components.length} components`);
          return loadedPage;
        });

        const totalComponents = this.pages.reduce((total, page) => total + page.components.length, 0);
        console.log(`📊 Loaded ${this.pages.length} pages with ${totalComponents} total components`);

        // Set the current page to the first page if not already set
        if (!this.currentPageId && this.pages.length > 0) {
          this.currentPageId = this.pages[0].id;
        }

        // Update page active states based on current page
        this.pages = this.pages.map(page => ({
          ...page,
          isActive: page.id === this.currentPageId
        }));

        console.log('✅ Website data loaded successfully');
      } else {
        console.warn('⚠️ No pages found in JSON data');
      }
    } catch (error) {
      console.error('❌ Error loading website data:', error);
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

  // Get API component info (use direct service access)
  getApiComponentType(componentType: string): ComponentType | undefined {
    return this.websiteBuilder.getCachedApiComponentTypes().find(comp => comp.id === componentType);
  }

  getApiComponentTypeParameters(componentType: string): ComponentParameter[] {
    console.log('🔍 Getting API component type parameters for:', componentType);
    const apiComponent = this.getApiComponentType(componentType);
    console.log('📋 Found API component:', apiComponent);
    
    if (apiComponent && apiComponent.parametersSchema) {
      try {
        console.log('📝 Raw parameters schema:', apiComponent.parametersSchema);
        
        // The parametersSchema is a JSON string, parse it directly
        let parameters;
        if (typeof apiComponent.parametersSchema === 'string') {
          parameters = JSON.parse(apiComponent.parametersSchema);
        } else {
          parameters = apiComponent.parametersSchema;
        }
        
        console.log('📄 Parsed parameters:', parameters);
        
        // If it's an array, return it directly
        if (Array.isArray(parameters)) {
          console.log('⚙️ Extracted parameters (array):', parameters);
          return parameters;
        }
        
        // If it's an object with parameters property, extract it
        if (parameters && parameters.parameters) {
          console.log('⚙️ Extracted parameters (object.parameters):', parameters.parameters);
          return parameters.parameters;
        }
        
        console.log('⚠️ Parameters schema format not recognized, returning empty array');
        return [];
        
      } catch (error) {
        console.error('❌ Error parsing parameters schema:', error);
        console.error('📝 Schema content was:', apiComponent.parametersSchema);
      }
    } else {
      console.log('❌ No API component found or no parameters schema for:', componentType);
    }
    return [];
  }

  isApiComponent(componentType: string): boolean {
    return this.websiteBuilder.getCachedApiComponentTypes().some(comp => comp.id === componentType);
  }

  // Delete deployment methods
  onDeleteDeployment(deployment: WorkspaceDeployment): void {
    // Toggle confirmation state for this specific deployment
    if (deployment.id === this.deploymentToDelete?.id) {
      this.deploymentToDelete = null;
    } else {
      this.deploymentToDelete = deployment;
    }
  }

  onDeleteAllDeployments(): void {
    this.showDeleteAllConfirmation = !this.showDeleteAllConfirmation;
  }

  onCancelDeleteConfirmation(): void {
    this.showDeleteConfirmation = false;
    this.showDeleteAllConfirmation = false;
    this.deploymentToDelete = null;
  }

  isShowingDeleteConfirmation(deployment: WorkspaceDeployment): boolean {
    return this.deploymentToDelete?.id === deployment.id;
  }

  async confirmDeleteDeployment(): Promise<void> {
    if (!this.deploymentToDelete) return;

    this.isDeletingDeployment = true;
    
    try {
      const response = await this.websiteBuilder.deleteDeployment(this.deploymentToDelete.id).toPromise();
      
      if (response?.success) {
        // Remove from local array
        this.deploymentHistory = this.deploymentHistory.filter(
          d => d.id !== this.deploymentToDelete!.id
        );
        
        this.showSuccessMessage(`Deployment deleted successfully`);
        console.log('✅ Deployment deleted:', response);
      } else {
        throw new Error('Delete operation failed');
      }
      
    } catch (error) {
      console.error('❌ Error deleting deployment:', error);
      this.showErrorMessage(error instanceof Error ? error.message : 'Failed to delete deployment');
    } finally {
      this.isDeletingDeployment = false;
      this.onCancelDeleteConfirmation();
    }
  }

  async confirmDeleteAllDeployments(): Promise<void> {
    if (!this.currentProject) return;

    this.isDeletingAllDeployments = true;
    
    try {
      const response = await this.websiteBuilder.deleteAllWorkspaceDeployments(this.currentProject.id).toPromise();
      
      if (response?.success) {
        // Clear local array
        this.deploymentHistory = [];
        
        this.showSuccessMessage(`All deployments deleted successfully (${response.deletedCount} deployments)`);
        console.log('✅ All deployments deleted:', response);
      } else {
        throw new Error('Delete all operation failed');
      }
      
    } catch (error) {
      console.error('❌ Error deleting all deployments:', error);
      this.showErrorMessage(error instanceof Error ? error.message : 'Failed to delete all deployments');
    } finally {
      this.isDeletingAllDeployments = false;
      this.onCancelDeleteConfirmation();
    }
  }

  // Notification methods
  private showSuccessMessage(message: string): void {
    // For now using alert, but this could be replaced with a toast notification system
    alert(`✅ ${message}`);
  }

  private showErrorMessage(message: string): void {
    // For now using alert, but this could be replaced with a toast notification system
    alert(`❌ ${message}`);
  }

  getDeploymentLimitStatus(): string {
    if (!this.deploymentLimitCheck) return '';
    
    const { currentCount, maxAllowed } = this.deploymentLimitCheck;
    return `${currentCount}/${maxAllowed} deployments used`;
  }

  getDeploymentLimitClass(): string {
    if (!this.deploymentLimitCheck) return '';
    
    if (!this.deploymentLimitCheck.canDeploy) return 'limit-exceeded';
    if (this.deploymentLimitCheck.isAtWarningThreshold) return 'limit-warning';
    return 'limit-ok';
  }
} 