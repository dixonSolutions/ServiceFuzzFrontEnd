import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { RegisterBusinessService } from '../services/register-business.service';
import { DataSvrService } from '../services/data-svr.service';
import { 
  CreateStripeAccountRequest, 
  StripeAccountResponse,
  StripeAccountCreationState,
  CountryOption,
  STRIPE_SUPPORTED_COUNTRIES
} from '../models/stripe-account.model';

@Component({
  selector: 'app-stripe-account-setup',
  standalone: false,
  templateUrl: './stripe-account-setup.component.html',
  styleUrls: ['./stripe-account-setup.component.css']
})
export class StripeAccountSetupComponent implements OnInit, OnDestroy {
  @Input() businessEmail?: string;
  @Input() businessName?: string;
  @Output() stripeAccountCreated = new EventEmitter<StripeAccountResponse>();
  @Output() skipStripeSetup = new EventEmitter<void>();

  stripeForm: FormGroup;
  countries: CountryOption[] = STRIPE_SUPPORTED_COUNTRIES;
  filteredCountries: CountryOption[] = [];
  
  // State management
  stripeState: StripeAccountCreationState = {
    isCreating: false,
    isCreated: false,
    error: null,
    response: null
  };

  // UI State
  showCountryDropdown = false;
  selectedCountry: CountryOption | null = null;
  showOnboardingIframe = false;

  private subscription = new Subscription();

  constructor(
    private fb: FormBuilder,
    private registerService: RegisterBusinessService,
    private dataService: DataSvrService,
    private domSanitizer: DomSanitizer
  ) {
    this.stripeForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      country: ['US', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.filteredCountries = [...this.countries];
    
    // Auto-populate email if provided
    if (this.businessEmail) {
      this.stripeForm.patchValue({ email: this.businessEmail });
    }

    // Default to US
    this.selectedCountry = this.countries.find(c => c.code === 'US') || this.countries[0];
    this.stripeForm.patchValue({ country: this.selectedCountry.code });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }



  onCountrySearch(event: any): void {
    const query = event.query.toLowerCase();
    this.filteredCountries = this.countries.filter(country =>
      country.name.toLowerCase().includes(query) ||
      country.code.toLowerCase().includes(query)
    );
  }

  onCountrySelect(country: CountryOption): void {
    this.selectedCountry = country;
    this.stripeForm.patchValue({ country: country.code });
  }

  createStripeAccount(): void {
    if (this.stripeForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.stripeState.isCreating = true;
    this.stripeState.error = null;

    const formValue = this.stripeForm.value;
    
    const createSub = this.registerService.createStripeAccountForCurrentBusiness(
      formValue.email,
      formValue.country
    ).subscribe({
      next: (response: StripeAccountResponse) => {
        console.log('Stripe account created successfully:', response);
        
        this.stripeState.isCreating = false;
        this.stripeState.isCreated = true;
        this.stripeState.response = response;
        
        // Show success message
        this.dataService.openSnackBar(
          'Stripe account created successfully! Complete your onboarding to start accepting payments.',
          'Close',
          5000
        );

        // Don't emit success event yet - wait for onboarding completion or dismissal
        // this.stripeAccountCreated.emit(response);
      },
      error: (error: Error) => {
        console.error('Stripe account creation failed:', error);
        
        this.stripeState.isCreating = false;
        this.stripeState.error = error.message;
        
        // Show error message
        this.dataService.openSnackBar(
          `Failed to create Stripe account: ${error.message}`,
          'Close',
          5000
        );
      }
    });

    this.subscription.add(createSub);
  }

  completeOnboarding(): void {
    if (this.stripeState.response?.onboardingUrl) {
      // Show iframe instead of opening new tab
      this.showOnboardingIframe = true;
      
      this.dataService.openSnackBar(
        'Complete your Stripe onboarding below. The process is secure and handled directly by Stripe.',
        'Close',
        5000
      );
    }
  }

  closeOnboardingIframe(): void {
    this.showOnboardingIframe = false;
    this.dataService.openSnackBar(
      'Onboarding closed. You can complete it later if needed.',
      'Close',
      3000
    );
    
    // Emit success event even if onboarding is closed - account is created
    if (this.stripeState.response) {
      this.stripeAccountCreated.emit(this.stripeState.response);
    }
  }

  onOnboardingComplete(): void {
    this.showOnboardingIframe = false;
    this.dataService.openSnackBar(
      'Stripe onboarding completed successfully! You can now accept payments.',
      'Close',
      5000
    );
    
    // Emit success event after onboarding is complete
    if (this.stripeState.response) {
      this.stripeAccountCreated.emit(this.stripeState.response);
    }
  }

  onIframeLoad(): void {
    console.log('Stripe onboarding iframe loaded successfully');
  }

  getSafeOnboardingUrl(): SafeResourceUrl | null {
    if (this.stripeState.response?.onboardingUrl) {
      return this.domSanitizer.bypassSecurityTrustResourceUrl(this.stripeState.response.onboardingUrl);
    }
    return null;
  }

  skipSetup(): void {
    // If account is already created but onboarding is skipped, still emit success
    if (this.stripeState.isCreated && this.stripeState.response) {
      this.stripeAccountCreated.emit(this.stripeState.response);
    } else {
      // If no account created yet, emit skip event
      this.skipStripeSetup.emit();
    }
  }

  resetForm(): void {
    this.stripeForm.reset();
    this.stripeState = {
      isCreating: false,
      isCreated: false,
      error: null,
      response: null
    };
    this.selectedCountry = this.countries.find(c => c.code === 'US') || this.countries[0];
    this.stripeForm.patchValue({ country: this.selectedCountry.code });
    
    if (this.businessEmail) {
      this.stripeForm.patchValue({ email: this.businessEmail });
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.stripeForm.controls).forEach(key => {
      const control = this.stripeForm.get(key);
      control?.markAsTouched();
    });
  }

  // Getter methods for template
  get emailControl() {
    return this.stripeForm.get('email');
  }

  get countryControl() {
    return this.stripeForm.get('country');
  }

  get isFormValid(): boolean {
    return this.stripeForm.valid;
  }

  get canCreateAccount(): boolean {
    return this.isFormValid && !this.stripeState.isCreating && !this.stripeState.isCreated;
  }

  get showSuccess(): boolean {
    return this.stripeState.isCreated && !!this.stripeState.response;
  }

  get showError(): boolean {
    return !!this.stripeState.error;
  }

  getCountryByCode(code: string): CountryOption | undefined {
    return this.countries.find(country => country.code === code);
  }
} 