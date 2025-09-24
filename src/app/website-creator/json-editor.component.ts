import { Component, OnInit, OnDestroy, Output, EventEmitter, Input, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { WebsiteBuilderService } from '../services/Business/WebsiteCreator/manual/website-builder';
import { WebsiteFilesService } from '../services/Business/WebsiteCreator/developers/files/website-files.service';
import { WebsiteAssetsService } from '../services/Business/WebsiteCreator/developers/upload_asssets/website-assets.service';
import { CodebaseSearchService, SearchResult, SearchMatch, SearchOptions } from '../services/Business/WebsiteCreator/developers/search_code/codebase-search.service';
import { FileEditorService } from '../services/Business/WebsiteCreator/developers/editor/file-editor.service';
import { GitStatusService } from '../services/Business/WebsiteCreator/developers/editor/git-status.service';
import { LineDiffService } from '../services/Business/WebsiteCreator/developers/editor/line-diff.service';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FileTreeNode, FileStructureResponse, FileContentResponse, WebsiteFile } from '../models/workspace.models';
import { TreeNode } from 'primeng/api';
import { MessageService } from 'primeng/api';


@Component({
  selector: 'app-json-editor',
  standalone: false,
  templateUrl: './json-editor.component.html',
  styleUrls: ['./json-editor.component.css']
})
export class JsonEditorComponent implements OnInit, OnDestroy, AfterViewInit {
  @Output() close = new EventEmitter<void>();
  @Input() workspaceId: string = '';
  @ViewChild('codeContainer', { static: false }) codeContainer!: ElementRef;
  
  private destroy$ = new Subject<void>();
  
  // File browser properties
  fileTree: TreeNode[] = [];
  selectedFile: TreeNode | null = null;
  fileContent: string = '';
  selectedFileName: string = '';
  selectedFileType: string = '';
  isLoadingFiles: boolean = false;
  isLoadingContent: boolean = false;
  files: WebsiteFile[] = [];
  
  // Search and filter
  searchTerm: string = '';
  filteredTree: TreeNode[] = [];
  
  // Code display properties
  lineCount: number = 0;
  
  // Workspace info
  workspaceName: string = 'Project Files';
  workspaceDetails: any = null;
  
  // Assets folder drag and drop
  assetsFolder: TreeNode | null = null;
  isDragOver = false;
  isUploading = false;

  // Search functionality
  showSearchPanel: boolean = false;
  searchPanelWidth: number = 400;
  highlightedLine: number | null = null;
  
  // Search state
  private searchSubject$ = new Subject<string>();
  searchQuery: string = '';
  searchResults: SearchResult[] = [];
  isSearching: boolean = false;
  totalMatches: number = 0;
  matchingFilesCount: number = 0;
  
  // Search options
  searchOptions: SearchOptions = {
    caseSensitive: false,
    wholeWord: false,
    useRegex: false,
    includeFileTypes: ['html', 'css', 'js', 'json'], // All file types selected by default
    excludeFileTypes: [],
    maxResults: 1000
  };
  
  // Search UI state
  showAdvancedOptions: boolean = false;
  expandedFiles: Set<string> = new Set();
  selectedMatch: { fileId: string; matchIndex: number } | null = null;
  
  // File type options for search
  availableFileTypes = [
    { label: 'HTML', value: 'html' },
    { label: 'CSS', value: 'css' },
    { label: 'JavaScript', value: 'js' },
    { label: 'JSON', value: 'json' }
  ];

  // Cache status
  cacheStatus: any = null;

  /**
   * Get the highlight.js language identifier for the file type
   */
  getHighlightLanguage(fileType: string): string {
    const language = (() => {
      switch (fileType.toLowerCase()) {
        case 'html':
        case 'htm':
          return 'xml'; // HTML is handled by xml language in highlight.js
        case 'css':
          return 'css';
        case 'js':
        case 'javascript':
          return 'javascript';
        case 'ts':
        case 'typescript':
          return 'typescript';
        case 'json':
          return 'json';
        case 'xml':
          return 'xml';
        case 'md':
        case 'markdown':
          return 'markdown';
        case 'scss':
        case 'sass':
          return 'scss';
        case 'less':
          return 'less';
        default:
          return 'javascript'; // Default to javascript for better highlighting
      }
    })();
    
    return language;
  }

