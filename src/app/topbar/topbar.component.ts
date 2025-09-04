import { Component, OnInit, ViewChild, HostListener } from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatSidenavModule} from '@angular/material/sidenav';
import { DataSvrService } from '../services/data-svr.service';
import { Router } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { MatSidenav } from '@angular/material/sidenav';
import { ManageBusinessesService } from '../services/manage-businesses.service';
import { SubscriptionStatus } from '../models/subscription-status';
import { BusinessRegistrationDto } from '../models/business-registration-dto';
import { MenuItem, MegaMenuItem } from 'primeng/api';

@Component({
  selector: 'app-topbar',
  standalone: false,
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.css']
})
export class TopbarComponent implements OnInit {
  @ViewChild('mobileDrawer') mobileDrawer!: MatSidenav;

  // Window reference for debug info
  window = window;

  // Mobile sidebar state
  mobileDrawerOpened = false;
  businessSidebarExpanded = false;
  manageBusinessesSidebarExpanded = false;

  // Business and staff management state
  userBusinesses: BusinessRegistrationDto[] = [];
  selectedBusinessForStaff: BusinessRegistrationDto | null = null;
  private hasAttemptedLoadBusinesses = false;
  private authWatchIntervalId: any;
  private hasAttemptedLoadSubscription = false;

  // Subscription status indicator state
  subscriptionStatus: SubscriptionStatus | null = null;
  isLoadingSubscription: boolean = false;

  // Responsive nav collapse settings - every 100px
  private readonly baseCollapseWidth = 1200;
  private readonly collapseStepPx = 100;
  private readonly collapsibleOrder: Array<'home' | 'business' | 'analytics' | 'staff' | 'about'> = ['staff', 'business', 'about', 'analytics'];
  private itemsToHide = new Set<string>();

  // PrimeNG Menu Items
  businessMenuItems: MenuItem[] = [];
  staffMenuItems: MenuItem[] = [];
  megaMenuItems: MegaMenuItem[] = [];
  mobileMenuItems: MenuItem[] = [];
  overflowMenuItems: MenuItem[] = [];
  
  // Responsive navigation state
  visibleMenuItems: string[] = ['home', 'analytics', 'about', 'business', 'staff'];
  hiddenMenuItems: string[] = [];

  // Sidebar appears at 700px maximum (700px and below)
  isSidebarVisible$: Observable<boolean> = this.breakpointObserver.observe('(max-width: 700px)')
    .pipe(
      map(result => result.matches),
      shareReplay()
    );

  // Legacy breakpoints for existing functionality
  isSmallScreen$: Observable<boolean> = this.breakpointObserver.observe('(max-width: 768px)')
    .pipe(
      map(result => result.matches),
      shareReplay()
    );

  constructor(
    public data: DataSvrService,
    private router: Router,
    private breakpointObserver: BreakpointObserver,
    private manageBusinessesService: ManageBusinessesService
  ) {}

  ngOnInit(): void {
    // Check if user session exists in stored tokens and restore if needed
    if (!this.data.currentUser && this.data.hasUserSession()) {
      console.log('Topbar: User not in memory but session exists in storage, attempting to restore...');
      // The restoration is handled automatically by the DataSvrService constructor
    }
    
    // Load subscription status once when authenticated
    if (this.data.currentUser && !this.hasAttemptedLoadSubscription) {
      this.hasAttemptedLoadSubscription = true;
      this.loadSubscriptionStatus();
    }

    // Initialize PrimeNG menus
    this.initializeMenus();
    
    // Initialize responsive behavior
    this.updateResponsiveNav(window.innerWidth);

    // Lightweight watcher: attempt a single load when user logs in, then stop
    this.authWatchIntervalId = setInterval(() => {
      if (this.data.currentUser && !this.hasAttemptedLoadSubscription) {
        this.hasAttemptedLoadSubscription = true;
        this.loadSubscriptionStatus();
        clearInterval(this.authWatchIntervalId);
      } else if (!this.data.currentUser && (this.subscriptionStatus || this.hasAttemptedLoadSubscription)) {
        // Reset state on logout
        this.subscriptionStatus = null;
        this.hasAttemptedLoadSubscription = false;
      }
    }, 1000);

    // Initialize responsive nav state
    this.updateResponsiveNav(window.innerWidth || 0);
  }

