export interface OrderForm {
  id: string;
  name: string;
  description: string;
  status: FormStatus;
  createdDate: Date;
  updatedDate: Date;
  fields: FormField[];
  totalOrders: number;
  isPublished: boolean;
  formUrl?: string;
  businessId: string;
  settings: FormSettings;
  analytics: FormAnalytics;
}

export interface FormField {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: FieldValidation;
  order: number;
  description?: string;
}

export interface FormSettings {
  allowMultipleSubmissions: boolean;
  requireAuthentication: boolean;
  sendEmailNotifications: boolean;
  customSuccessMessage?: string;
  redirectUrl?: string;
  theme: FormTheme;
}

export interface FormAnalytics {
  totalViews: number;
  conversionRate: number;
  averageCompletionTime: number;
  dropOffPoints: DropOffPoint[];
}

export interface DropOffPoint {
  fieldId: string;
  dropOffPercentage: number;
}

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  customMessage?: string;
}

export enum FormStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  PAUSED = 'paused'
}

export enum FormFieldType {
  TEXT = 'text',
  EMAIL = 'email',
  PHONE = 'phone',
  NUMBER = 'number',
  TEXTAREA = 'textarea',
  SELECT = 'select',
  MULTISELECT = 'multiselect',
  RADIO = 'radio',
  CHECKBOX = 'checkbox',
  DATE = 'date',
  TIME = 'time',
  FILE = 'file'
}

export enum FormTheme {
  DEFAULT = 'default',
  MODERN = 'modern',
  MINIMAL = 'minimal',
  CORPORATE = 'corporate'
}

export interface FormSubmission {
  id: string;
  formId: string;
  submissionData: Record<string, any>;
  submittedAt: Date;
  customerEmail?: string;
  customerName?: string;
  status: SubmissionStatus;
  notes?: string;
}

export enum SubmissionStatus {
  NEW = 'new',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  fields: FormField[];
  previewImage?: string;
}

export enum TemplateCategory {
  RESTAURANT = 'restaurant',
  SERVICE = 'service',
  RETAIL = 'retail',
  HEALTHCARE = 'healthcare',
  EDUCATION = 'education',
  GENERAL = 'general'
} 