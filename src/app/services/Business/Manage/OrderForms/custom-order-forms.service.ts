import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { 
  CustomOrderFormsTable, 
  CustomOrderFormsJson, 
  CustomForm, 
  CustomFormComponent, 
  CustomFormComponentType,
  CustomFormStatus,
  CustomFormTheme,
  CustomFormTemplate,
  TemplateCategory,
  CustomFormSubmission,
  FormBuilderState,
  ValidationError,
  FormServiceJunction
} from '../../../../models/custom-order-forms.model';

interface ComponentPaletteItem {
  type: CustomFormComponentType;
  name: string;
  icon: string;
  description: string;
  category: string;
}

@Injectable({
  providedIn: 'root'
})
export class CustomOrderFormsService {
  private readonly API_BASE = '/api/custom-order-forms';
  
  // State management
  private formsSubject = new BehaviorSubject<CustomForm[]>([]);
  private builderStateSubject = new BehaviorSubject<FormBuilderState | null>(null);
  
  public forms$ = this.formsSubject.asObservable();
  public builderState$ = this.builderStateSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ==== FORM CRUD OPERATIONS ====

  /**
   * Get all forms for a business
   */
  getBusinessForms(businessId: string): Observable<CustomForm[]> {
    return this.http.get<CustomOrderFormsTable>(`${this.API_BASE}/${businessId}`)
      .pipe(
        map(response => response.formJson.forms),
        tap(forms => this.formsSubject.next(forms)),
        catchError(error => {
          console.error('Error loading business forms:', error);
          return of([]);
        })
      );
  }

  /**
   * Get a specific form by ID
   */
  getForm(businessId: string, formId: string): Observable<CustomForm | null> {
    return this.getBusinessForms(businessId).pipe(
      map(forms => forms.find(form => form.formId === formId) || null)
    );
  }

  /**
   * Create a new form
   */
  createForm(businessId: string, formData: Partial<CustomForm>): Observable<CustomForm> {
    const newForm: CustomForm = {
      formId: this.generateId(),
      formName: formData.formName || 'Untitled Form',
      description: formData.description || '',
      status: CustomFormStatus.DRAFT,
      createdDate: new Date(),
      updatedDate: new Date(),
      isPublished: false,
      settings: {
        allowMultipleSubmissions: true,
        requireAuthentication: false,
        sendEmailNotifications: true,
        theme: CustomFormTheme.DEFAULT,
        ...formData.settings
      },
      components: formData.components || [],
      ...formData
    };

    return this.http.post<CustomForm>(`${this.API_BASE}/${businessId}/forms`, newForm)
      .pipe(
        tap(createdForm => {
          const currentForms = this.formsSubject.value;
          this.formsSubject.next([...currentForms, createdForm]);
        }),
        catchError(error => {
          console.error('Error creating form:', error);
          throw error;
        })
      );
  }

  /**
   * Update an existing form
   */
  updateForm(businessId: string, formId: string, formData: Partial<CustomForm>): Observable<CustomForm> {
    const updateData = {
      ...formData,
      updatedDate: new Date()
    };

    return this.http.put<CustomForm>(`${this.API_BASE}/${businessId}/forms/${formId}`, updateData)
      .pipe(
        tap(updatedForm => {
          const currentForms = this.formsSubject.value;
          const index = currentForms.findIndex(form => form.formId === formId);
          if (index !== -1) {
            currentForms[index] = updatedForm;
            this.formsSubject.next([...currentForms]);
          }
        }),
        catchError(error => {
          console.error('Error updating form:', error);
          throw error;
        })
      );
  }

  /**
   * Delete a form
   */
  deleteForm(businessId: string, formId: string): Observable<boolean> {
    return this.http.delete(`${this.API_BASE}/${businessId}/forms/${formId}`)
      .pipe(
        map(() => true),
        tap(() => {
          const currentForms = this.formsSubject.value;
          this.formsSubject.next(currentForms.filter(form => form.formId !== formId));
        }),
        catchError(error => {
          console.error('Error deleting form:', error);
          return of(false);
        })
      );
  }