  isRouteActive(route: string): boolean {
    if (route === '/') {
      // For home route, check both '/' and '/home'
      return this.router.url === '/' || this.router.url === '/home';
    }
    return this.router.url === route || this.router.url.startsWith(route + '/');
  }

  getUserInitials(): string {
    const user = this.data.currentUser;
    if (!user || !user.name) {
      return '?';
    }
    
    const nameParts = user.name.trim().split(' ');
    if (nameParts.length === 1) {
      // Single name, return first letter
      return nameParts[0].charAt(0).toUpperCase();
    } else {
      // Multiple names, return first letter of first and last name
      const firstInitial = nameParts[0].charAt(0).toUpperCase();
      const lastInitial = nameParts[nameParts.length - 1].charAt(0).toUpperCase();
      return firstInitial + lastInitial;
    }
  }

  // Method to close mobile drawer when navigating
  closeMobileDrawer(): void {
    if (this.mobileDrawer) {
      this.mobileDrawer.close();
    }
  }

  // Simple mobile sidebar methods
  toggleMobileSidebar(): void {
    this.mobileDrawerOpened = !this.mobileDrawerOpened;
  }

  closeMobileSidebar(): void {
    this.mobileDrawerOpened = false;
    this.businessSidebarExpanded = false;
    this.manageBusinessesSidebarExpanded = false;
  }

  toggleBusinessSidebar(): void {
    this.businessSidebarExpanded = !this.businessSidebarExpanded;
  }

  toggleManageBusinessesSidebar(): void {
    this.manageBusinessesSidebarExpanded = !this.manageBusinessesSidebarExpanded;
  }

  // removed staff sidebar

  // Navigate to Website Creator default page (no select segment)
  navigateToWebsiteCreator(): void {
    console.log('Attempting to navigate to website-creator...');
    this.router.navigate(['/website-creator']).then(
      (success) => console.log('Navigation success:', success),
      (error) => console.error('Navigation error:', error)
    );
  }

  // Load user businesses for staff management
  loadUserBusinesses(): void {
    this.manageBusinessesService.getAllBusinessesForUser().subscribe({
      next: (businesses) => {
        this.userBusinesses = businesses || [];
        console.log('Loaded user businesses for staff management:', this.userBusinesses.length);
      },
      error: (error) => {
        console.error('Error loading user businesses:', error);
      }
    });
  }

  // Navigate to staff management for selected business
  navigateToStaffManagement(business: BusinessRegistrationDto): void {
    this.selectedBusinessForStaff = business;
    this.router.navigate(['/staff/business', business.basicInfo.businessID]);
    this.closeMobileSidebar();
  }

  // Check if user has businesses for staff management
  hasBusinessesForStaff(): boolean {
    return this.userBusinesses.length > 0;
  }

  // Visit staff app in new tab
  visitStaffApp(): void {
    window.open('https://fuzzstaff.vercel.app', '_blank');
    this.closeMobileSidebar();
  }

  private loadSubscriptionStatus(): void {
    if (!this.data.currentUser?.email) return;
    this.isLoadingSubscription = true;
    this.manageBusinessesService.checkSubscriptionStatus(this.data.currentUser.email).subscribe({
      next: (status) => {
        this.subscriptionStatus = status;
        this.isLoadingSubscription = false;
      },
      error: () => {
        this.subscriptionStatus = { isSubscribed: false, status: 'No active subscription found', subscriptionId: null, currentPeriodEnd: null };
        this.isLoadingSubscription = false;
      }
    });
  }

  // Subscription indicator helpers
  get isTrialing(): boolean {
    const s = this.subscriptionStatus?.status?.toLowerCase() || '';
    return this.subscriptionStatus?.isSubscribed === true && s.includes('trial');
  }
  get isActiveSubscribedNoTrial(): boolean {
    const s = this.subscriptionStatus?.status?.toLowerCase() || '';
    return this.subscriptionStatus?.isSubscribed === true && s === 'active';
  }
  get hasNoSubscription(): boolean {
    const s = (this.subscriptionStatus?.status || '').toLowerCase();
    return !this.subscriptionStatus?.isSubscribed || s.includes('no active subscription');
  }

