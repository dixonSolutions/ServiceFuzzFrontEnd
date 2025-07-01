import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  standalone: false
})
export class HomeComponent implements OnInit, OnDestroy {
  @ViewChild('registrationModal') registrationModal!: ElementRef;
  @ViewChild('exitIntentModal') exitIntentModal!: ElementRef;

  private destroy$ = new Subject<void>();
  
  // Modal states
  showRegistrationModal = false;
  showVideoModal = false;
  showExitIntentModal = false;
  showRoiCalculator = false;
  exitIntentTriggered = false;

  // Registration form
  registrationStep = 1;
  totalSteps = 2;
  registrationForm = {
    businessName: '',
    yourName: '',
    email: '',
    phone: '',
    serviceType: '',
    businessGoal: ''
  };
  registrationLoading = false;

  // Animated statistics
  animatedStats = {
    businesses: 0,
    monthlyProcessing: 0,
    uptime: 0,
    savings: 0
  };

  // ROI Calculator
  roiInputs = {
    monthlyRevenue: 10000,
    averageServicePrice: 100,
    weeklyBookings: 20
  };
  roiResults = {
    potentialSavings: 0,
    revenueIncrease: 0,
    timeEssaved: 0,
    customerIncrease: 0
  };

  // Hero carousel
  heroSlides = [
    {
      title: 'Stop Losing Customers to Manual Booking Systems',
      subtitle: 'ServiceFuzz automates your entire service business - from booking to payment - so you can focus on what you do best: serving customers.',
      background: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=1926&q=80',
      stats: 'Join 10,000+ Service Businesses'
    },
    {
      title: 'Transform Your Business Operations Today',
      subtitle: 'Increase efficiency by 300%, reduce admin time by 15 hours per week, and grow revenue by $50K annually with our automated platform.',
      background: 'https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=1926&q=80',
      stats: 'Process $2M+ Monthly'
    },
    {
      title: 'The Future of Service Business Management',
      subtitle: 'AI-powered scheduling, automated payments, and intelligent customer management - all in one powerful platform.',
      background: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1926&q=80',
      stats: '99.9% Uptime Guaranteed'
    }
  ];

  // Service professional images for rotating background
  serviceProfessionals = [
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ];
  currentProfessionalIndex = 0;

  // Success stories
  successStories = [
    {
      businessName: 'Elite Fitness Studio',
      ownerName: 'Sarah Thompson',
      serviceType: 'Fitness & Training',
      result: 'Tripled monthly bookings',
      savings: 'Saved 15 hours/week on admin',
      revenue: 'Increased revenue by 180%',
      quote: 'ServiceFuzz transformed our business completely. We went from struggling to book 50 sessions a month to over 150!',
      image: 'https://images.pexels.com/photos/866023/pexels-photo-866023.jpeg?auto=compress&cs=tinysrgb&w=600',
      logo: 'https://images.pexels.com/photos/1552252/pexels-photo-1552252.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop'
    },
    {
      businessName: 'Zen Spa Wellness',
      ownerName: 'Maria Rodriguez',
      serviceType: 'Beauty & Spa',
      result: 'Doubled customer retention',
      savings: 'Reduced no-shows by 80%',
      revenue: 'Increased booking value by 40%',
      quote: 'The automated reminders and easy rebooking features have completely eliminated our scheduling headaches.',
      image: 'https://images.pexels.com/photos/3764568/pexels-photo-3764568.jpeg?auto=compress&cs=tinysrgb&w=600',
      logo: 'https://images.pexels.com/photos/4041392/pexels-photo-4041392.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop'
    },
    {
      businessName: 'TechFix Solutions',
      ownerName: 'David Chen',
      serviceType: 'IT Consulting',
      result: 'Streamlined operations',
      savings: 'Cut admin time by 70%',
      revenue: 'Expanded to 3 new locations',
      quote: 'ServiceFuzz gave us the tools to scale beyond what we thought possible. Our clients love the transparency.',
      image: 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=600',
      logo: 'https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop'
    },
    {
      businessName: 'Professional Plumbing Co.',
      ownerName: 'Mike Johnson',
      serviceType: 'Home Services',
      result: 'Increased efficiency by 60%',
      savings: 'Eliminated double bookings',
      revenue: 'Added $85K annual revenue',
      quote: 'Our customers love the real-time updates and easy scheduling. We\'ve never been more organized!',
      image: 'https://images.pexels.com/photos/8954173/pexels-photo-8954173.jpeg?auto=compress&cs=tinysrgb&w=600',
      logo: 'https://images.pexels.com/photos/5691659/pexels-photo-5691659.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop'
    },
    {
      businessName: 'Healing Hands Massage',
      ownerName: 'Jennifer Wu',
      serviceType: 'Wellness Therapy',
      result: 'Boosted bookings by 150%',
      savings: 'Reduced admin calls by 90%',
      revenue: 'Opened second location',
      quote: 'The self-service booking portal freed up so much time. I can focus on what I do best - helping my clients.',
      image: 'https://images.pexels.com/photos/3997993/pexels-photo-3997993.jpeg?auto=compress&cs=tinysrgb&w=600',
      logo: 'https://images.pexels.com/photos/4498606/pexels-photo-4498606.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop'
    }
  ];

