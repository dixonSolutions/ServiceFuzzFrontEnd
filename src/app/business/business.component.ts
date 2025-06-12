import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DataSvrService } from '../services/data-svr.service';
import { BusinessRegistration } from '../models/business-registration';
import { ServicesForBusiness } from '../models/services-for-business';
import { BusinessPlace } from '../models/business-place';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-business',
  standalone: false,
  templateUrl: './business.component.html',
  styleUrl: './business.component.css'
})
export class BusinessComponent implements OnInit, OnDestroy {
  // Forms for each step
  basicInfoForm!: FormGroup;
  serviceForm!: FormGroup;
  placeForm!: FormGroup;

  // Registration state
  currentStep = 0;
  maxSteps = 4;
  registration: BusinessRegistration;
  
  // UI State
  isSubmitting = false;
  errorMessage: string | null = null;
  
  // Options
  currencies: string[] = ['USD', 'EUR', 'GBP', 'AUD', 'CAD'];
  countries: string[] = ['USA', 'Canada', 'UK', 'Australia'];
  
  // Editing states
  editingServiceId: string | null = null;
  editingPlaceId: string | null = null;
  
  // Subscriptions
  private subscription: Subscription = new Subscription();

  constructor(private fb: FormBuilder, public data: DataSvrService) {
    this.initializeForms();
    this.registration = this.data.currentBusinessRegistration;
  }

