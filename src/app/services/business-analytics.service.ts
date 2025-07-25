import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of, combineLatest } from 'rxjs';
import { map, catchError, tap, retry, delay, shareReplay } from 'rxjs/operators';
import { 
  BusinessAnalytics, 
  BusinessAnalyticsApiResponse, 
  AnalyticsErrorResponse,
  AnalyticsLoadingState,
  AnalyticsFilterOptions,
  AnalyticsSortOptions,
  BusinessSelectionOption,
  BusinessSelectionState
} from '../models/business-analytics.model';
import { DataSvrService } from './data-svr.service';
import { ServiceFuzzAccount } from '../models/ServiceFuzzAccounts';
import { ManageBusinessesService } from './manage-businesses.service';
import { BusinessRegistrationDto } from '../models/business-registration-dto';

@Injectable({
  providedIn: 'root'
})
export class BusinessAnalyticsService {
  private readonly apiUrl = 'https://servicefuzzapi-atf8b4dqawc8dsa9.australiaeast-01.azurewebsites.net';
  
  // Caching implementation
  private analyticsCache: BusinessAnalytics[] | null = null;
  private cacheTimestamp: number | null = null;
  private readonly cacheExpiryTime = 5 * 60 * 1000; // 5 minutes
  
  // Loading state management
  private _loadingState = new BehaviorSubject<AnalyticsLoadingState>({
    isLoading: false,
    hasError: false
  });
  public loadingState$ = this._loadingState.asObservable();
  
  // Data subject for reactive updates
  private _analyticsData = new BehaviorSubject<BusinessAnalytics[]>([]);
  public analyticsData$ = this._analyticsData.asObservable();
  
  // Business selection state management
  private _businessSelectionState = new BehaviorSubject<BusinessSelectionState>({
    allBusinesses: [],
    selectedBusinessIds: [],
    isAllSelected: true,
    selectionMode: 'all'
  });
  public businessSelectionState$ = this._businessSelectionState.asObservable();
  
  // Filtered analytics data based on business selection
  private _filteredAnalyticsData = new BehaviorSubject<BusinessAnalytics[]>([]);
  public filteredAnalyticsData$ = this._filteredAnalyticsData.asObservable();
  
  constructor(
    private http: HttpClient,
    private dataSvr: DataSvrService,
    private manageBusinessesService: ManageBusinessesService
  ) {
    // Service initialized - cache will be cleared manually when needed
    this.setupBusinessSelectionFiltering();
  }

  /**
   * Get business analytics data with caching and error handling
   */
  getMyBusinessAnalytics(forceRefresh: boolean = false): Observable<BusinessAnalytics[]> {
    // Check cache first unless force refresh is requested
    if (!forceRefresh && this.isCacheValid()) {
      console.log('Returning analytics from cache');
      this._analyticsData.next(this.analyticsCache!);
      return of(this.analyticsCache!);
    }

    // Check authentication
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      const error = new Error('Authentication required. Please log in.');
      this.handleError(error);
      return throwError(() => error);
    }

    // Set loading state
    this.setLoadingState({ isLoading: true, hasError: false });

