import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebsiteBuilderService, ComponentDefinition, ComponentParameter, ComponentInstance, BusinessImage, BusinessImagesResponse } from '../services/website-builder';
import { DataSvrService } from '../services/data-svr.service';
import { WebsitePagesService } from '../services/website-pages.service';
import { WebsiteFilesService } from '../services/website-files.service';
import { AIEnhancementService } from '../services/ai-enhancement.service';
import { FileBasedWebsiteBuilderService } from '../services/file-based-website-builder.service';
import { WorkspaceProject } from './workspace-selection.component';
import { CreateWorkspaceDto, UpdateWorkspaceDto, ComponentType, DeploymentListResponse, WorkspaceDeployment, WebsiteNameValidation } from '../models/workspace.models';
import { LeftSidebar } from './left-sidebar/left-sidebar';
import { WorkspaceSelectionComponent } from './workspace-selection.component';
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
  @ViewChild('workspaceSelection') workspaceSelection!: WorkspaceSelectionComponent;

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
  activeTab: 'components' | 'properties' | 'assets' | 'ai' = 'components';
  isSaving = false;
  isDeploying = false;
  
  // AI Generation State
  isAiGenerating = false;
  aiGenerationError: string | null = null;
  
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
    private route: ActivatedRoute,
    private dataSvrService: DataSvrService,
    private websitePagesService: WebsitePagesService,
    private websiteFilesService: WebsiteFilesService,
    private aiEnhancementService: AIEnhancementService,
    private fileBasedBuilder: FileBasedWebsiteBuilderService
  ) {}

  ngOnInit(): void {
    console.log('🚀 WEBSITE CREATOR: Starting initialization');
    
    // Initialize pages only when no data exists
    if (!this.pages || this.pages.length === 0) {
      this.websiteBuilder.initializePages();
    }
    
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

    // Smart routing handling
    this.handleSmartRouting();
  }

  private handleSmartRouting(): void {
    // Decide behavior based on route config and params
    const applyRouting = () => {
      const routePath = this.route.snapshot.routeConfig?.path || '';
      const params = this.route.snapshot.paramMap;

      // Edit workspace: website-creator/:businessId/:workspaceId
      const businessIdParam = params.get('businessId') || '';
      const workspaceIdParam = params.get('workspaceId') || '';
      if (businessIdParam && workspaceIdParam && routePath.includes(':workspaceId')) {
        this.showWorkspaceSelection = false;
        this.websiteBuilder.getWorkspace(workspaceIdParam).subscribe(ws => {
          const project: WorkspaceProject = {
            id: ws.id,
            name: ws.name,
            businessName: '',
            businessId: ws.businessId,
            userId: ws.userId,
            description: ws.description || '',
            createdAt: new Date(ws.createdAt),
            lastModified: new Date(ws.lastModified),
            // websiteJson: REMOVED - Now using file-based system
            isNew: false,
            deploymentStatus: ws.deploymentStatus,
            deploymentUrl: ws.deploymentUrl,
            deployedAt: ws.deployedAt ? new Date(ws.deployedAt) : undefined
          };
          this.onWorkspaceProjectSelected(project);
        });
        return;
      }

      // Select workspaces for business: website-creator/select/:businessId
      if (routePath.includes('select')) {
        const businessId = businessIdParam;
        this.showWorkspaceSelection = true;
        setTimeout(() => {
          if (this.workspaceSelection && businessId) {
            this.workspaceSelection.selectBusinessById(decodeURIComponent(businessId));
          }
        });
        return;
      }

      // New workspace: website-creator/new/name/:name[/description/:description]?businessId=...
      if (routePath.includes('new')) {
        const nameSegment = params.get('name') || 'New Website';
        const descriptionSegment = params.get('description') || '';
        const businessId = this.route.snapshot.queryParamMap.get('businessId') || '';
        const userId = this.dataSvrService.currentUser?.userID || '';

        this.showWorkspaceSelection = false;
        const newProject: WorkspaceProject = {
          id: this.generateUniqueId(),
          name: decodeURIComponent(nameSegment),
          businessName: '',
          businessId: businessId,
          userId: userId,
          description: decodeURIComponent(descriptionSegment),
          createdAt: new Date(),
          lastModified: new Date(),
          isNew: true,
        } as WorkspaceProject;

        this.onWorkspaceProjectCreated(newProject);
        setTimeout(() => this.onSave(), 0);
        return;
      }

      // Base route: show selection UI
      this.showWorkspaceSelection = true;
    };

    // Subscribe to route changes; subscription emits current value immediately,
    // so we don't need to call applyRouting() separately (prevents double execution)
    this.route.paramMap.subscribe(() => applyRouting());
  }

  // Workspace Management - Updated for File-Based System
  async onWorkspaceProjectSelected(project: WorkspaceProject): Promise<void> {
    console.log('🎯 Project selected:', project);
    this.currentProject = project;
    this.showWorkspaceSelection = false;
    
    // Reflect edit route with business and workspace ids when possible
    if (project.businessId && project.id) {
      this.router.navigate(['/website-creator', project.businessId, project.id]);
    }
    
    try {
      // Initialize file-based builder first
      await this.initializeFileBasedBuilder();
      
      // Check if we need to migrate from old JSON system
      // Migration logic would be handled by the backend API when loading existing workspaces
      console.log('📥 File-based system initialized for workspace:', project.id);
      
      // Initialize website builder with proper page data
      this.initializeWebsiteBuilder();
      
      // Notify left sidebar to load API components
      if (this.leftSidebar) {
        this.leftSidebar.onProjectChange(project);
      }
      
      console.log('✅ File-based workspace initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing file-based workspace:', error);
      // Fallback to traditional initialization
      this.websiteBuilder.createNewProject(project.name, project.description);
      this.initializeWebsiteBuilder();
    }
  }

  onWorkspaceProjectCreated(project: WorkspaceProject): void {
    console.log('New project created:', project);
    this.currentProject = project;
    this.showWorkspaceSelection = false;
    // Reflect edit route with business and (temporary) workspace id
    if (project.businessId) {
      this.router.navigate(['/website-creator', project.businessId, project.id]);
    }
    
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
      const cloned = (pages || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        route: p.route,
        isDeletable: p.isDeletable,
        isActive: p.isActive,
        components: (p.components || []).map((c: any) => ({
          id: c.id,
          type: c.type,
          x: c.x,
          y: c.y,
          width: c.width,
          height: c.height,
          zIndex: c.zIndex,
          parameters: { ...(c.parameters || {}) }
        }))
      }));
      this.pages = cloned;
      // Ensure currentPageId valid at first load
      const hasCurrent = this.pages.some(p => p.id === this.currentPageId);
      if (!hasCurrent && this.pages.length > 0) {
        const firstId = this.pages[0].id;
        this.currentPageId = firstId;
        try { this.websiteBuilder.setCurrentPage(firstId); } catch {}
      }
      // Defer load into canvas to ensure child is ready
      setTimeout(() => {
        if (this.canvas && Array.isArray(cloned)) {
          this.canvas.loadPageData(cloned);
        }
      }, 0);
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
    
    // Deep copy to ensure we have our own reference (isolate per project)
    this.pages = pages.map(page => ({
      id: page.id,
      name: page.name,
      route: page.route,
      isDeletable: page.isDeletable,
      isActive: page.isActive,
      components: page.components.map(comp => ({
        id: comp.id,
        type: comp.type,
        x: comp.x,
        y: comp.y,
        width: comp.width,
        height: comp.height,
        zIndex: comp.zIndex,
        parameters: { ...(comp.parameters || {}) }
      }))
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

  // Project Management - Updated for File-Based System
  async onSave(): Promise<void> {
    // Guard against concurrent/duplicate saves
    if (this.isSaving) return;
    if (!this.currentProject) return;
    
    this.isSaving = true;
    
    try {
      console.log('💾 Saving website project (file-based system)...');
      
      // Save based on whether it's a new project or existing
      if (this.currentProject.isNew) {
        await this.saveNewWorkspace();
      } else {
        // For existing workspaces, save both workspace metadata AND files
        await this.updateExistingWorkspace();
        
        // Save all current files using bulk save
        console.log('💾 Saving website files...');
        await this.saveAllChanges();
      }
      
      console.log('✅ Website project and files saved successfully');
      alert('Website saved successfully!');
      
    } catch (error) {
      console.error('❌ Error saving website project:', error);
      alert('Error saving website project. Please try again.');
    } finally {
      this.isSaving = false;
    }
  }

  async onPreview(): Promise<void> {
    console.log('Preview clicked - generating file-based preview');
    
    if (!this.currentProject) {
      console.error('No project selected for preview');
      return;
    }

    try {
      // Generate preview HTML from files
      const previewHtml = await this.fileBasedBuilder.generatePreview('/');
      
      if (previewHtml) {
        // Open preview in new window
        const previewWindow = window.open('', '_blank', 'width=1200,height=800');
        if (previewWindow) {
          previewWindow.document.open();
          previewWindow.document.write(previewHtml);
          previewWindow.document.close();
          previewWindow.document.title = `Preview: ${this.currentProject.name}`;
        }
      } else {
        alert('Error generating preview. Please ensure your website has content.');
      }
    } catch (error) {
      console.error('❌ Error generating preview:', error);
      alert('Error generating preview. Please try again.');
    }
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

  openFileBrowserInNewTab(): void {
    if (this.currentProject?.id) {
      const url = `/file-browser/${this.currentProject.id}`;
      window.open(url, '_blank');
    } else {
      alert('Please select a workspace first.');
    }
  }

  // Tab Management
  onTabChange(tab: 'components' | 'properties' | 'assets' | 'ai'): void {
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

  // ===================== NEW FILE-BASED DATA MANAGEMENT =====================

  /**
   * Initialize file-based website builder for current project
   */
  private async initializeFileBasedBuilder(): Promise<void> {
    if (!this.currentProject) return;

    try {
      // Initialize the file-based builder with current workspace
      await this.fileBasedBuilder.initializeWorkspace(this.currentProject.id);
      
      // Subscribe to file-based builder state
      this.fileBasedBuilder.websitePages$.subscribe(pages => {
        // Convert API pages to local page format for compatibility
        this.pages = pages.map(apiPage => ({
          id: apiPage.id,
          name: apiPage.pageName,
          route: apiPage.route,
          isDeletable: !apiPage.isHomePage,
          isActive: apiPage.isHomePage,
          components: [] // Components are now managed separately
        }));
        
        console.log('📄 File-based pages loaded:', this.pages);
      });
      
      this.fileBasedBuilder.currentPageId$.subscribe(pageId => {
        if (pageId) {
          this.currentPageId = pageId;
          console.log('📍 Current page changed to:', pageId);
        }
      });
      
      console.log('✅ File-based website builder initialized');
    } catch (error) {
      console.error('❌ Error initializing file-based builder:', error);
    }
  }

  /**
   * Export website data as files (replaces JSON export)
   */
  private async exportWebsiteAsFiles(): Promise<{ files: any[], pages: any[], assets: any[] }> {
    console.log('📤 Exporting website as files...');
    
    try {
      const files = this.fileBasedBuilder.getCurrentFiles();
      const pages = this.fileBasedBuilder.getCurrentPages();
      const assets = this.fileBasedBuilder.getCurrentAssets();
      
      console.log(`📊 Exporting ${files.length} files, ${pages.length} pages, ${assets.length} assets`);
      
      return {
        files: files.map(file => ({
          fileName: file.fileName,
          fileType: file.fileType,
          content: file.content,
          fileSize: file.fileSize
        })),
        pages: pages.map(page => ({
          id: page.id,
          pageName: page.pageName,
          route: page.route,
          title: page.title,
          metaDescription: page.metaDescription,
          customCSS: page.customCSS,
          customJS: page.customJS,
          isHomePage: page.isHomePage
        })),
        assets: assets.map(asset => ({
          fileName: asset.fileName,
          contentType: asset.contentType,
          filePath: asset.filePath,
          altText: asset.altText
        }))
      };
    } catch (error) {
      console.error('❌ Error exporting website files:', error);
      return { files: [], pages: [], assets: [] };
    }
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
        description: this.currentProject.description
        // websiteJson: REMOVED - Now using file-based system
      };

      this.websiteBuilder.createWorkspace(workspaceDto).subscribe({
        next: async (response) => {
          this.currentProject!.id = response.workspaceId;
          this.currentProject!.isNew = false;
          console.log('New workspace saved with ID:', response.workspaceId);
          
          // Initialize file-based builder for new workspace
          await this.initializeFileBasedBuilder();
          
          alert('Website project saved successfully!');
          this.isSaving = false;
          // Update route to reflect real workspace id from API
          if (this.currentProject?.businessId && this.currentProject?.id) {
            this.router.navigate(['/website-creator', this.currentProject.businessId, this.currentProject.id]);
          }
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
        description: this.currentProject.description
        // websiteJson: REMOVED - Now using file-based system
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

  // AI Generation Event Handlers
  onAiGenerationStateChange(state: {isGenerating: boolean, error?: string}): void {
    console.log('🤖 AI Generation state changed:', state);
    this.isAiGenerating = state.isGenerating;
    this.aiGenerationError = state.error || null;
    
    if (state.error) {
      console.error('❌ AI Generation error:', state.error);
    }
  }

  onWebsiteUpdatedFromAi(websiteData: any): void {
    console.log('🎨 Website updated from AI, applying changes to file-based system...');
    
    try {
      // Handle AI updates in the new file-based system
      // AI updates would now work with individual files and components
      console.log('AI updates will be processed through file-based system');
      
      // Update the current project (no more websiteJson)
      if (this.currentProject) {
        console.log('Project updated with AI enhancements');
      }
      
      // Trigger canvas refresh
      if (this.canvas) {
        this.canvas.refreshCanvas();
      }
      
      console.log('✅ Canvas updated successfully with AI-generated website');
      
    } catch (error) {
      console.error('❌ Error applying AI-generated website to canvas:', error);
      this.aiGenerationError = 'Failed to apply AI changes to canvas';
    }
  }

  // ===================== NEW ENHANCED WEBSITE BUILDER METHODS =====================

  /**
   * Update workspace settings (subdomain, custom domain, global CSS/JS, favicon)
   */
  async updateWorkspaceSettings(settings: {
    subdomain?: string;
    customDomain?: string;
    globalCSS?: string;
    globalJS?: string;
    faviconUrl?: string;
  }): Promise<void> {
    if (!this.currentProject) return;

    try {
      const response = await this.websiteBuilder.updateWorkspaceSettings(this.currentProject.id, settings).toPromise();
      console.log('✅ Workspace settings updated:', response);
      
      // Update current project with new settings
      if (this.currentProject) {
        Object.assign(this.currentProject, settings);
      }
      
      alert('Workspace settings updated successfully!');
    } catch (error) {
      console.error('❌ Error updating workspace settings:', error);
      alert('Error updating workspace settings. Please try again.');
    }
  }

  /**
   * Generate subdomain for current workspace
   */
  async generateSubdomain(preferredSubdomain: string): Promise<void> {
    if (!this.currentProject) return;

    try {
      const response = await this.websiteBuilder.generateSubdomain(
        this.currentProject.businessId,
        this.currentProject.id,
        preferredSubdomain
      ).toPromise();
      
      console.log('✅ Subdomain generated:', response);
      
      if (response?.isAvailable) {
        alert(`Subdomain "${response.subdomain}" is available and has been reserved for your workspace!`);
        
        // Update workspace settings with new subdomain
        await this.updateWorkspaceSettings({ subdomain: response.subdomain });
      } else {
        alert(`Subdomain "${preferredSubdomain}" is not available. Please try a different name.`);
      }
    } catch (error) {
      console.error('❌ Error generating subdomain:', error);
      alert('Error generating subdomain. Please try again.');
    }
  }

  /**
   * Load website pages from API
   */
  async loadWebsitePages(): Promise<void> {
    if (!this.currentProject) return;

    try {
      const response = await this.websitePagesService.getPages(this.currentProject.id).toPromise();
      
      if (response?.pages) {
        console.log('✅ Website pages loaded from API:', response.pages);
        
        // Convert API pages to local page format
        const apiPages = response.pages.map(apiPage => ({
          id: apiPage.id,
          name: apiPage.pageName,
          route: apiPage.route,
          isDeletable: !apiPage.isHomePage,
          isActive: apiPage.isHomePage,
          components: [] // Components will be loaded separately
        }));
        
        this.pages = apiPages;
        this.websiteBuilder.loadPagesData(apiPages);
      }
    } catch (error) {
      console.error('❌ Error loading website pages:', error);
      // Fall back to default pages if API fails
      this.websiteBuilder.initializePages();
    }
  }

  /**
   * Create new website page via API
   */
  async createWebsitePage(pageName: string, route: string, title?: string, metaDescription?: string): Promise<void> {
    if (!this.currentProject) return;

    try {
      const pageDto = {
        pageName,
        route: route.startsWith('/') ? route : `/${route}`,
        title,
        metaDescription,
        isHomePage: false
      };

      const response = await this.websitePagesService.createPage(this.currentProject.id, pageDto).toPromise();
      
      if (response) {
        console.log('✅ Website page created:', response);
        
        // Add to local pages array
        const newPage: Page = {
          id: response.id,
          name: response.pageName,
          route: response.route,
          isDeletable: !response.isHomePage,
          isActive: false,
          components: []
        };
        
        this.pages.push(newPage);
        this.websiteBuilder.loadPagesData(this.pages.map(p => ({
          ...p,
          isActive: p.isActive || false
        })));
        
        alert(`Page "${pageName}" created successfully!`);
      }
    } catch (error) {
      console.error('❌ Error creating website page:', error);
      alert('Error creating page. Please try again.');
    }
  }

  /**
   * Delete website page via API
   */
  async deleteWebsitePage(pageId: string): Promise<void> {
    if (!this.currentProject) return;

    const page = this.pages.find(p => p.id === pageId);
    if (!page || !page.isDeletable) {
      alert('This page cannot be deleted.');
      return;
    }

    if (!confirm(`Are you sure you want to delete the page "${page.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await this.websitePagesService.deletePage(pageId).toPromise();
      
      if (response?.success) {
        console.log('✅ Website page deleted:', pageId);
        
        // Remove from local pages array
        this.pages = this.pages.filter(p => p.id !== pageId);
        this.websiteBuilder.loadPagesData(this.pages.map(p => ({
          ...p,
          isActive: p.isActive || false
        })));
        
        // Switch to home page if current page was deleted
        if (this.currentPageId === pageId) {
          this.currentPageId = 'home';
          this.websiteBuilder.setCurrentPage('home');
        }
        
        alert(`Page "${page.name}" deleted successfully!`);
      }
    } catch (error) {
      console.error('❌ Error deleting website page:', error);
      alert('Error deleting page. Please try again.');
    }
  }

  /**
   * Get AI component suggestions
   */
  async getAIComponentSuggestions(): Promise<void> {
    if (!this.currentProject) return;

    try {
      this.isAiGenerating = true;
      this.aiGenerationError = null;
      
      const response = await this.aiEnhancementService.getComponentSuggestions(this.currentProject.id).toPromise();
      
      if (response?.suggestions) {
        console.log('✅ AI component suggestions received:', response.suggestions);
        
        // Display suggestions to user (this could be enhanced with a proper UI)
        const suggestionsList = response.suggestions.map((s: any) => 
          `• ${s.name} (${s.category}) - ${s.description}`
        ).join('\n');
        
        alert(`AI Component Suggestions:\n\n${suggestionsList}`);
      }
    } catch (error) {
      console.error('❌ Error getting AI component suggestions:', error);
      this.aiGenerationError = 'Failed to get AI component suggestions';
      alert('Error getting AI suggestions. Please try again.');
    } finally {
      this.isAiGenerating = false;
    }
  }

  /**
   * Enhance selected components with AI
   */
  async enhanceComponentsWithAI(prompt: string): Promise<void> {
    if (!this.currentProject || !this.selectedComponentInstance) return;

    try {
      this.isAiGenerating = true;
      this.aiGenerationError = null;
      
      const componentIds = [this.selectedComponentInstance.id];
      const response = await this.aiEnhancementService.enhanceComponents(
        this.currentProject.id,
        componentIds,
        prompt
      ).toPromise();
      
      if (response?.enhancedComponents) {
        console.log('✅ Components enhanced by AI:', response.enhancedComponents);
        
        // Apply enhanced components to canvas
        response.enhancedComponents.forEach((enhancedComp: any) => {
          if (this.canvas) {
            this.canvas.updateComponentInstance({
              id: enhancedComp.componentId,
              type: enhancedComp.componentType,
              x: enhancedComp.xPosition,
              y: enhancedComp.yPosition,
              width: enhancedComp.width,
              height: enhancedComp.height,
              zIndex: enhancedComp.zIndex,
              parameters: enhancedComp.parameters ? JSON.parse(enhancedComp.parameters) : {}
            });
          }
        });
        
        alert('Components enhanced successfully with AI!');
      }
    } catch (error) {
      console.error('❌ Error enhancing components with AI:', error);
      this.aiGenerationError = 'Failed to enhance components with AI';
      alert('Error enhancing components. Please try again.');
    } finally {
      this.isAiGenerating = false;
    }
  }

  /**
   * Generate SEO content for current page
   */
  async generateSEOContent(pageType: string, keywords: string[]): Promise<void> {
    if (!this.currentProject) return;

    try {
      this.isAiGenerating = true;
      this.aiGenerationError = null;
      
      const response = await this.aiEnhancementService.generateSEOContent(
        this.currentProject.businessId,
        pageType,
        keywords
      ).toPromise();
      
      if (response) {
        console.log('✅ SEO content generated:', response);
        
        // Display generated SEO content (this could be enhanced with a proper UI)
        const seoContent = `
Title: ${response.title}

Meta Description: ${response.metaDescription}

Content Suggestions:
${response.content}
        `.trim();
        
        alert(`Generated SEO Content:\n\n${seoContent}`);
      }
    } catch (error) {
      console.error('❌ Error generating SEO content:', error);
      this.aiGenerationError = 'Failed to generate SEO content';
      alert('Error generating SEO content. Please try again.');
    } finally {
      this.isAiGenerating = false;
    }
  }

  /**
   * Load website files from API
   */
  async loadWebsiteFiles(): Promise<void> {
    if (!this.currentProject) return;

    try {
      const files = await this.websiteFilesService.getFiles(this.currentProject.id).toPromise();
      
      if (files && Array.isArray(files)) {
        console.log('✅ Website files loaded:', files);
        
        // Display files (this could be enhanced with a proper file manager UI)
        const filesList = files.map((file: any) => 
          `• ${file.fileName} (${file.fileType}) - ${this.formatFileSize(file.fileSize)}`
        ).join('\n');
        
        if (filesList) {
          alert(`Website Files:\n\n${filesList}`);
        } else {
          alert('No website files found.');
        }
      }
    } catch (error) {
      console.error('❌ Error loading website files:', error);
      alert('Error loading website files.');
    }
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // ===================== NEW FILE-BASED WEBSITE BUILDER METHODS =====================

  /**
   * Create new HTML file
   */
  async createHtmlFile(fileName: string, content: string): Promise<void> {
    if (!this.currentProject) return;

    try {
      const file = await this.websiteFilesService.createFile(this.currentProject.id, {
        fileName: fileName,
        fileType: 'html',
        content: content
      }).toPromise();

      if (file) {
        console.log('✅ HTML file created:', file.fileName);
        alert(`HTML file "${fileName}" created successfully!`);
        
        // Refresh files list
        await this.loadWebsiteFiles();
      }
    } catch (error) {
      console.error('❌ Error creating HTML file:', error);
      alert('Error creating HTML file. Please try again.');
    }
  }

  /**
   * Update CSS file content
   */
  async updateCssFile(fileId: string, cssContent: string): Promise<void> {
    try {
      const file = await this.websiteFilesService.updateFile(fileId, cssContent).toPromise();
      
      if (file) {
        console.log('✅ CSS file updated:', file.fileName);
        
        // Update local file cache
        await this.fileBasedBuilder.updateFileContent(fileId, cssContent);
        
        // Regenerate preview
        await this.generateLivePreview();
      }
    } catch (error) {
      console.error('❌ Error updating CSS file:', error);
      alert('Error updating CSS file. Please try again.');
    }
  }

  /**
   * Update JavaScript file content
   */
  async updateJsFile(fileId: string, jsContent: string): Promise<void> {
    try {
      const file = await this.websiteFilesService.updateFile(fileId, jsContent).toPromise();
      
      if (file) {
        console.log('✅ JavaScript file updated:', file.fileName);
        
        // Update local file cache
        await this.fileBasedBuilder.updateFileContent(fileId, jsContent);
        
        // Regenerate preview
        await this.generateLivePreview();
      }
    } catch (error) {
      console.error('❌ Error updating JavaScript file:', error);
      alert('Error updating JavaScript file. Please try again.');
    }
  }

  /**
   * Generate live preview in iframe
   */
  async generateLivePreview(): Promise<void> {
    if (!this.currentProject) return;

    try {
      const previewHtml = await this.fileBasedBuilder.generatePreview('/');
      
      // Update preview iframe if it exists
      const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
      if (iframe) {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        
        if (iframeDoc) {
          iframeDoc.open();
          iframeDoc.write(previewHtml);
          iframeDoc.close();
        }
      }
    } catch (error) {
      console.error('❌ Error generating live preview:', error);
    }
  }

  /**
   * Add component to current page using file-based system
   */
  async addComponentToCurrentPage(componentType: string, xPosition: number, yPosition: number, parameters: any): Promise<void> {
    // Get current page ID from the file-based builder
    let currentPageId: string | null = null;
    this.fileBasedBuilder.currentPageId$.subscribe(pageId => {
      currentPageId = pageId;
    }).unsubscribe();
    if (!currentPageId) {
      console.error('No current page selected');
      return;
    }

    try {
      const component = await this.fileBasedBuilder.addComponentToPage(currentPageId, {
        componentType,
        xPosition,
        yPosition,
        width: 300,
        height: 100,
        parameters
      });

      if (component) {
        console.log('✅ Component added to page:', component);
        
        // Refresh canvas and preview
        await this.generateLivePreview();
        
        // Update canvas if available
        if (this.canvas) {
          // Convert to canvas format and add
          const canvasComponent = {
            id: component.componentId,
            type: component.componentType,
            x: component.xPosition,
            y: component.yPosition,
            width: component.width,
            height: component.height,
            zIndex: component.zIndex,
            parameters: component.parameters ? JSON.parse(component.parameters) : {}
          };
          
          // Add to current page in canvas
          const currentPage = this.canvas.pages.find(p => p.id === currentPageId);
          if (currentPage) {
            currentPage.components.push(canvasComponent);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error adding component to page:', error);
      alert('Error adding component. Please try again.');
    }
  }

  /**
   * Update page SEO metadata
   */
  async updatePageSEO(pageId: string, seoData: {
    title?: string;
    metaDescription?: string;
    customCSS?: string;
    customJS?: string;
  }): Promise<void> {
    try {
      const page = await this.websitePagesService.updatePage(pageId, seoData).toPromise();
      
      if (page) {
        console.log('✅ Page SEO updated:', page.pageName);
        alert('Page SEO metadata updated successfully!');
        
        // Refresh pages list
        await this.loadWebsitePages();
        
        // Regenerate preview
        await this.generateLivePreview();
      }
    } catch (error) {
      console.error('❌ Error updating page SEO:', error);
      alert('Error updating page SEO. Please try again.');
    }
  }

  /**
   * Get current website files with real-time updates
   */
  getCurrentWebsiteFiles(): any[] {
    return this.fileBasedBuilder.getCurrentFiles();
  }

  /**
   * Get current website pages with real-time updates
   */
  getCurrentWebsitePages(): any[] {
    return this.fileBasedBuilder.getCurrentPages();
  }

  /**
   * Switch to different page
   */
  switchToPage(pageId: string): void {
    this.fileBasedBuilder.setCurrentPage(pageId);
    this.currentPageId = pageId;
    
    // Update canvas if available
    if (this.canvas) {
      // Load components for this page
      this.websitePagesService.getPageComponents(pageId).subscribe(response => {
        if (response?.components) {
          const pageComponents = response.components.map(comp => ({
            id: comp.componentId,
            type: comp.componentType,
            x: comp.xPosition,
            y: comp.yPosition,
            width: comp.width,
            height: comp.height,
            zIndex: comp.zIndex,
            parameters: comp.parameters ? JSON.parse(comp.parameters) : {}
          }));
          
          // Update canvas with page components
          const currentPage = this.canvas.pages.find(p => p.id === pageId);
          if (currentPage) {
            currentPage.components = pageComponents;
          }
        }
      });
    }
  }

  /**
   * Real-time file content editor
   */
  async openFileEditor(fileId: string, fileName: string, fileType: string): Promise<void> {
    const files = this.getCurrentWebsiteFiles();
    const file = files.find(f => f.id === fileId);
    
    if (!file) {
      console.error('File not found:', fileId);
      return;
    }

    // Create a simple modal editor (this could be enhanced with a proper code editor)
    const newContent = prompt(`Edit ${fileName} (${fileType.toUpperCase()}):`, file.content);
    
    if (newContent !== null && newContent !== file.content) {
      switch (fileType) {
        case 'css':
          await this.updateCssFile(fileId, newContent);
          break;
        case 'js':
          await this.updateJsFile(fileId, newContent);
          break;
        case 'html':
          await this.websiteFilesService.updateFile(fileId, newContent).toPromise();
          await this.fileBasedBuilder.updateFileContent(fileId, newContent);
          await this.generateLivePreview();
          break;
        default:
          await this.websiteFilesService.updateFile(fileId, newContent).toPromise();
          await this.fileBasedBuilder.updateFileContent(fileId, newContent);
          break;
      }
    }
  }

  // ===================== NEW BULK SAVE & ASSET MANAGEMENT =====================

  /**
   * Bulk save multiple files at once
   */
  async bulkSaveFiles(fileUpdates: Array<{
    id?: string;
    fileName?: string;
    fileType?: string;
    content?: string;
  }>): Promise<void> {
    if (!this.currentProject) return;

    try {
      const result = await this.fileBasedBuilder.bulkSaveFiles(fileUpdates);
      
      if (result.success) {
        console.log(`✅ Bulk save completed: ${result.updatedFiles.length} updated, ${result.createdFiles.length} created`);
        alert(`Successfully saved ${result.updatedFiles.length + result.createdFiles.length} files!`);
        
        // Refresh preview
        await this.generateLivePreview();
      } else {
        alert('Error saving files. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error in bulk save:', error);
      alert('Error saving files. Please try again.');
    }
  }

  /**
   * Upload asset file
   */
  async uploadAsset(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const altText = prompt(`Enter alt text for ${file.name} (optional):`);

    try {
      const asset = await this.fileBasedBuilder.uploadAsset(file, altText || undefined);
      
      if (asset) {
        console.log('✅ Asset uploaded:', asset.fileName);
        alert(`Asset "${asset.fileName}" uploaded successfully!`);
        
        // Clear the input
        input.value = '';
      } else {
        alert('Error uploading asset. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error uploading asset:', error);
      alert(`Error uploading asset: ${error}`);
      
      // Clear the input
      input.value = '';
    }
  }

  /**
   * Delete asset
   */
  async deleteAsset(assetId: string, fileName: string): Promise<void> {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) return;

    try {
      const success = await this.fileBasedBuilder.deleteAsset(assetId);
      
      if (success) {
        console.log('✅ Asset deleted:', fileName);
        alert(`Asset "${fileName}" deleted successfully!`);
      } else {
        alert('Error deleting asset. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error deleting asset:', error);
      alert('Error deleting asset. Please try again.');
    }
  }

  /**
   * Get current website assets
   */
  getCurrentWebsiteAssets(): any[] {
    return this.fileBasedBuilder.getCurrentAssets();
  }

  /**
   * Get asset URL for use in HTML/CSS
   */
  getAssetUrl(assetId: string): string {
    return this.fileBasedBuilder.getAssetUrl(assetId);
  }

  /**
   * Get file type category for UI display
   */
  getFileTypeCategory(fileName: string): string {
    return this.fileBasedBuilder.getFileTypeCategory(fileName);
  }

  /**
   * Open asset manager
   */
  openAssetManager(): void {
    const assets = this.getCurrentWebsiteAssets();
    
    if (assets.length === 0) {
      alert('No assets found. Upload assets using the file upload button.');
      return;
    }

    // Create a simple asset list (this could be enhanced with a proper asset manager UI)
    const assetList = assets.map((asset, index) => 
      `${index + 1}. ${asset.fileName} (${this.fileBasedBuilder.formatFileSize(asset.fileSize)})`
    ).join('\n');

    const selectedIndex = prompt(`Select an asset:\n\n${assetList}\n\nEnter asset number (1-${assets.length}) or 0 to cancel:`);
    
    if (selectedIndex && selectedIndex !== '0') {
      const index = parseInt(selectedIndex) - 1;
      if (index >= 0 && index < assets.length) {
        const asset = assets[index];
        const action = prompt(`Asset: ${asset.fileName}\nURL: ${this.getAssetUrl(asset.id)}\n\nActions:\n1. Copy URL\n2. Delete asset\n\nEnter action (1-2):`);
        
        if (action === '1') {
          // Copy URL to clipboard
          navigator.clipboard.writeText(this.getAssetUrl(asset.id)).then(() => {
            alert('Asset URL copied to clipboard!');
          });
        } else if (action === '2') {
          this.deleteAsset(asset.id, asset.fileName);
        }
      } else {
        alert('Invalid asset number selected.');
      }
    }
  }

  /**
   * Save all changes at once using bulk save
   */
  async saveAllChanges(): Promise<void> {
    if (!this.currentProject) return;

    try {
      console.log('💾 Starting bulk save of all changes...');
      
      // 1. Save component changes to database first
      await this.saveComponentChanges();
      
      // 2. Get all current files from file-based builder
      const files = this.getCurrentWebsiteFiles();
      
      if (files.length === 0) {
        console.warn('⚠️ No files found to save');
        return;
      }
      
      console.log(`📁 Preparing to save ${files.length} files`);
      
      // 3. Create bulk update array (update all existing files)
      const fileUpdates = files.map(file => ({
        id: file.id,
        content: file.content
      }));

      // 4. Perform bulk save
      await this.bulkSaveFiles(fileUpdates);
      
      console.log('✅ All changes saved successfully');
      
    } catch (error) {
      console.error('❌ Error saving all changes:', error);
      throw error; // Re-throw so the calling method can handle it
    }
  }

  /**
   * Save component changes to database
   */
  private async saveComponentChanges(): Promise<void> {
    if (!this.canvas || !this.pages) return;

    try {
      console.log('💾 Saving component changes...');
      
      // Get current page components from canvas
      const currentPage = this.pages.find(p => p.id === this.currentPageId);
      if (!currentPage || !currentPage.components) {
        console.log('ℹ️ No components to save on current page');
        return;
      }

      console.log(`📦 Saving ${currentPage.components.length} components for page ${currentPage.name}`);
      
      // Update HTML files with current component state
      await this.syncComponentsToHtml();
      
      // Save each component to database using the WebsiteBuilder service
      for (const component of currentPage.components) {
        try {
          this.websiteBuilder.updateComponent(component.id, {
            x: component.x,
            y: component.y,
            width: component.width,
            height: component.height,
            zIndex: component.zIndex,
            parameters: component.parameters || {}
          });
        } catch (componentError) {
          console.warn(`⚠️ Failed to save component ${component.id}:`, componentError);
        }
      }
      
      console.log('✅ Component changes saved');
      
    } catch (error) {
      console.error('❌ Error saving component changes:', error);
      throw error;
    }
  }

  /**
   * Sync current components to HTML files
   */
  private async syncComponentsToHtml(): Promise<void> {
    if (!this.currentProject) return;

    try {
      console.log('🔄 Syncing components to HTML files...');
      
      // Get current page
      const currentPage = this.pages.find(p => p.id === this.currentPageId);
      if (!currentPage) return;

      // Generate HTML for all components on the current page
      const componentsHtml = currentPage.components.map(component => {
        return this.generateComponentHtml(component);
      }).join('\n');

      // Get current HTML file
      const files = this.getCurrentWebsiteFiles();
      const htmlFile = files.find(f => f.fileType === 'html' && f.fileName === 'index.html');
      
      if (htmlFile) {
        // Replace the {{components}} placeholder with actual component HTML
        let updatedHtml = htmlFile.content;
        if (updatedHtml.includes('{{components}}')) {
          updatedHtml = updatedHtml.replace('{{components}}', componentsHtml);
        } else {
          // If no placeholder, append to body
          updatedHtml = updatedHtml.replace('</body>', `${componentsHtml}\n</body>`);
        }

        // Update the file content in the file-based builder
        await this.fileBasedBuilder.updateFileContent(htmlFile.id, updatedHtml);
        
        console.log('✅ Components synced to HTML');
      }
      
    } catch (error) {
      console.error('❌ Error syncing components to HTML:', error);
    }
  }

  /**
   * Generate HTML for a single component
   */
  private generateComponentHtml(component: any): string {
    const style = `position: absolute; left: ${component.x}px; top: ${component.y}px; width: ${component.width}px; height: ${component.height}px; z-index: ${component.zIndex};`;
    
    switch (component.type) {
      case 'hero-section':
        return `
          <section class="hero component" data-component-id="${component.id}" style="${style}">
            <div class="container">
              <h1>${component.parameters?.title || 'Welcome'}</h1>
              <p>${component.parameters?.subtitle || 'Subtitle'}</p>
              <a href="${component.parameters?.buttonLink || '#'}" class="btn">${component.parameters?.buttonText || 'Button'}</a>
            </div>
          </section>
        `;
      case 'contact-form':
        return `
          <div class="contact-form component" data-component-id="${component.id}" style="${style}">
            <h2>${component.parameters?.title || 'Contact Us'}</h2>
            <form>
              <input type="text" name="name" placeholder="Your Name" required />
              <input type="email" name="email" placeholder="Your Email" required />
              <textarea name="message" placeholder="Your Message" rows="5" required></textarea>
              <button type="submit">${component.parameters?.submitText || 'Send Message'}</button>
            </form>
          </div>
        `;
      case 'text-block':
        return `
          <div class="text-block component" data-component-id="${component.id}" style="${style}">
            <h2>${component.parameters?.heading || 'Heading'}</h2>
            <p>${component.parameters?.content || 'Content goes here...'}</p>
          </div>
        `;
      default:
        return `
          <div class="component" data-component-id="${component.id}" style="${style}">
            <h3>Component: ${component.type}</h3>
            <p>Parameters: ${JSON.stringify(component.parameters || {})}</p>
          </div>
        `;
    }
  }

  /**
   * Open file manager dialog
   */
  openFileManager(): void {
    const files = this.getCurrentWebsiteFiles();
    
    if (files.length === 0) {
      alert('No files found. Files will be created automatically when you add content.');
      return;
    }

    // Create a simple file list (this could be enhanced with a proper file manager UI)
    const fileList = files.map((file, index) => 
      `${index + 1}. ${file.fileName} (${file.fileType.toUpperCase()}) - ${this.formatFileSize(file.fileSize)}`
    ).join('\n');

    const selectedIndex = prompt(`Select a file to edit:\n\n${fileList}\n\nEnter file number (1-${files.length}):`);
    
    if (selectedIndex) {
      const index = parseInt(selectedIndex) - 1;
      if (index >= 0 && index < files.length) {
        const file = files[index];
        this.openFileEditor(file.id, file.fileName, file.fileType);
      } else {
        alert('Invalid file number selected.');
      }
    }
  }

  // ===================== COMPONENT EVENT HANDLERS =====================

  /**
   * Handle component addition - sync to files
   */
  onComponentAdded(component: any): void {
    console.log('📦 Component added:', component);
    // Sync components to HTML files when a component is added
    this.syncComponentsToHtml().catch(error => {
      console.error('❌ Error syncing components after addition:', error);
    });
  }

  /**
   * Handle component update - sync to files
   */
  onComponentUpdated(component: any): void {
    console.log('📦 Component updated:', component);
    // Sync components to HTML files when a component is updated
    this.syncComponentsToHtml().catch(error => {
      console.error('❌ Error syncing components after update:', error);
    });
  }

  /**
   * Handle component deletion - sync to files
   */
  onComponentDeleted(componentId: string): void {
    console.log('📦 Component deleted:', componentId);
    // Sync components to HTML files when a component is deleted
    this.syncComponentsToHtml().catch(error => {
      console.error('❌ Error syncing components after deletion:', error);
    });
  }

  /**
   * Auto-save components and files when changes are made
   */
  async autoSaveChanges(): Promise<void> {
    if (!this.currentProject || this.currentProject.isNew) return;

    try {
      console.log('💾 Auto-saving changes...');
      await this.saveAllChanges();
      console.log('✅ Auto-save completed');
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
    }
  }
} 