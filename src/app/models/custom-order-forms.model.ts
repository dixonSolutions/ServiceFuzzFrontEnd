// Custom Order Forms Model - JSONB Structure
// This represents the JSON structure stored in the database

export interface CustomOrderFormsTable {
  businessId: string;
  formJson: CustomOrderFormsJson;
}

export interface CustomOrderFormsJson {
  forms: CustomForm[];
  junction: FormServiceJunction[];
}

export interface CustomForm {
  formId: string;
  formName: string;
  description?: string;
  status: CustomFormStatus;
  createdDate: Date;
  updatedDate: Date;
  isPublished: boolean;
  settings: CustomFormSettings;
  components: CustomFormComponent[];
  analytics?: CustomFormAnalytics;
}

export interface CustomFormComponent {
  id: string;
  name: string;
  type: CustomFormComponentType;
  label: string;
  required: boolean;
  order: number;
  
  // Customizable properties by tag/component type
  placeholder?: string;
  description?: string;
  defaultValue?: any;
  validation?: CustomFieldValidation;
  
  // Type-specific properties
  options?: CustomComponentOption[]; // For select, multiselect, radio
  allowMultiple?: boolean; // For multiselect, checkbox groups
  dateFormat?: string; // For date components
  minDate?: Date; // For date/calendar components
  maxDate?: Date; // For date/calendar components
  dateRange?: boolean; // For calendar range
  
  // Advanced customization
  styling?: CustomComponentStyling;
  conditionalLogic?: ConditionalLogic;
  
  // File upload specific
  allowedFileTypes?: string[]; // For file uploads
  maxFileSize?: number; // In bytes
  maxFiles?: number; // For multiple file uploads
}

export interface CustomComponentOption {
  value: string;
  label: string;
  selected?: boolean;
  disabled?: boolean;
}

export interface CustomComponentStyling {
  cssClass?: string;
  width?: string;
  height?: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  fontSize?: string;
}

export interface ConditionalLogic {
  showIf?: ConditionalRule[];
  hideIf?: ConditionalRule[];
  requiredIf?: ConditionalRule[];
}

export interface ConditionalRule {
  fieldId: string;
  operator: ConditionalOperator;
  value: any;
}

export enum ConditionalOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  IS_EMPTY = 'is_empty',
  IS_NOT_EMPTY = 'is_not_empty'
}

export interface CustomFieldValidation {
  minLength?: number;
  maxLength?: number;
  min?: number; // For number inputs
  max?: number; // For number inputs
  pattern?: string; // Regex pattern
  customMessage?: string;
  
  // Email validation
  emailValidation?: boolean;
  
  // Phone validation
  phoneValidation?: boolean;
  phoneFormat?: string; // Country-specific format
  
  // Date validation
  minDate?: Date;
  maxDate?: Date;
  
  // File validation
  maxFileSize?: number;
  allowedExtensions?: string[];
}

export interface CustomFormSettings {
  allowMultipleSubmissions: boolean;
  requireAuthentication: boolean;
  sendEmailNotifications: boolean;
  notificationEmails?: string[];
  customSuccessMessage?: string;
  redirectUrl?: string;
  theme: CustomFormTheme;
  submitButtonText?: string; // Customizable submit button text
  
  // Advanced settings
  saveProgress?: boolean; // Allow users to save and continue later
  timeLimit?: number; // Time limit in minutes
  captchaEnabled?: boolean;
  termsAndConditions?: string; // URL or text
  privacyPolicy?: string; // URL or text
}

export interface CustomFormAnalytics {
  totalViews: number;
  totalSubmissions: number;
  conversionRate: number;
  averageCompletionTime: number; // In minutes
  dropOffPoints: DropOffPoint[];
  popularFields: FieldPopularity[];
  submissionsByDate: SubmissionDateData[];
}

export interface DropOffPoint {
  componentId: string;
  dropOffPercentage: number;
  dropOffCount: number;
}

export interface FieldPopularity {
  componentId: string;
  interactionCount: number;
  completionRate: number;
}

export interface SubmissionDateData {
  date: Date;
  submissionCount: number;
}

export interface FormServiceJunction {
  formId: string;
  services: FormService[];
}

