import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ManageBusinessesService } from './manage-businesses.service';
import { DataSvrService } from '../../Other/data-svr.service';
import { BusinessRegistrationDto } from '../models/business-registration-dto';

describe('ManageBusinessesService', () => {
  let service: ManageBusinessesService;
  let httpMock: HttpTestingController;
  let dataSvrService: jasmine.SpyObj<DataSvrService>;

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

  beforeEach(() => {
    const dataSvrSpy = jasmine.createSpyObj('DataSvrService', [], {
      jwtToken: 'mock-jwt-token',
      currentUser: { userID: 'test-user-id' }
    });

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ManageBusinessesService,
        { provide: DataSvrService, useValue: dataSvrSpy }
      ]
    });

    service = TestBed.inject(ManageBusinessesService);
    httpMock = TestBed.inject(HttpTestingController);
    dataSvrService = TestBed.inject(DataSvrService) as jasmine.SpyObj<DataSvrService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('updateBusiness', () => {
    it('should make PUT request to update business', () => {
      const expectedUrl = 'https://servicefuzzapi-atf8b4dqawc8dsa9.australiaeast-01.azurewebsites.net/api/ManagesBusinesses/UpdateBusiness';
      
      service.updateBusiness(mockBusiness).subscribe(response => {
        expect(response).toBeTruthy();
      });

      const req = httpMock.expectOne(expectedUrl);
      expect(req.request.method).toBe('PUT');
      expect(req.request.headers.get('Authorization')).toBe('Bearer mock-jwt-token');
      expect(req.request.headers.get('Content-Type')).toBe('application/json');
      expect(req.request.body).toEqual(mockBusiness);

      req.flush({ success: true });
    });

    it('should throw error when JWT token is not available', () => {
      // Override the jwtToken property
      Object.defineProperty(dataSvrService, 'jwtToken', {
        get: () => null
      });

      expect(() => {
        service.updateBusiness(mockBusiness).subscribe();
      }).toThrowError('No JWT token available. User may not be authenticated.');
    });

    it('should handle server errors', () => {
      service.updateBusiness(mockBusiness).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(500);
        }
      });

      const req = httpMock.expectOne('https://servicefuzzapi-atf8b4dqawc8dsa9.australiaeast-01.azurewebsites.net/api/ManagesBusinesses/UpdateBusiness');
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('should handle 401 unauthorized errors', () => {
      service.updateBusiness(mockBusiness).subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(401);
        }
      });

      const req = httpMock.expectOne('https://servicefuzzapi-atf8b4dqawc8dsa9.australiaeast-01.azurewebsites.net/api/ManagesBusinesses/UpdateBusiness');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('businesses instance management', () => {
    it('should set and get businesses instance', () => {
      const businesses = [mockBusiness];
      
      service.setBusinessesInstance(businesses);
      expect(service.getBusinessesInstance()).toEqual(businesses);
    });

    it('should clear businesses instance', () => {
      service.setBusinessesInstance([mockBusiness]);
      service.clearBusinessesInstance();
      expect(service.getBusinessesInstance()).toEqual([]);
    });

    it('should check if businesses instance has data', () => {
      expect(service.hasBusinessesInstance()).toBe(false);
      
      service.setBusinessesInstance([mockBusiness]);
      expect(service.hasBusinessesInstance()).toBe(true);
      
      service.clearBusinessesInstance();
      expect(service.hasBusinessesInstance()).toBe(false);
    });
  });
}); 