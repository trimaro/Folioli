// Shared types for Folioli application

export interface Transaction {
    id?: number;
    date: string;
    transaction_code?: string;
    name: string;
    memo?: string;
    category?: string;
    amount: number;
    status: "pending" | "confirmed";
    /** In-memory only: category at import/load time, used to detect corrections. */
    originalCategory?: string;
}

export type Tab = "dashboard" | "table" | "settings";

export type SortField = "date" | "name" | "amount" | "category" | "memo" | "status";
export type SortDirection = "asc" | "desc";
