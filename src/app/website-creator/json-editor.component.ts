import { Component, OnInit, OnDestroy, Output, EventEmitter, Input, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { WebsiteBuilderService } from '../services/website-builder';
import { WebsiteFilesService } from '../services/website-files.service';
import { WebsiteAssetsService } from '../services/website-assets.service';
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
  workspaceDetails: any = null;
  
  // Assets folder drag and drop
  assetsFolder: TreeNode | null = null;
  isDragOver = false;
  isUploading = false;

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
    private websiteAssetsService: WebsiteAssetsService,
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
      if (workspace) {
        this.workspaceDetails = workspace;
        if (workspace.name) {
        this.workspaceName = workspace.name;
        }
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
   * Create asset file using alternative method
   */
  private async createAssetFile(fileName: string, base64Content: string, extension: string): Promise<void> {
    // Create a simple HTML file that references the asset
    const assetHtml = `<!-- Asset: ${fileName} -->
<div class="asset-file" data-filename="${fileName}" data-extension="${extension}">
  <script type="application/octet-stream" data-asset="${fileName}">
    ${base64Content}
  </script>
</div>`;

    // Use WebsiteFilesService to create the file
    const assetFileName = `assets/${fileName}.asset.html`;
    await this.websiteFilesService.createFile(this.workspaceId, {
      fileName: assetFileName,
      fileType: 'html',
      content: assetHtml
    }).toPromise();
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

  // Helper methods for file operations
} 