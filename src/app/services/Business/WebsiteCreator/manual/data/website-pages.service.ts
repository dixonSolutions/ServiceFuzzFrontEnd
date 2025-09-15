import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DataSvrService } from '../../../../Other/data-svr.service';
import {
  EnhancedWebsitePage,
  CreateWebsitePageDto,
  UpdateWebsitePageDto,
  WebsitePageListResponse,
  ComponentListResponse
} from '../../../../../models/workspace.models';

@Injectable({
  providedIn: 'root'
})
export class WebsitePagesService {
  private readonly apiBaseUrl = 'https://servicefuzzapi-atf8b4dqawc8dsa9.australiaeast-01.azurewebsites.net';

  constructor(
    private http: HttpClient,
    private dataSvr: DataSvrService
  ) {}

  /**
   * Get all pages for workspace
   */
  getPages(workspaceId: string): Observable<WebsitePageListResponse> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

        return this.http.get<WebsitePageListResponse>(
          `${this.apiBaseUrl}/api/website-pages/workspace/${workspaceId}`,
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
   * Create new page
   */
  createPage(workspaceId: string, page: Partial<CreateWebsitePageDto>): Observable<EnhancedWebsitePage> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    const pageDto: CreateWebsitePageDto = {
      workspaceId,
      pageName: page.pageName || 'New Page',
      route: page.route || '/new-page',
      title: page.title,
      metaDescription: page.metaDescription,
      customCSS: page.customCSS,
      customJS: page.customJS,
      isHomePage: page.isHomePage || false
    };

        return this.http.post<EnhancedWebsitePage>(
          `${this.apiBaseUrl}/api/website-pages/workspace/${workspaceId}`,
      pageDto,
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
   * Update page
   */
  updatePage(pageId: string, page: Partial<UpdateWebsitePageDto>): Observable<EnhancedWebsitePage> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

        return this.http.put<EnhancedWebsitePage>(
          `${this.apiBaseUrl}/api/business-website/pages/${pageId}`,
      page,
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
   * Delete page and all its components
   */
  deletePage(pageId: string): Observable<{ success: boolean }> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

        return this.http.delete<{ success: boolean }>(
          `${this.apiBaseUrl}/api/business-website/pages/${pageId}`,
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
   * Get all components for a page
   */
  getPageComponents(pageId: string): Observable<ComponentListResponse> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

        return this.http.get<ComponentListResponse>(
          `${this.apiBaseUrl}/api/business-website/pages/${pageId}/components`,
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
   * Error handling
   */
  private handleError = (error: any): Observable<never> => {
    console.error('Website Pages Service Error:', error);
    throw error;
  }
}
