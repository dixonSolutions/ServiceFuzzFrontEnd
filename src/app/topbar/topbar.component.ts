import { Component, OnInit, ViewChild } from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatSidenavModule} from '@angular/material/sidenav';
import { DataSvrService } from '../services/data-svr.service';
import {MatMenuModule} from '@angular/material/menu'; 
import { Router } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { MatSidenav } from '@angular/material/sidenav';
import { ManageBusinessesService } from '../services/manage-businesses.service';
import { SubscriptionStatus } from '../models/subscription-status';
import { BusinessRegistrationDto } from '../models/business-registration-dto';

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
  staffSidebarExpanded = false;

  // Business and staff management state
  userBusinesses: BusinessRegistrationDto[] = [];
  selectedBusinessForStaff: BusinessRegistrationDto | null = null;
  private hasAttemptedLoadBusinesses = false;
  private authWatchIntervalId: any;
  private hasAttemptedLoadSubscription = false;

  // Subscription status indicator state
  subscriptionStatus: SubscriptionStatus | null = null;
  isLoadingSubscription: boolean = false;

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
    this.staffSidebarExpanded = false;
  }

  toggleBusinessSidebar(): void {
    this.businessSidebarExpanded = !this.businessSidebarExpanded;
  }

  toggleManageBusinessesSidebar(): void {
    this.manageBusinessesSidebarExpanded = !this.manageBusinessesSidebarExpanded;
  }

  toggleStaffSidebar(): void {
    this.staffSidebarExpanded = !this.staffSidebarExpanded;
    if (this.staffSidebarExpanded && this.userBusinesses.length === 0) {
      this.loadUserBusinesses();
    }
  }

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
}
