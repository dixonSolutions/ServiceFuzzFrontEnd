import { Component, OnInit } from '@angular/core';
import { DataSvrService } from '../services/data-svr.service';
import { ServiceFuzzFreeTrialSubscriptions } from '../models/FreeTrialDetails';

@Component({
  selector: 'app-business-settings',
  standalone: false,
  templateUrl: './business-settings.component.html',
  styleUrl: './business-settings.component.css'
})
export class BusinessSettingsComponent implements OnInit {
  private readonly STRIPE_CHECKOUT_URL = 'https://buy.stripe.com/test_3cI4gs6XybHR9oU2uy1gs01';

  constructor(public data: DataSvrService) {}

  private parseDateString(dateStr: string): Date {
    // Parse date in DD/MM/YYYY format
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day); // month is 0-based in JavaScript
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
          if(!trialDetails.isActive){
            this.data.jsConfetti.addConfetti({
              emojis: ['💀', '❌', '😔', '😭', '😢'],
              confettiRadius: 6,
              confettiNumber: 50,
            });
          }
          if (trialDetails.isActive) {
            this.data.triggerSuccessConfetti();
          }
        },
        error: (error: Error) => {
          console.error('Error fetching free trial details:', error);
          this.data.openSnackBar('Failed to fetch trial details', 'Close', 3000);
        }
      });
    }
  }

  startFreeTrial(): void {
    // TODO: Implement start free trial functionality
    this.data.openSnackBar('Free trial feature coming soon!', 'Close', 3000);
  }

  upgradeToPremium(): void {
    // TODO: Implement upgrade to premium functionality
    this.data.openSnackBar('Upgrade feature coming soon!', 'Close', 3000);
  }

  showTrialFAQ(): void {
    // TODO: Implement FAQ display
    this.data.openSnackBar('FAQ feature coming soon!', 'Close', 3000);
  }
}
