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
      status: 'Business Setup',
      date: '2024-01-01',
      icon: 'pi pi-rocket',
      color: '#6366F1',
      image: 'bamboo-watch.jpg'
    },
    {
      status: 'Customer Acquisition',
      date: '2024-02-01',
      icon: 'pi pi-users',
      color: '#22C55E',
      image: 'black-watch.jpg'
    },
    {
      status: 'Operations Management',
      date: '2024-03-01',
      icon: 'pi pi-cog',
      color: '#3B82F6',
      image: 'blue-band.jpg'
    },
    {
      status: 'Growth & Scaling',
      date: '2024-04-01',
      icon: 'pi pi-chart-line',
      color: '#F59E42',
      image: 'blue-t-shirt.jpg'
    }
  ];

  // Carousel responsive options
  // responsiveOptions = [
  //   {
  //     breakpoint: '1199px',
  //     numVisible: 1,
  //     numScroll: 1
  //   },
  //   {
  //     breakpoint: '991px',
  //     numVisible: 1,
  //     numScroll: 1
  //   },
  //   {
  //     breakpoint: '767px',
  //     numVisible: 1,
  //     numScroll: 1
  //   }
  // ];

  // Video dialog
  videoVisible = false;

  // Timeline interactivity
  selectedTimelineIndex = 0;

  // Galleria Images for Service-Based Businesses (comprehensive)
  galleriaImages = [
    // Healthcare & Wellness
    { image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', title: 'Hospitals and Clinics', description: 'Medical care, diagnostics, and treatment facilities.' },
    { image: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=1200&q=80', title: 'Dental Services', description: 'Dentistry, oral hygiene, and dental surgery.' },
    { image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80', title: 'Physical Therapy', description: 'Rehabilitation and physical therapy clinics.' },
    { image: 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=1200&q=80', title: 'Chiropractic Care', description: 'Spinal adjustments and musculoskeletal health.' },
    { image: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=1200&q=80', title: 'Mental Health Services', description: 'Counseling, therapy, and psychiatric care.' },
    { image: 'https://images.unsplash.com/photo-1519864600265-abb23847ef2c?auto=format&fit=crop&w=1200&q=80', title: 'Massage Therapy', description: 'Relaxation and therapeutic massage.' },
    { image: 'https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?auto=format&fit=crop&w=1200&q=80', title: 'Acupuncture', description: 'Traditional and alternative medicine.' },
    { image: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=1200&q=80', title: 'Wellness Coaching', description: 'Personal wellness and lifestyle coaching.' },

    // Home & Property Services
    { image: 'https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=1200&q=80', title: 'Plumbing', description: 'Plumbing installation, repair, and maintenance.' },
    { image: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=1200&q=80', title: 'Electrical Work', description: 'Electrical installation, repair, and safety.' },
    { image: 'https://images.unsplash.com/photo-1503389152951-9c3d0c6b7a5a?auto=format&fit=crop&w=1200&q=80', title: 'HVAC Services', description: 'Heating, ventilation, and air conditioning.' },
    { image: 'https://images.unsplash.com/photo-1465101178521-c1a9136a3b99?auto=format&fit=crop&w=1200&q=80', title: 'Landscaping and Lawn Care', description: 'Garden design, maintenance, and lawn care.' },
    { image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', title: 'Pest Control', description: 'Extermination and pest management.' },
    { image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', title: 'House Cleaning', description: 'Residential and commercial cleaning.' },
    { image: 'https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=1200&q=80', title: 'Roofing', description: 'Roof installation and repair.' },
    { image: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=1200&q=80', title: 'Renovation and Remodeling', description: 'Home improvement and remodeling.' },
    { image: 'https://images.unsplash.com/photo-1503389152951-9c3d0c6b7a5a?auto=format&fit=crop&w=1200&q=80', title: 'Pool Maintenance', description: 'Swimming pool cleaning and maintenance.' },
    { image: 'https://images.unsplash.com/photo-1465101178521-c1a9136a3b99?auto=format&fit=crop&w=1200&q=80', title: 'Handyman Services', description: 'General home repairs and odd jobs.' },

    // Automotive Services
    { image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80', title: 'Auto Repair and Maintenance', description: 'Car repair, maintenance, and diagnostics.' },
    { image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80', title: 'Car Detailing', description: 'Professional car cleaning and detailing.' },
    { image: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=1200&q=80', title: 'Towing Services', description: 'Vehicle towing and roadside assistance.' },
    { image: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=1200&q=80', title: 'Tire and Brake Services', description: 'Tire changes, brake repair, and alignment.' },
    { image: 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=1200&q=80', title: 'Windshield Repair', description: 'Auto glass repair and replacement.' },
    { image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', title: 'Oil Change and Lube Shops', description: 'Quick oil change and lubrication.' },

    // Personal Care & Beauty
    { image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80', title: 'Hair Salons and Barbershops', description: 'Haircuts, styling, and grooming.' },
    { image: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=1200&q=80', title: 'Nail Salons', description: 'Manicures, pedicures, and nail art.' },
    { image: 'https://images.unsplash.com/photo-1519864600265-abb23847ef2c?auto=format&fit=crop&w=1200&q=80', title: 'Spas and Skincare Clinics', description: 'Facials, skincare, and relaxation.' },
    { image: 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=1200&q=80', title: 'Tattoo and Piercing Studios', description: 'Body art and piercing services.' },
    { image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80', title: 'Personal Training', description: 'Fitness and personal coaching.' },
    { image: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=1200&q=80', title: 'Makeup Artists', description: 'Professional makeup services.' },

    // Pet Services
    { image: 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=1200&q=80', title: 'Pet Grooming', description: 'Pet grooming and hygiene.' },
    { image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80', title: 'Dog Walking', description: 'Dog walking and exercise.' },
    { image: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=1200&q=80', title: 'Pet Sitting', description: 'Pet sitting and care.' },
    { image: 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=1200&q=80', title: 'Veterinary Clinics', description: 'Animal healthcare and vet clinics.' },
    { image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80', title: 'Pet Boarding and Daycare', description: 'Pet boarding and daycare services.' },
    { image: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=1200&q=80', title: 'Animal Training', description: 'Obedience and animal training.' },

    // Education & Training
    { image: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=1200&q=80', title: 'Tutoring Centers', description: 'Academic tutoring and support.' },
    { image: 'https://images.unsplash.com/photo-1519864600265-abb23847ef2c?auto=format&fit=crop&w=1200&q=80', title: 'Test Prep Services', description: 'Test preparation and coaching.' },
    { image: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=1200&q=80', title: 'Language Schools', description: 'Language learning and instruction.' },
    { image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80', title: 'Music and Art Lessons', description: 'Music, art, and creative lessons.' },
    { image: 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=1200&q=80', title: 'Driving Schools', description: 'Driver education and training.' },
    { image: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=1200&q=80', title: 'Vocational Training', description: 'Career and technical training.' },
    { image: 'https://images.unsplash.com/photo-1519864600265-abb23847ef2c?auto=format&fit=crop&w=1200&q=80', title: 'Corporate Training', description: 'Business and professional training.' },

    // Travel & Transportation
    { image: 'https://images.unsplash.com/photo-1465101178521-c1a9136a3b99?auto=format&fit=crop&w=1200&q=80', title: 'Taxi and Rideshare Services', description: 'Taxi, rideshare, and transportation.' },
    { image: 'https://images.unsplash.com/photo-1503389152951-9c3d0c6b7a5a?auto=format&fit=crop&w=1200&q=80', title: 'Airport Shuttles', description: 'Airport shuttle and transfer services.' },
    { image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80', title: 'Tour Operators', description: 'Tour and travel operators.' },
    { image: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=1200&q=80', title: 'Travel Agencies', description: 'Travel planning and booking.' },
    { image: 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=1200&q=80', title: 'Moving and Relocation Services', description: 'Moving, packing, and relocation.' },
    { image: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=1200&q=80', title: 'Courier and Delivery Services', description: 'Courier, parcel, and delivery.' },

    // Hospitality & Leisure
    { image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', title: 'Hotels and Resorts', description: 'Hotels, resorts, and accommodations.' },
    { image: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=1200&q=80', title: 'Bed and Breakfasts', description: 'B&Bs and guesthouses.' },
    { image: 'https://images.unsplash.com/photo-1519864600265-abb23847ef2c?auto=format&fit=crop&w=1200&q=80', title: 'Restaurants and Cafes', description: 'Dining, cafes, and food services.' },
    { image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80', title: 'Bars and Pubs', description: 'Bars, pubs, and nightlife.' },
    { image: 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=1200&q=80', title: 'Event Planning', description: 'Event planning and coordination.' },
    { image: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=1200&q=80', title: 'Catering Services', description: 'Catering for events and gatherings.' },
    { image: 'https://images.unsplash.com/photo-1519864600265-abb23847ef2c?auto=format&fit=crop&w=1200&q=80', title: 'Theme Parks', description: 'Theme parks and attractions.' },
    { image: 'https://images.unsplash.com/photo-1465101178521-c1a9136a3b99?auto=format&fit=crop&w=1200&q=80', title: 'Tourist Attractions', description: 'Tourist sites and attractions.' },

    // Entertainment & Recreation
    { image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80', title: 'Movie Theaters', description: 'Cinemas and movie theaters.' },
    { image: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=1200&q=80', title: 'Concert Venues', description: 'Concerts and live music venues.' },
    { image: 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=1200&q=80', title: 'Sports Coaching', description: 'Sports coaching and training.' },
    { image: 'https://images.unsplash.com/photo-1519864600265-abb23847ef2c?auto=format&fit=crop&w=1200&q=80', title: 'Dance and Martial Arts Studios', description: 'Dance, martial arts, and fitness.' },
    { image: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=1200&q=80', title: 'Amusement Centers', description: 'Amusement and recreation centers.' },
    { image: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=1200&q=80', title: 'Escape Rooms', description: 'Escape rooms and adventure games.' },
    { image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80', title: 'Fitness Centers and Gyms', description: 'Gyms, fitness, and wellness centers.' },

    // Professional & Business Services
    { image: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=1200&q=80', title: 'Legal Services', description: 'Legal advice and representation.' },
    { image: 'https://images.unsplash.com/photo-1519864600265-abb23847ef2c?auto=format&fit=crop&w=1200&q=80', title: 'Accounting and Bookkeeping', description: 'Accounting and financial services.' },
    { image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80', title: 'Consulting', description: 'Business and management consulting.' },
    { image: 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=1200&q=80', title: 'Marketing and Advertising', description: 'Marketing, branding, and advertising.' },
    { image: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=1200&q=80', title: 'IT Support and Cybersecurity', description: 'IT support and security services.' },
    { image: 'https://images.unsplash.com/photo-1519864600265-abb23847ef2c?auto=format&fit=crop&w=1200&q=80', title: 'HR and Recruiting', description: 'Human resources and recruiting.' },
    { image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80', title: 'Real Estate Agencies', description: 'Real estate sales and rentals.' },
    { image: 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=1200&q=80', title: 'Architecture and Engineering Services', description: 'Architecture and engineering.' },

    // Cleaning & Maintenance
    { image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', title: 'Commercial Janitorial Services', description: 'Commercial cleaning and janitorial.' },
    { image: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=1200&q=80', title: 'Carpet and Upholstery Cleaning', description: 'Carpet and upholstery cleaning.' },
    { image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80', title: 'Window Washing', description: 'Window cleaning and washing.' },
    { image: 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=1200&q=80', title: 'Industrial Cleaning', description: 'Industrial and specialized cleaning.' },
    { image: 'https://images.unsplash.com/photo-1519864600265-abb23847ef2c?auto=format&fit=crop&w=1200&q=80', title: 'Waste Management', description: 'Waste collection and management.' },
    { image: 'https://images.unsplash.com/photo-1465101178521-c1a9136a3b99?auto=format&fit=crop&w=1200&q=80', title: 'Gutter and Roof Cleaning', description: 'Gutter and roof cleaning.' },

    // Public & Government Services
    { image: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=1200&q=80', title: 'Police and Fire Departments', description: 'Public safety and emergency services.' },
    { image: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=1200&q=80', title: 'Public Transportation', description: 'Buses, trains, and transit.' },
    { image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80', title: 'Postal Services', description: 'Mail and postal services.' },
    { image: 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=1200&q=80', title: 'Public Education', description: 'Public schools and education.' },
    { image: 'https://images.unsplash.com/photo-1519864600265-abb23847ef2c?auto=format&fit=crop&w=1200&q=80', title: 'Social Services', description: 'Social and community services.' },
    { image: 'https://images.unsplash.com/photo-1465101178521-c1a9136a3b99?auto=format&fit=crop&w=1200&q=80', title: 'Utilities', description: 'Water, electricity, and gas.' },

    // Construction & Infrastructure
    { image: 'https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=1200&q=80', title: 'General Contracting', description: 'General construction and contracting.' },
    { image: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=1200&q=80', title: 'Road and Bridge Construction', description: 'Road, bridge, and infrastructure.' },
    { image: 'https://images.unsplash.com/photo-1503389152951-9c3d0c6b7a5a?auto=format&fit=crop&w=1200&q=80', title: 'Excavation and Demolition', description: 'Excavation and demolition services.' },
    { image: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=1200&q=80', title: 'Surveying', description: 'Land surveying and mapping.' },
    { image: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=1200&q=80', title: 'Scaffolding and Rigging Services', description: 'Scaffolding and rigging.' },
  ];

  // Galleria responsive options (merged, with numScroll for each breakpoint)
  responsiveOptions = [
    {
      breakpoint: '1199px',
      numVisible: 1,
      numScroll: 1
    },
    {
      breakpoint: '1024px',
      numVisible: 5,
      numScroll: 1
    },
    {
      breakpoint: '991px',
      numVisible: 1,
      numScroll: 1
    },
    {
      breakpoint: '768px',
      numVisible: 3,
      numScroll: 1
    },
    {
      breakpoint: '560px',
      numVisible: 1,
      numScroll: 1
    }
  ];

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

  onSelectTimelineStep(index: number): void {
    this.selectedTimelineIndex = index;
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
