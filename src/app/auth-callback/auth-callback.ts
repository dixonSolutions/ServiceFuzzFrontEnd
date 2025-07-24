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
    // Extract parameters from URL and process magic link verification
    this.routeSubscription = this.route.queryParamMap.subscribe(params => {
      const userId = params.get('userId');
      const error = params.get('error');
      const source = params.get('source');
      const token = params.get('token');
      
      this.processAuthCallback(userId, error, source, token);
    });
  }

  ngOnDestroy() {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  private processAuthCallback(userId: string | null, error: string | null, source: string | null, token: string | null) {
    console.log('🔗 Processing auth callback:', { userId, error, source, token, currentRoute: this.router.url });
    
    // Handle error cases first
    if (error) {
      this.handleAuthError(error);
      return;
    }

    // Validate userId parameter
    if (!userId) {
      this.handleAuthError('missing-user-id');
      return;
    }

    // Process successful authentication
    this.handleSuccessfulAuth(userId, source);
  }

  private handleAuthError(errorCode: string) {
    this.isLoading = false;
    this.isProcessing = false;
    
    let message = '';
    switch (errorCode) {
      case 'expired-token':
        message = 'The magic link has expired. Please request a new one.';
        break;
      case 'invalid-token':
        message = 'The magic link is invalid. Please request a new one.';
        break;
      case 'already-used':
        message = 'This magic link has already been used. Please request a new one.';
        break;
      case 'user-not-found':
        message = 'User account not found. Please check your email or sign up.';
        break;
      case 'missing-user-id':
        message = 'Authentication failed: Missing user information.';
        break;
      default:
        message = 'Authentication failed. Please try again.';
    }
    
    this.errorMessage = message;
    this.messageService.add({
      severity: 'error',
      summary: 'Authentication Failed',
      detail: message,
      life: 5000
    });
    
    // Redirect to sign-in after showing error
    setTimeout(() => {
      this.router.navigate(['/sign'], { replaceUrl: true });
    }, 3000);
  }

  private handleSuccessfulAuth(userId: string, source: string | null) {
    console.log('🔗 Handling successful auth for userId:', userId, 'source:', source);
    
    this.data.getUserByID(userId).subscribe({
      next: (user: ServiceFuzzAccount) => {
        console.log('🔗 User verified successfully:', user);
        
        // Update authentication state
        this.data.currentUser = user;
        
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
        this.navigateAfterSuccess();
      },
      error: (error: any) => {
        console.error('🔗 Error verifying magic link:', error);
        this.handleAuthError('user-verification-failed');
      }
    });
  }

  private navigateAfterSuccess() {
    // Get intended redirect URL from session storage or default to home
    const redirectUrl = sessionStorage.getItem('authRedirectUrl') || '/home';
    sessionStorage.removeItem('authRedirectUrl'); // Clean up
    
    console.log('🔗 Navigating after successful auth to:', redirectUrl);
    
    // Navigate after a brief delay to show success state, cleaning URL in process
    setTimeout(() => {
      this.router.navigate([redirectUrl], { replaceUrl: true });
    }, 1500);
  }

  retryAuth() {
    this.router.navigate(['/sign'], { replaceUrl: true });
  }
}
