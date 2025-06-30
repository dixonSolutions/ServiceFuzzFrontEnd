import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

// Component Parameter Interface
export interface ComponentParameter {
  name: string;
  type: 'text' | 'number' | 'color' | 'image' | 'select' | 'boolean';
  label: string;
  defaultValue: any;
  options?: string[]; // For select type
  required?: boolean;
}

// Component Definition Interface
export interface ComponentDefinition {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  parameters: ComponentParameter[];
  template: string;
  styles?: string;
  defaultWidth?: number;
  defaultHeight?: number;
}

// Component Instance Interface
export interface ComponentInstance {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  parameters: { [key: string]: any };
  zIndex: number;
}

// Layout Interface
export interface WebsiteLayout {
  id: string;
  name: string;
  device: 'desktop' | 'tablet' | 'mobile';
  components: ComponentInstance[];
  width: number;
  height: number;
  background: string;
  createdAt: Date;
  updatedAt: Date;
}

// Website Project Interface
export interface WebsiteProject {
  id: string;
  name: string;
  description: string;
  layouts: { [device: string]: WebsiteLayout };
  currentDevice: 'desktop' | 'tablet' | 'mobile';
  createdAt: Date;
  updatedAt: Date;
}

// Page Interface
export interface WebsitePage {
  id: string;
  name: string;
  route: string;
  components: ComponentInstance[];
  isDeletable: boolean;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class WebsiteBuilderService {
  // Signals for reactive state management
  private _currentProject = signal<WebsiteProject | null>(null);
  private _selectedComponent = signal<ComponentInstance | null>(null);
  private _isDragging = signal<boolean>(false);
  private _dragSource = signal<string>('');

  // Behavior subjects for observables
  private _components = new BehaviorSubject<ComponentInstance[]>([]);
  private _availableComponents = new BehaviorSubject<ComponentDefinition[]>([]);
  private _filteredComponents = new BehaviorSubject<ComponentDefinition[]>([]);
  private _searchTerm = new BehaviorSubject<string>('');
  private _selectedCategory = new BehaviorSubject<string>('All');
  private _pages = new BehaviorSubject<WebsitePage[]>([]);
  private _currentPageId = new BehaviorSubject<string>('home');

  // Getters
  get currentProject() { return this._currentProject(); }
  get selectedComponent() { return this._selectedComponent(); }
  get isDragging() { return this._isDragging(); }
  get dragSource() { return this._dragSource(); }
  get components$(): Observable<ComponentInstance[]> { return this._components.asObservable(); }
  get availableComponents$(): Observable<ComponentDefinition[]> { return this._availableComponents.asObservable(); }
  get filteredComponents$(): Observable<ComponentDefinition[]> { return this._filteredComponents.asObservable(); }
  get searchTerm$(): Observable<string> { return this._searchTerm.asObservable(); }
  get selectedCategory$(): Observable<string> { return this._selectedCategory.asObservable(); }
  get pages$(): Observable<WebsitePage[]> { return this._pages.asObservable(); }
  get currentPageId$(): Observable<string> { return this._currentPageId.asObservable(); }

  constructor() {
    this.initializeComponents();
    
    // Initialize filtered components to show all components by default
    this.filterComponents();
  }

  // Initialize available components
  private initializeComponents(): void {
    const components: ComponentDefinition[] = [
      // UI Components
      {
        id: 'top-navigation',
        name: 'Top Navigation',
        category: 'UI',
        icon: 'pi pi-bars',
        description: 'Navigation bar with logo, menu items, mobile hamburger menu',
        defaultWidth: 100,
        defaultHeight: 80,
        parameters: [
          { name: 'logoText', type: 'text', label: 'Logo Text', defaultValue: 'My Website', required: true },
          { name: 'backgroundColor', type: 'color', label: 'Background Color', defaultValue: '#ffffff' },
          { name: 'textColor', type: 'color', label: 'Text Color', defaultValue: '#000000' },
          { name: 'isSticky', type: 'boolean', label: 'Sticky Navigation', defaultValue: true },
          { name: 'showShadow', type: 'boolean', label: 'Drop Shadow', defaultValue: true }
        ],
        template: `<nav class="top-navigation" [style.background-color]="backgroundColor" [style.color]="textColor"></nav>`
      },
      {
        id: 'hero-section',
        name: 'Hero Section',
        category: 'UI',
        icon: 'pi pi-star',
        description: 'Large banner area with title, subtitle, and call-to-action button',
        defaultWidth: 100,
        defaultHeight: 400,
        parameters: [
          { name: 'title', type: 'text', label: 'Title', defaultValue: 'Welcome to Our Website', required: true },
          { name: 'subtitle', type: 'text', label: 'Subtitle', defaultValue: 'Discover amazing services and solutions' },
          { name: 'ctaText', type: 'text', label: 'CTA Button Text', defaultValue: 'Get Started' },
          { name: 'backgroundColor', type: 'color', label: 'Background Color', defaultValue: '#f8f9fa' },
          { name: 'textColor', type: 'color', label: 'Text Color', defaultValue: '#333333' }
        ],
        template: `<section class="hero-section" [style.background-color]="backgroundColor" [style.color]="textColor"></section>`
      },
      {
        id: 'footer',
        name: 'Footer',
        category: 'UI',
        icon: 'pi pi-align-justify',
        description: 'Bottom section with multiple columns and social links',
        defaultWidth: 100,
        defaultHeight: 200,
        parameters: [
          { name: 'companyName', type: 'text', label: 'Company Name', defaultValue: 'Company Name', required: true },
          { name: 'description', type: 'text', label: 'Description', defaultValue: 'Your company description' },
          { name: 'showSocialLinks', type: 'boolean', label: 'Show Social Links', defaultValue: true },
          { name: 'backgroundColor', type: 'color', label: 'Background Color', defaultValue: '#2c3e50' },
          { name: 'textColor', type: 'color', label: 'Text Color', defaultValue: '#ffffff' }
        ],
        template: `<footer class="footer" [style.background-color]="backgroundColor" [style.color]="textColor"></footer>`
      },
      {
        id: 'text-block',
        name: 'Text Block',
        category: 'UI',
        icon: 'pi pi-file-edit',
        description: 'Editable text content with formatting options',
        defaultWidth: 400,
        defaultHeight: 150,
        parameters: [
          { name: 'title', type: 'text', label: 'Title', defaultValue: 'Text Block Title' },
          { name: 'content', type: 'text', label: 'Content', defaultValue: 'Your text content goes here...' },
          { name: 'alignment', type: 'select', label: 'Text Alignment', defaultValue: 'left', options: ['left', 'center', 'right'] },
          { name: 'fontSize', type: 'number', label: 'Font Size', defaultValue: 16 },
          { name: 'textColor', type: 'color', label: 'Text Color', defaultValue: '#333333' }
        ],
        template: `<div class="text-block" [style.color]="textColor"></div>`
      },
      {
        id: 'image',
        name: 'Image',
        category: 'UI',
        icon: 'pi pi-image',
        description: 'Image display with alt text and sizing controls',
        defaultWidth: 300,
        defaultHeight: 200,
        parameters: [
          { name: 'imageUrl', type: 'text', label: 'Image URL', defaultValue: 'https://via.placeholder.com/300x200' },
          { name: 'altText', type: 'text', label: 'Alt Text', defaultValue: 'Image description' },
          { name: 'borderRadius', type: 'number', label: 'Border Radius', defaultValue: 0 },
          { name: 'objectFit', type: 'select', label: 'Object Fit', defaultValue: 'cover', options: ['cover', 'contain', 'fill'] }
        ],
        template: `<img class="image-component" [src]="imageUrl" [alt]="altText" [style.border-radius.px]="borderRadius">`
      },
      {
        id: 'button',
        name: 'Button',
        category: 'UI',
        icon: 'pi pi-tablet',
        description: 'Clickable button with customizable styling',
        defaultWidth: 150,
        defaultHeight: 50,
        parameters: [
          { name: 'text', type: 'text', label: 'Button Text', defaultValue: 'Click Me', required: true },
          { name: 'backgroundColor', type: 'color', label: 'Background Color', defaultValue: '#007bff' },
          { name: 'textColor', type: 'color', label: 'Text Color', defaultValue: '#ffffff' },
          { name: 'borderRadius', type: 'number', label: 'Border Radius', defaultValue: 4 },
          { name: 'size', type: 'select', label: 'Size', defaultValue: 'medium', options: ['small', 'medium', 'large'] }
        ],
        template: `<button class="button-component" [style.background-color]="backgroundColor" [style.color]="textColor"></button>`
      },
      {
        id: 'card-grid',
        name: 'Card Grid',
        category: 'UI',
        icon: 'pi pi-th-large',
        description: 'Responsive grid layout for displaying card-style content',
        defaultWidth: 100,
        defaultHeight: 300,
        parameters: [
          { name: 'columns', type: 'number', label: 'Columns', defaultValue: 3 },
          { name: 'gap', type: 'number', label: 'Gap (px)', defaultValue: 20 },
          { name: 'cardBackground', type: 'color', label: 'Card Background', defaultValue: '#ffffff' },
          { name: 'showShadow', type: 'boolean', label: 'Show Shadow', defaultValue: true }
        ],
        template: `<div class="card-grid" [style.grid-template-columns]="'repeat(' + columns + ', 1fr)'" [style.gap.px]="gap"></div>`
      },
      {
        id: 'section-divider',
        name: 'Section Divider',
        category: 'UI',
        icon: 'pi pi-minus',
        description: 'Visual separator between content sections',
        defaultWidth: 100,
        defaultHeight: 20,
        parameters: [
          { name: 'style', type: 'select', label: 'Style', defaultValue: 'line', options: ['line', 'dotted', 'dashed'] },
          { name: 'color', type: 'color', label: 'Color', defaultValue: '#e9ecef' },
          { name: 'thickness', type: 'number', label: 'Thickness (px)', defaultValue: 1 }
        ],
        template: `<hr class="section-divider" [style.border-color]="color" [style.border-width.px]="thickness">`
      },
      {
        id: 'testimonial',
        name: 'Testimonial',
        category: 'UI',
        icon: 'pi pi-comment',
        description: 'Customer testimonial display with ratings and author info',
        defaultWidth: 400,
        defaultHeight: 200,
        parameters: [
          { name: 'quote', type: 'text', label: 'Quote', defaultValue: 'This is an amazing service!' },
          { name: 'authorName', type: 'text', label: 'Author Name', defaultValue: 'John Doe' },
          { name: 'authorTitle', type: 'text', label: 'Author Title', defaultValue: 'CEO, Company' },
          { name: 'rating', type: 'number', label: 'Rating (1-5)', defaultValue: 5 },
          { name: 'backgroundColor', type: 'color', label: 'Background Color', defaultValue: '#f8f9fa' }
        ],
        template: `<div class="testimonial" [style.background-color]="backgroundColor"></div>`
      },

      // Data Components
      {
        id: 'contact-info',
        name: 'Contact Information',
        category: 'Data',
        icon: 'pi pi-phone',
        description: 'Business contact details with interactive elements',
        defaultWidth: 100,
        defaultHeight: 300,
        parameters: [
          { name: 'businessName', type: 'text', label: 'Business Name', defaultValue: 'Your Business' },
          { name: 'address', type: 'text', label: 'Address', defaultValue: '123 Main St, City, State 12345' },
          { name: 'phone', type: 'text', label: 'Phone', defaultValue: '(555) 123-4567' },
          { name: 'email', type: 'text', label: 'Email', defaultValue: 'info@yourbusiness.com' },
          { name: 'hours', type: 'text', label: 'Business Hours', defaultValue: 'Mon-Fri: 9AM-6PM' },
          { name: 'showMap', type: 'boolean', label: 'Show Map', defaultValue: true }
        ],
        template: `<div class="contact-info"></div>`
      },
      {
        id: 'services-gallery',
        name: 'Services Gallery',
        category: 'Data',
        icon: 'pi pi-list',
        description: 'Professional service listings with booking functionality',
        defaultWidth: 100,
        defaultHeight: 400,
        parameters: [
          { name: 'title', type: 'text', label: 'Gallery Title', defaultValue: 'Our Services' },
          { name: 'showPrices', type: 'boolean', label: 'Show Prices', defaultValue: true },
          { name: 'showDuration', type: 'boolean', label: 'Show Duration', defaultValue: true },
          { name: 'showBooking', type: 'boolean', label: 'Show Book Now Button', defaultValue: true },
          { name: 'itemsPerRow', type: 'number', label: 'Items Per Row', defaultValue: 3 }
        ],
        template: `<div class="services-gallery"></div>`
      },
      {
        id: 'checkout-summary',
        name: 'Checkout Summary',
        category: 'Data',
        icon: 'pi pi-shopping-cart',
        description: 'Complete checkout form with payment integration',
        defaultWidth: 100,
        defaultHeight: 500,
        parameters: [
          { name: 'title', type: 'text', label: 'Title', defaultValue: 'Checkout' },
          { name: 'showTax', type: 'boolean', label: 'Show Tax', defaultValue: true },
          { name: 'showShipping', type: 'boolean', label: 'Show Shipping', defaultValue: false },
          { name: 'currency', type: 'select', label: 'Currency', defaultValue: 'USD', options: ['USD', 'EUR', 'GBP'] },
          { name: 'paymentMethods', type: 'text', label: 'Payment Methods', defaultValue: 'Credit Card, PayPal, Apple Pay' }
        ],
        template: `<div class="checkout-summary"></div>`
      },
      {
        id: 'payment-form',
        name: 'Payment Form',
        category: 'Data',
        icon: 'pi pi-credit-card',
        description: 'Secure payment form with validation',
        defaultWidth: 100,
        defaultHeight: 400,
        parameters: [
          { name: 'title', type: 'text', label: 'Title', defaultValue: 'Payment Details' },
          { name: 'acceptedCards', type: 'text', label: 'Accepted Cards', defaultValue: 'Visa, MasterCard, American Express' },
          { name: 'showSaveCard', type: 'boolean', label: 'Show Save Card Option', defaultValue: true },
          { name: 'showBillingAddress', type: 'boolean', label: 'Show Billing Address', defaultValue: true }
        ],
        template: `<div class="payment-form"></div>`
      },
      {
        id: 'product-grid',
        name: 'Product Display',
        category: 'Data',
        icon: 'pi pi-table',
        description: 'Professional service/product display with booking options',
        defaultWidth: 100,
        defaultHeight: 400,
        parameters: [
          { name: 'title', type: 'text', label: 'Title', defaultValue: 'Our Services' },
          { name: 'columns', type: 'number', label: 'Columns', defaultValue: 3 },
          { name: 'showPricing', type: 'boolean', label: 'Show Pricing', defaultValue: true },
          { name: 'showDuration', type: 'boolean', label: 'Show Duration', defaultValue: true },
          { name: 'showBooking', type: 'boolean', label: 'Show Book Now', defaultValue: true },
          { name: 'showRatings', type: 'boolean', label: 'Show Ratings', defaultValue: true }
        ],
        template: `<div class="product-grid"></div>`
      },
      {
        id: 'past-orders-display',
        name: 'Past Orders Display',
        category: 'Data',
        icon: 'pi pi-history',
        description: 'Customer order history with reschedule and cancel options',
        defaultWidth: 100,
        defaultHeight: 500,
        parameters: [
          { name: 'title', type: 'text', label: 'Title', defaultValue: 'Your Past Orders' },
          { name: 'showStatus', type: 'boolean', label: 'Show Order Status', defaultValue: true },
          { name: 'allowReschedule', type: 'boolean', label: 'Allow Rescheduling', defaultValue: true },
          { name: 'allowCancel', type: 'boolean', label: 'Allow Cancellation', defaultValue: true },
          { name: 'showDate', type: 'boolean', label: 'Show Service Date', defaultValue: true },
          { name: 'itemsPerPage', type: 'number', label: 'Items Per Page', defaultValue: 10 }
        ],
        template: `<div class="past-orders-display"></div>`
      },
      {
        id: 'authentication-form',
        name: 'Authentication Form',
        category: 'Data',
        icon: 'pi pi-user',
        description: 'Login/signup form with built-in authentication',
        defaultWidth: 100,
        defaultHeight: 400,
        parameters: [
          { name: 'title', type: 'text', label: 'Title', defaultValue: 'Sign In' },
          { name: 'showRegister', type: 'boolean', label: 'Show Register Option', defaultValue: true },
          { name: 'showForgotPassword', type: 'boolean', label: 'Show Forgot Password', defaultValue: true },
          { name: 'showSocialLogin', type: 'boolean', label: 'Show Social Login', defaultValue: true },
          { name: 'redirectAfterLogin', type: 'text', label: 'Redirect After Login', defaultValue: '/past-orders' }
        ],
        template: `<div class="authentication-form"></div>`
      },
      {
        id: 'booking-calendar',
        name: 'Booking Calendar',
        category: 'Data',
        icon: 'pi pi-calendar',
        description: 'Interactive calendar for service booking and scheduling',
        defaultWidth: 100,
        defaultHeight: 500,
        parameters: [
          { name: 'title', type: 'text', label: 'Title', defaultValue: 'Book an Appointment' },
          { name: 'showTimeSlots', type: 'boolean', label: 'Show Time Slots', defaultValue: true },
          { name: 'allowMultipleServices', type: 'boolean', label: 'Allow Multiple Services', defaultValue: false },
          { name: 'requireDeposit', type: 'boolean', label: 'Require Deposit', defaultValue: false },
          { name: 'advanceBookingDays', type: 'number', label: 'Advance Booking Days', defaultValue: 30 }
        ],
        template: `<div class="booking-calendar"></div>`
      }
    ];

    this._availableComponents.next(components);
  }

  // Project Management
  createNewProject(name: string, description: string = ''): WebsiteProject {
    const project: WebsiteProject = {
      id: this.generateId(),
      name,
      description,
      currentDevice: 'desktop',
      layouts: {
        desktop: this.createDefaultLayout('desktop'),
        tablet: this.createDefaultLayout('tablet'),
        mobile: this.createDefaultLayout('mobile')
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this._currentProject.set(project);
    this.updateComponents();
    return project;
  }

  private createDefaultLayout(device: 'desktop' | 'tablet' | 'mobile'): WebsiteLayout {
    const dimensions = {
      desktop: { width: 1200, height: 800 },
      tablet: { width: 768, height: 1024 },
      mobile: { width: 375, height: 667 }
    };

    return {
      id: this.generateId(),
      name: `${device.charAt(0).toUpperCase() + device.slice(1)} Layout`,
      device,
      components: [],
      width: dimensions[device].width,
      height: dimensions[device].height,
      background: '#ffffff',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  // Component Management
  addComponent(componentType: string, x: number, y: number): ComponentInstance {
    const componentDef = this._availableComponents.value.find(c => c.id === componentType);
    if (!componentDef) {
      throw new Error(`Component type ${componentType} not found`);
    }

    const currentPage = this.getCurrentPage();
    if (!currentPage) {
      throw new Error('No active page');
    }

    const component: ComponentInstance = {
      id: this.generateId(),
      type: componentType,
      x,
      y,
      width: componentDef.defaultWidth || 200,
      height: componentDef.defaultHeight || 100,
      parameters: this.getDefaultParameters(componentDef.parameters),
      zIndex: currentPage.components.length
    };

    // Add component to current page
    currentPage.components.push(component);
    
    // Update the pages array with the modified page
    const currentPages = this._pages.value;
    const updatedPages = currentPages.map(page => 
      page.id === currentPage.id ? currentPage : page
    );
    this._pages.next(updatedPages);

    return component;
  }

  updateComponent(componentId: string, updates: Partial<ComponentInstance>): void {
    const project = this._currentProject();
    if (!project) return;

    const layout = project.layouts[project.currentDevice];
    const componentIndex = layout.components.findIndex(c => c.id === componentId);
    
    if (componentIndex !== -1) {
      layout.components[componentIndex] = { ...layout.components[componentIndex], ...updates };
      layout.updatedAt = new Date();
      project.updatedAt = new Date();
      
      this._currentProject.set(project);
      this.updateComponents();
    }
  }

  deleteComponent(componentId: string): void {
    const project = this._currentProject();
    if (!project) return;

    const layout = project.layouts[project.currentDevice];
    layout.components = layout.components.filter(c => c.id !== componentId);
    layout.updatedAt = new Date();
    project.updatedAt = new Date();

    this._currentProject.set(project);
    this.updateComponents();
  }

  selectComponent(componentId: string | null): void {
    const project = this._currentProject();
    if (!project) return;

    const component = componentId 
      ? project.layouts[project.currentDevice].components.find(c => c.id === componentId)
      : null;

    this._selectedComponent.set(component || null);
  }

  // Device Management
  switchDevice(device: 'desktop' | 'tablet' | 'mobile'): void {
    const project = this._currentProject();
    if (!project) return;

    project.currentDevice = device;
    project.updatedAt = new Date();
    this._currentProject.set(project);
    this.updateComponents();
  }

  // Drag and Drop
  startDrag(source: string): void {
    this._isDragging.set(true);
    this._dragSource.set(source);
  }

  stopDrag(): void {
    this._isDragging.set(false);
    this._dragSource.set('');
  }

  // Utility Methods
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private getDefaultParameters(parameters: ComponentParameter[]): { [key: string]: any } {
    const defaults: { [key: string]: any } = {};
    parameters.forEach(param => {
      defaults[param.name] = param.defaultValue;
    });
    return defaults;
  }

  private updateComponents(): void {
    const project = this._currentProject();
    if (project) {
      this._components.next(project.layouts[project.currentDevice].components);
    } else {
      this._components.next([]);
    }
  }

  // Export/Import
  exportProject(): string {
    const project = this._currentProject();
    if (!project) throw new Error('No project to export');
    return JSON.stringify(project, null, 2);
  }

  importProject(jsonData: string): WebsiteProject {
    try {
      const project = JSON.parse(jsonData) as WebsiteProject;
      this._currentProject.set(project);
      this.updateComponents();
      return project;
    } catch (error) {
      throw new Error('Invalid project data');
    }
  }

  // Get component definition
  getComponentDefinition(componentType: string): ComponentDefinition | undefined {
    return this._availableComponents.value.find(c => c.id === componentType);
  }

  // Get all component definitions by category
  getComponentsByCategory(): { [category: string]: ComponentDefinition[] } {
    const components = this._availableComponents.value;
    const categories: { [category: string]: ComponentDefinition[] } = {};
    
    components.forEach(component => {
      if (!categories[component.category]) {
        categories[component.category] = [];
      }
      categories[component.category].push(component);
    });
    
    return categories;
  }

  // Component categories
  getComponentCategories(): { name: string; count: number }[] {
    const components = this._availableComponents.value;
    const categories = [
      { name: 'All', count: components.length },
      { name: 'UI', count: components.filter(c => c.category === 'UI').length },
      { name: 'Data', count: components.filter(c => c.category === 'Data').length }
    ];
    return categories;
  }

  // Search and filter methods
  updateSearchTerm(term: string): void {
    this._searchTerm.next(term);
    this.filterComponents();
  }

  updateSelectedCategory(category: string): void {
    this._selectedCategory.next(category);
    this.filterComponents();
  }

  private filterComponents(): void {
    const allComponents = this._availableComponents.value;
    const searchTerm = this._searchTerm.value.toLowerCase();
    const selectedCategory = this._selectedCategory.value;

    let filtered = allComponents;

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(c => c.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(searchTerm) ||
        c.description.toLowerCase().includes(searchTerm)
      );
    }

    this._filteredComponents.next(filtered);
  }

  // Page management methods
  initializePages(): void {
    const defaultPages: WebsitePage[] = [
      {
        id: 'home',
        name: 'Home',
        route: '/',
        components: [],
        isDeletable: false,
        isActive: true
      },
      {
        id: 'about',
        name: 'About',
        route: '/about',
        components: [],
        isDeletable: false,
        isActive: false
      },
      {
        id: 'shop',
        name: 'Shop',
        route: '/shop',
        components: [],
        isDeletable: false,
        isActive: false
      },
      {
        id: 'checkout',
        name: 'Checkout',
        route: '/checkout',
        components: [],
        isDeletable: false,
        isActive: false
      },
      {
        id: 'past-orders',
        name: 'Past Orders',
        route: '/past-orders',
        components: [],
        isDeletable: false,
        isActive: false
      }
    ];

    this._pages.next(defaultPages);
  }

  addPage(name: string, route: string): void {
    const currentPages = this._pages.value;
    const newPage: WebsitePage = {
      id: this.generateId(),
      name,
      route: route.startsWith('/') ? route : `/${route}`,
      components: [],
      isDeletable: true,
      isActive: false
    };

    this._pages.next([...currentPages, newPage]);
  }

  deletePage(pageId: string): void {
    const currentPages = this._pages.value;
    const page = currentPages.find(p => p.id === pageId);
    
    if (!page || !page.isDeletable) {
      return; // Cannot delete home page or non-deletable pages
    }

    const updatedPages = currentPages.filter(p => p.id !== pageId);
    this._pages.next(updatedPages);

    // If deleted page was current, switch to home
    if (this._currentPageId.value === pageId) {
      this.setCurrentPage('home');
    }
  }

  updatePageName(pageId: string, newName: string): void {
    const currentPages = this._pages.value;
    const updatedPages = currentPages.map(page => 
      page.id === pageId ? { ...page, name: newName } : page
    );
    this._pages.next(updatedPages);
  }

  updatePageRoute(pageId: string, newRoute: string): void {
    const currentPages = this._pages.value;
    const page = currentPages.find(p => p.id === pageId);
    
    if (!page || page.id === 'home') {
      return; // Cannot change home page route
    }

    const route = newRoute.startsWith('/') ? newRoute : `/${newRoute}`;
    const updatedPages = currentPages.map(page => 
      page.id === pageId ? { ...page, route } : page
    );
    this._pages.next(updatedPages);
  }

  setCurrentPage(pageId: string): void {
    this._currentPageId.next(pageId);
    
    // Update page active states
    const currentPages = this._pages.value;
    const updatedPages = currentPages.map(page => ({
      ...page,
      isActive: page.id === pageId
    }));
    this._pages.next(updatedPages);
  }

  getCurrentPage(): WebsitePage | undefined {
    const currentPageId = this._currentPageId.value;
    return this._pages.value.find(p => p.id === currentPageId);
  }

  // Navigation menu generation for Top Navigation component
  getNavigationMenuItems(): { name: string; route: string; isActive: boolean }[] {
    return this._pages.value.map(page => ({
      name: page.name,
      route: page.route,
      isActive: page.isActive
    }));
  }
}
