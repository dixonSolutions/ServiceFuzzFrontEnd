import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { DataSvrService } from '../services/data-svr.service';
import { ManageBusinessesService } from '../services/manage-businesses.service';
import { BusinessBasicInfo } from '../models/businessbasicinfo';
import { BusinessRegistrationDto } from '../models/business-registration-dto';
import { Subscription } from 'rxjs';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

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

  constructor(
    public data: DataSvrService,
    private manageBusinessesService: ManageBusinessesService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.loadBusinesses();
  }

  ngOnInit(): void {
    // Component initialization - no user subscription needed
    console.log('ManageBusinessesComponent initialized');
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
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
   * Refresh businesses (clear instance and reload)
   */
  refreshBusinesses(): void {
    console.log('Refreshing businesses - clearing instance');
    this.manageBusinessesService.clearBusinessesInstance();
    this.loadBusinesses();
  }

  /**
   * Clear businesses instance (useful when user logs out)
   */
  clearBusinessesInstance(): void {
    this.manageBusinessesService.clearBusinessesInstance();
    this.allBusinesses = [];
    this.filteredBusinesses = [];
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
}
