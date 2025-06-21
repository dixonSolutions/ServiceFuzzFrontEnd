import { BusinessBasicInfo } from './businessbasicinfo';
import { ServicesForBusiness } from './services-for-business';
import { BusinessPlace } from './business-place';
import { StaffMember } from './staff-member';

export interface BusinessRegistration {
  basicInfo: BusinessBasicInfo;
  services: ServicesForBusiness[];
  places: BusinessPlace[];
  serviceAssignments: BusinessPlaceAndServicesJunction[];
  currentStep: number;
  isCompleted: boolean;
  operationType: 'solo' | 'with_staff';
  staff?: StaffMember[];  // optional, only when operationType is 'with_staff'
}

export interface BusinessPlaceAndServicesJunction {
  businessID?: string;
  serviceID?: string;
  placeId?: string;
  serviceType?: string;
} 