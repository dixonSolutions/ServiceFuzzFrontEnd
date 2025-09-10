import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DataSvrService } from './data-svr.service';
import {
  WebsiteFile,
  CreateWebsiteFileDto,
  UpdateWebsiteFileDto,
  WebsiteFileListResponse,
  BulkFileUpdate,
  BulkSaveRequest,
  BulkSaveResponse,
  PreviewRequest,
  PreviewResponse
} from '../models/workspace.models';

@Injectable({
  providedIn: 'root'
})
export class WebsiteFilesService {
  private readonly apiBaseUrl = 'https://servicefuzzapi-atf8b4dqawc8dsa9.australiaeast-01.azurewebsites.net';

  constructor(
    private http: HttpClient,
    private dataSvr: DataSvrService
  ) {}

  /**
   * Get all files for workspace
   */
  getFiles(workspaceId: string): Observable<WebsiteFileListResponse> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    return this.http.get<WebsiteFileListResponse>(
      `${this.apiBaseUrl}/api/business-website/workspaces/${workspaceId}/files`,
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
   * Create new file
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
      `${this.apiBaseUrl}/api/business-website/workspaces/${workspaceId}/files`,
      fileDto,
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
   * Update file content
   */
  updateFile(fileId: string, content: string): Observable<WebsiteFile> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    const updates: UpdateWebsiteFileDto = { content };

    return this.http.put<WebsiteFile>(
      `${this.apiBaseUrl}/api/business-website/files/${fileId}`,
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
   * Delete file
   */
  deleteFile(fileId: string): Observable<{ success: boolean }> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    return this.http.delete<{ success: boolean }>(
      `${this.apiBaseUrl}/api/business-website/files/${fileId}`,
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
   * NEW: Bulk save multiple files at once
   */
  bulkSaveFiles(workspaceId: string, fileUpdates: BulkFileUpdate[]): Observable<BulkSaveResponse> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    const request: BulkSaveRequest = { files: fileUpdates };

    return this.http.post<BulkSaveResponse>(
      `${this.apiBaseUrl}/api/business-website/workspaces/${workspaceId}/bulk-save`,
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
   * NEW: Generate live preview HTML combining all files
   */
  generatePreview(workspaceId: string, pageRoute: string = '/'): Observable<PreviewResponse> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    const queryParams = pageRoute !== '/' ? `?pageRoute=${encodeURIComponent(pageRoute)}` : '';

    return this.http.get<PreviewResponse>(
      `${this.apiBaseUrl}/api/websitefiles/workspace/${workspaceId}/preview${queryParams}`,
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