export interface FormService {
  serviceId: string;
  serviceName?: string; // For display purposes
  isActive: boolean;
}

// Enums
export enum CustomFormStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVED = 'archived'
}

export enum CustomFormComponentType {
  // Basic input types
  TEXT = 'text',
  EMAIL = 'email',
  PHONE = 'phone',
  NUMBER = 'number',
  TEXTAREA = 'textarea',
  PASSWORD = 'password',
  
  // Selection types
  DROPDOWN = 'dropdown',
  MULTISELECT = 'multiselect',
  RADIO = 'radio',
  CHECKBOX = 'checkbox',
  CHECKBOX_GROUP = 'checkbox_group',
  
  // Date and time types
  CALENDAR = 'calendar',
  CALENDAR_RANGE = 'calendar_range',
  TIME = 'time',
  DATETIME = 'datetime',
  
  // File upload
  FILE = 'file',
  IMAGE = 'image',
  
  // Advanced types
  RATING = 'rating',
  SLIDER = 'slider',
  SIGNATURE = 'signature',
  LOCATION = 'location',
  
  // Display types
  HEADING = 'heading',
  PARAGRAPH = 'paragraph',
  DIVIDER = 'divider',
  IMAGE_DISPLAY = 'image_display'
}

export enum CustomFormTheme {
  DEFAULT = 'default',
  MODERN = 'modern',
  MINIMAL = 'minimal',
  CORPORATE = 'corporate',
  CREATIVE = 'creative',
  BOOTSTRAP = 'bootstrap',
  MATERIAL = 'material'
}

// Form Submission Interfaces
export interface CustomFormSubmission {
  id: string;
  formId: string;
  businessId: string;
  submittedAt: Date;
  customerInfo: CustomerInfo;
  submissionData: Record<string, any>; // Key-value pairs of component answers
  status: SubmissionStatus;
  notes?: string;
  processedAt?: Date;
  processedBy?: string;
  attachments?: SubmissionAttachment[];
}

export interface CustomerInfo {
  name?: string;
  email?: string;
  phone?: string;
  customFields?: Record<string, any>;
}

export interface SubmissionAttachment {
  id: string;
  filename: string;
  fileSize: number;
  fileType: string;
  uploadedAt: Date;
  url: string;
  componentId: string; // Which form component this attachment belongs to
}

export enum SubmissionStatus {
  NEW = 'new',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ARCHIVED = 'archived'
}

// Form Templates for Quick Start
export interface CustomFormTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  tags: string[];
  previewImage?: string;
  template: Omit<CustomForm, 'formId' | 'createdDate' | 'updatedDate'>;
}

export enum TemplateCategory {
  RESTAURANT = 'restaurant',
  SERVICE_BOOKING = 'service_booking',
  PRODUCT_INQUIRY = 'product_inquiry',
  EVENT_REGISTRATION = 'event_registration',
  APPOINTMENT = 'appointment',
  SURVEY = 'survey',
  CONTACT = 'contact',
  LEAD_GENERATION = 'lead_generation',
  FEEDBACK = 'feedback',
  BOOKING = 'booking',
  ORDER = 'order',
  CONSULTATION = 'consultation',
  GENERAL = 'general'
}

// Builder/Creator interfaces
export interface FormBuilderState {
  currentForm: CustomForm;
  selectedComponent: CustomFormComponent | null;
  isDirty: boolean;
  isPreviewMode: boolean;
  validationErrors: ValidationError[];
}

export interface ValidationError {
  componentId?: string;
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

// Component Drag and Drop
export interface DraggedComponent {
  type: CustomFormComponentType;
  isNew: boolean;
  componentData?: CustomFormComponent;
}

// Form Export/Import
export interface FormExport {
  version: string;
  exportedAt: Date;
  businessId: string;
  forms: CustomForm[];
}

export interface FormImportResult {
  success: boolean;
  importedForms: string[]; // Form IDs that were imported
  errors: ImportError[];
  warnings: ImportWarning[];
}

export interface ImportError {
  formId?: string;
  componentId?: string;
  message: string;
  details?: any;
}

export interface ImportWarning {
  formId?: string;
  componentId?: string;
  message: string;
  suggestion?: string;
}