import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { catchError, tap, map, shareReplay } from 'rxjs/operators';
import { DataSvrService } from '../../../../Other/data-svr.service';
import {
  WebsiteFile,
  CreateWebsiteFileDto,
  UpdateWebsiteFileDto,
  BulkFileUpdate,
  BulkSaveRequest,
  BulkSaveResponse,
  PreviewRequest,
  PreviewResponse
} from '../../../../../models/workspace.models';

interface LightFileChange {
  fileId: string;
  oldString: string;
  newString: string;
  lineNumber?: number; // Optional line hint for faster processing
}

interface LightUpdateResponse {
  success: boolean;
  fileId: string;
  fileName: string;
  updatedAt: string;
}

interface CachedWorkspaceData {
  files: WebsiteFile[];
  lastUpdated: number;
  version: number;
}

interface CacheConfig {
  memoryTTL: number; // Time to live in memory (milliseconds)
  browserTTL: number; // Time to live in browser storage (milliseconds)
  maxCacheSize: number; // Maximum number of workspaces to cache
}

@Injectable({
  providedIn: 'root'
})
export class WebsiteFilesService {
  private readonly apiBaseUrl = 'https://servicefuzzapi-atf8b4dqawc8dsa9.australiaeast-01.azurewebsites.net';
  
  // Cache configuration
  private readonly cacheConfig: CacheConfig = {
    memoryTTL: 5 * 60 * 1000, // 5 minutes
    browserTTL: 30 * 60 * 1000, // 30 minutes
    maxCacheSize: 10 // Cache up to 10 workspaces
  };

  // Memory cache
  private memoryCache = new Map<string, CachedWorkspaceData>();
  
  // Cache subjects for reactive updates
  private cacheSubjects = new Map<string, BehaviorSubject<WebsiteFile[]>>();
  
  // Pending requests to avoid duplicate API calls
  private pendingRequests = new Map<string, Observable<WebsiteFile[]>>();

  constructor(
    private http: HttpClient,
    private dataSvr: DataSvrService
  ) {
    this.initializeCache();
  }

  // ===================== CACHE MANAGEMENT =====================

  /**
   * Initialize cache system
   */
  private initializeCache(): void {
    // Load cached data from browser storage on startup
    this.loadFromBrowserCache();
    
    // Clean up expired cache entries periodically
    setInterval(() => this.cleanupExpiredCache(), 60000); // Every minute
    
    console.log('🗄️ WebsiteFilesService cache initialized');
  }

  /**
   * Load cached data from browser storage
   */
  private loadFromBrowserCache(): void {
    try {
      const cacheKeys = Object.keys(localStorage).filter(key => key.startsWith('sf_workspace_'));
      
      cacheKeys.forEach(key => {
        const workspaceId = key.replace('sf_workspace_', '');
        const cachedData = localStorage.getItem(key);
        
        if (cachedData) {
          const parsed: CachedWorkspaceData = JSON.parse(cachedData);
          const now = Date.now();
          
          // Check if cache is still valid
          if (now - parsed.lastUpdated < this.cacheConfig.browserTTL) {
            this.memoryCache.set(workspaceId, parsed);
            this.getCacheSubject(workspaceId).next(parsed.files);
            console.log(`📦 Loaded workspace ${workspaceId} from browser cache`);
          } else {
            // Remove expired cache
            localStorage.removeItem(key);
            console.log(`🗑️ Removed expired cache for workspace ${workspaceId}`);
          }
        }
      });
    } catch (error) {
      console.error('❌ Error loading from browser cache:', error);
    }
  }

  /**
   * Save data to browser storage
   */
  private saveToBrowserCache(workspaceId: string, data: CachedWorkspaceData): void {
    try {
      const key = `sf_workspace_${workspaceId}`;
      localStorage.setItem(key, JSON.stringify(data));
      console.log(`💾 Saved workspace ${workspaceId} to browser cache`);
    } catch (error) {
      console.error('❌ Error saving to browser cache:', error);
      // If localStorage is full, try to clear old entries
      this.clearOldCacheEntries();
    }
  }

  /**
   * Get or create cache subject for workspace
   */
  private getCacheSubject(workspaceId: string): BehaviorSubject<WebsiteFile[]> {
    if (!this.cacheSubjects.has(workspaceId)) {
      this.cacheSubjects.set(workspaceId, new BehaviorSubject<WebsiteFile[]>([]));
    }
    return this.cacheSubjects.get(workspaceId)!;
  }

