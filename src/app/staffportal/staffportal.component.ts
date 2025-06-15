import { Component, OnInit, ViewChild } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { DataSvrService } from '../services/data-svr.service';
import { ServiceFuzzAccount } from '../models/ServiceFuzzAccounts';
import { SocialAuthService } from '@abacritt/angularx-social-login';

@Component({
  selector: 'app-staffportal',
  standalone: false,
  templateUrl: './staffportal.component.html',
  styleUrl: './staffportal.component.css'
})
export class StaffportalComponent implements OnInit {
  @ViewChild('drawer') drawer!: MatSidenav;
  
  // Staff member data - will be populated from DataSvrService
  staffMember = {
    name: 'Loading...',
    photo: 'assets/images/default-avatar.jpg',
    position: 'Staff Member',
    clockedIn: false,
    location: 'Downtown Branch',
    email: ''
  };

  // Current user from service
  currentUser: ServiceFuzzAccount | undefined;
  
  // Google user photo URL
  googlePhotoUrl: string | null = null;
  
  // Sidebar resizing
  sidebarWidth = 280; // Default width in pixels
  minSidebarWidth = 200;
  maxSidebarWidth = 400;
  isResizing = false;
  showWidthIndicator = false;

  // Navigation items
  navigationItems = [
    { name: 'Dashboard', icon: 'dashboard', route: '/staff/dashboard', active: true },
    { name: 'My Schedule', icon: 'calendar_today', route: '/staff/schedule', active: false },
    { name: 'Appointments', icon: 'event', route: '/staff/appointments', active: false },
    { name: 'Customers', icon: 'people', route: '/staff/customers', active: false },
    { name: 'Payments', icon: 'payment', route: '/staff/payments', active: false },
    { name: 'Reports', icon: 'analytics', route: '/staff/reports', active: false },
    { name: 'Settings', icon: 'settings', route: '/staff/settings', active: false }
  ];

  // Current view
  currentView = 'dashboard';
  
  // Notifications
  notificationCount = 3;
  
  // Business locations
  businessLocations = [
    { id: 1, name: 'Downtown Branch', address: '123 Main St' },
    { id: 2, name: 'Mall Location', address: '456 Shopping Center' },
    { id: 3, name: 'Uptown Studio', address: '789 Fashion Ave' }
  ];
  
  selectedLocation = this.businessLocations[0];

  // Time periods for data filtering
  timePeriods = [
    { id: 'hour', label: 'Last Hour', icon: 'schedule' },
    { id: '12hours', label: 'Last 12 Hours', icon: 'access_time' },
    { id: 'day', label: 'Today', icon: 'today' },
    { id: 'week', label: 'This Week', icon: 'date_range' },
    { id: 'month', label: 'This Month', icon: 'calendar_month' },
    { id: 'quarter', label: 'This Quarter', icon: 'event_note' }
  ];
  
  selectedTimePeriod = this.timePeriods[2]; // Default to 'Today'