  ngOnInit(): void {
    this.subscription.add(
      this.data.businessRegistration$.subscribe(registration => {
        this.registration = registration;
        this.currentStep = registration.currentStep;
      })
    );
    
    if (this.data.currentUser?.email) {
      this.basicInfoForm.patchValue({
        ownerEmail: this.data.currentUser.email
      });
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private initializeForms(): void {
    this.basicInfoForm = this.fb.group({
      bussinessName: ['', [Validators.required, Validators.minLength(2)]],
      bussinessDescription: ['', [Validators.required, Validators.minLength(10)]],
      bussinessPhone: ['', [Validators.required, Validators.pattern('^[0-9+ -]{8,}$')]],
      bussinessEmail: ['', [Validators.required, Validators.email]],
      ownerEmail: [{ value: '', disabled: true }]
    });

    this.serviceForm = this.fb.group({
      serviceName: ['', [Validators.required, Validators.minLength(2)]],
      serviceDescription: ['', [Validators.required, Validators.minLength(10)]],
      duration: [30, [Validators.required, Validators.min(5)]],
      servicePrice: [0, [Validators.required, Validators.min(0)]],
      servicePriceCurrencyUnit: ['USD', [Validators.required]],
      serviceImageUrl: ['']
    });

    this.placeForm = this.fb.group({
      placeName: ['', [Validators.required, Validators.minLength(2)]],
      placeDescription: ['', [Validators.required, Validators.minLength(10)]],
      placeAddress: ['', [Validators.required, Validators.minLength(5)]],
      placeCity: ['', [Validators.required, Validators.minLength(2)]],
      placeState: ['', [Validators.required, Validators.minLength(2)]],
      placeZipCode: ['', [Validators.required, Validators.pattern('^[0-9A-Za-z -]{3,10}$')]],
      placeCountry: ['USA', [Validators.required]],
      placePhone: [''],
      placeEmail: ['', [Validators.email]],
      isActive: [true]
    });
  }

  nextStep(): void {
    if (this.isCurrentStepValid()) {
      this.saveCurrentStep();
      if (this.currentStep < this.maxSteps - 1) {
        this.currentStep++;
        this.data.setCurrentStep(this.currentStep);
      }
    } else {
      this.data.openSnackBar('Please complete this step before continuing', 'Close', 3000);
    }
  }

  previousStep(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.data.setCurrentStep(this.currentStep);
    }
  }

  private isCurrentStepValid(): boolean {
    switch (this.currentStep) {
      case 0: return this.basicInfoForm.valid;
      case 1: return this.registration.services.length > 0;
      case 2: return this.registration.places.length > 0;
      case 3: return true;
      default: return false;
    }
  }

  private saveCurrentStep(): void {
    if (this.currentStep === 0 && this.basicInfoForm.valid) {
      this.data.updateBasicInfo(this.basicInfoForm.value);
    }
  }

  addService(): void {
    if (this.serviceForm.valid) {
      const service: ServicesForBusiness = {
        ...this.serviceForm.value,
        serviceID: '',
        businessID: '',
        serviceEstimatedTime: `${this.serviceForm.value.duration} minutes`
      };
      
      if (this.editingServiceId) {
        this.data.updateService(this.editingServiceId, service);
        this.editingServiceId = null;
      } else {
        this.data.addService(service);
      }
      
      this.serviceForm.reset();
      this.serviceForm.patchValue({ duration: 30, servicePrice: 0, servicePriceCurrencyUnit: 'USD' });
      this.data.openSnackBar('Service saved successfully', 'Close', 2000);
    }
  }

  editService(service: ServicesForBusiness): void {
    this.editingServiceId = service.serviceID;
    this.serviceForm.patchValue(service);
  }

  deleteService(serviceId: string): void {
    this.data.removeService(serviceId);
    this.data.openSnackBar('Service deleted', 'Close', 2000);
  }

  addPlace(): void {
    if (this.placeForm.valid) {
      const place: BusinessPlace = {
        ...this.placeForm.value,
        placeID: '',
        businessID: '',
        assignedServiceIDs: []
      };
      
      if (this.editingPlaceId) {
        this.data.updatePlace(this.editingPlaceId, place);
        this.editingPlaceId = null;
      } else {
        this.data.addPlace(place);
      }
      
      this.placeForm.reset();
      this.placeForm.patchValue({ placeCountry: 'USA', isActive: true });
      this.data.openSnackBar('Place saved successfully', 'Close', 2000);
    }
  }

  editPlace(place: BusinessPlace): void {
    this.editingPlaceId = place.placeID;
    this.placeForm.patchValue(place);
  }

  deletePlace(placeId: string): void {
    this.data.removePlace(placeId);
    this.data.openSnackBar('Place deleted', 'Close', 2000);
  }

  onServiceDrop(event: CdkDragDrop<string[]>, placeId: string): void {
    if (event.previousContainer !== event.container) {
      const serviceId = event.previousContainer.data[event.previousIndex];
      this.data.assignServiceToPlace(serviceId, placeId);
      this.data.openSnackBar('Service assigned to place', 'Close', 2000);
    }
  }

  getUnassignedServices(): ServicesForBusiness[] {
    const assignedServiceIds = new Set(
      this.registration.places.flatMap(place => place.assignedServiceIDs)
    );
    return this.registration.services.filter(service => !assignedServiceIds.has(service.serviceID));
  }

  getAssignedServices(placeId: string): ServicesForBusiness[] {
    const place = this.registration.places.find(p => p.placeID === placeId);
    if (!place) return [];
    
    return place.assignedServiceIDs
      .map(serviceId => this.registration.services.find(s => s.serviceID === serviceId))
      .filter(service => service !== undefined) as ServicesForBusiness[];
  }

  onSubmit(): void {
    if (this.isRegistrationComplete()) {
      this.isSubmitting = true;
      console.log('Complete Registration:', this.registration);
      
      setTimeout(() => {
        this.isSubmitting = false;
        this.data.openSnackBar('Business registered successfully!', 'Close', 5000);
        this.data.resetBusinessRegistration();
        this.currentStep = 0;
      }, 2000);
    } else {
      this.data.openSnackBar('Please complete all steps', 'Close', 3000);
    }
  }

  private isRegistrationComplete(): boolean {
    return this.basicInfoForm.valid &&
           this.registration.services.length > 0 &&
           this.registration.places.length > 0;
  }

  // Public getter methods for template
  get unassignedServiceIds(): string[] {
    return this.getUnassignedServices().map(s => s.serviceID);
  }

  get placeDropListIds(): string[] {
    return this.registration.places.map(p => 'assigned-services-' + p.placeID);
  }

  public isRegistrationCompletePublic(): boolean {
    return this.isRegistrationComplete();
  }
}
