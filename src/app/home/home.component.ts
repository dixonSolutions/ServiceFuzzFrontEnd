import { Component, OnInit } from '@angular/core';
import { DataSvrService } from '../services/data-svr.service';
import { MatDialog } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CarouselModule } from 'primeng/carousel';
import { AnimateOnScrollModule } from 'primeng/animateonscroll';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TabViewModule } from 'primeng/tabview';
import { TimelineModule } from 'primeng/timeline';
import { ChipModule } from 'primeng/chip';
import { DividerModule } from 'primeng/divider';
import { ProgressBarModule } from 'primeng/progressbar';
import { AvatarModule } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { BadgeModule } from 'primeng/badge';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  standalone: false
})
export class HomeComponent implements OnInit {
  // Hero Carousel Data
  heroSlides = [
    {
      title: 'Revolutionize Your Service Business',
      subtitle: 'Transform Operations • Connect Customers • Scale Growth',
      description: 'Streamline your service business with our comprehensive platform designed for modern entrepreneurs.',
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
      cta: 'Get Started Free',
      badge: 'NEW'
    },
    {
      title: 'Smart Booking & Management',
      subtitle: 'Automated Scheduling • Real-time Updates • Customer Portal',
      description: 'Handle appointments, memberships, and recurring bookings with intelligent automation.',
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2015&q=80',
      cta: 'Explore Features',
      badge: 'POPULAR'
    },
    {
      title: 'Data-Driven Insights',
      subtitle: 'Analytics Dashboard • Performance Metrics • Growth Reports',
      description: 'Make informed decisions with real-time analytics and comprehensive business intelligence.',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
      cta: 'View Demo',
      badge: 'FEATURED'
    }
  ];

  // Features Data
  features = [
    {
      icon: 'pi pi-chart-line',
      title: 'Business Intelligence',
      description: 'Comprehensive analytics and reporting to drive growth',
      color: 'primary',
      stats: '85%'
    },
    {
      icon: 'pi pi-calendar',
      title: 'Smart Scheduling',
      description: 'Automated booking system with intelligent optimization',
      color: 'success',
      stats: '24/7'
    },
    {
      icon: 'pi pi-users',
      title: 'Team Management',
      description: 'Streamlined staff coordination and performance tracking',
      color: 'info',
      stats: '100+'
    },
    {
      icon: 'pi pi-credit-card',
      title: 'Payment Processing',
      description: 'Secure, flexible payment solutions for all business types',
      color: 'warning',
      stats: '99.9%'
    },
    {
      icon: 'pi pi-mobile',
      title: 'Mobile App',
      description: 'Native mobile applications for iOS and Android',
      color: 'danger',
      stats: '50K+'
    },
    {
      icon: 'pi pi-shield',
      title: 'Enterprise Security',
      description: 'Bank-level security with compliance and data protection',
      color: 'secondary',
      stats: 'SOC2'
    }
  ];

  // Testimonials
  testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'CEO, CleanPro Services',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80',
      content: 'ServiceFuzz transformed our business operations. We\'ve increased efficiency by 70% and customer satisfaction is at an all-time high.',
      rating: 5
    },
    {
      name: 'Michael Chen',
      role: 'Founder, TechFlow Solutions',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80',
      content: 'The analytics dashboard gives us insights we never had before. It\'s like having a business consultant available 24/7.',
      rating: 5
    },
    {
      name: 'Emily Rodriguez',
      role: 'Operations Manager, GreenCare',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80',
      content: 'Our team loves the mobile app. Scheduling is now seamless and our customers appreciate the real-time updates.',
      rating: 5
    }
  ];

  // Stats Data
  stats = [
    { value: '10,000+', label: 'Active Businesses', icon: 'pi pi-building' },
    { value: '500K+', label: 'Bookings Processed', icon: 'pi pi-calendar-check' },
    { value: '99.9%', label: 'Uptime Guarantee', icon: 'pi pi-shield-check' },
    { value: '24/7', label: 'Customer Support', icon: 'pi pi-headset' }
  ];

  // Timeline Data
  timeline = [
    {
      title: 'Business Setup',
      description: 'Get your business online in minutes with our streamlined onboarding process',
      icon: 'pi pi-rocket',
      color: 'primary'
    },
    {
      title: 'Customer Acquisition',
      description: 'Attract and retain customers with our integrated marketing tools',
      icon: 'pi pi-users',
      color: 'success'
    },
    {
      title: 'Operations Management',
      description: 'Streamline daily operations with automated workflows and smart scheduling',
      icon: 'pi pi-cog',
      color: 'info'
    },
    {
      title: 'Growth & Scaling',
      description: 'Scale your business with data-driven insights and performance analytics',
      icon: 'pi pi-chart-line',
      color: 'warning'
    }
  ];

  // Carousel responsive options
  responsiveOptions = [
    {
      breakpoint: '1199px',
      numVisible: 1,
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

  // Video dialog
  videoVisible = false;

  constructor(
    public data: DataSvrService,
    private dialog: MatDialog,
    private router: Router
  ) {}

  ngOnInit(): void {}

  navigateToSignup(): void {
    this.router.navigate(['/sign']);
  }

  openVideoDialog(): void {
    this.videoVisible = true;
  }

  closeVideoDialog(): void {
    this.videoVisible = false;
  }

  getSeverity(status: string): string {
    switch (status) {
      case 'NEW': return 'success';
      case 'POPULAR': return 'warning';
      case 'FEATURED': return 'info';
      default: return 'primary';
    }
  }
}

// Video Dialog Component
@Component({
  selector: 'app-video-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="video-dialog-container">
      <iframe 
        width="100%" 
        height="100%" 
        src="https://www.youtube.com/embed/f2LXCW-bdGY" 
        title="ServiceFuzz Platform Overview"
        frameborder="0" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
        allowfullscreen>
      </iframe>
    </div>
  `,
  styles: [`
    .video-dialog-container {
      position: relative;
      width: 100%;
      padding-bottom: 56.25%; /* 16:9 Aspect Ratio */
      height: 0;
      overflow: hidden;
    }
    .video-dialog-container iframe {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border-radius: 8px;
    }
  `]
})
export class VideoDialogComponent {}
