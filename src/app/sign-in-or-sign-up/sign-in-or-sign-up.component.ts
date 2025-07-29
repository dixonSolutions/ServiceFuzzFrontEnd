import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SocialAuthService, GoogleLoginProvider } from '@abacritt/angularx-social-login';
import { Router, ActivatedRoute } from '@angular/router';
import { DataSvrService } from '../services/data-svr.service';
import { ServiceFuzzAccount } from '../models/ServiceFuzzAccounts';
import { MagicLinkAuthService } from '../services/magic-link-auth.service';
import { MessageService } from 'primeng/api';

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
  private readonly CLIENT_ID = '81721436395-8jqa7b3brs76k6c1731m1ja74c1ok2b4.apps.googleusercontent.com';
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
  private redirectUrl: string | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private authService: SocialAuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private data: DataSvrService,
    private magicLinkService: MagicLinkAuthService,
    private messageService: MessageService
  ) {
    this.authForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    // Set up the global callback for Google Sign-In
    (window as any).handleCredentialResponse = this.handleCredentialResponse.bind(this);
  }

  ngOnInit() {
    // Check for magic link parameters first and redirect to auth-callback if present
    this.route.queryParams.subscribe(params => {
      if (params['userId'] || params['token'] || params['source']) {
        // Redirect to auth-callback with all parameters
        const queryString = new URLSearchParams(params).toString();
        this.router.navigate(['/auth/callback'], { 
          queryParams: params,
          replaceUrl: true 
        });
        return;
      }
      
      // Store redirect URL if provided
      if (params['redirect']) {
        this.redirectUrl = params['redirect'];
      }
    });

    // Check if already authenticated
    this.isAuthenticated = !!this.data.currentUser;
    if (this.isAuthenticated) {
      this.serviceFuzzUser = this.data.currentUser;
      this.userInfo = {
        name: this.serviceFuzzUser?.name || '',
        email: this.serviceFuzzUser?.email || '',
        picture: '', // You might want to add profile picture support
        sub: this.serviceFuzzUser?.email || '',
        given_name: this.serviceFuzzUser?.name || '',
        family_name: ''
      };
    }

    // Initialize Google Sign-In
    setTimeout(() => this.initializeGoogleSignIn(), 100);

    // Listen for custom reinitialize event from dialog
    document.addEventListener('reinitializeGoogleSignIn', () => {
      setTimeout(() => this.initializeGoogleSignIn(), 200);
    });
  }

  private navigateAfterAuth() {
    // Navigate to redirect URL if provided, otherwise go to home
    const targetUrl = this.redirectUrl || '/business/settings';
    this.router.navigate([targetUrl], { replaceUrl: true });
  }

  // Magic link verification is now handled by the auth-callback component

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
      gsiContainer.setAttribute('data-context', this.isSignIn ? 'signin' : 'signup');
      gsiContainer.setAttribute('data-ux_mode', 'popup');
      gsiContainer.setAttribute('data-callback', 'handleCredentialResponse');
      gsiContainer.setAttribute('data-auto_prompt', 'false');
      
      const googleSignIn = document.createElement('div');
      googleSignIn.className = 'g_id_signin';
      googleSignIn.setAttribute('data-type', 'standard');
      googleSignIn.setAttribute('data-shape', 'rectangular');
      googleSignIn.setAttribute('data-theme', 'outline');
      googleSignIn.setAttribute('data-text', this.isSignIn ? 'signin_with' : 'signup_with');
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
          
          // Choose the appropriate method based on isSignIn flag
          const authMethod = this.isSignIn ? 
            this.data.verifyGoogleUser(response.credential) : 
            this.data.CreateUserWithGoogleToken(response.credential);

          authMethod.subscribe({
            next: (response: { user: ServiceFuzzAccount; token: string }) => {
              this.isAuthenticated = true;
              this.serviceFuzzUser = response.user;
              this.data.currentUser = response.user;
              this.cdr.detectChanges();
              // Navigate to redirect URL or home after successful authentication
              this.navigateAfterAuth();
            },
            error: (error: any) => {
              console.error(`Error ${this.isSignIn ? 'verifying' : 'creating'} user:`, error);
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

  private decodeJwtToken(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(window.atob(base64));
    } catch (error) {
      console.error('Error decoding JWT token:', error);
      return null;
    }
  }

  toggleMode() {
    this.isSignIn = !this.isSignIn;
    // Reinitialize Google Sign-In button with updated mode
    setTimeout(() => this.initializeGoogleSignIn(), 100);
  }

  onSubmit() {
    if (this.authForm.valid) {
      this.isLoading = true;
      try {
        if (this.isSignIn) {
          // Handle sign in
          // TODO: Implement regular email/password sign in
          // After successful authentication, call this.navigateAfterAuth();
        } else {
          // Handle sign up
          // TODO: Implement regular email/password sign up
          // After successful authentication, call this.navigateAfterAuth();
        }
      } finally {
        this.isLoading = false;
      }
    }
  }

  sendMagicLink() {
    const email = this.authForm.get('email')?.value;
    
    // Validate email
    if (!email || !this.magicLinkService.isValidEmail(email)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Invalid Email',
        detail: 'Please enter a valid email address'
      });
      return;
    }

    this.isLoading = true;

    // Store current redirect URL if exists
    if (this.redirectUrl) {
      this.magicLinkService.storeRedirectUrl(this.redirectUrl);
    }

    // Log magic link request
    this.magicLinkService.logMagicLinkEvent('request', {
      email,
      isSignIn: this.isSignIn,
      redirectUrl: this.redirectUrl
    });

    // Send magic link using the new service
    const magicLinkMethod = this.isSignIn ?
      this.magicLinkService.sendSignInMagicLink(email) :
      this.magicLinkService.sendSignUpMagicLink(email);

    magicLinkMethod.subscribe({
      next: (response: { message: string }) => {
        this.magicLinkService.logMagicLinkEvent('success', { email, isSignIn: this.isSignIn });
        this.messageService.add({
          severity: 'success',
          summary: 'Magic Link Sent',
          detail: response.message,
          life: 5000
        });
        this.isLoading = false;
      },
      error: (error: any) => {
        this.magicLinkService.logMagicLinkEvent('error', { 
          email, 
          isSignIn: this.isSignIn, 
          error: error.message 
        });
        console.error(`Error sending magic link for ${this.isSignIn ? 'sign in' : 'sign up'}:`, error);
        this.messageService.add({
          severity: 'error',
          summary: 'Failed to Send Magic Link',
          detail: 'Failed to send magic link. Please try again.',
          life: 4000
        });
        this.isLoading = false;
      }
    });
  }

  getFirstLetter(name: string | undefined): string {
    if (!name || name.trim() === '') {
      return '?';
    }
    return name.trim().charAt(0).toUpperCase();
  }

  signOut() {
    this.authService.signOut();
    this.userInfo = null;
    this.isAuthenticated = false;
    this.serviceFuzzUser = undefined;
    this.data.clearState(); // This will also clear the cookie via the currentUser setter
    
    // Navigate back to sign-in page
    this.router.navigate(['/sign']);
    
    // Only after navigation, reinitialize the Google Sign-In
    setTimeout(() => this.initializeGoogleSignIn(), 100);
  }
}
