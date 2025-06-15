import { Component } from '@angular/core';
import { DataSvrService } from '../services/data-svr.service';
import { BusinessBasicInfo } from '../models/businessbasicinfo';

@Component({
  selector: 'app-managebusinesses',
  standalone: false,
  templateUrl: './managebusinesses.component.html',
  styleUrl: './managebusinesses.component.css'
})
export class ManagebusinessesComponent {
  searchQuery: string = '';
  allBusinesses: BusinessBasicInfo[] = [];
  filteredBusinesses: BusinessBasicInfo[] = [];
  isLoading: boolean = false;

  constructor(public data: DataSvrService) {
    if(this.data.currentUser?.email){
      this.isLoading = true;
      this.data.getBusinessesForUser(this.data.currentUser.email).subscribe({
        next: (businesses) => {
          this.data.businesses = businesses;
          this.allBusinesses = businesses;
          this.filteredBusinesses = businesses;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error fetching businesses:', error);
          this.isLoading = false;
        }
      });
    }
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
      business.bussinessName?.toLowerCase().includes(query) ||
      business.bussinessDescription?.toLowerCase().includes(query) ||
      business.bussinessEmail?.toLowerCase().includes(query) ||
      business.bussinessPhone?.toLowerCase().includes(query)
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
   * Get the businesses to display (filtered or all)
   */
  get businessesToDisplay(): BusinessBasicInfo[] {
    return this.filteredBusinesses;
  }
}
