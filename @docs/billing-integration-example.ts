// Example of how to integrate billing checks into existing components

// In your component (e.g., business creation component):

import { Component } from '@angular/core';
import { BillingGuardService, BillingGuardResult } from '../services/Business/Billing/billing-guard.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-example-integration',
  template: `
    <button 
      pButton 
      pRipple 
      label="Create Business" 
      (click)="createBusiness()"
      [disabled]="isCreating"
    ></button>
  `
})
export class ExampleIntegrationComponent {
  isCreating = false;

  constructor(
    private billingGuard: BillingGuardService,
    private messageService: MessageService
  ) {}

  createBusiness(): void {
    this.isCreating = true;

    // Check billing limits before creating business
    this.billingGuard.canCreateBusiness().subscribe({
      next: (result: BillingGuardResult) => {
        if (!result.canProceed) {
          // Show error message
          this.messageService.add({
            severity: 'error',
            summary: 'Cannot Create Business',
            detail: result.errorMessage || 'Unable to create business due to billing limits'
          });
          
          if (result.requiresUpgrade) {
            // Show upgrade prompt
            this.showUpgradePrompt();
          }
          
          this.isCreating = false;
          return;
        }

        // Check if confirmation is needed for additional cost
        if (result.requiresConfirmation && result.confirmationMessage) {
          const confirmed = confirm(result.confirmationMessage);
          if (!confirmed) {
            this.isCreating = false;
            return;
          }
        }

        // Proceed with business creation
        this.proceedWithBusinessCreation();
      },
      error: (error) => {
        console.error('Billing check failed:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Unable to verify billing limits. Please try again.'
        });
        this.isCreating = false;
      }
    });
  }

  private proceedWithBusinessCreation(): void {
    // Your existing business creation logic here
    console.log('Creating business...');
    
    // Simulate business creation
    setTimeout(() => {
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Business created successfully!'
      });
      this.isCreating = false;
    }, 2000);
  }

  private showUpgradePrompt(): void {
    // Navigate to pricing page or show upgrade modal
    console.log('Show upgrade prompt');
  }
}

// Similar patterns for other actions:

// For adding staff:
// this.billingGuard.canAddStaff(businessId).subscribe(...)

// For creating workspace:
// this.billingGuard.canCreateWorkspace(businessId).subscribe(...)

// For deploying website:
// this.billingGuard.canDeployWebsite(businessId).subscribe(...)
