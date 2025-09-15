import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DataSvrService } from '../../../Other/data-svr.service';
import {
  AIComponentEnhancementRequest,
  AIComponentEnhancementResponse,
  AIComponentSuggestionsResponse,
  AILayoutSuggestionsResponse,
  AISEOContentRequest,
  AISEOContentResponse
} from '../../../../models/workspace.models';

@Injectable({
  providedIn: 'root'
})
export class AIEnhancementService {
  private readonly apiBaseUrl = 'https://servicefuzzapi-atf8b4dqawc8dsa9.australiaeast-01.azurewebsites.net';

  constructor(
    private http: HttpClient,
    private dataSvr: DataSvrService
  ) {}

  /**
   * AI-powered component enhancement
   */
  enhanceComponents(workspaceId: string, componentIds: string[], prompt: string): Observable<AIComponentEnhancementResponse> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    const request: AIComponentEnhancementRequest = {
      workspaceId,
      componentIds,
      userPrompt: prompt
    };

        return this.http.post<AIComponentEnhancementResponse>(
          `${this.apiBaseUrl}/api/business-website/ai/enhance-components`,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        }
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get AI component suggestions for workspace
   */
  getComponentSuggestions(workspaceId: string): Observable<AIComponentSuggestionsResponse> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

        return this.http.get<AIComponentSuggestionsResponse>(
          `${this.apiBaseUrl}/api/business-website/ai/component-suggestions/${workspaceId}`,
      {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Smart layout recommendations
   */
  getLayoutSuggestions(workspaceId: string): Observable<AILayoutSuggestionsResponse> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

        return this.http.get<AILayoutSuggestionsResponse>(
          `${this.apiBaseUrl}/api/business-website/ai/layout-suggestions/${workspaceId}`,
      {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Generate SEO-optimized content
   */
  generateSEOContent(businessId: string, pageType: string, keywords: string[]): Observable<AISEOContentResponse> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    const request: AISEOContentRequest = {
      businessId,
      pageType,
      keywords
    };

        return this.http.post<AISEOContentResponse>(
          `${this.apiBaseUrl}/api/business-website/ai/seo-content`,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        }
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Error handling
   */
  private handleError = (error: any): Observable<never> => {
    console.error('AI Enhancement Service Error:', error);
    throw error;
  }
}
