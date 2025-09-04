export interface AIWebsiteGenerationRequest {
  businessId: string;
  workspaceId: string;
  userPrompt: string;
  currentWebsiteJson?: string;
  aiComponents?: string[];
  componentsExplanation?: string;
}

export interface AIWebsiteGenerationResponse {
  success: boolean;
  message: string;
  revisedWebsiteJson?: string;
  concludingMessage?: string;
  changesApplied?: string[];
  workspaceId?: string;
  generatedAt: Date;
}

export interface AIWebsiteContext {
  businessId: string;
  workspaceId: string;
  businessName?: string;
  businessDescription?: string;
  businessServices?: string[];
  currentWebsiteJson?: string;
  availableComponents?: string[];
  componentsExplanation?: string;
  userPrompt: string;
}

export interface WebsiteComponent {
  name: string;
  description: string;
}

export interface ComponentsResponse {
  components: WebsiteComponent[];
}

export interface ValidationResponse {
  isValid: boolean;
  message: string;
}

// Error response interface
export interface ApiErrorResponse {
  success: boolean;
  message: string;
  errors?: string[];
}

// Chat message interface for AI conversation
export interface AIWebsiteChatMessage {
  id: string;
  content: string;
  timestamp: Date;
  isUser: boolean;
  isLoading?: boolean;
  websiteJson?: string;
  changesApplied?: string[];
}
