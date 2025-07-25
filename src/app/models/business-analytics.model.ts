// Business Analytics Data Model Interface
export interface BusinessAnalytics {
  // Business Identity
  businessName: string;
  businessDescription: string;
  ownerEmail: string;
  
  // Order Metrics
  totalOrders: number;
  activeMonths: number;
  successfulOrders: number;
  pendingOrders: number;
  failedOrders: number;
  successRatePercentage: number;
  
  // Revenue Metrics
  totalRevenue: number;
  averageOrderValue: number;
  highestOrderValue: number;
  lowestOrderValue: number;
  averageServicePrice: number;
  revenuePerCustomer: number;
  
  // Payment & Currency
  primaryCurrency: string;
  mostUsedPaymentType: string;
  primaryServiceCurrency: string;
  currencyCount: number;
  paymentTypeVariety: number;
  
  // Services
  uniqueServicesOffered: number;
  serviceNameVariety: number;
  
  // Customer Metrics
  uniqueCustomers: number;
  customerLifetimeDays: number;
  
  // Performance Scores
  activityScore: number;
  revenuePerformanceScore: number;
  
  // Volume Categories
  orderVolumeCategory: string;
  
  // Temporal Data
  lastOrderDate: Date;
  firstOrderDate: Date;
  analyticsGeneratedAt: Date;
}

// Business Selection Interface
export interface BusinessSelectionOption {
  businessId: string;
  businessName: string;
  businessDescription?: string;
  isSelected: boolean;
}

// Business Selection State
export interface BusinessSelectionState {
  allBusinesses: BusinessSelectionOption[];
  selectedBusinessIds: string[];
  isAllSelected: boolean;
  selectionMode: 'all' | 'specific';
}

// API Response Interface (matches actual API response format)
export interface BusinessAnalyticsApiResponse {
  businessId: string;
  businessName: string;
  businessDescription: string;
  ownerEmail: string;
  totalOrders: number;
  activeMonths: number;
  totalRevenue: number;
  averageOrderValue: number;
  highestOrderValue: number;
  lowestOrderValue: number;
  lastOrderDate: string;
  firstOrderDate: string;
  customerLifetimeDays: number;
  successfulOrders: number;
  pendingOrders: number;
  failedOrders: number;
  successRatePercentage: number;
  primaryCurrency: string;
  currencyCount: number;
  mostUsedPaymentType: string;
  paymentTypeVariety: number;
  uniqueServicesOffered: number;
  serviceNameVariety: number;
  averageServicePrice: number;
  primaryServiceCurrency: string;
  uniqueCustomers: number;
  revenuePerCustomer: number;
  orderVolumeCategory: string;
  activityScore: number;
  revenuePerformanceScore: number;
  analyticsGeneratedAt: string;
}

// Error Response Interface
export interface AnalyticsErrorResponse {
  error: {
    type: string;
    message: string;
  };
}

// Loading State Interface
export interface AnalyticsLoadingState {
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
  isLoadingBusinesses?: boolean;
  businessSelectionError?: string;
}

// Filter and Sort Options
export interface AnalyticsFilterOptions {
  minActivityScore?: number;
  maxActivityScore?: number;
  minRevenue?: number;
  maxRevenue?: number;
  orderVolumeCategories?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  selectedBusinessIds?: string[];
}

export interface AnalyticsSortOptions {
  field: keyof BusinessAnalytics;
  direction: 'asc' | 'desc';
} 