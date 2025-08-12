import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  // Use the same API base URL pattern as other services
  private readonly apiBaseUrl = 'https://servicefuzzapi-atf8b4dqawc8dsa9.australiaeast-01.azurewebsites.net';
  private readonly LAST_ACTION_KEY = 'checkout_last_action';
  private lastActionSubject = new BehaviorSubject<string | null>(
    typeof window !== 'undefined' ? sessionStorage.getItem('checkout_last_action') : null
  );

  constructor(private http: HttpClient) {}

  // Returns the full Stripe Checkout URL as a string
  async getSubscriptionCheckoutUrl(freeTrial: boolean = false): Promise<string> {
    const origin = typeof window !== 'undefined' && window?.location?.origin
      ? window.location.origin
      : '';
    const params: string[] = [];
    if (origin) params.push(`baseUrl=${encodeURIComponent(origin)}`);
    params.push(`freeTrial=${freeTrial ? 'true' : 'false'}`);
    const query = params.length > 0 ? `?${params.join('&')}` : '';
    const url = `${this.apiBaseUrl}/api/Subscription/GetStripeCheckoutSession${query}`;
    const url$ = this.http.get(url, { responseType: 'text' });
    return await firstValueFrom(url$);
  }

  // Local-only record of last subscription action (e.g., 'cancel', 'endTrial', 'cancelAutoRenew')
  setLastAction(action: 'cancel' | 'endTrial' | 'cancelAutoRenew'): void {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(this.LAST_ACTION_KEY, action);
    this.lastActionSubject.next(action);
  }

  getLastAction$() {
    return this.lastActionSubject.asObservable();
  }
}
