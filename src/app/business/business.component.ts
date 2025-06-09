import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DataSvrService } from '../services/data-svr.service';

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
  

  constructor(private fb: FormBuilder, public data: DataSvrService) {
    this.businessForm = this.fb.group({
      bussinessName: ['', [Validators.required, Validators.minLength(2)]],
      bussinessDescription: ['', [Validators.required, Validators.minLength(10)]],
      bussinessPhone: ['', [Validators.required, Validators.pattern('^[0-9+ -]{8,}$')]],
      bussinessEmail: ['', [Validators.required, Validators.email]],
      ownerEmail: [{ value: '', disabled: true }] // Will be set from current user
    });
  }

  onSubmit() {
    if (this.businessForm.valid && this.data.currentUser) {
      console.log('Form submitted:', this.businessForm.value);
      // TODO: Implement form submission logic
    }else{
      if(!this.data.currentUser){
        this.data.openSnackBar("Please sign in to continue", "Close", 3000);
      }else{
        this.data.openSnackBar("Please fill in all fields", "Close", 3000);
      }

    }
  }
}
