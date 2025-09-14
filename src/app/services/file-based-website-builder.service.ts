import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, switchMap, tap, catchError } from 'rxjs/operators';
import { DataSvrService } from './data-svr.service';
import { WebsiteFilesService } from './website-files.service';
import { WebsitePagesService } from './website-pages.service';
import { AIEnhancementService } from './ai-enhancement.service';
import { WebsiteAssetsService } from './website-assets.service';
import {
  WebsiteFile,
  WebsiteAsset,
  EnhancedWebsitePage,
  WorkspaceComponentResponseDto,
  ComponentType
} from '../models/workspace.models';

export interface WebsitePreviewData {
  html: string;
  css: string;
  js: string;
  assets: WebsiteAsset[];
}

export interface ComponentHtmlGenerator {
  componentType: string;
  generate: (parameters: any, componentId: string) => string;
}

@Injectable({
  providedIn: 'root'
})
export class FileBasedWebsiteBuilderService {
  private readonly apiBaseUrl = 'https://servicefuzzapi-atf8b4dqawc8dsa9.australiaeast-01.azurewebsites.net';
  
  // Real-time state management
  private _currentWorkspaceId = new BehaviorSubject<string | null>(null);
  private _websiteFiles = new BehaviorSubject<WebsiteFile[]>([]);
  private _websitePages = new BehaviorSubject<EnhancedWebsitePage[]>([]);
  private _websiteAssets = new BehaviorSubject<WebsiteAsset[]>([]);
  private _currentPageId = new BehaviorSubject<string | null>(null);
  
  // WebSocket for real-time collaboration
  private websocket: WebSocket | null = null;
  
  // Component HTML generators
  private componentGenerators = new Map<string, ComponentHtmlGenerator>();

  constructor(
    private http: HttpClient,
    private dataSvr: DataSvrService,
    private filesService: WebsiteFilesService,
    private pagesService: WebsitePagesService,
    private aiService: AIEnhancementService,
    private assetsService: WebsiteAssetsService
  ) {
    this.initializeComponentGenerators();
  }

  // ===================== WORKSPACE INITIALIZATION =====================

  /**
   * Initialize workspace with file-based structure
   */
  async initializeWorkspace(workspaceId: string): Promise<void> {
    this._currentWorkspaceId.next(workspaceId);
    
    try {
      // Load existing files, pages, and assets
      await Promise.all([
        this.loadWorkspaceFiles(workspaceId),
        this.loadWorkspacePages(workspaceId),
        this.loadWorkspaceAssets(workspaceId)
      ]);
      
      // Check if workspace is empty and initialize with basic structure
      const files = this._websiteFiles.value;
      const pages = this._websitePages.value;
      
      console.log(`📊 Workspace ${workspaceId} status: ${files.length} files, ${pages.length} pages`);
      
      if (files.length === 0 && pages.length === 0) {
        console.log('🏗️ Creating basic website structure for empty workspace...');
        await this.createBasicWebsiteStructure(workspaceId);
      } else {
        console.log('✅ Workspace already has content, skipping default file creation');
      }
      
      // Set up WebSocket connection for real-time updates
      this.initializeWebSocket(workspaceId);
      
    } catch (error) {
      console.error('Error initializing workspace:', error);
      throw error;
    }
  }

