export interface CreateWorkspaceDto {
  userId: string;
  businessId: string;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  // websiteJson: REMOVED - Now using proper file structure
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
  defaultWidth: number;
  defaultHeight: number;
  isActive: boolean;
  createdAt: Date;
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

// Website Assets Model
export interface WebsiteAsset {
  id: string;
  workspaceId: string;
  fileName: string;
  contentType: string; // image/jpeg, image/png, etc.
  filePath: string; // Path to actual file on disk/CDN
  fileSize: number;
  altText?: string;
  uploadedAt: Date;
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

// Website Asset DTOs
export interface CreateWebsiteAssetDto {
  workspaceId: string;
  fileName: string;
  contentType: string;
  filePath: string;
  fileSize: number;
  altText?: string;
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

// Enhanced WebsiteAsset with upload support
export interface WebsiteAssetUpload {
  workspaceId: string;
  file: File;
  altText?: string;
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