import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { DataSvrService } from '../services/data-svr.service';
import { ManageBusinessesService } from '../services/manage-businesses.service';
import { BusinessBasicInfo } from '../models/businessbasicinfo';
import { BusinessRegistrationDto } from '../models/business-registration-dto';
import { Subscription } from 'rxjs';

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
    private router: Router
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
}
