import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ManageBusinessesService } from '../services/manage-businesses.service';
import { BusinessRegistrationDto } from '../models/business-registration-dto';

@Component({
  selector: 'app-staffmanage',
  standalone: false,
  templateUrl: './staffmanage.html',
  styleUrl: './staffmanage.css'
})
export class Staffmanage implements OnInit {
  businessId: string = '';
  selectedBusiness: BusinessRegistrationDto | null = null;
  loading: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private manageBusinessesService: ManageBusinessesService
  ) {}

  ngOnInit(): void {
    // Get business ID from route parameters
    this.route.params.subscribe(params => {
      this.businessId = params['businessId'];
      if (this.businessId) {
        this.loadBusinessDetails();
      }
    });
  }

  private loadBusinessDetails(): void {
    this.loading = true;
    
    // Get all businesses and find the selected one
    this.manageBusinessesService.getAllBusinessesForUser().subscribe({
      next: (businesses) => {
        this.selectedBusiness = businesses.find(b => b.basicInfo.businessID === this.businessId) || null;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading business details:', error);
        this.loading = false;
      }
    });
  }

  // Visit staff app in new tab
  visitStaffApp(): void {
    window.open('https://fuzzstaff.vercel.app', '_blank');
  }
}
