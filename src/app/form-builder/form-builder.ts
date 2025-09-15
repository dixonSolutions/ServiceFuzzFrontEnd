import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Subject, takeUntil } from 'rxjs';
import {
  CustomForm,
  CustomFormComponent,
  CustomFormComponentType,
  CustomFormStatus,
  CustomFormTheme,
  FormBuilderState,
  ValidationError
} from '../models/custom-order-forms.model';
import { CustomOrderFormsService } from '../services/Business/Manage/OrderForms/custom-order-forms.service';

@Component({
  selector: 'app-form-builder',
  standalone: false,
  templateUrl: './form-builder.html',
  styleUrl: './form-builder.css'
})
export class FormBuilderComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Form Builder State
  builderState: FormBuilderState | null = null;
  selectedComponent: CustomFormComponent | null = null;
  validationErrors: ValidationError[] = [];
  isPreviewMode = false;
  isDirty = false;

  // Form creation dialog
  showFormCreationDialog = false;
  newFormName = '';
  newFormDescription = '';
  
  // Edit form dialog
  showEditFormDialog = false;
  editFormName = '';
  editFormDescription = '';
  
  // Preview form submission data
  previewFormData: Record<string, any> = {};
  previewValidationErrors: ValidationError[] = [];

  // Form Components (the actual form being built)
  formComponents: CustomFormComponent[] = [];

  // Current business ID
  businessId = 'current-business-id'; // TODO: Get from auth service

  constructor(
    private router: Router,
    private customFormsService: CustomOrderFormsService
  ) {}

  ngOnInit() {
    this.subscribeToBuilderState();
    // Show dialog immediately
    this.showFormCreationDialog = true;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeNewForm(formName: string, description?: string) {
    const newForm = this.customFormsService.createEmptyFormWithDetails(formName, description);
    this.customFormsService.initializeBuilder(newForm);
  }

  private subscribeToBuilderState() {
    this.customFormsService.builderState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.builderState = state;
        if (state?.currentForm) {
          this.formComponents = state.currentForm.components || [];
          this.selectedComponent = state.selectedComponent || null;
          this.validationErrors = state.validationErrors || [];
          this.isPreviewMode = state.isPreviewMode || false;
          this.isDirty = state.isDirty || false;
        } else {
          // Initialize empty state
          this.formComponents = [];
          this.selectedComponent = null;
          this.validationErrors = [];
          this.isPreviewMode = false;
          this.isDirty = false;
        }
      });
  }

  // Drag and Drop Handlers
  onComponentDrop(event: CdkDragDrop<any[]>) {
    if (event.previousContainer === event.container) {
      // Reordering within the form canvas
      moveItemInArray(this.formComponents, event.previousIndex, event.currentIndex);
      this.reorderComponents();
      this.markFormAsDirty();
    } else {
      // Adding new component from palette
      const componentType = event.previousContainer.data[event.previousIndex].type;
      this.addComponentAtPosition(componentType, event.currentIndex);
    }
  }

  onCanvasClick(event: Event) {
    // Only deselect if clicking on the canvas itself, not on child elements
    if ((event.target as HTMLElement).classList.contains('form-drop-zone') || 
        (event.target as HTMLElement).classList.contains('empty-form-state')) {
      this.selectedComponent = null;
      this.customFormsService.updateBuilderState({
        selectedComponent: null
      });
    }
  }

  onPaletteComponentClicked(componentType: CustomFormComponentType) {
    this.addComponent(componentType);
  }

  private addComponent(componentType: CustomFormComponentType) {
    const newComponent: CustomFormComponent = {
      id: this.generateComponentId(),
      name: this.customFormsService.getComponentDefaultLabel(componentType).replace(/\s+/g, '_').toLowerCase(),
      type: componentType,
      label: this.customFormsService.getComponentDefaultLabel(componentType),
      required: false,
      order: this.formComponents.length,
      placeholder: this.customFormsService.getComponentDefaultPlaceholder(componentType),
      ...this.customFormsService.getComponentDefaults(componentType)
    };

    this.formComponents.push(newComponent);
    this.markFormAsDirty();
    this.selectComponent(newComponent);
  }

  private addComponentAtPosition(componentType: CustomFormComponentType, position: number) {
    const newComponent: CustomFormComponent = {
      id: this.generateComponentId(),
      name: this.customFormsService.getComponentDefaultLabel(componentType).replace(/\s+/g, '_').toLowerCase(),
      type: componentType,
      label: this.customFormsService.getComponentDefaultLabel(componentType),
      required: false,
      order: position,
      placeholder: this.customFormsService.getComponentDefaultPlaceholder(componentType),
      ...this.customFormsService.getComponentDefaults(componentType)
    };

    this.formComponents.splice(position, 0, newComponent);
    this.reorderComponents();
    this.markFormAsDirty();
    this.selectComponent(newComponent);
  }

  private reorderComponents() {
    this.formComponents.forEach((component, index) => {
      component.order = index;
    });
  }

  private markFormAsDirty() {
    if (!this.builderState?.currentForm) return;

    const updatedForm = {
      ...this.builderState.currentForm,
      components: [...this.formComponents]
    };

    this.customFormsService.updateBuilderState({
      currentForm: updatedForm,
      isDirty: true
    });
  }

  // Component Management
  selectComponent(component: CustomFormComponent) {
    this.selectedComponent = component;
    this.customFormsService.updateBuilderState({
      selectedComponent: component
    });
  }

  removeComponent(componentId: string) {
    this.formComponents = this.formComponents.filter(comp => comp.id !== componentId);
    this.reorderComponents();
    this.markFormAsDirty();
    
    if (this.selectedComponent?.id === componentId) {
      this.selectedComponent = null;
      this.customFormsService.updateBuilderState({
        selectedComponent: null
      });
    }
  }

  duplicateComponent(component: CustomFormComponent) {
    const duplicatedComponent: CustomFormComponent = {
      ...component,
      id: this.generateComponentId(),
      order: component.order + 1,
      label: `${component.label} (Copy)`
    };

    const insertIndex = this.formComponents.findIndex(c => c.id === component.id) + 1;
    this.formComponents.splice(insertIndex, 0, duplicatedComponent);
    this.reorderComponents();
    this.markFormAsDirty();
  }

  // Property Updates
  updateComponentProperty(property: string, value: any) {
    if (!this.selectedComponent) return;

    const updatedComponent = {
      ...this.selectedComponent,
      [property]: value
    };

    const componentIndex = this.formComponents.findIndex(c => c.id === this.selectedComponent!.id);
    if (componentIndex !== -1) {
      this.formComponents[componentIndex] = updatedComponent;
      this.selectedComponent = updatedComponent;
      this.markFormAsDirty();
      
      this.customFormsService.updateBuilderState({
        selectedComponent: updatedComponent
      });
    }
  }

  // Form Management
  updateFormProperty(property: string, value: any) {
    if (!this.builderState?.currentForm) {
      console.warn('Cannot update form property: builderState or currentForm is null');
      return;
    }

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
    if (!this.builderState?.currentForm?.settings) {
      console.warn('Cannot update form settings: builderState, currentForm, or settings is null');
      return;
    }

    const updatedSettings = {
      ...this.builderState.currentForm.settings,
      [property]: value
    };

    this.updateFormProperty('settings', updatedSettings);
  }

  togglePreviewMode() {
    this.isPreviewMode = !this.isPreviewMode;
    this.customFormsService.updateBuilderState({
      isPreviewMode: this.isPreviewMode
    });
  }

  saveForm() {
    if (!this.builderState?.currentForm) {
      console.warn('Cannot save form: no current form available');
      return;
    }

    // Validate form first
    const errors = this.customFormsService.validateForm(this.builderState.currentForm);
    this.customFormsService.updateBuilderState({ validationErrors: errors });

    if (errors.some(error => error.severity === 'error')) {
      console.warn('Cannot save form with validation errors:', errors);
      return;
    }

    // Create new form
    this.customFormsService.createForm(this.businessId, this.builderState.currentForm)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (createdForm) => {
          console.log('Form created successfully:', createdForm);
          this.customFormsService.updateBuilderState({ isDirty: false });
          this.router.navigate(['/business/forms']);
        },
        error: (error) => {
          console.error('Error creating form:', error);
        }
      });
  }

  cancelEditing() {
    if (this.isDirty) {
      if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        this.router.navigate(['/business/forms']);
      }
    } else {
      this.router.navigate(['/business/forms']);
    }
  }

  // Form Creation Dialog Methods
  onCreateFormConfirm() {
    if (this.newFormName.trim()) {
      this.initializeNewForm(this.newFormName.trim(), this.newFormDescription.trim() || undefined);
      this.showFormCreationDialog = false;
      this.newFormName = '';
      this.newFormDescription = '';
    }
  }

  onCreateFormCancel() {
    this.showFormCreationDialog = false;
    this.router.navigate(['/business/forms']);
  }

  // Edit Form Dialog Methods
  openEditFormDialog() {
    if (!this.builderState?.currentForm) return;
    
    this.editFormName = this.builderState.currentForm.formName;
    this.editFormDescription = this.builderState.currentForm.description || '';
    this.showEditFormDialog = true;
  }

  onEditFormConfirm() {
    if (this.editFormName.trim()) {
      this.updateFormProperty('formName', this.editFormName.trim());
      this.updateFormProperty('description', this.editFormDescription.trim() || '');
      this.showEditFormDialog = false;
      this.editFormName = '';
      this.editFormDescription = '';
    }
  }

  onEditFormCancel() {
    this.showEditFormDialog = false;
    this.editFormName = '';
    this.editFormDescription = '';
  }

  // Utility Methods
  private generateComponentId(): string {
    return 'comp_' + Math.random().toString(36).substr(2, 9);
  }

  getComponentsByCategory(category: string) {
    return this.customFormsService.getComponentsByCategory(category);
  }

  getCategories(): string[] {
    return this.customFormsService.getComponentCategories();
  }

  getPaletteDropListIds(): string[] {
    return this.getCategories().map(category => `palette-${category}`);
  }

  hasValidationErrors(): boolean {
    return this.validationErrors.some(error => error.severity === 'error');
  }

  // Component type checks for template
  hasOptionsProperty(componentType: CustomFormComponentType): boolean {
    return this.customFormsService.hasOptionsProperty(componentType);
  }

  getComponentIcon(componentType: CustomFormComponentType): string {
    return this.customFormsService.getComponentIcon(componentType);
  }

  // Options Management
  getComponentOptions(): any[] {
    if (!this.selectedComponent || !this.selectedComponent.options) {
      return [];
    }
    return this.selectedComponent.options;
  }

  addOption(): void {
    if (!this.selectedComponent) return;

    const currentOptions = this.selectedComponent.options || [];
    const newOption = {
      value: `option_${currentOptions.length + 1}`,
      label: `Option ${currentOptions.length + 1}`,
      selected: false,
      disabled: false
    };

    this.updateComponentProperty('options', [...currentOptions, newOption]);
  }

  removeOption(index: number): void {
    if (!this.selectedComponent || !this.selectedComponent.options) return;

    const updatedOptions = [...this.selectedComponent.options];
    updatedOptions.splice(index, 1);
    this.updateComponentProperty('options', updatedOptions);
  }

  updateOptionLabel(index: number, newLabel: string): void {
    if (!this.selectedComponent || !this.selectedComponent.options) return;

    const updatedOptions = [...this.selectedComponent.options];
    updatedOptions[index] = {
      ...updatedOptions[index],
      label: newLabel,
      value: newLabel.toLowerCase().replace(/\s+/g, '_')
    };
    this.updateComponentProperty('options', updatedOptions);
  }

  // Validation Property Updates
  updateValidationProperty(property: string, value: any): void {
    if (!this.selectedComponent) return;

    const currentValidation = this.selectedComponent.validation || {};
    const updatedValidation = {
      ...currentValidation,
      [property]: value
    };

    this.updateComponentProperty('validation', updatedValidation);
  }

  // File Types Update
  updateFileTypes(fileTypesString: string): void {
    if (!this.selectedComponent) return;

    const fileTypes = fileTypesString
      .split(',')
      .map(type => type.trim())
      .filter(type => type.length > 0);

    this.updateComponentProperty('allowedFileTypes', fileTypes);
  }

  // Preview Form Submission
  onPreviewFormSubmit(): void {
    if (!this.builderState?.currentForm) return;

    // Collect form data from preview inputs
    this.collectPreviewFormData();

    // Validate the form submission
    this.previewValidationErrors = this.customFormsService.validateFormSubmission(
      this.builderState.currentForm,
      this.previewFormData
    );

    // Update builder state with validation errors
    this.customFormsService.updateBuilderState({
      validationErrors: this.previewValidationErrors
    });

    // If no errors, show success message
    if (this.previewValidationErrors.length === 0) {
      console.log('Form submission successful!', this.previewFormData);
      // Here you could show a success message or submit the actual form
    }
  }

  private collectPreviewFormData(): void {
    // The preview form data is already being collected via updatePreviewFieldValue
    // This method ensures all components have an entry in the form data
    this.formComponents.forEach(component => {
      if (!(component.id in this.previewFormData)) {
        this.previewFormData[component.id] = null;
      }
    });
  }

  updatePreviewFieldValue(componentId: string, value: any): void {
    this.previewFormData[componentId] = value;
  }

  getPreviewFieldValue(componentId: string): any {
    return this.previewFormData[componentId] || '';
  }

  hasPreviewValidationError(componentId: string): boolean {
    return this.previewValidationErrors.some(error => error.componentId === componentId);
  }

  getPreviewValidationMessage(componentId: string): string {
    const error = this.previewValidationErrors.find(error => error.componentId === componentId);
    return error ? error.message : '';
  }
}