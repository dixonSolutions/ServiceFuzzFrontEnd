import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { 
  BillingPlan, 
  PlanCapabilities, 
  BillingProfile, 
  UsageSummary, 
  SubscribeRequest, 
  SubscribeResponse, 
  ActionCheckRequest, 
  ActionCheckResponse,
  BillingError
} from '../../../models/billing.models';
import { DataSvrService } from '../../Other/data-svr.service';

@Injectable({
  providedIn: 'root'
})
export class BillingService {
  private readonly apiUrl = 'https://servicefuzzapi-atf8b4dqawc8dsa9.australiaeast-01.azurewebsites.net';
  
  // State management
  private _billingProfile = new BehaviorSubject<BillingProfile | null>(null);
  private _usageSummary = new BehaviorSubject<UsageSummary | null>(null);
  private _availablePlans = new BehaviorSubject<BillingPlan[]>([]);
  private _isLoading = new BehaviorSubject<boolean>(false);
  private _lastError = new BehaviorSubject<BillingError | null>(null);

  // Public observables
  public billingProfile$ = this._billingProfile.asObservable();
  public usageSummary$ = this._usageSummary.asObservable();
  public availablePlans$ = this._availablePlans.asObservable();
  public isLoading$ = this._isLoading.asObservable();
  public lastError$ = this._lastError.asObservable();

  // Cache management
  private profileCache: BillingProfile | null = null;
  private profileCacheTimestamp: number | null = null;
  private usageCache: UsageSummary | null = null;
  private usageCacheTimestamp: number | null = null;
  private plansCache: BillingPlan[] | null = null;
  private plansCacheTimestamp: number | null = null;
  private readonly cacheExpiryTime = 5 * 60 * 1000; // 5 minutes

  constructor(
    private http: HttpClient,
    private dataSvr: DataSvrService
  ) {
    this.initializeService();
  }

  private initializeService(): void {
    // Listen to authentication changes to refresh billing data
    this.dataSvr.currentUser$.subscribe((user: any) => {
      if (user) {
        this.refreshBillingData();
      } else {
        this.clearBillingData();
      }
    });
  }