  /**
   * Create basic website structure for new workspace using bulk save
   */
  private async createBasicWebsiteStructure(workspaceId: string): Promise<void> {
    console.log(`🏗️ Starting basic website structure creation for workspace: ${workspaceId}`);
    
    try {
      // Create home page first
      console.log('📄 Creating home page...');
      const homePage = await this.pagesService.createPage(workspaceId, {
        pageName: 'Home',
        route: '/',
        title: 'Welcome to My Website',
        metaDescription: 'A beautiful website built with ServiceFuzz',
        isHomePage: true
      }).toPromise();

      if (homePage) {
        console.log(`✅ Home page created with ID: ${homePage.id}`);
        this._currentPageId.next(homePage.id);
      } else {
        console.error('❌ Failed to create home page');
      }

      // Use the new bulk save functionality to create default file structure
      console.log('📁 Creating default file structure using bulk save...');
      
      try {
        const result = await this.filesService.createDefaultFileStructure(workspaceId).toPromise();
        
        if (result?.success) {
          console.log(`✅ Bulk save successful: ${result.createdFiles.length} files created, ${result.updatedFiles.length} files updated`);
          
          // Log the created files
          result.createdFiles.forEach(file => {
            console.log(`📁 Created: ${file.fileName} (${file.fileType}) - ${file.fileSize} bytes`);
          });
          
          if (result.errors && result.errors.length > 0) {
            console.warn('⚠️ Some files had errors:', result.errors);
          }
        } else {
          console.error('❌ Bulk save failed - no success flag');
          throw new Error('Bulk save operation failed');
        }
        
        // Reload files after creation
        console.log('🔄 Reloading workspace files...');
        await this.loadWorkspaceFiles(workspaceId);
        
        console.log('✅ Basic website structure creation completed successfully');
        
      } catch (bulkSaveError) {
        console.error('❌ Error with bulk save, falling back to individual file creation:', bulkSaveError);
        // Fallback to individual file creation if bulk save fails
        await this.createBasicFilesIndividually(workspaceId);
      }
      
    } catch (error) {
      console.error('❌ Error in createBasicWebsiteStructure:', error);
      throw error;
    }
  }