  navigateToBusinessSettings(): void {
    this.router.navigate(['/business/settings']);
    this.closeMobileSidebar();
  }

  // Responsive nav: compute which toolbar items should be hidden (moved to sidebar) based on width
  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    const width = event?.target?.innerWidth || window.innerWidth || 0;
    this.updateResponsiveNav(width);
  }

  private updateResponsiveNav(width: number): void {
    const decrease = Math.max(0, this.baseCollapseWidth - width);
    const hiddenCount = Math.min(this.collapsibleOrder.length, Math.floor(decrease / this.collapseStepPx));
    this.itemsToHide = new Set(this.collapsibleOrder.slice(0, hiddenCount));
    
    // Update overflow menu when responsive state changes
    this.updateOverflowMenu();
  }

  isItemHidden(key: 'home' | 'business' | 'analytics' | 'staff' | 'about'): boolean {
    return this.itemsToHide.has(key);
  }

  get overflowItems(): Array<'home' | 'business' | 'analytics' | 'staff' | 'about'> {
    // Preserve order based on collapsibleOrder
    return this.collapsibleOrder
      .filter(key => this.itemsToHide.has(key)) as Array<'home' | 'business' | 'analytics' | 'staff' | 'about'>;
  }

  // Update overflow menu with hidden items
  private updateOverflowMenu(): void {
    this.overflowMenuItems = [];
    
    this.overflowItems.forEach(item => {
      switch(item) {
        case 'home':
          this.overflowMenuItems.push({ label: 'Home', icon: 'pi pi-home', routerLink: '/' });
          break;
        case 'analytics':
          this.overflowMenuItems.push({ label: 'Analytics', icon: 'pi pi-chart-line', routerLink: '/analytics' });
          break;
        case 'about':
          this.overflowMenuItems.push({ label: 'About', icon: 'pi pi-info-circle', routerLink: '/about' });
          break;
        case 'business':
          this.overflowMenuItems.push({ 
            label: 'Business', 
            icon: 'pi pi-building', 
            items: this.businessMenuItems 
          });
          break;
        case 'staff':
          this.overflowMenuItems.push({ 
            label: 'Staff', 
            icon: 'pi pi-users', 
            items: this.staffMenuItems 
          });
          break;
      }
    });
  }

  // Initialize PrimeNG menu items with proper hierarchy
  private initializeMenus(): void {
    // Main navigation items (these appear in topbar)
    this.megaMenuItems = [
      {
        label: 'Home',
        icon: 'pi pi-home',
        routerLink: '/',
        styleClass: this.isRouteActive('/') ? 'active-menu-item' : ''
      },
      {
        label: 'Analytics',
        icon: 'pi pi-chart-line',
        routerLink: '/analytics',
        styleClass: this.isRouteActive('/analytics') ? 'active-menu-item' : ''
      },
      {
        label: 'About',
        icon: 'pi pi-info-circle',
        routerLink: '/about',
        styleClass: this.isRouteActive('/about') ? 'active-menu-item' : ''
      },
      {
        label: 'Business',
        icon: 'pi pi-building',
        styleClass: this.isRouteActive('/business') ? 'active-menu-item' : '',
        items: [
          [
            {
              label: 'Business Setup',
              items: [
                { label: 'Add Business', icon: 'pi pi-plus', routerLink: '/business/add' }
              ]
            },
            {
              label: 'Manage Businesses',
              items: [
                { label: 'Website Creator', icon: 'pi pi-globe', command: () => this.navigateToWebsiteCreator() },
                { label: 'View Businesses', icon: 'pi pi-list', routerLink: '/business/manage' },
                { label: 'Order Forms', icon: 'pi pi-file-edit', routerLink: '/order-forms' }
              ]
            },
            {
              label: 'Business Settings',
              items: [
                { label: 'Business Settings', icon: 'pi pi-cog', routerLink: '/business/settings' },
                { label: 'Business Profile', icon: 'pi pi-user', routerLink: '/business/profile' }
              ]
            }
          ]
        ]
      },
      {
        label: 'Staff',
        icon: 'pi pi-users',
        styleClass: this.isRouteActive('/staff') ? 'active-menu-item' : '',
        items: [
          [
            {
              label: 'Staff Management',
              items: [
                { label: 'Visit Staff App', icon: 'pi pi-external-link', command: () => this.visitStaffApp() }
              ]
            },
            {
              label: 'Your Businesses',
              items: this.userBusinesses.length > 0 ? this.userBusinesses.map(business => ({
                label: business.basicInfo.businessName,
                icon: 'pi pi-building',
                command: () => this.navigateToStaffManagement(business)
              })) : [
                { label: 'No businesses yet', icon: 'pi pi-info-circle', disabled: true }
              ]
            }
          ]
        ]
      }
    ];


    // Business dropdown menu with proper hierarchy
    this.businessMenuItems = [
      {
        label: 'Add Business',
        icon: 'pi pi-plus',
        routerLink: '/business/add',
        command: () => {
          console.log('Add Business clicked');
          this.router.navigate(['/business/add']);
        }
      },
      { separator: true },
      {
        label: 'Website Creator',
        icon: 'pi pi-globe',
        command: () => {
          console.log('Website Creator clicked');
          this.navigateToWebsiteCreator();
        }
      },
      {
        label: 'View Businesses',
        icon: 'pi pi-list',
        routerLink: '/business/manage',
        command: () => {
          console.log('View Businesses clicked');
          this.router.navigate(['/business/manage']);
        }
      },
      {
        label: 'Order Forms',
        icon: 'pi pi-file-edit',
        routerLink: '/order-forms',
        command: () => {
          console.log('Order Forms clicked');
          this.router.navigate(['/order-forms']);
        }
      },
      { separator: true },
      {
        label: 'Business Settings',
        icon: 'pi pi-cog',
        routerLink: '/business/settings',
        command: () => {
          console.log('Business Settings clicked');
          this.router.navigate(['/business/settings']);
        }
      }
    ];

    // Staff dropdown menu
    this.staffMenuItems = [
      {
        label: 'Visit Staff App',
        icon: 'pi pi-external-link',
        command: () => this.visitStaffApp()
      }
    ];

    // Add user businesses to staff menu
    if (this.userBusinesses.length > 0) {
      this.staffMenuItems.push({ separator: true });
      this.staffMenuItems.push({
        label: 'Your Businesses',
        icon: 'pi pi-building',
        items: this.userBusinesses.map(business => ({
          label: business.basicInfo.businessName,
          icon: 'pi pi-building',
          command: () => this.navigateToStaffManagement(business)
        }))
      });
    }

    // Update overflow menu items based on hidden items
    this.updateOverflowMenu();

    // Mobile menu (flat structure for mobile)
    this.mobileMenuItems = [
      {
        label: 'Home',
        icon: 'pi pi-home',
        routerLink: '/'
      },
      {
        label: 'Business',
        icon: 'pi pi-building',
        items: [
          { label: 'Add Business', icon: 'pi pi-plus', routerLink: '/business/add' },
          { label: 'View Businesses', icon: 'pi pi-list', routerLink: '/business/manage' },
          { label: 'Order Forms', icon: 'pi pi-file-edit', routerLink: '/order-forms' },
          { label: 'Website Creator', icon: 'pi pi-globe', command: () => this.navigateToWebsiteCreator() },
          { label: 'Business Settings', icon: 'pi pi-cog', routerLink: '/business/settings' }
        ]
      },
      {
        label: 'Staff',
        icon: 'pi pi-users',
        items: [
          { label: 'Visit Staff App', icon: 'pi pi-external-link', command: () => this.visitStaffApp() },
          ...this.userBusinesses.map(business => ({
            label: business.basicInfo.businessName,
            icon: 'pi pi-building',
            command: () => this.navigateToStaffManagement(business)
          }))
        ]
      },
      {
        label: 'Analytics',
        icon: 'pi pi-chart-line',
        routerLink: '/analytics'
      },
      {
        label: 'About',
        icon: 'pi pi-info-circle',
        routerLink: '/about'
      }
    ];
  }
}