  // Responsive design
  isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset)
    .pipe(
      map(result => result.matches),
      shareReplay()
    );

  constructor(
    private breakpointObserver: BreakpointObserver,
    private dataSvrService: DataSvrService,
    private socialAuthService: SocialAuthService
  ) {}

  ngOnInit(): void {
    // Initialize component and load user data
    this.loadUserData();
    
    // Load saved sidebar width
    this.loadSidebarWidth();
    
    // Subscribe to social auth state to get Google profile picture
    this.socialAuthService.authState.subscribe(user => {
      if (user && user.photoUrl) {
        this.googlePhotoUrl = user.photoUrl;
        // Reload user data to update the profile picture
        this.loadUserData();
      }
    });
  }

  // Load user data from DataSvrService
  private loadUserData(): void {
    this.currentUser = this.dataSvrService.currentUser;
    
    if (this.currentUser) {
      this.staffMember = {
        name: this.currentUser.name || 'Staff Member',
        photo: this.getProfilePicture(this.currentUser),
        position: this.determineUserPosition(this.currentUser),
        clockedIn: false, // This would come from a time tracking service
        location: 'Downtown Branch', // This would come from user preferences or business settings
        email: this.currentUser.email || ''
      };
    } else {
      // If no user is logged in, show default values
      this.staffMember = {
        name: 'Please Sign In',
        photo: 'assets/images/default-avatar.jpg',
        position: 'Guest',
        clockedIn: false,
        location: 'Not Selected',
        email: ''
      };
    }
  }

  // Get profile picture - could be from Google or default
  private getProfilePicture(user: ServiceFuzzAccount): string {
    // Use Google photo URL if available
    if (this.googlePhotoUrl) {
      return this.googlePhotoUrl;
    }
    
    // Generate a default avatar based on user's name initials
    if (user.name) {
      const initials = this.getInitials(user.name);
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=2196F3&color=fff&size=128`;
    }
    
    // Fallback to default avatar
    return 'assets/images/default-avatar.jpg';
  }

  // Get user initials for avatar generation
  private getInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  }

  // Determine user position based on account type or other criteria
  private determineUserPosition(user: ServiceFuzzAccount): string {
    // You can customize this logic based on your user model
    if (user.email?.includes('admin')) {
      return 'Administrator';
    } else if (user.email?.includes('manager')) {
      return 'Manager';
    } else {
      return 'Staff Member';
    }
  }

  // Navigation methods
  navigateTo(item: any): void {
    this.navigationItems.forEach(nav => nav.active = false);
    item.active = true;
    this.currentView = item.name.toLowerCase().replace(' ', '');
    
    // Close drawer on mobile after navigation
    this.isHandset$.subscribe(isHandset => {
      if (isHandset && this.drawer) {
        this.drawer.close();
      }
    });
  }

  // Clock in/out functionality
  toggleClockStatus(): void {
    this.staffMember.clockedIn = !this.staffMember.clockedIn;
    // Here you would typically call an API to update the clock status
  }

  // Location change
  changeLocation(location: any): void {
    this.selectedLocation = location;
    // Here you would typically call an API to update the staff location
  }

  // Time period change
  changeTimePeriod(period: any): void {
    this.selectedTimePeriod = period;
    // Here you would typically call an API to refresh data based on the selected time period
    console.log('Time period changed to:', period.label);
    // You can add logic here to refresh dashboard data, appointments, etc.
  }

  // Emergency contact
  emergencyContact(): void {
    // Handle emergency contact functionality
    console.log('Emergency contact triggered');
  }

  // Notification handling
  openNotifications(): void {
    // Handle notifications panel
    console.log('Opening notifications');
  }

  // Get current date for display
  getCurrentDate(): Date {
    return new Date();
  }

  // Sidebar resizing methods
  onResizeStart(event: MouseEvent): void {
    this.isResizing = true;
    this.showWidthIndicator = true;
    event.preventDefault();
    
    // Add event listeners for mouse move and mouse up
    document.addEventListener('mousemove', this.onResize.bind(this));
    document.addEventListener('mouseup', this.onResizeEnd.bind(this));
    
    // Add class to body to prevent text selection during resize
    document.body.classList.add('resizing');
  }

  onResize(event: MouseEvent): void {
    if (!this.isResizing) return;
    
    // Calculate new width based on mouse position
    const newWidth = event.clientX;
    
    // Constrain width within min and max bounds
    if (newWidth >= this.minSidebarWidth && newWidth <= this.maxSidebarWidth) {
      this.sidebarWidth = newWidth;
    }
  }

  onResizeEnd(): void {
    this.isResizing = false;
    
    // Remove event listeners
    document.removeEventListener('mousemove', this.onResize.bind(this));
    document.removeEventListener('mouseup', this.onResizeEnd.bind(this));
    
    // Remove resizing class from body
    document.body.classList.remove('resizing');
    
    // Hide width indicator after a delay
    setTimeout(() => {
      this.showWidthIndicator = false;
    }, 1000);
    
    // Save the sidebar width to localStorage for persistence
    localStorage.setItem('staffPortalSidebarWidth', this.sidebarWidth.toString());
  }

  // Load saved sidebar width from localStorage
  private loadSidebarWidth(): void {
    const savedWidth = localStorage.getItem('staffPortalSidebarWidth');
    if (savedWidth) {
      const width = parseInt(savedWidth, 10);
      if (width >= this.minSidebarWidth && width <= this.maxSidebarWidth) {
        this.sidebarWidth = width;
      }
    }
  }

  // Reset sidebar to default width on double-click
  onResizeHandleDoubleClick(): void {
    this.sidebarWidth = 280; // Default width
    this.showWidthIndicator = true;
    
    // Save the reset width
    localStorage.setItem('staffPortalSidebarWidth', this.sidebarWidth.toString());
    
    // Hide indicator after delay
    setTimeout(() => {
      this.showWidthIndicator = false;
    }, 1000);
  }
}