  // Features with interactive demos
  features = [
    {
      id: 'smart-scheduling',
      name: 'Smart Scheduling',
      benefit: 'Never double-book or miss appointments again',
      icon: 'pi pi-calendar-plus',
      description: 'AI-powered scheduling that prevents conflicts and optimizes your calendar automatically.',
      demo: {
        before: 'Manual calendar juggling leads to double bookings and frustrated customers',
        after: 'Intelligent scheduling prevents conflicts and suggests optimal time slots'
      },
      metrics: '95% reduction in scheduling conflicts'
    },
    {
      id: 'payment-processing',
      name: 'Instant Payment Processing',
      benefit: 'Get paid instantly, every time',
      icon: 'pi pi-credit-card',
      description: 'Secure payment processing with automatic invoicing and receipt generation.',
      demo: {
        before: 'Chasing payments and manual invoicing wastes hours daily',
        after: 'Automatic payment collection and instant payment confirmations'
      },
      metrics: '99.9% payment success rate'
    },
    {
      id: 'staff-management',
      name: 'Team Coordination',
      benefit: 'Know exactly who\'s working where, when',
      icon: 'pi pi-users',
      description: 'Complete staff management with scheduling, performance tracking, and communication tools.',
      demo: {
        before: 'Lost productivity from poor communication and unclear schedules',
        after: 'Real-time staff coordination and automated schedule distribution'
      },
      metrics: '40% improvement in team efficiency'
    },
    {
      id: 'customer-portal',
      name: 'Customer Portal',
      benefit: 'Empower customers to manage their own bookings',
      icon: 'pi pi-user-plus',
      description: 'Self-service portal for booking, rescheduling, and managing appointments.',
      demo: {
        before: 'Constant phone calls for simple booking changes',
        after: 'Customers handle 80% of booking tasks independently'
      },
      metrics: '75% reduction in admin calls'
    }
  ];

  // Competitor comparison
  competitorComparison = [
    { feature: 'Setup Time', servicefuzz: '15 minutes', traditional: '2-4 weeks', others: '1-2 weeks' },
    { feature: 'Monthly Cost', servicefuzz: '$49/month', traditional: '$300+/month', others: '$99+/month' },
    { feature: 'Customer Support', servicefuzz: '24/7 Live Chat', traditional: 'Email Only', others: 'Business Hours' },
    { feature: 'Mobile App', servicefuzz: 'Native iOS/Android', traditional: 'None', others: 'Web Only' },
    { feature: 'Payment Processing', servicefuzz: 'Built-in (2.9%)', traditional: 'Separate Service', others: 'Extra Cost' },
    { feature: 'Customization', servicefuzz: 'Full Control', traditional: 'Limited', others: 'Template Only' },
    { feature: 'Integration', servicefuzz: '100+ Integrations', traditional: 'Manual Process', others: '5-10 Only' },
    { feature: 'Learning Curve', servicefuzz: '1 Day', traditional: '2+ Months', others: '2-3 Weeks' }
  ];

