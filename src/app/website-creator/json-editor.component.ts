import { Component, OnInit, OnDestroy, Output, EventEmitter, Input } from '@angular/core';
import { WebsiteBuilderService } from '../services/website-builder';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-json-editor',
  standalone: false,
  templateUrl: './json-editor.component.html',
  styleUrls: ['./json-editor.component.css']
})
export class JsonEditorComponent implements OnInit, OnDestroy {
  @Output() close = new EventEmitter<void>();
  @Output() builtInNavPropertiesChange = new EventEmitter<{ [key: string]: any }>();
  @Input() builtInNavProperties: { [key: string]: any } = {};
  
  private destroy$ = new Subject<void>();
  
  jsonContent: string = '';
  isValidJson: boolean = true;
  currentPage: string = 'Home';
  pages: any[] = [];
  htmlPreview: string = '';
  safeHtmlPreview: SafeHtml = '';
  
  // Add new properties for handling large data
  showFullJson: boolean = false;
  sanitizedJsonContent: string = '';
  originalDataSize: number = 0;
  sanitizedDataSize: number = 0;
  binaryFieldsRemoved: string[] = [];
  
  constructor(
    private websiteBuilder: WebsiteBuilderService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    // Subscribe to pages
    this.websiteBuilder.pages$.pipe(takeUntil(this.destroy$)).subscribe(pages => {
      this.pages = pages;
      this.updateJsonContent();
      this.generateHtmlPreview();
    });

    // Subscribe to current page
    this.websiteBuilder.currentPageId$.pipe(takeUntil(this.destroy$)).subscribe(pageId => {
      const page = this.pages.find(p => p.id === pageId);
      this.currentPage = page?.name || 'Home';
      this.updateJsonContent();
      this.generateHtmlPreview();
    });

    // Initial load
    this.updateJsonContent();
    this.generateHtmlPreview();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Store both versions of JSON
  private fullJsonContent: string = '';

  updateJsonContent() {
    try {
      const websiteData = {
        id: this.generateId(),
        name: "New Website",
        builtInNavigation: this.builtInNavProperties,
        pages: this.pages.map(page => ({
          id: page.id,
          name: page.name,
          route: page.route,
          components: page.components.map((comp: any) => ({
            id: comp.id,
            type: comp.type,
            name: this.getComponentName(comp.type),
            icon: this.getComponentIcon(comp.type),
            category: this.getComponentCategory(comp.type),
            properties: comp.parameters
          }))
        }))
      };
      
      // Create full JSON
      this.fullJsonContent = JSON.stringify(websiteData, null, 2);
      this.originalDataSize = new Blob([this.fullJsonContent]).size;
      
      // Create sanitized version
      const sanitizedData = this.sanitizeDataForDisplay(websiteData);
      this.sanitizedJsonContent = JSON.stringify(sanitizedData, null, 2);
      this.sanitizedDataSize = new Blob([this.sanitizedJsonContent]).size;
      
      // Use sanitized version by default if original is too large
      if (this.originalDataSize > 100000) { // 100KB threshold
        this.jsonContent = this.sanitizedJsonContent;
        this.showFullJson = false;
      } else {
        this.jsonContent = this.fullJsonContent;
        this.showFullJson = true;
      }
      
      this.isValidJson = true;
    } catch (error) {
      this.isValidJson = false;
    }
  }

  onJsonChange(event: any) {
    this.jsonContent = event.target.value;
    
    // Update the appropriate stored version based on current view
    if (this.showFullJson) {
      this.fullJsonContent = this.jsonContent;
    } else {
      this.sanitizedJsonContent = this.jsonContent;
    }
    
    this.validateAndApplyJson();
  }

  validateAndApplyJson() {
    try {
      const parsed = JSON.parse(this.jsonContent);
      this.isValidJson = true;
      
      // If the JSON contains built-in navigation properties, emit them to the parent
      if (parsed.builtInNavigation) {
        this.builtInNavProperties = parsed.builtInNavigation;
        this.builtInNavPropertiesChange.emit(parsed.builtInNavigation);
      }
      
      // Apply changes back to the service if needed
      this.generateHtmlPreview();
    } catch (error) {
      this.isValidJson = false;
    }
  }

  generateHtmlPreview() {
    const currentPageData = this.pages.find(p => p.name === this.currentPage);
    if (!currentPageData) {
      this.htmlPreview = '<p>No page selected</p>';
      this.safeHtmlPreview = this.sanitizer.bypassSecurityTrustHtml(this.htmlPreview);
      return;
    }

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.sanitizeText(currentPageData.name)} - New Website</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
    .navigation { background: #ffffff; padding: 12px 24px; border-bottom: 1px solid #ddd; }
    .nav-brand { font-weight: bold; color: #333; }
    .nav-menu { display: flex; gap: 20px; margin-top: 8px; }
    .nav-item { color: #666; text-decoration: none; }
    .nav-item.active { color: #007bff; }
  </style>
</head>
<body>
  <div class="navigation">
    <div class="nav-brand">
      ${this.builtInNavProperties['logoType'] === 'image' && this.builtInNavProperties['logoImage'] ? 
        `<img src="${this.sanitizeText(this.builtInNavProperties['logoImage'])}" alt="Logo" style="height: 24px; margin-right: 8px; vertical-align: middle;">` : 
        ''}
      ${this.sanitizeText(this.builtInNavProperties['logoText'] || 'Your Business')}
    </div>
    <div class="nav-menu">`;

    // Add navigation menu
    this.pages.forEach(page => {
      const isActive = page.name === this.currentPage ? ' class="nav-item active"' : ' class="nav-item"';
      html += `      <a href="${this.sanitizeText(page.route)}"${isActive}>${this.sanitizeText(page.name)}</a>\n`;
    });

    html += `    </div>
  </div>
  <main>`;

    // Add page components
    if (currentPageData.components && currentPageData.components.length > 0) {
      currentPageData.components.forEach((component: any) => {
        html += this.generateComponentHtml(component);
      });
    } else {
      html += `    <div style="padding: 40px; text-align: center; color: #666;">
      <h2>Empty Page</h2>
      <p>No components added to this page yet.</p>
    </div>`;
    }

    html += `  </main>
</body>
</html>`;

    this.htmlPreview = html;
    this.safeHtmlPreview = this.sanitizer.bypassSecurityTrustHtml(html);
  }

  generateComponentHtml(component: any): string {
    const params = component.parameters || component.properties || {};
    
    switch (component.type) {
      case 'hero-section':
        return `    <section style="padding: 60px 24px; background: ${this.sanitizeText(params.backgroundColor || '#f8f9fa')}; color: ${this.sanitizeText(params.textColor || '#333')}; text-align: center;">
      <h1>${this.sanitizeText(params.title || 'Welcome to Our Website')}</h1>
      <p>${this.sanitizeText(params.subtitle || 'Discover amazing services and solutions')}</p>
      <button style="padding: 12px 24px; background: ${this.sanitizeText(params.ctaButtonColor || '#007bff')}; color: white; border: none; border-radius: 6px;">
        ${this.sanitizeText(params.ctaText || 'Get Started')}
      </button>
    </section>\n`;
      
      case 'text-block':
        return `    <div style="padding: 24px; text-align: ${this.sanitizeText(params.alignment || 'left')};">
      ${params.title ? `<h3>${this.sanitizeText(params.title)}</h3>` : ''}
      <p style="color: ${this.sanitizeText(params.textColor || '#666')};">${this.sanitizeText(params.content || 'Your text content goes here...')}</p>
    </div>\n`;
      
      case 'top-navigation':
        return `    <!-- Top Navigation Component -->\n`;
      
      default:
        return `    <div style="padding: 20px; background: #f8f9fa; border: 1px dashed #ddd; margin: 10px;">
      <strong>${this.sanitizeText(this.getComponentName(component.type))}</strong>
      <br><small>Component ID: ${this.sanitizeText(component.id)}</small>
    </div>\n`;
    }
  }

  private sanitizeText(text: string): string {
    if (!text) return '';
    return text.toString().replace(/[<>&"']/g, (match) => {
      const escapeMap: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&#x27;'
      };
      return escapeMap[match];
    });
  }

  onPageSelect(page: any) {
    this.currentPage = page.name;
    this.websiteBuilder.setCurrentPage(page.id);
  }

  addPage() {
    const name = prompt('Enter page name:');
    const route = prompt('Enter page route (e.g., /new-page):');
    
    if (name && route) {
      this.websiteBuilder.addPage(name, route);
    }
  }

  applyChanges() {
    if (this.isValidJson) {
      try {
        const parsed = JSON.parse(this.jsonContent);
        console.log('Applying JSON changes:', parsed);
        
        // Update built-in navigation properties if present
        if (parsed.builtInNavigation) {
          this.builtInNavProperties = { ...parsed.builtInNavigation };
          this.builtInNavPropertiesChange.emit(this.builtInNavProperties);
        }
        
        // Apply changes to the website builder service
        if (parsed.pages && Array.isArray(parsed.pages)) {
          // Update pages data in the service
          this.updateWebsitePages(parsed.pages);
        }
        
        // Update the local pages data
        this.pages = parsed.pages || this.pages;
        
        // Refresh the preview
        this.generateHtmlPreview();
        
        alert('Changes applied successfully!');
      } catch (error) {
        console.error('Error applying changes:', error);
        alert('Error applying changes: ' + error);
      }
    } else {
      alert('Please fix JSON syntax errors before applying changes.');
    }
  }

  private updateWebsitePages(pages: any[]) {
    // Update pages in the website builder service
    try {
      pages.forEach(page => {
        const existingPage = this.websiteBuilder.getCurrentPage();
        if (existingPage && existingPage.id === page.id) {
          // Update current page components
          if (page.components) {
            existingPage.components = page.components.map((comp: any) => ({
              id: comp.id,
              type: comp.type,
              x: comp.x || 0,
              y: comp.y || 0,
              width: comp.width || 300,
              height: comp.height || 100,
              parameters: comp.properties || comp.parameters || {},
              zIndex: comp.zIndex || 1
            }));
          }
        }
      });
    } catch (error) {
      console.error('Error updating website pages:', error);
    }
  }

  refreshPreview() {
    this.generateHtmlPreview();
  }

  closeEditor() {
    this.close.emit();
  }

  private generateId(): string {
    return 'id_' + Math.random().toString(36).substr(2, 9);
  }

  private getComponentName(type: string): string {
    const names: { [key: string]: string } = {
      'top-navigation': 'Top Navigation',
      'hero-section': 'Hero Section',
      'text-block': 'Text Block',
      'image': 'Image',
      'button': 'Button',
      'footer': 'Footer'
    };
    return names[type] || type;
  }

  private getComponentIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'top-navigation': '🧭',
      'hero-section': '⭐',
      'text-block': '📝',
      'image': '🖼️',
      'button': '🔘',
      'footer': '📄'
    };
    return icons[type] || '📦';
  }

  private getComponentCategory(type: string): string {
    const categories: { [key: string]: string } = {
      'top-navigation': 'ui',
      'hero-section': 'ui',
      'text-block': 'ui',
      'image': 'ui',
      'button': 'ui',
      'footer': 'ui'
    };
    return categories[type] || 'ui';
  }

  // Utility methods for handling large data
  private sanitizeDataForDisplay(data: any): any {
    this.binaryFieldsRemoved = [];
    return this.recursiveSanitize(data, '');
  }

  private recursiveSanitize(obj: any, path: string): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      // Check if it's likely base64 image data
      if (this.isBase64ImageData(obj)) {
        const fieldPath = path || 'root';
        this.binaryFieldsRemoved.push(fieldPath);
        return `[BINARY_DATA_REMOVED: ${this.formatFileSize(obj.length)} base64 data]`;
      }
      // Check if it's a very long string (potential binary data)
      if (obj.length > 10000) {
        const fieldPath = path || 'root';
        this.binaryFieldsRemoved.push(fieldPath);
        return `[LARGE_DATA_REMOVED: ${this.formatFileSize(obj.length)} string data]`;
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item, index) => this.recursiveSanitize(item, `${path}[${index}]`));
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        sanitized[key] = this.recursiveSanitize(value, currentPath);
      }
      return sanitized;
    }

    return obj;
  }

  private isBase64ImageData(str: string): boolean {
    // Check if string looks like base64 image data
    if (str.length < 100) return false; // Too short to be meaningful image data
    
    // Check for data URL pattern
    if (str.startsWith('data:image/')) return true;
    
    // Check for pure base64 pattern (common prefixes/suffixes for images)
    const base64Pattern = /^[A-Za-z0-9+/]+={0,2}$/;
    if (str.length > 1000 && base64Pattern.test(str)) {
      // Additional check for common image file headers in base64
      const imageHeaders = ['/9j/', 'iVBORw0KGgo', 'R0lGODlh', 'UklGR']; // JPEG, PNG, GIF, WebP
      return imageHeaders.some(header => str.startsWith(header));
    }
    
    return false;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  toggleJsonView(): void {
    this.showFullJson = !this.showFullJson;
    // Switch between stored versions
    if (this.showFullJson) {
      this.jsonContent = this.fullJsonContent;
    } else {
      this.jsonContent = this.sanitizedJsonContent;
    }
  }

  getDataSizeInfo(): string {
    if (this.originalDataSize > this.sanitizedDataSize) {
      const savedSize = this.originalDataSize - this.sanitizedDataSize;
      return `Showing sanitized version (${this.formatFileSize(this.sanitizedDataSize)}) - ${this.formatFileSize(savedSize)} of binary data hidden`;
    }
    return `Data size: ${this.formatFileSize(this.originalDataSize)}`;
  }
} 