  /**
   * Fallback method to create files individually
   */
  private async createBasicFilesIndividually(workspaceId: string): Promise<void> {
    console.log('📝 Creating files individually as fallback method...');
    
    const basicHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{page.title}}</title>
    <meta name="description" content="{{page.metaDescription}}" />
    <link rel="stylesheet" href="css/styles.css">
    {{global.css}}
    {{page.css}}
</head>
<body>
    <div id="website-content">
        {{components}}
    </div>
    <script src="js/script.js"></script>
    {{global.js}}
    {{page.js}}
</body>
</html>`;

    const basicCss = `* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
.container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
.component { margin-bottom: 2rem; }`;

    const basicJs = `document.addEventListener('DOMContentLoaded', function() {
    console.log('Website loaded successfully');
});`;

    // Create files individually
    console.log('📁 Creating individual files: index.html, css/styles.css, js/script.js');
    
    try {
      await Promise.all([
        this.filesService.createFile(workspaceId, {
          fileName: 'index.html',
          fileType: 'html',
          content: basicHtml
        }).toPromise(),
        this.filesService.createFile(workspaceId, {
          fileName: 'css/styles.css',
          fileType: 'css',
          content: basicCss
        }).toPromise(),
        this.filesService.createFile(workspaceId, {
          fileName: 'js/script.js',
          fileType: 'js',
          content: basicJs
        }).toPromise()
      ]);

      console.log('✅ Individual files created successfully');
      
      // Reload files after creation
      console.log('🔄 Reloading workspace files after individual creation...');
      await this.loadWorkspaceFiles(workspaceId);
      
      console.log('✅ Fallback file creation completed successfully');
      
    } catch (error) {
      console.error('❌ Error creating individual files:', error);
      throw error;
    }
  }

  // ===================== FILE MANAGEMENT =====================

  /**
   * Load all files for workspace
   */
  private async loadWorkspaceFiles(workspaceId: string): Promise<void> {
    try {
      const files = await this.filesService.getFiles(workspaceId).toPromise();
      if (files && Array.isArray(files)) {
        this._websiteFiles.next(files);
      }
    } catch (error) {
      console.error('Error loading workspace files:', error);
      this._websiteFiles.next([]);
    }
  }

  /**
   * Load all pages for workspace
   */
  private async loadWorkspacePages(workspaceId: string): Promise<void> {
    try {
      const response = await this.pagesService.getPages(workspaceId).toPromise();
      if (response?.pages) {
        this._websitePages.next(response.pages);
        
        // Set current page to home page if not set
        if (!this._currentPageId.value) {
          const homePage = response.pages.find(p => p.isHomePage) || response.pages[0];
          if (homePage) {
            this._currentPageId.next(homePage.id);
          }
        }
      }
    } catch (error) {
      console.error('Error loading workspace pages:', error);
      this._websitePages.next([]);
    }
  }

  /**
   * Load all assets for workspace
   */
  private async loadWorkspaceAssets(workspaceId: string): Promise<void> {
    try {
      const response = await this.assetsService.getAssets(workspaceId).toPromise();
      if (response?.assets) {
        this._websiteAssets.next(response.assets);
        console.log(`📁 Loaded ${response.assets.length} assets for workspace`);
      } else {
        this._websiteAssets.next([]);
      }
    } catch (error) {
      console.error('❌ Error loading workspace assets:', error);
      this._websiteAssets.next([]);
    }
  }

  // ===================== COMPONENT MANAGEMENT =====================

  /**
   * Add component to page and generate HTML
   */
  async addComponentToPage(pageId: string, componentData: {
    componentType: string;
    xPosition: number;
    yPosition: number;
    width: number;
    height: number;
    parameters: any;
  }): Promise<WorkspaceComponentResponseDto | null> {
    try {
      // Create component in database
      const component = await this.http.post<WorkspaceComponentResponseDto>(
        `${this.apiBaseUrl}/api/website-components/workspace/components`,
        {
          workspaceId: this._currentWorkspaceId.value,
          pageId: pageId,
          componentId: this.generateId(),
          componentType: componentData.componentType,
          xPosition: componentData.xPosition,
          yPosition: componentData.yPosition,
          width: componentData.width,
          height: componentData.height,
          zIndex: 1,
          parameters: JSON.stringify(componentData.parameters)
        },
        { headers: this.getAuthHeaders() }
      ).toPromise();

      if (component) {
        // Generate HTML for component and update page file
        await this.updatePageHtmlWithComponent(pageId, component);
        
        // Refresh preview
        await this.generatePreview();
        
        // Notify via WebSocket
        this.sendWebSocketMessage({
          type: 'COMPONENT_ADDED',
          component: component
        });
      }

      return component || null;
    } catch (error) {
      console.error('Error adding component to page:', error);
      return null;
    }
  }

  /**
   * Update page HTML with new component
   */
  private async updatePageHtmlWithComponent(pageId: string, component: WorkspaceComponentResponseDto): Promise<void> {
    const files = this._websiteFiles.value;
    const htmlFile = files.find(f => f.fileType === 'html' && f.fileName === 'index.html');
    
    if (!htmlFile) return;

    // Generate HTML for the component
    const componentHtml = this.generateComponentHtml(component);
    
    // Insert component HTML into the page
    let updatedHtml = htmlFile.content;
    const componentsPlaceholder = '{{components}}';
    
    if (updatedHtml.includes(componentsPlaceholder)) {
      // Replace placeholder with existing components + new component
      const existingComponents = await this.getExistingComponentsHtml(pageId);
      const allComponentsHtml = existingComponents + '\n' + componentHtml;
      updatedHtml = updatedHtml.replace(componentsPlaceholder, allComponentsHtml);
    } else {
      // Append to body if no placeholder
      updatedHtml = updatedHtml.replace('</body>', `${componentHtml}\n</body>`);
    }

    // Update the file
    await this.filesService.updateFile(htmlFile.id, updatedHtml).toPromise();
    
    // Reload files
    await this.loadWorkspaceFiles(this._currentWorkspaceId.value!);
  }

  /**
   * Generate HTML for a component
   */
  private generateComponentHtml(component: WorkspaceComponentResponseDto): string {
    const generator = this.componentGenerators.get(component.componentType);
    const parameters = component.parameters ? JSON.parse(component.parameters) : {};
    
    if (generator) {
      return generator.generate(parameters, component.componentId);
    }

    // Default component HTML
    return `<div class="component" data-component-id="${component.componentId}" data-component-type="${component.componentType}">
      <h3>Component: ${component.componentType}</h3>
      <p>Parameters: ${JSON.stringify(parameters)}</p>
    </div>`;
  }

  /**
   * Get existing components HTML for a page
   */
  private async getExistingComponentsHtml(pageId: string): Promise<string> {
    try {
      const response = await this.pagesService.getPageComponents(pageId).toPromise();
      if (response?.components) {
        return response.components
          .map(comp => this.generateComponentHtml(comp))
          .join('\n');
      }
    } catch (error) {
      console.error('Error getting existing components:', error);
    }
    return '';
  }

  // ===================== PREVIEW GENERATION =====================

  /**
   * Generate complete HTML preview for current page using API
   */
  async generatePreview(pageRoute: string = '/'): Promise<string> {
    const workspaceId = this._currentWorkspaceId.value;
    if (!workspaceId) return '';

    try {
      // Use the new API endpoint for preview generation
      const previewResponse = await this.filesService.generatePreview(workspaceId, pageRoute).toPromise();
      
      if (previewResponse?.html) {
        console.log(`✅ Preview generated for route: ${pageRoute}`);
        return previewResponse.html;
      }
      
      // Fallback to local generation if API fails
      console.warn('API preview failed, falling back to local generation');
      return await this.generatePreviewLocally(pageRoute);
      
    } catch (error) {
      console.error('❌ Error generating preview via API:', error);
      // Fallback to local generation
      return await this.generatePreviewLocally(pageRoute);
    }
  }

  /**
   * Fallback local preview generation
   */
  private async generatePreviewLocally(pageRoute: string = '/'): Promise<string> {
    try {
      const files = this._websiteFiles.value;
      const pages = this._websitePages.value;
      const assets = this._websiteAssets.value;
      
      const currentPage = pages.find(p => p.route === pageRoute) || pages.find(p => p.isHomePage);
      if (!currentPage) return '<html><body><h1>Page not found</h1></body></html>';

      // Get components for this page
      const componentsResponse = await this.pagesService.getPageComponents(currentPage.id).toPromise();
      const components = componentsResponse?.components || [];

      return this.buildCompleteHtml(files, currentPage, components, assets);
    } catch (error) {
      console.error('❌ Error in local preview generation:', error);
      return '<html><body><h1>Error generating preview</h1></body></html>';
    }
  }

  /**
   * Build complete HTML from files, page, and components
   */
  private buildCompleteHtml(
    files: WebsiteFile[],
    page: EnhancedWebsitePage,
    components: WorkspaceComponentResponseDto[],
    assets: WebsiteAsset[]
  ): string {
    const htmlFile = files.find(f => f.fileType === 'html' && f.fileName === 'index.html');
    const cssFiles = files.filter(f => f.fileType === 'css');
    const jsFiles = files.filter(f => f.fileType === 'js');
    
    let html = htmlFile?.content || '<html><head></head><body></body></html>';

    // Replace placeholders
    html = html.replace('{{page.title}}', page.title || 'Website');
    html = html.replace('{{page.metaDescription}}', page.metaDescription || '');
    
    // Inject CSS
    const cssContent = cssFiles.map(f => `<style>${f.content}</style>`).join('\n');
    const pageCss = page.customCSS ? `<style>${page.customCSS}</style>` : '';
    html = html.replace('{{global.css}}', cssContent);
    html = html.replace('{{page.css}}', pageCss);
    
    // Inject JavaScript
    const jsContent = jsFiles.map(f => `<script>${f.content}</script>`).join('\n');
    const pageJs = page.customJS ? `<script>${page.customJS}</script>` : '';
    html = html.replace('{{global.js}}', jsContent);
    html = html.replace('{{page.js}}', pageJs);
    
    // Inject components
    const componentsHtml = components
      .map(comp => this.generateComponentHtml(comp))
      .join('\n');
    html = html.replace('{{components}}', componentsHtml);
    
    // Replace asset placeholders
    html = this.updateHtmlWithAssets(html, assets);

    return html;
  }

  /**
   * Update HTML with asset URLs
   */
  private updateHtmlWithAssets(htmlContent: string, assets: WebsiteAsset[]): string {
    let updatedHtml = htmlContent;
    
    assets.forEach(asset => {
      const placeholder = `{{asset:${asset.fileName}}}`;
      const assetUrl = `/api/website-assets/${asset.id}/file`;
      updatedHtml = updatedHtml.replace(new RegExp(placeholder, 'g'), assetUrl);
    });
    
    return updatedHtml;
  }

  // ===================== WEBSOCKET REAL-TIME UPDATES =====================

  /**
   * Initialize WebSocket connection for real-time collaboration
   */
  private initializeWebSocket(workspaceId: string): void {
    try {
      this.websocket = new WebSocket(`ws://localhost:7196/ws/workspace/${workspaceId}`);
      
