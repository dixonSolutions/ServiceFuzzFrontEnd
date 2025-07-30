import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { 
  OrderForm, 
  FormField, 
  FormStatus, 
  FormFieldType, 
  FormSettings, 
  FormAnalytics, 
  FormTheme 
} from '../models/order-form.model';

@Component({
  selector: 'app-order-forms',
  standalone: false,
  templateUrl: './order-forms.html',
  styleUrl: './order-forms.css'
})
export class OrderForms implements OnInit {
  
  currentView: 'list' | 'single' | 'all' = 'list';
  selectedFormId: string | null = null;
  forms: OrderForm[] = [];
  selectedForm: OrderForm | null = null;
  loading = false;

  // Enums for template
  FormStatus = FormStatus;
  FormFieldType = FormFieldType;

  // Sample data for demonstration
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
    },
    {
      id: 'form-002',
      name: 'Service Booking Form',
      description: 'Professional service appointment scheduling with time slot management',
      status: FormStatus.ACTIVE,
      createdDate: new Date('2024-02-01'),
      updatedDate: new Date('2024-02-15'),
      totalOrders: 89,
      isPublished: true,
      formUrl: 'https://servicefuzz.com/forms/service-booking',
      businessId: 'business-123',
      settings: {
        allowMultipleSubmissions: false,
        requireAuthentication: true,
        sendEmailNotifications: true,
        customSuccessMessage: 'Your appointment has been scheduled. Check your email for confirmation.',
        theme: FormTheme.CORPORATE
      },
      analytics: {
        totalViews: 320,
        conversionRate: 27.8,
        averageCompletionTime: 2.8,
        dropOffPoints: []
      },
      fields: [
        { 
          id: '1', 
          label: 'Full Name', 
          type: FormFieldType.TEXT, 
          required: true, 
          order: 1,
          placeholder: 'Your full name'
        },
        { 
          id: '2', 
          label: 'Contact Number', 
          type: FormFieldType.PHONE, 
          required: true, 
          order: 2 
        },
        { 
          id: '3', 
          label: 'Service Type', 
          type: FormFieldType.SELECT, 
          required: true, 
          order: 3,
          options: ['Consultation', 'Maintenance', 'Installation', 'Repair'] 
        },
        { 
          id: '4', 
          label: 'Preferred Date', 
          type: FormFieldType.DATE, 
          required: true, 
          order: 4 
        },
        { 
          id: '5', 
          label: 'Additional Notes', 
          type: FormFieldType.TEXTAREA, 
          required: false, 
          order: 5 
        }
      ]
    },
    {
      id: 'form-003',
      name: 'Product Inquiry Form',
      description: 'Detailed product information requests with lead qualification',
      status: FormStatus.DRAFT,
      createdDate: new Date('2024-02-10'),
      updatedDate: new Date('2024-02-10'),
      totalOrders: 12,
      isPublished: false,
      businessId: 'business-123',
      settings: {
        allowMultipleSubmissions: true,
        requireAuthentication: false,
        sendEmailNotifications: true,
        theme: FormTheme.MINIMAL
      },
      analytics: {
        totalViews: 45,
        conversionRate: 26.7,
        averageCompletionTime: 1.5,
        dropOffPoints: []
      },
      fields: [
        { 
          id: '1', 
          label: 'Customer Name', 
          type: FormFieldType.TEXT, 
          required: true, 
          order: 1 
        },
        { 
          id: '2', 
          label: 'Email', 
          type: FormFieldType.EMAIL, 
          required: true, 
          order: 2 
        },
        { 
          id: '3', 
          label: 'Product Interest', 
          type: FormFieldType.SELECT, 
          required: true, 
          order: 3,
          options: ['Product A', 'Product B', 'Product C'] 
        },
        { 
          id: '4', 
          label: 'Budget Range', 
          type: FormFieldType.NUMBER, 
          required: false, 
          order: 4 
        }
      ]
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadForms();
    this.handleRouting();
  }

  private handleRouting() {
    this.route.url.subscribe(urlSegments => {
      const fullPath = urlSegments.map(segment => segment.path).join('/');
      
      if (fullPath === 'business/forms/all') {
        this.currentView = 'all';
        this.selectedForm = null;
      } else if (fullPath.startsWith('business/forms') && this.route.snapshot.paramMap.get('id')) {
        this.currentView = 'single';
        this.selectedFormId = this.route.snapshot.paramMap.get('id');
        this.loadSingleForm(this.selectedFormId!);
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

  navigateToForm(formId: string) {
    this.router.navigate(['/business/forms', formId]);
  }

  navigateToAllForms() {
    this.router.navigate(['/business/forms/all']);
  }

  navigateToFormsList() {
    this.router.navigate(['/business/forms']);
  }

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

  createNewForm() {
    // Navigate to form creation (would be implemented)
    console.log('Create new form functionality');
  }

  editForm(formId: string) {
    // Navigate to form editing (would be implemented)
    console.log('Edit form:', formId);
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

  // Computed properties for template
  get activeFormsCount(): number {
    return this.forms.filter(form => form.status === FormStatus.ACTIVE).length;
  }

  get totalOrdersCount(): number {
    return this.forms.reduce((sum, form) => sum + form.totalOrders, 0);
  }

  get draftFormsCount(): number {
    return this.forms.filter(form => form.status === FormStatus.DRAFT).length;
  }
}
