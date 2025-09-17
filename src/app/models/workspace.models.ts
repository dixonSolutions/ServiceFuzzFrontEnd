export interface CreateWorkspaceDto {
  userId: string;
  businessId: string;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  // websiteJson: REMOVED - Now using proper file structure
  // NOTE: blobAddress is NOT included here as it's automatically initialized by the backend
}

export interface UpdateWorkspaceDto {
  name?: string;
  description?: string;
  thumbnailUrl?: string;
  // websiteJson: REMOVED - Now using proper file structure
  deploymentStatus?: string;
  deploymentUrl?: string;
  // NEW PROPERTIES FOR WEBSITE BUILDER
  subdomain?: string;
  customDomain?: string;
  globalCSS?: string;
  globalJS?: string;
  faviconUrl?: string;
  
  // 🆕 NEW: Automatic Blob Storage URLs
  blobAddress?: string;               // Container name (e.g., "project-abc123")
  blobBaseUrl?: string;               // Base URL: "https://servicefussstorage.blob.core.windows.net/project-abc123/"
  previewUrl?: string;                // Preview URL: "{blobBaseUrl}preview/"
  productionUrl?: string;             // Production URL: "{blobBaseUrl}production/"
}

export interface WorkspaceResponseDto {
  id: string;
  userId: string;
  businessId: string;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  // websiteJson: REMOVED - Now using proper file structure
  deploymentStatus: string;
  deploymentUrl?: string;
  deployedAt?: Date;
  createdAt: Date;
  lastModified: Date;
  
  // NEW PROPERTIES FOR WEBSITE BUILDER
  subdomain?: string;
  customDomain?: string;
  globalCSS?: string;
  globalJS?: string;
  faviconUrl?: string;
  
  // 🆕 NEW: Automatic Blob Storage URLs
  blobAddress?: string;               // Container name (e.g., "project-abc123")
  blobBaseUrl?: string;               // Base URL: "https://servicefussstorage.blob.core.windows.net/project-abc123/"
  previewUrl?: string;                // Preview URL: "{blobBaseUrl}preview/"
  productionUrl?: string;             // Production URL: "{blobBaseUrl}production/"
}

export interface CreateWorkspaceComponentDto {
  workspaceId: string;
  pageId: string;
  componentId: string;
  componentType: string;
  xPosition: number;
  yPosition: number;
  width: number;
  height: number;
  zIndex: number;
  parameters?: string;
}

export interface UpdateWorkspaceComponentDto {
  xPosition?: number;
  yPosition?: number;
  width?: number;
  height?: number;
  zIndex?: number;
  parameters?: string;
  customCSS?: string; // NEW - Component-specific styles
}

export interface WorkspaceComponentResponseDto {
  id: string;
  workspaceId: string;
  pageId: string;
  componentId: string;
  componentType: string;
  xPosition: number;
  yPosition: number;
  width: number;
  height: number;
  zIndex: number;
  parameters?: string;
  customCSS?: string; // NEW - Component-specific styles
  createdAt: Date;
  updatedAt: Date;
}

export interface ComponentType {
  id: string;
  name: string;
  category: string;
  icon?: string;
  description?: string;
  parametersSchema?: string;
  defaultParameters?: string;
  htmlTemplate?: string;
  cssTemplate?: string;           // 🆕 CSS template for runtime injection
  javaScriptTemplate?: string;    // 🆕 JavaScript template for runtime injection
  loadingPriority?: number;       // 🆕 1=critical, 10=lazy (1-10 scale)
  defaultWidth: number;
  defaultHeight: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;               // 🆕 Last update timestamp
}

export interface WorkspaceComponent {
  id: string;                     // 🔑 INSTANCE ID (unique per placement)
  workspaceId: string;            // Workspace identifier
  pageId: string;                 // Page identifier
  componentId: string;            // Component identifier within page
  componentType: string;          // 🔑 COMPONENT TYPE ID (references ComponentTypes.id)
  xPosition: number;              // X coordinate
  yPosition: number;              // Y coordinate
  width: number;                  // Component width
  height: number;                 // Component height
  zIndex: number;                 // Layer order
  parameters?: string;            // Instance-specific parameters (JSON)
  createdAt: Date;                // Creation timestamp
  updatedAt: Date;                // Last update timestamp
}

export interface DeployWorkspaceDto {
  workspaceId: string;     // The workspace ID to deploy
  deployedBy: string;      // User ID who initiated the deployment
  websiteName: string;     // Unique website name (e.g., "my-awesome-business")
}

