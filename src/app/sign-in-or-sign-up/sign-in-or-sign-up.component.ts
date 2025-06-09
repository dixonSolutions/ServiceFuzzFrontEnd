import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SocialAuthService, GoogleLoginProvider } from '@abacritt/angularx-social-login';
import { Router } from '@angular/router';
import { DataSvrService } from '../services/data-svr.service';
import { ServiceFuzzAccount } from '../models/ServiceFuzzAccounts';

interface GoogleUserInfo {
  email: string;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
  sub: string;
}

@Component({
  selector: 'app-sign-in-or-sign-up',
  standalone: false,
  templateUrl: './sign-in-or-sign-up.component.html',
  styleUrl: './sign-in-or-sign-up.component.css'
})
export class SignInOrSignUpComponent implements OnInit {
  private readonly CLIENT_ID = '763839777363-2tclimqvmlkkagk6j5d14me4ec4iq2hl.apps.googleusercontent.com';
  private readonly MAX_INIT_ATTEMPTS = 5;
  private readonly initInterval: any;
  private readonly initializationAttempts = 0;
  private readonly isInitialized = false;
  private readonly showGoogleButton = false;
  isSignIn = true;
  authForm: FormGroup;
  isLoading = false;
  userInfo: GoogleUserInfo | null = null;
  isAuthenticated = false;
  serviceFuzzUser: ServiceFuzzAccount | undefined;

  constructor(
    private formBuilder: FormBuilder,
    private authService: SocialAuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private data: DataSvrService
  ) {
    this.authForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    // Set up the global callback for Google Sign-In
    (window as any).handleCredentialResponse = this.handleCredentialResponse.bind(this);
  }

  ngOnInit() {
    console.log('SignInComponent using service instance:', this.data.getInstanceId());
    
    // First check if we already have a user in the service
    const currentUser = this.data.currentUser;
    if (currentUser) {
      this.isAuthenticated = true;
      this.serviceFuzzUser = currentUser;
      this.cdr.detectChanges();
    }

    // Then subscribe to auth state changes
    this.authService.authState.subscribe((user) => {
      if (user) {
        console.log('Logged in user:', user);
        this.userInfo = {
          email: user.email,
          name: user.name,
          picture: user.photoUrl,
          given_name: user.firstName,
          family_name: user.lastName,
          sub: user.id
        };
        // Only update authentication state if we don't already have a user
        if (!this.data.currentUser) {
          this.isAuthenticated = true;
          this.serviceFuzzUser = this.data.currentUser;
          this.cdr.detectChanges();
        }
      }
    });

    // Initialize Google Sign-In button
    setTimeout(() => this.initializeGoogleSignIn(), 100);
  }

  private initializeGoogleSignIn() {
    const container = document.querySelector('.social-login');
    if (container) {
      container.innerHTML = ''; // Clear existing content
      
      // Add Google Sign-In script
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      container.appendChild(script);

      // Add Google Sign-In button container
      const gsiContainer = document.createElement('div');
      gsiContainer.id = 'g_id_onload';
      gsiContainer.setAttribute('data-client_id', this.CLIENT_ID);
      gsiContainer.setAttribute('data-context', 'signin');
      gsiContainer.setAttribute('data-ux_mode', 'popup');
      gsiContainer.setAttribute('data-callback', 'handleCredentialResponse');
      gsiContainer.setAttribute('data-auto_prompt', 'false');
      
      const googleSignIn = document.createElement('div');
      googleSignIn.className = 'g_id_signin';
      googleSignIn.setAttribute('data-type', 'standard');
      googleSignIn.setAttribute('data-shape', 'rectangular');
      googleSignIn.setAttribute('data-theme', 'outline');
      googleSignIn.setAttribute('data-text', 'signin_with');
      googleSignIn.setAttribute('data-size', 'large');
      googleSignIn.setAttribute('data-logo_alignment', 'left');
      
      container.appendChild(gsiContainer);
      container.appendChild(googleSignIn);
    }
  }

  handleCredentialResponse(response: any) {
    this.isLoading = true;
    try {
      if (response.credential) {
        const decodedToken = this.decodeJwtToken(response.credential);
        if (decodedToken) {
          this.userInfo = {
            email: decodedToken.email,
            name: decodedToken.name,
            picture: decodedToken.picture,
            given_name: decodedToken.given_name,
            family_name: decodedToken.family_name,
            sub: decodedToken.sub
          };
          
          // Verify with backend
          this.data.verifyGoogleUser(response.credential).subscribe({
            next: (response) => {
              this.isAuthenticated = true;
              this.serviceFuzzUser = response.user;
              this.data.currentUser = response.user;
              this.cdr.detectChanges();
              // Navigate to home after successful authentication
              this.router.navigate(['/home']);
            },
            error: (error) => {
              console.error('Error verifying user:', error);
              this.isAuthenticated = false;
              this.serviceFuzzUser = undefined;
              this.data.clearState();
            }
          });
        }
      }
    } catch (error) {
      console.error('Error handling Google response:', error);
      this.data.clearState();
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  decodeJwtToken(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding JWT token:', error);
      return null;
    }
  }

  toggleMode() {
    this.isSignIn = !this.isSignIn;
  }

  onSubmit() {
    if (this.authForm.valid) {
      this.isLoading = true;
      try {
        if (this.isSignIn) {
          // Handle sign in
          console.log('Sign in:', this.authForm.value);
        } else {
          // Handle sign up
          console.log('Sign up:', this.authForm.value);
        }
      } finally {
        this.isLoading = false;
      }
    }
  }

  signOut() {
    this.authService.signOut();
    this.userInfo = null;
    this.isAuthenticated = false;
    this.serviceFuzzUser = undefined;
    this.data.clearState();
    
    // Navigate back to sign-in page
    this.router.navigate(['/sign']);
    
    // Only after navigation, reinitialize the Google Sign-In
    setTimeout(() => this.initializeGoogleSignIn(), 100);
  }
}