  private getAuthHeaders(): HttpHeaders {
    const token = sessionStorage.getItem('sf_auth_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  private handleError(error: any): Observable<never> {
    console.error('Billing Service Error:', error);
    
    let billingError: BillingError;
    
    if (error.status === 401) {
      billingError = {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Please sign in again.'
      };
    } else if (error.status === 402) {
      billingError = {
        code: 'PAYMENT_REQUIRED',
        message: error.error?.message || 'Subscription required or upgrade needed.',
        requiresUpgrade: true,
        suggestedPlan: error.error?.suggestedPlan
      };
    } else if (error.status === 404) {
      billingError = {
        code: 'NOT_FOUND',
        message: 'Resource not found.'
      };
    } else if (error.status === 400) {
      billingError = {
        code: 'BAD_REQUEST',
        message: error.error?.message || 'Invalid request data.'
      };
    } else {
      billingError = {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred. Please try again.'
      };
    }

    this._lastError.next(billingError);
    return throwError(() => billingError);
  }

  private isCacheValid(timestamp: number | null): boolean {
    if (!timestamp) return false;
    return Date.now() - timestamp < this.cacheExpiryTime;
  }

  // ===================== PUBLIC API ENDPOINTS =====================

  /**
   * Get all available plans with capabilities
   */
  getAllPlans(forceRefresh: boolean = false): Observable<BillingPlan[]> {
    if (!forceRefresh && this.plansCache && this.isCacheValid(this.plansCacheTimestamp)) {
      this._availablePlans.next(this.plansCache);
      return this._availablePlans.asObservable();
    }

    this._isLoading.next(true);
    
    return this.http.get<BillingPlan[]>(`${this.apiUrl}/api/billing/plans`).pipe(
      tap(plans => {
        this.plansCache = plans;
        this.plansCacheTimestamp = Date.now();
        this._availablePlans.next(plans);
        this._isLoading.next(false);
      }),
      catchError(error => {
        this._isLoading.next(false);
        return this.handleError(error);
      })
    );
  }

  /**
   * Get specific plan capabilities
   */
  getPlanCapabilities(planId: number): Observable<PlanCapabilities> {
    return this.http.get<PlanCapabilities>(`${this.apiUrl}/api/billing/plans/${planId}/capabilities`).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // ===================== AUTHENTICATED ENDPOINTS =====================

  /**
   * Subscribe to a plan (creates Stripe checkout)
   */
  subscribeToPlan(request: SubscribeRequest): Observable<SubscribeResponse> {
    this._isLoading.next(true);
    
    return this.http.post<SubscribeResponse>(`${this.apiUrl}/api/billing/subscribe`, request, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(response => {
        if (response.success && response.profile) {
          this._billingProfile.next(response.profile);
          this.profileCache = response.profile;
          this.profileCacheTimestamp = Date.now();
        }
        this._isLoading.next(false);
      }),
      catchError(error => {
        this._isLoading.next(false);
        return this.handleError(error);
      })
    );
  }

  /**
   * Get current user's billing profile
   */
  getBillingProfile(forceRefresh: boolean = false): Observable<BillingProfile> {
    if (!forceRefresh && this.profileCache && this.isCacheValid(this.profileCacheTimestamp)) {
      this._billingProfile.next(this.profileCache);
      return this._billingProfile.asObservable().pipe(
        map(profile => profile!)
      );
    }

    this._isLoading.next(true);
    
    return this.http.get<BillingProfile>(`${this.apiUrl}/api/billing/profile`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(profile => {
        this.profileCache = profile;
        this.profileCacheTimestamp = Date.now();
        this._billingProfile.next(profile);
        this._isLoading.next(false);
      }),
      catchError(error => {
        this._isLoading.next(false);
        return this.handleError(error);
      })
    );
  }

  /**
   * Get current usage summary
   */
  getUsageSummary(forceRefresh: boolean = false): Observable<UsageSummary> {
    if (!forceRefresh && this.usageCache && this.isCacheValid(this.usageCacheTimestamp)) {
      this._usageSummary.next(this.usageCache);
      return this._usageSummary.asObservable().pipe(
        map(usage => usage!)
      );
    }

    this._isLoading.next(true);
    
    return this.http.get<UsageSummary>(`${this.apiUrl}/api/billing/usage`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(usage => {
        this.usageCache = usage;
        this.usageCacheTimestamp = Date.now();
        this._usageSummary.next(usage);
        this._isLoading.next(false);
      }),
      catchError(error => {
        this._isLoading.next(false);
        return this.handleError(error);
      })
    );
  }

  /**
   * Check if an action can be performed before executing it
   */
  checkAction(request: ActionCheckRequest): Observable<ActionCheckResponse> {
    return this.http.post<ActionCheckResponse>(`${this.apiUrl}/api/billing/check-action`, request, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // ===================== UTILITY METHODS =====================

  /**
   * Refresh all billing data
   */
  refreshBillingData(): void {
    this.clearCache();
    this.getBillingProfile(true).subscribe();
    this.getUsageSummary(true).subscribe();
    this.getAllPlans(true).subscribe();
  }

  /**
   * Clear all billing data (on logout)
   */
  clearBillingData(): void {
    this._billingProfile.next(null);
    this._usageSummary.next(null);
    this._availablePlans.next([]);
    this._lastError.next(null);
    this.clearCache();
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.profileCache = null;
    this.profileCacheTimestamp = null;
    this.usageCache = null;
    this.usageCacheTimestamp = null;
    this.plansCache = null;
    this.plansCacheTimestamp = null;
  }

  /**
   * Check if user has a specific feature
   */
  hasFeature(featureName: keyof PlanCapabilities['features']): Observable<boolean> {
    return this.billingProfile$.pipe(
      map(profile => profile?.plan?.capabilities?.features?.[featureName] || false)
    );
  }

  /**
   * Check if user can perform an action (without API call)
   */
  canPerformAction(actionType: ActionCheckRequest['actionType']): Observable<boolean> {
    return this.usageSummary$.pipe(
      map(usage => {
        if (!usage) return false;
        
        switch (actionType) {
          case 'add_business':
            return usage.totalBusinesses < (this._billingProfile.value?.businessCount || 0);
          case 'add_staff':
            return usage.staffOverage === 0 || (this._billingProfile.value?.plan?.overageStaffPrice || 0) > 0;
          case 'create_workspace':
            return usage.workspaceOverage === 0 || (this._billingProfile.value?.plan?.overageWorkspacePrice || 0) > 0;
          case 'deploy_website':
            return usage.deploymentOverage === 0 || (this._billingProfile.value?.plan?.overageDeploymentPrice || 0) > 0;
          default:
            return false;
        }
      })
    );
  }

  /**
   * Get overage cost for current usage
   */
  getCurrentOverageCost(): Observable<number> {
    return this.usageSummary$.pipe(
      map(usage => {
        if (!usage || !this._billingProfile.value?.plan) return 0;
        
        const plan = this._billingProfile.value.plan;
        let totalCost = 0;
        
        totalCost += usage.staffOverage * plan.overageStaffPrice;
        totalCost += usage.workspaceOverage * plan.overageWorkspacePrice;
        totalCost += usage.deploymentOverage * plan.overageDeploymentPrice;
        
        return totalCost;
      })
    );
  }

  /**
   * Format currency amount
   */
  formatCurrency(amount: number, currency: string = 'AUD'): string {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }
}
