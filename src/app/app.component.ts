import { Component, OnDestroy, OnInit } from '@angular/core';
import { DataSvrService } from './services/data-svr.service';
import { ManageBusinessesService } from './services/manage-businesses.service';
import { CheckoutService } from './services/checkout';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: false
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'servicefuzz';
  // Subscription prompt state
  showSubscriptionDialog: boolean = false;
  isSubscribing: boolean = false;
  private subs = new Subscription();

  constructor(
    public data: DataSvrService,
    private manageBusinessesService: ManageBusinessesService,
    private checkoutService: CheckoutService,
    private messageService: MessageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // When session restoration finishes (or immediately if none), evaluate subscription prompt
    const s = this.data.isRestoringSession$
      .pipe(filter((restoring) => restoring === false))
      .subscribe(() => this.maybePromptSubscription());
    this.subs.add(s);

    // In case isRestoringSession$ was already false at init
    setTimeout(() => {
      if ((this as any).destroyed) return;
      this.maybePromptSubscription();
    }, 0);
  }

  ngOnDestroy(): void {
    (this as any).destroyed = true;
    this.subs.unsubscribe();
  }

  private maybePromptSubscription(): void {
    try {
      // Avoid repeating within the same tab session
      if (sessionStorage.getItem('sf_sub_prompt_shown') === '1') return;
      // Do not prompt while on Business Settings
      if (this.router.url?.startsWith('/business/settings')) return;

      // Only prompt if the user is signed in
      const userEmail = (this.data as any).currentUser?.email;
      if (!userEmail) return;

      // If signed in, check backend subscription status
      this.manageBusinessesService.checkSubscriptionStatus(userEmail).subscribe({
        next: (status) => {
          const statusText = (status?.status || '').toLowerCase();
          const isSubscribed = !!status?.isSubscribed && !statusText.includes('no active subscription');
          if (!isSubscribed) {
            this.showSubscribeToast();
            this.showSubscriptionDialog = true;
            sessionStorage.setItem('sf_sub_prompt_shown', '1');
          }
        },
        error: () => {
          // On error, be silent
        }
      });
    } catch {
      // no-op
    }
  }

  private showSubscribeToast(): void {
    this.messageService.add({
      severity: 'warn',
      summary: 'Get full access',
      detail: 'Subscribe to unlock all ServiceFuzz features.',
      life: 5000
    });
  }

  // Actions reused from Business Settings logic
  async redirectToStripeCheckout(freeTrial: boolean = false): Promise<void> {
    if (this.isSubscribing) return;
    this.isSubscribing = true;
    try {
      const checkoutUrl = await this.checkoutService.getSubscriptionCheckoutUrl(freeTrial);
      window.location.assign(checkoutUrl);
    } catch (error: any) {
      const message = error?.status === 401 || error?.status === 403
        ? 'You must be signed in to subscribe. Please sign in and try again.'
        : 'Could not start checkout. Please try again later.';
      this.data.openSnackBar(message, 'Close', 5000);
    } finally {
      this.isSubscribing = false;
    }
  }

  goToBusinessSettings(): void {
    this.showSubscriptionDialog = false;
    this.router.navigate(['/business/settings']);
  }
}