  // Trust signals
  trustSignals = [
    { icon: 'pi pi-shield', text: '30-Day Money-Back Guarantee' },
    { icon: 'pi pi-times-circle', text: 'No Setup Fees' },
    { icon: 'pi pi-calendar-times', text: 'Cancel Anytime' },
    { icon: 'pi pi-sync', text: 'Free Migration from Your Current System' }
  ];

  // Security badges
  securityBadges = [
    { name: 'SSL Encryption', icon: 'pi pi-lock', description: 'Bank-level security' },
    { name: 'PCI Compliant', icon: 'pi pi-credit-card', description: 'Payment security certified' },
    { name: 'GDPR Compliant', icon: 'pi pi-shield', description: 'Data privacy protected' },
    { name: 'SOC 2 Type II', icon: 'pi pi-verified', description: 'Security audited' }
  ];

  // Service types for business profile
  serviceTypes = [
    { label: 'Fitness & Wellness', value: 'fitness', icon: 'pi pi-heart' },
    { label: 'Beauty & Spa', value: 'beauty', icon: 'pi pi-star' },
    { label: 'Healthcare', value: 'healthcare', icon: 'pi pi-plus' },
    { label: 'Professional Services', value: 'professional', icon: 'pi pi-briefcase' },
    { label: 'Home Services', value: 'home', icon: 'pi pi-home' },
    { label: 'Education & Training', value: 'education', icon: 'pi pi-book' }
  ];

  // Business goals
  businessGoals = [
    { label: 'Double my bookings', value: 'double-bookings' },
    { label: 'Reduce admin time by 50%', value: 'reduce-admin' },
    { label: 'Expand to 3 locations', value: 'expand-locations' },
    { label: 'Hire 2 additional staff members', value: 'hire-staff' },
    { label: 'Increase revenue by $100K', value: 'increase-revenue' },
    { label: 'Improve customer satisfaction', value: 'customer-satisfaction' }
  ];

  // Limited time offer
  limitedOffer = {
    spotsRemaining: 23,
    title: 'New Business Special: Get 3 Months Free',
    subtitle: 'Limited to First 100 Signups This Month'
  };

  // Recent signups (simulated live feed)
  recentSignups = [
    'Sarah from Denver just started her free trial',
    'Mike from Austin upgraded to Pro plan',
    'Lisa from Seattle integrated with Stripe',
    'Tom from Miami published his website',
    'Emma from Portland added team members'
  ];
  currentSignupIndex = 0;

  // Responsive options for carousels
  responsiveOptions = [
    {
      breakpoint: '1199px',
      numVisible: 2,
      numScroll: 1
    },
    {
      breakpoint: '991px',
      numVisible: 1,
      numScroll: 1
    },
    {
      breakpoint: '767px',
      numVisible: 1,
      numScroll: 1
    }
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.startAnimations();
    this.calculateRoi();
    this.setupExitIntentDetection();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Animation methods
  startAnimations(): void {
    // Animate statistics
    this.animateNumber('businesses', 10000, 2000);
    this.animateNumber('monthlyProcessing', 2000000, 2500);
    this.animateNumber('uptime', 99.9, 1500);
    this.animateNumber('savings', 50000, 3000);

    // Rotate service professionals every 4 seconds
    interval(4000).pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.currentProfessionalIndex = (this.currentProfessionalIndex + 1) % this.serviceProfessionals.length;
    });

