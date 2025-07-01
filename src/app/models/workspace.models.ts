export interface CreateWorkspaceDto {
  UserId: string;
  BusinessId: string;
  Name: string;
  Description?: string;
  ThumbnailUrl?: string;
  WebsiteJson?: string;
}

export interface UpdateWorkspaceDto {
  Name?: string;
  Description?: string;
  ThumbnailUrl?: string;
  WebsiteJson?: string;
  DeploymentStatus?: string;
  DeploymentUrl?: string;
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
  WorkspaceId: string;
  PageId: string;
  ComponentId: string;
  ComponentType: string;
  XPosition: number;
  YPosition: number;
  Width: number;
  Height: number;
  ZIndex: number;
  Parameters?: string;
}

export interface UpdateWorkspaceComponentDto {
  XPosition?: number;
  YPosition?: number;
  Width?: number;
  Height?: number;
  ZIndex?: number;
  Parameters?: string;
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
  defaultWidth: number;
  defaultHeight: number;
  isActive: boolean;
  createdAt: Date;
}

export interface DeployWorkspaceDto {
  WorkspaceId: string;
  DeployedBy: string;
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