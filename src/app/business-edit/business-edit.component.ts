import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { DataSvrService } from '../services/data-svr.service';
import { ManageBusinessesService } from '../services/manage-businesses.service';
import { BusinessRegistrationDto } from '../models/business-registration-dto';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-business-edit',
  templateUrl: './business-edit.component.html',
  styleUrls: ['./business-edit.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatRadioModule,
    MatCheckboxModule,
    MatProgressSpinnerModule
  ]
})
export class BusinessEditComponent implements OnInit, OnDestroy {
  businessForm: FormGroup;
  business: BusinessRegistrationDto | null = null;
  isUpdating: boolean = false;
  isLoading: boolean = true;
  subscription = new Subscription();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private dataSvr: DataSvrService,
    private manageBusinessesService: ManageBusinessesService,
    private snackBar: MatSnackBar
  ) {
    this.businessForm = this.createBusinessForm();
  }

  ngOnInit(): void {
    this.loadBusiness();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  /**
   * Load the business to edit
   */
  private loadBusiness(): void {
    const businessId = this.route.snapshot.paramMap.get('id');
    
    if (!businessId) {
      this.snackBar.open('Business ID not found', 'Close', { duration: 3000 });
      this.router.navigate(['/business/manage']);
      return;
    }

    // Try to get business from service instance first
    const businesses = this.manageBusinessesService.getBusinessesInstance();
    const business = businesses.find(b => b.basicInfo.businessID === businessId);
    
    if (business) {
      this.business = business;
      this.populateForm(business);
      this.isLoading = false;
    } else {
      // If not in instance, try to load from API
      this.loadBusinessFromApi(businessId);
    }
  }

  /**
   * Load business from API if not in instance
   */
  private loadBusinessFromApi(businessId: string): void {
    this.manageBusinessesService.getAllBusinessesForUser().subscribe({
      next: (businesses) => {
        const business = businesses.find(b => b.basicInfo.businessID === businessId);
        if (business) {
          this.business = business;
          this.populateForm(business);
        } else {
          this.snackBar.open('Business not found', 'Close', { duration: 3000 });
          this.router.navigate(['/business/manage']);
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading business:', error);
        this.snackBar.open('Error loading business', 'Close', { duration: 3000 });
        this.router.navigate(['/business/manage']);
        this.isLoading = false;
      }
    });
  }

  /**
   * Create the business form
   */
  createBusinessForm(): FormGroup {
    return this.fb.group({
      businessName: ['', Validators.required],
      businessDescription: [''],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      services: this.fb.array([]),
      specificAddresses: this.fb.array([]),
      areaSpecifications: this.fb.array([]),
      staff: this.fb.array([]),
      operationType: ['solo']
    });
  }

  /**
   * Populate the form with business data
   */
  private populateForm(business: BusinessRegistrationDto): void {
    this.businessForm.patchValue({
      businessName: business.basicInfo.businessName,
      businessDescription: business.basicInfo.businessDescription,
      email: business.basicInfo.email,
      phone: business.basicInfo.phone,
      operationType: business.operationType
    });

    // Clear existing arrays
    this.clearFormArrays();

    // Populate services
    if (business.services) {
      business.services.forEach(service => {
        this.addService(service);
      });
    }

    // Populate specific addresses
    if (business.specificAddresses) {
      business.specificAddresses.forEach(address => {
        this.addSpecificAddress(address);
      });
    }

    // Populate area specifications
    if (business.areaSpecifications) {
      business.areaSpecifications.forEach(area => {
        this.addAreaSpecification(area);
      });
    }

    // Populate staff
    if (business.staff) {
      business.staff.forEach(staffMember => {
        this.addStaffMember(staffMember);
      });
    }
  }

  /**
   * Clear all form arrays
   */
  private clearFormArrays(): void {
    while (this.servicesArray.length !== 0) {
      this.servicesArray.removeAt(0);
    }
    while (this.addressesArray.length !== 0) {
      this.addressesArray.removeAt(0);
    }
    while (this.areasArray.length !== 0) {
      this.areasArray.removeAt(0);
    }
    while (this.staffArray.length !== 0) {
      this.staffArray.removeAt(0);
    }
  }

  /**
   * Save the edited business
   */
  saveBusiness(): void {
    if (this.businessForm.invalid || !this.business) {
      this.snackBar.open('Please fill in all required fields', 'Close', { duration: 3000 });
      return;
    }

    this.isUpdating = true;
    const formValue = this.businessForm.value;

    // Create updated business object
    const updatedBusiness: BusinessRegistrationDto = {
      ...this.business,
      basicInfo: {
        ...this.business.basicInfo,
        businessName: formValue.businessName,
        businessDescription: formValue.businessDescription,
        email: formValue.email,
        phone: formValue.phone
      },
      services: formValue.services,
      specificAddresses: formValue.specificAddresses,
      areaSpecifications: formValue.areaSpecifications,
      staff: formValue.operationType === 'with_staff' ? formValue.staff : undefined,
      operationType: formValue.operationType
    };

    this.manageBusinessesService.updateBusiness(updatedBusiness).subscribe({
      next: (response) => {
        console.log('Business updated successfully:', response);
        
        // Update local data in service
        const businesses = this.manageBusinessesService.getBusinessesInstance();
        const index = businesses.findIndex(b => b.basicInfo.businessID === this.business?.basicInfo.businessID);
        if (index !== -1) {
          businesses[index] = updatedBusiness;
          this.manageBusinessesService.setBusinessesInstance(businesses);
        }
        
        this.snackBar.open('Business updated successfully', 'Close', { duration: 3000 });
        this.isUpdating = false;
        
        // Navigate back to manage businesses
        this.router.navigate(['/business/manage']);
      },
      error: (error) => {
        console.error('Error updating business:', error);
        this.isUpdating = false;
        
        if (error.status === 401) {
          this.snackBar.open('Authentication failed. Please sign in again.', 'Close', { duration: 5000 });
        } else if (error.status === 403) {
          this.snackBar.open('You don\'t have permission to update this business.', 'Close', { duration: 5000 });
        } else {
          this.snackBar.open('Error updating business. Please try again.', 'Close', { duration: 3000 });
        }
      }
    });
  }

  /**
   * Cancel editing and go back
   */
  cancelEditing(): void {
    this.router.navigate(['/business/manage']);
  }

  // Form array getters
  get servicesArray(): FormArray {
    return this.businessForm.get('services') as FormArray;
  }

  get addressesArray(): FormArray {
    return this.businessForm.get('specificAddresses') as FormArray;
  }

  get areasArray(): FormArray {
    return this.businessForm.get('areaSpecifications') as FormArray;
  }

  get staffArray(): FormArray {
    return this.businessForm.get('staff') as FormArray;
  }

  // Service management
  addService(service?: any): void {
    const serviceGroup = this.fb.group({
      serviceName: [service?.serviceName || '', Validators.required],
      serviceDescription: [service?.serviceDescription || ''],
      duration: [service?.duration || 0],
      price: [service?.price || 0],
      currency: [service?.currency || 'USD'],
      serviceImageUrl: [service?.serviceImageUrl || '']
    });
    this.servicesArray.push(serviceGroup);
  }

  removeService(index: number): void {
    this.servicesArray.removeAt(index);
  }

  // Address management
  addSpecificAddress(address?: any): void {
    const addressGroup = this.fb.group({
      streetAddress: [address?.streetAddress || '', Validators.required],
      city: [address?.city || '', Validators.required],
      state: [address?.state || ''],
      country: [address?.country || '', Validators.required],
      postalCode: [address?.postalCode || '']
    });
    this.addressesArray.push(addressGroup);
  }

  removeSpecificAddress(index: number): void {
    this.addressesArray.removeAt(index);
  }

  // Area specification management
  addAreaSpecification(area?: any): void {
    const areaGroup = this.fb.group({
      country: [area?.country || '', Validators.required],
      state: [area?.state || ''],
      city: [area?.city || ''],
      postalCode: [area?.postalCode || '']
    });
    this.areasArray.push(areaGroup);
  }

  removeAreaSpecification(index: number): void {
    this.areasArray.removeAt(index);
  }

  // Staff management
  addStaffMember(staff?: any): void {
    const staffGroup = this.fb.group({
      firstName: [staff?.firstName || '', Validators.required],
      lastName: [staff?.lastName || '', Validators.required],
      email: [staff?.email || '', [Validators.required, Validators.email]],
      role: [staff?.role || ''],
      accessAll: [staff?.accessAll || false],
      isActive: [staff?.isActive !== false]
    });
    this.staffArray.push(staffGroup);
  }

  removeStaffMember(index: number): void {
    this.staffArray.removeAt(index);
  }
} 