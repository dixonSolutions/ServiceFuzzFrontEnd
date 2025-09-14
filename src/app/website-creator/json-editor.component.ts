import { Component, OnInit, OnDestroy, Output, EventEmitter, Input, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { WebsiteBuilderService } from '../services/website-builder';
import { WebsiteFilesService } from '../services/website-files.service';
import { Subject } from 'rxjs';
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
    
    console.log(`🎨 Mapping file type "${fileType}" to language "${language}"`);
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
    private messageService: MessageService
  ) {}

  ngOnInit() {
    // Get workspace ID from route parameters or input
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const routeWorkspaceId = params.get('workspaceId') || params.get('id');
      if (routeWorkspaceId) {
        this.workspaceId = routeWorkspaceId;
      }
      
      if (this.workspaceId) {
        this.loadWorkspaceInfo();
        this.loadFileStructure();
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No workspace ID provided'
        });
      }
    });
  }

  ngAfterViewInit() {
    // Component is ready - highlight.js will handle syntax highlighting automatically
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load workspace information to get the workspace name
   */
  async loadWorkspaceInfo(): Promise<void> {
    try {
      const workspace = await this.websiteBuilder.getWorkspace(this.workspaceId).toPromise();
      if (workspace && workspace.name) {
        this.workspaceName = workspace.name;
      }
    } catch (error) {
      console.error('Error loading workspace info:', error);
      // Keep default name if error occurs
    }
  }

  /**
   * Load file structure from API and convert to tree format
   */
  async loadFileStructure(): Promise<void> {
    this.isLoadingFiles = true;
    
    try {
      const files = await this.websiteFilesService.getFiles(this.workspaceId).toPromise();
      
      if (files && Array.isArray(files)) {
        this.files = files;
        this.fileTree = this.convertFilesToTree(files);
        this.filteredTree = [...this.fileTree];
      }
    } catch (error) {
      console.error('Error loading file structure:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load file structure'
      });
    } finally {
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
   * Get icon for file based on file type
   */
  getFileIcon(fileType: string): string {
    const icons: { [key: string]: string } = {
      html: 'pi pi-file',
      css: 'pi pi-palette',
      js: 'pi pi-code',
      json: 'pi pi-database'
    };
    return icons[fileType] || 'pi pi-file';
  }

  /**
   * Handle file selection in tree
   */
  onFileSelect(event: any): void {
    const node = event.node;
    
    if (node.leaf && node.data && node.data.id) {
      this.selectedFile = node;
      this.loadFileContent(node.data);
    }
  }

  /**
   * Load content of selected file
   */
  async loadFileContent(file: WebsiteFile): Promise<void> {
    this.isLoadingContent = true;
    this.selectedFileName = file.fileName;
    this.selectedFileType = file.fileType;
    
    try {
      // Use the content from the file object
      this.fileContent = file.content || '';
      
      // Process content for display
      this.processFileContent();
      
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load file content'
      });
      this.fileContent = 'Error loading file content';
      this.processFileContent();
    } finally {
      this.isLoadingContent = false;
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
    this.loadFileStructure();
  }

  /**
   * Close the file browser
   */
  closeEditor(): void {
    // If used as a standalone route, navigate back
    if (this.route.snapshot.url.length > 0) {
      // Check if we came from website creator
      const referrer = document.referrer;
      if (referrer && referrer.includes('website-creator')) {
        window.history.back();
      } else {
        // Navigate to website creator for this workspace
        this.router.navigate(['/website-creator']);
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



  // Helper methods for file operations
} 