  /**
   * Debug method to track highlighting events
   */
  onHighlighted(result: any): void {
    console.log('🎯 Highlighting completed:', result);
    console.log('🎯 Language used:', result.language);
    console.log('🎯 Content length:', this.fileContent?.length);
  }
  

  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private websiteBuilder: WebsiteBuilderService,
    private websiteFilesService: WebsiteFilesService,
    private websiteAssetsService: WebsiteAssetsService,
    private codebaseSearchService: CodebaseSearchService,
    private messageService: MessageService,
    private fileEditorService: FileEditorService,
    private gitStatusService: GitStatusService,
    private lineDiffService: LineDiffService
  ) {}

  ngOnInit() {
    console.log(`🚀 [DEBUG] JsonEditorComponent ngOnInit called`);
    console.log(`🚀 [DEBUG] Component initialization timestamp: ${new Date().toISOString()}`);
    console.log(`🚀 [DEBUG] Initial workspaceId from input: ${this.workspaceId}`);
    
    // Get workspace ID from route parameters or input
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      console.log(`🚀 [DEBUG] Route params received:`, params.keys.map(key => ({ key, value: params.get(key) })));
      
      const routeWorkspaceId = params.get('workspaceId') || params.get('id');
      console.log(`🚀 [DEBUG] Extracted workspace ID from route: ${routeWorkspaceId}`);
      
      if (routeWorkspaceId) {
        this.workspaceId = routeWorkspaceId;
        console.log(`🚀 [DEBUG] Workspace ID set to: ${this.workspaceId}`);
      }
      
      if (this.workspaceId) {
        console.log(`🚀 [DEBUG] Starting workspace initialization for: ${this.workspaceId}`);
        console.log(`🚀 [DEBUG] Is developers route: ${this.isDevelopersRoute()}`);
        
        console.log(`🚀 [DEBUG] Loading workspace info...`);
        this.loadWorkspaceInfo();
        
        console.log(`🚀 [DEBUG] Loading file structure...`);
        this.loadFileStructure();
        
        console.log(`🚀 [DEBUG] Initializing file editor services...`);
        this.initializeFileEditorServices();
        
        console.log(`🚀 [DEBUG] Updating cache status...`);
        this.updateCacheStatus();
      } else {
        console.error(`🚀 [DEBUG] No workspace ID available - cannot initialize`);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No workspace ID provided'
        });
      }
    });

    console.log(`🚀 [DEBUG] Setting up search functionality...`);
    this.setupSearch();
    
    console.log(`🚀 [DEBUG] JsonEditorComponent ngOnInit completed`);
  }

  /**
   * Set up search functionality
   */
  private setupSearch(): void {
    // Set up debounced search
    this.searchSubject$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      this.performSearch(query);
    });

    // Subscribe to search state
    this.codebaseSearchService.getSearchState().pipe(
      takeUntil(this.destroy$)
    ).subscribe(state => {
      this.searchResults = state.results;
      this.isSearching = state.isSearching;
      this.totalMatches = this.codebaseSearchService.getTotalMatches();
      this.matchingFilesCount = this.codebaseSearchService.getMatchingFilesCount();
    });
  }

  ngAfterViewInit() {
    // Component is ready - highlight.js will handle syntax highlighting automatically
    this.setupScrollSync();
  }

  /**
   * Set up synchronized scrolling between line numbers and code content
   */
  private setupScrollSync(): void {
    if (this.codeContainer) {
      const codeWrapper = this.codeContainer.nativeElement.querySelector('.code-content-wrapper');
      const lineNumbers = this.codeContainer.nativeElement.querySelector('.line-numbers');
      
      if (codeWrapper && lineNumbers) {
        // Sync line numbers when code content scrolls
        codeWrapper.addEventListener('scroll', () => {
          lineNumbers.scrollTop = codeWrapper.scrollTop;
        });
        
        // Sync code content when line numbers scroll (if user scrolls line numbers directly)
        lineNumbers.addEventListener('scroll', () => {
          codeWrapper.scrollTop = lineNumbers.scrollTop;
        });
      }
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Cleanup editor services
    this.fileEditorService.cleanup();
    this.gitStatusService.cleanup();
    this.lineDiffService.cleanup();
  }

  /**
   * Load workspace information to get the workspace name
   */
  async loadWorkspaceInfo(): Promise<void> {
    console.log(`🚀 [DEBUG] loadWorkspaceInfo called for workspace: ${this.workspaceId}`);
    console.log(`🚀 [DEBUG] Current workspace name: ${this.workspaceName}`);
    
    try {
      console.log(`🚀 [DEBUG] Fetching workspace details from API...`);
      const workspace = await this.websiteBuilder.getWorkspace(this.workspaceId).toPromise();
      
      console.log(`🚀 [DEBUG] Workspace API response:`, {
        hasWorkspace: !!workspace,
        workspaceId: workspace?.id,
        workspaceName: workspace?.name,
        businessId: workspace?.businessId,
        timestamp: new Date().toISOString()
      });
      
      if (workspace) {
        this.workspaceDetails = workspace;
        console.log(`🚀 [DEBUG] Workspace details stored:`, this.workspaceDetails);
        
        if (workspace.name) {
          const oldName = this.workspaceName;
          this.workspaceName = workspace.name;
          console.log(`🚀 [DEBUG] Workspace name updated: ${oldName} -> ${this.workspaceName}`);
        } else {
          console.warn(`🚀 [DEBUG] Workspace has no name, keeping default: ${this.workspaceName}`);
        }
      } else {
        console.warn(`🚀 [DEBUG] No workspace data received from API`);
      }
    } catch (error) {
      console.error(`🚀 [DEBUG] Error loading workspace info for ${this.workspaceId}:`, error);
      console.error(`🚀 [DEBUG] Error details:`, {
        status: (error as any)?.status,
        message: (error as any)?.message,
        error: (error as any)?.error,
        timestamp: new Date().toISOString()
      });
      // Keep default name if error occurs
    }
  }

  /**
   * Load file structure using direct API calls (CACHE DISABLED FOR DEBUGGING)
   */
  async loadFileStructure(): Promise<void> {
    console.log(`🚀 [DEBUG] loadFileStructure called for workspace: ${this.workspaceId}`);
    console.log(`🚀 [DEBUG] Current loading state: ${this.isLoadingFiles}`);
    console.log(`🚀 [DEBUG] Timestamp: ${new Date().toISOString()}`);
    
    this.isLoadingFiles = true;
    
    try {
      console.log(`🚀 [DEBUG] Setting up reactive subscription for workspace: ${this.workspaceId}`);
      
      // Subscribe to reactive data stream for real-time updates
      this.websiteFilesService.getFiles$(this.workspaceId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (files) => {
            console.log(`🚀 [DEBUG] Reactive stream received files for workspace ${this.workspaceId}`);
            console.log(`🚀 [DEBUG] Files count: ${files?.length || 0}`);
            console.log(`🚀 [DEBUG] Files is array: ${Array.isArray(files)}`);
            console.log(`🚀 [DEBUG] Timestamp: ${new Date().toISOString()}`);
            
            if (files && Array.isArray(files)) {
              console.log(`🚀 [DEBUG] Processing ${files.length} files`);
              
              // Log file details for debugging
              if (files.length > 0) {
                console.log(`🚀 [DEBUG] Sample files:`, files.slice(0, 5).map(f => ({
                  id: f.id,
                  fileName: f.fileName,
                  fileType: f.fileType,
                  hasContent: !!f.content,
                  contentLength: f.content?.length || 0
                })));
              }
              
              this.files = files;
              console.log(`🚀 [DEBUG] Converting files to tree structure`);
              this.fileTree = this.convertFilesToTree(files);
              console.log(`🚀 [DEBUG] File tree created with ${this.fileTree.length} root nodes`);
              
              this.filteredTree = [...this.fileTree];
              console.log(`🚀 [DEBUG] Filtered tree initialized`);
              
              // Apply current search filter if active
              if (this.searchTerm) {
                console.log(`🚀 [DEBUG] Applying search filter: ${this.searchTerm}`);
                this.onSearch();
              }
            } else {
              console.warn(`🚀 [DEBUG] Invalid files data received:`, files);
            }
            
            this.isLoadingFiles = false;
            console.log(`🚀 [DEBUG] File loading completed successfully`);
          },
          error: (error) => {
            console.error(`🚀 [DEBUG] Error in reactive stream for workspace ${this.workspaceId}:`, error);
            console.error(`🚀 [DEBUG] Error details:`, {
              status: error.status,
              message: error.message,
              error: error.error,
              timestamp: new Date().toISOString()
            });
            
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to load file structure'
            });
            this.isLoadingFiles = false;
          }
        });

      console.log(`🚀 [DEBUG] Triggering initial file load for workspace: ${this.workspaceId}`);
      
      // Trigger initial load (now always fetches from API due to cache being disabled)
      this.websiteFilesService.getFiles(this.workspaceId).subscribe({
        next: (files) => {
          console.log(`🚀 [DEBUG] Initial file load completed successfully`);
          console.log(`🚀 [DEBUG] Received ${files?.length || 0} files directly from API`);
          console.log(`🚀 [DEBUG] Timestamp: ${new Date().toISOString()}`);
        },
        error: (error) => {
          console.error(`🚀 [DEBUG] Error in initial file load for workspace ${this.workspaceId}:`, error);
          console.error(`🚀 [DEBUG] Error details:`, {
            status: error.status,
            message: error.message,
            error: error.error,
            timestamp: new Date().toISOString()
          });
          this.isLoadingFiles = false;
        }
      });
      
    } catch (error) {
      console.error(`🚀 [DEBUG] Exception in loadFileStructure for workspace ${this.workspaceId}:`, error);
      console.error(`🚀 [DEBUG] Exception timestamp: ${new Date().toISOString()}`);
      this.isLoadingFiles = false;
    }
  }

  /**
   * Convert WebsiteFile array to PrimeNG TreeNode format with proper folder structure
   */
  private convertFilesToTree(files: WebsiteFile[]): TreeNode[] {
    // Create root project node
    const rootNode: TreeNode = {
      key: 'root',
      label: this.workspaceName,
      data: { type: 'root' },
      icon: 'pi pi-folder',
      expandedIcon: 'pi pi-folder-open',
      collapsedIcon: 'pi pi-folder',
      expanded: true,
      children: []
    };

    // Map to store folder nodes by their full path
    const folderMap = new Map<string, TreeNode>();
    folderMap.set('', rootNode); // Root folder

    // Process each file
    files.forEach(file => {
      const pathParts = file.fileName.split('/');
      const fileName = pathParts.pop() || file.fileName; // Get the actual file name
      const folderPath = pathParts.join('/'); // Get the folder path

      // Create folder structure if it doesn't exist
      this.ensureFolderPath(folderPath, folderMap, rootNode);

      // Get the parent folder
      const parentFolder = folderMap.get(folderPath);
      if (parentFolder && parentFolder.children) {
        // Create file node
        const fileNode = this.createFileNode(file, fileName);
        parentFolder.children.push(fileNode);
      }
    });

    // Sort folders and files
    this.sortTreeNodes(rootNode);

    return [rootNode];
  }

  /**
   * Ensure folder path exists in the tree structure
   */
  private ensureFolderPath(folderPath: string, folderMap: Map<string, TreeNode>, rootNode: TreeNode): void {
    if (!folderPath || folderMap.has(folderPath)) {
      return; // Path already exists or is root
    }

    const pathParts = folderPath.split('/');
    let currentPath = '';

    for (let i = 0; i < pathParts.length; i++) {
      const folderName = pathParts[i];
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;

      if (!folderMap.has(currentPath)) {
        // Create new folder node
        const folderNode: TreeNode = {
          key: currentPath,
          label: folderName,
          data: { type: 'folder', path: currentPath },
          icon: 'pi pi-folder',
          expandedIcon: 'pi pi-folder-open',
          collapsedIcon: 'pi pi-folder',
          expanded: true,
          children: []
        };

        // Add to parent folder
        const parentFolder = folderMap.get(parentPath);
        if (parentFolder && parentFolder.children) {
          parentFolder.children.push(folderNode);
        }

        // Store in map
        folderMap.set(currentPath, folderNode);
      }
    }
  }

  /**
   * Sort tree nodes: folders first, then files, both alphabetically
   */
  private sortTreeNodes(node: TreeNode): void {
    if (node.children && node.children.length > 0) {
      // Sort children: folders first, then files, both alphabetically
      node.children.sort((a, b) => {
        const aIsFolder = a.data?.type === 'folder' || a.data?.type === 'root';
        const bIsFolder = b.data?.type === 'folder' || b.data?.type === 'root';

        if (aIsFolder && !bIsFolder) return -1;
        if (!aIsFolder && bIsFolder) return 1;
        
        return (a.label || '').localeCompare(b.label || '');
      });

      // Recursively sort children
      node.children.forEach(child => this.sortTreeNodes(child));
    }
  }

  /**
   * Create a file node for the tree
   */
  private createFileNode(file: WebsiteFile, displayName?: string): TreeNode {
    return {
      key: file.id,
      label: displayName || file.fileName,
      data: file,
      icon: this.getFileIcon(file.fileType),
      leaf: true,
      styleClass: 'file-node'
    };
  }

  /**
   * Get icon for folder based on file type
   */
  getFolderIcon(fileType: string): string {
    const icons: { [key: string]: string } = {
      html: 'pi pi-file',
      css: 'pi pi-palette',
      js: 'pi pi-code',
      json: 'pi pi-database'
    };
    return icons[fileType] || 'pi pi-folder';
  }


  /**
   * Handle file selection in tree
   */
  async onFileSelect(event: any): Promise<void> {
    console.log(`🚀 [DEBUG] onFileSelect called`);
    console.log(`🚀 [DEBUG] Event:`, event);
    
    const node = event.node;
    console.log(`🚀 [DEBUG] Selected node:`, {
      key: node.key,
      label: node.label,
      leaf: node.leaf,
      hasData: !!node.data,
      dataType: node.data?.type,
      timestamp: new Date().toISOString()
    });
    
    if (node.data) {
      console.log(`🚀 [DEBUG] Node data details:`, {
        id: node.data.id,
        fileName: node.data.fileName,
        fileType: node.data.fileType,
        hasContent: !!node.data.content,
        contentLength: node.data.content?.length || 0
      });
    }
    
    if (node.leaf && node.data && node.data.id) {
      console.log(`🚀 [DEBUG] Valid file node selected, processing...`);
      this.selectedFile = node;
      
      console.log(`🚀 [DEBUG] Loading file content for: ${node.data.fileName}`);
      await this.loadFileContent(node.data);
      
      // Open the file in the editor service for editing
      if (!this.isMediaFile()) {
        console.log(`🚀 [DEBUG] Opening file in editor service: ${node.data.fileName}`);
        try {
          await this.fileEditorService.openFile(
            node.data.id,
            node.data.fileName,
            node.data.fileType,
            this.workspaceId
          );
          console.log(`🚀 [DEBUG] File opened in editor successfully: ${node.data.fileName}`);
        } catch (error) {
          console.error(`🚀 [DEBUG] Error opening file in editor:`, error);
          console.error(`🚀 [DEBUG] Error details:`, {
            fileId: node.data.id,
            fileName: node.data.fileName,
            fileType: node.data.fileType,
            workspaceId: this.workspaceId,
            timestamp: new Date().toISOString()
          });
        }
      } else {
        console.log(`🚀 [DEBUG] File is media type, skipping editor service: ${node.data.fileName}`);
      }
    } else {
      console.log(`🚀 [DEBUG] Node is not a valid file or missing required data`);
    }
  }

  /**
   * Load content of selected file
   */
  async loadFileContent(file: WebsiteFile): Promise<void> {
    console.log(`🚀 [DEBUG] loadFileContent called for file: ${file.fileName}`);
    console.log(`🚀 [DEBUG] File details:`, {
      id: file.id,
      fileName: file.fileName,
      fileType: file.fileType,
      hasContent: !!file.content,
      contentLength: file.content?.length || 0,
      timestamp: new Date().toISOString()
    });
    
    this.isLoadingContent = true;
    console.log(`🚀 [DEBUG] Loading state set to true`);
    
    this.selectedFileName = file.fileName;
    this.selectedFileType = file.fileType;
    console.log(`🚀 [DEBUG] Selected file properties updated:`, {
      selectedFileName: this.selectedFileName,
      selectedFileType: this.selectedFileType
    });
    
    try {
      // Use the content from the file object
      this.fileContent = file.content || '';
      console.log(`🚀 [DEBUG] File content loaded:`, {
        contentLength: this.fileContent.length,
        isEmpty: !this.fileContent,
        isDataUrl: this.fileContent.startsWith('data:'),
        firstChars: this.fileContent.substring(0, 100),
        timestamp: new Date().toISOString()
      });
      
      // Process content for display
      console.log(`🚀 [DEBUG] Processing file content for display...`);
      this.processFileContent();
      console.log(`🚀 [DEBUG] File content processing completed`);
      
    } catch (error) {
      console.error(`🚀 [DEBUG] Error loading file content for ${file.fileName}:`, error);
      console.error(`🚀 [DEBUG] Error details:`, {
        error: error,
        fileName: file.fileName,
        fileId: file.id,
        timestamp: new Date().toISOString()
      });
      
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load file content'
      });
      this.fileContent = 'Error loading file content';
      this.processFileContent();
    } finally {
      this.isLoadingContent = false;
      console.log(`🚀 [DEBUG] Loading state set to false, content loading completed`);
    }
  }

  /**
   * Process file content for display
   */
  private processFileContent(): void {
    if (!this.fileContent) {
      this.lineCount = 0;
      return;
    }

    // Count lines for display
    this.lineCount = this.fileContent.split('\n').length;
    
    // Set up scroll sync after content is processed
    setTimeout(() => this.setupScrollSync(), 100);
  }


  /**
   * Escape HTML characters for safe display
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Filter tree based on search term
   */
  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredTree = [...this.fileTree];
      return;
    }

    const searchLower = this.searchTerm.toLowerCase();
    this.filteredTree = this.filterTreeNodes(this.fileTree, searchLower);
  }

  /**
   * Recursively filter tree nodes
   */
  private filterTreeNodes(nodes: TreeNode[], searchTerm: string): TreeNode[] {
    return nodes.map(node => {
      const matchesSearch = node.label?.toLowerCase().includes(searchTerm);
      const filteredChildren = node.children ? this.filterTreeNodes(node.children, searchTerm) : [];
      
      if (matchesSearch || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
          expanded: filteredChildren.length > 0
        };
      }
      return null;
    }).filter(node => node !== null) as TreeNode[];
  }

  /**
   * Refresh file structure
   */
  onRefresh(): void {
    console.log(`🚀 [DEBUG] onRefresh called for workspace: ${this.workspaceId}`);
    console.log(`🚀 [DEBUG] Refresh timestamp: ${new Date().toISOString()}`);
    console.log(`🚀 [DEBUG] Current files count: ${this.files?.length || 0}`);
    console.log(`🚀 [DEBUG] Current loading state: ${this.isLoadingFiles}`);
    
    this.loadFileStructure();
    console.log(`🚀 [DEBUG] File structure reload triggered`);
  }

  /**
   * Close the file browser
   */
  closeEditor(): void {
    // If used as a standalone route, navigate back
    if (this.route.snapshot.url.length > 0) {
      const currentRoute = this.route.snapshot.routeConfig?.path || '';
      
      // If accessed via developers route, navigate back to website creator with proper IDs
      if (currentRoute.includes('developers') && this.workspaceId) {
        if (this.workspaceDetails && this.workspaceDetails.businessId) {
          // Navigate back to the specific workspace in website creator
          this.router.navigate(['/website-creator', this.workspaceDetails.businessId, this.workspaceId]);
        } else {
          // Fallback: navigate to workspace selection
          this.router.navigate(['/website-creator']);
        }
      } else {
      // Check if we came from website creator
      const referrer = document.referrer;
      if (referrer && referrer.includes('website-creator')) {
        window.history.back();
      } else {
        // Navigate to website creator for this workspace
          if (this.workspaceDetails && this.workspaceDetails.businessId) {
            this.router.navigate(['/website-creator', this.workspaceDetails.businessId, this.workspaceId]);
          } else {
        this.router.navigate(['/website-creator']);
          }
        }
      }
    } else {
      // If used as a component, emit close event
      this.close.emit();
    }
  }

  /**
   * Get file size formatted string
   */
  getFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Check if accessed via developers route
   */
  isDevelopersRoute(): boolean {
    const currentRoute = this.route.snapshot.routeConfig?.path || '';
    return currentRoute.includes('developers');
  }

  /**
   * Find the assets folder in the file tree
   */
  findAssetsFolder(): TreeNode | null {
    const findInTree = (nodes: TreeNode[]): TreeNode | null => {
      for (const node of nodes) {
        // Check if this is the assets folder
        if (node.label === 'assets' && !node.leaf && node.children) {
          return node;
        }
        // Recursively search in children
        if (node.children && node.children.length > 0) {
          const found = findInTree(node.children);
          if (found) return found;
        }
      }
      return null;
    };
    
    return findInTree(this.fileTree);
  }

  /**
   * Check if the selected node is the assets folder
   */
  isAssetsFolder(node: TreeNode | null): boolean {
    if (!node || node.leaf) return false;
    return node.label === 'assets';
  }

  /**
   * Handle drag over event
   */
  onDragOver(event: DragEvent): void {
    console.log('🎯 Drag over event triggered');
    event.preventDefault();
    event.stopPropagation();
    
    // Always allow drag over to enable drop
    this.isDragOver = true;
    console.log('🎯 isDragOver set to true');
  }

  /**
   * Handle drag enter event
   */
  onDragEnter(event: DragEvent): void {
    console.log('🎯 Drag enter event triggered');
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  /**
   * Handle drag leave event
   */
  onDragLeave(event: DragEvent): void {
    console.log('🎯 Drag leave event triggered');
    event.preventDefault();
    event.stopPropagation();
    
    // Only set to false if we're leaving the main container
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      this.isDragOver = false;
      console.log('🎯 isDragOver set to false');
    }
  }

  /**
   * Handle file drop event
   */
  onDrop(event: DragEvent): void {
    console.log('🎯 Drop event triggered');
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    console.log('🎯 Selected file:', this.selectedFile);
    console.log('🎯 Is assets folder:', this.isAssetsFolder(this.selectedFile));
    console.log('🎯 Is developers route:', this.isDevelopersRoute());

    // Check if we're in developers mode
    if (!this.isDevelopersRoute()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Feature Not Available',
        detail: 'Drag and drop is only available in developers mode'
      });
      return;
    }

    const files = event.dataTransfer?.files;
    console.log('🎯 Files dropped:', files?.length);
    
    if (!files || files.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Files',
        detail: 'No files were detected in the drop operation'
      });
      return;
    }

    // If assets folder is not selected, try to find it and select it automatically
    if (!this.isAssetsFolder(this.selectedFile)) {
      const assetsFolder = this.findAssetsFolder();
      if (assetsFolder) {
        this.selectedFile = assetsFolder;
        this.selectedFileName = 'assets';
        this.selectedFileType = 'folder';
        this.messageService.add({
          severity: 'info',
          summary: 'Assets Folder Selected',
          detail: 'Automatically selected assets folder for upload'
        });
      } else {
        this.messageService.add({
          severity: 'warn',
          summary: 'Assets Folder Not Found',
          detail: 'Could not find assets folder. Please create one first or select it manually.'
        });
        return;
      }
    }

    this.handleFileUpload(files);
  }

  /**
   * Handle file input change event (browse button)
   */
  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      console.log('🎯 Files selected via browse:', input.files.length);
      this.handleFileUpload(input.files);
      // Clear the input so the same file can be selected again
      input.value = '';
    }
  }

  /**
   * Handle file upload for dropped files
   */
  async handleFileUpload(files: FileList): Promise<void> {
    console.log('🎯 handleFileUpload called with', files.length, 'files');
    
    // Expanded supported file types
    const allowedTypes = [
      // Images
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp', 'image/bmp', 'image/tiff',
      // Videos
      'video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/mkv',
      // Audio
      'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/flac', 'audio/m4a',
      // Documents
      'application/pdf', 'text/plain', 'application/json',
      // Fonts
      'font/woff', 'font/woff2', 'font/ttf', 'font/otf',
      'application/font-woff', 'application/font-woff2', 'application/x-font-ttf', 'application/x-font-otf'
    ];
    
    const maxSize = 100 * 1024 * 1024; // 100MB limit for videos

    this.messageService.add({
      severity: 'info',
      summary: 'Processing Files',
      detail: `Processing ${files.length} file(s) for upload...`
    });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log('🎯 Processing file:', file.name, 'Type:', file.type, 'Size:', file.size);
      
      // Check file type - be more flexible with type checking
      const isAllowedType = allowedTypes.includes(file.type) || 
                           allowedTypes.some(type => file.type.startsWith(type.split('/')[0] + '/'));
      
      if (!isAllowedType) {
        console.log('🎯 File type not allowed:', file.type);
        this.messageService.add({
          severity: 'error',
          summary: 'Invalid File Type',
          detail: `${file.name} (${file.type}) is not supported. Supported: Images, Videos, Audio, PDFs, Fonts`
        });
        continue;
      }

      // Check file size
      if (file.size > maxSize) {
        console.log('🎯 File too large:', file.size);
        this.messageService.add({
          severity: 'error',
          summary: 'File Too Large',
          detail: `${file.name} exceeds the 100MB size limit`
        });
        continue;
      }

      console.log('🎯 File passed validation, uploading:', file.name);
      // Upload the file
      await this.uploadAssetFile(file);
    }
    
    // Force refresh the file tree after all uploads
    console.log('🎯 Refreshing file tree after uploads');
    await this.refreshFileTreeWithRetry();
  }

  /**
   * Upload asset file to the server
   */
  async uploadAssetFile(file: File): Promise<void> {
    this.isUploading = true;
    
    try {
      console.log('🎯 Uploading file:', file.name, 'Type:', file.type);
      
      // Check if file type is supported by WebsiteAssetsService
      const assetsSupportedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp',
        'font/woff', 'font/woff2', 'font/ttf', 'font/otf',
        'application/font-woff', 'application/font-woff2', 'application/x-font-ttf', 'application/x-font-otf'
      ];
      
      if (assetsSupportedTypes.includes(file.type)) {
        console.log('🎯 Using WebsiteAssetsService for:', file.type);
        // Generate alt text for images
        const altText = file.type.startsWith('image/') ? `${file.name} asset` : undefined;
        
        // Use the website assets service to upload
        const response = await this.websiteAssetsService.uploadAsset(this.workspaceId, file, altText).toPromise();
        
        if (response && response.asset) {
          this.messageService.add({
            severity: 'success',
            summary: 'Upload Successful',
            detail: `${file.name} has been uploaded to assets folder`
          });
        }
      } else {
        console.log('🎯 Using alternative upload method for:', file.type);
        // For other file types, convert to base64 and create as a file
        const base64Content = await this.fileToBase64(file);
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'bin';
        
        // Create file using WebsiteFilesService with a more flexible approach
        await this.createAssetFile(file.name, base64Content, fileExtension);
        
        this.messageService.add({
          severity: 'success',
          summary: 'Upload Successful',
          detail: `${file.name} has been uploaded to assets folder`
        });
      }
      
    } catch (error) {
      console.error('Error uploading asset:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Upload Failed',
        detail: `Failed to upload ${file.name}. ${error instanceof Error ? error.message : 'Please try again.'}`
      });
    } finally {
      this.isUploading = false;
    }
  }

  /**
   * Convert file to base64 string
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:mime/type;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }

  /**
   * Create asset file with data URL content for proper display
   */
  private async createAssetFile(fileName: string, base64Content: string, extension: string): Promise<void> {
    try {
      // Create a data URL for the asset
      const mimeType = this.getMimeType(extension);
      const dataUrl = `data:${mimeType};base64,${base64Content}`;
      
      // Store the data URL as the file content
      // This allows the file to be displayed properly as media
      const assetFileName = `assets/${fileName}`;
      
      await this.websiteFilesService.createFile(this.workspaceId, {
        fileName: assetFileName,
        fileType: 'html', // Use HTML type to store the data URL
        content: dataUrl
      }).toPromise();
      
      console.log('✅ Asset file created successfully:', assetFileName);
      
    } catch (error) {
      console.error('❌ Error creating asset file:', error);
      throw error;
    }
  }

  /**
   * Get MIME type for file extension
   */
  private getMimeType(extension: string): string {
    const mimeTypes: { [key: string]: string } = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'webp': 'image/webp',
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'avi': 'video/x-msvideo',
      'mov': 'video/quicktime',
      'wmv': 'video/x-ms-wmv',
      'flv': 'video/x-flv',
      'mkv': 'video/x-matroska',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'aac': 'audio/aac',
      'flac': 'audio/flac',
      'm4a': 'audio/mp4'
    };
    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(): string {
    if (!this.selectedFileName) return '';
    const parts = this.selectedFileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }

  /**
   * Check if the selected file is an image
   */
  isImageFile(): boolean {
    if (!this.selectedFile) return false;
    const extension = this.getFileExtension();
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'tiff'];
    
    // Check both file type and extension (for assets stored as HTML files)
    return imageExtensions.includes(this.selectedFileType.toLowerCase()) || 
           imageExtensions.includes(extension) ||
           (!!this.fileContent && this.fileContent.startsWith('data:image/'));
  }

  /**
   * Check if the selected file is a video
   */
  isVideoFile(): boolean {
    if (!this.selectedFile) return false;
    const extension = this.getFileExtension();
    const videoExtensions = ['mp4', 'webm', 'avi', 'mov', 'wmv', 'flv', 'mkv'];
    
    // Check both file type and extension (for assets stored as HTML files)
    return videoExtensions.includes(this.selectedFileType.toLowerCase()) || 
           videoExtensions.includes(extension) ||
           (!!this.fileContent && this.fileContent.startsWith('data:video/'));
  }

  /**
   * Check if the selected file is an audio file
   */
  isAudioFile(): boolean {
    if (!this.selectedFile) return false;
    const extension = this.getFileExtension();
    const audioExtensions = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'];
    
    // Check both file type and extension (for assets stored as HTML files)
    return audioExtensions.includes(this.selectedFileType.toLowerCase()) || 
           audioExtensions.includes(extension) ||
           (!!this.fileContent && this.fileContent.startsWith('data:audio/'));
  }

  /**
   * Get asset URL for display
   */
  getAssetUrl(): string {
    if (!this.selectedFile || !this.fileContent) return '';
    
    // If the content is already a data URL, return it directly
    if (this.fileContent.startsWith('data:')) {
      return this.fileContent;
    }
    
    // Otherwise, create a data URL from the base64 content
    const mimeType = this.getMimeType(this.selectedFileType);
    return `data:${mimeType};base64,${this.fileContent}`;
  }

  /**
   * Check if file should be displayed as media (not code)
   */
  isMediaFile(): boolean {
    return this.isImageFile() || this.isVideoFile() || this.isAudioFile();
  }

  /**
   * Get line numbers array for display
   */
  getLineNumbers(): string[] {
    if (!this.fileContent) return [];
    return this.fileContent.split('\n');
  }

  /**
   * Jump to a specific line number
   */
  jumpToLine(lineNumber: number): void {
    this.highlightedLine = lineNumber;
    setTimeout(() => this.scrollToLine(lineNumber), 100);
  }

  /**
   * Toggle search panel
   */
  toggleSearchPanel(): void {
    this.showSearchPanel = !this.showSearchPanel;
  }

  /**
   * Handle search input change
   */
  onSearchInput(query: string): void {
    this.searchQuery = query;
    this.searchSubject$.next(query);
  }

  /**
   * Perform the search
   */
  private performSearch(query: string): void {
    if (!query.trim()) {
      this.codebaseSearchService.clearSearch();
      return;
    }

    // Use the already loaded files instead of fetching them again
    if (this.files && this.files.length > 0) {
      // Perform search directly with loaded files
      const results = this.performDirectSearch(this.files, query, this.searchOptions);
      
      // Update the search service state
      this.searchResults = results;
      this.totalMatches = results.reduce((total, result) => total + result.totalMatches, 0);
      this.matchingFilesCount = results.length;
      this.isSearching = false;
    } else {
      // Fallback to service-based search
      this.codebaseSearchService.searchCodebase(this.workspaceId, query, this.searchOptions)
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    }
  }

  /**
   * Perform search directly on loaded files
   */
  private performDirectSearch(files: WebsiteFile[], query: string, options: SearchOptions): SearchResult[] {
    const results: SearchResult[] = [];
    let totalResults = 0;

    for (const file of files) {
      if (totalResults >= options.maxResults) break;

      // Filter by file type if specified
      if (options.includeFileTypes.length > 0 && !options.includeFileTypes.includes(file.fileType)) {
        continue;
      }
      if (options.excludeFileTypes.length > 0 && options.excludeFileTypes.includes(file.fileType)) {
        continue;
      }

      // Skip binary files or files without content
      if (!file.content || this.isBinaryFile(file)) {
        continue;
      }

      const matches = this.searchInFile(file.content, query, options);
      if (matches.length > 0) {
        results.push({
          file,
          matches,
          totalMatches: matches.length
        });
        totalResults += matches.length;
      }
    }

    // Sort results by relevance
    results.sort((a, b) => {
      if (a.totalMatches !== b.totalMatches) {
        return b.totalMatches - a.totalMatches;
      }
      return a.file.fileName.localeCompare(b.file.fileName);
    });

    return results;
  }

  /**
   * Check if a file is binary (should be skipped in text search)
   */
  private isBinaryFile(file: WebsiteFile): boolean {
    // Check if content starts with data URL (binary assets)
    if (file.content && file.content.startsWith('data:')) {
      return true;
    }

    // Check file extensions that are typically binary
    const binaryExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'tiff', 
                             'mp4', 'webm', 'avi', 'mov', 'wmv', 'flv', 'mkv',
                             'mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a',
                             'woff', 'woff2', 'ttf', 'otf', 'eot'];
    
    const fileName = file.fileName.toLowerCase();
    return binaryExtensions.some(ext => fileName.endsWith(`.${ext}`));
  }

  /**
   * Search within a single file
   */
  private searchInFile(content: string, query: string, options: SearchOptions): SearchMatch[] {
    const lines = content.split('\n');
    const matches: SearchMatch[] = [];

    let searchPattern: RegExp;
    
    try {
      if (options.useRegex) {
        const flags = options.caseSensitive ? 'g' : 'gi';
        searchPattern = new RegExp(query, flags);
      } else {
        const escapedQuery = this.escapeRegExp(query);
        const wordBoundary = options.wholeWord ? '\\b' : '';
        const flags = options.caseSensitive ? 'g' : 'gi';
        searchPattern = new RegExp(`${wordBoundary}${escapedQuery}${wordBoundary}`, flags);
      }
    } catch (error) {
      // Invalid regex, fall back to literal search
      const flags = options.caseSensitive ? 'g' : 'gi';
      searchPattern = new RegExp(this.escapeRegExp(query), flags);
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineMatches = Array.from(line.matchAll(searchPattern));

      for (const match of lineMatches) {
        if (match.index !== undefined) {
          matches.push({
            lineNumber: i + 1,
            lineContent: line,
            matchStart: match.index,
            matchEnd: match.index + match[0].length,
            contextBefore: this.getContextLines(lines, i, -2, 0),
            contextAfter: this.getContextLines(lines, i, 1, 2)
          });
        }
      }
    }

    return matches;
  }

  /**
   * Get context lines around a match
   */
  private getContextLines(lines: string[], currentIndex: number, startOffset: number, endOffset: number): string[] {
    const start = Math.max(0, currentIndex + startOffset);
    const end = Math.min(lines.length - 1, currentIndex + endOffset);
    const context: string[] = [];

    for (let i = start; i <= end; i++) {
      if (i !== currentIndex) {
        context.push(lines[i]);
      }
    }

    return context;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Clear search
   */
  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.totalMatches = 0;
    this.matchingFilesCount = 0;
    this.isSearching = false;
    this.expandedFiles.clear();
    this.selectedMatch = null;
    this.codebaseSearchService.clearSearch();
  }

  /**
   * Toggle advanced search options
   */
  toggleAdvancedOptions(): void {
    this.showAdvancedOptions = !this.showAdvancedOptions;
  }

  /**
   * Update search options and re-search
   */
  updateSearchOptions(): void {
    if (this.searchQuery.trim()) {
      this.performSearch(this.searchQuery);
    }
  }

  /**
   * Toggle file expansion in results
   */
  toggleFileExpansion(fileId: string): void {
    if (this.expandedFiles.has(fileId)) {
      this.expandedFiles.delete(fileId);
    } else {
      this.expandedFiles.add(fileId);
    }
  }

  /**
   * Check if file is expanded
   */
  isFileExpanded(fileId: string): boolean {
    return this.expandedFiles.has(fileId);
  }

  /**
   * Select a file (without specific line)
   */
  selectSearchFile(file: WebsiteFile): void {
    this.onSearchFileSelected({ file });
  }

  /**
   * Select a specific match (file + line)
   */
  selectMatch(result: SearchResult, matchIndex: number): void {
    const match = result.matches[matchIndex];
    this.selectedMatch = { fileId: result.file.id, matchIndex };
    this.onSearchFileSelected({ 
      file: result.file, 
      lineNumber: match.lineNumber 
    });
  }

  /**
   * Check if a match is selected
   */
  isMatchSelected(fileId: string, matchIndex: number): boolean {
    return this.selectedMatch?.fileId === fileId && this.selectedMatch?.matchIndex === matchIndex;
  }

  /**
   * Navigate to next match
   */
  navigateToNextMatch(): void {
    if (this.searchResults.length === 0) return;

    let nextFileIndex = 0;
    let nextMatchIndex = 0;

    if (this.selectedMatch) {
      // Find current position
      const currentFileIndex = this.searchResults.findIndex(r => r.file.id === this.selectedMatch!.fileId);
      const currentMatchIndex = this.selectedMatch.matchIndex;

      // Calculate next position
      if (currentMatchIndex < this.searchResults[currentFileIndex].matches.length - 1) {
        nextFileIndex = currentFileIndex;
        nextMatchIndex = currentMatchIndex + 1;
      } else if (currentFileIndex < this.searchResults.length - 1) {
        nextFileIndex = currentFileIndex + 1;
        nextMatchIndex = 0;
      }
      // If at the end, stay at the last match
      else {
        return;
      }
    }

    this.selectMatch(this.searchResults[nextFileIndex], nextMatchIndex);
  }

  /**
   * Navigate to previous match
   */
  navigateToPreviousMatch(): void {
    if (this.searchResults.length === 0) return;

    let prevFileIndex = this.searchResults.length - 1;
    let prevMatchIndex = this.searchResults[prevFileIndex].matches.length - 1;

    if (this.selectedMatch) {
      // Find current position
      const currentFileIndex = this.searchResults.findIndex(r => r.file.id === this.selectedMatch!.fileId);
      const currentMatchIndex = this.selectedMatch.matchIndex;

      // Calculate previous position
      if (currentMatchIndex > 0) {
        prevFileIndex = currentFileIndex;
        prevMatchIndex = currentMatchIndex - 1;
      } else if (currentFileIndex > 0) {
        prevFileIndex = currentFileIndex - 1;
        prevMatchIndex = this.searchResults[prevFileIndex].matches.length - 1;
      }
      // If at the beginning, stay at the first match
      else {
        return;
      }
    }

    this.selectMatch(this.searchResults[prevFileIndex], prevMatchIndex);
  }

  /**
   * Get highlighted line content
   */
  getHighlightedLine(match: SearchMatch): string {
    const line = match.lineContent;
    const before = line.substring(0, match.matchStart);
    const matchText = line.substring(match.matchStart, match.matchEnd);
    const after = line.substring(match.matchEnd);
    
    return `${before}<mark class="search-highlight">${matchText}</mark>${after}`;
  }

  /**
   * Get file icon class based on file type
   */
  getFileIcon(fileType: string): string {
    const iconMap: { [key: string]: string } = {
      'html': 'pi pi-file-code',
      'css': 'pi pi-palette',
      'js': 'pi pi-code',
      'json': 'pi pi-database'
    };
    return iconMap[fileType] || 'pi pi-file';
  }

  /**
   * Get relative file path for display
   */
  getDisplayPath(fileName: string): string {
    // Remove workspace prefix if present
    return fileName.startsWith('/') ? fileName.substring(1) : fileName;
  }

  /**
   * Track by function for ngFor performance
   */
  trackByFileId(index: number, result: SearchResult): string {
    return result.file.id;
  }

  /**
   * Handle file type filter changes
   */
  onFileTypeChange(event: any, fileType: string, filterType: 'include' | 'exclude'): void {
    const isChecked = event.target.checked;
    
    if (filterType === 'include') {
      if (isChecked) {
        if (!this.searchOptions.includeFileTypes.includes(fileType)) {
          this.searchOptions.includeFileTypes.push(fileType);
        }
      } else {
        this.searchOptions.includeFileTypes = this.searchOptions.includeFileTypes.filter(t => t !== fileType);
      }
    } else {
      if (isChecked) {
        if (!this.searchOptions.excludeFileTypes.includes(fileType)) {
          this.searchOptions.excludeFileTypes.push(fileType);
        }
      } else {
        this.searchOptions.excludeFileTypes = this.searchOptions.excludeFileTypes.filter(t => t !== fileType);
      }
    }
    
    this.updateSearchOptions();
  }

  /**
   * Handle file selection from search
   */
  onSearchFileSelected(event: { file: WebsiteFile; lineNumber?: number }): void {
    // Find the file in the tree and select it
    const fileNode = this.findFileInTree(event.file.fileName);
    if (fileNode) {
      this.selectedFile = fileNode;
      this.selectedFileName = event.file.fileName;
      this.selectedFileType = event.file.fileType;
      this.fileContent = event.file.content || '';
      this.highlightedLine = event.lineNumber || null;
      
      // Process content for display
      this.processFileContent();
      
      // Scroll to highlighted line if specified
      if (event.lineNumber) {
        setTimeout(() => this.scrollToLine(event.lineNumber!), 100);
      }
    }
  }

  /**
   * Find a file in the tree by filename
   */
  private findFileInTree(fileName: string): TreeNode | null {
    const searchInNodes = (nodes: TreeNode[]): TreeNode | null => {
      for (const node of nodes) {
        if (node.data && node.data.fileName === fileName) {
          return node;
        }
        if (node.children) {
          const found = searchInNodes(node.children);
          if (found) return found;
        }
      }
      return null;
    };
    
    return searchInNodes(this.fileTree);
  }

  /**
   * Scroll to a specific line in the code editor
   */
  private scrollToLine(lineNumber: number): void {
    if (this.codeContainer) {
      const codeWrapper = this.codeContainer.nativeElement.querySelector('.code-content-wrapper');
      if (codeWrapper) {
        // Calculate approximate line height (assuming 1.45 line-height and 12px font-size)
        const lineHeight = 12 * 1.45; // approximately 17.4px per line
        const targetScrollTop = (lineNumber - 1) * lineHeight;
        
        // Scroll to the calculated position
        codeWrapper.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth'
        });
        
        // Also scroll the line numbers to match
        const lineNumbersElement = this.codeContainer.nativeElement.querySelector('.line-numbers');
        if (lineNumbersElement) {
          lineNumbersElement.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth'
          });
        }
        
        // Clear highlight after 3 seconds
        setTimeout(() => {
          this.highlightedLine = null;
        }, 3000);
      }
    }
  }

  /**
   * Close search panel
   */
  closeSearchPanel(): void {
    this.showSearchPanel = false;
    this.highlightedLine = null;
  }

  /**
   * Refresh file tree with retry mechanism
   */
  private async refreshFileTreeWithRetry(maxRetries: number = 3): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`🎯 Refresh attempt ${i + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Progressive delay
        await this.loadFileStructure();
        
        // Check if assets folder exists and has been updated
        const assetsFolder = this.findAssetsFolder();
        if (assetsFolder) {
          console.log('🎯 Assets folder found after refresh');
          break;
        }
      } catch (error) {
        console.error(`🎯 Refresh attempt ${i + 1} failed:`, error);
        if (i === maxRetries - 1) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Refresh Warning',
            detail: 'Files uploaded but tree may not show updates immediately. Try refreshing manually.'
          });
        }
      }
    }
  }

  // ===================== FILE EDITOR INTEGRATION =====================

  /**
   * Initialize file editor services when workspace is loaded
   */
  private async initializeFileEditorServices(): Promise<void> {
    if (!this.workspaceId) return;

    try {
      // Initialize git status tracking
      await this.gitStatusService.initializeWorkspaceGitStatus(this.workspaceId);
      
      console.log('✅ File editor services initialized');
    } catch (error) {
      console.error('❌ Error initializing file editor services:', error);
    }
  }

  /**
   * Handle file content changes from the editor
   */
  onFileContentChanged(content: string): void {
    this.fileContent = content;
    this.lineCount = content.split('\n').length;
    
    console.log('📝 File content changed:', {
      fileName: this.selectedFileName,
      contentLength: content.length,
      lineCount: this.lineCount
    });
  }

  /**
   * Handle file save events
   */
  onFileSaved(): void {
    this.messageService.add({
      severity: 'success',
      summary: 'File Saved',
      detail: `${this.selectedFileName} has been saved successfully`
    });
    
    // Refresh file tree to show updated modification times
    this.onRefresh();
    
    console.log('💾 File saved:', this.selectedFileName);
  }

  /**
   * Handle file modification status changes
   */
  onFileModified(isModified: boolean): void {
    // Update UI to show modification status
    // This could be used to show indicators in the file tree
    console.log('📝 File modification status changed:', {
      fileName: this.selectedFileName,
      isModified
    });
  }

  /**
   * Create a new file
   */
  createNewFile(): void {
    const fileName = prompt('Enter file name (e.g., new-file.html, styles.css, script.js):');
    if (!fileName) return;

    const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'txt';
    
    // Create new file using the file editor service
    this.fileEditorService.createNewFile(fileName, fileExtension);
    
    // Update selected file to the new file
    this.selectedFileName = fileName;
    this.selectedFileType = fileExtension;
    this.fileContent = '';
    this.lineCount = 0;
    
    console.log('📄 New file created:', fileName);
  }

  /**
   * Save all modified files
   */
  async saveAllFiles(): Promise<void> {
    if (!this.workspaceId) return;

    try {
      const success = await this.fileEditorService.saveAllFiles(this.workspaceId);
      
      if (success) {
        this.messageService.add({
          severity: 'success',
          summary: 'All Files Saved',
          detail: 'All modified files have been saved successfully'
        });
        
        // Refresh file tree
        this.onRefresh();
      }
    } catch (error) {
      console.error('❌ Error saving all files:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Save Error',
        detail: 'Failed to save some files'
      });
    }
  }

  /**
   * Check if there are unsaved changes
   */
  hasUnsavedChanges(): boolean {
    return this.fileEditorService.hasUnsavedChanges();
  }

  /**
   * Get git status for file tree display
   */
  getFileGitStatus(fileId: string): string {
    const status = this.gitStatusService.getFileStatus(fileId);
    return status ? status.status : '';
  }

  /**
   * Get git status color for file tree display
   */
  getFileGitStatusColor(fileId: string): string {
    const status = this.gitStatusService.getFileStatus(fileId);
    return status ? this.gitStatusService.getStatusColor(status.status) : '';
  }

  // Helper methods for file operations

  // ===================== CACHE MANAGEMENT =====================

  /**
   * Update cache status information
   */
  updateCacheStatus(): void {
    if (this.workspaceId) {
      this.cacheStatus = this.websiteFilesService.getCacheStatus(this.workspaceId);
      console.log('📊 Cache status:', this.cacheStatus);
    }
  }

  /**
   * Force refresh cache and reload files
   */
  refreshCache(): void {
    if (this.workspaceId) {
      this.isLoadingFiles = true;
      this.websiteFilesService.forceRefresh(this.workspaceId).subscribe({
        next: (files) => {
          this.updateCacheStatus();
          this.messageService.add({
            severity: 'success',
            summary: 'Cache Refreshed',
            detail: `Reloaded ${files.length} files from server`
          });
          console.log('🔄 Cache refreshed successfully');
        },
        error: (error) => {
          console.error('❌ Error refreshing cache:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to refresh cache'
          });
        },
        complete: () => {
          this.isLoadingFiles = false;
        }
      });
    }
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.websiteFilesService.clearAllCache();
    this.updateCacheStatus();
    this.messageService.add({
      severity: 'info',
      summary: 'Cache Cleared',
      detail: 'All cached data has been removed'
    });
    console.log('🗑️ All cache cleared');
  }

  /**
   * Get cache status display text
   */
  getCacheStatusText(): string {
    if (!this.cacheStatus) return 'No cache info';
    
    const { hasMemoryCache, hasBrowserCache, isValid, fileCount, lastUpdated } = this.cacheStatus;
    
    if (!hasMemoryCache && !hasBrowserCache) {
      return 'No cache';
    }
    
    const status = isValid ? 'Valid' : 'Expired';
    const location = hasMemoryCache ? 'Memory' : 'Browser';
    const time = lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Unknown';
    
    return `${status} (${location}, ${fileCount} files, ${time})`;
  }

  /**
   * Get cache status icon
   */
  getCacheStatusIcon(): string {
    if (!this.cacheStatus) return 'pi-question-circle';
    
    const { hasMemoryCache, isValid } = this.cacheStatus;
    
    if (hasMemoryCache && isValid) return 'pi-check-circle';
    if (hasMemoryCache && !isValid) return 'pi-exclamation-triangle';
    return 'pi-times-circle';
  }

  /**
   * Get cache status color
   */
  getCacheStatusColor(): string {
    if (!this.cacheStatus) return '#6c757d';
    
    const { hasMemoryCache, isValid } = this.cacheStatus;
    
    if (hasMemoryCache && isValid) return '#28a745'; // Green
    if (hasMemoryCache && !isValid) return '#ffc107'; // Yellow
    return '#dc3545'; // Red
  }
} 