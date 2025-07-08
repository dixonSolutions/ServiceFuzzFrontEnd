export interface SubscriptionStatus {
  isSubscribed: boolean;
  status: 'active' | 'inactive' | 'No active subscription found';
  subscriptionId?: string;
  currentPeriodEnd?: string;
} 