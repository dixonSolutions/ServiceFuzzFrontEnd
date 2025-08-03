import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DataSvrService } from '../services/data-svr.service';
import { ServiceFuzzAccount } from '../models/ServiceFuzzAccounts';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-auth-callback',
  standalone: false,
  templateUrl: './auth-callback.html',
  styleUrl: './auth-callback.css'
})
export class AuthCallback implements OnInit, OnDestroy {
  private routeSubscription: Subscription = new Subscription();
  isLoading = true;
  isProcessing = true;
  errorMessage = '';
  successMessage = '';
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private data: DataSvrService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    // Extract signin_token parameter from URL for magic link authentication
    this.routeSubscription = this.route.queryParamMap.subscribe(params => {
      const signinToken = params.get('signin_token');
      const source = params.get('source'); // Optional source parameter for analytics
      
      this.processMagicLinkAuthentication(signinToken, source);
    });
  }

  ngOnDestroy() {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  private processMagicLinkAuthentication(signinToken: string | null, source: string | null) {
    console.log('🔗 Processing magic link authentication:', { 
      hasSigninToken: !!signinToken, 
      source, 
      currentRoute: this.router.url 
    });
    
    // Validate signin_token parameter - this is the only required parameter
    if (!signinToken || signinToken.trim() === '') {
      console.error('🔗 Missing or empty signin_token parameter');
      this.handleAuthenticationError('missing-signin-token');
      return;
    }

    // Authenticate using the sign-in token
    this.authenticateWithSigninToken(signinToken, source);
  }

  /**
   * Authenticate using the sign-in token with the backend
   */
  private authenticateWithSigninToken(signinToken: string, source: string | null) {
    console.log('🔗 Authenticating with signin token');
    
    // Call the backend authenticate-signin-token endpoint
    this.data.authenticateWithSignInToken(signinToken).subscribe({
      next: (response) => {
        console.log('🔗 Magic link authentication successful:', {
          user: response.user,
          hasToken: !!response.token,
          message: response.message
        });
        
        // Store both tokens according to the comprehensive requirements
        this.storeAuthenticationTokens(response.token, signinToken);
        
        // Update user state
        this.data.currentUser = response.user;
        
        // Determine success message based on source
        const authType = source === 'signup' ? 'account creation' : 'sign in';
        this.successMessage = `Successfully completed ${authType} via magic link!`;
        
        // Show success message
        this.messageService.add({
          severity: 'success',
          summary: 'Authentication Successful',
          detail: this.successMessage,
          life: 4000
        });
        
        this.isLoading = false;
        this.isProcessing = false;
        
        // Clean URL and navigate to intended destination
        this.cleanUrlAndNavigate();
      },
      error: (error: any) => {
        console.error('🔗 Magic link authentication failed:', error);
        
        // Clear any existing authentication data
        this.clearAuthenticationData();
        
        // Handle different error types
        if (error.status === 401) {
          this.handleAuthenticationError('invalid-signin-token');
        } else if (error.status === 400) {
          this.handleAuthenticationError('malformed-request');
        } else {
          this.handleAuthenticationError('network-error');
        }
      }
    });
  }

  /**
   * Store authentication tokens using the system's storage strategy
   */
  private storeAuthenticationTokens(regularToken: string, signinToken: string) {
    try {
      // Use the DataSvrService setters to ensure consistency with the rest of the system
      this.data.jwtToken = regularToken;
      this.data.signInToken = signinToken;
      
      console.log('🔗 Authentication tokens stored successfully via DataSvrService');
    } catch (error) {
      console.error('🔗 Failed to store authentication tokens:', error);
    }
  }

  /**
   * Clear all authentication data from storage
   */
  private clearAuthenticationData() {
    try {
      // Use the DataSvrService clearState method to ensure complete cleanup
      this.data.clearState();
      console.log('🔗 Authentication data cleared via DataSvrService');
    } catch (error) {
      console.error('🔗 Failed to clear authentication data:', error);
    }
  }

  /**
   * Handle authentication errors according to comprehensive requirements
   */
  private handleAuthenticationError(errorType: string) {
    this.isLoading = false;
    this.isProcessing = false;
    
    let message = '';
    switch (errorType) {
      case 'missing-signin-token':
        message = 'Invalid magic link: Missing authentication token. Please request a new magic link.';
        break;
      case 'invalid-signin-token':
        message = 'The magic link has expired or is invalid. Please request a new one.';
        break;
      case 'malformed-request':
        message = 'Authentication request failed: Invalid token format. Please request a new magic link.';
        break;
      case 'network-error':
        message = 'Network error during authentication. Please check your connection and try again.';
        break;
      default:
        message = 'Authentication failed. Please request a new magic link.';
    }
    
    this.errorMessage = message;
    this.messageService.add({
      severity: 'error',
      summary: 'Magic Link Authentication Failed',
      detail: message,
      life: 5000
    });
    
    // Redirect to sign-in page after showing error
    setTimeout(() => {
      this.router.navigate(['/sign'], { replaceUrl: true });
    }, 3000);
  }



  private cleanUrlAndNavigate() {
    // Clean the URL by removing query parameters
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true
    }).then(() => {
      // Get intended redirect URL from session storage or default to home
      const redirectUrl = sessionStorage.getItem('authRedirectUrl') || '/home';
      sessionStorage.removeItem('authRedirectUrl'); // Clean up
      
      console.log('🔗 Navigating after successful auth to:', redirectUrl);
      
      // Navigate after a brief delay to show success state
      setTimeout(() => {
        this.router.navigate([redirectUrl], { replaceUrl: true });
      }, 1500);
    });
  }

  retryAuth() {
    this.router.navigate(['/sign'], { replaceUrl: true });
  }
}
