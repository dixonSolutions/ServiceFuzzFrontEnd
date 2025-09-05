import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { ToastService } from '../services/toast.service';
import { Subscription } from 'rxjs';
import { DataSvrService } from '../services/data-svr.service';
import { ManageBusinessesService } from '../services/manage-businesses.service';
import { RegisterBusinessService } from '../services/register-business.service';
import { BusinessRegistrationDto } from '../models/business-registration-dto';
import { 
  BusinessSchedule, 
  ScheduleCycle, 
  DaySchedule, 
  OpeningPeriod, 
  ScheduleException,
  DayOfWeekEnum,
  ScheduleCycleType,
  DayAvailabilityStatus,
  ExceptionType,
  RecurrencePattern
} from '../models/businessSchedules';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';

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
    MatProgressSpinnerModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatChipsModule,
    MatExpansionModule
  ]
})
export class BusinessEditComponent implements OnInit, OnDestroy {
  businessForm: FormGroup;
  scheduleForm: FormGroup;
  business: BusinessRegistrationDto | null = null;
  businessSchedule: BusinessSchedule | null = null;
  isUpdating: boolean = false;
  isLoading: boolean = true;
  subscription = new Subscription();

  // Enums for template access
  DayOfWeekEnum = DayOfWeekEnum;
  ScheduleCycleType = ScheduleCycleType;
  DayAvailabilityStatus = DayAvailabilityStatus;
  ExceptionType = ExceptionType;
  RecurrencePattern = RecurrencePattern;