  /**
   * Duplicate a form
   */
  duplicateForm(businessId: string, formId: string, newName?: string): Observable<CustomForm> {
    return this.getForm(businessId, formId).pipe(
      map(originalForm => {
        if (!originalForm) {
          throw new Error('Form not found');
        }

        const duplicatedForm: CustomForm = {
          ...originalForm,
          formId: this.generateId(),
          formName: newName || `${originalForm.formName} (Copy)`,
          status: CustomFormStatus.DRAFT,
          isPublished: false,
          createdDate: new Date(),
          updatedDate: new Date(),
          components: originalForm.components.map(comp => ({
            ...comp,
            id: this.generateId() // Generate new IDs for components
          }))
        };

        return duplicatedForm;
      }),
      switchMap(duplicatedForm => this.createForm(businessId, duplicatedForm))
    );
  }

  // ==== FORM COMPONENT OPERATIONS ====

  /**
   * Add a component to a form
   */
  addComponent(businessId: string, formId: string, component: Omit<CustomFormComponent, 'id' | 'order'>): Observable<CustomForm> {
    return this.getForm(businessId, formId).pipe(
      map(form => {
        if (!form) throw new Error('Form not found');

        const newComponent: CustomFormComponent = {
          ...component,
          id: this.generateId(),
          order: form.components.length
        };

        const updatedForm = {
          ...form,
          components: [...form.components, newComponent]
        };

        return updatedForm;
      }),
      switchMap(updatedForm => this.updateForm(businessId, formId, updatedForm))
    );
  }

  /**
   * Update a component in a form
   */
  updateComponent(businessId: string, formId: string, componentId: string, componentData: Partial<CustomFormComponent>): Observable<CustomForm> {
    return this.getForm(businessId, formId).pipe(
      map(form => {
        if (!form) throw new Error('Form not found');

        const componentIndex = form.components.findIndex(comp => comp.id === componentId);
        if (componentIndex === -1) throw new Error('Component not found');

        const updatedComponents = [...form.components];
        updatedComponents[componentIndex] = { ...updatedComponents[componentIndex], ...componentData };

        return {
          ...form,
          components: updatedComponents
        };
      }),
      switchMap(updatedForm => this.updateForm(businessId, formId, updatedForm))
    );
  }

  /**
   * Remove a component from a form
   */
  removeComponent(businessId: string, formId: string, componentId: string): Observable<CustomForm> {
    return this.getForm(businessId, formId).pipe(
      map(form => {
        if (!form) throw new Error('Form not found');

        const updatedComponents = form.components
          .filter(comp => comp.id !== componentId)
          .map((comp, index) => ({ ...comp, order: index })); // Reorder

        return {
          ...form,
          components: updatedComponents
        };
      }),
      switchMap(updatedForm => this.updateForm(businessId, formId, updatedForm))
    );
  }

  /**
   * Reorder components in a form
   */
  reorderComponents(businessId: string, formId: string, componentIds: string[]): Observable<CustomForm> {
    return this.getForm(businessId, formId).pipe(
      map(form => {
        if (!form) throw new Error('Form not found');

        const componentsMap = new Map(form.components.map(comp => [comp.id, comp]));
        const reorderedComponents = componentIds
          .map((id, index) => {
            const component = componentsMap.get(id);
            if (!component) throw new Error(`Component ${id} not found`);
            return { ...component, order: index };
          });

        return {
          ...form,
          components: reorderedComponents
        };
      }),
      switchMap(updatedForm => this.updateForm(businessId, formId, updatedForm))
    );
  }

  // ==== SERVICE JUNCTION OPERATIONS ====

  /**
   * Associate form with services
   */
  updateFormServices(businessId: string, formId: string, serviceIds: string[]): Observable<boolean> {
    const junctionData = {
      formId,
      serviceIds
    };

    return this.http.put(`${this.API_BASE}/${businessId}/forms/${formId}/services`, junctionData)
      .pipe(
        map(() => true),
        catchError(error => {
          console.error('Error updating form services:', error);
          return of(false);
        })
      );
  }

