export interface BusinessPlace {
  placeID: string;
  placeName: string;
  placeDescription: string;
  placeAddress: string;
  placeCity: string;
  placeState: string;
  placeZipCode: string;
  placeCountry: string;
  placePhone?: string;
  placeEmail?: string;
  businessID: string;
  isActive: boolean;
  assignedServiceIDs: string[]; // Services assigned to this place
  createdAt?: Date;
  updatedAt?: Date;
} 