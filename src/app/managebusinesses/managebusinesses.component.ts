import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DataSvrService } from '../services/data-svr.service';
import { ManageBusinessesService, StripeAccountResponse, CreateStripeAccountRequest } from '../services/manage-businesses.service';
import { BusinessBasicInfo } from '../models/businessbasicinfo';
import { BusinessRegistrationDto } from '../models/business-registration-dto';
import { Subscription } from 'rxjs';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-managebusinesses',
  standalone: false,
  templateUrl: './managebusinesses.component.html',
  styleUrl: './managebusinesses.component.css'
})
export class ManagebusinessesComponent implements OnInit, OnDestroy {
  searchQuery: string = '';
  allBusinesses: BusinessRegistrationDto[] = [];
  filteredBusinesses: BusinessRegistrationDto[] = [];
  isLoading: boolean = false;
  subscription = new Subscription();
  
  // Stripe account status tracking
  stripeAccountStatus: Map<string, boolean> = new Map();
  stripeAccountLoading: Map<string, boolean> = new Map();

  // Billing setup dialog
  showBillingSetupDialog = false;
  selectedBusiness: BusinessRegistrationDto | null = null;
  billingSetupForm!: FormGroup;
  billingSetupLoading = false;
  
  // Country options for dropdown
  countryOptions = [
    { label: 'Australia', value: 'AU' },
    { label: 'United States', value: 'US' },
    { label: 'United Kingdom', value: 'GB' },
    { label: 'Canada', value: 'CA' },
    { label: 'New Zealand', value: 'NZ' }
  ];

  constructor(
    public data: DataSvrService,
    private manageBusinessesService: ManageBusinessesService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private formBuilder: FormBuilder
  ) {
    this.loadBusinesses();
    this.initializeBillingForm();
  }