  /**
   * Get services associated with a form
   */
  getFormServices(businessId: string, formId: string): Observable<FormServiceJunction | null> {
    return this.http.get<FormServiceJunction>(`${this.API_BASE}/${businessId}/forms/${formId}/services`)
      .pipe(
        catchError(error => {
          console.error('Error loading form services:', error);
          return of(null);
        })
      );
  }

  // ==== FORM TEMPLATES ====

  /**
   * Get available form templates
   */
  getFormTemplates(category?: TemplateCategory): Observable<CustomFormTemplate[]> {
    const url = category ? `${this.API_BASE}/templates?category=${category}` : `${this.API_BASE}/templates`;
    
    return this.http.get<CustomFormTemplate[]>(url)
      .pipe(
        catchError(error => {
          console.error('Error loading form templates:', error);
          return of(this.getDefaultTemplates(category));
        })
      );
  }

  /**
   * Create form from template
   */
  createFormFromTemplate(businessId: string, templateId: string, customName?: string): Observable<CustomForm> {
    return this.http.post<CustomForm>(`${this.API_BASE}/${businessId}/forms/from-template/${templateId}`, {
      customName
    }).pipe(
      tap(createdForm => {
        const currentForms = this.formsSubject.value;
        this.formsSubject.next([...currentForms, createdForm]);
      }),
      catchError(error => {
        console.error('Error creating form from template:', error);
        throw error;
      })
    );
  }

  // ==== FORM BUILDER STATE MANAGEMENT ====

  /**
   * Initialize form builder
   */
  initializeBuilder(form?: CustomForm): void {
    const builderState: FormBuilderState = {
      currentForm: form || this.createEmptyForm(),
      selectedComponent: null,
      isDirty: false,
      isPreviewMode: false,
      validationErrors: []
    };

    this.builderStateSubject.next(builderState);
  }

  /**
   * Update builder state
   */
  updateBuilderState(updates: Partial<FormBuilderState>): void {
    const currentState = this.builderStateSubject.value;
    if (currentState) {
      this.builderStateSubject.next({
        ...currentState,
        ...updates
      });
    }
  }

  /**
   * Validate form
   */
  validateForm(form: CustomForm): ValidationError[] {
    const errors: ValidationError[] = [];

    // Form-level validation
    if (!form.formName.trim()) {
      errors.push({
        field: 'formName',
        message: 'Form name is required',
        severity: 'error'
      });
    }

    if (form.components.length === 0) {
      errors.push({
        field: 'components',
        message: 'Form must have at least one component',
        severity: 'warning'
      });
    }

    // Component-level validation
    form.components.forEach((component, index) => {
      if (!component.label.trim()) {
        errors.push({
          componentId: component.id,
          field: 'label',
          message: `Component ${index + 1}: Label is required`,
          severity: 'error'
        });
      }

      // Type-specific validation
      if ([CustomFormComponentType.DROPDOWN, CustomFormComponentType.RADIO, CustomFormComponentType.MULTISELECT].includes(component.type)) {
        if (!component.options || component.options.length === 0) {
          errors.push({
            componentId: component.id,
            field: 'options',
            message: `Component ${index + 1}: Options are required for ${component.type}`,
            severity: 'error'
          });
        }
      }
    });

    return errors;
  }

  // ==== FORM SUBMISSIONS ====

  /**
   * Get form submissions
   */
  getFormSubmissions(businessId: string, formId: string, page = 1, limit = 50): Observable<{submissions: CustomFormSubmission[], total: number}> {
    return this.http.get<{submissions: CustomFormSubmission[], total: number}>(
      `${this.API_BASE}/${businessId}/forms/${formId}/submissions?page=${page}&limit=${limit}`
    ).pipe(
      catchError(error => {
        console.error('Error loading form submissions:', error);
        return of({submissions: [], total: 0});
      })
    );
  }

  /**
   * Export form
   */
  exportForm(businessId: string, formIds: string[]): Observable<Blob> {
    return this.http.post(`${this.API_BASE}/${businessId}/export`, 
      { formIds }, 
      { responseType: 'blob' }
    ).pipe(
      catchError(error => {
        console.error('Error exporting forms:', error);
        throw error;
      })
    );
  }

