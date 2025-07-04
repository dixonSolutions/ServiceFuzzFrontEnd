import { Injectable } from '@angular/core';
import { ComponentType, ComponentInstance, ComponentRenderContext, ComponentParameter } from '../models/workspace.models';

@Injectable({
  providedIn: 'root'
})
export class ComponentRendererService {

  constructor() { }

  /**
   * Convert CSS object to string format
   */
  cssToString(cssObject: { [key: string]: string }): string {
    return Object.entries(cssObject)
      .map(([property, value]) => `${property}: ${value}`)
      .join('; ');
  }

  /**
   * Convert CSS string to object format
   */
  stringToCss(cssString: string): { [key: string]: string } {
    const cssObject: { [key: string]: string } = {};
    
    if (!cssString || cssString.trim() === '') {
      return cssObject;
    }

    cssString.split(';').forEach(rule => {
      const [property, value] = rule.split(':').map(s => s.trim());
      if (property && value) {
        cssObject[property] = value;
      }
    });

    return cssObject;
  }

  /**
   * Replace parameters in HTML template with actual values
   */
  replaceParameters(htmlTemplate: string, parameters: { [key: string]: any }): string {
    let processedHTML = htmlTemplate;

    // Replace simple parameters {{paramName}}
    Object.entries(parameters).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      processedHTML = processedHTML.replace(regex, this.formatParameterValue(value));
    });

    return processedHTML;
  }

  /**
   * Format parameter value for HTML output
   */
  private formatParameterValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    
    if (typeof value === 'boolean') {
      return value.toString();
    }
    
    if (typeof value === 'number') {
      return value.toString();
    }
    
    return String(value);
  }

  /**
   * Render a component instance with its parameters and styles
   */
  renderComponent(componentType: ComponentType, component: ComponentInstance): ComponentRenderContext {
    const htmlTemplate = componentType.htmlTemplate || `<div>Component: ${componentType.name}</div>`;
    const parameters = { ...JSON.parse(componentType.defaultParameters || '{}'), ...component.parameters };
    
    // Replace parameters in HTML
    const renderedHTML = this.replaceParameters(htmlTemplate, parameters);
    
    // Apply custom styles
    const appliedCSS = this.mergeStyles(component.customStyles || {}, {
      position: 'absolute',
      left: `${component.xPosition}px`,
      top: `${component.yPosition}px`,
      width: `${component.width}px`,
      height: `${component.height}px`,
      'z-index': component.zIndex.toString()
    });

    return {
      component,
      componentType,
      renderedHTML,
      appliedCSS: this.cssToString(appliedCSS),
      parameters
    };
  }

  /**
   * Merge multiple style objects
   */
  private mergeStyles(...styles: { [key: string]: string }[]): { [key: string]: string } {
    return styles.reduce((merged, style) => ({ ...merged, ...style }), {});
  }

  /**
   * Parse parameter schema from JSON string
   */
  parseParameterSchema(schemaString: string): ComponentParameter[] {
    try {
      const schema = JSON.parse(schemaString || '[]');
      return schema.map((param: any) => ({
        name: param.name,
        type: param.type || 'text',
        label: param.label || param.name,
        required: param.required || false,
        options: param.options || [],
        defaultValue: param.defaultValue
      }));
    } catch (error) {
      console.error('Error parsing parameter schema:', error);
      return [];
    }
  }

  /**
   * Generate form fields from component parameters
   */
  generateFormFields(parameters: ComponentParameter[], currentValues: { [key: string]: any }): { [key: string]: any } {
    const formFields: { [key: string]: any } = {};
    
    parameters.forEach(param => {
      formFields[param.name] = {
        value: currentValues[param.name] ?? param.defaultValue ?? this.getDefaultValueForType(param.type),
        required: param.required || false,
        type: param.type,
        label: param.label,
        options: param.options || []
      };
    });

    return formFields;
  }

  /**
   * Get default value for parameter type
   */
  private getDefaultValueForType(type: string): any {
    switch (type) {
      case 'text':
        return '';
      case 'number':
        return 0;
      case 'boolean':
        return false;
      case 'color':
        return '#000000';
      case 'select':
        return '';
      case 'image-asset':
        return '';
      default:
        return '';
    }
  }

  /**
   * Extract placeholder values from HTML template
   */
  extractPlaceholders(htmlTemplate: string): string[] {
    const placeholders: string[] = [];
    const regex = /{{([^}]+)}}/g;
    let match;
    
    while ((match = regex.exec(htmlTemplate)) !== null) {
      const placeholder = match[1].trim();
      // Only add simple parameter names (not complex expressions)
      if (placeholder.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
        placeholders.push(placeholder);
      }
    }
    
    return [...new Set(placeholders)]; // Remove duplicates
  }
} 