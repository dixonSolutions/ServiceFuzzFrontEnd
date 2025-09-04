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
