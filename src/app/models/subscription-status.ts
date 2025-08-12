export interface SubscriptionStatus {
  isSubscribed: boolean;
  // Backend can return values like: 'active', 'inactive', 'trialing',
  // 'No active subscription found', 'No active subscription found for this product', etc.
  status: string;
  subscriptionId?: string | null;
  currentPeriodEnd?: string | null;
}