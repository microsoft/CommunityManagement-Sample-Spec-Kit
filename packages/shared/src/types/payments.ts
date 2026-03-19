// Shared Payment Types — per contracts/payments-api.ts

export interface CreatorPaymentAccount {
  id: string;
  userId: string;
  stripeAccountId: string;
  onboardingComplete: boolean;
  connectedAt: string;
  disconnectedAt: string | null;
}

export interface ConnectInitiateResponse {
  redirectUrl: string;
}

export interface PaymentStatusResponse {
  connected: boolean;
  onboardingComplete: boolean;
  account: CreatorPaymentAccount | null;
}
