import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DataSvrService } from './data-svr.service';

export interface MagicLinkRequest {
  email: string;
  customLinkFormat: string;
}

export interface MagicLinkResponse {
  message: string;
  success?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MagicLinkAuthService {

  constructor(private dataService: DataSvrService) { }

  /**
   * Gets the current application's base URL
   */
  private getBaseUrl(): string {
    const currentUrl = window.location.href;
    const baseUrl = window.location.origin;
    console.log('Current URL:', currentUrl);
    console.log('Base URL:', baseUrl);
    return baseUrl;
  }

  /**
   * Constructs custom link format for sign-in magic links
   */
  private getSignInLinkFormat(): string {
    const baseUrl = this.getBaseUrl();
    return `${baseUrl}/auth/callback?userId={userId}&error={error}&source=magic-link&token={token}`;
  }

  /**
   * Constructs custom link format for sign-up magic links
   */
  private getSignUpLinkFormat(): string {
    const baseUrl = this.getBaseUrl();
    return `${baseUrl}/auth/signup-callback?userId={userId}&error={error}&source=signup&token={token}`;
  }

  /**
   * Stores the intended redirect URL for after authentication
   */
  storeRedirectUrl(url: string): void {
    sessionStorage.setItem('authRedirectUrl', url);
  }

  /**
   * Gets and clears the stored redirect URL
   */
  getAndClearRedirectUrl(): string | null {
    const url = sessionStorage.getItem('authRedirectUrl');
    if (url) {
      sessionStorage.removeItem('authRedirectUrl');
    }
    return url;
  }

  /**
   * Sends a magic link for user sign-in
   */
  sendSignInMagicLink(email: string, customRedirectUrl?: string): Observable<MagicLinkResponse> {
    const customLinkFormat = customRedirectUrl || this.getSignInLinkFormat();
    
    console.log('🔗 Sending Sign-In Magic Link:', {
      email,
      customLinkFormat,
      baseUrl: this.getBaseUrl()
    });

    return this.dataService.GenerateAndSendMagicLinkForLogIn(email, customLinkFormat);
  }

  /**
   * Sends a magic link for user sign-up
   */
  sendSignUpMagicLink(email: string, customRedirectUrl?: string): Observable<MagicLinkResponse> {
    const customLinkFormat = customRedirectUrl || this.getSignUpLinkFormat();
    
    console.log('🔗 Sending Sign-Up Magic Link:', {
      email,
      customLinkFormat,
      baseUrl: this.getBaseUrl()
    });

    return this.dataService.GenerateAndSendMagicLinkForSignUp(email, customLinkFormat);
  }

  /**
   * Creates a custom link format with specific parameters
   */
  createCustomLinkFormat(
    callbackRoute: string, 
    additionalParams: Record<string, string> = {}
  ): string {
    const baseUrl = this.getBaseUrl();
    const baseFormat = `${baseUrl}${callbackRoute}?userId={userId}&error={error}&token={token}`;
    
    // Add additional parameters
    const extraParams = Object.entries(additionalParams)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    
    return extraParams ? `${baseFormat}&${extraParams}` : baseFormat;
  }

  /**
   * Validates email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Logs magic link analytics
   */
  logMagicLinkEvent(eventType: 'request' | 'success' | 'error', details: any): void {
    const timestamp = new Date().toISOString();
    console.log(`📊 Magic Link Analytics [${eventType.toUpperCase()}]:`, {
      timestamp,
      event: eventType,
      details,
      userAgent: navigator.userAgent,
      url: window.location.href
    });
  }
} 