  /**
   * Check if cache is valid for workspace
   */
  private isCacheValid(workspaceId: string): boolean {
    const cached = this.memoryCache.get(workspaceId);
    if (!cached) return false;
    
    const now = Date.now();
    return (now - cached.lastUpdated) < this.cacheConfig.memoryTTL;
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    
    // Clean memory cache
    for (const [workspaceId, data] of this.memoryCache.entries()) {
      if (now - data.lastUpdated > this.cacheConfig.memoryTTL) {
        this.memoryCache.delete(workspaceId);
        console.log(`🧹 Cleaned expired memory cache for workspace ${workspaceId}`);
      }
    }
    
    // Clean browser cache
    const cacheKeys = Object.keys(localStorage).filter(key => key.startsWith('sf_workspace_'));
    cacheKeys.forEach(key => {
      try {
        const cachedData = localStorage.getItem(key);
        if (cachedData) {
          const parsed: CachedWorkspaceData = JSON.parse(cachedData);
          if (now - parsed.lastUpdated > this.cacheConfig.browserTTL) {
            localStorage.removeItem(key);
            const workspaceId = key.replace('sf_workspace_', '');
            console.log(`🧹 Cleaned expired browser cache for workspace ${workspaceId}`);
          }
        }
      } catch (error) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Clear old cache entries when storage is full
   */
  private clearOldCacheEntries(): void {
    const cacheKeys = Object.keys(localStorage)
      .filter(key => key.startsWith('sf_workspace_'))
      .map(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          return { key, lastUpdated: data.lastUpdated || 0 };
        } catch {
          return { key, lastUpdated: 0 };
        }
      })
      .sort((a, b) => a.lastUpdated - b.lastUpdated);

    // Remove oldest entries
    const toRemove = Math.ceil(cacheKeys.length * 0.3); // Remove 30% of entries
    for (let i = 0; i < toRemove && i < cacheKeys.length; i++) {
      localStorage.removeItem(cacheKeys[i].key);
    }
    
    console.log(`🧹 Cleared ${toRemove} old cache entries to free up space`);
  }

  /**
   * Invalidate cache for workspace
   */
  public invalidateCache(workspaceId: string): void {
    this.memoryCache.delete(workspaceId);
    localStorage.removeItem(`sf_workspace_${workspaceId}`);
    this.pendingRequests.delete(workspaceId);
    console.log(`🗑️ Invalidated cache for workspace ${workspaceId}`);
  }

  /**
   * Clear all cache
   */
  public clearAllCache(): void {
    this.memoryCache.clear();
    this.cacheSubjects.clear();
    this.pendingRequests.clear();
    
    // Clear browser storage
    const cacheKeys = Object.keys(localStorage).filter(key => key.startsWith('sf_workspace_'));
    cacheKeys.forEach(key => localStorage.removeItem(key));
    
    console.log('🗑️ Cleared all cache');
  }

  // ===================== API METHODS WITH CACHING =====================

  /**
   * Get all files for workspace (with caching)
   */
  getFiles(workspaceId: string): Observable<WebsiteFile[]> {
    // Check if we have valid cache
    if (this.isCacheValid(workspaceId)) {
      const cached = this.memoryCache.get(workspaceId)!;
      console.log(`⚡ Serving files for workspace ${workspaceId} from memory cache`);
      return of(cached.files);
    }

    // Check if there's already a pending request
    if (this.pendingRequests.has(workspaceId)) {
      console.log(`⏳ Reusing pending request for workspace ${workspaceId}`);
      return this.pendingRequests.get(workspaceId)!;
    }

    // Make API request
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    console.log(`🌐 Fetching files for workspace ${workspaceId} from API`);

    const request = this.http.get<WebsiteFile[]>(
      `${this.apiBaseUrl}/api/WebsiteFiles/workspace/${workspaceId}`,
      {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      }
    ).pipe(
      tap(files => {
        // Cache the response
        const cacheData: CachedWorkspaceData = {
          files,
          lastUpdated: Date.now(),
          version: 1
        };
        
        this.memoryCache.set(workspaceId, cacheData);
        this.saveToBrowserCache(workspaceId, cacheData);
        
        // Update reactive subject
        this.getCacheSubject(workspaceId).next(files);
        
        console.log(`💾 Cached ${files.length} files for workspace ${workspaceId}`);
      }),
      catchError(this.handleError),
      shareReplay(1) // Share the result with multiple subscribers
    );

    // Store pending request
    this.pendingRequests.set(workspaceId, request);
    
    // Clean up pending request when complete
    request.subscribe({
      complete: () => this.pendingRequests.delete(workspaceId),
      error: () => this.pendingRequests.delete(workspaceId)
    });

    return request;
  }

  /**
   * Get files as reactive stream (always returns cached data if available)
   */
  getFiles$(workspaceId: string): Observable<WebsiteFile[]> {
    // First, trigger a load if not cached
    if (!this.isCacheValid(workspaceId)) {
      this.getFiles(workspaceId).subscribe(); // Trigger load but don't wait
    }
    
    return this.getCacheSubject(workspaceId).asObservable();
  }

  /**
   * Create new file (invalidates cache)
   */
  createFile(workspaceId: string, file: {
    fileName: string;
    fileType: 'html' | 'css' | 'js' | 'json';
    content: string;
  }): Observable<WebsiteFile> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    const fileDto: CreateWebsiteFileDto = {
      workspaceId,
      fileName: file.fileName,
      fileType: file.fileType,
      content: file.content
    };

    return this.http.post<WebsiteFile>(
      `${this.apiBaseUrl}/api/WebsiteFiles/workspace/${workspaceId}`,
      fileDto,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        }
      }
    ).pipe(
      tap(newFile => {
        // Update cache with new file
        this.updateCacheWithNewFile(workspaceId, newFile);
        console.log(`✅ Created file ${newFile.fileName} and updated cache`);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Update file content (updates cache)
   */
  updateFile(fileId: string, content: string): Observable<WebsiteFile> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    const updates: UpdateWebsiteFileDto = { content };

    return this.http.put<WebsiteFile>(
      `${this.apiBaseUrl}/api/WebsiteFiles/${fileId}`,
      updates,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        }
      }
    ).pipe(
      tap(updatedFile => {
        // Update cache with modified file
        this.updateCacheWithModifiedFile(updatedFile);
        console.log(`✅ Updated file ${updatedFile.fileName} and refreshed cache`);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * LIGHT UPDATE: Update file with just the changes (old_string -> new_string)
   * This is much faster and more efficient than sending the entire file content
   */
  updateFileLight(change: LightFileChange): Observable<LightUpdateResponse> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    console.log(`⚡ Light update for file ${change.fileId}:`, {
      oldLength: change.oldString.length,
      newLength: change.newString.length,
      lineHint: change.lineNumber
    });

    return this.http.patch<LightUpdateResponse>(
      `${this.apiBaseUrl}/api/WebsiteFiles/${change.fileId}/light-update`,
      {
        oldString: change.oldString,
        newString: change.newString,
        lineNumber: change.lineNumber
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        }
      }
    ).pipe(
      tap(response => {
        if (response.success) {
          // Update cache by applying the same change locally
          this.applyCacheChange(change);
          console.log(`⚡ Light update successful for ${response.fileName}`);
        }
      }),
      catchError(error => {
        console.warn('⚠️ Light update failed, falling back to full update');
        // If light update fails, we could fall back to full update
        return this.handleError(error);
      })
    );
  }

  /**
   * Apply light change to cached file content
   */
  private applyCacheChange(change: LightFileChange): void {
    for (const [workspaceId, cached] of this.memoryCache.entries()) {
      const fileIndex = cached.files.findIndex(f => f.id === change.fileId);
      if (fileIndex !== -1) {
        const file = cached.files[fileIndex];
        
        // Apply the string replacement
        const updatedContent = file.content.replace(change.oldString, change.newString);
        
        if (updatedContent !== file.content) {
          // Update the cached file
          cached.files[fileIndex] = {
            ...file,
            content: updatedContent,
            updatedAt: new Date()
          };
          
          cached.lastUpdated = Date.now();
          cached.version++;
          
          // Update browser cache and notify subscribers
          this.saveToBrowserCache(workspaceId, cached);
          this.getCacheSubject(workspaceId).next(cached.files);
          
          console.log(`💾 Applied light change to cached file ${file.fileName}`);
        }
        break;
      }
    }
  }

  /**
   * Delete file (removes from cache)
   */
  deleteFile(fileId: string): Observable<{ success: boolean }> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    return this.http.delete<{ success: boolean }>(
      `${this.apiBaseUrl}/api/WebsiteFiles/${fileId}`,
      {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      }
    ).pipe(
      tap(result => {
        if (result.success) {
          // Remove file from all workspace caches
          this.removeFileFromCache(fileId);
          console.log(`✅ Deleted file ${fileId} and updated cache`);
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Bulk save multiple files at once (invalidates cache)
   */
  bulkSaveFiles(workspaceId: string, fileUpdates: BulkFileUpdate[]): Observable<BulkSaveResponse> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    const request: BulkSaveRequest = { files: fileUpdates };

    return this.http.post<BulkSaveResponse>(
      `${this.apiBaseUrl}/api/WebsiteFiles/workspace/${workspaceId}/bulk-save`,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        }
      }
    ).pipe(
      tap(response => {
        // Invalidate cache after bulk save - easier than trying to update individual files
        this.invalidateCache(workspaceId);
        console.log(`✅ Bulk saved ${fileUpdates.length} files and invalidated cache for workspace ${workspaceId}`);
      }),
      catchError(this.handleError)
    );
  }

  // ===================== CACHE UPDATE HELPERS =====================

  /**
   * Update cache with new file
   */
  private updateCacheWithNewFile(workspaceId: string, newFile: WebsiteFile): void {
    const cached = this.memoryCache.get(workspaceId);
    if (cached) {
      cached.files.push(newFile);
      cached.lastUpdated = Date.now();
      cached.version++;
      
      this.saveToBrowserCache(workspaceId, cached);
      this.getCacheSubject(workspaceId).next(cached.files);
    }
  }

  /**
   * Update cache with modified file
   */
  private updateCacheWithModifiedFile(updatedFile: WebsiteFile): void {
    // Find which workspace this file belongs to
    for (const [workspaceId, cached] of this.memoryCache.entries()) {
      const fileIndex = cached.files.findIndex(f => f.id === updatedFile.id);
      if (fileIndex !== -1) {
        cached.files[fileIndex] = updatedFile;
        cached.lastUpdated = Date.now();
        cached.version++;
        
        this.saveToBrowserCache(workspaceId, cached);
        this.getCacheSubject(workspaceId).next(cached.files);
        break;
      }
    }
  }

  /**
   * Remove file from cache
   */
  private removeFileFromCache(fileId: string): void {
    for (const [workspaceId, cached] of this.memoryCache.entries()) {
      const fileIndex = cached.files.findIndex(f => f.id === fileId);
      if (fileIndex !== -1) {
        cached.files.splice(fileIndex, 1);
        cached.lastUpdated = Date.now();
        cached.version++;
        
        this.saveToBrowserCache(workspaceId, cached);
        this.getCacheSubject(workspaceId).next(cached.files);
        break;
      }
    }
  }

  // ===================== CACHE STATUS METHODS =====================

  /**
   * Get cache status for workspace
   */
  public getCacheStatus(workspaceId: string): {
    hasMemoryCache: boolean;
    hasBrowserCache: boolean;
    isValid: boolean;
    fileCount: number;
    lastUpdated: Date | null;
  } {
    const memoryCache = this.memoryCache.get(workspaceId);
    const browserCacheKey = `sf_workspace_${workspaceId}`;
    const hasBrowserCache = localStorage.getItem(browserCacheKey) !== null;
    
    return {
      hasMemoryCache: !!memoryCache,
      hasBrowserCache,
      isValid: this.isCacheValid(workspaceId),
      fileCount: memoryCache?.files.length || 0,
      lastUpdated: memoryCache ? new Date(memoryCache.lastUpdated) : null
    };
  }

  /**
   * Force refresh cache for workspace
   */
  public forceRefresh(workspaceId: string): Observable<WebsiteFile[]> {
    this.invalidateCache(workspaceId);
    return this.getFiles(workspaceId);
  }

  /**
   * NEW: Generate live preview HTML combining all files
   */
  generatePreview(workspaceId: string, pageRoute: string = '/'): Observable<PreviewResponse> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    const queryParams = pageRoute !== '/' ? `?pageRoute=${encodeURIComponent(pageRoute)}` : '';

    return this.http.get<PreviewResponse>(
      `${this.apiBaseUrl}/api/WebsiteFiles/workspace/${workspaceId}/preview${queryParams}`,
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
   * Utility: Create default file structure for new workspace
   */
  createDefaultFileStructure(workspaceId: string): Observable<BulkSaveResponse> {
    const defaultFiles: BulkFileUpdate[] = [
      {
        fileName: 'index.html',
        fileType: 'html',
        content: this.getDefaultHtmlTemplate()
      },
      {
        fileName: 'css/styles.css',
        fileType: 'css',
        content: this.getDefaultCssTemplate()
      },
      {
        fileName: 'js/script.js',
        fileType: 'js',
        content: this.getDefaultJsTemplate()
      },
      {
        fileName: 'assets/README.md',
        fileType: 'md',
        content: this.getDefaultReadmeTemplate()
      },
      {
        fileName: 'assets/images/.gitkeep',
        fileType: 'gitkeep',
        content: '# This file keeps the images directory in version control'
      },
      {
        fileName: 'assets/fonts/.gitkeep',
        fileType: 'gitkeep',
        content: '# This file keeps the fonts directory in version control'
      }
    ];

    return this.bulkSaveFiles(workspaceId, defaultFiles);
  }

  /**
   * Get default HTML template
   */
  private getDefaultHtmlTemplate(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{page.title}}</title>
    <meta name="description" content="{{page.metaDescription}}" />
    <link rel="stylesheet" href="css/styles.css">
    {{global.css}}
    {{page.css}}
</head>
<body>
    <header class="site-header">
        <div class="container">
            <nav class="main-nav">
                <div class="logo">
                    <h1>Your Website</h1>
                </div>
                <ul class="nav-menu">
                    <li><a href="/">Home</a></li>
                    <li><a href="/about">About</a></li>
                    <li><a href="/contact">Contact</a></li>
                </ul>
            </nav>
        </div>
    </header>

    <main class="main-content">
        <div class="container">
            {{components}}
        </div>
    </main>

    <footer class="site-footer">
        <div class="container">
            <p>&copy; 2024 Your Website. All rights reserved.</p>
        </div>
    </footer>

    <script src="js/script.js"></script>
    {{global.js}}
    {{page.js}}
</body>
</html>`;
  }

  /**
   * Get default CSS template
   */
  private getDefaultCssTemplate(): string {
    return `/* Reset & Base Styles */
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
.container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }

/* Header & Navigation */
.site-header { background: #fff; box-shadow: 0 2px 10px rgba(0,0,0,0.1); position: sticky; top: 0; z-index: 1000; }
.main-nav { display: flex; justify-content: space-between; align-items: center; padding: 1rem 0; }
.logo h1 { color: #2c3e50; font-size: 1.8rem; font-weight: 700; }
.nav-menu { display: flex; list-style: none; gap: 2rem; }
.nav-menu a { text-decoration: none; color: #333; font-weight: 500; transition: color 0.3s ease; }
.nav-menu a:hover { color: #3498db; }

/* Main Content */
.main-content { min-height: calc(100vh - 200px); padding: 2rem 0; }

/* Components */
.component { margin-bottom: 2rem; }
.hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 4rem 0; text-align: center; border-radius: 10px; }
.hero h1 { font-size: 3rem; margin-bottom: 1rem; font-weight: 700; }
.hero p { font-size: 1.2rem; margin-bottom: 2rem; opacity: 0.9; }
.hero .btn { display: inline-block; padding: 12px 30px; background: rgba(255,255,255,0.2); color: white; text-decoration: none; border: 2px solid white; border-radius: 25px; transition: all 0.3s ease; }
.hero .btn:hover { background: white; color: #667eea; }

/* Footer */
.site-footer { background: #2c3e50; color: white; text-align: center; padding: 2rem 0; margin-top: 3rem; }

/* Responsive */
@media (max-width: 768px) {
    .main-nav { flex-direction: column; gap: 1rem; }
    .nav-menu { gap: 1rem; }
    .hero h1 { font-size: 2rem; }
    .container { padding: 0 15px; }
}`;
  }

  /**
   * Get default JavaScript template
   */
  private getDefaultJsTemplate(): string {
    return `document.addEventListener('DOMContentLoaded', function() {
    console.log('Website loaded successfully');
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
    
    // Form submission handling
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Form submitted:', new FormData(this));
            alert('Thank you for your message!');
            this.reset();
        });
    });
});`;
  }

  /**
   * Get default README template
   */
  private getDefaultReadmeTemplate(): string {
    return `# Website Assets

This directory contains all the assets for your website.

## Supported File Types
- Images: JPG, PNG, GIF, SVG, WebP (max 10MB)
- Fonts: WOFF, WOFF2, TTF, OTF (max 10MB)

## Usage
Upload assets through the ServiceFuzz website builder interface.
Assets are automatically optimized and served through our CDN.`;
  }

  /**
   * Error handling
   */
  private handleError = (error: any): Observable<never> => {
    console.error('Website Files Service Error:', error);
    throw error;
  }
}