  // Helper arrays for template
  dayOfWeekOptions = Object.values(DayOfWeekEnum).filter(value => typeof value === 'number');
  scheduleCycleTypeOptions = Object.values(ScheduleCycleType).filter(value => typeof value === 'number');
  dayAvailabilityStatusOptions = Object.values(DayAvailabilityStatus).filter(value => typeof value === 'number');
  exceptionTypeOptions = Object.values(ExceptionType).filter(value => typeof value === 'number');
  recurrencePatternOptions = Object.values(RecurrencePattern).filter(value => typeof value === 'number');

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private dataSvr: DataSvrService,
    private manageBusinessesService: ManageBusinessesService,
    private registerBusinessService: RegisterBusinessService,
    private toastService: ToastService
  ) {
    this.businessForm = this.createBusinessForm();
    this.scheduleForm = this.createScheduleForm();
  }

  ngOnInit(): void {
    this.loadBusiness();
    this.initializeDefaultSchedule();
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
      this.toastService.error('Business ID not found', 'Error');
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
          this.toastService.error('Business not found', 'Error');
          this.router.navigate(['/business/manage']);
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading business:', error);
        this.toastService.error('Error loading business', 'Error');
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
   * Create the schedule form
   */
  createScheduleForm(): FormGroup {
    return this.fb.group({
      cycleType: [ScheduleCycleType.Weekly, Validators.required],
      cycleLengthInDays: [7, Validators.required],
      cycleStartDate: [new Date().toISOString().split('T')[0], Validators.required],
      cycles: this.fb.array([]),
      exceptions: this.fb.array([])
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

    // Note: Schedule will be handled separately as it's not part of BusinessRegistrationDto
    // Initialize schedule with business ID
    if (business.basicInfo.businessID) {
      this.initializeScheduleWithBusinessId(business.basicInfo.businessID);
    }
  }

  /**
   * Initialize schedule with business ID
   */
  private initializeScheduleWithBusinessId(businessId: string): void {
    if (businessId && this.cyclesArray.length > 0) {
      // Update the first cycle with the business ID
      const firstCycle = this.cyclesArray.at(0);
      firstCycle.patchValue({
        businessId: businessId
      });

      // Update all days in the first cycle
      const daysArray = firstCycle.get('days') as FormArray;
      for (let i = 0; i < daysArray.length; i++) {
        const day = daysArray.at(i);
        day.patchValue({
          businessId: businessId
        });

        // Update all opening periods in this day
        const periodsArray = day.get('openingPeriods') as FormArray;
        for (let j = 0; j < periodsArray.length; j++) {
          const period = periodsArray.at(j);
          period.patchValue({
            businessId: businessId
          });
        }
      }
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
      this.toastService.warning('Please fill in all required fields', 'Validation Error');
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
        
        this.toastService.success('Business updated successfully', 'Success');
        this.isUpdating = false;
        
        // Navigate back to manage businesses
        this.router.navigate(['/business/manage']);
      },
      error: (error) => {
        console.error('Error updating business:', error);
        this.isUpdating = false;
        
        if (error.status === 401) {
          this.toastService.error('Authentication failed. Please sign in again.', 'Authentication Error');
        } else if (error.status === 403) {
          this.toastService.error('You don\'t have permission to update this business.', 'Permission Denied');
        } else {
          this.toastService.error('Error updating business. Please try again.', 'Update Error');
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

  get cyclesArray(): FormArray {
    return this.scheduleForm.get('cycles') as FormArray;
  }

  get exceptionsArray(): FormArray {
    return this.scheduleForm.get('exceptions') as FormArray;
  }

  // Service management
  addService(service?: any): void {
    const serviceGroup = this.fb.group({
      serviceName: [service?.serviceName || '', Validators.required],
      serviceDescription: [service?.serviceDescription || ''],
      price: [service?.price || 0],
      currency: [service?.currency || 'USD'],
      duration: [service?.duration || 60]
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
      isActive: [staff?.isActive || true]
    });
    this.staffArray.push(staffGroup);
  }

  removeStaffMember(index: number): void {
    this.staffArray.removeAt(index);
  }

  // Schedule management
  addCycle(cycle?: ScheduleCycle): void {
    const cycleId = cycle?.cycleId || this.generateCycleId();
    const cycleGroup = this.fb.group({
      businessId: [cycle?.businessId || ''],
      cycleId: [cycleId, Validators.required],
      startDate: [cycle?.startDate || '', Validators.required],
      endDate: [cycle?.endDate || '', Validators.required],
      days: this.fb.array([]),
      isActive: [cycle?.isActive || true]
    });
    this.cyclesArray.push(cycleGroup);
  }

  removeCycle(index: number): void {
    this.cyclesArray.removeAt(index);
  }

  addDaySchedule(cycleIndex: number, daySchedule?: DaySchedule): void {
    const cycle = this.cyclesArray.at(cycleIndex);
    const daysArray = cycle.get('days') as FormArray;
    const cycleId = cycle.get('cycleId')?.value || 0;
    
    const dayGroup = this.fb.group({
      businessId: [daySchedule?.businessId || ''],
      cycleId: [cycleId, Validators.required],
      day: [daySchedule?.day || DayOfWeekEnum.Monday, Validators.required],
      availabilityStatus: [daySchedule?.availabilityStatus || DayAvailabilityStatus.SpecificHours, Validators.required],
      openingPeriods: this.fb.array([])
    });
    
    daysArray.push(dayGroup);

    // Add default opening period if provided or if it's a new day
    if (daySchedule?.openingPeriods && daySchedule.openingPeriods.length > 0) {
      daySchedule.openingPeriods.forEach(period => {
        this.addOpeningPeriod(cycleIndex, daysArray.length - 1, period);
      });
    } else {
      // Add a default opening period
      this.addOpeningPeriod(cycleIndex, daysArray.length - 1);
    }
  }

  removeDaySchedule(cycleIndex: number, dayIndex: number): void {
    const cycle = this.cyclesArray.at(cycleIndex);
    const daysArray = cycle.get('days') as FormArray;
    daysArray.removeAt(dayIndex);
  }

  addOpeningPeriod(cycleIndex: number, dayIndex: number, period?: OpeningPeriod): void {
    const cycle = this.cyclesArray.at(cycleIndex);
    const daysArray = cycle.get('days') as FormArray;
    const day = daysArray.at(dayIndex);
    const periodsArray = day.get('openingPeriods') as FormArray;
    const cycleId = cycle.get('cycleId')?.value || 0;
    const dayValue = day.get('day')?.value || DayOfWeekEnum.Monday;
    
    const periodGroup = this.fb.group({
      businessId: [period?.businessId || ''],
      cycleId: [cycleId, Validators.required],
      day: [dayValue, Validators.required],
      openingTime: [period?.openingTime || '09:00:00', Validators.required],
      closingTime: [period?.closingTime || '17:00:00', Validators.required]
    });
    
    periodsArray.push(periodGroup);
  }

  removeOpeningPeriod(cycleIndex: number, dayIndex: number, periodIndex: number): void {
    const cycle = this.cyclesArray.at(cycleIndex);
    const daysArray = cycle.get('days') as FormArray;
    const day = daysArray.at(dayIndex);
    const periodsArray = day.get('openingPeriods') as FormArray;
    periodsArray.removeAt(periodIndex);
  }

  addException(exception?: ScheduleException): void {
    const exceptionGroup = this.fb.group({
      businessId: [exception?.businessId || ''],
      exceptionDate: [exception?.exceptionDate || '', Validators.required],
      endDate: [exception?.endDate || ''],
      reason: [exception?.reason || '', Validators.required],
      exceptionType: [exception?.exceptionType || ExceptionType.Holiday, Validators.required],
      availabilityStatus: [exception?.availabilityStatus || DayAvailabilityStatus.Unavailable, Validators.required],
      specialHours: this.fb.array([]),
      isClosed: [exception?.isClosed || true],
      timeZone: [exception?.timeZone || ''],
      recurrencePattern: [exception?.recurrencePattern || RecurrencePattern.None, Validators.required],
      recurrenceInterval: [exception?.recurrenceInterval || 1],
      recurrenceRule: [exception?.recurrenceRule || ''],
      isActive: [exception?.isActive || true],
      notes: [exception?.notes || '']
    });
    this.exceptionsArray.push(exceptionGroup);
  }

  removeException(index: number): void {
    this.exceptionsArray.removeAt(index);
  }

  // Helper methods
  private generateCycleId(): number {
    return Math.floor(Date.now() / 1000); // Return integer timestamp
  }

  getDayOfWeekName(day: number): string {
    return DayOfWeekEnum[day];
  }

  getScheduleCycleTypeName(type: number): string {
    return ScheduleCycleType[type];
  }

  getDayAvailabilityStatusName(status: number): string {
    return DayAvailabilityStatus[status];
  }

  getExceptionTypeName(type: number): string {
    return ExceptionType[type];
  }

  getRecurrencePatternName(pattern: number): string {
    return RecurrencePattern[pattern];
  }

  // Template helper methods
  getDaysArray(cycle: any): any[] {
    const daysControl = cycle.get('days');
    return daysControl ? (daysControl as FormArray).controls : [];
  }

  getPeriodsArray(day: any): any[] {
    const periodsControl = day.get('openingPeriods');
    return periodsControl ? (periodsControl as FormArray).controls : [];
  }

  // Save schedule
  saveSchedule(): void {
    if (this.scheduleForm.invalid || !this.business) {
      this.toastService.warning('Please fill in all required schedule fields', 'Validation Error');
      return;
    }

    // Get business ID from route parameter first, then fall back to business object
    const routeBusinessId = this.route.snapshot.paramMap.get('id');
    const businessId = routeBusinessId || this.business.basicInfo.businessID;
    
    if (!businessId) {
      this.toastService.error('Business ID not found', 'Error');
      return;
    }

    console.log('Business object:', this.business);
    console.log('Business basicInfo:', this.business.basicInfo);
    console.log('Business ID from basicInfo:', this.business.basicInfo.businessID);
    console.log('Route business ID:', routeBusinessId);
    console.log('Final business ID to use:', businessId);
    console.log('Business ID type:', typeof businessId);
    console.log('Business ID length:', businessId?.length);

    const formValue = this.scheduleForm.value;
    const schedule: BusinessSchedule = {
      businessId: businessId,
      cycleType: formValue.cycleType,
      cycleLengthInDays: formValue.cycleLengthInDays,
      cycleStartDate: formValue.cycleStartDate,
      cycles: formValue.cycles.map((cycle: any) => ({
        ...cycle,
        businessId: businessId,
        days: cycle.days.map((day: any) => ({
          ...day,
          businessId: businessId,
          openingPeriods: day.openingPeriods.map((period: any) => ({
            ...period,
            businessId: businessId
          }))
        }))
      })),
      exceptions: formValue.exceptions.map((exception: any) => ({
        ...exception,
        businessId: businessId
      }))
    };

    console.log('Saving schedule with businessId:', businessId);
    console.log('Business ID type:', typeof businessId);
    console.log('Business ID length:', businessId?.length);
    console.log('Schedule data:', schedule);
    console.log('Form value:', formValue);
    console.log('Cycles data:', formValue.cycles);
    console.log('First cycle:', formValue.cycles[0]);
    console.log('First cycle ID type:', typeof formValue.cycles[0]?.cycleId);

    this.isUpdating = true;
    this.registerBusinessService.registerBusinessSchedule(businessId, schedule).subscribe({
      next: (response) => {
        console.log('Schedule saved successfully:', response);
        this.toastService.success(response.message || 'Schedule saved successfully!', 'Success');
        this.businessSchedule = schedule;
        this.isUpdating = false;
      },
      error: (error) => {
        console.error('Error saving schedule:', error);
        this.toastService.error(error.message || 'Error saving schedule', 'Save Error');
        this.isUpdating = false;
      }
    });
  }

  /**
   * Initialize the schedule form with default values
   */
  private initializeDefaultSchedule(): void {
    // Add a default cycle
    const defaultCycleId = this.generateCycleId();
    this.addCycle({
      cycleId: defaultCycleId,
      businessId: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year from now
      days: [],
      isActive: true
    });

    // Add default days for the first cycle
    const defaultDays = [
      DayOfWeekEnum.Monday,
      DayOfWeekEnum.Tuesday,
      DayOfWeekEnum.Wednesday,
      DayOfWeekEnum.Thursday,
      DayOfWeekEnum.Friday
    ];

    defaultDays.forEach(day => {
      this.addDaySchedule(0, {
        businessId: '',
        cycleId: defaultCycleId,
        day: day,
        availabilityStatus: DayAvailabilityStatus.SpecificHours,
        openingPeriods: [{
          id: 1,
          businessId: '',
          cycleId: defaultCycleId,
          day: day,
          openingTime: '09:00:00',
          closingTime: '17:00:00'
        }]
      });
    });
  }
} 