import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { BusinessEditComponent } from './business-edit.component';
import { DataSvrService } from '../services/data-svr.service';
import { ManageBusinessesService } from '../services/manage-businesses.service';
import { BusinessRegistrationDto } from '../models/business-registration-dto';

describe('BusinessEditComponent', () => {
  let component: BusinessEditComponent;
  let fixture: ComponentFixture<BusinessEditComponent>;
  let dataSvrService: jasmine.SpyObj<DataSvrService>;
  let manageBusinessesService: jasmine.SpyObj<ManageBusinessesService>;

  const mockBusiness: BusinessRegistrationDto = {
    basicInfo: {
      businessName: 'Test Business',
      businessDescription: 'Test Description',
      phone: '+1234567890',
      email: 'test@example.com',
      businessID: 'test-id-123'
    },
    services: [
      {
        serviceName: 'Test Service',
        serviceDescription: 'Test Service Description',
        duration: 60,
        price: 100,
        currency: 'USD'
      }
    ],
    specificAddresses: [
      {
        streetAddress: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        country: 'Test Country',
        postalCode: '12345'
      }
    ],
    areaSpecifications: [],
    unifiedPlaces: [],
    servicePlaceAssignments: [],
    operationType: 'solo'
  };

  beforeEach(async () => {
    const dataSvrSpy = jasmine.createSpyObj('DataSvrService', ['openSnackBar'], {
      jwtToken: 'mock-jwt-token',
      currentUser: { userID: 'test-user-id' }
    });

    const manageBusinessesSpy = jasmine.createSpyObj('ManageBusinessesService', [
      'getBusinessesInstance',
      'getAllBusinessesForUser',
      'updateBusiness'
    ]);

    await TestBed.configureTestingModule({
      declarations: [BusinessEditComponent],
      imports: [
        ReactiveFormsModule,
        RouterTestingModule,
        HttpClientTestingModule,
        MatSnackBarModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatRadioModule,
        MatCheckboxModule,
        MatProgressSpinnerModule,
        BrowserAnimationsModule
      ],
      providers: [
        { provide: DataSvrService, useValue: dataSvrSpy },
        { provide: ManageBusinessesService, useValue: manageBusinessesSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BusinessEditComponent);
    component = fixture.componentInstance;
    dataSvrService = TestBed.inject(DataSvrService) as jasmine.SpyObj<DataSvrService>;
    manageBusinessesService = TestBed.inject(ManageBusinessesService) as jasmine.SpyObj<ManageBusinessesService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with loading state', () => {
    expect(component.isLoading).toBe(true);
    expect(component.business).toBeNull();
  });

  it('should create business form with required fields', () => {
    const form = component.businessForm;
    expect(form.get('businessName')).toBeTruthy();
    expect(form.get('email')).toBeTruthy();
    expect(form.get('services')).toBeTruthy();
    expect(form.get('specificAddresses')).toBeTruthy();
    expect(form.get('areaSpecifications')).toBeTruthy();
    expect(form.get('staff')).toBeTruthy();
    expect(form.get('operationType')).toBeTruthy();
  });

  it('should add service to form array', () => {
    const initialLength = component.servicesArray.length;
    component.addService();
    expect(component.servicesArray.length).toBe(initialLength + 1);
  });

  it('should remove service from form array', () => {
    component.addService();
    const initialLength = component.servicesArray.length;
    component.removeService(0);
    expect(component.servicesArray.length).toBe(initialLength - 1);
  });

  it('should add address to form array', () => {
    const initialLength = component.addressesArray.length;
    component.addSpecificAddress();
    expect(component.addressesArray.length).toBe(initialLength + 1);
  });

  it('should add area specification to form array', () => {
    const initialLength = component.areasArray.length;
    component.addAreaSpecification();
    expect(component.areasArray.length).toBe(initialLength + 1);
  });

  it('should add staff member to form array', () => {
    const initialLength = component.staffArray.length;
    component.addStaffMember();
    expect(component.staffArray.length).toBe(initialLength + 1);
  });

  it('should validate required fields', () => {
    const form = component.businessForm;
    expect(form.valid).toBe(false);
    
    form.patchValue({
      businessName: 'Test Business',
      email: 'test@example.com'
    });
    
    expect(form.valid).toBe(true);
  });

  it('should validate email format', () => {
    const emailControl = component.businessForm.get('email');
    emailControl?.setValue('invalid-email');
    expect(emailControl?.hasError('email')).toBe(true);
    
    emailControl?.setValue('valid@email.com');
    expect(emailControl?.hasError('email')).toBe(false);
  });
}); 