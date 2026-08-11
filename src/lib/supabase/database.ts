export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type ProfileRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
};

type TripRow = {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  start_date: string | null;
  end_date: string | null;
  invite_code: string;
  status: "active" | "finalized";
  created_by: string;
  created_at: string;
  finalized_at: string | null;
};

type TripMemberRow = {
  trip_id: string;
  user_id: string;
  role: "admin" | "member";
  joined_at: string;
};

type ExpenseRow = {
  id: string;
  trip_id: string;
  title: string;
  notes: string | null;
  category: string;
  amount: number;
  expense_date: string;
  paid_by: string;
  created_by: string;
  split_type: "equal" | "selected_equal" | "custom";
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
};

type ExpenseAllocationRow = {
  id: string;
  expense_id: string;
  user_id: string;
  amount: number;
};

type SettlementRow = {
  id: string;
  trip_id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  status: "pending" | "paid";
  paid_at: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & Pick<ProfileRow, "id" | "display_name">;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      trips: {
        Row: TripRow;
        Insert: Partial<TripRow> & Pick<TripRow, "name" | "created_by">;
        Update: Partial<TripRow>;
        Relationships: [];
      };
      trip_members: {
        Row: TripMemberRow;
        Insert: Partial<TripMemberRow> & Pick<TripMemberRow, "trip_id" | "user_id">;
        Update: Partial<TripMemberRow>;
        Relationships: [];
      };
      expenses: {
        Row: ExpenseRow;
        Insert: Partial<ExpenseRow> & Pick<ExpenseRow, "trip_id" | "title" | "amount" | "paid_by" | "created_by" | "split_type">;
        Update: Partial<ExpenseRow>;
        Relationships: [];
      };
      expense_allocations: {
        Row: ExpenseAllocationRow;
        Insert: Partial<ExpenseAllocationRow> & Pick<ExpenseAllocationRow, "expense_id" | "user_id" | "amount">;
        Update: Partial<ExpenseAllocationRow>;
        Relationships: [];
      };
      settlements: {
        Row: SettlementRow;
        Insert: Partial<SettlementRow> & Pick<SettlementRow, "trip_id" | "from_user_id" | "to_user_id" | "amount">;
        Update: Partial<SettlementRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_trip: {
        Args: { p_name: string; p_description?: string | null; p_start_date?: string | null; p_end_date?: string | null };
        Returns: TripRow;
      };
      join_trip_by_invite: {
        Args: { p_invite_code: string };
        Returns: TripMemberRow;
      };
      save_expense: {
        Args: {
          p_trip_id: string;
          p_title: string;
          p_amount: number;
          p_expense_date: string;
          p_paid_by: string;
          p_split_type: "equal" | "selected_equal" | "custom";
          p_allocations: Json;
          p_expense_id?: string | null;
          p_notes?: string | null;
          p_category?: string;
          p_receipt_url?: string | null;
        };
        Returns: ExpenseRow;
      };
      delete_expense: { Args: { p_expense_id: string }; Returns: undefined };
      finalize_trip: { Args: { p_trip_id: string }; Returns: SettlementRow[] };
      unlock_trip: { Args: { p_trip_id: string }; Returns: TripRow };
      mark_settlement_paid: { Args: { p_settlement_id: string }; Returns: SettlementRow };
    };
    Enums: {
      trip_status: "active" | "finalized";
      member_role: "admin" | "member";
      split_type: "equal" | "selected_equal" | "custom";
      settlement_status: "pending" | "paid";
    };
    CompositeTypes: Record<string, never>;
  };
};
