import { Component, OnInit, Input, Output, EventEmitter, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { DataSvrService } from '../services/Other/data-svr.service';

@Component({
  selector: 'app-auth-business-dialog',
  standalone: false,
  templateUrl: './auth-business-dialog.html',
  styleUrl: './auth-business-dialog.css'
})
export class AuthBusinessDialogComponent implements OnInit, OnDestroy, OnChanges {
  // Dialog visibility control
  @Input() showDialog = false;
  @Output() showDialogChange = new EventEmitter<boolean>();
  @Output() dialogClosed = new EventEmitter<void>();
  @Output() authSuccess = new EventEmitter<void>();
  @Output() businessSetupComplete = new EventEmitter<void>();

  // Authentication state
  isAuthenticated = false;

  private subscription = new Subscription();

  constructor(
    private router: Router,
    private data: DataSvrService
  ) {}

  ngOnInit() {
    // Check authentication state periodically
    this.subscription.add(
      interval(1000).subscribe(() => {
        const wasAuthenticated = this.isAuthenticated;
        this.isAuthenticated = !!this.data.currentUser;
        
        // If user just got authenticated, navigate to business settings and close dialog
        if (!wasAuthenticated && this.isAuthenticated) {
          this.authSuccess.emit();
          setTimeout(() => {
            this.router.navigate(['/business/settings']);
            this.closeDialog();
          }, 1000); // Small delay to let user see they're authenticated
        }
      })
    );

    // Check initial authentication state
    this.isAuthenticated = !!this.data.currentUser;
  }

  ngOnChanges(changes: SimpleChanges) {
    // When dialog becomes visible, check if user is already authenticated
    if (changes['showDialog'] && changes['showDialog'].currentValue === true) {
      // Check if user is already authenticated
      if (this.data.currentUser) {
        // User is already authenticated, navigate to business settings immediately
        console.log('User already authenticated, navigating to business settings');
        this.authSuccess.emit();
        setTimeout(() => {
          this.router.navigate(['/business/settings']);
          this.closeDialog();
        }, 500); // Small delay for better UX
      } else {
        // User not authenticated, show auth form and initialize Google Sign-In
        setTimeout(() => {
          this.reinitializeGoogleSignIn();
        }, 300); // Give time for dialog to fully render
      }
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  // Reinitialize Google Sign-In when dialog becomes visible
  private reinitializeGoogleSignIn() {
    // Trigger the Google Sign-In initialization in the embedded component
    // by dispatching a custom event that the sign-in component can listen to
    const event = new CustomEvent('reinitializeGoogleSignIn');
    document.dispatchEvent(event);
    
    // Also try to manually reinitialize if the container exists
    setTimeout(() => {
      const container = document.querySelector('.social-login');
      if (container && container.innerHTML.trim() === '') {
        // If container exists but is empty, trigger initialization
        this.initializeGoogleSignInManually();
      }
    }, 500);
  }

  private initializeGoogleSignInManually() {
    const CLIENT_ID = '81721436395-8jqa7b3brs76k6c1731m1ja74c1ok2b4.apps.googleusercontent.com';
    const container = document.querySelector('.social-login');
    
    if (container) {
      container.innerHTML = ''; // Clear existing content
      
      // Add Google Sign-In script if not already present
      if (!document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.onload = () => {
          // Initialize after script loads
          setTimeout(() => this.renderGoogleButton(CLIENT_ID), 100);
        };
        document.head.appendChild(script);
      } else {
        // Script already exists, just render the button
        this.renderGoogleButton(CLIENT_ID);
      }
    }
  }

  private renderGoogleButton(clientId: string) {
    const container = document.querySelector('.social-login');
    if (!container) return;

    // Add Google Sign-In button container
    const gsiContainer = document.createElement('div');
    gsiContainer.id = 'g_id_onload_dialog';
    gsiContainer.setAttribute('data-client_id', clientId);
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

    // Trigger Google's rendering
    if ((window as any).google && (window as any).google.accounts) {
      (window as any).google.accounts.id.renderButton(googleSignIn, {
        type: 'standard',
        shape: 'rectangular',
        theme: 'outline',
        text: 'signin_with',
        size: 'large',
        logo_alignment: 'left'
      });
    }
  }

  // Dialog control methods
  onDialogHide() {
    this.showDialog = false;
    this.showDialogChange.emit(false);
    this.dialogClosed.emit();
  }

  closeDialog() {
    this.onDialogHide();
  }

  // Public methods for external control
  public openDialog() {
    this.showDialog = true;
    this.showDialogChange.emit(true);
  }
}