    // Prepare headers
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`,
      'Accept': 'application/json'
    });

    // Make HTTP request
    return this.http.get<BusinessAnalyticsApiResponse[]>(
      `${this.apiUrl}/api/BusinessAnalytics/GetMyBusinessAnalytics`,
      { headers }
    ).pipe(
      retry({
        count: 3,
        delay: (error, retryCount) => {
          console.log(`Retry attempt ${retryCount} for analytics request`);
          return of(error).pipe(delay(1000 * retryCount)); // Exponential backoff
        }
      }),
      map(response => this.transformApiResponse(response)),
      tap(transformedData => {
        // Update cache
        this.updateCache(transformedData);
        // Update data subject
        this._analyticsData.next(transformedData);
        // Update loading state
        this.setLoadingState({ isLoading: false, hasError: false });
      }),
      catchError(error => this.handleHttpError(error)),
      shareReplay(1) // Share the result to prevent multiple HTTP calls
    );
  }

  /**
   * Transform API response to BusinessAnalytics format
   */
  private transformApiResponse(apiResponse: BusinessAnalyticsApiResponse[]): BusinessAnalytics[] {
    return apiResponse.map(item => ({
      businessName: item.businessName || '',
      businessDescription: item.businessDescription || '',
      ownerEmail: item.ownerEmail || '',
      totalOrders: item.totalOrders || 0,
      activeMonths: item.activeMonths || 0,
      successfulOrders: item.successfulOrders || 0,
      pendingOrders: item.pendingOrders || 0,
      failedOrders: item.failedOrders || 0,
      successRatePercentage: item.successRatePercentage || 0,
      totalRevenue: item.totalRevenue || 0,
      averageOrderValue: item.averageOrderValue || 0,
      highestOrderValue: item.highestOrderValue || 0,
      lowestOrderValue: item.lowestOrderValue || 0,
      averageServicePrice: item.averageServicePrice || 0,
      revenuePerCustomer: item.revenuePerCustomer || 0,
      primaryCurrency: item.primaryCurrency || '',
      mostUsedPaymentType: item.mostUsedPaymentType || '',
      primaryServiceCurrency: item.primaryServiceCurrency || '',
      currencyCount: item.currencyCount || 0,
      paymentTypeVariety: item.paymentTypeVariety || 0,
      uniqueServicesOffered: item.uniqueServicesOffered || 0,
      serviceNameVariety: item.serviceNameVariety || 0,
      uniqueCustomers: item.uniqueCustomers || 0,
      customerLifetimeDays: item.customerLifetimeDays || 0,
      activityScore: item.activityScore || 0,
      revenuePerformanceScore: item.revenuePerformanceScore || 0,
      orderVolumeCategory: item.orderVolumeCategory || '',
      lastOrderDate: item.lastOrderDate ? new Date(item.lastOrderDate) : new Date(),
      firstOrderDate: item.firstOrderDate ? new Date(item.firstOrderDate) : new Date(),
      analyticsGeneratedAt: item.analyticsGeneratedAt ? new Date(item.analyticsGeneratedAt) : new Date()
    }));
  }

  /**
   * Filter analytics data based on provided criteria
   */
  filterAnalytics(data: BusinessAnalytics[], filters: AnalyticsFilterOptions): BusinessAnalytics[] {
    return data.filter(item => {
      // Activity score range filter
      if (filters.minActivityScore !== undefined && item.activityScore < filters.minActivityScore) {
        return false;
      }
      if (filters.maxActivityScore !== undefined && item.activityScore > filters.maxActivityScore) {
        return false;
      }

      // Revenue range filter
      if (filters.minRevenue !== undefined && item.totalRevenue < filters.minRevenue) {
        return false;
      }
      if (filters.maxRevenue !== undefined && item.totalRevenue > filters.maxRevenue) {
        return false;
      }

      // Order volume categories filter
      if (filters.orderVolumeCategories && filters.orderVolumeCategories.length > 0) {
        if (!filters.orderVolumeCategories.includes(item.orderVolumeCategory)) {
          return false;
        }
      }

      // Date range filter
      if (filters.dateRange) {
        const lastOrderTime = item.lastOrderDate.getTime();
        const startTime = filters.dateRange.start.getTime();
        const endTime = filters.dateRange.end.getTime();
        
        if (lastOrderTime < startTime || lastOrderTime > endTime) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Sort analytics data based on provided criteria
   */
  sortAnalytics(data: BusinessAnalytics[], sortOptions: AnalyticsSortOptions): BusinessAnalytics[] {
    return [...data].sort((a, b) => {
      const aValue = a[sortOptions.field];
      const bValue = b[sortOptions.field];

      let comparison = 0;

      if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime();
      } else if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      }

      return sortOptions.direction === 'desc' ? -comparison : comparison;
    });
  }

  /**
   * Get filtered and sorted analytics data
   */
  getFilteredAnalytics(filters?: AnalyticsFilterOptions, sortOptions?: AnalyticsSortOptions): Observable<BusinessAnalytics[]> {
    return this.analyticsData$.pipe(
      map(data => {
        let result = [...data];
        
        if (filters) {
          result = this.filterAnalytics(result, filters);
        }
        
        if (sortOptions) {
          result = this.sortAnalytics(result, sortOptions);
        }
        
        return result;
      })
    );
  }

  /**
   * Get analytics summary statistics based on filtered data
   */
  getAnalyticsSummary(): Observable<{
    totalBusinesses: number;
    totalRevenue: number;
    averageActivityScore: number;
    totalOrders: number;
  }> {
    return this.filteredAnalyticsData$.pipe(
      map(data => ({
        totalBusinesses: data.length,
        totalRevenue: data.reduce((sum, item) => sum + item.totalRevenue, 0),
        averageActivityScore: data.length > 0 
          ? data.reduce((sum, item) => sum + item.activityScore, 0) / data.length 
          : 0,
        totalOrders: data.reduce((sum, item) => sum + item.totalOrders, 0)
      }))
    );
  }

  /**
   * Cache management methods
   */
  private isCacheValid(): boolean {
    if (!this.analyticsCache || !this.cacheTimestamp) {
      return false;
    }
    
    const now = Date.now();
    return (now - this.cacheTimestamp) < this.cacheExpiryTime;
  }

  private updateCache(data: BusinessAnalytics[]): void {
    this.analyticsCache = data;
    this.cacheTimestamp = Date.now();
  }

  private clearCache(): void {
    this.analyticsCache = null;
    this.cacheTimestamp = null;
    this._analyticsData.next([]);
  }

  /**
   * Force refresh analytics data
   */
  refreshAnalytics(): Observable<BusinessAnalytics[]> {
    return this.getMyBusinessAnalytics(true);
  }

  /**
   * Error handling methods
   */
  private handleHttpError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unexpected error occurred while fetching analytics data.';
    
    if (error.status === 401) {
      errorMessage = 'Authentication failed. Please log in again.';
      // Could trigger logout or token refresh here
      this.dataSvr.currentUser = undefined;
      this.dataSvr.jwtToken = undefined;
    } else if (error.status === 403) {
      errorMessage = 'Access denied. You do not have permission to view analytics data.';
    } else if (error.status === 404) {
      errorMessage = 'Analytics endpoint not found. Please contact support.';
    } else if (error.status === 500) {
      errorMessage = 'Server error occurred. Please try again later.';
    } else if (error.status === 0) {
      errorMessage = 'Network error. Please check your internet connection.';
    } else if (error.error && error.error.error && error.error.error.message) {
      errorMessage = error.error.error.message;
    }

    console.error('Analytics service error:', error);
    
    this.setLoadingState({
      isLoading: false,
      hasError: true,
      errorMessage
    });

    return throwError(() => new Error(errorMessage));
  }

  private handleError(error: Error): void {
    console.error('Analytics service error:', error);
    
    this.setLoadingState({
      isLoading: false,
      hasError: true,
      errorMessage: error.message
    });
  }

  private setLoadingState(state: AnalyticsLoadingState): void {
    this._loadingState.next(state);
  }

  /**
   * Public method to get current loading state
   */
  getCurrentLoadingState(): AnalyticsLoadingState {
    return this._loadingState.value;
  }

  /**
   * Clear error state
   */
  clearError(): void {
    const currentState = this._loadingState.value;
    if (currentState.hasError) {
      this.setLoadingState({
        isLoading: false,
        hasError: false
      });
    }
  }

  /**
   * Setup filtering based on business selection
   */
  private setupBusinessSelectionFiltering(): void {
    // Combine analytics data and business selection to produce filtered results
    combineLatest([
      this.analyticsData$,
      this.businessSelectionState$
    ]).pipe(
      map(([analyticsData, selectionState]) => {
        // If all businesses are selected or no specific selection, return all data
        if (selectionState.selectionMode === 'all' || 
            selectionState.selectedBusinessIds.length === 0 || 
            selectionState.selectedBusinessIds.length === selectionState.allBusinesses.length) {
          return analyticsData;
        }
        
                 // Filter analytics data based on selected business IDs and names
         const selectedBusinessNames = selectionState.allBusinesses
           .filter((b: BusinessSelectionOption) => selectionState.selectedBusinessIds.includes(b.businessId))
           .map((b: BusinessSelectionOption) => b.businessName);
         
         return analyticsData.filter((analytics: BusinessAnalytics) => 
           selectedBusinessNames.includes(analytics.businessName) ||
           selectionState.selectedBusinessIds.includes(analytics.businessName) // Fallback to business name as ID
                  );
       })
     ).subscribe((filteredData: BusinessAnalytics[]) => {
       this._filteredAnalyticsData.next(filteredData);
     });
  }

  /**
   * Load available businesses for selection
   */
  loadAvailableBusinesses(): Observable<BusinessSelectionOption[]> {
    this.setLoadingState({ 
      ...this._loadingState.value, 
      isLoadingBusinesses: true 
    });

         return this.manageBusinessesService.getAllBusinessesForUser().pipe(
       map((businesses: BusinessRegistrationDto[]) => {
         // Get current analytics data to match business names
         const currentAnalytics = this._analyticsData.value;
         
         const businessOptions: BusinessSelectionOption[] = businesses.map(business => ({
           businessId: business.basicInfo.businessID || business.basicInfo.businessName,
           businessName: business.basicInfo.businessName,
           businessDescription: business.basicInfo.businessDescription,
           isSelected: true // Initially all businesses are selected
         }));

         // Also add businesses from analytics data that might not be in the business list
         currentAnalytics.forEach(analytics => {
           const exists = businessOptions.find(b => 
             b.businessName === analytics.businessName ||
             b.businessId === analytics.businessName
           );
           
           if (!exists) {
             businessOptions.push({
               businessId: analytics.businessName, // Use business name as ID for analytics-only businesses
               businessName: analytics.businessName,
               businessDescription: analytics.businessDescription,
               isSelected: true
             });
           }
         });

         // Update business selection state
         const currentState = this._businessSelectionState.value;
         const updatedState: BusinessSelectionState = {
           ...currentState,
           allBusinesses: businessOptions,
           selectedBusinessIds: businessOptions.map(b => b.businessId)
         };

         this._businessSelectionState.next(updatedState);
         
         this.setLoadingState({ 
           ...this._loadingState.value, 
           isLoadingBusinesses: false 
         });

         return businessOptions;
       }),
      catchError(error => {
        console.error('Error loading businesses:', error);
        this.setLoadingState({ 
          ...this._loadingState.value, 
          isLoadingBusinesses: false,
          businessSelectionError: 'Failed to load businesses for selection'
        });
        return throwError(() => error);
      })
    );
  }

  /**
   * Update business selection
   */
  updateBusinessSelection(selectedBusinessIds: string[]): void {
    const currentState = this._businessSelectionState.value;
    const updatedBusinesses = currentState.allBusinesses.map(business => ({
      ...business,
      isSelected: selectedBusinessIds.includes(business.businessId)
    }));

    const isAllSelected = selectedBusinessIds.length === currentState.allBusinesses.length;
    
    const updatedState: BusinessSelectionState = {
      ...currentState,
      allBusinesses: updatedBusinesses,
      selectedBusinessIds,
      isAllSelected,
      selectionMode: isAllSelected ? 'all' : 'specific'
    };

    this._businessSelectionState.next(updatedState);
  }

  /**
   * Select all businesses
   */
  selectAllBusinesses(): void {
    const currentState = this._businessSelectionState.value;
    const allBusinessIds = currentState.allBusinesses.map(b => b.businessId);
    this.updateBusinessSelection(allBusinessIds);
  }

  /**
   * Deselect all businesses
   */
  deselectAllBusinesses(): void {
    this.updateBusinessSelection([]);
  }

  /**
   * Toggle business selection
   */
  toggleBusinessSelection(businessId: string): void {
    const currentState = this._businessSelectionState.value;
    const currentSelected = currentState.selectedBusinessIds;
    
    let newSelected: string[];
    if (currentSelected.includes(businessId)) {
      newSelected = currentSelected.filter(id => id !== businessId);
    } else {
      newSelected = [...currentSelected, businessId];
    }
    
    this.updateBusinessSelection(newSelected);
  }

  /**
   * Get current business selection state
   */
  getCurrentBusinessSelectionState(): BusinessSelectionState {
    return this._businessSelectionState.value;
  }

  /**
   * Clear business selection cache and reload
   */
  refreshBusinessSelection(): Observable<BusinessSelectionOption[]> {
    // Clear any cached business data in ManageBusinessesService if needed
    return this.loadAvailableBusinesses();
  }
} 