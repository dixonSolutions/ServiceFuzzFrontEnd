import { AIWebsiteGenerationRequest } from '../models/ai-website.models';

export class AIWebsiteUtils {
  
  /**
   * Create a basic AI website generation request
   */
  static createBasicRequest(
    businessId: string,
    workspaceId: string,
    userPrompt: string
  ): AIWebsiteGenerationRequest {
    return {
      businessId,
      workspaceId,
      userPrompt
    };
  }

  /**
   * Create a comprehensive AI website generation request
   */
  static createComprehensiveRequest(
    businessId: string,
    workspaceId: string,
    userPrompt: string,
    currentWebsiteJson?: string,
    selectedComponents?: string[],
    customInstructions?: string
  ): AIWebsiteGenerationRequest {
    return {
      businessId,
      workspaceId,
      userPrompt,
      currentWebsiteJson,
      aiComponents: selectedComponents,
      componentsExplanation: customInstructions
    };
  }

  /**
   * Validate request before sending
   */
  static validateRequest(request: AIWebsiteGenerationRequest): string[] {
    const errors: string[] = [];

    if (!request.businessId?.trim()) {
      errors.push('Business ID is required');
    }

    if (!request.workspaceId?.trim()) {
      errors.push('Workspace ID is required');
    }

    if (!request.userPrompt?.trim()) {
      errors.push('User prompt is required');
    }

    if (request.userPrompt && request.userPrompt.length < 10) {
      errors.push('User prompt must be at least 10 characters long');
    }

    if (request.userPrompt && request.userPrompt.length > 2000) {
      errors.push('User prompt must be less than 2000 characters');
    }

    return errors;
  }

  /**
   * Format generation response for display
   */
  static formatGenerationSummary(response: any): string {
    if (!response.success) {
      return `Generation failed: ${response.message}`;
    }

    const changes = response.changesApplied?.length || 0;
    const timestamp = new Date(response.generatedAt).toLocaleString();
    
    return `Successfully generated website with ${changes} changes at ${timestamp}. ${response.concludingMessage || ''}`;
  }

  /**
   * Extract component names from available components
   */
  static extractComponentNames(components: any[]): string[] {
    return components.map(component => component.name).filter(name => name);
  }

  /**
   * Check if website JSON is valid format
   */
  static isValidWebsiteJson(json: string): boolean {
    try {
      const parsed = JSON.parse(json);
      return typeof parsed === 'object' && parsed !== null;
    } catch {
      return false;
    }
  }

  /**
   * Generate a unique ID for chat messages
   */
  static generateMessageId(): string {
    return 'msg_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }
}
