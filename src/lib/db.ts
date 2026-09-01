import Dexie, { type Table } from 'dexie';

export interface Category {
  id: string;
  user_id?: string;
  name: string;
  type: 'Income' | 'Expense';
  icon?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Transaction {
  id: string;
  user_id?: string;
  category_id: string;
  type: 'Income' | 'Expense';
  amount: number;
  description?: string;
  transaction_date: string;
  created_at?: string;
  updated_at?: string;
  // Local only fields for relational queries
  category_name?: string; 
}

export interface Budget {
  id: string;
  user_id?: string;
  category_id: string;
  amount: number;
  month: number;
  year: number;
  created_at?: string;
  updated_at?: string;
  // Local only fields
  category_name?: string;
}

export interface FinancialGoal {
  id: string;
  user_id?: string;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline?: string;
  status: 'Active' | 'Completed' | 'Cancelled';
  created_at?: string;
  updated_at?: string;
}

export interface SyncQueue {
  id?: number;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  payload: any;
  created_at: string;
}

export class FinTrackDB extends Dexie {
  transactions!: Table<Transaction, string>;
  categories!: Table<Category, string>;
  budgets!: Table<Budget, string>;
  goals!: Table<FinancialGoal, string>;
  syncQueue!: Table<SyncQueue, number>;

  constructor() {
    super('FinTrackDB');
    
    this.version(2).stores({
      transactions: 'id, category_id, type, transaction_date',
      categories: 'id, type',
      budgets: 'id, category_id, [month+year]',
      goals: 'id, status',
      syncQueue: '++id, table, operation, created_at'
    });
  }
}

export const db = new FinTrackDB();
