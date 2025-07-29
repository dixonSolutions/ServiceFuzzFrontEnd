import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MegaMenuItem } from 'primeng/api';


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  standalone: false
})
export class HomeComponent implements OnInit {
  // Modal states
  showRegistrationModal = false;
  registrationLoading = false;
  Videovisible = false;
  // Feature panel states
  showFeaturePanel = false;
  activeFeature: any = null;
  hoverTimeout: any = null;

  // Registration form
  registrationForm = {
    businessName: '',
    email: '',
    serviceType: ''
  };

  // Service types for dropdown
  serviceTypes = [
    { label: 'Fitness & Training', value: 'fitness' },
    { label: 'Beauty & Spa', value: 'beauty' },
    { label: 'Healthcare', value: 'healthcare' },
    { label: 'Home Services', value: 'home-services' },
    { label: 'Professional Services', value: 'professional' },
    { label: 'Automotive', value: 'automotive' },
    { label: 'Education & Training', value: 'education' },
    { label: 'Pet Services', value: 'pet-services' },
    { label: 'Other', value: 'other' }
  ];

  // Business categories for mega menu
  businessCategories: MegaMenuItem[] = [
    {
      label: '🏥 Health & Wellness',
      items: [
        [
          {
            label: 'Medical Services',
            items: [
              { label: 'Medical & Dental Clinics' },
              { label: 'Physical Therapy' },
              { label: 'Mental Health Services' }
            ]
          }
        ],
        [
          {
            label: 'Wellness Centers',
            items: [
              { label: 'Wellness Centers' },
              { label: 'Chiropractors' },
              { label: 'Alternative Medicine' }
            ]
          }
        ]
      ]
    },
    {
      label: '💄 Beauty & Personal Care',
      items: [
        [
          {
            label: 'Hair & Beauty',
            items: [
              { label: 'Hair Salons & Barbershops' },
              { label: 'Nail Salons' },
              { label: 'Makeup Artists' }
            ]
          }
        ],
        [
          {
            label: 'Spa & Wellness',
            items: [
              { label: 'Spa & Massage' },
              { label: 'Aesthetics & Skincare' },
              { label: 'Beauty Treatments' }
            ]
          }
        ]
      ]
    },
    {
      label: '🏋️ Fitness & Sports',
      items: [
        [
          {
            label: 'Fitness Centers',
            items: [
              { label: 'Gyms & Fitness Centers' },
              { label: 'Personal Trainers' },
              { label: 'Yoga & Pilates Studios' }
            ]
          }
        ],
        [
          {
            label: 'Sports & Training',
            items: [
              { label: 'Martial Arts' },
              { label: 'Sports Coaching' },
              { label: 'Athletic Training' }
            ]
          }
        ]
      ]
    },
    {
      label: '🏠 Home & Professional Services',
      items: [
        [
          {
            label: 'Home Maintenance',
            items: [
              { label: 'Cleaning Services' },
              { label: 'Handyman & Repairs' },
              { label: 'Landscaping & Gardening' }
            ]
          }
        ],
        [
          {
            label: 'Specialized Services',
            items: [
              { label: 'Pest Control' },
              { label: 'Interior Design' },
              { label: 'Home Inspection' }
            ]
          }
        ]
      ]
    },
    {
      label: '🎓 Education & Training',
      items: [
        [
          {
            label: 'Learning Services',
            items: [
              { label: 'Tutoring Services' },
              { label: 'Music Lessons' },
              { label: 'Language Learning' }
            ]
          }
        ],
        [
          {
            label: 'Professional Development',
            items: [
              { label: 'Professional Training' },
              { label: 'Skill Development' },
              { label: 'Online Courses' }
            ]
          }
        ]
      ]
    },
    {
      label: '🍽️ Food & Hospitality',
      items: [
        [
          {
            label: 'Food Services',
            items: [
              { label: 'Restaurants' },
              { label: 'Catering Services' },
              { label: 'Personal Chefs' }
            ]
          }
        ],
        [
          {
            label: 'Events & Venues',
            items: [
              { label: 'Food Delivery' },
              { label: 'Event Venues' },
              { label: 'Food Trucks' }
            ]
          }
        ]
      ]
    },
    {
      label: '💼 Business & Professional',
      items: [
        [
          {
            label: 'Consulting',
            items: [
              { label: 'Consulting Services' },
              { label: 'Legal Services' },
              { label: 'Accounting & Tax' }
            ]
          }
        ],
        [
          {
            label: 'Creative Services',
            items: [
              { label: 'Marketing & Design' },
              { label: 'Photography & Videography' },
              { label: 'Web Development' }
            ]
          }
        ]
      ]
    },
    {
      label: '🚗 Automotive',
      items: [
        [
          {
            label: 'Vehicle Services',
            items: [
              { label: 'Auto Repair & Maintenance' },
              { label: 'Car Detailing' },
              { label: 'Vehicle Inspection' }
            ]
          }
        ],
        [
          {
            label: 'Driving & Training',
            items: [
              { label: 'Driving Schools' },
              { label: 'Automotive Training' },
              { label: 'Fleet Services' }
            ]
          }
        ]
      ]
    }
  ];

