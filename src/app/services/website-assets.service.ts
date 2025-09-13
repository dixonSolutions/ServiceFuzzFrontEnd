import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  WebsiteAsset,
  WebsiteAssetUpload,
  WebsiteAssetUpdate,
  WebsiteAssetResponse,
  WebsiteAssetListResponse,
  AssetUrlResponse
} from '../models/workspace.models';
import { DataSvrService } from './data-svr.service';

@Injectable({
  providedIn: 'root'
})
export class WebsiteAssetsService {
  private readonly apiBaseUrl = 'https://servicefuzzapi-atf8b4dqawc8dsa9.australiaeast-01.azurewebsites.net';

  constructor(private http: HttpClient, private dataSvr: DataSvrService) {}

  /**
   * Get all assets for workspace
   */
  getAssets(workspaceId: string): Observable<WebsiteAssetListResponse> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    return this.http.get<WebsiteAssetListResponse>(
      `${this.apiBaseUrl}/api/website-assets/workspace/${workspaceId}`,
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
   * Upload new asset (image or font file)
   * Supported: JPG, PNG, GIF, SVG, WebP, WOFF, WOFF2, TTF, OTF
   * Max size: 10MB
   */
  uploadAsset(workspaceId: string, file: File, altText?: string): Observable<WebsiteAssetResponse> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp',
      'font/woff', 'font/woff2', 'font/ttf', 'font/otf',
      'application/font-woff', 'application/font-woff2', 'application/x-font-ttf', 'application/x-font-otf'
    ];

    if (!allowedTypes.includes(file.type)) {
      return throwError(() => new Error(`Unsupported file type: ${file.type}. Supported types: JPG, PNG, GIF, SVG, WebP, WOFF, WOFF2, TTF, OTF`));
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      return throwError(() => new Error(`File size too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum allowed: 10MB`));
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('workspaceId', workspaceId);
    if (altText) {
      formData.append('altText', altText);
    }

    return this.http.post<WebsiteAssetResponse>(
      `${this.apiBaseUrl}/api/website-assets/workspace/${workspaceId}/upload`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
          // Don't set Content-Type for FormData, let browser set it with boundary
        }
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Update asset metadata (alt text)
   */
  updateAsset(assetId: string, updates: WebsiteAssetUpdate): Observable<{ success: boolean }> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    return this.http.put<{ success: boolean }>(
      `${this.apiBaseUrl}/api/business-website/assets/${assetId}`,
      updates,
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
   * Delete asset file and database record
   */
  deleteAsset(assetId: string): Observable<{ success: boolean }> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    return this.http.delete<{ success: boolean }>(
      `${this.apiBaseUrl}/api/business-website/assets/${assetId}`,
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
   * Download asset file
   */
  downloadAsset(assetId: string): Observable<Blob> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    return this.http.get(
      `${this.apiBaseUrl}/api/business-website/assets/${assetId}/download`,
      {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        },
        responseType: 'blob'
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get public URL for asset by filename
   */
  getAssetUrl(workspaceId: string, fileName: string): Observable<AssetUrlResponse> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    return this.http.get<AssetUrlResponse>(
      `${this.apiBaseUrl}/api/website-assets/workspace/${workspaceId}/url/${encodeURIComponent(fileName)}`,
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
   * Get direct asset URL for use in HTML/CSS
   */
  getDirectAssetUrl(assetId: string): string {
    return `${this.apiBaseUrl}/api/business-website/assets/${assetId}/download`;
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp',
      'font/woff', 'font/woff2', 'font/ttf', 'font/otf',
      'application/font-woff', 'application/font-woff2', 'application/x-font-ttf', 'application/x-font-otf'
    ];

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Unsupported file type: ${file.type}. Supported types: JPG, PNG, GIF, SVG, WebP, WOFF, WOFF2, TTF, OTF`
      };
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum allowed: 10MB`
      };
    }

    return { valid: true };
  }

  /**
   * Get file type category for UI display
   */
  getFileTypeCategory(contentType: string): 'image' | 'font' | 'unknown' {
    if (contentType.startsWith('image/')) {
      return 'image';
    }
    if (contentType.startsWith('font/') || contentType.includes('font')) {
      return 'font';
    }
    return 'unknown';
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      errorMessage = `Server Error: ${error.status} ${error.statusText || ''} - ${error.message}`;
    }
    console.error('WebsiteAssetsService Error:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}
