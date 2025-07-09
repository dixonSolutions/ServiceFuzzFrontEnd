export interface CreateWorkspaceDto {
  userId: string;
  businessId: string;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  websiteJson?: string;
}

export interface UpdateWorkspaceDto {
  name?: string;
  description?: string;
  thumbnailUrl?: string;
  websiteJson?: string;
  deploymentStatus?: string;
  deploymentUrl?: string;
}

export interface WorkspaceResponseDto {
  id: string;
  userId: string;
  businessId: string;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  websiteJson?: string;
  deploymentStatus: string;
  deploymentUrl?: string;
  deployedAt?: Date;
  createdAt: Date;
  lastModified: Date;
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