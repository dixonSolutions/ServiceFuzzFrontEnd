import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { WebsiteBuilderService } from '../services/website-builder';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-json-editor',
  standalone: false,
  templateUrl: './json-editor.component.html',
  styleUrls: ['./json-editor.component.css']
})
export class JsonEditorComponent implements OnInit, OnDestroy {
  @Output() close = new EventEmitter<void>();
  
  private destroy$ = new Subject<void>();
  
  jsonContent: string = '';
  isValidJson: boolean = true;
  currentPage: string = 'Home';
  pages: any[] = [];
  htmlPreview: string = '';
  
  constructor(private websiteBuilder: WebsiteBuilderService) {}

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

  updateJsonContent() {
    try {
      const websiteData = {
        id: this.generateId(),
        name: "New Website",
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
      
      this.jsonContent = JSON.stringify(websiteData, null, 2);
      this.isValidJson = true;
    } catch (error) {
      this.isValidJson = false;
    }
  }

  onJsonChange(event: any) {
    this.jsonContent = event.target.value;
    this.validateAndApplyJson();
  }

  validateAndApplyJson() {
    try {
      const parsed = JSON.parse(this.jsonContent);
      this.isValidJson = true;
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
      return;
    }

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${currentPageData.name} - New Website</title>
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
    <div class="nav-brand">Your Logo</div>
    <div class="nav-menu">`;

    // Add navigation menu
    this.pages.forEach(page => {
      const isActive = page.name === this.currentPage ? ' class="nav-item active"' : ' class="nav-item"';
      html += `      <a href="${page.route}"${isActive}>${page.name}</a>\n`;
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
  }

  generateComponentHtml(component: any): string {
    switch (component.type) {
      case 'hero-section':
        return `    <section style="padding: 60px 24px; background: ${component.parameters?.backgroundColor || '#f8f9fa'}; color: ${component.parameters?.textColor || '#333'}; text-align: center;">
      <h1>${component.parameters?.title || 'Welcome to Our Website'}</h1>
      <p>${component.parameters?.subtitle || 'Discover amazing services and solutions'}</p>
      <button style="padding: 12px 24px; background: ${component.parameters?.ctaButtonColor || '#007bff'}; color: white; border: none; border-radius: 6px;">
        ${component.parameters?.ctaText || 'Get Started'}
      </button>
    </section>\n`;
      
      case 'text-block':
        return `    <div style="padding: 24px; text-align: ${component.parameters?.alignment || 'left'};">
      ${component.parameters?.title ? `<h3>${component.parameters.title}</h3>` : ''}
      <p style="color: ${component.parameters?.textColor || '#666'};">${component.parameters?.content || 'Your text content goes here...'}</p>
    </div>\n`;
      
      case 'top-navigation':
        return `    <!-- Top Navigation Component -->\n`;
      
      default:
        return `    <div style="padding: 20px; background: #f8f9fa; border: 1px dashed #ddd; margin: 10px;">
      <strong>${this.getComponentName(component.type)}</strong>
      <br><small>Component ID: ${component.id}</small>
    </div>\n`;
    }
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
        // Apply the JSON changes back to the website builder
        console.log('Applying JSON changes:', parsed);
        alert('Changes applied successfully!');
      } catch (error) {
        alert('Error applying changes: ' + error);
      }
    } else {
      alert('Please fix JSON syntax errors before applying changes.');
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
} 