import { BusinessBasicInfo } from './businessbasicinfo';
import { ServicesForBusiness } from './services-for-business';
import { BusinessPlace } from './business-place';

export interface BusinessRegistration {
  basicInfo: BusinessBasicInfo;
  services: ServicesForBusiness[];
  places: BusinessPlace[];
  serviceAssignments: BusinessPlaceAndServicesJunction[];
  currentStep: number;
  isCompleted: boolean;
}

export interface BusinessPlaceAndServicesJunction {
  businessID?: string;
  serviceID?: string;
  placeId?: string;
  serviceType?: string;
} 