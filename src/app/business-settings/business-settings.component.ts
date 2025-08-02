import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DataSvrService } from '../services/data-svr.service';
import { ServiceFuzzFreeTrialSubscriptions } from '../models/FreeTrialDetails';
import { ManageBusinessesService } from '../services/manage-businesses.service';
import { SubscriptionStatus } from '../models/subscription-status';

@Component({
  selector: 'app-business-settings',
  standalone: false,
  templateUrl: './business-settings.component.html',
  styleUrl: './business-settings.component.css'
})
export class BusinessSettingsComponent implements OnInit {
  private readonly STRIPE_CHECKOUT_URL = 'https://buy.stripe.com/test_3cI4gs6XybHR9oU2uy1gs01';
  
  // Free trial form properties
  showFreeTrialForm: boolean = false;
  freeTrialStartDate: Date = new Date();
  freeTrialEndDate: Date = new Date();
  isSubmittingTrial: boolean = false;
  freeTrialFormValid: boolean = false;
  isBrowser: boolean = false;
  minDate: Date = new Date();

  // Subscription status properties
  subscriptionStatus: SubscriptionStatus | null = null;
  isLoadingSubscription: boolean = false;

  constructor(
    public data: DataSvrService,
    private manageBusinessesService: ManageBusinessesService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    
    // Set minimum date to today
    this.minDate = new Date();
    this.minDate.setHours(0, 0, 0, 0);
    
    // Set default dates - start today, end 30 days from now
    this.freeTrialStartDate = new Date();
    this.freeTrialStartDate.setHours(0, 0, 0, 0);
    
    this.freeTrialEndDate = new Date();
    this.freeTrialEndDate.setDate(this.freeTrialEndDate.getDate() + 30);
    this.freeTrialEndDate.setHours(0, 0, 0, 0);
    
    // Initial validation
    this.validateFreeTrialForm();
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

  redirectToStripeCheckout(): void {
    // Open in a new tab to avoid iframe restrictions
    window.open(this.STRIPE_CHECKOUT_URL, '_blank');
  }

  ngOnInit(): void {
    if (this.data.currentUser?.email) {
      // Check subscription status first
      this.checkSubscriptionStatus();
      
      this.data.getFreeTrialDetailsForUserByEmail().subscribe({
        next: (freeTrialDetails: ServiceFuzzFreeTrialSubscriptions) => {
          // Convert string dates to Date objects using our parser
          const startDate = this.parseDateString(freeTrialDetails.startDate as unknown as string);
          const endDate = this.parseDateString(freeTrialDetails.endDate as unknown as string);
          
          const trialDetails = {
            ...freeTrialDetails,
            startDate,
            endDate,
            daysRemaining: this.calculateDaysRemaining(endDate),
            isActive: this.isTrialActive(endDate)
          };
          
          this.data.freeTrialDetails = trialDetails;
          this.showFreeTrialForm = false; // Hide form if trial exists
          
          
          if (trialDetails.isActive) {
          }
        },
        error: (error: any) => {
          console.error('Error fetching free trial details:', error);
          
          // Check if it's a 404 error (trial doesn't exist)
          if (error.status === 404) {
            console.log('Free trial not found - showing form to start trial');
            this.showFreeTrialForm = true;
            this.data.freeTrialDetails = undefined;
          } else {
            this.data.openSnackBar('Failed to fetch trial details', 'Close', 3000);
          }
        }
      });
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
        
        // Show appropriate confetti based on subscription status
        if (status.isSubscribed && status.status === 'active') {
        }
      },
      error: (error: any) => {
        console.error('Error checking subscription status:', error);
        this.isLoadingSubscription = false;
        
        // Set default status on error
        this.subscriptionStatus = {
          isSubscribed: false,
          status: 'No active subscription found'
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

  // Form validation
  validateFreeTrialForm(): void {
    if (!this.freeTrialStartDate || !this.freeTrialEndDate) {
      this.freeTrialFormValid = false;
      return;
    }
    
    const startDate = new Date(this.freeTrialStartDate);
    const endDate = new Date(this.freeTrialEndDate);
    const today = new Date();
    
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    this.freeTrialFormValid = 
      startDate >= today &&
      endDate > startDate;
  }

  // Handle date changes
  onStartDateChange(): void {
    this.validateFreeTrialForm();
  }

  onEndDateChange(): void {
    this.validateFreeTrialForm();
  }

  // Handle date input changes for fallback inputs
  onStartDateInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target && target.value) {
      this.freeTrialStartDate = this.parseDateFromInput(target.value);
      this.onStartDateChange();
    }
  }

  onEndDateInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target && target.value) {
      this.freeTrialEndDate = this.parseDateFromInput(target.value);
      this.onEndDateChange();
    }
  }

  // Show/hide form
  showFreeTrialFormDialog(): void {
    this.showFreeTrialForm = true;
    this.validateFreeTrialForm();
  }

  hideFreeTrialForm(): void {
    this.showFreeTrialForm = false;
  }

  // Submit free trial
  submitFreeTrial(): void {
    if (!this.freeTrialFormValid || this.isSubmittingTrial) {
      return;
    }

    this.isSubmittingTrial = true;
    
    this.manageBusinessesService.startFreeTrial(this.freeTrialStartDate, this.freeTrialEndDate).subscribe({
      next: (response: any) => {
        console.log('Free trial started successfully:', response);
        this.data.openSnackBar('Free trial started successfully!', 'Close', 5000);
        this.showFreeTrialForm = false;
        this.isSubmittingTrial = false;
        
        // Refresh the trial details
        this.ngOnInit();
      },
      error: (error: any) => {
        console.error('Error starting free trial:', error);
        this.data.openSnackBar('Failed to start free trial. Please try again.', 'Close', 5000);
        this.isSubmittingTrial = false;
      }
    });
  }

  startFreeTrial(): void {
    this.showFreeTrialFormDialog();
  }

  upgradeToPremium(): void {
    // Redirect to Stripe checkout for premium subscription
    this.redirectToStripeCheckout();
  }

  showTrialFAQ(): void {
    // TODO: Implement FAQ display
    this.data.openSnackBar('FAQ feature coming soon!', 'Close', 3000);
  }
}
