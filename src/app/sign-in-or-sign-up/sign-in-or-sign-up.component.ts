import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SocialAuthService, GoogleLoginProvider } from '@abacritt/angularx-social-login';
import { Router, ActivatedRoute } from '@angular/router';
import { DataSvrService } from '../services/Other/data-svr.service';
import { ServiceFuzzAccount } from '../models/ServiceFuzzAccounts';
import { MagicLinkAuthService } from '../services/Main/User/Auth/magic-link-auth.service';
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
  isGoogleLoading = false;
  isMagicLinkLoading = false;
  isAutoSignInLoading = false;
  userInfo: GoogleUserInfo | null = null;
  isAuthenticated = false;
  serviceFuzzUser: ServiceFuzzAccount | undefined;
  private redirectUrl: string | null = null;
  
  // Auto sign-in preference
  autoSignInEnabled = true;

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
      autoSignIn: [true] // Default to enabled
    });

    // Set up the global callback for Google Sign-In
    (window as any).handleCredentialResponse = this.handleCredentialResponse.bind(this);
  }

  ngOnInit() {
    // Check for redirect URL parameter and magic link token
    this.route.queryParams.subscribe(params => {
      // Store redirect URL if provided
      if (params['redirect']) {
        this.redirectUrl = params['redirect'];
      }
      
      // Handle magic link authentication
      const signinToken = params['signin_token'];
      if (signinToken) {
        this.processMagicLinkAuthentication(signinToken, params['source']);
        return; // Don't proceed with normal initialization if processing magic link
      }
    });

    // Load auto sign-in preference from service
    this.autoSignInEnabled = this.data.autoSignInEnabled;
    this.authForm.patchValue({ autoSignIn: this.autoSignInEnabled });

    // Debug: Check auto sign-in state
    console.log('🔄 Sign-in component initialized:', {
      autoSignInEnabled: this.autoSignInEnabled,
      serviceAutoSignIn: this.data.autoSignInEnabled
    });

    // Check if already authenticated or if session is being restored
    this.checkAuthenticationState();

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

  /**
   * Check authentication state and handle auto sign-in
   */
  private checkAuthenticationState() {
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
      return;
    }

    // Check if session is being restored
    this.data.isRestoringSession$.subscribe(isRestoring => {
      this.isAutoSignInLoading = isRestoring;
      if (isRestoring) {
        this.messageService.add({
          severity: 'info',
          summary: 'Restoring Session',
          detail: 'Please wait while we restore your session...',
          life: 3000
        });
      }
    });

    // Listen for successful session restoration
    this.data.currentUser$.subscribe((user: ServiceFuzzAccount | undefined) => {
      if (user && !this.isAuthenticated) {
        this.isAuthenticated = true;
        this.serviceFuzzUser = user;
        this.userInfo = {
          name: user.name || '',
          email: user.email || '',
          picture: '',
          sub: user.email || '',
          given_name: user.name || '',
          family_name: ''
        };
        this.isAutoSignInLoading = false;
        
        // Navigate after successful auto sign-in
        setTimeout(() => {
          this.navigateAfterAuth();
        }, 1000);
      }
    });
  }

  /**
   * Process magic link authentication directly in this component
   */
  private processMagicLinkAuthentication(signinToken: string, source: string | null) {
    console.log('🔗 Processing magic link authentication:', { 
      hasSigninToken: !!signinToken, 
      source 
    });
    
    // Validate signin_token parameter
    if (!signinToken || signinToken.trim() === '') {
      console.error('🔗 Missing or empty signin_token parameter');
      this.messageService.add({
        severity: 'error',
        summary: 'Invalid Magic Link',
        detail: 'The magic link is invalid or expired. Please try again.',
        life: 5000
      });
      return;
    }

    this.isLoading = true;
    this.isMagicLinkLoading = true;

    // Authenticate using the sign-in token
    this.data.authenticateWithSignInToken(signinToken).subscribe({
      next: (response) => {
        console.log('🔗 Magic link authentication successful:', {
          user: response.user,
          hasToken: !!response.token,
          message: response.message
        });
        
        // Update authentication state
        this.isAuthenticated = true;
        this.serviceFuzzUser = response.user;
        this.data.currentUser = response.user;
        
        // Set user info for display
        this.userInfo = {
          name: response.user.name || '',
          email: response.user.email || '',
          picture: '',
          sub: response.user.email || '',
          given_name: response.user.name || '',
          family_name: ''
        };
        
        // Show success message
        const authType = source === 'signup' ? 'account creation' : 'sign in';
        this.messageService.add({
          severity: 'success',
          summary: 'Authentication Successful',
          detail: `Successfully completed ${authType} via magic link!`,
          life: 4000
        });
        
        this.isLoading = false;
        this.isMagicLinkLoading = false;
        
        // Clean URL and navigate
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {},
          replaceUrl: true
        }).then(() => {
          // Navigate after a short delay to show success message
          setTimeout(() => {
            this.navigateAfterAuth();
          }, 2000);
        });
      },
      error: (error: any) => {
        console.error('🔗 Magic link authentication failed:', error);
        
        this.isLoading = false;
        this.isMagicLinkLoading = false;
        this.data.clearState();
        
        // Show error message
        let errorMessage = 'Authentication failed. Please try again.';
        if (error.status === 401) {
          errorMessage = 'The magic link is invalid or expired. Please request a new one.';
        } else if (error.status === 400) {
          errorMessage = 'Invalid request. Please try again.';
        }
        
        this.messageService.add({
          severity: 'error',
          summary: 'Authentication Failed',
          detail: errorMessage,
          life: 5000
        });
        
        // Clean URL
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {},
          replaceUrl: true
        });
      }
    });
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
    this.isGoogleLoading = true;
    this.isLoading = true;
    
    // Update auto sign-in preference before authentication
    const autoSignIn = this.authForm.get('autoSignIn')?.value;
    this.data.autoSignInEnabled = autoSignIn;
    
    // Show loading message
    this.messageService.add({
      severity: 'info',
      summary: 'Signing In',
      detail: 'Please wait while we sign you in with Google...',
      life: 3000
    });
    
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
            next: (response: { user: ServiceFuzzAccount; token: string; signInToken: string }) => {
              this.isAuthenticated = true;
              this.serviceFuzzUser = response.user;
              this.data.currentUser = response.user;
              console.log('Authentication successful with dual tokens');
              
              // Show success message
              this.messageService.add({
                severity: 'success',
                summary: 'Sign In Successful',
                detail: `Welcome back, ${response.user.name}!`,
                life: 3000
              });
              
              // Debug: Check if cookies were set after successful authentication
              setTimeout(() => {
                const cookieCheck = this.data.hasUserSession();
                console.log('🍪 Post-authentication cookie check:', {
                  hasUserSession: cookieCheck,
                  autoSignInEnabled: this.data.autoSignInEnabled,
                  allCookies: document.cookie
                });
              }, 500);
              
              this.cdr.detectChanges();
              
              // Navigate to redirect URL or home after successful authentication
              setTimeout(() => {
                this.navigateAfterAuth();
              }, 1500);
            },
            error: (error: any) => {
              console.error(`Error ${this.isSignIn ? 'verifying' : 'creating'} user:`, error);
              this.isAuthenticated = false;
              this.serviceFuzzUser = undefined;
              this.data.clearState();
              
              // Show error message
              let errorMessage = `Failed to ${this.isSignIn ? 'sign in' : 'create account'} with Google. Please try again.`;
              if (error.status === 401) {
                errorMessage = 'Google authentication failed. Please try again.';
              } else if (error.status === 409) {
                errorMessage = 'An account with this email already exists. Please sign in instead.';
              }
              
              this.messageService.add({
                severity: 'error',
                summary: 'Authentication Failed',
                detail: errorMessage,
                life: 5000
              });
            }
          });
        }
      }
    } catch (error) {
      console.error('Error handling Google response:', error);
      this.data.clearState();
      
      this.messageService.add({
        severity: 'error',
        summary: 'Authentication Error',
        detail: 'An unexpected error occurred. Please try again.',
        life: 5000
      });
    } finally {
      this.isLoading = false;
      this.isGoogleLoading = false;
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

  /**
   * Handle auto sign-in preference change
   */
  onAutoSignInChange() {
    const autoSignInValue = this.authForm.get('autoSignIn')?.value;
    this.autoSignInEnabled = autoSignInValue;
    this.data.autoSignInEnabled = autoSignInValue;
    
    console.log('🔄 Auto sign-in preference changed:', {
      newValue: autoSignInValue,
      componentValue: this.autoSignInEnabled,
      serviceValue: this.data.autoSignInEnabled
    });
  }

  onSubmit() {
    // Form submission now only handles magic link sending (passwordless)
    this.sendMagicLink();
  }

  sendMagicLink() {
    const email = this.authForm.get('email')?.value;
    const autoSignIn = this.authForm.get('autoSignIn')?.value;
    
    // Validate email
    if (!email || !this.magicLinkService.isValidEmail(email)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Invalid Email',
        detail: 'Please enter a valid email address'
      });
      return;
    }

    // Update auto sign-in preference before authentication
    this.data.autoSignInEnabled = autoSignIn;

    this.isLoading = true;
    this.isMagicLinkLoading = true;

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
        this.isMagicLinkLoading = false;
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
        this.isMagicLinkLoading = false;
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
    // Call backend logout API first
    this.data.logout().subscribe({
      next: (response) => {
        console.log('Logout successful:', response.message);
      },
      error: (error) => {
        console.error('Logout error:', error);
        // Even if logout API fails, still clear local state
        this.data.clearState();
      }
    });

    // Clear Google auth and local state
    this.authService.signOut();
    this.userInfo = null;
    this.isAuthenticated = false;
    this.serviceFuzzUser = undefined;
    
    // Navigate back to sign-in page
    this.router.navigate(['/sign']);
    
    // Only after navigation, reinitialize the Google Sign-In
    setTimeout(() => this.initializeGoogleSignIn(), 100);
  }
}
