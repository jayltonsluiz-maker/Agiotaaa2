
export enum LoanStatus {
  ACTIVE = 'ACTIVE',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

export interface Borrower {
  id: string;
  name: string;
  cpf: string;
  phone: string; // Novo: Telefone padrão brasileiro
  email: string; // Novo: E-mail para notificações
  address: string;
  score: number; // 0 to 100
  emergencyContacts: EmergencyContact[];
  notes?: string;
  idPhotoUrl?: string;
  addressProofUrl?: string;
}

export interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

export interface Payment {
  id: string;
  loanId: string;
  amount: number;
  date: string;
  receiptUrl?: string;
  type: 'INTEREST' | 'PRINCIPAL' | 'TOTAL';
  notes?: string;
}

export interface Loan {
  id: string;
  borrowerId: string;
  principalAmount: number;
  monthlyInterestRate: number; // e.g., 0.05 for 5%
  startDate: string; // Data de Concessão
  installments: number;
  status: LoanStatus;
  contractUrl?: string;
  // Computed or state-tracked values
  remainingPrincipal: number;
  accruedInterest: number;
  totalPaid: number;
}

export interface AppState {
  borrowers: Borrower[];
  loans: Loan[];
  payments: Payment[];
}
