import { Component, OnInit } from '@angular/core';
import { DataSvrService } from '../services/data-svr.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  standalone: false
})
export class HomeComponent implements OnInit {
  currentSlide = 0;
  slides = [
    {
      title: 'Revolutionize Your Service Business',
      description: 'Transform how you operate and connect with customers using our comprehensive platform.',
      image: 'https://pbcleaningservices.com.au/wp-content/uploads/2021/10/Mowing-1000x500.jpeg'
    },
    {
      title: 'Smart Booking System',
      description: 'Handle appointments, memberships, and recurring bookings effortlessly.',
      image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ11zlIIj01p0uDmU16FWenOmSVh8EmfSCzaA&s' // Example source
    },
    {
      title: 'Comprehensive Analytics',
      description: 'Make data-driven decisions with real-time insights and professional reporting.',
      image: 'https://media.licdn.com/dms/image/v2/D4D12AQGOcRWmc4LQig/article-cover_image-shrink_600_2000/article-cover_image-shrink_600_2000/0/1695725261344?e=2147483647&v=beta&t=yD82tJB-2Hv9u4SjdHy2jX7ggcDK0IQwlsyFXro9yoA' // Example source
    }
  ];

  features = [
    {
      icon: 'dashboard',
      title: 'Business Management Portal',
      description: 'Streamline your operations with our intuitive dashboard'
    },
    {
      icon: 'web',
      title: 'Professional Website Builder',
      description: 'Create stunning, mobile-responsive websites in minutes'
    },
    {
      icon: 'event',
      title: 'Smart Booking System',
      description: 'Handle appointments, memberships, and recurring bookings effortlessly'
    },
    {
      icon: 'people',
      title: 'Staff Management Suite',
      description: 'Manage your team, track performance, and optimize scheduling'
    },
    {
      icon: 'payment',
      title: 'Integrated Payment Processing',
      description: 'Secure, flexible payment options for all business types'
    },
    {
      icon: 'analytics',
      title: 'Comprehensive Analytics',
      description: 'Make data-driven decisions with real-time insights'
    }
  ];

  businessBenefits = [
    'Reduce administrative overhead by up to 70%',
    'Automate routine tasks and scheduling',
    'Track inventory and manage costs effectively',
    'Generate professional reports and analytics',
    'Handle multiple locations seamlessly',
    'Manage staff permissions and access',
    'Process payments securely and efficiently'
  ];

  customerBenefits = [
    'Easy online booking available 24/7',
    'Flexible membership management',
    'Secure payment processing',
    'Automated appointment reminders',
    'Mobile app for convenient access',
    'Real-time service updates',
    'Loyalty program integration'
  ];

  securityFeatures = [
    'Enterprise-grade security protocols',
    'Regular backups and data protection',
    '99.9% uptime guarantee',
    'GDPR and data privacy compliant',
    'Secure payment processing',
    'Regular security audits'
  ];

  integrationFeatures = [
    'Payment gateway integration',
    'Email and SMS services',
    'Calendar synchronization',
    'Accounting software connection',
    'Marketing tool integration',
    'Analytics platforms',
    'CRM systems'
  ];

  constructor(private data: DataSvrService) {
    this.startCarousel();
  }

  ngOnInit(): void {
    console.log('Current user:', this.data.currentUser);
  }

  setSlide(index: number): void {
    this.currentSlide = index;
  }

  private startCarousel(): void {
    setInterval(() => {
      this.currentSlide = (this.currentSlide + 1) % this.slides.length;
    }, 2000);
  }
}
