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

export const DEFAULT_CATEGORIES: Category[] = [
  // --- Kategori Pemasukan (Income) ---
  { id: 'cat-inc-1', name: 'Gaji Pokok', type: 'Income', icon: 'Briefcase' },
  { id: 'cat-inc-2', name: 'Bonus & THR', type: 'Income', icon: 'Gift' },
  { id: 'cat-inc-3', name: 'Investasi & Dividen', type: 'Income', icon: 'TrendingUp' },
  { id: 'cat-inc-4', name: 'Bisnis / Usaha', type: 'Income', icon: 'Store' },
  { id: 'cat-inc-5', name: 'Freelance / Sampingan', type: 'Income', icon: 'Laptop' },
  { id: 'cat-inc-6', name: 'Hadiah & Hibah', type: 'Income', icon: 'HeartHandshake' },
  { id: 'cat-inc-7', name: 'Pengembalian Dana (Refund)', type: 'Income', icon: 'RotateCcw' },
  { id: 'cat-inc-8', name: 'Pemasukan Lainnya', type: 'Income', icon: 'Coins' },

  // --- Kategori Pengeluaran (Expense) ---
  { id: 'cat-exp-1', name: 'Makanan & Minuman', type: 'Expense', icon: 'Utensils' },
  { id: 'cat-exp-2', name: 'Belanja Bulanan & Sembako', type: 'Expense', icon: 'ShoppingCart' },
  { id: 'cat-exp-3', name: 'Transportasi & Bensin', type: 'Expense', icon: 'Car' },
  { id: 'cat-exp-4', name: 'Tagihan & Utilitas (Listrik, Air, Internet)', type: 'Expense', icon: 'Zap' },
  { id: 'cat-exp-5', name: 'Tempat Tinggal (Sewa / Cicilan)', type: 'Expense', icon: 'Home' },
  { id: 'cat-exp-6', name: 'Kesehatan & Medis', type: 'Expense', icon: 'Stethoscope' },
  { id: 'cat-exp-7', name: 'Pendidikan & Kursus', type: 'Expense', icon: 'GraduationCap' },
  { id: 'cat-exp-8', name: 'Hiburan & Liburan', type: 'Expense', icon: 'Gamepad2' },
  { id: 'cat-exp-9', name: 'Belanja Pakaian & Pribadi', type: 'Expense', icon: 'Shirt' },
  { id: 'cat-exp-10', name: 'Keluarga & Anak', type: 'Expense', icon: 'Users' },
  { id: 'cat-exp-11', name: 'Sedekah, Infaq & Donasi', type: 'Expense', icon: 'Heart' },
  { id: 'cat-exp-12', name: 'Cicilan & Hutang', type: 'Expense', icon: 'CreditCard' },
  { id: 'cat-exp-13', name: 'Perawatan Diri & Salon', type: 'Expense', icon: 'Sparkles' },
  { id: 'cat-exp-14', name: 'Servis Kendaraan', type: 'Expense', icon: 'Wrench' },
  { id: 'cat-exp-15', name: 'Pengeluaran Lainnya', type: 'Expense', icon: 'MoreHorizontal' },
];

export async function seedDefaultCategories(force: boolean = false) {
  const count = await db.categories.count();
  if (count === 0 || force) {
    for (const cat of DEFAULT_CATEGORIES) {
      await db.categories.put(cat);
    }
  }
}

export const db = new FinTrackDB();
