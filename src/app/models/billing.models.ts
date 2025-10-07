export interface PlanCapabilities {
  maxFreeBusinesses: number;
  additionalBusinessPrice: number;
  maxTotalBusinesses: number;
  features: {
    emailServerHosting: boolean;
    advancedAnalytics: boolean;
    whiteLabel: boolean;
    prioritySupport: boolean;
    teamCollaboration: boolean;
  };
}

export interface BillingPlan {
  id: number;
  name: string;
  description: string;
  basePrice: number;
  currency: string;
  billingInterval: string;
  includedStaff: number;
  includedWorkspaces: number;
  includedDeployments: number;
  overageStaffPrice: number;
  overageWorkspacePrice: number;
  overageDeploymentPrice: number;
  isActive: boolean;
  capabilities?: PlanCapabilities;
}

export interface BillingProfile {
  id: number;
  userId: string;
  email: string;
  plan: BillingPlan;
  businessCount: number;
  billingStatus: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete';
  nextBillingDate: string;
  trialEndsAt?: string | null;
}

export interface UsageSummary {
  totalBusinesses: number;
  totalStaff: number;
  totalWorkspaces: number;
  totalDeployments: number;
  includedStaff: number;
  includedWorkspaces: number;
  includedDeployments: number;
  staffOverage: number;
  workspaceOverage: number;
  deploymentOverage: number;
}

export interface SubscribeRequest {
  planId: number;
  businessCount: number;
  paymentMethodId?: string | null;
  redirectUrl: string;
  startTrial: boolean;
}

export interface SubscribeResponse {
  success: boolean;
  checkoutUrl?: string;
  subscriptionId?: string | null;
  clientSecret?: string | null;
  errorMessage?: string | null;
  profile?: BillingProfile;
}

export interface ActionCheckRequest {
  actionType: 'add_business' | 'add_staff' | 'create_workspace' | 'deploy_website';
  businessId?: string;
}

export interface ActionCheckResponse {
  canPerform: boolean;
  errorMessage?: string | null;
  additionalCost: number;
  requiresUpgrade: boolean;
}

export interface BillingError {
  code: string;
  message: string;
  requiresUpgrade?: boolean;
  suggestedPlan?: BillingPlan;
}