  // Feature details data
  featureDetails = {
    website: {
      id: 'website',
      name: '✨Website Builder',
      icon: 'pi pi-globe',
      description: 'Create stunning, professional websites without any coding knowledge. Our drag-and-drop builder includes mobile optimization, SEO tools, and custom branding.',
      image: 'https://i.ibb.co/qLgMHB5L/Screenshot-2025-07-03-185143.png',
      benefits: [
        'Drag & drop website builder',
        'Mobile-responsive designs',
        'Built-in SEO optimization',
        'Custom domain support',
        'Professional templates'
      ]
    },
    booking: {
      id: 'booking',
      name: '✨Booking System',
      icon: 'pi pi-calendar',
      description: 'Intelligent scheduling system that prevents double bookings, sends automated reminders, and allows customers to book 24/7 online.',
      benefits: [
        'Real-time availability calendar',
        'Automated confirmation emails',
        'SMS reminders',
        'Recurring appointments',
        'Multi-staff scheduling'
      ]
    },
    inventory: {
      id: 'inventory',
      name: '✨Inventory Management',
      icon: 'pi pi-box',
      description: 'Track stock levels, manage suppliers, set reorder alerts, and integrate with your booking system for service-based inventory.',
      image: 'https://xbsoftware.com/wp-content/uploads/2022/08/logistics-supply-chain-management-application-2.png',
      benefits: [
        'Real-time stock tracking',
        'Low stock alerts',
        'Supplier management',
        'Purchase order automation',
        'Cost tracking & reporting'
      ]
    },
    staff: {
      id: 'staff',
      name: '✨Staff Management',
      icon: 'pi pi-users',
      description: 'Comprehensive team management with scheduling, performance tracking, commission calculations, and communication tools.',
      benefits: [
        'Employee scheduling',
        'Performance analytics',
        'Commission tracking',
        'Time clock integration',
        'Team communication'
      ]
    },
    payment: {
      id: 'payment',
      name: '✨Payment Processing',
      icon: 'pi pi-credit-card',
      description: 'Secure payment processing with multiple payment methods, automatic invoicing, and integrated accounting features.',
      image: 'https://techcrunch.com/wp-content/uploads/2014/03/stripe__checkout.png',
      benefits: [
        'Credit card processing',
        'Automated invoicing',
        'Recurring payments',
        'Payment analytics',
        'Tax reporting'
      ]
    },
    mobile: {
      id: 'mobile',
      name: '✨Mobile App',
      icon: 'pi pi-mobile',
      description: 'Native mobile apps for both business owners and customers, enabling on-the-go management and booking capabilities.',
      image: 'https://mobisoftinfotech.com/resources/wp-content/uploads/2021/11/the-role-of-mobile-app-analytics-to-build-successful-apps.png',
      benefits: [
        'Business owner app',
        'Customer booking app',
        'Push notifications',
        'Offline capability',
        'GPS integration'
      ]
    }
  };

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Component initialized
  }

  // Modal methods
  openRegistrationModal(): void {
    this.showRegistrationModal = true;
  }

  showDialog(): void {
    //  this.Videovisible = true;
    const videoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const width = screen.width;
  const height = screen.height;
  const left = (screen.width - width) / 2;
  const top = (screen.height - height) / 2;

  const features = `width=${0.5 *width},height=${0.5 *height},left=${left},top=${top},resizable=yes`;
  window.open(videoUrl, '_blank', features);


}

  closeRegistrationModal(): void {
    this.showRegistrationModal = false;
    this.resetRegistrationForm();
  }

  // Form submission
  submitRegistration(): void {
    if (!this.registrationForm.businessName || !this.registrationForm.email) {
      return;
    }

    this.registrationLoading = true;

    // Simulate API call
    setTimeout(() => {
      console.log('Registration submitted:', this.registrationForm);
      
      // TODO: Implement actual API call
      // For now, just navigate to business registration
      this.router.navigate(['/business-registration']);
      
      this.registrationLoading = false;
      this.closeRegistrationModal();
    }, 1500);
  }

  // Event handlers for auth-business-dialog
  onAuthSuccess(): void {
    console.log('User authenticated successfully - will navigate to business settings');
    // User has been authenticated, dialog will automatically navigate to business settings
  }

  onBusinessSetupComplete(): void {
    console.log('Navigation to business settings completed');
    // Navigation completed, close dialog
    this.closeRegistrationModal();
  }

  onDialogClosed(): void {
    console.log('Dialog closed');
    // Reset any form data if needed
    this.resetRegistrationForm();
  }

  private resetRegistrationForm(): void {
    this.registrationForm = {
      businessName: '',
      email: '',
      serviceType: ''
    };
  }

  // Feature panel methods
  showFeatureDetails(featureId: string): void {
    // Clear any existing timeout
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }

    // Set the active feature and show panel
    this.activeFeature = (this.featureDetails as any)[featureId];
    this.showFeaturePanel = true;
  }

  hideFeatureDetails(): void {
    // Add a small delay to allow moving to the panel
    this.hoverTimeout = setTimeout(() => {
      this.showFeaturePanel = false;
      this.activeFeature = null;
    }, 300);
  }

  keepPanelOpen(): void {
    // Cancel the timeout if mouse enters the panel
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }
  }

  toggleFeatureDetails(featureId: string): void {
    // For mobile/touch devices - toggle the panel
    if (this.showFeaturePanel && this.activeFeature?.id === featureId) {
      this.showFeaturePanel = false;
      this.activeFeature = null;
    } else {
      this.activeFeature = (this.featureDetails as any)[featureId];
      this.showFeaturePanel = true;
    }
  }

  learnMore(featureId: string): void {
    console.log('Learn more about:', featureId);
    // TODO: Implement navigation to feature detail page or modal
    // For now, just hide the panel
    this.showFeaturePanel = false;
    this.activeFeature = null;
  }
}