  ngOnInit(): void {
    // Component initialization - no user subscription needed
    console.log('ManageBusinessesComponent initialized');
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  /**
   * Initialize billing setup form
   */
  private initializeBillingForm(): void {
    this.billingSetupForm = this.formBuilder.group({
      businessEmail: ['', [Validators.required, Validators.email]],
      country: ['AU', [Validators.required]] // Default to Australia
    });
  }

  /**
   * Load businesses for the current user
   */
  loadBusinesses(): void {
    if (this.data.currentUser?.userID) {
      this.isLoading = true;
      
      // Check if service already has businesses in instance
      if (this.manageBusinessesService.hasBusinessesInstance()) {
        console.log('Using existing businesses from service instance');
        const existingBusinesses = this.manageBusinessesService.getBusinessesInstance();
        this.allBusinesses = existingBusinesses;
        this.filteredBusinesses = existingBusinesses;
        this.isLoading = false;
        
        // Check Stripe account status for all businesses
        this.checkStripeAccountsForAllBusinesses();
        return;
      }
      
      // Make API request if no instance data
      console.log('No instance data found, making API request');
      this.manageBusinessesService.getAllBusinessesForUser().subscribe({
        next: (businesses) => {
          // Store in service instance
          this.manageBusinessesService.setBusinessesInstance(businesses);
          
          // Update component data
          this.allBusinesses = businesses;
          this.filteredBusinesses = businesses;
          this.isLoading = false;
          
          // Check Stripe account status for all businesses
          this.checkStripeAccountsForAllBusinesses();
        },
        error: (error) => {
          console.error('Error fetching businesses:', error);
          this.isLoading = false;
          this.data.openSnackBar('Error loading businesses. Please try again.', 'Close', 3000);
        }
      });
    }
  }

  /**
   * Refresh businesses and payment status (clear instance and reload)
   */
  refreshBusinesses(): void {
    console.log('Refreshing businesses and payment status - clearing caches');
    this.manageBusinessesService.clearBusinessesInstance();
    this.clearStripeAccountCache();
    this.loadBusinesses();
  }

  /**
   * Clear businesses instance (useful when user logs out)
   */
  clearBusinessesInstance(): void {
    this.manageBusinessesService.clearBusinessesInstance();
    this.allBusinesses = [];
    this.filteredBusinesses = [];
    this.clearStripeAccountCache();
  }

  /**
   * Filter businesses based on search query
   */
  onSearchChange(): void {
    if (!this.searchQuery.trim()) {
      this.filteredBusinesses = this.allBusinesses;
      return;
    }

    const query = this.searchQuery.toLowerCase().trim();
    this.filteredBusinesses = this.allBusinesses.filter(business => 
      business.basicInfo.businessName?.toLowerCase().includes(query) ||
      business.basicInfo.businessDescription?.toLowerCase().includes(query) ||
      business.basicInfo.email?.toLowerCase().includes(query) ||
      business.basicInfo.phone?.toLowerCase().includes(query)
    );
  }

  /**
   * Clear search and show all businesses
   */
  clearSearch(): void {
    this.searchQuery = '';
    this.filteredBusinesses = this.allBusinesses;
  }

  /**
   * Navigate to business details page
   */
  viewBusinessDetails(business: BusinessRegistrationDto): void {
    console.log('Navigating to business details:', business);
    console.log('Business data being passed:', {
      name: business.basicInfo.businessName,
      services: business.services?.length,
      locations: (business.specificAddresses?.length || 0) + (business.areaSpecifications?.length || 0)
    });
    
    // Store the business data temporarily in the data service
    this.data.setTempBusinessDetails(business);
    
    // Navigate to a details page with the business data
    this.router.navigate(['/business/details'], { 
      state: { business: business } 
    }).then(() => {
      console.log('Navigation completed successfully');
    }).catch((error) => {
      console.error('Navigation failed:', error);
    });
  }

  /**
   * Get the businesses to display (filtered or all)
   */
  get businessesToDisplay(): BusinessRegistrationDto[] {
    return this.filteredBusinesses;
  }

  /**
   * Start editing a business
   * @param business - The business to edit
   */
  startEditing(business: BusinessRegistrationDto): void {
    // Navigate to the edit page with the business ID
    this.router.navigate(['/business/edit', business.basicInfo.businessID]);
  }

  /**
   * Delete a business with confirmation
   * @param business - The business to delete
   */
  deleteBusiness(business: BusinessRegistrationDto): void {
    const businessName = business.basicInfo.businessName || 'this business';
    
    // Show confirmation dialog
    const confirmed = confirm(`Are you sure you want to delete "${businessName}"? This action cannot be undone.`);
    
    if (confirmed) {
      this.performDelete(business);
    }
  }

  /**
   * Check Stripe account status for all businesses (using cache when possible)
   */
  private checkStripeAccountsForAllBusinesses(): void {
    if (!this.allBusinesses || this.allBusinesses.length === 0) {
      return;
    }

    // First, load all cached data
    this.loadCachedStripeData();

    // Identify businesses that need API calls (not cached or missing data)
    const businessesNeedingApiCall: string[] = [];
    
    this.allBusinesses.forEach(business => {
      const businessId = business.basicInfo.businessID;
      if (!businessId) {
        return;
      }

      const cachedData = this.manageBusinessesService.getCachedStripeAccountData(businessId);
      if (!cachedData) {
        businessesNeedingApiCall.push(businessId);
        this.stripeAccountLoading.set(businessId, true);
      }
    });

    // Only make API calls for businesses without cached data
    if (businessesNeedingApiCall.length === 0) {
      console.log('All Stripe account data loaded from cache');
      return;
    }

    console.log(`Making API calls for ${businessesNeedingApiCall.length} businesses without cached data`);

    // Create API requests only for businesses needing fresh data
    const stripeChecks = businessesNeedingApiCall.map(businessId => 
      this.manageBusinessesService.getStripeAccountEmail(businessId)
    );

    // Execute API requests for uncached businesses
    forkJoin(stripeChecks).subscribe({
      next: (responses: StripeAccountResponse[]) => {
        responses.forEach((response, index) => {
          const businessId = businessesNeedingApiCall[index];
          this.stripeAccountStatus.set(businessId, response.hasStripeAccount);
          this.stripeAccountLoading.set(businessId, false);
        });
        console.log(`Updated Stripe status for ${responses.length} businesses from API`);
      },
      error: (error) => {
        console.error('Error checking Stripe accounts:', error);
        // Clear loading states on error
        businessesNeedingApiCall.forEach(businessId => {
          this.stripeAccountLoading.set(businessId, false);
        });
      }
    });
  }

  /**
   * Load cached Stripe data into component state
   */
  private loadCachedStripeData(): void {
    this.allBusinesses.forEach(business => {
      const businessId = business.basicInfo.businessID;
      if (!businessId) {
        return;
      }

      const cachedData = this.manageBusinessesService.getCachedStripeAccountData(businessId);
      if (cachedData) {
        this.stripeAccountStatus.set(businessId, cachedData.hasStripeAccount);
        this.stripeAccountLoading.set(businessId, false);
      }
    });
  }

  /**
   * Get Stripe account status for a specific business
   * @param businessId - The ID of the business
   * @returns boolean indicating if business has Stripe account
   */
  hasStripeAccount(businessId: string | undefined): boolean {
    if (!businessId) {
      return false;
    }
    return this.stripeAccountStatus.get(businessId) || false;
  }

  /**
   * Check if Stripe account status is loading for a specific business
   * @param businessId - The ID of the business
   * @returns boolean indicating if loading
   */
  isStripeAccountLoading(businessId: string | undefined): boolean {
    if (!businessId) {
      return false;
    }
    return this.stripeAccountLoading.get(businessId) || false;
  }

  /**
   * Clear Stripe account cache (both service and component)
   */
  private clearStripeAccountCache(): void {
    this.stripeAccountStatus.clear();
    this.stripeAccountLoading.clear();
    // Also clear the service cache
    this.manageBusinessesService.clearStripeAccountCache();
  }

  /**
   * Force refresh Stripe account data for all businesses (private helper)
   */
  private refreshStripeAccountData(): void {
    if (!this.allBusinesses || this.allBusinesses.length === 0) {
      return;
    }

    const businessIds = this.allBusinesses
      .map(business => business.basicInfo.businessID)
      .filter(id => id !== undefined) as string[];

    if (businessIds.length === 0) {
      return;
    }

    // Set loading states
    businessIds.forEach(businessId => {
      this.stripeAccountLoading.set(businessId, true);
    });

    // Force refresh from API
    this.manageBusinessesService.refreshStripeAccountData(businessIds).subscribe({
      next: (responses: StripeAccountResponse[]) => {
        responses.forEach((response, index) => {
          const businessId = businessIds[index];
          this.stripeAccountStatus.set(businessId, response.hasStripeAccount);
          this.stripeAccountLoading.set(businessId, false);
        });
        console.log('Payment status refreshed for all businesses');
      },
      error: (error) => {
        console.error('Error refreshing Stripe accounts:', error);
        businessIds.forEach(businessId => {
          this.stripeAccountLoading.set(businessId, false);
        });
      }
    });
  }

  /**
   * Perform the actual deletion
   * @param business - The business to delete
   */
  private performDelete(business: BusinessRegistrationDto): void {
    const businessId = business.basicInfo.businessID;
    const businessName = business.basicInfo.businessName || 'Business';
    
    // Debug logging
    console.log('Attempting to delete business:', {
      businessId: businessId,
      businessName: businessName,
      fullBusiness: business
    });
    
    if (!businessId) {
      this.data.openSnackBar('Error: Business ID not found', 'Close', 3000);
      return;
    }

    // Show loading state
    this.data.openSnackBar(`Deleting ${businessName}...`, 'Close', 2000);

    this.manageBusinessesService.deleteBusiness(businessId).subscribe({
      next: (response) => {
        console.log('Business deleted successfully:', response);
        
        // Remove from local arrays
        this.allBusinesses = this.allBusinesses.filter(b => b.basicInfo.businessID !== businessId);
        this.filteredBusinesses = this.filteredBusinesses.filter(b => b.basicInfo.businessID !== businessId);
        
        // Update service instance
        this.manageBusinessesService.setBusinessesInstance(this.allBusinesses);
        
        // Clean up Stripe status cache for deleted business
        if (businessId) {
          this.stripeAccountStatus.delete(businessId);
          this.stripeAccountLoading.delete(businessId);
          // Also clear from service cache
          this.manageBusinessesService.clearStripeAccountCache(businessId);
        }
        
        // Show success message
        this.data.openSnackBar(`${businessName} has been deleted successfully`, 'Close', 3000);
      },
      error: (error) => {
        console.error('Error deleting business:', error);
        console.error('Error details:', {
          businessId: businessId,
          businessName: businessName,
          errorResponse: error
        });
        
        // Provide more specific error messages based on the error type
        if (error.status === 404) {
          this.data.openSnackBar(`API endpoint not found. Please contact support.`, 'Close', 5000);
        } else if (error.status === 401) {
          this.data.openSnackBar(`Authentication failed. Please sign in again.`, 'Close', 5000);
        } else if (error.status === 403) {
          this.data.openSnackBar(`You don't have permission to delete this business.`, 'Close', 5000);
        } else {
          this.data.openSnackBar(`Error deleting ${businessName}. Please try again.`, 'Close', 3000);
        }
      }
    });
  }

  /**
   * Open billing setup dialog for a business
   */
  openBillingSetupDialog(business: BusinessRegistrationDto): void {
    this.selectedBusiness = business;
    this.showBillingSetupDialog = true;
    
    // Pre-fill form with business data
    this.billingSetupForm.patchValue({
      businessEmail: business.basicInfo.email || '',
      country: 'AU' // Default to Australia
    });
  }

  /**
   * Close billing setup dialog
   */
  closeBillingSetupDialog(): void {
    this.showBillingSetupDialog = false;
    this.selectedBusiness = null;
    this.billingSetupForm.reset();
    this.billingSetupLoading = false;
  }

  /**
   * Submit billing setup form
   */
  submitBillingSetup(): void {
    if (this.billingSetupForm.invalid || !this.selectedBusiness) {
      return;
    }

    this.billingSetupLoading = true;
    const formData = this.billingSetupForm.value;
    const businessId = this.selectedBusiness.basicInfo.businessID;

    if (!businessId) {
      this.data.openSnackBar('Error: Business ID not found', 'Close', 3000);
      this.billingSetupLoading = false;
      return;
    }

    // Prepare Stripe account creation data
    const stripeAccountData: CreateStripeAccountRequest = {
      Email: formData.businessEmail,
      Country: formData.country,
      BusinessId: businessId
    };

    console.log('Creating Stripe account for business:', stripeAccountData);

    // Make API call to create Stripe account
    this.manageBusinessesService.createStripeAccount(stripeAccountData).subscribe({
      next: (response:any) => {
        console.log('Stripe account creation successful:', response);
        
        // Update Stripe account status
        this.stripeAccountStatus.set(businessId, true);
        this.manageBusinessesService.clearStripeAccountCache(businessId);
        
        // Show success message
        this.data.openSnackBar(
          `Stripe account created successfully for ${this.selectedBusiness?.basicInfo.businessName}!`, 
          'Close', 
          5000
        );
        
        // Close dialog
        this.closeBillingSetupDialog();
      },
      error: (error:any) => {
        console.error('Error creating Stripe account:', error);
        
        let errorMessage = 'Error creating Stripe account. Please try again.';
        if (error.status === 400) {
          errorMessage = 'Invalid account information. Please check your details.';
        } else if (error.status === 409) {
          errorMessage = 'Stripe account already exists for this business.';
        } else if (error.status === 401) {
          errorMessage = 'Authentication failed. Please sign in again.';
        }
        
        this.data.openSnackBar(errorMessage, 'Close', 5000);
        this.billingSetupLoading = false;
      }
    });
  }
}
