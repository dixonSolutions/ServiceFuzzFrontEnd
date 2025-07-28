import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { tap } from 'rxjs/operators';
import { BusinessRegistrationDto } from '../models/business-registration-dto';
import { SubscriptionStatus } from '../models/subscription-status';
import { DataSvrService } from './data-svr.service';

/**
 * Interface for Stripe account API response
 */
export interface StripeAccountResponse {
  email?: string;
  message?: string;
  hasStripeAccount: boolean;
}

/**
 * Interface for creating Stripe account request
 */
export interface CreateStripeAccountRequest {
  Email: string;
  Country: string;
  BusinessId: string;
}

/**
 * Interface for Stripe billing setup request (legacy - keeping for compatibility)
 */
export interface StripeBillingSetupRequest {
  businessId: string;
  businessEmail: string;
  businessWebsite?: string | null;
  businessDescription: string;
  businessName: string;
}

@Injectable({
  providedIn: 'root'
})
export class ManageBusinessesService {
  private apiUrl = 'https://servicefuzzapi-atf8b4dqawc8dsa9.australiaeast-01.azurewebsites.net';
  
  // Instance array to store business DTOs
  private businessesInstance: BusinessRegistrationDto[] = [];
  
  // Cache for Stripe account details
  private stripeAccountCache: Map<string, StripeAccountResponse> = new Map();
  private stripeAccountCacheTimestamp: Map<string, number> = new Map();
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes cache duration

  constructor(
    private http: HttpClient,
    private dataSvr: DataSvrService
  ) { }

  /**
   * Get all businesses for the current user
   * @returns Observable of BusinessRegistrationDto array
   */
  getAllBusinessesForUser(): Observable<BusinessRegistrationDto[]> {
    const userId = this.dataSvr.currentUser?.userID;
    
    if (!userId) {
      throw new Error('No user ID available. User may not be logged in.');
    }
    
    // Check if we already have businesses in the instance
    if (this.businessesInstance.length > 0) {
      console.log('Returning businesses from instance:', this.businessesInstance.length, 'businesses');
      return of(this.businessesInstance);
    }
    
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }
    
    const url = `${this.apiUrl}/api/ManagesBusinesses/GetAllBusinessesForUser?userId=${userId}`;
    
