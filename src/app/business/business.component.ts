import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DataSvrService } from '../services/data-svr.service';
import { RegisterBusinessService, RegisterBusinessResponse } from '../services/register-business.service';
import { BusinessRegistration, BusinessPlaceAndServicesJunction } from '../models/business-registration';
import { ServicesForBusiness } from '../models/services-for-business';
import { BusinessPlace } from '../models/business-place';
import { CdkDragDrop, moveItemInArray, transferArrayItem, copyArrayItem } from '@angular/cdk/drag-drop';
import { Subscription } from 'rxjs';
import { BusinessSpecificAdr } from '../models/business-specific-adr';
import { S2CareaSpecification } from '../models/s2c-area-specification';
import { StaffMember, defaultStaffMember } from '../models/staff-member';

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
  specificPlaceForm!: FormGroup;
  areaPlaceForm!: FormGroup;
  staffForm!: FormGroup;

  // Registration state
  currentStep = 0;
  maxSteps = 4;
  registration: BusinessRegistration;
  
  // UI State
  isSubmitting = false;
  errorMessage: string | null = null;
  showAISection = false;
  
  // Options
  currencies: string[] = ['USD', 'EUR', 'GBP', 'AUD', 'CAD'];
  countries: string[] = ['USA', 'Canada', 'UK', 'Australia'];
  
  // Editing states
  editingServiceId: string | null = null;
  editingPlaceId: string | null = null;
  
  // Subscriptions
  private subscription: Subscription = new Subscription();

  isAILoading = false;
  aiDescription = '';

  placeType: 'specific' | 'area' = 'specific';
  specificPlaces: BusinessSpecificAdr[] = [];
  areaPlaces: S2CareaSpecification[] = [];

  // Location type selection
  locationType: 'specific' | 'area' | 'both' = 'specific';
  locationTypeOptions = this.registerService.getLocationTypeOptions();

  // Registration state
  isRegistering = false;
  registrationError: string | null = null;

  // Staff management
  operationType: 'solo' | 'with_staff' = 'solo';
  staffMembers: StaffMember[] = [];
  editingStaffIndex: number | null = null;
  showStaffSection = false;

  constructor(
    private fb: FormBuilder, 
    public data: DataSvrService,
    private registerService: RegisterBusinessService
  ) {
    this.initializeForms();
    this.registration = this.data.currentBusinessRegistration;
  }

  ngOnInit(): void {
    // Subscribe to business registration changes
    this.subscription.add(
      this.data.businessRegistration$.subscribe(registration => {
        this.registration = registration;
        
        // Sync places from registration to local arrays
        this.specificPlaces = (registration as any).specificPlaces || [];
        this.areaPlaces = (registration as any).areaPlaces || [];
        
        // Sync staff data
        this.operationType = registration.operationType || 'solo';
        this.staffMembers = registration.staff || [];
        this.showStaffSection = this.operationType === 'with_staff';
        
        // Update form control with current operation type
        this.basicInfoForm.patchValue({ operationType: this.operationType }, { emitEvent: false });
        
        console.log('Synced operation type:', this.operationType);
        console.log('Show staff section on load:', this.showStaffSection);
        
        // Ensure all services have proper IDs
        this.ensureServiceIDs();
      })
    );
    
    if (this.data.currentUser?.email) {
      this.basicInfoForm.patchValue({
        ownerEmail: this.data.currentUser.email
      });
    }

    // Subscribe to operation type changes
    this.subscription.add(
      this.basicInfoForm.get('operationType')?.valueChanges.subscribe(value => {
        if (value && value !== this.operationType) {
          this.setOperationType(value);
        }
      })
    );
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
      ownerEmail: [{ value: '', disabled: true }],
      operationType: ['solo', [Validators.required]]
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

    this.specificPlaceForm = this.fb.group({
      streetAdr: ['', [Validators.required, Validators.minLength(5)]],
      city: ['', [Validators.required, Validators.minLength(2)]],
      state: ['', [Validators.required, Validators.minLength(2)]],
      country: ['USA', [Validators.required]],
      suburbPostcode: [''],
      businessID: [''],
      placeID: ['']
    });
    this.areaPlaceForm = this.fb.group({
      country: ['USA', [Validators.required]],
      state: [''],
      city: [''],
      suburbPostcode: [''],
      businessID: [''],
      placeID: ['']
    });

    this.staffForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.maxLength(2000)]],
      lastName: ['', [Validators.required, Validators.maxLength(2000)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(2000)]],
      role: ['', [Validators.required]],
      accessAll: [false],
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
      case 0: 
        // Basic info must be valid and operation type must be selected
        return this.basicInfoForm.valid && (this.operationType === 'solo' || this.operationType === 'with_staff');
      case 1: return this.registration.services.length > 0;
      case 2: return this.specificPlaces.length > 0 || this.areaPlaces.length > 0;
      case 3: return true;
      default: return false;
    }
  }

  private saveCurrentStep(): void {
    if (this.currentStep === 0 && this.basicInfoForm.valid) {
      this.data.updateBasicInfo(this.basicInfoForm.value);
      // Save operation type and staff data
      this.registration.operationType = this.operationType;
      if (this.operationType === 'with_staff') {
        this.registration.staff = [...this.staffMembers];
      } else {
        this.registration.staff = [];
      }
      this.data.updateBusinessRegistration(this.registration);
    }
    // Sync places into registration.places when saving step 2
    if (this.currentStep === 2) {
      // Convert specificPlaces and areaPlaces to BusinessPlace objects
      const allPlaces: BusinessPlace[] = [
        ...this.specificPlaces.map(sp => {
          const existing = this.registration.places.find(p => p.placeID === sp.placeID);
          return {
            placeID: sp.placeID || this.data.generateId(),
            placeName: sp.streetAdr ? `${sp.streetAdr}, ${sp.city}` : 'Specific Place',
            placeDescription: '',
            placeAddress: sp.streetAdr || '',
            placeCity: sp.city || '',
            placeState: sp.state || '',
            placeZipCode: sp.suburbPostcode || '',
            placeCountry: sp.country || '',
            placePhone: '',
            placeEmail: '',
            businessID: sp.businessID || '',
            isActive: true,
            assignedServiceIDs: existing ? existing.assignedServiceIDs : [],
          };
        }),
        ...this.areaPlaces.map(ap => {
          const existing = this.registration.places.find(p => p.placeID === ap.placeID);
          return {
            placeID: ap.placeID || this.data.generateId(),
            placeName: ap.city ? `${ap.city} Area` : (ap.state ? `${ap.state} Area` : (ap.country || 'Area Place')),
            placeDescription: '',
            placeAddress: '',
            placeCity: ap.city || '',
            placeState: ap.state || '',
            placeZipCode: ap.suburbPostcode || '',
            placeCountry: ap.country || '',
            placePhone: '',
            placeEmail: '',
            businessID: ap.businessID || '',
            isActive: true,
            assignedServiceIDs: existing ? existing.assignedServiceIDs : [],
          };
        }),
      ];
      this.registration.places = allPlaces;
    }
  }

  addService(): void {
    if (this.serviceForm.valid) {
      const service: ServicesForBusiness = {
        ...this.serviceForm.value,
        businessID: '',
        serviceEstimatedTime: this.serviceForm.value.duration ? `${this.serviceForm.value.duration} minutes` : undefined,
        duration: this.serviceForm.value.duration ?? 30 // ensure duration is always set
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
    this.editingServiceId = service.serviceID!;
    this.serviceForm.patchValue({
      ...service,
      duration: service.duration ?? 30 // ensure duration is always set
    });
  }

  deleteService(serviceId: string): void {
    this.data.removeService(serviceId);
    this.data.openSnackBar('Service deleted', 'Close', 2000);
  }

  addPlace(): void {
    if (this.placeType === 'specific' && this.specificPlaceForm.valid) {
      const place: BusinessSpecificAdr = {
        ...this.specificPlaceForm.value,
        placeID: this.data.generateId(),
        businessID: ''
      };
      this.specificPlaces.push(place);
      this.specificPlaceForm.reset({ country: 'USA' });
      this.data.openSnackBar('Specific address place saved successfully', 'Close', 2000);
      this.saveCurrentStep();
    } else if (this.placeType === 'area' && this.areaPlaceForm.valid) {
      const area: S2CareaSpecification = {
        ...this.areaPlaceForm.value,
        placeID: this.data.generateId(),
        businessID: ''
      };
      this.areaPlaces.push(area);
      this.areaPlaceForm.reset({ country: 'USA' });
      this.data.openSnackBar('Area specification saved successfully', 'Close', 2000);
      this.saveCurrentStep();
    }
  }

  editPlace(place: BusinessPlace): void {
    if (place.placeAddress && place.placeAddress !== '') {
      // It's a specific place
      const specificPlace = this.specificPlaces.find(sp => sp.placeID === place.placeID);
      if (specificPlace) {
        this.editSpecificPlace(specificPlace);
      }
    } else {
      // It's an area place
      const areaPlace = this.areaPlaces.find(ap => ap.placeID === place.placeID);
      if (areaPlace) {
        this.editAreaPlace(areaPlace);
      }
    }
  }

  deletePlace(placeId: string): void {
    // Remove from registration.places
    this.registration.places = this.registration.places.filter(p => p.placeID !== placeId);
    
    // Remove from specific places if it exists there
    const specificPlace = this.specificPlaces.find(sp => sp.placeID === placeId);
    if (specificPlace) {
      this.deleteSpecificPlace(specificPlace);
    }
    
    // Remove from area places if it exists there
    const areaPlace = this.areaPlaces.find(ap => ap.placeID === placeId);
    if (areaPlace) {
      this.deleteAreaPlace(areaPlace);
    }
    
    this.data.openSnackBar('Place deleted', 'Close', 2000);
  }

  onServiceDrop(event: CdkDragDrop<string[]>, placeId: string): void {
    // Get the service ID from the drag data - this is the most reliable source
    const serviceId = event.item.data;
    
    // Debug logging to understand the issue
    console.log('Drop event debug:', {
      serviceId,
      placeId,
      fromContainer: event.previousContainer.id,
      toContainer: event.container.id,
      previousIndex: event.previousIndex,
      currentIndex: event.currentIndex,
      itemElement: event.item.element.nativeElement.textContent?.trim(),
      allServices: this.registration.services.map(s => ({ id: s.serviceID, name: s.serviceName })),
      draggedElement: event.item.element.nativeElement.getAttribute('data-service-id'),
      draggedElementName: event.item.element.nativeElement.getAttribute('data-service-name')
    });
    
    // If serviceId is undefined, try to get it from DOM attributes as fallback
    let finalServiceId = serviceId;
    if (!finalServiceId || finalServiceId === '' || finalServiceId === undefined) {
      finalServiceId = event.item.element.nativeElement.getAttribute('data-service-id');
      console.log('Using fallback service ID from DOM:', finalServiceId);
    }
    
    // If still no service ID, try to find by name as last resort
    if (!finalServiceId || finalServiceId === '' || finalServiceId === undefined) {
      const serviceName = event.item.element.nativeElement.getAttribute('data-service-name');
      const serviceByName = this.registration.services.find(s => s.serviceName === serviceName);
      if (serviceByName) {
        finalServiceId = serviceByName.serviceID;
        console.log('Using service ID found by name:', finalServiceId, 'for service:', serviceName);
      }
    }
    
    // Verify the service exists
    const service = this.registration.services.find(s => s.serviceID === finalServiceId);
    if (!service) {
      console.error('Service not found with ID:', finalServiceId);
      console.error('Available services:', this.registration.services);
      this.data.openSnackBar('Error: Service not found', 'Close', 3000);
      return;
    }
    
    console.log('Found service:', { id: service.serviceID, name: service.serviceName });
    
    if (event.previousContainer !== event.container) {
      // Moving between different containers
      if (placeId) {
        // Dropping into a place
        const place = this.registration.places.find(p => p.placeID === placeId);
        
        if (place && !place.assignedServiceIDs.includes(finalServiceId)) {
          // Add the service to the place
          this.data.assignServiceToPlace(finalServiceId, placeId);
          this.data.openSnackBar(`Service "${service.serviceName}" assigned to place`, 'Close', 2000);
        } else if (place && place.assignedServiceIDs.includes(finalServiceId)) {
          this.data.openSnackBar(`Service "${service.serviceName}" is already assigned to this location`, 'Close', 2000);
        }
        
        // Handle the source container
        if (event.previousContainer.id.startsWith('assigned-services-')) {
          // Moving from another place - remove from that place only if it's different
          const fromPlaceId = event.previousContainer.id.replace('assigned-services-', '');
          if (fromPlaceId !== placeId) {
            this.data.unassignServiceFromPlace(finalServiceId, fromPlaceId);
          }
        }
        // If coming from services-pool, don't remove it from there
        
      } else {
        // Dropping back to services pool - remove from previous place
        if (event.previousContainer.id.startsWith('assigned-services-')) {
          const fromPlaceId = event.previousContainer.id.replace('assigned-services-', '');
          this.data.unassignServiceFromPlace(finalServiceId, fromPlaceId);
          this.data.openSnackBar(`Service "${service.serviceName}" unassigned from place`, 'Close', 2000);
        }
      }
    } else {
      // Same container - reordering within a place
      if (placeId) {
        moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
        const place = this.registration.places.find(p => p.placeID === placeId);
        if (place) {
          place.assignedServiceIDs = [...event.container.data];
          this.data.updateBusinessRegistration(this.registration);
        }
      }
    }
  }

  getUnassignedServices(): ServicesForBusiness[] {
    // Return all services - they should remain available for assignment to multiple places
    return this.registration.services;
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
      this.submitBusinessRegistration();
    } else {
      this.data.openSnackBar('Please complete all steps', 'Close', 3000);
    }
  }

  /**
   * Submit business registration to the RegisterCompleteBusiness endpoint
   */
  submitBusinessRegistration(): void {
    this.isSubmitting = true;
    this.isRegistering = true;
    this.registrationError = null;

    // Ensure places are synced before submission
    this.syncPlacesToRegistration();

    // Build service assignments from places' assignedServiceIDs
    this.buildServiceAssignments();

    // Auto-detect location type based on the places we have
    const hasSpecificPlaces = this.specificPlaces.length > 0 || 
                             this.registration.places.some(p => p.placeAddress && p.placeAddress.trim() !== '');
    const hasAreaPlaces = this.areaPlaces.length > 0 || 
                         this.registration.places.some(p => (!p.placeAddress || p.placeAddress.trim() === '') && p.placeCountry);

    let actualLocationType: 'specific' | 'area' | 'both';
    if (hasSpecificPlaces && hasAreaPlaces) {
      actualLocationType = 'both';
    } else if (hasAreaPlaces) {
      actualLocationType = 'area';
    } else {
      actualLocationType = 'specific';
    }

    console.log('Auto-detected location type:', actualLocationType);
    console.log('Original location type:', this.locationType);
    console.log('Has specific places:', hasSpecificPlaces);
    console.log('Has area places:', hasAreaPlaces);
    console.log('Submitting complete registration with location type:', actualLocationType);
    console.log('Registration data:', this.registration);
    console.log('Specific places:', this.specificPlaces);
    console.log('Area places:', this.areaPlaces);
    console.log('Synced registration places:', this.registration.places);
    console.log('Service assignments:', this.registration.serviceAssignments);

    this.registerService.registerCompleteBusiness(actualLocationType).subscribe({
      next: (response: RegisterBusinessResponse) => {
        console.log('Registration successful:', response);
        this.isSubmitting = false;
        this.isRegistering = false;
        
        if (response.success) {
          this.data.openSnackBar(
            response.message || 'Business registered successfully!', 
            'Close', 
            5000
          );
          this.data.triggerSuccessConfetti();
          
          // Reset form after successful registration
          setTimeout(() => {
            this.data.resetBusinessRegistration();
            this.currentStep = 0;
            this.locationType = 'specific';
            this.specificPlaces = [];
            this.areaPlaces = [];
          }, 2000);
        } else {
          this.handleRegistrationError(response.message || 'Registration failed');
        }
      },
      error: (error: any) => {
        console.error('Registration error:', error);
        this.isSubmitting = false;
        this.isRegistering = false;
        
        let errorMessage = 'Registration failed. Please try again.';
        if (error.message) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }
        
        this.handleRegistrationError(errorMessage);
        
        // Show individual errors if available
        if (error.errors && Array.isArray(error.errors)) {
          error.errors.forEach((err: string, index: number) => {
            setTimeout(() => {
              this.data.openSnackBar(`Error ${index + 1}: ${err}`, 'Close', 4000);
            }, index * 1000);
          });
        }
      }
    });
  }

  /**
   * Handle registration errors
   */
  private handleRegistrationError(errorMessage: string): void {
    this.registrationError = errorMessage;
    this.data.openSnackBar(errorMessage, 'Close', 5000);
  }

  /**
   * Set the location type and update form visibility
   */
  setLocationType(type: 'specific' | 'area' | 'both'): void {
    this.locationType = type;
    console.log('Location type changed to:', type);
    
    // Update form visibility based on location type
    if (type === 'specific') {
      this.placeType = 'specific';
    } else if (type === 'area') {
      this.placeType = 'area';
    }
    // For 'both', keep current placeType or allow user to switch
  }

  private isRegistrationComplete(): boolean {
    return this.basicInfoForm.valid &&
           this.registration.services.length > 0 &&
           (this.specificPlaces.length > 0 || this.areaPlaces.length > 0);
  }

  /**
   * Public method to check if registration is complete (for template)
   */
  isRegistrationCompletePublic(): boolean {
    return this.isRegistrationComplete();
  }

  // Public getter methods for template
  get unassignedServiceIds(): string[] {
    const services = this.getUnassignedServices();
    const serviceIds = services.map(s => s.serviceID!).filter(id => id !== undefined);
    return serviceIds;
  }

  get placeDropListIds(): string[] {
    return this.registration.places.map(p => 'assigned-services-' + p.placeID);
  }

  fillFormWithAI() {
    if (!this.aiDescription.trim()) {
      this.data.openSnackBar('Please provide a description of your business', 'Close', 3000);
      return;
    }

    this.isAILoading = true;
    this.data.fillBusinessFormWithAI(this.aiDescription, this.registration, this.currentStep).subscribe({
      next: (data) => {
        // Update only the current step's data
        if (this.currentStep === 0 && data.basicInfo) {
          this.basicInfoForm.patchValue(data.basicInfo);
        } else if (this.currentStep === 1 && data.services) {
          // Directly set the services array to the new list from AI
          this.registration.services = data.services;
        } else if (this.currentStep === 2) {
          // Update local arrays from the registration data that was modified by AI
          this.specificPlaces = (this.registration as any).specificPlaces || [];
          this.areaPlaces = (this.registration as any).areaPlaces || [];
          
          // Force sync the places to registration.places
          this.syncPlacesToRegistration();
        } else if (this.currentStep === 3 && (data as any).assignments) {
          // Update assignments in the UI
          if (Array.isArray((data as any).assignments)) {
            console.log('AI Assignments received:', (data as any).assignments);
            console.log('Current places:', this.registration.places.map(p => ({ id: p.placeID, name: p.placeName })));
            console.log('Current services:', this.registration.services.map(s => ({ id: s.serviceID, name: s.serviceName })));
            
            // Update main registration.places array
            this.registration.places.forEach(place => {
              const found = (data as any).assignments.find((a: any) => a.placeId === place.placeID);
              if (found && Array.isArray(found.serviceIds)) {
                console.log(`Assigning services ${found.serviceIds} to place ${place.placeID} (${place.placeName})`);
                place.assignedServiceIDs = [...found.serviceIds];
              }
            });
            
            // Also update local specificPlaces and areaPlaces arrays if they exist
            this.specificPlaces.forEach(place => {
              const found = (data as any).assignments.find((a: any) => a.placeId === place.placeID);
              if (found && Array.isArray(found.serviceIds)) {
                (place as any).assignedServiceIDs = [...found.serviceIds];
              }
            });
            
            this.areaPlaces.forEach(place => {
              const found = (data as any).assignments.find((a: any) => a.placeId === place.placeID);
              if (found && Array.isArray(found.serviceIds)) {
                (place as any).assignedServiceIDs = [...found.serviceIds];
              }
            });
            
            // Force UI update by updating the data service
            this.data.updateBusinessRegistration(this.registration);
            console.log('Updated places after AI assignment:', this.registration.places.map(p => ({ id: p.placeID, name: p.placeName, services: p.assignedServiceIDs })));
          }
        }

        this.data.openSnackBar('Form section updated successfully with AI', 'Close', 3000);
        this.aiDescription = '';
      },
      error: (error) => {
        console.error('Error filling form with AI:', error);
        this.data.openSnackBar('Error filling form with AI. Please try again.', 'Close', 3000);
      },
      complete: () => {
        this.isAILoading = false;
      }
    });
  }

  getAIPlaceholder(): string {
    switch (this.currentStep) {
      case 0:
        return 'Example: I want to open a hair salon in New York. We focus on premium services and have a modern, upscale atmosphere.';
      case 1:
        return 'Example: Add premium hair coloring services with detailed descriptions and competitive pricing. Include basic cuts and styling services.';
      case 2:
        return 'Example: Add a second location in Brooklyn with a modern design. Include complete address and contact details.';
      case 3:
        return 'Example: Assign hair cutting services to the main salon and coloring services to both locations. Make sure all services are properly distributed.';
      default:
        return 'Describe what you want for this section';
    }
  }

  getAIButtonText(): string {
    const hasData = this.currentStep === 0 ? this.basicInfoForm.valid :
                   this.currentStep === 1 ? this.registration.services.length > 0 :
                   this.currentStep === 2 ? this.specificPlaces.length > 0 || this.areaPlaces.length > 0 : false;
    
    return hasData ? 'Improve Section with AI' : '✨Fill Section with AI✨';
  }

  toggleAISection(): void {
    this.showAISection = !this.showAISection;
  }

  // Add these methods for specific and area places
  editSpecificPlace(place: BusinessSpecificAdr): void {
    this.placeType = 'specific';
    this.editingPlaceId = place.placeID || null;
    this.specificPlaceForm.patchValue(place);
  }

  deleteSpecificPlace(place: BusinessSpecificAdr): void {
    this.specificPlaces = this.specificPlaces.filter(p => p.placeID !== place.placeID);
    this.registration.places = this.registration.places.filter(p => p.placeID !== place.placeID);
    this.data.openSnackBar('Specific address place deleted', 'Close', 2000);
  }

  editAreaPlace(area: S2CareaSpecification): void {
    this.placeType = 'area';
    this.editingPlaceId = area.placeID || null;
    this.areaPlaceForm.patchValue(area);
  }

  deleteAreaPlace(area: S2CareaSpecification): void {
    this.areaPlaces = this.areaPlaces.filter(a => a.placeID !== area.placeID);
    this.registration.places = this.registration.places.filter(p => p.placeID !== area.placeID);
    this.data.openSnackBar('Area specification place deleted', 'Close', 2000);
  }

  getSpecificLocationPlaces(): BusinessPlace[] {
    return this.registration.places.filter(p => p.placeAddress && p.placeAddress !== '');
  }

  getAreaSpecificationPlaces(): BusinessPlace[] {
    return this.registration.places.filter(p => !p.placeAddress || p.placeAddress === '');
  }

  // Utility for template to get area place by ID
  public getAreaPlaceById(placeId: string): S2CareaSpecification | undefined {
    return this.areaPlaces.find(area => area.placeID === placeId);
  }

  // Utility for template to get specific place by ID
  public getSpecificPlaceById(placeId: string): BusinessSpecificAdr | undefined {
    return this.specificPlaces.find(place => place.placeID === placeId);
  }

  removeServiceFromPlace(serviceId: string, placeId: string): void {
    this.data.unassignServiceFromPlace(serviceId, placeId);
    this.data.openSnackBar('Service removed from place', 'Close', 2000);
  }

  private syncPlacesToRegistration(): void {
    // Convert specificPlaces and areaPlaces to BusinessPlace objects and sync to registration.places
    const allPlaces: BusinessPlace[] = [
      ...this.specificPlaces.map(sp => {
        const existing = this.registration.places.find(p => p.placeID === sp.placeID);
        return {
          placeID: sp.placeID || this.data.generateId(),
          placeName: sp.streetAdr ? `${sp.streetAdr}, ${sp.city}` : 'Specific Place',
          placeDescription: '',
          placeAddress: sp.streetAdr || '',
          placeCity: sp.city || '',
          placeState: sp.state || '',
          placeZipCode: sp.suburbPostcode || '',
          placeCountry: sp.country || '',
          placePhone: '',
          placeEmail: '',
          businessID: sp.businessID || '',
          isActive: true,
          assignedServiceIDs: existing ? existing.assignedServiceIDs : [],
        };
      }),
      ...this.areaPlaces.map(ap => {
        const existing = this.registration.places.find(p => p.placeID === ap.placeID);
        return {
          placeID: ap.placeID || this.data.generateId(),
          placeName: ap.city ? `${ap.city} Area` : (ap.state ? `${ap.state} Area` : (ap.country || 'Area Place')),
          placeDescription: '',
          placeAddress: '',
          placeCity: ap.city || '',
          placeState: ap.state || '',
          placeZipCode: ap.suburbPostcode || '',
          placeCountry: ap.country || '',
          placePhone: '',
          placeEmail: '',
          businessID: ap.businessID || '',
          isActive: true,
          assignedServiceIDs: existing ? existing.assignedServiceIDs : [],
        };
      })
    ];
    
    this.registration.places = allPlaces;
    this.data.updateBusinessRegistration(this.registration);
  }

  private ensureServiceIDs(): void {
    let needsUpdate = false;
    const updatedServices = this.registration.services.map(service => {
      if (!service.serviceID || service.serviceID === '' || service.serviceID === undefined) {
        needsUpdate = true;
        return {
          ...service,
          serviceID: this.data.generateId()
        };
      }
      return service;
    });
    
    if (needsUpdate) {
      console.log('Fixed services with missing IDs:', updatedServices.map(s => ({ id: s.serviceID, name: s.serviceName })));
      this.registration.services = updatedServices;
      this.data.updateBusinessRegistration(this.registration);
    }
  }

  // Staff Management Methods
  setOperationType(type: 'solo' | 'with_staff'): void {
    console.log('Setting operation type to:', type);
    this.operationType = type;
    this.showStaffSection = type === 'with_staff';
    
    // Update the form control
    this.basicInfoForm.patchValue({ operationType: type });
    
    // Update the registration object
    this.registration.operationType = type;
    
    console.log('Show staff section:', this.showStaffSection);
    
    if (type === 'solo') {
      this.staffMembers = [];
      this.registration.staff = [];
    } else {
      this.registration.staff = this.staffMembers;
    }
    
    this.data.updateBusinessRegistration(this.registration);
  }

  addStaffMember(): void {
    if (this.staffForm.valid) {
      const newStaff: StaffMember = {
        ...this.staffForm.value,
        isActive: true
      };

      if (this.editingStaffIndex !== null) {
        this.staffMembers[this.editingStaffIndex] = newStaff;
        this.editingStaffIndex = null;
        this.data.openSnackBar('Staff member updated successfully', 'Close', 2000);
      } else {
        this.staffMembers.push(newStaff);
        this.data.openSnackBar('Staff member added successfully', 'Close', 2000);
      }

      this.registration.staff = [...this.staffMembers];
      this.data.updateBusinessRegistration(this.registration);
      this.resetStaffForm();
    } else {
      this.data.openSnackBar('Please fill in all required staff fields', 'Close', 3000);
    }
  }

  editStaffMember(index: number): void {
    this.editingStaffIndex = index;
    const staff = this.staffMembers[index];
    this.staffForm.patchValue(staff);
  }

  deleteStaffMember(index: number): void {
    this.staffMembers.splice(index, 1);
    this.registration.staff = [...this.staffMembers];
    this.data.updateBusinessRegistration(this.registration);
    this.data.openSnackBar('Staff member removed', 'Close', 2000);
  }

  resetStaffForm(): void {
    this.staffForm.reset({
      firstName: '',
      lastName: '',
      email: '',
      role: '',
      accessAll: false,
      isActive: true
    });
    this.editingStaffIndex = null;
  }

  cancelStaffEdit(): void {
    this.resetStaffForm();
  }

  toggleStaffActive(index: number): void {
    this.staffMembers[index].isActive = !this.staffMembers[index].isActive;
    this.registration.staff = [...this.staffMembers];
    this.data.updateBusinessRegistration(this.registration);
  }

  getStaffSummary(): string {
    const activeStaff = this.staffMembers.filter(s => s.isActive).length;
    const totalStaff = this.staffMembers.length;
    return `${activeStaff} active staff member${activeStaff !== 1 ? 's' : ''} (${totalStaff} total)`;
  }

  private buildServiceAssignments(): void {
    console.log('Building service assignments...');
    console.log('Current registration places:', this.registration.places);
    console.log('Current registration serviceAssignments:', this.registration.serviceAssignments);
    
    // Get current assignments from data service
    const currentAssignments = this.data.currentBusinessRegistration.serviceAssignments;
    console.log('Current assignments from data service:', currentAssignments);
    
    // If we already have service assignments, use them
    if (currentAssignments && currentAssignments.length > 0) {
      console.log('Using existing service assignments from data service:', currentAssignments);
      this.registration.serviceAssignments = [...currentAssignments];
      return;
    }
    
    // Clear existing assignments
    this.registration.serviceAssignments = [];
    
    // Build assignments from places' assignedServiceIDs
    this.registration.places.forEach(place => {
      console.log(`Processing place ${place.placeID} (${place.placeName}) with assigned services:`, place.assignedServiceIDs);
      place.assignedServiceIDs.forEach(serviceId => {
        const assignment: BusinessPlaceAndServicesJunction = {
          businessID: this.registration.basicInfo.businessID || '',
          serviceID: serviceId,
          placeId: place.placeID,
          serviceType: 'standard'
        };
        this.registration.serviceAssignments.push(assignment);
        console.log(`Created assignment:`, assignment);
      });
    });
    
    // If no assignments were created from assignedServiceIDs, create assignments for all services to all places
    if (this.registration.serviceAssignments.length === 0 && 
        this.registration.services.length > 0 && 
        this.registration.places.length > 0) {
      console.log('No assignments found, creating assignments for all services to all places');
      this.registration.services.forEach(service => {
        this.registration.places.forEach(place => {
          const assignment: BusinessPlaceAndServicesJunction = {
            businessID: this.registration.basicInfo.businessID || '',
            serviceID: service.serviceID,
            placeId: place.placeID,
            serviceType: 'standard'
          };
          this.registration.serviceAssignments.push(assignment);
          console.log(`Created fallback assignment:`, assignment);
        });
      });
    }
    
    console.log('Final service assignments:', this.registration.serviceAssignments);
    
    // Update the data service with the new assignments
    this.data.updateBusinessRegistration(this.registration);
  }
}
