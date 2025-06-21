// DTOs for RegisterCompleteBusiness API endpoint

export interface BusinessRegistrationDto {
  basicInfo: BusinessBasicInfoDto;
  services: ServicesForBusinessDto[];
  specificAddresses: BusinessSpecificAdrDto[];
  areaSpecifications: S2CareaSpecificationDto[];
  unifiedPlaces: BusinessPlaceDto[];
  servicePlaceAssignments: ServiceToPlaceAssignmentDto[];
  operationType: 'solo' | 'with_staff';
  staff?: StaffMemberDto[];  // optional, only when operationType is 'with_staff'
}

export interface BusinessBasicInfoDto {
  businessName: string;
  businessDescription: string;
  phone: string;
  email: string;
  businessID?: string;
  ownerEmail?: string;
}

export interface ServicesForBusinessDto {
  serviceID?: string;
  serviceName: string;
  serviceDescription: string;
  duration: number;
  price: number;
  currency: string;
  serviceImageUrl?: string;
  businessID?: string;
  serviceEstimatedTime?: string;
}

export interface BusinessSpecificAdrDto {
  streetAddress: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  placeID?: string;
  businessID?: string;
}

export interface S2CareaSpecificationDto {
  country: string;
  state?: string;
  city?: string;
  postalCode?: string;
  placeID?: string;
  businessID?: string;
}

export interface BusinessPlaceDto {
  placeID?: string;
  placeType?: string;
  businessID?: string;
  
  // For specific addresses (when placeType = "specific")
  streetAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  
  // For area specifications (when placeType = "area")
  areaCountry?: string;
  areaState?: string;
  areaCity?: string;
  areaPostalCode?: string;
}

export interface ServiceToPlaceAssignmentDto {
  businessID?: string;
  serviceID?: string;
  placeID?: string;
  serviceType?: string;
}

export interface StaffMemberDto {
  firstName: string;     // max length 2000
  lastName: string;      // max length 2000
  email: string;         // max length 2000
  role: string;
  accessAll: boolean;    // toggle for full access
  isActive: boolean;     // default to true for new staff
  businessID?: string;
} 