// Enhanced deployment response interface
export interface DeployWorkspaceResponse {
  message: string;
  deploymentUrl: string;      // Simple format: https://servicefuzz.com/websitename
  deploymentId: string;       // Unique ID for this deployment
  deploymentStatus: string;   // Current deployment status ("deploying", "deployed", "failed")
  deployedAt: string;         // ISO timestamp when deployment was initiated
  workspaceId: string;        // The workspace ID being deployed
}

// Website name validation interface
export interface WebsiteNameValidation {
  isValid: boolean;
  error?: string;
}

export interface WorkspaceDeployment {
  id: string;
  workspaceId: string;
  deploymentStatus: string;      // "deploying", "deployed", "failed"
  deploymentUrl?: string;        // URL where website is deployed
  errorMessage?: string;         // Error message if deployment failed
  deployedBy: string;           // User ID who initiated deployment
  deployedAt: string;           // ISO timestamp of deployment
}

// Response wrapper interfaces
export interface ApiResponse<T> {
  data?: T;
  message?: string;
  totalItems?: number;
}

export interface WorkspaceListResponse {
  userId?: string;
  businessId?: string;
  totalWorkspaces: number;
  workspaces: WorkspaceResponseDto[];
}

export interface ComponentListResponse {
  workspaceId: string;
  pageId?: string;
  totalComponents: number;
  components: WorkspaceComponentResponseDto[];
}

export interface ComponentTypeListResponse {
  category?: string;
  totalComponentTypes: number;
  componentTypes: ComponentType[];
}

export interface DeploymentListResponse {
  workspaceId: string;
  totalDeployments: number;
  deployments: WorkspaceDeployment[];
}

// Delete deployment response interfaces
export interface DeleteDeploymentResponse {
  message: string;
  deletedDeploymentId: string;
  success: boolean;
}

export interface DeleteAllDeploymentsResponse {
  message: string;
  deletedCount: number;
  workspaceId: string;
  success: boolean;
}

// Deployment limits configuration
export interface DeploymentLimits {
  maxDeployments: number;
  autoDeleteOldest?: boolean;
  warningThreshold?: number; // Show warning when approaching limit
}

export interface DeploymentLimitCheck {
  canDeploy: boolean;
  currentCount: number;
  maxAllowed: number;
  isAtWarningThreshold: boolean;
  message?: string;
}

// Enhanced component system interfaces
export interface ComponentParameter {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'color' | 'select' | 'image-asset';
  label: string;
  required?: boolean;
  options?: string[];
  defaultValue?: any;
}

export interface ComponentInstance {
  id: string;
  componentTypeId: string;
  parameters: { [key: string]: any };
  customStyles?: { [key: string]: string };
  xPosition: number;
  yPosition: number;
  width: number;
  height: number;
  zIndex: number;
}

export interface WebsiteCSS {
  global?: string;
  components?: { [componentId: string]: string };
}

export interface WebsiteData {
  pages: WebsitePage[];
  globalCSS?: string;
  componentCSS?: { [componentId: string]: string };
  metadata?: {
    title?: string;
    description?: string;
    favicon?: string;
  };
}

export interface WebsitePage {
  id: string;
  name: string;
  slug: string;
  components: ComponentInstance[];
  pageCSS?: string;
  isHomePage?: boolean;
}

export interface ParameterFormField {
  parameter: ComponentParameter;
  value: any;
  touched: boolean;
  valid: boolean;
  errorMessage?: string;
}

export interface ComponentRenderContext {
  component: ComponentInstance;
  componentType: ComponentType;
  renderedHTML: string;
  appliedCSS: string;
  parameters: { [key: string]: any };
}

// ===================== NEW MODELS FOR ENHANCED WEBSITE BUILDER =====================

// Website Files Model
export interface WebsiteFile {
  id: string;
  workspaceId: string;
  fileName: string; // index.html, styles.css, script.js
  fileType: 'html' | 'css' | 'js' | 'json';
  content: string; // File content as text
  fileSize: number;
  createdAt: Date;
  updatedAt: Date;
}

// Website Assets Model (Enhanced with Blob Storage & Versioning)
export interface WebsiteAsset {
  id: string;
  workspaceId: string;
  fileName: string;
  contentType: string; // image/jpeg, image/png, etc.
  filePath: string; // Legacy path (kept for backward compatibility)
  blobUrl?: string; // Full Azure Blob URL
  blobContainer?: string; // Container name
  blobPath?: string; // Path within container
  version: number; // Version number (1, 2, 3...)
  versionTag?: string; // Optional tag ("draft", "final")
  versionCreatedAt?: Date; // When this version was created
  parentAssetId?: string; // Original asset ID for versions
  isCurrentVersion: boolean; // Is this the active version?
  fileSize: number;
  altText?: string;
  uploadedAt: Date;
}

