import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DataSvrService } from '../services/data-svr.service';
import { ManageBusinessesService } from '../services/manage-businesses.service';
import { SubscriptionStatus } from '../models/subscription-status';
import { CheckoutService } from '../services/checkout';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-business-settings',
  standalone: false,
  templateUrl: './business-settings.component.html',
  styleUrl: './business-settings.component.css'
})
export class BusinessSettingsComponent implements OnInit {
  // Loading state for subscription redirect
  isSubscribing: boolean = false;
  
  // Simplified subscription UI: free trial flows removed from UI
  isBrowser: boolean = false;
  minDate: Date = new Date();

  // Subscription status properties
  subscriptionStatus: SubscriptionStatus | null = null;
  isLoadingSubscription: boolean = false;
  // Derived flags for UI states
  get isTrialing(): boolean {
    const status = this.subscriptionStatus?.status?.toLowerCase() || '';
    return this.subscriptionStatus?.isSubscribed === true && status.includes('trial');
  }
  get isActiveSubscribedNoTrial(): boolean {
    const status = this.subscriptionStatus?.status?.toLowerCase() || '';
    return this.subscriptionStatus?.isSubscribed === true && status === 'active';
  }
  get hasNoSubscription(): boolean {
    if (!this.subscriptionStatus) return false;
    const status = (this.subscriptionStatus.status || '').toLowerCase();
    return this.subscriptionStatus.isSubscribed === false || status.includes('no active subscription');
  }

  constructor(
    public data: DataSvrService,
    private manageBusinessesService: ManageBusinessesService,
    private checkoutService: CheckoutService,
    private route: ActivatedRoute,
    private router: Router,
    private messageService: MessageService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    
    // Set minimum date to today (kept for potential future date pickers)
    this.minDate = new Date();
    this.minDate.setHours(0, 0, 0, 0);
  }

  private parseDateString(dateStr: string): Date {
    if (!dateStr) {
      return new Date();
    }
    
    // Check if it's ISO format (YYYY-MM-DD) or DD/MM/YYYY format
    if (dateStr.includes('-') && dateStr.length === 10) {
      // ISO format: YYYY-MM-DD - parse as local date
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day); // month is 0-based in JavaScript
    } else if (dateStr.includes('/')) {
      // DD/MM/YYYY format
      const [day, month, year] = dateStr.split('/').map(Number);
      return new Date(year, month - 1, day); // month is 0-based in JavaScript
    } else {
      // Fallback: try to parse as-is
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? new Date() : date;
    }
  }

  private calculateDaysRemaining(endDate: Date): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time part for accurate day calculation
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays); // Don't return negative days
  }

  private isTrialActive(endDate: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include the end date fully
    return today <= end;
  }

  async redirectToStripeCheckout(freeTrial: boolean = false): Promise<void> {
    if (this.isSubscribing) return;
    this.isSubscribing = true;
    try {
      const checkoutUrl = await this.checkoutService.getSubscriptionCheckoutUrl(freeTrial);
      // Redirect the current window to preserve auth context
      window.location.assign(checkoutUrl);
    } catch (error: any) {
      console.error('Failed to create Stripe Checkout session:', error);
      const message = error?.status === 401 || error?.status === 403
        ? 'You must be signed in to subscribe. Please sign in and try again.'
        : 'Could not start checkout. Please try again later.';
      this.data.openSnackBar(message, 'Close', 5000);
    } finally {
      // Note: after successful assign this code may not run, but safe for error case
      this.isSubscribing = false;
    }
  }

  ngOnInit(): void {
    // Handle billing result messages via route param
    this.route.paramMap.subscribe(params => {
      const result = params.get('result');
      if (result === 'success') {
        this.messageService.add({ severity: 'success', summary: 'Subscription active', detail: 'Payment successful. Thank you!' });
        // Optionally refresh subscription status
        this.checkSubscriptionStatus();
      } else if (result === 'cancel') {
        this.messageService.add({ severity: 'info', summary: 'Checkout canceled', detail: 'No charges were made.' });
      }
    });

    if (this.data.currentUser?.email) {
      // Check subscription status first
      this.checkSubscriptionStatus();
    }
  }

  /**
   * Check the subscription status for the current user
   */
  private checkSubscriptionStatus(): void {
    if (!this.data.currentUser?.email) {
      return;
    }

    this.isLoadingSubscription = true;
    this.manageBusinessesService.checkSubscriptionStatus(this.data.currentUser.email).subscribe({
      next: (status: SubscriptionStatus) => {
        this.subscriptionStatus = status;
        this.isLoadingSubscription = false;
        console.log('Subscription status loaded:', status);
        
        // No-op visual effects for now
      },
      error: (error: any) => {
        console.error('Error checking subscription status:', error);
        this.isLoadingSubscription = false;
        
        // Set default status on error
        this.subscriptionStatus = {
          isSubscribed: false,
          status: 'No active subscription found',
          subscriptionId: null,
          currentPeriodEnd: null
        };
        
        this.data.openSnackBar('Failed to check subscription status', 'Close', 3000);
      }
    });
  }



  // Helper methods for date conversion
  formatDateForInput(date: Date): string {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  parseDateFromInput(dateString: string): Date {
    if (!dateString) return new Date();
    return new Date(dateString);
  }

  // Removed free trial form logic

  upgradeToPremium(): void {
    // Redirect to Stripe checkout for premium subscription
    this.redirectToStripeCheckout(false);
  }

  startStripeTrial(): void {
    // New flow: Stripe-managed free trial via checkout
    this.redirectToStripeCheckout(true);
  }

  cancelTrialLocally(): void {
    // No backend endpoint; record intent locally and inform user
    this.checkoutService.setLastAction('endTrial');
    this.messageService.add({ severity: 'success', summary: 'Trial will continue until end date', detail: 'Auto-charge will occur if you do not cancel from your Stripe customer portal.' });
  }

  unsubscribeLocally(): void {
    // Placeholder until API exists
    this.checkoutService.setLastAction('cancel');
    this.messageService.add({ severity: 'warn', summary: 'Unsubscribe not yet available', detail: 'Please use the Stripe customer portal to manage your subscription.' });
  }

  showTrialFAQ(): void {
    // TODO: Implement FAQ display
    this.data.openSnackBar('FAQ feature coming soon!', 'Close', 3000);
  }
}
