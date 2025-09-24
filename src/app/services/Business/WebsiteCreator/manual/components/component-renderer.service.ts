import { Injectable } from '@angular/core';
import { ComponentType, ComponentInstance, ComponentRenderContext, ComponentParameter } from '../../../../../models/workspace.models';
import { ComponentDefinition } from '../website-builder';

@Injectable({
  providedIn: 'root'
})
export class ComponentRendererService {

  // Enhanced Component System v3.0 - Built on existing infrastructure
  private registeredComponents = new Map<string, ComponentDefinition>();
  private componentInstances = new Map<string, ComponentInstance>();
  private renderCache = new Map<string, ComponentRenderContext>();
  private eventBus = new EventTarget();
  
  // Performance tracking
  private renderStats = {
    totalRenders: 0,
    cacheHits: 0,
    renderTime: 0
  };

  constructor() { 
    console.log('🚀 Enhanced Component System v3.0 initialized');
    this.initializeEventSystem();
  }

  // ===================== ENHANCED COMPONENT SYSTEM v3.0 =====================

  /**
   * Initialize the event system for component communication
   */
  private initializeEventSystem(): void {
    // Component system ready event
    setTimeout(() => {
      this.dispatchEvent('componentSystemReady', { 
        version: '3.0',
        features: ['parameter-binding', 'event-system', 'fast-rendering', 'caching']
      });
    }, 0);
  }

  /**
   * Register a component with enhanced schema (from guide)
   */
  registerComponent(type: string, definition: {
    schema: { [key: string]: ComponentParameter };
    template: string;
    styles?: string;
    metadata: {
      name: string;
      category: string;
      description: string;
    };
  }): void {
    console.log(`🔧 Registering enhanced component: ${type}`);
    
    const componentDef: ComponentDefinition = {
      id: type,
      name: definition.metadata.name,
      category: definition.metadata.category,
      description: definition.metadata.description,
      parameters: Object.entries(definition.schema).map(([key, param]) => ({
        name: key,
        type: param.type,
        label: param.label || key,
        defaultValue: param.defaultValue,
        required: param.required || false,
        binding: param.binding || 'content'
      })),
      template: definition.template,
      styles: definition.styles || '',
      icon: 'pi pi-box'
    };

    this.registeredComponents.set(type, componentDef);
    
    this.dispatchEvent('componentRegistered', { 
      type, 
      name: definition.metadata.name 
    });
  }

  /**
   * Fast component rendering with caching
   */
  renderComponentFast(componentType: ComponentType, instance: ComponentInstance, forceRefresh = false): ComponentRenderContext {
    const startTime = performance.now();
    const cacheKey = `${componentType.id}_${instance.id}_${JSON.stringify(instance.parameters)}`;
    
    // Check cache first
    if (!forceRefresh && this.renderCache.has(cacheKey)) {
      this.renderStats.cacheHits++;
      console.log(`⚡ Cache hit for component: ${componentType.name}`);
      return this.renderCache.get(cacheKey)!;
    }

    // Render component using existing logic
    const renderContext = this.renderComponent(componentType, instance);
    
    // Enhanced template processing with more variables
    renderContext.renderedHTML = this.processEnhancedTemplate(
      renderContext.renderedHTML, 
      instance, 
      componentType
    );

    // Cache the result
    this.renderCache.set(cacheKey, renderContext);
    
    // Update stats
    this.renderStats.totalRenders++;
    this.renderStats.renderTime += performance.now() - startTime;
    
    // Dispatch render event
    this.dispatchEvent('componentRendered', {
      componentType: componentType.name,
      instanceId: instance.id,
      renderTime: performance.now() - startTime
    });

    return renderContext;
  }

