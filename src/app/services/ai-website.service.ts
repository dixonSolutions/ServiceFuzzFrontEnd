import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  AIWebsiteGenerationRequest,
  AIWebsiteGenerationResponse,
  AIWebsiteContext,
  ComponentsResponse,
  ValidationResponse,
  ApiErrorResponse
} from '../models/ai-website.models';

@Injectable({
  providedIn: 'root'
})
export class AIWebsiteService {
  private readonly baseUrl = `https://servicefuzzapi-atf8b4dqawc8dsa9.australiaeast-01.azurewebsites.net/api/aiwebsite`;

  constructor(private http: HttpClient) {}

  /**
   * Generate or revise a website using AI
   * @param request The AI website generation request
   * @returns Observable of AI website generation response
   */
  generateWebsite(request: AIWebsiteGenerationRequest): Observable<AIWebsiteGenerationResponse> {
    return this.http.post<AIWebsiteGenerationResponse>(`${this.baseUrl}/generate`, request)
      .pipe(
        map(response => ({
          ...response,
          generatedAt: new Date(response.generatedAt)
        })),
        catchError(this.handleError)
      );
  }

  // ===================== NEW ENHANCED AI METHODS =====================

  /**
   * AI-powered component enhancement
   * @param workspaceId The workspace ID
   * @param componentIds Array of component IDs to enhance
   * @param userPrompt User's enhancement prompt
   * @returns Observable of enhanced components
   */
  enhanceComponents(workspaceId: string, componentIds: string[], userPrompt: string): Observable<any> {
    const request = {
      workspaceId,
      componentIds,
      userPrompt
    };

    return this.http.post<any>(`${this.baseUrl}/enhance-components`, request)
      .pipe(catchError(this.handleError));
  }

  /**
   * Get AI component suggestions for workspace
   * @param workspaceId The workspace ID
   * @returns Observable of component suggestions
   */
  getComponentSuggestions(workspaceId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/component-suggestions/${workspaceId}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Smart layout recommendations
   * @param workspaceId The workspace ID
   * @returns Observable of layout suggestions
   */
  getLayoutSuggestions(workspaceId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/layout-suggestions/${workspaceId}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Generate SEO-optimized content
   * @param businessId The business ID
   * @param pageType The type of page (home, about, contact, etc.)
   * @param keywords Array of SEO keywords
   * @returns Observable of SEO content
   */
  generateSEOContent(businessId: string, pageType: string, keywords: string[]): Observable<any> {
    const request = {
      businessId,
      pageType,
      keywords
    };

    return this.http.post<any>(`${this.baseUrl}/seo-content`, request)
      .pipe(catchError(this.handleError));
  }

  /**
   * Get website context for AI generation preview
   * @param businessId The business ID
   * @param workspaceId The workspace ID
   * @param userPrompt The user's prompt
   * @returns Observable of AI website context
   */
  getWebsiteContext(businessId: string, workspaceId: string, userPrompt: string): Observable<AIWebsiteContext> {
    const params = new HttpParams()
      .set('businessId', businessId)
      .set('workspaceId', workspaceId)
      .set('userPrompt', userPrompt);

    return this.http.get<AIWebsiteContext>(`${this.baseUrl}/context`, { params })
      .pipe(catchError(this.handleError));
  }

  /**
   * Validate website JSON structure
   * @param websiteJson The website JSON to validate
   * @returns Observable of validation response
   */
  validateWebsiteJson(websiteJson: string): Observable<ValidationResponse> {
    return this.http.post<ValidationResponse>(`${this.baseUrl}/validate`, JSON.stringify(websiteJson), {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(catchError(this.handleError));
  }

  /**
   * Get available website components
   * @returns Observable of available components
   */
  getAvailableComponents(): Observable<ComponentsResponse> {
    return this.http.get<ComponentsResponse>(`${this.baseUrl}/components`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Handle HTTP errors
   * @param error The HTTP error response
   * @returns Observable error
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Server-side error
      if (error.error && typeof error.error === 'object') {
        const apiError = error.error as ApiErrorResponse;
        errorMessage = apiError.message || `Server Error: ${error.status} ${error.statusText}`;
      } else {
        errorMessage = `Server Error: ${error.status} ${error.statusText}`;
      }
    }

    console.error('AI Website Service Error:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}