// Asset Version Management Interfaces
export interface AssetVersionHistoryDto {
  assetId: string;
  fileName: string;
  versions: AssetVersionDto[];
}

export interface AssetVersionDto {
  id: string;
  version: number;
  versionTag?: string;
  versionCreatedAt?: Date;
  isCurrentVersion: boolean;
  fileSize: number;
  blobUrl?: string;
}

// Blob Storage Status Interface
// NOTE: hasBlobAddress should be true for all new workspaces (auto-initialized)
// Only legacy workspaces created before blob storage implementation may have hasBlobAddress: false
export interface BlobStorageStatusDto {
  workspaceId: string;
  workspaceName: string;
  hasBlobAddress: boolean;
  blobAddress?: string;
  files: {
    total: number;
    inBlobStorage: number;
    percentage: number;
  };
  assets: {
    total: number;
    inBlobStorage: number;
    percentage: number;
  };
}

// Enhanced Website Pages Model (extends existing WebsitePage)
export interface EnhancedWebsitePage {
  id: string;
  workspaceId: string;
  pageName: string; // Home, About, Contact, etc.
  route: string; // /, /about, /contact
  title?: string; // SEO title
  metaDescription?: string; // SEO description
  customCSS?: string; // Page-specific CSS
  customJS?: string; // Page-specific JavaScript
  isHomePage: boolean;
  createdAt: Date;
  updatedAt: Date;
  components?: WorkspaceComponentResponseDto[]; // Navigation property
}

// Domain Mapping Model
export interface DomainMapping {
  id: string;
  businessId: string;
  workspaceId: string;
  domain: string; // business-name.yourdomain.com or www.customdomain.com
  subdomain?: string; // Only if it's a subdomain
  isActive: boolean;
  isCustomDomain: boolean; // true for custom domains, false for subdomains
  createdAt: Date;
  verifiedAt?: Date;
}

// ===================== NEW DTO INTERFACES =====================

// Website File DTOs
export interface CreateWebsiteFileDto {
  workspaceId: string;
  fileName: string;
  fileType: 'html' | 'css' | 'js' | 'json';
  content: string;
}

export interface UpdateWebsiteFileDto {
  content: string;
}

// Website Asset DTOs (Enhanced with Versioning)
export interface CreateWebsiteAssetDto {
  workspaceId: string;
  fileName: string;
  contentType: string;
  filePath: string; // Legacy - kept for backward compatibility
  fileSize: number;
  altText?: string;
  // New versioning properties
  versionTag?: string; // e.g., "draft", "final", "v1.0"
  parentAssetId?: string; // For creating new versions of existing assets
}

// Website Page DTOs
export interface CreateWebsitePageDto {
  workspaceId: string;
  pageName: string;
  route: string;
  title?: string;
  metaDescription?: string;
  customCSS?: string;
  customJS?: string;
  isHomePage?: boolean;
}

export interface UpdateWebsitePageDto {
  pageName?: string;
  route?: string;
  title?: string;
  metaDescription?: string;
  customCSS?: string;
  customJS?: string;
  isHomePage?: boolean;
}

// Domain Mapping DTOs
export interface CreateDomainMappingDto {
  businessId: string;
  workspaceId: string;
  domain: string;
  subdomain?: string;
  isCustomDomain: boolean;
}

export interface UpdateDomainMappingDto {
  domain?: string;
  subdomain?: string;
  isActive?: boolean;
}

// ===================== RESPONSE INTERFACES =====================

export interface WebsiteFileListResponse {
  workspaceId: string;
  totalFiles: number;
  files: WebsiteFile[];
}

export interface WebsiteAssetListResponse {
  workspaceId: string;
  totalAssets: number;
  assets: WebsiteAsset[];
}

export interface WebsitePageListResponse {
  workspaceId: string;
  totalPages: number;
  pages: EnhancedWebsitePage[];
}

export interface DomainMappingListResponse {
  businessId: string;
  totalMappings: number;
  mappings: DomainMapping[];
}

// ===================== AI ENHANCEMENT INTERFACES =====================

export interface AIComponentEnhancementRequest {
  workspaceId: string;
  componentIds: string[];
  userPrompt: string;
}

export interface AIComponentEnhancementResponse {
  enhancedComponents: WorkspaceComponentResponseDto[];
  suggestions: string[];
}

export interface AIComponentSuggestionsResponse {
  suggestions: ComponentSuggestion[];
  categories: string[];
}