      this.websocket.onopen = () => {
        console.log('WebSocket connected for workspace:', workspaceId);
      };
      
      this.websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleWebSocketMessage(data);
      };
      
      this.websocket.onclose = () => {
        console.log('WebSocket disconnected');
        // Attempt to reconnect after 5 seconds
        setTimeout(() => this.initializeWebSocket(workspaceId), 5000);
      };
      
      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleWebSocketMessage(data: any): void {
    switch (data.type) {
      case 'FILE_UPDATED':
        this.onFileUpdated(data.fileId, data.content);
        break;
      case 'COMPONENT_ADDED':
        this.onComponentAdded(data.component);
        break;
      case 'COMPONENT_MOVED':
        this.onComponentMoved(data.componentId, data.position);
        break;
      case 'PAGE_UPDATED':
        this.onPageUpdated(data.pageId, data.changes);
        break;
    }
  }

  /**
   * Send WebSocket message
   */
  private sendWebSocketMessage(data: any): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({
        ...data,
        workspaceId: this._currentWorkspaceId.value
      }));
    }
  }

  // WebSocket event handlers
  private async onFileUpdated(fileId: string, content: string): Promise<void> {
    const files = this._websiteFiles.value;
    const updatedFiles = files.map(file => 
      file.id === fileId ? { ...file, content } : file
    );
    this._websiteFiles.next(updatedFiles);
    
    // Refresh preview
    await this.generatePreview();
  }

  private onComponentAdded(component: WorkspaceComponentResponseDto): void {
    // Component will be reflected in next page load
    console.log('Component added via WebSocket:', component);
  }

  private onComponentMoved(componentId: string, position: { x: number, y: number }): void {
    console.log('Component moved via WebSocket:', componentId, position);
  }

  private onPageUpdated(pageId: string, changes: any): void {
    const pages = this._websitePages.value;
    const updatedPages = pages.map(page => 
      page.id === pageId ? { ...page, ...changes } : page
    );
    this._websitePages.next(updatedPages);
  }

  // ===================== COMPONENT GENERATORS =====================

  /**
   * Initialize component HTML generators
   */
  private initializeComponentGenerators(): void {
    // Hero Section
    this.componentGenerators.set('hero-section', {
      componentType: 'hero-section',
      generate: (params: any, componentId: string) => `
        <section class="hero component" data-component-id="${componentId}">
          <div class="container">
            <h1>${params.title || 'Welcome to Our Website'}</h1>
            <p>${params.subtitle || 'Discover amazing products and services'}</p>
            <a href="${params.buttonLink || '#'}" class="btn">${params.buttonText || 'Get Started'}</a>
          </div>
        </section>
      `
    });

    // Contact Form
    this.componentGenerators.set('contact-form', {
      componentType: 'contact-form',
      generate: (params: any, componentId: string) => `
        <div class="contact-form component" data-component-id="${componentId}">
          <h2>${params.title || 'Contact Us'}</h2>
          <form>
            <input type="text" name="name" placeholder="Your Name" required />
            <input type="email" name="email" placeholder="Your Email" required />
            <textarea name="message" placeholder="Your Message" rows="5" required></textarea>
            <button type="submit">${params.submitText || 'Send Message'}</button>
          </form>
        </div>
      `
    });

    // Text Block
    this.componentGenerators.set('text-block', {
      componentType: 'text-block',
      generate: (params: any, componentId: string) => `
        <div class="text-block component" data-component-id="${componentId}">
          <h2>${params.heading || 'Heading'}</h2>
          <p>${params.content || 'Your content goes here...'}</p>
        </div>
      `
    });

    // Image Gallery
    this.componentGenerators.set('image-gallery', {
      componentType: 'image-gallery',
      generate: (params: any, componentId: string) => {
        const images = params.images || [];
        const imageHtml = images.map((img: any) => 
          `<img src="${img.url}" alt="${img.alt || ''}" />`
        ).join('');
        
        return `
          <div class="image-gallery component" data-component-id="${componentId}">
            <h2>${params.title || 'Gallery'}</h2>
            <div class="gallery-grid">
              ${imageHtml}
            </div>
          </div>
        `;
      }
    });
  }

  // ===================== MIGRATION UTILITIES =====================

  /**
   * Migrate from old JSON-based system to new file-based system
   */
  async migrateFromJsonToFiles(workspaceId: string, websiteJson: string): Promise<void> {
    try {
      const websiteData = JSON.parse(websiteJson);
      
      // Create home page if it doesn't exist
      const pages = this._websitePages.value;
      let homePage = pages.find(p => p.isHomePage);
      
      if (!homePage) {
        homePage = await this.pagesService.createPage(workspaceId, {
          pageName: 'Home',
          route: '/',
          title: websiteData.title || 'Website',
          metaDescription: websiteData.description || '',
          isHomePage: true
        }).toPromise();
      }
      
      // Extract and create HTML file
      if (websiteData.html) {
        await this.filesService.createFile(workspaceId, {
          fileName: 'index.html',
          fileType: 'html',
          content: websiteData.html
        }).toPromise();
      }
      
      // Extract and create CSS file
      if (websiteData.css) {
        await this.filesService.createFile(workspaceId, {
          fileName: 'styles.css',
          fileType: 'css',
          content: websiteData.css
        }).toPromise();
      }
      
      // Extract and create JS file
      if (websiteData.js) {
        await this.filesService.createFile(workspaceId, {
          fileName: 'script.js',
          fileType: 'js',
          content: websiteData.js
        }).toPromise();
      }
      
      // Migrate components if they exist
      if (websiteData.components && homePage) {
        for (const comp of websiteData.components) {
          await this.addComponentToPage(homePage.id, {
            componentType: comp.type || 'text-block',
            xPosition: comp.x || 0,
            yPosition: comp.y || 0,
            width: comp.width || 300,
            height: comp.height || 100,
            parameters: comp.parameters || {}
          });
        }
      }
      
      // Reload all data
      await Promise.all([
        this.loadWorkspaceFiles(workspaceId),
        this.loadWorkspacePages(workspaceId)
      ]);
      
      console.log('Migration from JSON to files completed successfully');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  // ===================== UTILITY METHODS =====================

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private getAuthHeaders(): HttpHeaders {
    const jwtToken = this.dataSvr.jwtToken;
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`
    });
  }

  // ===================== PUBLIC GETTERS =====================

  get currentWorkspaceId$(): Observable<string | null> {
    return this._currentWorkspaceId.asObservable();
  }

  get websiteFiles$(): Observable<WebsiteFile[]> {
    return this._websiteFiles.asObservable();
  }

  get websitePages$(): Observable<EnhancedWebsitePage[]> {
    return this._websitePages.asObservable();
  }

  get websiteAssets$(): Observable<WebsiteAsset[]> {
    return this._websiteAssets.asObservable();
  }

  get currentPageId$(): Observable<string | null> {
    return this._currentPageId.asObservable();
  }

  // ===================== PUBLIC METHODS =====================

  setCurrentPage(pageId: string): void {
    this._currentPageId.next(pageId);
  }

  getCurrentFiles(): WebsiteFile[] {
    return this._websiteFiles.value;
  }

  getCurrentPages(): EnhancedWebsitePage[] {
    return this._websitePages.value;
  }

  getCurrentAssets(): WebsiteAsset[] {
    return this._websiteAssets.value;
  }

  /**
   * Update file content and notify via WebSocket
   */
  async updateFileContent(fileId: string, content: string): Promise<void> {
    await this.filesService.updateFile(fileId, content).toPromise();
    await this.loadWorkspaceFiles(this._currentWorkspaceId.value!);
    
    this.sendWebSocketMessage({
      type: 'FILE_UPDATE',
      fileId,
      content
    });
  }

  /**
   * Create new page
   */
  async createPage(pageName: string, route: string, title?: string, metaDescription?: string): Promise<EnhancedWebsitePage | null> {
    const workspaceId = this._currentWorkspaceId.value;
    if (!workspaceId) return null;

    try {
      const page = await this.pagesService.createPage(workspaceId, {
        pageName,
        route: route.startsWith('/') ? route : `/${route}`,
        title,
        metaDescription,
        isHomePage: false
      }).toPromise();

      if (page) {
        await this.loadWorkspacePages(workspaceId);
      }

      return page || null;
    } catch (error) {
      console.error('Error creating page:', error);
      return null;
    }
  }

  /**
   * Delete page
   */
  async deletePage(pageId: string): Promise<boolean> {
    try {
      const response = await this.pagesService.deletePage(pageId).toPromise();
      
      if (response?.success) {
        await this.loadWorkspacePages(this._currentWorkspaceId.value!);
        
        // Switch to home page if current page was deleted
        if (this._currentPageId.value === pageId) {
          const pages = this._websitePages.value;
          const homePage = pages.find(p => p.isHomePage) || pages[0];
          if (homePage) {
            this._currentPageId.next(homePage.id);
          }
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error deleting page:', error);
      return false;
    }
  }

  /**
   * Upload asset to workspace
   */
  async uploadAsset(file: File, altText?: string): Promise<WebsiteAsset | null> {
    const workspaceId = this._currentWorkspaceId.value;
    if (!workspaceId) return null;

    try {
      // Validate file first
      const validation = this.assetsService.validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const response = await this.assetsService.uploadAsset(workspaceId, file, altText).toPromise();
      
      if (response?.success && response.asset) {
        console.log(`✅ Asset uploaded: ${response.asset.fileName}`);
        
        // Reload assets to update the list
        await this.loadWorkspaceAssets(workspaceId);
        
        return response.asset;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error uploading asset:', error);
      throw error;
    }
  }

  /**
   * Delete asset from workspace
   */
  async deleteAsset(assetId: string): Promise<boolean> {
    try {
      const response = await this.assetsService.deleteAsset(assetId).toPromise();
      
      if (response?.success) {
        console.log(`✅ Asset deleted: ${assetId}`);
        
        // Reload assets to update the list
        const workspaceId = this._currentWorkspaceId.value;
        if (workspaceId) {
          await this.loadWorkspaceAssets(workspaceId);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error deleting asset:', error);
      return false;
    }
  }

  /**
   * Get asset URL for use in HTML/CSS
   */
  getAssetUrl(assetId: string): string {
    return this.assetsService.getDirectAssetUrl(assetId);
  }

  /**
   * Bulk save multiple files at once
   */
  async bulkSaveFiles(fileUpdates: Array<{
    id?: string;
    fileName?: string;
    fileType?: string;
    content?: string;
  }>): Promise<{ success: boolean; updatedFiles: WebsiteFile[]; createdFiles: WebsiteFile[] }> {
    const workspaceId = this._currentWorkspaceId.value;
    if (!workspaceId) {
      return { success: false, updatedFiles: [], createdFiles: [] };
    }

    try {
      const response = await this.filesService.bulkSaveFiles(workspaceId, fileUpdates).toPromise();
      
      if (response?.success) {
        console.log(`✅ Bulk save completed: ${response.updatedFiles.length} updated, ${response.createdFiles.length} created`);
        
        // Reload files to update the list
        await this.loadWorkspaceFiles(workspaceId);
        
        // Notify via WebSocket
        this.sendWebSocketMessage({
          type: 'BULK_FILES_UPDATED',
          updatedFiles: response.updatedFiles,
          createdFiles: response.createdFiles
        });
        
        return {
          success: true,
          updatedFiles: response.updatedFiles,
          createdFiles: response.createdFiles
        };
      }
      
      return { success: false, updatedFiles: [], createdFiles: [] };
    } catch (error) {
      console.error('❌ Error in bulk save:', error);
      return { success: false, updatedFiles: [], createdFiles: [] };
    }
  }

  /**
   * Get file type category for UI
   */
  getFileTypeCategory(fileName: string): 'html' | 'css' | 'js' | 'asset' | 'other' {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'html':
      case 'htm':
        return 'html';
      case 'css':
        return 'css';
      case 'js':
      case 'javascript':
        return 'js';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg':
      case 'webp':
      case 'woff':
      case 'woff2':
      case 'ttf':
      case 'otf':
        return 'asset';
      default:
        return 'other';
    }
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    return this.assetsService.formatFileSize(bytes);
  }

  /**
   * Cleanup WebSocket connection
   */
  disconnect(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }
}
