import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { DataSvrService } from '../services/data-svr.service';
import {MatFormFieldModule} from '@angular/material/form-field';
import { ServicesForBusiness } from '../models/services-for-business';

@Component({
  selector: 'app-business',
  standalone: false,
  templateUrl: './business.component.html',
  styleUrl: './business.component.css'
})
export class BusinessComponent  {
  businessForm: FormGroup;
  isSubmitting = false;
  errorMessage: string | null = null;
  currencies: string[] = ['USD', 'EUR', 'GBP', 'AUD', 'CAD'];
  
  constructor(private fb: FormBuilder, public data: DataSvrService) {
    this.businessForm = this.fb.group({
      bussinessName: ['', [Validators.required, Validators.minLength(2)]],
      bussinessDescription: ['', [Validators.required, Validators.minLength(10)]],
      bussinessPhone: ['', [Validators.required, Validators.pattern('^[0-9+ -]{8,}$')]],
      bussinessEmail: ['', [Validators.required, Validators.email]],
      ownerEmail: [{ value: '', disabled: true }],
      services: this.fb.array([])
    });

    // Add initial service form
    this.addService();
  }

  get services() {
    return this.businessForm.get('services') as FormArray;
  }

  createServiceForm(): FormGroup {
    return this.fb.group({
      serviceName: ['', [Validators.required, Validators.minLength(2)]],
      serviceDescription: ['', [Validators.required, Validators.minLength(10)]],
      duration: [30, [Validators.required, Validators.min(5)]],
      serviceEstimatedTime: ['30 minutes', Validators.required],
      servicePrice: [0, [Validators.required, Validators.min(0)]],
      servicePriceCurrencyUnit: ['USD', [Validators.required]],
      serviceImageUrl: ['', Validators.required]
    });
  }

  addService() {
    this.services.push(this.createServiceForm());
  }

  removeService(index: number) {
    this.services.removeAt(index);
  }

  onSubmit() {
    if (this.businessForm.valid && this.data.currentUser) {
      // TODO: Implement form submission logic
      console.log(this.businessForm.value);
    } else {
      if(!this.data.currentUser) {
        this.data.openSnackBar("Please sign in to continue", "Close", 3000);
      } else {
        this.data.openSnackBar("Please fill in all fields", "Close", 3000);
      }
    }
  }

  updateEstimatedTime(index: number) {
    const serviceForm = this.services.at(index) as FormGroup;
    const duration = serviceForm.get('duration')?.value;
    if (duration) {
      serviceForm.patchValue({
        serviceEstimatedTime: `${duration} minutes`
      });
    }
  }
}
