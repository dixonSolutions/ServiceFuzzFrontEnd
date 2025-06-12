import { BusinessBasicInfo } from './businessbasicinfo';
import { ServicesForBusiness } from './services-for-business';
import { BusinessPlace } from './business-place';

export interface BusinessRegistration {
  basicInfo: BusinessBasicInfo;
  services: ServicesForBusiness[];
  places: BusinessPlace[];
  currentStep: number;
  isCompleted: boolean;
}

export interface ServicePlaceAssignment {
  serviceID: string;
  placeID: string;
  isAssigned: boolean;
} 