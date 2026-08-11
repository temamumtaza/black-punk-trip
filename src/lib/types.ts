export type TripStatus = "active" | "finalized";
export type MemberRole = "admin" | "member";
export type SplitType = "equal" | "selected_equal" | "custom";
export type SettlementStatus = "pending" | "paid";
export type ExpenseCategory =
  | "accommodation"
  | "food"
  | "transport"
  | "activity"
  | "shopping"
  | "other";

export interface Profile {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  createdAt: string;
}

export interface Trip {
  id: string;
  name: string;
  description?: string | null;
  coverUrl?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  inviteCode: string;
  status: TripStatus;
  createdBy: string;
  createdAt: string;
  finalizedAt?: string | null;
}

export interface TripMember {
  tripId: string;
  userId: string;
  role: MemberRole;
  joinedAt: string;
}

export interface ExpenseAllocation {
  id: string;
  expenseId: string;
  userId: string;
  amount: number;
}

export interface Expense {
  id: string;
  tripId: string;
  title: string;
  notes?: string | null;
  category: ExpenseCategory;
  amount: number;
  expenseDate: string;
  paidBy: string;
  createdBy: string;
  splitType: SplitType;
  receiptUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  allocations: ExpenseAllocation[];
}

export interface Settlement {
  id: string;
  tripId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  status: SettlementStatus;
  paidAt?: string | null;
  createdAt: string;
}

export interface AppState {
  currentUserId: string;
  profiles: Profile[];
  trips: Trip[];
  tripMembers: TripMember[];
  expenses: Expense[];
  settlements: Settlement[];
}

export interface MemberLedger {
  userId: string;
  paid: number;
  share: number;
  balance: number;
}

export interface SettlementPreview {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

