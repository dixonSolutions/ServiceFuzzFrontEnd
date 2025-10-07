import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { BillingService } from './billing.service';
import { ActionCheckRequest, ActionCheckResponse } from '../../../models/billing.models';

export interface BillingGuardResult {
  canProceed: boolean;
  errorMessage?: string;
  additionalCost?: number;
  requiresUpgrade?: boolean;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BillingGuardService {

  constructor(private billingService: BillingService) {}

  /**
   * Check if user can perform an action before executing it
   */
  checkAction(actionType: ActionCheckRequest['actionType'], businessId?: string): Observable<BillingGuardResult> {
    const request: ActionCheckRequest = {
      actionType,
      businessId
    };

    return this.billingService.checkAction(request).pipe(
      map((response: ActionCheckResponse) => {
        const result: BillingGuardResult = {
          canProceed: response.canPerform,
          errorMessage: response.errorMessage || undefined,
          additionalCost: response.additionalCost,
          requiresUpgrade: response.requiresUpgrade
        };

        // Add confirmation message if there's additional cost
        if (response.canPerform && response.additionalCost > 0) {
          result.requiresConfirmation = true;
          result.confirmationMessage = this.getConfirmationMessage(actionType, response.additionalCost);
        }

        return result;
      }),
      catchError(error => {
        console.error('Billing guard error:', error);
        
        // Return a safe default that blocks the action
        return of({
          canProceed: false,
          errorMessage: 'Unable to verify billing limits. Please try again or contact support.',
          requiresUpgrade: false
        });
      })
    );
  }

  /**
   * Check if user can create a business
   */
  canCreateBusiness(businessId?: string): Observable<BillingGuardResult> {
    return this.checkAction('add_business', businessId);
  }

  /**
   * Check if user can add staff to a business
   */
  canAddStaff(businessId: string): Observable<BillingGuardResult> {
    return this.checkAction('add_staff', businessId);
  }

  /**
   * Check if user can create a workspace
   */
  canCreateWorkspace(businessId?: string): Observable<BillingGuardResult> {
    return this.checkAction('create_workspace', businessId);
  }

  /**
   * Check if user can deploy a website
   */
  canDeployWebsite(businessId?: string): Observable<BillingGuardResult> {
    return this.checkAction('deploy_website', businessId);
  }

  /**
   * Get appropriate confirmation message for actions with additional cost
   */
  private getConfirmationMessage(actionType: ActionCheckRequest['actionType'], additionalCost: number): string {
    const formattedCost = this.billingService.formatCurrency(additionalCost);
    
    switch (actionType) {
      case 'add_business':
        return `Creating this business will add ${formattedCost}/month to your subscription. Do you want to continue?`;
      case 'add_staff':
        return `Adding this staff member will cost ${formattedCost}/month. Do you want to continue?`;
      case 'create_workspace':
        return `Creating this workspace will cost ${formattedCost}/month. Do you want to continue?`;
      case 'deploy_website':
        return `Deploying this website will cost ${formattedCost}/month. Do you want to continue?`;
      default:
        return `This action will cost ${formattedCost}/month. Do you want to continue?`;
    }
  }

  /**
   * Get user-friendly error message for blocked actions
   */
  getBlockedActionMessage(actionType: ActionCheckRequest['actionType'], requiresUpgrade: boolean): string {
    if (requiresUpgrade) {
      switch (actionType) {
        case 'add_business':
          return 'You have reached your business limit. Please upgrade your plan to create more businesses.';
        case 'add_staff':
          return 'You have reached your staff limit. Please upgrade your plan or enable overage billing to add more staff.';
        case 'create_workspace':
          return 'You have reached your workspace limit. Please upgrade your plan or enable overage billing to create more workspaces.';
        case 'deploy_website':
          return 'You have reached your deployment limit. Please upgrade your plan or enable overage billing to deploy more websites.';
        default:
          return 'You have reached your plan limit. Please upgrade to continue.';
      }
    } else {
      switch (actionType) {
        case 'add_business':
          return 'Unable to create business. Please check your subscription status.';
        case 'add_staff':
          return 'Unable to add staff member. Please check your subscription status.';
        case 'create_workspace':
          return 'Unable to create workspace. Please check your subscription status.';
        case 'deploy_website':
          return 'Unable to deploy website. Please check your subscription status.';
        default:
          return 'Action not allowed. Please check your subscription status.';
      }
    }
  }

  /**
   * Show upgrade prompt for blocked actions
   */
  getUpgradePromptMessage(actionType: ActionCheckRequest['actionType']): string {
    switch (actionType) {
      case 'add_business':
        return 'Upgrade your plan to create unlimited businesses with advanced features.';
      case 'add_staff':
        return 'Upgrade your plan to add more staff members or enable overage billing.';
      case 'create_workspace':
        return 'Upgrade your plan to create more workspaces or enable overage billing.';
      case 'deploy_website':
        return 'Upgrade your plan to deploy more websites or enable overage billing.';
      default:
        return 'Upgrade your plan to unlock more features and higher limits.';
    }
  }
}