    // Rotate recent signups every 5 seconds
    interval(5000).pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.currentSignupIndex = (this.currentSignupIndex + 1) % this.recentSignups.length;
    });

    // Update limited offer counter
    interval(30000).pipe(takeUntil(this.destroy$)).subscribe(() => {
      if (this.limitedOffer.spotsRemaining > 1) {
        this.limitedOffer.spotsRemaining--;
      }
    });
  }

  animateNumber(key: keyof typeof this.animatedStats, target: number, duration: number): void {
    const steps = 60;
    const increment = target / steps;
    const stepDuration = duration / steps;

    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        this.animatedStats[key] = target;
        clearInterval(timer);
      } else {
        this.animatedStats[key] = Math.floor(current);
      }
    }, stepDuration);
  }

  // Registration modal methods
  openRegistrationModal(): void {
    this.showRegistrationModal = true;
    this.registrationStep = 1;
  }

  closeRegistrationModal(): void {
    this.showRegistrationModal = false;
    this.resetRegistrationForm();
  }

  nextRegistrationStep(): void {
    if (this.registrationStep < this.totalSteps) {
      this.registrationStep++;
    }
  }

  previousRegistrationStep(): void {
    if (this.registrationStep > 1) {
      this.registrationStep--;
    }
  }

  submitRegistration(): void {
    this.registrationLoading = true;
    // Simulate API call
    setTimeout(() => {
      this.registrationLoading = false;
      this.closeRegistrationModal();
      this.showPersonalizedPreview();
    }, 2000);
  }

  resetRegistrationForm(): void {
    this.registrationForm = {
      businessName: '',
      yourName: '',
      email: '',
      phone: '',
      serviceType: '',
      businessGoal: ''
    };
    this.registrationStep = 1;
  }

  // ROI Calculator
  calculateRoi(): void {
    const monthly = this.roiInputs.monthlyRevenue;
    const avgPrice = this.roiInputs.averageServicePrice;
    const weekly = this.roiInputs.weeklyBookings;

    // Calculate potential improvements
    this.roiResults.potentialSavings = Math.floor(monthly * 0.15); // 15% cost savings
    this.roiResults.revenueIncrease = Math.floor(monthly * 0.3); // 30% revenue increase
    this.roiResults.timeEssaved = Math.floor(weekly * 2); // 2 hours saved per booking
    this.roiResults.customerIncrease = Math.floor(weekly * 1.5); // 50% more bookings
  }

  openRoiCalculator(): void {
    this.showRoiCalculator = true;
  }

  closeRoiCalculator(): void {
    this.showRoiCalculator = false;
  }

  // Demo methods
  openVideoDemo(): void {
    this.showVideoModal = true;
  }

  closeVideoDemo(): void {
    this.showVideoModal = false;
  }

  // Exit intent detection
  @HostListener('document:mouseleave', ['$event'])
  onMouseLeave(event: MouseEvent): void {
    if (event.clientY <= 0 && !this.exitIntentTriggered) {
      this.triggerExitIntent();
    }
  }

  setupExitIntentDetection(): void {
    // Additional exit intent triggers
    setTimeout(() => {
      if (!this.exitIntentTriggered) {
        this.triggerExitIntent();
      }
    }, 30000); // Show after 30 seconds if no interaction
  }

  triggerExitIntent(): void {
    this.exitIntentTriggered = true;
    this.showExitIntentModal = true;
  }

  closeExitIntentModal(): void {
    this.showExitIntentModal = false;
  }

  // Navigation methods
  navigateToSignup(): void {
    this.router.navigate(['/business']);
  }

  navigateToDemo(): void {
    this.openVideoDemo();
  }

  // Social login methods
  loginWithGoogle(): void {
    // Implement Google OAuth
    console.log('Google login initiated');
  }

  loginWithApple(): void {
    // Implement Apple OAuth
    console.log('Apple login initiated');
  }

  // Personalized preview
  showPersonalizedPreview(): void {
    // Navigate to personalized onboarding
    this.router.navigate(['/business'], {
      queryParams: { 
        preview: 'true',
        business: this.registrationForm.businessName,
        type: this.registrationForm.serviceType
      }
    });
  }

  // Utility methods
  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  downloadGuide(): void {
    // Implement guide download
    console.log('Downloading business guide...');
  }

  scheduleConsultation(): void {
    // Implement consultation booking
    console.log('Scheduling consultation...');
  }
}