    return this.http.get<BusinessRegistrationDto[]>(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      }
    });
  }

  /**
   * Set the businesses instance
   * @param businesses - Array of business DTOs
   */
  setBusinessesInstance(businesses: BusinessRegistrationDto[]): void {
    this.businessesInstance = businesses;
    console.log('Businesses instance set with', businesses.length, 'businesses');
  }

  /**
   * Get the current businesses instance
   * @returns Array of business DTOs
   */
  getBusinessesInstance(): BusinessRegistrationDto[] {
    return this.businessesInstance;
  }

  /**
   * Clear the businesses instance
   */
  clearBusinessesInstance(): void {
    this.businessesInstance = [];
    this.clearStripeAccountCache();
    console.log('Businesses instance and Stripe cache cleared');
  }

  /**
   * Check if businesses instance has data
   * @returns boolean indicating if instance has data
   */
  hasBusinessesInstance(): boolean {
    return this.businessesInstance.length > 0;
  }

  /**
   * Delete a business by ID
   * @param businessId - The ID of the business to delete
   * @returns Observable of any response
   */
  deleteBusiness(businessId: string): Observable<any> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }
    
    const url = `${this.apiUrl}/api/ManagesBusinesses/DeleteBusiness?businessId=${businessId}`;
    
    // Debug logging
    console.log('Delete business API call:', {
      url: url,
      businessId: businessId,
      hasJwtToken: !!jwtToken
    });
    
    return this.http.delete(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      }
    });
  }

  /**
   * Update a business
   * @param business - The updated business data
   * @returns Observable of any response
   */
  updateBusiness(business: BusinessRegistrationDto): Observable<any> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }
    
    const url = `${this.apiUrl}/api/ManagesBusinesses/UpdateBusiness`;
    
    // Debug logging
    console.log('Update business API call:', {
      url: url,
      businessId: business.basicInfo.businessID,
      businessName: business.basicInfo.businessName,
      hasJwtToken: !!jwtToken
    });
    
    return this.http.put(url, business, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      }
    });
  }
  /**
   * Start a free trial for the current user
   * @param startDate - The start date of the free trial
   * @param endDate - The end date of the free trial
   * @returns Observable of any response
   */
  startFreeTrial(startDate: Date, endDate: Date): Observable<any> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    const freeTrialData = {
      userEmail: this.dataSvr.currentUser?.email,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };

    const url = `${this.apiUrl}/api/User/RegisterFreeTrialForUserBusinessAccount`;

    // Debug logging
    console.log('Start free trial API call:', {
      url: url,
      userEmail: freeTrialData.userEmail,
      startDate: freeTrialData.startDate,
      endDate: freeTrialData.endDate,
      hasJwtToken: !!jwtToken
    });

    return this.http.post(url, freeTrialData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      }
    });
  }

  /**
   * Check subscription status for a user
   * @param userEmail - The email of the user to check subscription for
   * @returns Observable of SubscriptionStatus
   */
  checkSubscriptionStatus(userEmail: string): Observable<SubscriptionStatus> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    const url = `${this.apiUrl}/api/Subscription/CheckSubscriptionStatus/${encodeURIComponent(userEmail)}`;

    // Debug logging
    console.log('Check subscription status API call:', {
      url: url,
      userEmail: userEmail,
      hasJwtToken: !!jwtToken
    });

    return this.http.get<SubscriptionStatus>(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      }
    });
  }

    /**
   * Get Stripe account email for a business (with caching)
   * @param businessId - The ID of the business to check Stripe account for
   * @param forceRefresh - Whether to force a refresh from API
   * @returns Observable of Stripe account response
   */
  getStripeAccountEmail(businessId: string, forceRefresh: boolean = false): Observable<StripeAccountResponse> {
    // Check cache first if not forcing refresh
    if (!forceRefresh && this.isStripeAccountCached(businessId)) {
      const cachedResponse = this.stripeAccountCache.get(businessId)!;
      console.log('Returning cached Stripe account data for business:', businessId);
      return of(cachedResponse);
    }

    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    const url = `${this.apiUrl}/api/Subscription/GetStripeAccountEmail/${businessId}`;

    // Debug logging
    console.log('Making Stripe account API call (cache miss or forced refresh):', {
      url: url,
      businessId: businessId,
      forceRefresh: forceRefresh,
      hasJwtToken: !!jwtToken
    });

    return this.http.get<StripeAccountResponse>(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      }
    }).pipe(
      tap(response => {
        // Cache the response
        this.cacheStripeAccountResponse(businessId, response);
      })
    );
  }

  /**
   * Get cached Stripe account data for a business
   * @param businessId - The ID of the business
   * @returns StripeAccountResponse or null if not cached or expired
   */
  getCachedStripeAccountData(businessId: string): StripeAccountResponse | null {
    if (this.isStripeAccountCached(businessId)) {
      return this.stripeAccountCache.get(businessId) || null;
    }
    return null;
  }

  /**
   * Check if Stripe account data is cached and valid for a business
   * @param businessId - The ID of the business
   * @returns boolean indicating if valid cache exists
   */
  isStripeAccountCached(businessId: string): boolean {
    const cachedData = this.stripeAccountCache.get(businessId);
    const cacheTimestamp = this.stripeAccountCacheTimestamp.get(businessId);
    
    if (!cachedData || !cacheTimestamp) {
      return false;
    }

    // Check if cache is still valid (not expired)
    const now = Date.now();
    const isExpired = (now - cacheTimestamp) > this.CACHE_DURATION_MS;
    
    if (isExpired) {
      // Clean up expired cache
      this.stripeAccountCache.delete(businessId);
      this.stripeAccountCacheTimestamp.delete(businessId);
      return false;
    }

    return true;
  }

  /**
   * Cache Stripe account response for a business
   * @param businessId - The ID of the business
   * @param response - The Stripe account response to cache
   */
  cacheStripeAccountResponse(businessId: string, response: StripeAccountResponse): void {
    this.stripeAccountCache.set(businessId, response);
    this.stripeAccountCacheTimestamp.set(businessId, Date.now());
    console.log('Cached Stripe account data for business:', businessId, 'Has account:', response.hasStripeAccount);
  }

  /**
   * Clear Stripe account cache
   * @param businessId - Optional specific business ID to clear, if not provided clears all
   */
  clearStripeAccountCache(businessId?: string): void {
    if (businessId) {
      this.stripeAccountCache.delete(businessId);
      this.stripeAccountCacheTimestamp.delete(businessId);
      console.log('Cleared Stripe cache for business:', businessId);
    } else {
      this.stripeAccountCache.clear();
      this.stripeAccountCacheTimestamp.clear();
      console.log('Cleared entire Stripe account cache');
    }
  }

  /**
   * Get all cached Stripe account statuses
   * @returns Map of business IDs to their Stripe account status
   */
  getAllCachedStripeStatuses(): Map<string, boolean> {
    const statusMap = new Map<string, boolean>();
    
    this.stripeAccountCache.forEach((response, businessId) => {
      if (this.isStripeAccountCached(businessId)) {
        statusMap.set(businessId, response.hasStripeAccount);
      }
    });
    
    return statusMap;
  }

    /**
   * Refresh Stripe account data for specific businesses
   * @param businessIds - Array of business IDs to refresh
   * @returns Observable that completes when all refreshes are done
   */
  refreshStripeAccountData(businessIds: string[]): Observable<StripeAccountResponse[]> {
    const refreshRequests = businessIds.map(businessId => 
      this.getStripeAccountEmail(businessId, true) // Force refresh
    );

    if (refreshRequests.length === 0) {
      return of([]);
    }

    return forkJoin(refreshRequests);
  }

  /**
   * Create Stripe account for a business
   * @param stripeData - The Stripe account creation data
   * @returns Observable of creation response
   */
  createStripeAccount(stripeData: CreateStripeAccountRequest): Observable<any> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    const url = `${this.apiUrl}/api/Subscription/CreateStripeAccount`;

    // Debug logging
    console.log('Create Stripe account API call:', {
      url: url,
      businessId: stripeData.BusinessId,
      email: stripeData.Email,
      country: stripeData.Country,
      hasJwtToken: !!jwtToken
    });

    return this.http.post(url, stripeData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      }
    }).pipe(
      tap(() => {
        // Clear cache for this business to force refresh
        this.clearStripeAccountCache(stripeData.BusinessId);
      })
    );
  }

  /**
   * Update Stripe account for a business (deletes old and creates new)
   * @param updateData - The Stripe account update data
   * @returns Observable of update response
   */
  updateStripeAccount(updateData: { newEmail: string; country: string; businessId: string }): Observable<any> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    const url = `${this.apiUrl}/api/subscription/UpdateStripeAccount`;

    // Convert to proper request format for update endpoint
    const requestData = {
      NewEmail: updateData.newEmail,
      Country: updateData.country,
      BusinessId: updateData.businessId
    };

    console.log('Update Stripe account API call:', {
      url: url,
      businessId: updateData.businessId,
      newEmail: updateData.newEmail,
      country: updateData.country,
      hasJwtToken: !!jwtToken
    });

    return this.http.put(url, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      }
    }).pipe(
      tap(() => {
        // Clear cache for this business to force refresh
        this.clearStripeAccountCache(updateData.businessId);
      })
    );
  }

  /**
   * Delete Stripe account for a business
   * @param businessId - The business ID
   * @returns Observable of deletion response
   */
  deleteStripeAccount(businessId: string): Observable<any> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }

    const url = `${this.apiUrl}/api/subscription/DeleteStripeAccount?businessId=${businessId}`;

    console.log('Delete Stripe account API call:', {
      url: url,
      businessId: businessId,
      hasJwtToken: !!jwtToken
    });

    return this.http.delete(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
        'Accept': 'application/json'
      }
    }).pipe(
      tap(() => {
        // Clear cache for this business to force refresh
        this.clearStripeAccountCache(businessId);
      })
    );
  }
} 