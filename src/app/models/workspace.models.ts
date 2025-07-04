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
  workspaceId: string;
  deployedBy: string;
}

export interface WorkspaceDeployment {
  id: string;
  workspaceId: string;
  deploymentStatus: string;
  deploymentUrl?: string;
  errorMessage?: string;
  deployedBy: string;
  deployedAt: Date;
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