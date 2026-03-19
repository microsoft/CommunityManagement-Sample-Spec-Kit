export interface Credit {
  id: string;
  userId: string;
  creatorId: string;
  creatorDisplayName: string;
  amount: number;
  currency: string;
  remainingBalance: number;
  issuedFromEventId: string;
  issuedFromEventTitle: string;
  createdAt: string;
}

export interface CreditBalance {
  creatorId: string;
  creatorDisplayName: string;
  currency: string;
  totalBalance: number;
  credits: Credit[];
}

export interface CreditApplication {
  creditsApplied: { creditId: string; amountUsed: number }[];
  totalCreditsApplied: number;
  remainingCharge: number;
}
