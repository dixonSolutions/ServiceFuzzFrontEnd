import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { BusinessRegistrationDto } from '../models/business-registration-dto';
import { DataSvrService } from '../services/data-svr.service';

@Component({
  selector: 'app-business-details',
  standalone: false,
  templateUrl: './business-details.component.html',
  styleUrl: './business-details.component.css'
})
export class BusinessDetailsComponent implements OnInit {
  business: BusinessRegistrationDto | null = null;
  isLoading: boolean = true;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private data: DataSvrService
  ) {}

  ngOnInit(): void {
    console.log('BusinessDetailsComponent ngOnInit called');
    
    // Get business data from router state
    const navigation = this.router.getCurrentNavigation();
    console.log('Current navigation:', navigation);
    console.log('Navigation extras:', navigation?.extras);
    console.log('Navigation state:', navigation?.extras?.state);
    
    if (navigation?.extras.state) {
      this.business = navigation.extras.state['business'];
      console.log('Business data received from navigation:', this.business);
      console.log('Staff data from navigation:', this.business?.staff);
      console.log('Operation type from navigation:', this.business?.operationType);
      this.isLoading = false;
    } else {
      console.log('No navigation state found, checking data service...');
      // Try to get from data service as fallback
      const tempBusinessDetails = this.data.getTempBusinessDetails();
      console.log('Temp business details from data service:', tempBusinessDetails);
      
      if (tempBusinessDetails) {
        this.business = tempBusinessDetails;
        console.log('Business data from data service:', this.business);
        console.log('Staff data from data service:', this.business?.staff);
        console.log('Operation type from data service:', this.business?.operationType);
        this.isLoading = false;
      } else {
        console.log('No business data found, checking history state...');
        // Try to get from browser history state as fallback
        const historyState = history.state;
        console.log('History state:', historyState);
        
        if (historyState && historyState.business) {
          this.business = historyState.business;
          console.log('Business data from history:', this.business);
          console.log('Staff data from history:', this.business?.staff);
          console.log('Operation type from history:', this.business?.operationType);
          this.isLoading = false;
        } else {
          console.log('No business data found, redirecting back...');
          // If no state, redirect back
          this.router.navigate(['/business/manage']);
        }
      }
    }
  }

  /**
   * Navigate back to manage businesses page
   */
  goBack(): void {
    this.router.navigate(['/business/manage']);
  }

  /**
   * Get total number of locations
   */
  getTotalLocations(): number {
    if (!this.business) return 0;
    return (this.business.specificAddresses?.length || 0) + 
           (this.business.areaSpecifications?.length || 0);
  }

  /**
   * Get total number of service assignments
   */
  getTotalServiceAssignments(): number {
    return this.business?.servicePlaceAssignments?.length || 0;
  }

  /**
   * Get total number of staff members
   */
  getTotalStaff(): number {
    const staffCount = this.business?.staff?.length || 0;
    console.log('Staff count:', staffCount);
    console.log('Staff data:', this.business?.staff);
    return staffCount;
  }

  /**
   * Check if business has staff
   */
  hasStaff(): boolean {
    const hasStaff = !!(this.business?.staff && this.business.staff.length > 0);
    console.log('Has staff:', hasStaff);
    return hasStaff;
  }
} 