import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SocialAuthService, GoogleLoginProvider } from '@abacritt/angularx-social-login';
import { Router, ActivatedRoute } from '@angular/router';
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
  private redirectUrl: string | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private authService: SocialAuthService,
    private router: Router,
    private route: ActivatedRoute,
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
    // Check for query parameters first (for redirect)
    this.route.queryParams.subscribe(params => {
      this.redirectUrl = params['redirect'] || null;
    });

    // Then check if we already have a user in the service
    const currentUser = this.data.currentUser;
    if (currentUser) {
      this.isAuthenticated = true;
      this.serviceFuzzUser = currentUser;
      this.cdr.detectChanges();
      
      // If user is already authenticated and there's a redirect URL, navigate to it
      if (this.redirectUrl) {
        this.navigateAfterAuth();
      }
      return;
    }

    // Check if user session exists in cookie but not in memory
    if (!currentUser && this.data.hasUserSession()) {
      console.log('Sign-in component: User session exists in cookie, waiting for restoration...');
      // Subscribe to user changes to detect when session is restored
      const userSubscription = this.data.businessRegistration$.subscribe(() => {
        const restoredUser = this.data.currentUser;
        if (restoredUser) {
          this.isAuthenticated = true;
          this.serviceFuzzUser = restoredUser;
          this.cdr.detectChanges();
          
          // If there's a redirect URL, navigate to it
          if (this.redirectUrl) {
            this.navigateAfterAuth();
          }
          
          // Unsubscribe after successful restoration
          userSubscription.unsubscribe();
        }
      });
    }

    // Check for magic link verification (userId parameter)  
    this.route.queryParams.subscribe(params => {
      const userId = params['userId'];
      if (userId) {
        this.handleMagicLinkVerification(userId);
        return;
      }
    });

    // Then subscribe to auth state changes
    this.authService.authState.subscribe((user) => {
      if (user) {
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

  private navigateAfterAuth() {
    // Navigate to redirect URL if provided, otherwise go to home
    const targetUrl = this.redirectUrl || '/home';
    this.router.navigate([targetUrl], { replaceUrl: true });
  }

  private handleMagicLinkVerification(userId: string) {
    this.isLoading = true;
    
    this.data.getUserByID(userId).subscribe({
      next: (user: ServiceFuzzAccount) => {
        this.isAuthenticated = true;
        this.serviceFuzzUser = user;
        this.data.currentUser = user;
        this.cdr.detectChanges();
        
        // Show success message
        this.data.openSnackBar('Successfully signed in via magic link!', 'Close', 3000);
        
        // Navigate to redirect URL or home
        this.navigateAfterAuth();
      },
      error: (error: any) => {
        console.error('Error verifying magic link:', error);
        this.data.openSnackBar('Invalid or expired magic link. Please try again.', 'Close', 5000);
        
        // Clear the URL parameters
        this.router.navigate(['/sign'], { replaceUrl: true });
      },
      complete: () => {
        this.isLoading = false;
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
    if (!email || !this.authForm.get('email')?.valid) {
      this.data.openSnackBar('Please enter a valid email address', 'Close', 3000);
      return;
    }

    this.isLoading = true;

    // Note: Magic link redirect functionality is preserved through the userId parameter
    // in the URL when the user clicks the magic link, which will trigger navigateAfterAuth()
    const magicLinkMethod = this.isSignIn ?
      this.data.GenerateAndSendMagicLinkForLogIn(email) :
      this.data.GenerateAndSendMagicLinkForSignUp(email);

    magicLinkMethod.subscribe({
      next: (response: { message: string }) => {
        this.data.openSnackBar(response.message, 'Close', 5000);
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error(`Error sending magic link for ${this.isSignIn ? 'sign in' : 'sign up'}:`, error);
        this.data.openSnackBar(
          `Failed to send magic link. Please try again.`, 
          'Close', 
          3000
        );
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