  // ==== UTILITY METHODS ====

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return 'form_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
  }

  /**
   * Create empty form
   */
  private createEmptyForm(): CustomForm {
    return {
      formId: this.generateId(),
      formName: 'New Form',
      description: '',
      status: CustomFormStatus.DRAFT,
      createdDate: new Date(),
      updatedDate: new Date(),
      isPublished: false,
      settings: {
        allowMultipleSubmissions: true,
        requireAuthentication: false,
        sendEmailNotifications: true,
        theme: CustomFormTheme.DEFAULT,
        submitButtonText: 'Submit Form'
      },
      components: []
    };
  }

  /**
   * Create form with custom name and description
   */
  createEmptyFormWithDetails(formName: string, description?: string): CustomForm {
    const form = this.createEmptyForm();
    form.formName = formName;
    form.description = description || '';
    return form;
  }

  /**
   * Validate form submission data
   */
  validateFormSubmission(form: CustomForm, submissionData: Record<string, any>): ValidationError[] {
    const errors: ValidationError[] = [];

    form.components.forEach((component, index) => {
      const value = submissionData[component.id];
      
      // Required field validation
      if (component.required && (!value || value === '' || value === null || value === undefined)) {
        errors.push({
          componentId: component.id,
          field: 'value',
          message: `${component.label} is required`,
          severity: 'error'
        });
        return;
      }

      // Skip validation if field is empty and not required
      if (!value || value === '') return;

      // Email validation
      if (component.type === CustomFormComponentType.EMAIL) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors.push({
            componentId: component.id,
            field: 'value',
            message: `Please enter a valid email address`,
            severity: 'error'
          });
        }
      }

      // Phone validation
      if (component.type === CustomFormComponentType.PHONE) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))) {
          errors.push({
            componentId: component.id,
            field: 'value',
            message: `Please enter a valid phone number`,
            severity: 'error'
          });
        }
      }

      // Number validation
      if (component.type === CustomFormComponentType.NUMBER) {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          errors.push({
            componentId: component.id,
            field: 'value',
            message: `Please enter a valid number`,
            severity: 'error'
          });
        } else {
          if (component.validation?.min !== undefined && numValue < component.validation.min) {
            errors.push({
              componentId: component.id,
              field: 'value',
              message: `Value must be at least ${component.validation.min}`,
              severity: 'error'
            });
          }
          if (component.validation?.max !== undefined && numValue > component.validation.max) {
            errors.push({
              componentId: component.id,
              field: 'value',
              message: `Value must be no more than ${component.validation.max}`,
              severity: 'error'
            });
          }
        }
      }

      // Text length validation
      if (component.type === CustomFormComponentType.TEXT || 
          component.type === CustomFormComponentType.TEXTAREA) {
        if (component.validation?.minLength && value.length < component.validation.minLength) {
          errors.push({
            componentId: component.id,
            field: 'value',
            message: `Must be at least ${component.validation.minLength} characters`,
            severity: 'error'
          });
        }
        if (component.validation?.maxLength && value.length > component.validation.maxLength) {
          errors.push({
            componentId: component.id,
            field: 'value',
            message: `Must be no more than ${component.validation.maxLength} characters`,
            severity: 'error'
          });
        }
      }
    });

    return errors;
  }

  /**
   * Get default templates when API fails
   */
  private getDefaultTemplates(category?: TemplateCategory): CustomFormTemplate[] {
    const templates: CustomFormTemplate[] = [
      {
        id: 'template_restaurant_order',
        name: 'Restaurant Order Form',
        description: 'Complete food ordering system with menu selection',
        category: TemplateCategory.RESTAURANT,
        tags: ['restaurant', 'food', 'order', 'delivery'],
        template: {
          formName: 'Restaurant Order Form',
          description: 'Order your favorite meals online',
          status: CustomFormStatus.DRAFT,
          isPublished: false,
          settings: {
            allowMultipleSubmissions: true,
            requireAuthentication: false,
            sendEmailNotifications: true,
            theme: CustomFormTheme.MODERN
          },
          components: [
            {
              id: 'comp_name',
              name: 'Customer Name',
              type: CustomFormComponentType.TEXT,
              label: 'Full Name',
              required: true,
              order: 0,
              placeholder: 'Enter your full name'
            },
            {
              id: 'comp_phone',
              name: 'Phone Number',
              type: CustomFormComponentType.PHONE,
              label: 'Phone Number',
              required: true,
              order: 1,
              placeholder: '+1 (555) 123-4567'
            },
            {
              id: 'comp_order_type',
              name: 'Order Type',
              type: CustomFormComponentType.RADIO,
              label: 'Order Type',
              required: true,
              order: 2,
              options: [
                { value: 'dine_in', label: 'Dine In' },
                { value: 'takeout', label: 'Takeout' },
                { value: 'delivery', label: 'Delivery' }
              ]
            },
            {
              id: 'comp_delivery_date',
              name: 'Delivery Date',
              type: CustomFormComponentType.CALENDAR,
              label: 'Preferred Delivery Date',
              required: false,
              order: 3,
              minDate: new Date()
            },
            {
              id: 'comp_special_instructions',
              name: 'Special Instructions',
              type: CustomFormComponentType.TEXTAREA,
              label: 'Special Instructions',
              required: false,
              order: 4,
              placeholder: 'Any dietary restrictions or special requests...'
            }
          ]
        }
      },
      {
        id: 'template_service_booking',
        name: 'Service Booking Form',
        description: 'Professional service appointment scheduling',
        category: TemplateCategory.SERVICE_BOOKING,
        tags: ['service', 'booking', 'appointment', 'professional'],
        template: {
          formName: 'Service Booking Form',
          description: 'Book your service appointment',
          status: CustomFormStatus.DRAFT,
          isPublished: false,
          settings: {
            allowMultipleSubmissions: false,
            requireAuthentication: true,
            sendEmailNotifications: true,
            theme: CustomFormTheme.CORPORATE
          },
          components: [
            {
              id: 'comp_client_name',
              name: 'Client Name',
              type: CustomFormComponentType.TEXT,
              label: 'Full Name',
              required: true,
              order: 0
            },
            {
              id: 'comp_email',
              name: 'Email Address',
              type: CustomFormComponentType.EMAIL,
              label: 'Email Address',
              required: true,
              order: 1
            },
            {
              id: 'comp_service_type',
              name: 'Service Type',
              type: CustomFormComponentType.DROPDOWN,
              label: 'Service Type',
              required: true,
              order: 2,
              options: [
                { value: 'consultation', label: 'Consultation' },
                { value: 'maintenance', label: 'Maintenance' },
                { value: 'installation', label: 'Installation' },
                { value: 'repair', label: 'Repair' }
              ]
            },
            {
              id: 'comp_preferred_dates',
              name: 'Preferred Date Range',
              type: CustomFormComponentType.CALENDAR_RANGE,
              label: 'Preferred Date Range',
              required: true,
              order: 3,
              dateRange: true
            }
          ]
        }
      }
    ];

    return category ? templates.filter(t => t.category === category) : templates;
  }

  // ==== COMPONENT PALETTE ====

  /**
   * Get component palette items
   */
  getComponentPalette(): ComponentPaletteItem[] {
    return [
      // Basic Input
      { type: CustomFormComponentType.TEXT, name: 'Text Input', icon: 'pi-pencil', description: 'Single line text input', category: 'Basic' },
      { type: CustomFormComponentType.EMAIL, name: 'Email', icon: 'pi-envelope', description: 'Email address input', category: 'Basic' },
      { type: CustomFormComponentType.PHONE, name: 'Phone', icon: 'pi-phone', description: 'Phone number input', category: 'Basic' },
      { type: CustomFormComponentType.NUMBER, name: 'Number', icon: 'pi-hashtag', description: 'Numeric input', category: 'Basic' },
      { type: CustomFormComponentType.TEXTAREA, name: 'Text Area', icon: 'pi-align-left', description: 'Multi-line text input', category: 'Basic' },
      
      // Selection
      { type: CustomFormComponentType.DROPDOWN, name: 'Dropdown', icon: 'pi-chevron-down', description: 'Single select dropdown', category: 'Selection' },
      { type: CustomFormComponentType.MULTISELECT, name: 'Multi Select', icon: 'pi-list', description: 'Multiple selection dropdown', category: 'Selection' },
      { type: CustomFormComponentType.RADIO, name: 'Radio Buttons', icon: 'pi-circle', description: 'Single choice selection', category: 'Selection' },
      { type: CustomFormComponentType.CHECKBOX, name: 'Checkbox', icon: 'pi-check-square', description: 'True/false toggle', category: 'Selection' },
      
      // Date & Time
      { type: CustomFormComponentType.CALENDAR, name: 'Date Picker', icon: 'pi-calendar', description: 'Single date selection', category: 'DateTime' },
      { type: CustomFormComponentType.CALENDAR_RANGE, name: 'Date Range', icon: 'pi-calendar-plus', description: 'Date range selection', category: 'DateTime' },
      
      // Advanced
      { type: CustomFormComponentType.FILE, name: 'File Upload', icon: 'pi-upload', description: 'File upload field', category: 'Advanced' },
      { type: CustomFormComponentType.RATING, name: 'Rating', icon: 'pi-star', description: 'Star rating input', category: 'Advanced' },
      { type: CustomFormComponentType.SLIDER, name: 'Slider', icon: 'pi-sliders-h', description: 'Range slider input', category: 'Advanced' },
      
      // Layout
      { type: CustomFormComponentType.HEADING, name: 'Heading', icon: 'pi-font', description: 'Section heading', category: 'Layout' },
      { type: CustomFormComponentType.PARAGRAPH, name: 'Paragraph', icon: 'pi-align-justify', description: 'Text paragraph', category: 'Layout' },
      { type: CustomFormComponentType.DIVIDER, name: 'Divider', icon: 'pi-minus', description: 'Section divider', category: 'Layout' }
    ];
  }

  /**
   * Get components by category
   */
  getComponentsByCategory(category: string): ComponentPaletteItem[] {
    return this.getComponentPalette().filter(item => item.category === category);
  }

  /**
   * Get all categories
   */
  getComponentCategories(): string[] {
    return [...new Set(this.getComponentPalette().map(item => item.category))];
  }

  /**
   * Get component icon
   */
  getComponentIcon(componentType: CustomFormComponentType): string {
    const component = this.getComponentPalette().find(p => p.type === componentType);
    return component ? component.icon : 'pi-circle';
  }

  /**
   * Get component default label
   */
  getComponentDefaultLabel(type: CustomFormComponentType): string {
    const item = this.getComponentPalette().find(p => p.type === type);
    return item ? item.name : 'Component';
  }

  /**
   * Get component default placeholder
   */
  getComponentDefaultPlaceholder(type: CustomFormComponentType): string {
    const placeholders: Record<string, string> = {
      [CustomFormComponentType.TEXT]: 'Enter text...',
      [CustomFormComponentType.EMAIL]: 'Enter email address...',
      [CustomFormComponentType.PHONE]: 'Enter phone number...',
      [CustomFormComponentType.NUMBER]: 'Enter number...',
      [CustomFormComponentType.TEXTAREA]: 'Enter detailed information...',
      [CustomFormComponentType.DROPDOWN]: 'Select an option...',
      [CustomFormComponentType.MULTISELECT]: 'Select multiple options...',
      [CustomFormComponentType.CALENDAR]: 'Select date...',
      [CustomFormComponentType.CALENDAR_RANGE]: 'Select date range...'
    };

    return placeholders[type] || 'Enter value...';
  }

  /**
   * Get component defaults
   */
  getComponentDefaults(type: CustomFormComponentType): Partial<CustomFormComponent> {
    const defaults: Record<string, Partial<CustomFormComponent>> = {
      [CustomFormComponentType.DROPDOWN]: {
        options: [
          { value: 'option_1', label: 'Option 1', selected: false, disabled: false },
          { value: 'option_2', label: 'Option 2', selected: false, disabled: false },
          { value: 'option_3', label: 'Option 3', selected: false, disabled: false }
        ]
      },
      [CustomFormComponentType.MULTISELECT]: {
        options: [
          { value: 'option_1', label: 'Option 1', selected: false, disabled: false },
          { value: 'option_2', label: 'Option 2', selected: false, disabled: false },
          { value: 'option_3', label: 'Option 3', selected: false, disabled: false }
        ],
        allowMultiple: true
      },
      [CustomFormComponentType.RADIO]: {
        options: [
          { value: 'option_1', label: 'Option 1', selected: false, disabled: false },
          { value: 'option_2', label: 'Option 2', selected: false, disabled: false },
          { value: 'option_3', label: 'Option 3', selected: false, disabled: false }
        ]
      },
      [CustomFormComponentType.CHECKBOX_GROUP]: {
        options: [
          { value: 'option_1', label: 'Option 1', selected: false, disabled: false },
          { value: 'option_2', label: 'Option 2', selected: false, disabled: false },
          { value: 'option_3', label: 'Option 3', selected: false, disabled: false }
        ],
        allowMultiple: true
      },
      [CustomFormComponentType.FILE]: {
        maxFileSize: 5242880, // 5MB in bytes
        maxFiles: 1,
        allowedFileTypes: ['.pdf', '.doc', '.docx', '.jpg', '.png']
      },
      [CustomFormComponentType.IMAGE]: {
        maxFileSize: 5242880, // 5MB in bytes
        maxFiles: 1,
        allowedFileTypes: ['.jpg', '.jpeg', '.png', '.gif', '.webp']
      },
      [CustomFormComponentType.NUMBER]: {
        validation: {
          min: 0,
          max: 100
        }
      },
      [CustomFormComponentType.SLIDER]: {
        validation: {
          min: 0,
          max: 100
        }
      },
      [CustomFormComponentType.CALENDAR]: {
        dateFormat: 'mm/dd/yy'
      },
      [CustomFormComponentType.CALENDAR_RANGE]: {
        dateFormat: 'mm/dd/yy',
        dateRange: true
      },
      [CustomFormComponentType.HEADING]: {
        description: 'Section Heading'
      },
      [CustomFormComponentType.PARAGRAPH]: {
        description: 'This is a paragraph of text. You can edit this content in the properties panel.'
      }
    };

    return defaults[type] || {};
  }

  /**
   * Check if component type has options property
   */
  hasOptionsProperty(componentType: CustomFormComponentType): boolean {
    return [
      CustomFormComponentType.DROPDOWN,
      CustomFormComponentType.MULTISELECT,
      CustomFormComponentType.RADIO,
      CustomFormComponentType.CHECKBOX_GROUP
    ].includes(componentType);
  }

  // ==== COMPONENT TYPE HELPERS ====

  /**
   * Get available component types grouped by category
   */
  getComponentTypes(): { [category: string]: CustomFormComponentType[] } {
    return {
      'Basic Input': [
        CustomFormComponentType.TEXT,
        CustomFormComponentType.EMAIL,
        CustomFormComponentType.PHONE,
        CustomFormComponentType.NUMBER,
        CustomFormComponentType.TEXTAREA,
        CustomFormComponentType.PASSWORD
      ],
      'Selection': [
        CustomFormComponentType.DROPDOWN,
        CustomFormComponentType.MULTISELECT,
        CustomFormComponentType.RADIO,
        CustomFormComponentType.CHECKBOX,
        CustomFormComponentType.CHECKBOX_GROUP
      ],
      'Date & Time': [
        CustomFormComponentType.CALENDAR,
        CustomFormComponentType.CALENDAR_RANGE,
        CustomFormComponentType.TIME,
        CustomFormComponentType.DATETIME
      ],
      'File Upload': [
        CustomFormComponentType.FILE,
        CustomFormComponentType.IMAGE
      ],
      'Advanced': [
        CustomFormComponentType.RATING,
        CustomFormComponentType.SLIDER,
        CustomFormComponentType.SIGNATURE,
        CustomFormComponentType.LOCATION
      ],
      'Display': [
        CustomFormComponentType.HEADING,
        CustomFormComponentType.PARAGRAPH,
        CustomFormComponentType.DIVIDER,
        CustomFormComponentType.IMAGE_DISPLAY
      ]
    };
  }

  /**
   * Get component type metadata
   */
  getComponentMetadata(type: CustomFormComponentType): { name: string, icon: string, description: string } {
    const metadata = {
      [CustomFormComponentType.TEXT]: { name: 'Text Input', icon: 'pi-input-text', description: 'Single line text input' },
      [CustomFormComponentType.EMAIL]: { name: 'Email', icon: 'pi-envelope', description: 'Email address input with validation' },
      [CustomFormComponentType.PHONE]: { name: 'Phone', icon: 'pi-phone', description: 'Phone number input with formatting' },
      [CustomFormComponentType.NUMBER]: { name: 'Number', icon: 'pi-hashtag', description: 'Numeric input with validation' },
      [CustomFormComponentType.TEXTAREA]: { name: 'Text Area', icon: 'pi-align-left', description: 'Multi-line text input' },
      [CustomFormComponentType.PASSWORD]: { name: 'Password', icon: 'pi-lock', description: 'Password input field' },
      [CustomFormComponentType.DROPDOWN]: { name: 'Dropdown', icon: 'pi-chevron-down', description: 'Single selection dropdown' },
      [CustomFormComponentType.MULTISELECT]: { name: 'Multi Select', icon: 'pi-list', description: 'Multiple selection dropdown' },
      [CustomFormComponentType.RADIO]: { name: 'Radio Buttons', icon: 'pi-circle', description: 'Single choice radio buttons' },
      [CustomFormComponentType.CHECKBOX]: { name: 'Checkbox', icon: 'pi-check-square', description: 'Single checkbox' },
      [CustomFormComponentType.CHECKBOX_GROUP]: { name: 'Checkbox Group', icon: 'pi-th-large', description: 'Multiple checkboxes' },
      [CustomFormComponentType.CALENDAR]: { name: 'Calendar', icon: 'pi-calendar', description: 'Date picker' },
      [CustomFormComponentType.CALENDAR_RANGE]: { name: 'Date Range', icon: 'pi-calendar-times', description: 'Date range picker' },
      [CustomFormComponentType.TIME]: { name: 'Time', icon: 'pi-clock', description: 'Time picker' },
      [CustomFormComponentType.DATETIME]: { name: 'Date & Time', icon: 'pi-calendar-plus', description: 'Date and time picker' },
      [CustomFormComponentType.FILE]: { name: 'File Upload', icon: 'pi-upload', description: 'File upload component' },
      [CustomFormComponentType.IMAGE]: { name: 'Image Upload', icon: 'pi-image', description: 'Image upload with preview' },
      [CustomFormComponentType.RATING]: { name: 'Rating', icon: 'pi-star', description: 'Star rating component' },
      [CustomFormComponentType.SLIDER]: { name: 'Slider', icon: 'pi-sliders-h', description: 'Range slider input' },
      [CustomFormComponentType.SIGNATURE]: { name: 'Signature', icon: 'pi-pencil', description: 'Digital signature pad' },
      [CustomFormComponentType.LOCATION]: { name: 'Location', icon: 'pi-map-marker', description: 'Location picker with map' },
      [CustomFormComponentType.HEADING]: { name: 'Heading', icon: 'pi-heading', description: 'Section heading text' },
      [CustomFormComponentType.PARAGRAPH]: { name: 'Paragraph', icon: 'pi-paragraph', description: 'Descriptive text paragraph' },
      [CustomFormComponentType.DIVIDER]: { name: 'Divider', icon: 'pi-minus', description: 'Visual section divider' },
      [CustomFormComponentType.IMAGE_DISPLAY]: { name: 'Image Display', icon: 'pi-image', description: 'Display image content' }
    };

    return metadata[type] || { name: type, icon: 'pi-question', description: 'Unknown component type' };
  }
}