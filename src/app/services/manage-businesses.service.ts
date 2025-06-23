import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { BusinessRegistrationDto } from '../models/business-registration-dto';
import { DataSvrService } from './data-svr.service';

@Injectable({
  providedIn: 'root'
})
export class ManageBusinessesService {
  private apiUrl = 'https://servicefuzzapi-atf8b4dqawc8dsa9.australiaeast-01.azurewebsites.net';
  
  // Instance array to store business DTOs
  private businessesInstance: BusinessRegistrationDto[] = [];

  constructor(
    private http: HttpClient,
    private dataSvr: DataSvrService
  ) { }

  /**
   * Get all businesses for the current user
   * @returns Observable of BusinessRegistrationDto array
   */
  getAllBusinessesForUser(): Observable<BusinessRegistrationDto[]> {
    const userId = this.dataSvr.currentUser?.userID;
    
    if (!userId) {
      throw new Error('No user ID available. User may not be logged in.');
    }
    
    // Check if we already have businesses in the instance
    if (this.businessesInstance.length > 0) {
      console.log('Returning businesses from instance:', this.businessesInstance.length, 'businesses');
      return of(this.businessesInstance);
    }
    
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }
    
    const url = `${this.apiUrl}/api/ManagesBusinesses/GetAllBusinessesForUser?userId=${userId}`;
    
    return this.http.get<BusinessRegistrationDto[]>(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      }
    });
  }

  /**
   * Set the businesses instance
   * @param businesses - Array of business DTOs
   */
  setBusinessesInstance(businesses: BusinessRegistrationDto[]): void {
    this.businessesInstance = businesses;
    console.log('Businesses instance set with', businesses.length, 'businesses');
  }

  /**
   * Get the current businesses instance
   * @returns Array of business DTOs
   */
  getBusinessesInstance(): BusinessRegistrationDto[] {
    return this.businessesInstance;
  }

  /**
   * Clear the businesses instance
   */
  clearBusinessesInstance(): void {
    this.businessesInstance = [];
    console.log('Businesses instance cleared');
  }

  /**
   * Check if businesses instance has data
   * @returns boolean indicating if instance has data
   */
  hasBusinessesInstance(): boolean {
    return this.businessesInstance.length > 0;
  }

  /**
   * Delete a business by ID
   * @param businessId - The ID of the business to delete
   * @returns Observable of any response
   */
  deleteBusiness(businessId: string): Observable<any> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }
    
    const url = `${this.apiUrl}/api/ManagesBusinesses/DeleteBusiness?businessId=${businessId}`;
    
    // Debug logging
    console.log('Delete business API call:', {
      url: url,
      businessId: businessId,
      hasJwtToken: !!jwtToken
    });
    
    return this.http.delete(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      }
    });
  }

  /**
   * Update a business
   * @param business - The updated business data
   * @returns Observable of any response
   */
  updateBusiness(business: BusinessRegistrationDto): Observable<any> {
    const jwtToken = this.dataSvr.jwtToken;
    if (!jwtToken) {
      throw new Error('No JWT token available. User may not be authenticated.');
    }
    
    const url = `${this.apiUrl}/api/ManagesBusinesses/UpdateBusiness`;
    
    // Debug logging
    console.log('Update business API call:', {
      url: url,
      businessId: business.basicInfo.businessID,
      businessName: business.basicInfo.businessName,
      hasJwtToken: !!jwtToken
    });
    
    return this.http.put(url, business, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      }
    });
  }
} 