import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { DataSvrService } from '../services/Other/data-svr.service';
import { ManageBusinessesService } from '../services/Business/Manage/manage-businesses.service';
import { BillingService } from '../services/Business/Billing/billing.service';
import { SubscriptionStatus } from '../models/subscription-status';
import { 
  BillingPlan, 
  BillingProfile, 
  UsageSummary, 
  SubscribeRequest, 
  ActionCheckRequest,
  BillingError 
} from '../models/billing.models';
import { CheckoutService } from '../services/Main/stripe/checkout';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-business-settings',
  standalone: false,
  templateUrl: './business-settings.component.html',
  styleUrl: './business-settings.component.css'
})
export class BusinessSettingsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  // Loading state for subscription redirect
  isSubscribing: boolean = false;
  
  // Simplified subscription UI: free trial flows removed from UI
  isBrowser: boolean = false;
  minDate: Date = new Date();

  // Legacy subscription status properties (kept for backward compatibility)
  subscriptionStatus: SubscriptionStatus | null = null;
  isLoadingSubscription: boolean = false;

  // New billing system properties
  availablePlans: BillingPlan[] = [];
  billingProfile: BillingProfile | null = null;
  usageSummary: UsageSummary | null = null;
  billingError: BillingError | null = null;
  isBillingLoading = false;
  selectedPlan: BillingPlan | null = null;
  businessCounts: { [planId: number]: number } = {};
  
  // View states
  showPricingPlans = false;
  showUsageDetails = false;
  totalOverageCost = 0;
  nextBillingAmount = 0;
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
    private billingService: BillingService,
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

  // New billing system methods
  togglePricingPlans(): void {
    this.showPricingPlans = !this.showPricingPlans;
    if (this.showPricingPlans && this.availablePlans.length === 0) {
      this.billingService.getAllPlans(true).subscribe();
    }
  }

  toggleUsageDetails(): void {
    this.showUsageDetails = !this.showUsageDetails;
  }

  onBusinessCountChange(planId: number, count: number): void {
    const plan = this.availablePlans.find(p => p.id === planId);
    if (plan && plan.capabilities) {
      const maxCount = plan.capabilities.maxTotalBusinesses;
      this.businessCounts[planId] = Math.min(Math.max(1, count), maxCount);
    }
  }

  calculateTotalPrice(plan: BillingPlan): number {
    if (!plan.capabilities) return plan.basePrice;
    
    const businessCount = this.businessCounts[plan.id] || 1;
    const freeBusinesses = plan.capabilities.maxFreeBusinesses;
    const additionalBusinesses = Math.max(0, businessCount - freeBusinesses);
    
    return plan.basePrice + (additionalBusinesses * plan.capabilities.additionalBusinessPrice);
  }

  onSubscribeToPlan(plan: BillingPlan): void {
    if (!this.data.currentUser) {
      this.router.navigate(['/sign-in-or-sign-up']);
      return;
    }

    const businessCount = this.businessCounts[plan.id] || 1;
    const subscribeRequest: SubscribeRequest = {
      planId: plan.id,
      businessCount: businessCount,
      redirectUrl: `${window.location.origin}/business-settings/success`,
      startTrial: false
    };

    console.log('Subscribing to plan with request:', subscribeRequest);
    this.isSubscribing = true;
    this.billingError = null;

    this.billingService.subscribeToPlan(subscribeRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Subscribe response received:', response);
          
          if (response.success && response.checkoutUrl) {
            console.log('Redirecting to checkout URL:', response.checkoutUrl);
            // Don't set isSubscribing to false before redirect - we're leaving the page
            window.location.href = response.checkoutUrl;
          } else {
            this.isSubscribing = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Subscription Failed',
              detail: response.errorMessage || 'Subscription failed. Please try again.'
            });
          }
        },
        error: (error) => {
          console.error('Subscription error:', error);
          this.isSubscribing = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Subscription Error',
            detail: 'An error occurred while processing your subscription.'
          });
        }
      });
  }

  onStartTrial(plan: BillingPlan): void {
    if (!this.data.currentUser) {
      this.router.navigate(['/sign-in-or-sign-up']);
      return;
    }

    const businessCount = this.businessCounts[plan.id] || 1;
    const subscribeRequest: SubscribeRequest = {
      planId: plan.id,
      businessCount: businessCount,
      redirectUrl: `${window.location.origin}/business-settings/success`,
      startTrial: true
    };

    console.log('Starting trial with request:', subscribeRequest);
    this.isSubscribing = true;
    this.billingError = null;

    this.billingService.subscribeToPlan(subscribeRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Trial response received:', response);
          this.isSubscribing = false;
          
          if (response.success) {
            // If there's a checkout URL, redirect to it (for payment method setup)
            if (response.checkoutUrl) {
              console.log('Redirecting to checkout URL for trial setup:', response.checkoutUrl);
              window.location.href = response.checkoutUrl;
            } else {
              // Trial activated without needing checkout
              this.messageService.add({
                severity: 'success',
                summary: 'Trial Started',
                detail: 'Your free trial has been activated!'
              });
              // Refresh billing data
              this.loadBillingData();
            }
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Trial Failed',
              detail: response.errorMessage || 'Trial setup failed. Please try again.'
            });
          }
        },
        error: (error) => {
          console.error('Trial setup error:', error);
          this.isSubscribing = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Trial Error',
            detail: 'An error occurred while setting up your trial.'
          });
        }
      });
  }

  refreshBillingData(): void {
    this.billingService.refreshBillingData();
    this.checkSubscriptionStatus(); // Also refresh legacy data
  }

  dismissBillingError(): void {
    this.billingError = null;
  }

  // Utility methods
  getUsageStatusClass(percentage: number): string {
    if (percentage >= 100) return 'usage-over';
    if (percentage >= 80) return 'usage-warning';
    return 'usage-normal';
  }

  getUsageStatusText(percentage: number): string {
    if (percentage >= 100) return 'Over Limit';
    if (percentage >= 80) return 'Near Limit';
    return 'Within Limit';
  }

  getBillingStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' {
    switch (status) {
      case 'active': return 'success';
      case 'trialing': return 'info';
      case 'past_due': return 'warning';
      case 'canceled': return 'danger';
      case 'incomplete': return 'warning';
      default: return 'info';
    }
  }

  getBillingStatusClass(status: string): string {
    switch (status) {
      case 'active': return 'status-active';
      case 'trialing': return 'status-trial';
      case 'past_due': return 'status-warning';
      case 'canceled': return 'status-error';
      case 'incomplete': return 'status-warning';
      default: return 'status-unknown';
    }
  }

  getBillingStatusText(status: string): string {
    switch (status) {
      case 'active': return 'Active';
      case 'trialing': return 'Free Trial';
      case 'past_due': return 'Payment Due';
      case 'canceled': return 'Canceled';
      case 'incomplete': return 'Setup Incomplete';
      default: return status;
    }
  }

  formatCurrency(amount: number, currency: string = 'AUD'): string {
    return this.billingService.formatCurrency(amount, currency);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getDaysUntilBilling(): number {
    if (!this.billingProfile?.nextBillingDate) return 0;
    
    const nextBilling = new Date(this.billingProfile.nextBillingDate);
    const today = new Date();
    const diffTime = nextBilling.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getDaysUntilTrialEnd(): number {
    if (!this.billingProfile?.trialEndsAt) return 0;
    
    const trialEnd = new Date(this.billingProfile.trialEndsAt);
    const today = new Date();
    const diffTime = trialEnd.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  isTrialExpiringSoon(): boolean {
    return this.billingProfile?.billingStatus === 'trialing' && this.getDaysUntilTrialEnd() <= 7;
  }

  getUsagePercentage(current: number, included: number): number {
    return Math.min(100, (current / included) * 100);
  }

  getFeatureIcon(hasFeature: boolean): string {
    return hasFeature ? 'check' : 'close';
  }

  getFeatureClass(hasFeature: boolean): string {
    return hasFeature ? 'feature-included' : 'feature-excluded';
  }

  // Legacy methods (kept for backward compatibility)
  async redirectToStripeCheckout(freeTrial: boolean = false): Promise<void> {
    if (this.isSubscribing) return;
    this.isSubscribing = true;
    try {
      const checkoutUrl = await this.checkoutService.getSubscriptionCheckoutUrl(freeTrial);
      window.location.assign(checkoutUrl);
    } catch (error: any) {
      console.error('Failed to create Stripe Checkout session:', error);
      const message = error?.status === 401 || error?.status === 403
        ? 'You must be signed in to subscribe. Please sign in and try again.'
        : 'Could not start checkout. Please try again later.';
      this.data.openSnackBar(message, 'Close', 5000);
    } finally {
      this.isSubscribing = false;
    }
  }

  ngOnInit(): void {
    this.initializeBillingListeners();
    
    // Handle billing result messages via route param
    this.route.paramMap.subscribe(params => {
      const result = params.get('result');
      if (result === 'success') {
        this.messageService.add({ severity: 'success', summary: 'Subscription active', detail: 'Payment successful. Thank you!' });
        // Refresh both legacy and new billing data
        this.checkSubscriptionStatus();
        this.loadBillingData();
      } else if (result === 'cancel') {
        this.messageService.add({ severity: 'info', summary: 'Checkout canceled', detail: 'No charges were made.' });
      }
    });

    if (this.data.currentUser?.email) {
      // Load both legacy and new billing data
      this.checkSubscriptionStatus();
      this.loadBillingData();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeBillingListeners(): void {
    // Listen for billing profile changes
    this.billingService.billingProfile$
      .pipe(takeUntil(this.destroy$))
      .subscribe(profile => {
        this.billingProfile = profile;
        this.calculateBillingAmounts();
      });

    // Listen for usage changes
    this.billingService.usageSummary$
      .pipe(takeUntil(this.destroy$))
      .subscribe(usage => {
        this.usageSummary = usage;
        this.calculateBillingAmounts();
      });

    // Listen for available plans
    this.billingService.availablePlans$
      .pipe(takeUntil(this.destroy$))
      .subscribe(plans => {
        this.availablePlans = plans;
        // Initialize business counts
        plans.forEach(plan => {
          this.businessCounts[plan.id] = plan.capabilities?.maxFreeBusinesses || 1;
        });
      });

    // Listen for loading state
    this.billingService.isLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.isBillingLoading = loading;
      });

    // Listen for errors
    this.billingService.lastError$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        this.billingError = error;
      });

    // Listen for overage cost changes
    this.billingService.getCurrentOverageCost()
      .pipe(takeUntil(this.destroy$))
      .subscribe(cost => {
        this.totalOverageCost = cost;
        this.calculateBillingAmounts();
      });
  }

  private loadBillingData(): void {
    // Load plans first (always available)
    this.billingService.getAllPlans().subscribe({
      next: () => {},
      error: (err) => console.error('Error loading plans:', err)
    });
    
    // Load billing profile (may not exist for new users)
    this.billingService.getBillingProfile().subscribe({
      next: () => {},
      error: (err) => {
        // Don't show error for "no profile" - this is expected for new users
        if (err && err.code !== 'NOT_FOUND') {
          console.error('Error loading billing profile:', err);
        }
      }
    });
    
    // Load usage summary (may not exist for new users)
    this.billingService.getUsageSummary().subscribe({
      next: () => {},
      error: (err) => {
        // Don't show error for "no usage" - this is expected for new users
        if (err && err.code !== 'NOT_FOUND') {
          console.error('Error loading usage summary:', err);
        }
      }
    });
  }

  private calculateBillingAmounts(): void {
    if (!this.billingProfile) return;
    
    this.nextBillingAmount = this.billingProfile.plan.basePrice;
    
    if (this.billingProfile.plan.capabilities && this.billingProfile.businessCount > this.billingProfile.plan.capabilities.maxFreeBusinesses) {
      const additionalBusinesses = this.billingProfile.businessCount - this.billingProfile.plan.capabilities.maxFreeBusinesses;
      this.nextBillingAmount += additionalBusinesses * this.billingProfile.plan.capabilities.additionalBusinessPrice;
    }
    
    this.nextBillingAmount += this.totalOverageCost;
  }

  /**
   * Check the subscription status for the current user (legacy method)
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
