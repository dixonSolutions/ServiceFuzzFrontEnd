import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import { BusinessRegistration } from '../models/business-registration';
import { BusinessBasicInfo } from '../models/businessbasicinfo';
import { ServicesForBusiness } from '../models/services-for-business';
import { BusinessPlace } from '../models/business-place';
import { BusinessSpecificAdr } from '../models/business-specific-adr';
import { S2CareaSpecification } from '../models/s2c-area-specification';
import { 
  BusinessRegistrationDto, 
  BusinessBasicInfoDto, 
  ServicesForBusinessDto, 
  BusinessSpecificAdrDto, 
  S2CareaSpecificationDto,
  ServiceToPlaceAssignmentDto,
  StaffMemberDto
} from '../models/business-registration-dto';
import { DataSvrService } from './data-svr.service';

export interface RegisterBusinessResponse {
  success: boolean;
  message?: string;
  errors?: string[];
  businessId?: string;
}

@Injectable({
    providedIn: 'root'
  })
  export class RegisterBusinessService {
    private apiUrl = 'https://servicefuzzapi-atf8b4dqawc8dsa9.australiaeast-01.azurewebsites.net';

    constructor(private http: HttpClient, private dataSvr: DataSvrService) {}

    registerBusiness(business: BusinessRegistration): Observable<any> {
        return this.http.post(`${this.apiUrl}/api/business/register`, business);
    }

    /**
     * Register a complete business using the RegisterCompleteBusiness endpoint
     * This method gets data from DataSvrService and transforms it for the API
     */
    registerCompleteBusiness(locationType: 'specific' | 'area' | 'both' = 'both'): Observable<RegisterBusinessResponse> {
      const currentBusiness = this.dataSvr.currentBusinessRegistration;
      const jwtToken = this.dataSvr.jwtToken;

      if (!jwtToken) {
        return throwError(() => new Error('Authentication required. Please log in.'));
      }

      // Transform current business data to DTO format
      const dto = this.transformToDto(currentBusiness, locationType);

      // Validate the DTO
      const validationError = this.validateDto(dto);
      if (validationError) {
        return throwError(() => new Error(validationError));
      }

      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
        'Accept': 'application/json'
      });

      return this.http.post<RegisterBusinessResponse>(
        `${this.apiUrl}/api/BusinessRegistry/RegisterCompleteBusiness`,
        dto,
        { headers }
      ).pipe(
        map(response => ({
          ...response,
          success: response.success !== undefined ? response.success : true,
          message: response.message || 'Business registered successfully!'
        })),
        catchError(error => {
          console.error('Registration error:', error);
          let errorMessage = 'Registration failed. Please try again.';
          let errors: string[] = [];

          if (error.error) {
            if (error.error.message) {
              errorMessage = error.error.message;
            }
            if (error.error.errors && Array.isArray(error.error.errors)) {
              errors = error.error.errors;
            }
          }

          return throwError(() => ({
            success: false,
            message: errorMessage,
            errors: errors
          }));
        })
      );
    }

    /**
     * Transform BusinessRegistration to BusinessRegistrationDto
     */
    private transformToDto(business: BusinessRegistration, locationType: 'specific' | 'area' | 'both'): BusinessRegistrationDto {
      // Transform basic info
      const basicInfoDto: BusinessBasicInfoDto = {
        businessName: business.basicInfo.bussinessName || '',
        businessDescription: business.basicInfo.bussinessDescription || '',
        phone: business.basicInfo.bussinessPhone || '',
        email: business.basicInfo.bussinessEmail || '',
        ownerEmail: business.basicInfo.ownerEmail || this.dataSvr.currentUser?.email
      };

      // Transform services
      const servicesDto: ServicesForBusinessDto[] = business.services.map(service => ({
        serviceName: service.serviceName || '',
        serviceDescription: service.serviceDescription || '',
        duration: service.duration || 30,
        price: service.servicePrice || 0,
        currency: service.servicePriceCurrencyUnit || 'USD',
        serviceImageUrl: service.serviceImageUrl
      }));

      // Get specific addresses and area specifications from the component data
      const specificAddresses: BusinessSpecificAdrDto[] = [];
      const areaSpecifications: S2CareaSpecificationDto[] = [];

      console.log('Transform DTO - Location type:', locationType);
      console.log('Transform DTO - Business places:', business.places);

      // Transform places based on location type
      if (locationType === 'specific' || locationType === 'both') {
        // Add specific addresses from places
        business.places.forEach(place => {
          console.log('Processing place for specific address:', place);
          if (place.placeAddress && place.placeCity && place.placeState && place.placeCountry) {
            const specificAddress = {
              streetAddress: place.placeAddress,
              city: place.placeCity,
              state: place.placeState,
              country: place.placeCountry,
              postalCode: place.placeZipCode || ''
            };
            console.log('Adding specific address:', specificAddress);
            specificAddresses.push(specificAddress);
          } else {
            console.log('Place does not meet specific address criteria:', {
              hasAddress: !!place.placeAddress,
              hasCity: !!place.placeCity,
              hasState: !!place.placeState,
              hasCountry: !!place.placeCountry
            });
          }
        });
      }

      if (locationType === 'area' || locationType === 'both') {
        // Add area specifications from places
        business.places.forEach(place => {
          console.log('Processing place for area specification:', place);
          if (place.placeCountry && !place.placeAddress) {
            const areaSpec = {
              country: place.placeCountry,
              state: place.placeState,
              city: place.placeCity,
              postalCode: place.placeZipCode
            };
            console.log('Adding area specification:', areaSpec);
            areaSpecifications.push(areaSpec);
          } else {
            console.log('Place does not meet area specification criteria:', {
              hasCountry: !!place.placeCountry,
              hasNoAddress: !place.placeAddress
            });
          }
        });
      }

      // Transform service assignments using the new junction table
      const servicePlaceAssignments: ServiceToPlaceAssignmentDto[] = business.serviceAssignments.map(assignment => ({
        serviceID: assignment.serviceID,
        placeID: assignment.placeId,
        serviceType: assignment.serviceType || 'standard'
      }));

      // Transform staff data if present
      const staffDto: StaffMemberDto[] = [];
      if (business.operationType === 'with_staff' && business.staff) {
        business.staff.forEach(staff => {
          staffDto.push({
            firstName: staff.firstName,
            lastName: staff.lastName,
            email: staff.email,
            role: staff.role,
            accessAll: staff.accessAll,
            isActive: staff.isActive
          });
        });
      }

      const dto = {
        basicInfo: basicInfoDto,
        services: servicesDto,
        specificAddresses: specificAddresses,
        areaSpecifications: areaSpecifications,
        unifiedPlaces: [], // Not using unified places for now
        servicePlaceAssignments: servicePlaceAssignments,
        operationType: business.operationType || 'solo',
        staff: business.operationType === 'with_staff' ? staffDto : undefined
      };

      console.log('Final DTO:', dto);
      console.log('DTO has specific addresses:', dto.specificAddresses.length);
      console.log('DTO has area specifications:', dto.areaSpecifications.length);

      return dto;
    }

    /**
     * Validate the DTO before sending to API
     */
    private validateDto(dto: BusinessRegistrationDto): string | null {
      // Basic info validation
      if (!dto.basicInfo.businessName || dto.basicInfo.businessName.length < 2) {
        return 'Business name must be at least 2 characters long.';
      }
      if (!dto.basicInfo.businessDescription || dto.basicInfo.businessDescription.length < 10) {
        return 'Business description must be at least 10 characters long.';
      }
      if (!dto.basicInfo.phone || !/^[0-9+ -]{8,}$/.test(dto.basicInfo.phone)) {
        return 'Please provide a valid phone number.';
      }
      if (!dto.basicInfo.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dto.basicInfo.email)) {
        return 'Please provide a valid email address.';
      }

      // Services validation
      if (!dto.services || dto.services.length === 0) {
        return 'At least one service is required.';
      }

      for (const service of dto.services) {
        if (!service.serviceName) {
          return 'All services must have a name.';
        }
        if (!service.serviceDescription) {
          return 'All services must have a description.';
        }
        if (!service.duration || service.duration < 5) {
          return 'Service duration must be at least 5 minutes.';
        }
        if (service.price === undefined || service.price < 0) {
          return 'Service price must be 0 or greater.';
        }
        if (!service.currency || !['USD', 'EUR', 'GBP', 'AUD', 'CAD'].includes(service.currency)) {
          return 'Please select a valid currency for all services.';
        }
      }

      // Location validation - at least one type required
      const hasSpecificAddresses = dto.specificAddresses && dto.specificAddresses.length > 0;
      const hasAreaSpecifications = dto.areaSpecifications && dto.areaSpecifications.length > 0;
      const hasUnifiedPlaces = dto.unifiedPlaces && dto.unifiedPlaces.length > 0;

      if (!hasSpecificAddresses && !hasAreaSpecifications && !hasUnifiedPlaces) {
        return 'At least one location type is required (specific address, area specification, or unified place).';
      }

      // Validate specific addresses
      if (hasSpecificAddresses) {
        for (const address of dto.specificAddresses) {
          if (!address.streetAddress || !address.city || !address.state || !address.country) {
            return 'Street address, city, state, and country are required for specific addresses.';
          }
          if (!['USA', 'Canada', 'UK', 'Australia'].includes(address.country)) {
            return 'Country must be one of: USA, Canada, UK, Australia.';
          }
        }
      }

      // Validate area specifications
      if (hasAreaSpecifications) {
        for (const area of dto.areaSpecifications) {
          if (!area.country) {
            return 'Country is required for area specifications.';
          }
          if (!['USA', 'Canada', 'UK', 'Australia'].includes(area.country)) {
            return 'Country must be one of: USA, Canada, UK, Australia.';
          }
        }
      }

      return null; // No validation errors
    }

    /**
     * Get location type options for the form
     */
    getLocationTypeOptions() {
      return [
        {
          value: 'specific',
          label: 'Physical Business Location',
          description: 'I have a physical store/office where customers visit'
        },
        {
          value: 'area',
          label: 'Service Area Coverage',
          description: 'I provide services to customers in specific areas/cities'
        },
        {
          value: 'both',
          label: 'Both Physical Location and Service Areas',
          description: 'I have a physical location AND provide services in other areas'
        }
      ];
    }

    /**
     * Get supported currencies
     */
    getSupportedCurrencies(): string[] {
      return ['USD', 'EUR', 'GBP', 'AUD', 'CAD'];
    }

    /**
     * Get supported countries
     */
    getSupportedCountries(): string[] {
      return ['USA', 'Canada', 'UK', 'Australia'];
    }
  }