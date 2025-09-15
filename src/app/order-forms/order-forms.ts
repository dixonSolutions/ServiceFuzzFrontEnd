import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, switchMap } from 'rxjs';
import { 
  OrderForm, 
  FormField, 
  FormStatus, 
  FormFieldType, 
  FormSettings, 
  FormAnalytics, 
  FormTheme 
} from '../models/order-form.model';
import {
  CustomForm,
  CustomFormComponent,
  CustomFormComponentType,
  CustomFormStatus,
  CustomFormTemplate,
  TemplateCategory,
  FormBuilderState,
  ValidationError,
  CustomFormTheme
} from '../models/custom-order-forms.model';
import { CustomOrderFormsService } from '../services/Business/Manage/OrderForms/custom-order-forms.service';

@Component({
  selector: 'app-order-forms',
  standalone: false,
  templateUrl: './order-forms.html',
  styleUrl: './order-forms.css'
})
export class OrderForms implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  currentView: 'list' | 'single' | 'all' | 'create' | 'edit' = 'list';
  selectedFormId: string | null = null;
  forms: OrderForm[] = [];
  selectedForm: OrderForm | null = null;
  loading = false;

  // Custom forms
  customForms: CustomForm[] = [];
  selectedCustomForm: CustomForm | null = null;
  builderState: FormBuilderState | null = null;
  
  // Form builder state
  isCreatingForm = false;
  selectedComponentType: CustomFormComponentType | null = null;
  draggedComponent: any = null;
  showComponentLibrary = false;
  showFormSettings = false;
  validationErrors: ValidationError[] = [];
  
  // Templates
  templates: CustomFormTemplate[] = [];
  selectedTemplate: CustomFormTemplate | null = null;
  showTemplateDialog = false;
  
  // Current business ID (should come from auth service)
  businessId = 'current-business-id'; // TODO: Get from auth service

  // Enums for template
  FormStatus = FormStatus;
  FormFieldType = FormFieldType;
  CustomFormComponentType = CustomFormComponentType;
  CustomFormStatus = CustomFormStatus;
  CustomFormTheme = CustomFormTheme;
  TemplateCategory = TemplateCategory;

  // Sample data for demonstration (keeping original sample data)
  sampleForms: OrderForm[] = [
    {
      id: 'form-001',
      name: 'Restaurant Order Form',
      description: 'Complete online food ordering system with menu selection and delivery options',
      status: FormStatus.ACTIVE,
      createdDate: new Date('2024-01-15'),
      updatedDate: new Date('2024-02-20'),
      totalOrders: 145,
      isPublished: true,
      formUrl: 'https://servicefuzz.com/forms/restaurant-order',
      businessId: 'business-123',
      settings: {
        allowMultipleSubmissions: true,
        requireAuthentication: false,
        sendEmailNotifications: true,
        customSuccessMessage: 'Thank you for your order! We\'ll contact you shortly.',
        theme: FormTheme.MODERN
      },
      analytics: {
        totalViews: 1250,
        conversionRate: 11.6,
        averageCompletionTime: 3.2,
        dropOffPoints: [
          { fieldId: '4', dropOffPercentage: 15 }
        ]
      },
      fields: [
        { 
          id: '1', 
          label: 'Customer Name', 
          type: FormFieldType.TEXT, 
          required: true, 
          order: 1,
          placeholder: 'Enter your full name',
          validation: { minLength: 2, maxLength: 50 }
        },
        { 
          id: '2', 
          label: 'Phone Number', 
          type: FormFieldType.PHONE, 
          required: true, 
          order: 2,
          placeholder: '+1 (555) 123-4567',
          validation: { pattern: '^\\+?[1-9]\\d{1,14}$' }
        },
        { 
          id: '3', 
          label: 'Email Address', 
          type: FormFieldType.EMAIL, 
          required: false, 
          order: 3,
          placeholder: 'your.email@example.com'
        },
        { 
          id: '4', 
          label: 'Order Type', 
          type: FormFieldType.SELECT, 
          required: true, 
          order: 4,
          options: ['Dine-in', 'Takeout', 'Delivery'] 
        },
        { 
          id: '5', 
          label: 'Special Instructions', 
          type: FormFieldType.TEXTAREA, 
          required: false, 
          order: 5,
          placeholder: 'Any special requests or dietary restrictions...'
        }
      ]
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private customFormsService: CustomOrderFormsService
  ) {}

  ngOnInit() {
    this.loadForms();
    this.loadCustomForms();
    this.loadTemplates();
    this.handleRouting();
    this.subscribeToBuilderState();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private handleRouting() {
    this.route.url.subscribe(urlSegments => {
      const fullPath = urlSegments.map(segment => segment.path).join('/');
      
      if (fullPath === 'business/forms/all') {
        this.currentView = 'all';
        this.selectedForm = null;
      } else if (fullPath === 'business/forms/create') {
        this.currentView = 'create';
        this.initializeFormBuilder();
      } else if (fullPath.startsWith('business/forms') && this.route.snapshot.paramMap.get('id')) {
        const formId = this.route.snapshot.paramMap.get('id')!;
        if (this.route.snapshot.queryParams['edit'] === 'true') {
          this.currentView = 'edit';
          this.loadFormForEditing(formId);
        } else {
        this.currentView = 'single';
          this.selectedFormId = formId;
          this.loadSingleForm(formId);
        }
      } else {
        this.currentView = 'list';
        this.selectedForm = null;
      }
    });
  }

  private loadForms() {
    this.loading = false;
    // Simulate API call
    setTimeout(() => {
      this.forms = this.sampleForms;
      this.loading = false;
    }, 500);
  }

  private loadSingleForm(formId: string) {
    this.loading = true;
    // Simulate API call
    setTimeout(() => {
      this.selectedForm = this.forms.find(form => form.id === formId) || null;
      this.loading = false;
    }, 300);
  }

  private loadCustomForms() {
    this.customFormsService.getBusinessForms(this.businessId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (forms) => {
          this.customForms = forms;
        },
        error: (error) => {
          console.error('Error loading custom forms:', error);
        }
      });
  }

  private loadTemplates() {
    this.customFormsService.getFormTemplates()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (templates) => {
          this.templates = templates;
        },
        error: (error) => {
          console.error('Error loading templates:', error);
        }
      });
  }

  private subscribeToBuilderState() {
    this.customFormsService.builderState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.builderState = state;
        if (state) {
          this.validationErrors = state.validationErrors;
        }
      });
  }

  private initializeFormBuilder() {
    this.customFormsService.initializeBuilder();
    this.isCreatingForm = true;
    this.showComponentLibrary = true;
  }

  private loadFormForEditing(formId: string) {
    this.customFormsService.getForm(this.businessId, formId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (form) => {
          if (form) {
            this.selectedCustomForm = form;
            this.customFormsService.initializeBuilder(form);
            this.isCreatingForm = false;
            this.showComponentLibrary = true;
          }
        },
        error: (error) => {
          console.error('Error loading form for editing:', error);
        }
      });
  }

  // Navigation methods
  navigateToForm(formId: string) {
    this.router.navigate(['/business/forms', formId]);
  }

  navigateToAllForms() {
    this.router.navigate(['/business/forms/all']);
  }

  navigateToFormsList() {
    this.router.navigate(['/business/forms']);
  }

  createNewForm() {
    this.router.navigate(['/business/forms/create']);
  }

  editForm(formId: string) {
    this.router.navigate(['/business/forms', formId], { queryParams: { edit: 'true' } });
  }

  // Original methods
  getStatusSeverity(status: FormStatus): 'success' | 'info' | 'warn' | 'danger' {
    switch (status) {
      case FormStatus.ACTIVE: return 'success';
      case FormStatus.DRAFT: return 'info';
      case FormStatus.PAUSED: return 'warn';
      case FormStatus.ARCHIVED: return 'danger';
      default: return 'info';
    }
  }

  getStatusIcon(status: FormStatus): string {
    switch (status) {
      case FormStatus.ACTIVE: return 'pi-check-circle';
      case FormStatus.DRAFT: return 'pi-clock';
      case FormStatus.PAUSED: return 'pi-pause-circle';
      case FormStatus.ARCHIVED: return 'pi-archive';
      default: return 'pi-info-circle';
    }
  }

  duplicateForm(formId: string) {
    // Duplicate form functionality (would be implemented)
    console.log('Duplicate form:', formId);
  }

  deleteForm(formId: string) {
    // Delete form functionality (would be implemented)
    console.log('Delete form:', formId);
  }

  toggleFormStatus(formId: string) {
    const form = this.forms.find(f => f.id === formId);
    if (form) {
      form.status = form.status === FormStatus.ACTIVE ? FormStatus.PAUSED : FormStatus.ACTIVE;
      form.isPublished = form.status === FormStatus.ACTIVE;
    }
  }

  viewAnalytics(formId: string) {
    console.log('View analytics for form:', formId);
  }

  copyFormUrl(formUrl: string) {
    navigator.clipboard.writeText(formUrl);
    console.log('Form URL copied to clipboard');
  }

  // ==== FORM BUILDER METHODS ====

  addComponent(componentType: CustomFormComponentType) {
    if (!this.builderState?.currentForm) return;

    const newComponent: Omit<CustomFormComponent, 'id' | 'order'> = {
      name: this.getComponentDefaultName(componentType),
      type: componentType,
      label: this.getComponentDefaultLabel(componentType),
      required: false,
      placeholder: this.getComponentDefaultPlaceholder(componentType)
    };

    if (this.isCreatingForm) {
      // Add to builder state
      const updatedForm = {
        ...this.builderState.currentForm,
        components: [
          ...this.builderState.currentForm.components,
          {
            ...newComponent,
            id: this.generateComponentId(),
            order: this.builderState.currentForm.components.length
          }
        ]
      };

      this.customFormsService.updateBuilderState({
        currentForm: updatedForm,
        isDirty: true
      });
    } else {
      // Add to existing form
      this.customFormsService.addComponent(this.businessId, this.builderState.currentForm.formId, newComponent)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updatedForm) => {
            this.customFormsService.updateBuilderState({
              currentForm: updatedForm
            });
          },
          error: (error) => {
            console.error('Error adding component:', error);
          }
        });
    }
  }



  // ==== COMPONENT UTILITIES ====

  getComponentTypes() {
    return this.customFormsService.getComponentTypes();
  }

  getComponentMetadata(type: CustomFormComponentType) {
    return this.customFormsService.getComponentMetadata(type);
  }

  private getComponentDefaultName(type: CustomFormComponentType): string {
    const metadata = this.getComponentMetadata(type);
    return metadata.name.replace(/\s+/g, '_').toLowerCase();
  }

  private getComponentDefaultLabel(type: CustomFormComponentType): string {
    const metadata = this.getComponentMetadata(type);
    return metadata.name;
  }

  private getComponentDefaultPlaceholder(type: CustomFormComponentType): string {
    const placeholders: Record<CustomFormComponentType, string> = {
      [CustomFormComponentType.TEXT]: 'Enter text...',
      [CustomFormComponentType.EMAIL]: 'Enter email address...',
      [CustomFormComponentType.PHONE]: 'Enter phone number...',
      [CustomFormComponentType.NUMBER]: 'Enter number...',
      [CustomFormComponentType.TEXTAREA]: 'Enter detailed information...',
      [CustomFormComponentType.PASSWORD]: 'Enter password...',
      [CustomFormComponentType.DROPDOWN]: 'Select an option...',
      [CustomFormComponentType.MULTISELECT]: 'Select multiple options...',
      [CustomFormComponentType.RADIO]: 'Select an option...',
      [CustomFormComponentType.CHECKBOX]: 'Check if applicable...',
      [CustomFormComponentType.CHECKBOX_GROUP]: 'Select all that apply...',
      [CustomFormComponentType.CALENDAR]: 'Select date...',
      [CustomFormComponentType.CALENDAR_RANGE]: 'Select date range...',
      [CustomFormComponentType.TIME]: 'Select time...',
      [CustomFormComponentType.DATETIME]: 'Select date and time...',
      [CustomFormComponentType.FILE]: 'Choose file...',
      [CustomFormComponentType.IMAGE]: 'Choose image...',
      [CustomFormComponentType.RATING]: 'Rate from 1 to 5...',
      [CustomFormComponentType.SLIDER]: 'Select value...',
      [CustomFormComponentType.SIGNATURE]: 'Sign here...',
      [CustomFormComponentType.LOCATION]: 'Select location...',
      [CustomFormComponentType.HEADING]: 'Heading text...',
      [CustomFormComponentType.PARAGRAPH]: 'Paragraph text...',
      [CustomFormComponentType.DIVIDER]: '',
      [CustomFormComponentType.IMAGE_DISPLAY]: ''
    };

    return placeholders[type] || 'Enter value...';
  }

  private generateComponentId(): string {
    return 'comp_' + Math.random().toString(36).substr(2, 9);
  }

  // ==== TEMPLATE METHODS ====

  getTemplatesByCategory(category: TemplateCategory): CustomFormTemplate[] {
    return this.templates.filter(template => template.category === category);
  }

  // Computed properties for template
  get activeFormsCount(): number {
    return this.forms.filter(form => form.status === FormStatus.ACTIVE).length +
           this.customForms.filter(form => form.status === CustomFormStatus.ACTIVE).length;
  }

  get totalOrdersCount(): number {
    return this.forms.reduce((sum, form) => sum + form.totalOrders, 0);
  }

  get draftFormsCount(): number {
    return this.forms.filter(form => form.status === FormStatus.DRAFT).length +
           this.customForms.filter(form => form.status === CustomFormStatus.DRAFT).length;
  }
  
  // ==== GETTER HELPERS ====
  
  get allForms(): (OrderForm | CustomForm)[] {
    return [...this.forms, ...this.customForms];
  }

  get totalCustomFormsCount(): number {
    return this.customForms.length;
  }

  get activeCustomFormsCount(): number {
    return this.customForms.filter(form => form.status === CustomFormStatus.ACTIVE).length;
  }

  get draftCustomFormsCount(): number {
    return this.customForms.filter(form => form.status === CustomFormStatus.DRAFT).length;
  }

  hasSelectedComponentWithOptions(): boolean {
    if (!this.builderState?.selectedComponent) return false;
    
    const optionTypes = [
      CustomFormComponentType.DROPDOWN, 
      CustomFormComponentType.MULTISELECT, 
      CustomFormComponentType.RADIO, 
      CustomFormComponentType.CHECKBOX_GROUP
    ];
    
    return optionTypes.includes(this.builderState.selectedComponent.type);
  }

  hasValidationErrors(): boolean {
    return this.validationErrors.some(error => error.severity === 'error');
  }

  updateFormProperty(property: string, value: any) {
    if (!this.builderState?.currentForm) return;

    const updatedForm = {
      ...this.builderState.currentForm,
      [property]: value
    };

    this.customFormsService.updateBuilderState({
      currentForm: updatedForm,
      isDirty: true
    });
  }

  updateFormSettings(property: string, value: any) {
    if (!this.builderState?.currentForm) return;

    const updatedForm = {
      ...this.builderState.currentForm,
      settings: {
        ...this.builderState.currentForm.settings,
        [property]: value
      }
    };

    this.customFormsService.updateBuilderState({
      currentForm: updatedForm,
      isDirty: true
    });
  }

  // Additional methods for form builder functionality
  cancelEditing() {
    if (this.builderState?.isDirty) {
      if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        this.router.navigate(['/business/forms']);
      }
    } else {
      this.router.navigate(['/business/forms']);
    }
  }

  saveForm() {
    if (!this.builderState?.currentForm) return;

    // Validate form first
    const errors = this.customFormsService.validateForm(this.builderState.currentForm);
    this.customFormsService.updateBuilderState({ validationErrors: errors });

    if (errors.some(error => error.severity === 'error')) {
      console.warn('Cannot save form with validation errors');
      return;
    }

    if (this.isCreatingForm) {
      // Create new form
      this.customFormsService.createForm(this.businessId, this.builderState.currentForm)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (createdForm) => {
            console.log('Form created successfully:', createdForm);
            this.router.navigate(['/business/forms']);
          },
          error: (error) => {
            console.error('Error creating form:', error);
          }
        });
    } else {
      // Update existing form
      this.customFormsService.updateForm(this.businessId, this.builderState.currentForm.formId, this.builderState.currentForm)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updatedForm) => {
            console.log('Form updated successfully:', updatedForm);
            this.customFormsService.updateBuilderState({ isDirty: false });
          },
          error: (error) => {
            console.error('Error updating form:', error);
          }
        });
    }
  }

  togglePreviewMode() {
    if (this.builderState) {
      this.customFormsService.updateBuilderState({
        isPreviewMode: !this.builderState.isPreviewMode
      });
    }
  }

  selectComponent(component: CustomFormComponent) {
    this.customFormsService.updateBuilderState({
      selectedComponent: component
    });
  }

  selectTemplate(template: CustomFormTemplate) {
    this.selectedTemplate = template;
  }

  openTemplateDialog() {
    this.showTemplateDialog = true;
  }

  closeTemplateDialog() {
    this.showTemplateDialog = false;
    this.selectedTemplate = null;
  }

  createFormFromTemplate(template: CustomFormTemplate) {
    this.customFormsService.createFormFromTemplate(this.businessId, template.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (form) => {
          console.log('Form created from template:', form);
          this.router.navigate(['/business/forms', form.formId], { queryParams: { edit: 'true' } });
        },
        error: (error) => {
          console.error('Error creating form from template:', error);
        }
      });
  }

  updateComponent(componentId: string, updates: Partial<CustomFormComponent>) {
    if (!this.builderState?.currentForm) return;

    if (this.isCreatingForm) {
      // Update in builder state
      const updatedComponents = this.builderState.currentForm.components.map(comp =>
        comp.id === componentId ? { ...comp, ...updates } : comp
      );

      const updatedForm = {
        ...this.builderState.currentForm,
        components: updatedComponents
      };

      this.customFormsService.updateBuilderState({
        currentForm: updatedForm,
        isDirty: true
      });
    } else {
      // Update existing form
      this.customFormsService.updateComponent(this.businessId, this.builderState.currentForm.formId, componentId, updates)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updatedForm) => {
            this.customFormsService.updateBuilderState({
              currentForm: updatedForm
            });
          },
          error: (error) => {
            console.error('Error updating component:', error);
          }
        });
    }
  }

  removeComponent(componentId: string) {
    if (!this.builderState?.currentForm) return;

    if (this.isCreatingForm) {
      // Remove from builder state
      const updatedComponents = this.builderState.currentForm.components
        .filter(comp => comp.id !== componentId)
        .map((comp, index) => ({ ...comp, order: index }));

      const updatedForm = {
        ...this.builderState.currentForm,
        components: updatedComponents
      };

      this.customFormsService.updateBuilderState({
        currentForm: updatedForm,
        isDirty: true
      });
    } else {
      // Remove from existing form
      this.customFormsService.removeComponent(this.businessId, this.builderState.currentForm.formId, componentId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updatedForm) => {
            this.customFormsService.updateBuilderState({
              currentForm: updatedForm
            });
          },
          error: (error) => {
            console.error('Error removing component:', error);
          }
        });
    }
  }
}