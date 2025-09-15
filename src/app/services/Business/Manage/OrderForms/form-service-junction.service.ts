import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { FormServiceJunction, FormService } from '../models/custom-order-forms.model';

export interface BusinessService {
  serviceId: string;
  serviceName: string;
  description?: string;
  isActive: boolean;
  category?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FormServiceJunctionService {
  private readonly API_BASE = '/api/form-service-junction';

  constructor(private http: HttpClient) {}

  /**
   * Get all services for a business
   */
  getBusinessServices(businessId: string): Observable<BusinessService[]> {
    return this.http.get<BusinessService[]>(`${this.API_BASE}/${businessId}/services`)
      .pipe(
        catchError(error => {
          console.error('Error loading business services:', error);
          return of(this.getMockServices());
        })
      );
  }

  /**
   * Get forms associated with a specific service
   */
  getServiceForms(businessId: string, serviceId: string): Observable<string[]> {
    return this.http.get<{ formIds: string[] }>(`${this.API_BASE}/${businessId}/services/${serviceId}/forms`)
      .pipe(
        map(response => response.formIds),
        catchError(error => {
          console.error('Error loading service forms:', error);
          return of([]);
        })
      );
  }

  /**
   * Get services associated with a specific form
   */
  getFormServices(businessId: string, formId: string): Observable<BusinessService[]> {
    return this.http.get<BusinessService[]>(`${this.API_BASE}/${businessId}/forms/${formId}/services`)
      .pipe(
        catchError(error => {
          console.error('Error loading form services:', error);
          return of([]);
        })
      );
  }

  /**
   * Associate a form with multiple services
   */
  associateFormWithServices(businessId: string, formId: string, serviceIds: string[]): Observable<boolean> {
    const payload = {
      formId,
      serviceIds
    };

    return this.http.post(`${this.API_BASE}/${businessId}/associate`, payload)
      .pipe(
        map(() => true),
        catchError(error => {
          console.error('Error associating form with services:', error);
          return of(false);
        })
      );
  }

  /**
   * Remove form association from specific services
   */
  disassociateFormFromServices(businessId: string, formId: string, serviceIds: string[]): Observable<boolean> {
    const payload = {
      formId,
      serviceIds
    };

    return this.http.post(`${this.API_BASE}/${businessId}/disassociate`, payload)
      .pipe(
        map(() => true),
        catchError(error => {
          console.error('Error disassociating form from services:', error);
          return of(false);
        })
      );
  }

  /**
   * Update all service associations for a form (replaces existing associations)
   */
  updateFormServiceAssociations(businessId: string, formId: string, serviceIds: string[]): Observable<boolean> {
    const payload = {
      formId,
      serviceIds
    };

    return this.http.put(`${this.API_BASE}/${businessId}/forms/${formId}/services`, payload)
      .pipe(
        map(() => true),
        catchError(error => {
          console.error('Error updating form service associations:', error);
          return of(false);
        })
      );
  }

  /**
   * Get junction data for all forms and services in a business
   */
  getBusinessJunctionData(businessId: string): Observable<FormServiceJunction[]> {
    return this.http.get<FormServiceJunction[]>(`${this.API_BASE}/${businessId}/junction`)
      .pipe(
        catchError(error => {
          console.error('Error loading business junction data:', error);
          return of([]);
        })
      );
  }

  /**
   * Bulk update junction associations
   */
  bulkUpdateAssociations(businessId: string, associations: FormServiceJunction[]): Observable<boolean> {
    return this.http.put(`${this.API_BASE}/${businessId}/bulk-update`, { associations })
      .pipe(
        map(() => true),
        catchError(error => {
          console.error('Error bulk updating associations:', error);
          return of(false);
        })
      );
  }

  /**
   * Get forms that are not associated with any service
   */
  getUnassociatedForms(businessId: string): Observable<string[]> {
    return this.http.get<{ formIds: string[] }>(`${this.API_BASE}/${businessId}/unassociated-forms`)
      .pipe(
        map(response => response.formIds),
        catchError(error => {
          console.error('Error loading unassociated forms:', error);
          return of([]);
        })
      );
  }

  /**
   * Get services that don't have any forms associated
   */
  getServicesWithoutForms(businessId: string): Observable<BusinessService[]> {
    return this.http.get<BusinessService[]>(`${this.API_BASE}/${businessId}/services-without-forms`)
      .pipe(
        catchError(error => {
          console.error('Error loading services without forms:', error);
          return of([]);
        })
      );
  }

  /**
   * Check if a form is associated with a specific service
   */
  isFormAssociatedWithService(businessId: string, formId: string, serviceId: string): Observable<boolean> {
    return this.http.get<{ isAssociated: boolean }>(`${this.API_BASE}/${businessId}/forms/${formId}/services/${serviceId}/check`)
      .pipe(
        map(response => response.isAssociated),
        catchError(error => {
          console.error('Error checking form service association:', error);
          return of(false);
        })
      );
  }

  /**
   * Get association statistics for a business
   */
  getAssociationStats(businessId: string): Observable<{
    totalForms: number;
    totalServices: number;
    formsWithServices: number;
    servicesWithForms: number;
    unassociatedForms: number;
    servicesWithoutForms: number;
  }> {
    return this.http.get<any>(`${this.API_BASE}/${businessId}/stats`)
      .pipe(
        catchError(error => {
          console.error('Error loading association stats:', error);
          return of({
            totalForms: 0,
            totalServices: 0,
            formsWithServices: 0,
            servicesWithForms: 0,
            unassociatedForms: 0,
            servicesWithoutForms: 0
          });
        })
      );
  }

  /**
   * Mock services for development
   */
  private getMockServices(): BusinessService[] {
    return [
      {
        serviceId: 'service-001',
        serviceName: 'Restaurant Delivery',
        description: 'Food delivery service',
        isActive: true,
        category: 'food'
      },
      {
        serviceId: 'service-002',
        serviceName: 'Catering Service',
        description: 'Event catering and planning',
        isActive: true,
        category: 'food'
      },
      {
        serviceId: 'service-003',
        serviceName: 'Home Cleaning',
        description: 'Professional home cleaning service',
        isActive: true,
        category: 'home'
      },
      {
        serviceId: 'service-004',
        serviceName: 'Consultation',
        description: 'Business consultation services',
        isActive: true,
        category: 'professional'
      },
      {
        serviceId: 'service-005',
        serviceName: 'Equipment Rental',
        description: 'Tools and equipment rental',
        isActive: false,
        category: 'rental'
      }
    ];
  }

  /**
   * Create a service-form association matrix for easy management
   */
  createAssociationMatrix(forms: { formId: string; formName: string }[], services: BusinessService[], associations: FormServiceJunction[]): {
    forms: { formId: string; formName: string }[];
    services: BusinessService[];
    matrix: boolean[][];
  } {
    const matrix: boolean[][] = [];
    
    forms.forEach((form, formIndex) => {
      matrix[formIndex] = [];
      services.forEach((service, serviceIndex) => {
        const junction = associations.find(assoc => assoc.formId === form.formId);
        const isAssociated = junction?.services.some(s => s.serviceId === service.serviceId && s.isActive) || false;
        matrix[formIndex][serviceIndex] = isAssociated;
      });
    });

    return {
      forms,
      services,
      matrix
    };
  }

  /**
   * Convert matrix back to junction associations
   */
  matrixToAssociations(matrix: boolean[][], forms: { formId: string }[], services: BusinessService[]): FormServiceJunction[] {
    const associations: FormServiceJunction[] = [];

    matrix.forEach((row, formIndex) => {
      const associatedServices: FormService[] = [];
      
      row.forEach((isAssociated, serviceIndex) => {
        if (isAssociated) {
          associatedServices.push({
            serviceId: services[serviceIndex].serviceId,
            serviceName: services[serviceIndex].serviceName,
            isActive: true
          });
        }
      });

      if (associatedServices.length > 0) {
        associations.push({
          formId: forms[formIndex].formId,
          services: associatedServices
        });
      }
    });

    return associations;
  }
}