export interface ComponentSuggestion {
  componentType: string;
  name: string;
  description: string;
  category: string;
  confidence: number;
}

export interface AILayoutSuggestionsResponse {
  layouts: LayoutSuggestion[];
  bestPractices: string[];
}

export interface LayoutSuggestion {
  name: string;
  description: string;
  components: ComponentPlacement[];
}

export interface ComponentPlacement {
  componentType: string;
  xPosition: number;
  yPosition: number;
  width: number;
  height: number;
}

export interface AISEOContentRequest {
  businessId: string;
  pageType: string;
  keywords: string[];
}

export interface AISEOContentResponse {
  title: string;
  metaDescription: string;
  content: string;
}

// ===================== REVERSE PROXY INTERFACES =====================

export interface ReverseDomainResolutionResponse {
  workspaceId: string;
  businessId: string;
  isActive: boolean;
}

export interface SubdomainGenerationRequest {
  businessId: string;
  workspaceId: string;
  preferredSubdomain: string;
}

export interface SubdomainGenerationResponse {
  subdomain: string;
  domain: string;
  isAvailable: boolean;
}

export interface SubdomainAvailabilityResponse {
  isAvailable: boolean;
  suggestions: string[];
}

// ===================== NEW BULK SAVE & ASSET MANAGEMENT =====================

// Bulk file save interfaces
export interface BulkFileUpdate {
  id?: string;           // For updating existing files
  fileName?: string;     // For creating new files  
  fileType?: string;     // html, css, js, md, gitkeep
  content?: string;
}

export interface BulkSaveRequest {
  files: BulkFileUpdate[];
}

export interface BulkSaveResponse {
  success: boolean;
  updatedFiles: WebsiteFile[];
  createdFiles: WebsiteFile[];
  errors?: Array<{
    fileName?: string;
    id?: string;
    error: string;
  }>;
}

// Live preview interfaces
export interface PreviewRequest {
  pageRoute?: string;    // Optional, defaults to /
}

export interface PreviewResponse {
  html: string;
  generatedAt: Date;
  pageRoute: string;
}

// Enhanced WebsiteAsset with upload support (includes versioning)
export interface WebsiteAssetUpload {
  workspaceId: string;
  file: File;
  altText?: string;
  // Versioning support
  versionTag?: string; // e.g., "draft", "final", "v1.0"
  parentAssetId?: string; // For creating new versions of existing assets
}

export interface WebsiteAssetUpdate {
  altText?: string;
}

export interface WebsiteAssetResponse {
  success: boolean;
  asset?: WebsiteAsset;
  error?: string;
}

export interface WebsiteAssetListResponse {
  assets: WebsiteAsset[];
  totalCount: number;
}

export interface AssetUrlResponse {
  assetId: string;
  fileName: string;
  url: string;
  contentType: string;
}

// ===================== BLOB STORAGE MANAGEMENT INTERFACES =====================

// Workspace Blob Initialization Response
// NOTE: This is primarily for legacy workspaces that need manual initialization
// New workspaces automatically have blob storage initialized during creation
export interface WorkspaceBlobInitializationResponse {
  success: boolean;
  workspaceId: string;
  blobAddress: string;
  message: string;
}

// Blob Container Status Response
export interface BlobContainerStatusResponse {
  workspaceId: string;
  containerName: string;
  isPublic: boolean;
  blobCount: number;
  totalSize: number;
}

// SAS URL Response for temporary access
export interface SasUrlResponse {
  assetId: string;
  sasUrl: string;
  expiresAt: Date;
}

// Enhanced Asset Upload Response
export interface EnhancedAssetUploadResponse {
  success: boolean;
  asset?: WebsiteAsset;
  blobUrl?: string;
  version: number;
  isNewAsset: boolean; // true if this is the first version, false if it's a new version
  error?: string;
}

// ===================== FILE TREE BROWSER INTERFACES =====================

// File Tree Node interface for PrimeNG Tree
export interface FileTreeNode {
  key?: string;
  label?: string;
  data?: any;
  icon?: string;
  expandedIcon?: string;
  collapsedIcon?: string;
  children?: FileTreeNode[];
  leaf?: boolean;
  expanded?: boolean;
  type?: string;
  parent?: FileTreeNode;
  partialSelected?: boolean;
  styleClass?: string;
  draggable?: boolean;
  droppable?: boolean;
  selectable?: boolean;
}

// File structure response from API
export interface FileStructureResponse {
  files: FileTreeNode[];
  totalFiles: number;
}

// File content response
export interface FileContentResponse {
  id: string;
  fileName: string;
  fileType: string;
  content: string;
  fileSize: number;
  lastModified: Date;
} 