  /**
   * Process enhanced template with more variables (from guide)
   */
  private processEnhancedTemplate(template: string, instance: ComponentInstance, componentType: ComponentType): string {
    const instanceId = `comp_${instance.id}`;
    const componentId = instance.id;
    const componentName = this.toPascalCase(componentType.name);
    const componentClass = this.toKebabCase(componentType.name);
    const parametersJson = JSON.stringify(instance.parameters || {});

    let processed = template
      .replace(/\{\{instanceId\}\}/g, instanceId)
      .replace(/\{\{componentId\}\}/g, componentId)
      .replace(/\{\{componentName\}\}/g, componentName)
      .replace(/\{\{componentClass\}\}/g, componentClass)
      .replace(/\{\{parametersJson\}\}/g, parametersJson);

    // Process individual parameters
    if (instance.parameters) {
      Object.entries(instance.parameters).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        processed = processed.replace(regex, String(value || ''));
      });
    }

    return processed;
  }

  /**
   * Scan DOM and render components (from guide)
   */
  scanAndRenderComponents(container?: HTMLElement): void {
    const root = container || document;
    const componentElements = root.querySelectorAll('[data-component-type]');
    
    console.log(`🔍 Scanning for components, found: ${componentElements.length}`);
    
    componentElements.forEach((element) => {
      const componentType = element.getAttribute('data-component-type');
      const parametersAttr = element.getAttribute('data-parameters');
      
      if (componentType) {
        try {
          const parameters = parametersAttr ? JSON.parse(parametersAttr) : {};
          this.renderComponentInDOM(element as HTMLElement, componentType, parameters);
        } catch (error) {
          console.error(`❌ Error rendering component ${componentType}:`, error);
        }
      }
    });
  }

  /**
   * Render component directly in DOM element
   */
  private renderComponentInDOM(element: HTMLElement, componentType: string, parameters: any): void {
    const componentDef = this.registeredComponents.get(componentType);
    if (!componentDef) {
      console.warn(`❌ Component type not registered: ${componentType}`);
      return;
    }

    // Create mock instance for rendering
    const instance: ComponentInstance = {
      id: `dom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      componentTypeId: componentType,
      xPosition: 0,
      yPosition: 0,
      width: 0,
      height: 0,
      zIndex: 0,
      parameters
    };

    // Convert to ComponentType format
    const typeObj: ComponentType = {
      id: componentType,
      name: componentDef.name,
      category: componentDef.category,
      description: componentDef.description,
      htmlTemplate: componentDef.template,
      cssTemplate: componentDef.styles || '',
      parametersSchema: JSON.stringify(componentDef.parameters),
      defaultWidth: 300,
      defaultHeight: 200,
      loadingPriority: 5,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const renderContext = this.renderComponentFast(typeObj, instance);
    
    // Apply to DOM
    element.innerHTML = renderContext.renderedHTML;
    element.setAttribute('data-instance-id', instance.id);
    
    // Apply styles if any
    if (renderContext.appliedCSS) {
      this.injectComponentStyles(renderContext.appliedCSS, instance.id);
    }

    this.dispatchEvent('componentReady', {
      instanceId: instance.id,
      componentType,
      element
    });
  }

  /**
   * Inject component-specific styles
   */
  private injectComponentStyles(css: string, instanceId: string): void {
    const styleId = `component-styles-${instanceId}`;
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = css;
  }

  /**
   * Clear render cache for efficient re-rendering
   */
  clearRenderCache(componentType?: string): void {
    if (componentType) {
      // Clear cache for specific component type
      for (const [key] of this.renderCache) {
        if (key.startsWith(componentType)) {
          this.renderCache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.renderCache.clear();
    }
    
    console.log(`🧹 Render cache cleared${componentType ? ` for ${componentType}` : ''}`);
  }

  /**
   * Re-render all components on page (fast refresh)
   */
  refreshAllComponents(forceRefresh = false): void {
    console.log('🔄 Refreshing all components...');
    
    if (forceRefresh) {
      this.clearRenderCache();
    }
    
    this.scanAndRenderComponents();
    
    this.dispatchEvent('allComponentsRefreshed', {
      timestamp: Date.now(),
      forceRefresh
    });
  }

  /**
   * Get component performance stats
   */
  getPerformanceStats(): any {
    return {
      ...this.renderStats,
      cacheSize: this.renderCache.size,
      registeredComponents: this.registeredComponents.size,
      averageRenderTime: this.renderStats.totalRenders > 0 
        ? this.renderStats.renderTime / this.renderStats.totalRenders 
        : 0
    };
  }

  /**
   * Event system for component communication
   */
  private dispatchEvent(eventType: string, detail: any): void {
    const event = new CustomEvent(eventType, { detail });
    this.eventBus.dispatchEvent(event);
    
    // Also dispatch on window for global listening
    window.dispatchEvent(event);
  }

  /**
   * Listen to component events
   */
  addEventListener(eventType: string, callback: (event: CustomEvent) => void): void {
    this.eventBus.addEventListener(eventType, callback as EventListener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(eventType: string, callback: (event: CustomEvent) => void): void {
    this.eventBus.removeEventListener(eventType, callback as EventListener);
  }

  // Utility methods
  private toPascalCase(str: string): string {
    return str.replace(/(?:^|[\s-_])+(.)/g, (_, char) => char.toUpperCase());
  }

  private toKebabCase(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }

  /**
   * Render a component with its parameters
   */
  renderComponent(componentType: ComponentType, instance: ComponentInstance): ComponentRenderContext {
    console.log('🎨 Rendering component:', componentType.name, 'with template length:', componentType.htmlTemplate?.length || 0);
    
    if (!componentType.htmlTemplate) {
      console.warn('❌ No HTML template found for component:', componentType.name);
      return {
        component: instance,
        componentType: componentType,
        renderedHTML: `<div style="padding: 20px; border: 2px dashed #dc3545; border-radius: 8px; color: #dc3545; text-align: center; font-family: Arial, sans-serif; background: #f8f9fa;">
          <i class="pi pi-exclamation-triangle" style="font-size: 24px; margin-bottom: 8px;"></i>
          <div style="font-weight: bold; margin-bottom: 4px;">Template Missing</div>
          <div style="font-size: 14px;">${componentType.name} - No HTML template found</div>
        </div>`,
        appliedCSS: '',
        parameters: this.getEffectiveParameters(componentType, instance)
      };
    }

    // Get effective parameters (defaults merged with instance parameters)
    const effectiveParameters = this.getEffectiveParameters(componentType, instance);
    
    // HARDCODED CHECK: Handle accordion component specifically to ensure it's not static
    if (componentType.id === 'prime-accordion-001') {
      console.log('🎯 Detected PrimeNG Accordion component - applying dynamic behavior');
      
      // Ensure accordion has proper dynamic behavior
      if (!effectiveParameters.hasOwnProperty('isExpanded')) {
        effectiveParameters['isExpanded'] = false; // Default to closed
      }
      
      // Mark component as dynamic (non-static)
      effectiveParameters['_isDynamic'] = true;
      effectiveParameters['_componentType'] = 'angular';
      
      console.log('✅ Accordion component configured for dynamic behavior:', {
        isExpanded: effectiveParameters['isExpanded'],
        title: effectiveParameters['title'],
        showImage: effectiveParameters['showImage']
      });
    }
      
    // Process the HTML template with parameter substitution
    const processedHTML = this.processTemplate(componentType.htmlTemplate, effectiveParameters);
    
    return {
      component: instance,
      componentType: componentType,
      renderedHTML: processedHTML,
      appliedCSS: '',
      parameters: effectiveParameters
    };
  }

  /**
   * Process template with parameter replacement
   */
  private processTemplate(template: string, parameters: { [key: string]: any }): string {
    let processedTemplate = template;
    
    // Replace simple parameters first
    Object.keys(parameters).forEach(key => {
      const value = parameters[key];
      
      // Handle image parameters specially
      if (this.isImageParameter(key, value)) {
        const imageUrl = this.processImageParameter(key, value);
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        processedTemplate = processedTemplate.replace(regex, imageUrl);
      }
      // Handle boolean parameters
      else if (typeof value === 'boolean') {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        processedTemplate = processedTemplate.replace(regex, value.toString());
      }
      // Handle number parameters
      else if (typeof value === 'number') {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        processedTemplate = processedTemplate.replace(regex, value.toString());
      }
      // Handle string parameters
      else if (typeof value === 'string') {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        processedTemplate = processedTemplate.replace(regex, value);
      }
    });
    
    // Process complex expressions with conditional logic
    const complexExpressionRegex = /\{\{([^}]+)\}\}/g;
    let match;
    
    while ((match = complexExpressionRegex.exec(processedTemplate)) !== null) {
      const fullMatch = match[0];
      const expression = match[1].trim();
      
      console.log('🔍 Processing complex expression:', expression);
      
      try {
        const result = this.evaluateExpression(expression, parameters);
        processedTemplate = processedTemplate.replace(fullMatch, result?.toString() || '');
      } catch (error) {
        console.error('❌ Error processing expression:', expression, error);
        processedTemplate = processedTemplate.replace(fullMatch, '');
      }
    }
    
    return processedTemplate;
  }

  /**
   * Check if a parameter is an image parameter
   */
  private isImageParameter(key: string, value: any): boolean {
    const imageKeys = ['image', 'img', 'imageUrl', 'imageSrc', 'photo', 'picture', 'avatar', 'logo', 'icon'];
    const keyLower = key.toLowerCase();
    
    // Check if key contains image-related words
    const isImageKey = imageKeys.some(imgKey => keyLower.includes(imgKey));
    
    // Check if value looks like an image URL
    const isImageUrl = typeof value === 'string' && (
      value.startsWith('http') || 
      value.startsWith('data:image') || 
      value.includes('.jpg') || 
      value.includes('.jpeg') || 
      value.includes('.png') || 
      value.includes('.gif') || 
      value.includes('.svg') || 
      value.includes('.webp')
    );
    
    return isImageKey || isImageUrl;
  }

  /**
   * Process image parameters with fallbacks
   */
  private processImageParameter(key: string, value: any): string {
    console.log('🖼️ Processing image parameter:', key, value);
    
    // If value is a valid URL, return it
    if (typeof value === 'string' && value.trim() !== '') {
      // Check if it's a valid URL or data URI
      if (value.startsWith('http') || value.startsWith('https') || value.startsWith('data:image')) {
        return value;
      }
      
      // Check if it's a relative path that should be treated as an image
      if (value.includes('.jpg') || value.includes('.jpeg') || value.includes('.png') || 
          value.includes('.gif') || value.includes('.svg') || value.includes('.webp')) {
        return value;
      }
    }
    
    // Return a default placeholder image for different image types
    const keyLower = key.toLowerCase();
    
    if (keyLower.includes('avatar') || keyLower.includes('profile')) {
      return 'https://via.placeholder.com/150x150/e3f2fd/1976d2?text=👤';
    }
    
    if (keyLower.includes('logo')) {
      return 'https://via.placeholder.com/200x80/f5f5f5/757575?text=LOGO';
    }
    
    if (keyLower.includes('banner') || keyLower.includes('hero')) {
      return 'https://via.placeholder.com/800x400/e8f5e8/4caf50?text=🌟';
    }
    
    if (keyLower.includes('product') || keyLower.includes('item')) {
      return 'https://via.placeholder.com/300x300/fff3e0/ff9800?text=📦';
    }
    
    if (keyLower.includes('background') || keyLower.includes('bg')) {
      return 'https://via.placeholder.com/1200x600/f3e5f5/9c27b0?text=🎨';
    }
    
    // Default placeholder for any other image
    return 'https://via.placeholder.com/400x300/f0f0f0/888888?text=🖼️';
  }

  /**
   * Evaluate complex expressions with parameters
   */
  private evaluateExpression(expression: string, parameters: { [key: string]: any }): any {
    // Handle simple parameter references
    if (parameters.hasOwnProperty(expression)) {
      return parameters[expression];
    }
    
    // Handle ternary operators: condition ? value1 : value2
    const ternaryMatch = expression.match(/(.+?)\s*\?\s*(.+?)\s*:\s*(.+)/);
    if (ternaryMatch) {
      const [, condition, trueValue, falseValue] = ternaryMatch;
      const conditionResult = this.evaluateCondition(condition.trim(), parameters);
      
      if (conditionResult) {
        return this.evaluateExpression(trueValue.trim(), parameters);
      } else {
        return this.evaluateExpression(falseValue.trim(), parameters);
      }
    }
    
    // Handle string literals (quoted strings)
    if (expression.startsWith("'") && expression.endsWith("'")) {
      return expression.slice(1, -1);
    }
    if (expression.startsWith('"') && expression.endsWith('"')) {
      return expression.slice(1, -1);
    }
    
    // Handle numeric literals
    if (/^\d+\.?\d*$/.test(expression)) {
      return parseFloat(expression);
    }
    
    // Handle boolean literals
    if (expression === 'true') return true;
    if (expression === 'false') return false;
    
    // Handle complex expressions with operators
    if (expression.includes('===') || expression.includes('!==') || expression.includes('==') || expression.includes('!=')) {
      return this.evaluateCondition(expression, parameters);
    }
    
    // Handle logical OR for fallback values (e.g., backgroundColor || '#ffffff')
    if (expression.includes('||')) {
      const parts = expression.split('||').map(s => s.trim());
      for (const part of parts) {
        const value = this.evaluateExpression(part, parameters);
        if (value !== null && value !== undefined && value !== '') {
          return value;
        }
      }
      // Clean up the fallback value (remove quotes if present)
      let fallback = parts[parts.length - 1];
      if (fallback.startsWith("'") && fallback.endsWith("'")) {
        fallback = fallback.slice(1, -1);
      }
      if (fallback.startsWith('"') && fallback.endsWith('"')) {
        fallback = fallback.slice(1, -1);
      }
      return fallback;
    }

    // Handle arithmetic operations
    if (expression.includes('+') || expression.includes('-') || expression.includes('*') || expression.includes('/')) {
      return this.evaluateArithmeticExpression(expression, parameters);
    }
    
    // Handle property access (e.g., object.property)
    if (expression.includes('.')) {
      const parts = expression.split('.');
      let value = parameters;
      for (const part of parts) {
        if (value && typeof value === 'object' && value.hasOwnProperty(part)) {
          value = value[part];
        } else {
          return null;
        }
      }
      return value;
    }
    
    // Handle array/object access
    if (expression.includes('[') && expression.includes(']')) {
      // Complex array access - for now, return null to prevent errors
      return null;
    }
    
    // Handle function calls (basic support)
    if (expression.includes('(') && expression.includes(')')) {
      // For now, just return the expression as-is for function calls
      return expression;
    }
    
    // If we can't evaluate it, return the original expression
    console.warn('🤔 Could not evaluate expression:', expression);
    return expression;
  }

  /**
   * Evaluate conditional expressions
   */
  private evaluateCondition(condition: string, parameters: { [key: string]: any }): boolean {
    console.log('🔍 Evaluating condition:', condition);
    
    // Handle equality comparisons
    if (condition.includes('===')) {
      const [left, right] = condition.split('===').map(s => s.trim());
      const leftValue = this.evaluateExpression(left, parameters);
      const rightValue = this.evaluateExpression(right, parameters);
      return leftValue === rightValue;
    }
    
    if (condition.includes('!==')) {
      const [left, right] = condition.split('!==').map(s => s.trim());
      const leftValue = this.evaluateExpression(left, parameters);
      const rightValue = this.evaluateExpression(right, parameters);
      return leftValue !== rightValue;
    }
    
    if (condition.includes('==')) {
      const [left, right] = condition.split('==').map(s => s.trim());
      const leftValue = this.evaluateExpression(left, parameters);
      const rightValue = this.evaluateExpression(right, parameters);
      return leftValue == rightValue;
    }
    
    if (condition.includes('!=')) {
      const [left, right] = condition.split('!=').map(s => s.trim());
      const leftValue = this.evaluateExpression(left, parameters);
      const rightValue = this.evaluateExpression(right, parameters);
      return leftValue != rightValue;
    }
    
    // Handle comparison operators
    if (condition.includes('>=')) {
      const [left, right] = condition.split('>=').map(s => s.trim());
      const leftValue = this.evaluateExpression(left, parameters);
      const rightValue = this.evaluateExpression(right, parameters);
      return Number(leftValue) >= Number(rightValue);
    }
    
    if (condition.includes('<=')) {
      const [left, right] = condition.split('<=').map(s => s.trim());
      const leftValue = this.evaluateExpression(left, parameters);
      const rightValue = this.evaluateExpression(right, parameters);
      return Number(leftValue) <= Number(rightValue);
    }
    
    if (condition.includes('>')) {
      const [left, right] = condition.split('>').map(s => s.trim());
      const leftValue = this.evaluateExpression(left, parameters);
      const rightValue = this.evaluateExpression(right, parameters);
      return Number(leftValue) > Number(rightValue);
    }
    
    if (condition.includes('<')) {
      const [left, right] = condition.split('<').map(s => s.trim());
      const leftValue = this.evaluateExpression(left, parameters);
      const rightValue = this.evaluateExpression(right, parameters);
      return Number(leftValue) < Number(rightValue);
    }
    
    // Handle logical operators
    if (condition.includes('&&')) {
      const parts = condition.split('&&').map(s => s.trim());
      return parts.every(part => this.evaluateCondition(part, parameters));
    }
    
    if (condition.includes('||')) {
      const parts = condition.split('||').map(s => s.trim());
      return parts.some(part => this.evaluateCondition(part, parameters));
    }
    
    // Handle negation
    if (condition.startsWith('!')) {
      const innerCondition = condition.substring(1).trim();
      return !this.evaluateCondition(innerCondition, parameters);
    }
    
    // Handle simple truthy/falsy evaluation
    const value = this.evaluateExpression(condition, parameters);
    return Boolean(value);
  }

  /**
   * Evaluate arithmetic expressions
   */
  private evaluateArithmeticExpression(expression: string, parameters: { [key: string]: any }): number {
    // Handle simple addition/subtraction/multiplication/division
    const operators = ['+', '-', '*', '/'];
    
    for (const op of operators) {
      if (expression.includes(op)) {
        const parts = expression.split(op).map(s => s.trim());
        if (parts.length === 2) {
          const left = this.evaluateExpression(parts[0], parameters);
          const right = this.evaluateExpression(parts[1], parameters);
          
          const leftNum = Number(left);
          const rightNum = Number(right);
          
          switch (op) {
            case '+': return leftNum + rightNum;
            case '-': return leftNum - rightNum;
            case '*': return leftNum * rightNum;
            case '/': return leftNum / rightNum;
          }
        }
      }
    }
    
    return 0;
  }

  /**
   * Get effective parameters by merging defaults with instance parameters
   */
  private getEffectiveParameters(componentType: ComponentType, instance: ComponentInstance): { [key: string]: any } {
    const parameters: { [key: string]: any } = {};
    
    // Start with default parameters
    if (componentType.defaultParameters) {
      try {
        const defaultParams = typeof componentType.defaultParameters === 'string' 
          ? JSON.parse(componentType.defaultParameters) 
          : componentType.defaultParameters;
        Object.assign(parameters, defaultParams);
      } catch (error) {
        console.error('❌ Error parsing default parameters:', error);
      }
    }
    
    // Override with instance parameters
    if (instance.parameters) {
      Object.assign(parameters, instance.parameters);
    }
    
    // Ensure all parameters have values (use sensible defaults if missing)
    if (componentType.parametersSchema) {
      try {
        const schema = typeof componentType.parametersSchema === 'string' 
          ? JSON.parse(componentType.parametersSchema) 
          : componentType.parametersSchema;
        
        if (Array.isArray(schema)) {
          schema.forEach((param: any) => {
            if (param.name && (parameters[param.name] === undefined || parameters[param.name] === null)) {
              // Set sensible default value based on parameter type
              switch (param.type) {
                case 'color':
                  parameters[param.name] = param.name === 'backgroundColor' ? '#ffffff' : '#333333';
                  break;
                case 'text':
                  parameters[param.name] = param.name === 'title' ? 'Sample Title' : 'Sample description';
                  break;
                case 'select':
                  parameters[param.name] = param.options?.[0] || 'left';
                  break;
                case 'boolean':
                  parameters[param.name] = false;
                  break;
                case 'number':
                  parameters[param.name] = 0;
                  break;
                default:
                  parameters[param.name] = '';
              }
            }
          });
        }
      } catch (error) {
        console.error('❌ Error parsing parameter schema:', error);
      }
    }
    
    console.log('🎯 Component parameters merged:', { 
      componentType: componentType.id,
      instanceId: instance.id,
      finalParams: parameters 
    });
    
    return parameters;
  }

  /**
   * Get component parameters from schema
   */
  getComponentParameters(componentType: ComponentType): ComponentParameter[] {
    if (!componentType.parametersSchema) {
      return [];
    }
    
    try {
      const schema = typeof componentType.parametersSchema === 'string' 
        ? JSON.parse(componentType.parametersSchema) 
        : componentType.parametersSchema;
      
      return Array.isArray(schema) ? schema : [];
    } catch (error) {
      console.error('❌ Error parsing parameters schema:', error);
      return [];
    }
  }

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
    
    cssString.split(';').forEach(declaration => {
      const [property, value] = declaration.split(':').map(s => s.trim());
      if (property && value) {
        cssObject[property] = value;
      }
    });

    return cssObject;
  }

  /**
   * Parse parameter schema from JSON string
   */
  parseParameterSchema(parametersSchema: string | undefined): ComponentParameter[] {
    if (!parametersSchema) {
      return [];
  }

    try {
      const schema = typeof parametersSchema === 'string' 
        ? JSON.parse(parametersSchema) 
        : parametersSchema;
      
      return Array.isArray(schema) ? schema : [];
    } catch (error) {
      console.error('❌ Error parsing parameters schema:', error);
      return [];
    }
  }

  /**
   * Generate form fields from parameters and current values
   */
  generateFormFields(parameters: ComponentParameter[], currentParameters: { [key: string]: any }): any {
    // This method returns an object that can be used to build forms
    // For now, it returns a simple mapping of parameters to their current values
    const formFields: { [key: string]: any } = {};
    
    parameters.forEach(param => {
      formFields[param.name] = {
        parameter: param,
        value: currentParameters[param.name] !== undefined ? currentParameters[param.name] : param.defaultValue,
        touched: false,
        valid: !param.required || (currentParameters[param.name] !== undefined && currentParameters[param.name] !== null && currentParameters[param.name] !== ''),
        errorMessage: ''
      };
    });

    return formFields;
  }

  /**
   * Check if a component should be treated as dynamic (non-static)
   */
  isDynamicComponent(componentType: ComponentType): boolean {
    // HARDCODED CHECK: PrimeNG Accordion is always dynamic
    if (componentType.id === 'prime-accordion-001') {
      console.log('🎯 Component identified as dynamic:', componentType.name);
      return true;
    }
    
    // Check if template contains Angular-specific elements
    if (componentType.htmlTemplate) {
      const angularElements = ['<p-accordion', '<mat-', '<ng-', '*ngFor', '*ngIf', '{{', '}}'];
      const hasAngularElements = angularElements.some(element => 
        componentType.htmlTemplate!.includes(element)
      );
      
      if (hasAngularElements) {
        console.log('🔍 Component detected as Angular component:', componentType.name);
        return true;
      }
    }
    
    // Default to static for simple HTML components
    return false;
  }

  /**
   * Get component behavior type
   */
  getComponentBehaviorType(componentType: ComponentType): 'static' | 'angular' | 'dynamic' {
    if (componentType.id === 'prime-accordion-001') {
      return 'angular';
    }
    
    if (this.isDynamicComponent(componentType)) {
      return 'angular';
    }
    
    return 'static';
  }
} 