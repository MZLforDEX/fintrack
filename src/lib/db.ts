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

export interface Product {
  id: string;
  barcode: string;
  name: string;
  default_price: number;
  category_id?: string;
  category_name?: string;
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
  products!: Table<Product, string>;
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

    this.version(3).stores({
      transactions: 'id, category_id, type, transaction_date',
      categories: 'id, type',
      budgets: 'id, category_id, [month+year]',
      goals: 'id, status',
      products: 'id, barcode',
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
  if (count < DEFAULT_CATEGORIES.length || force) {
    await db.categories.bulkPut(DEFAULT_CATEGORIES);
  }
}

export const DEFAULT_PRODUCTS: Product[] = [
  // --- MIE INSTAN & MAKANAN CEPAT SAJI ---
  { id: 'prod-1', barcode: '8998866200213', name: 'Indomie Goreng Spesial', default_price: 3500, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-2', barcode: '8998866200022', name: 'Indomie Kuah Ayam Bawang', default_price: 3500, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-3', barcode: '8998866200077', name: 'Indomie Kuah Soto Mie', default_price: 3500, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-4', barcode: '8998866200251', name: 'Indomie Goreng Rendang', default_price: 3800, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-5', barcode: '8992388111019', name: 'Mie Sedaap Goreng', default_price: 3500, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-6', barcode: '8992388111026', name: 'Mie Sedaap Soto', default_price: 3500, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-7', barcode: '8998866600013', name: 'Pop Mie Rasa Ayam', default_price: 6000, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-8', barcode: '8998866600259', name: 'Pop Mie Pedas Dower', default_price: 6500, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-9', barcode: '8997217380017', name: 'Lemonilo Mie Goreng', default_price: 8500, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-10', barcode: '8998866201319', name: 'Sarimi Isi 2 Ayam Kecap', default_price: 4500, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-11', barcode: '8801073110502', name: 'Samyang Hot Chicken Ramen', default_price: 22000, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-12', barcode: '8993175110115', name: 'Bihunku Goreng Spesial', default_price: 4000, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },

  // --- AIR MINERAL, KOPI, TEH & MINUMAN ---
  { id: 'prod-13', barcode: '8992753112111', name: 'Aqua Air Mineral 600ml', default_price: 4000, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-14', barcode: '8992753112210', name: 'Aqua Air Mineral 1500ml', default_price: 7500, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-15', barcode: '8996001600269', name: 'Le Minerale 600ml', default_price: 3500, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-16', barcode: '8996001600276', name: 'Le Minerale 1500ml', default_price: 6500, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-17', barcode: '8992775111116', name: 'Teh Botol Sosro Kotak 250ml', default_price: 4000, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-18', barcode: '8996001414019', name: 'Teh Pucuk Harum 350ml', default_price: 4000, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-19', barcode: '8996001414026', name: 'Teh Pucuk Harum 500ml', default_price: 6500, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-20', barcode: '8992753211111', name: 'Ultra Milk Full Cream 250ml', default_price: 7500, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-21', barcode: '8992753211128', name: 'Ultra Milk Cokelat 250ml', default_price: 7500, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-22', barcode: '8992753211210', name: 'Ultra Milk Full Cream 1000ml (1L)', default_price: 21000, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-23', barcode: '8992753211227', name: 'Ultra Milk Cokelat 1000ml (1L)', default_price: 21000, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-24', barcode: '8992696404443', name: 'Bear Brand Susu Steril 189ml', default_price: 10500, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-25', barcode: '8997009510114', name: 'Cimory UHT Milk Chocolate 250ml', default_price: 7000, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-26', barcode: '8997009510312', name: 'Cimory Yogurt Drink Strawberry 250ml', default_price: 9500, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-27', barcode: '8992781010014', name: 'Yakult Minuman Probiotik (Pack 5x65ml)', default_price: 11500, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-28', barcode: '8992741911111', name: 'Pocari Sweat 500ml', default_price: 8000, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-29', barcode: '8992741911210', name: 'Pocari Sweat Can 330ml', default_price: 7000, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-30', barcode: '8998838320017', name: 'Hydro Coco 250ml', default_price: 7500, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-31', barcode: '8991002104018', name: 'Good Day Cappuccino Botol 250ml', default_price: 7000, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-32', barcode: '8991002104025', name: 'Good Day Moccacino Botol 250ml', default_price: 7000, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-33', barcode: '8992696414114', name: 'Nescafe Can Latte 220ml', default_price: 8500, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-34', barcode: '8996001440018', name: 'Kopiko Lucky Day Coffee 250ml', default_price: 8000, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-35', barcode: '8992761111018', name: 'Coca Cola Botol 390ml', default_price: 6500, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-36', barcode: '8992761111025', name: 'Sprite Botol 390ml', default_price: 6500, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-37', barcode: '8992761111032', name: 'Fanta Strawberry Botol 390ml', default_price: 6500, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-38', barcode: '8999999039011', name: 'Buavita Jus Jambu 245ml', default_price: 8500, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-39', barcode: '8996001416013', name: 'Floridina Orange 350ml', default_price: 3500, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-40', barcode: '8850388100115', name: 'Ichitan Thai Milk Tea 310ml', default_price: 9000, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },

  // --- SNACK, BISKUIT & COKELAT ---
  { id: 'prod-41', barcode: '8998866100117', name: 'Chitato Sapi Panggang 68g', default_price: 11500, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-42', barcode: '8998866100216', name: 'Chitato Lite Rumput Laut 68g', default_price: 11500, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-43', barcode: '8998866101114', name: 'Qtela Keripik Singkong Balado 180g', default_price: 17500, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-44', barcode: '8992760133118', name: 'Oreo Vanilla Biskuit 133g', default_price: 10000, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-45', barcode: '8992760133125', name: 'Oreo Double Stuf 131g', default_price: 11000, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-46', barcode: '8992742011018', name: 'Pocky Chocolate Biscuit Stick 47g', default_price: 9000, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-47', barcode: '8992742011025', name: 'Pocky Strawberry Biscuit Stick 45g', default_price: 9000, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-48', barcode: '8996001301012', name: 'Beng-Beng Wafer Chocolate (Pack 3s)', default_price: 7500, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-49', barcode: '8991001111017', name: 'SilverQueen Milk Chocolate 58g', default_price: 16500, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-50', barcode: '8991001111024', name: 'SilverQueen Cashew 58g', default_price: 16500, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-51', barcode: '8996001351017', name: 'Roma Kelapa Biskuit 300g', default_price: 12500, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-52', barcode: '8996001352014', name: 'Roma Malkist Crackers Abon 135g', default_price: 8500, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-53', barcode: '8996001352021', name: 'Roma Malkist Cokelat 120g', default_price: 8500, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-54', barcode: '8992750111018', name: 'Good Time Cookies Chocochip 72g', default_price: 8500, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-55', barcode: '8993175510113', name: 'Nabati Wafer Keju Richeese 122g', default_price: 7500, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-56', barcode: '8993175510120', name: 'Nabati Wafer Cokelat Richoco 122g', default_price: 7500, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-57', barcode: '8992745110114', name: 'Taro Net Seaweed 65g', default_price: 6000, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },
  { id: 'prod-58', barcode: '8992789110018', name: 'Kusuka Keripik Singkong Original 180g', default_price: 16000, category_id: 'cat-exp-1', category_name: 'Makanan & Minuman' },

  // --- SEMBAKO & DAPUR ---
  { id: 'prod-59', barcode: '8992755112018', name: 'Minyak Goreng Bimoli Pouch 2 Liter', default_price: 38000, category_id: 'cat-exp-2', category_name: 'Belanja Bulanan & Sembako' },
  { id: 'prod-60', barcode: '8991002222019', name: 'Minyak Goreng Tropical Botol 2 Liter', default_price: 39500, category_id: 'cat-exp-2', category_name: 'Belanja Bulanan & Sembako' },
  { id: 'prod-61', barcode: '8997015551019', name: 'Minyak Goreng Sania Pouch 2 Liter', default_price: 36500, category_id: 'cat-exp-2', category_name: 'Belanja Bulanan & Sembako' },
  { id: 'prod-62', barcode: '8992999555018', name: 'Beras Ramos Setra Premium 5 Kg', default_price: 74000, category_id: 'cat-exp-2', category_name: 'Belanja Bulanan & Sembako' },
  { id: 'prod-63', barcode: '8993005555017', name: 'Beras Topi Koki Setra Ramos 5 Kg', default_price: 76000, category_id: 'cat-exp-2', category_name: 'Belanja Bulanan & Sembako' },
  { id: 'prod-64', barcode: '8992765111014', name: 'Gula Pasir Gulaku Premium 1 Kg', default_price: 18000, category_id: 'cat-exp-2', category_name: 'Belanja Bulanan & Sembako' },
  { id: 'prod-65', barcode: '8999999052010', name: 'Kecap Manis Bango Pouch 520ml', default_price: 24500, category_id: 'cat-exp-2', category_name: 'Belanja Bulanan & Sembako' },
  { id: 'prod-66', barcode: '8991001520017', name: 'Kecap Manis ABC Pouch 520ml', default_price: 22000, category_id: 'cat-exp-2', category_name: 'Belanja Bulanan & Sembako' },
  { id: 'prod-67', barcode: '8991001335017', name: 'Saus Sambal ABC Botol 335ml', default_price: 15500, category_id: 'cat-exp-2', category_name: 'Belanja Bulanan & Sembako' },
  { id: 'prod-68', barcode: '8999999020019', name: 'Blue Band Margarin Serbaguna 200g', default_price: 11500, category_id: 'cat-exp-2', category_name: 'Belanja Bulanan & Sembako' },
  { id: 'prod-69', barcode: '8998866300012', name: 'Tepung Terigu Segitiga Biru 1 Kg', default_price: 14500, category_id: 'cat-exp-2', category_name: 'Belanja Bulanan & Sembako' },
  { id: 'prod-70', barcode: '8999999023010', name: 'Royco Rasa Sapi Bumbu Pelezat 230g', default_price: 11500, category_id: 'cat-exp-2', category_name: 'Belanja Bulanan & Sembako' },
  { id: 'prod-71', barcode: '8999999023027', name: 'Royco Rasa Ayam Bumbu Pelezat 230g', default_price: 11500, category_id: 'cat-exp-2', category_name: 'Belanja Bulanan & Sembako' },
  { id: 'prod-72', barcode: '8993007111012', name: 'Santan Kara Siap Pakai 200ml', default_price: 10000, category_id: 'cat-exp-2', category_name: 'Belanja Bulanan & Sembako' },
  { id: 'prod-73', barcode: '8992753331017', name: 'Kental Manis Frisian Flag Pouch 545g', default_price: 18500, category_id: 'cat-exp-2', category_name: 'Belanja Bulanan & Sembako' },
  { id: 'prod-74', barcode: '8991002111016', name: 'Kopi Kapal Api Spesial Mix (10x24g)', default_price: 15000, category_id: 'cat-exp-2', category_name: 'Belanja Bulanan & Sembako' },
  { id: 'prod-75', barcode: '8999999030018', name: 'Teh Celup SariWangi Kotak Isi 30', default_price: 8000, category_id: 'cat-exp-2', category_name: 'Belanja Bulanan & Sembako' },

  // --- MANDI, PERAWATAN DIRI & KESEHATAN ---
  { id: 'prod-76', barcode: '8999999011017', name: 'Sabun Mandi Lifebuoy Total 10 110g', default_price: 5000, category_id: 'cat-exp-13', category_name: 'Perawatan Diri & Salon' },
  { id: 'prod-77', barcode: '8999999045012', name: 'Sabun Mandi Cair Lifebuoy Refill 450ml', default_price: 24500, category_id: 'cat-exp-13', category_name: 'Perawatan Diri & Salon' },
  { id: 'prod-78', barcode: '8992727111013', name: 'Sabun Mandi Dettol Original Bar 105g', default_price: 8500, category_id: 'cat-exp-13', category_name: 'Perawatan Diri & Salon' },
  { id: 'prod-79', barcode: '8999999016012', name: 'Shampo Sunsilk Black Shine 160ml', default_price: 23000, category_id: 'cat-exp-13', category_name: 'Perawatan Diri & Salon' },
  { id: 'prod-80', barcode: '8992749160016', name: 'Shampo Head & Shoulders Cool Menthol 160ml', default_price: 28500, category_id: 'cat-exp-13', category_name: 'Perawatan Diri & Salon' },
  { id: 'prod-81', barcode: '8999999019013', name: 'Pasta Gigi Pepsodent Pencegah Gigi Berlubang 190g', default_price: 15500, category_id: 'cat-exp-13', category_name: 'Perawatan Diri & Salon' },
  { id: 'prod-82', barcode: '8992782100011', name: 'Pasta Gigi Sensodyne Fresh Mint 100g', default_price: 34000, category_id: 'cat-exp-13', category_name: 'Perawatan Diri & Salon' },
  { id: 'prod-83', barcode: '8992711100016', name: 'Sabun Cuci Muka Biore Men Facial Foam 100g', default_price: 32000, category_id: 'cat-exp-13', category_name: 'Perawatan Diri & Salon' },
  { id: 'prod-84', barcode: '8992304014110', name: 'Sabun Cuci Muka Garnier Men AcnoFight 100ml', default_price: 35000, category_id: 'cat-exp-13', category_name: 'Perawatan Diri & Salon' },
  { id: 'prod-85', barcode: '8999999050016', name: 'Deodorant Rexona Men Roll On 50ml', default_price: 21500, category_id: 'cat-exp-13', category_name: 'Perawatan Diri & Salon' },
  { id: 'prod-86', barcode: '8992744060014', name: 'Minyak Kayu Putih Cap Lang 60ml', default_price: 24500, category_id: 'cat-exp-6', category_name: 'Kesehatan & Medis' },
  { id: 'prod-87', barcode: '8992744120015', name: 'Minyak Kayu Putih Cap Lang 120ml', default_price: 46000, category_id: 'cat-exp-6', category_name: 'Kesehatan & Medis' },
  { id: 'prod-88', barcode: '8998888050018', name: 'Tolak Angin Cair Sido Muncul (Box 5s)', default_price: 21000, category_id: 'cat-exp-6', category_name: 'Kesehatan & Medis' },
  { id: 'prod-89', barcode: '8992782010013', name: 'Panadol Biru Ekstra (Blister 10s)', default_price: 16000, category_id: 'cat-exp-6', category_name: 'Kesehatan & Medis' },
  { id: 'prod-90', barcode: '8992743010010', name: 'Promag Obat Maag (Blister 10s)', default_price: 10500, category_id: 'cat-exp-6', category_name: 'Kesehatan & Medis' },

  // --- RUMAH TANGGA & PEMBERSIH ---
  { id: 'prod-91', barcode: '8999999075019', name: 'Deterjen Rinso Cair Anti Noda 750ml', default_price: 22000, category_id: 'cat-exp-15', category_name: 'Pengeluaran Lainnya' },
  { id: 'prod-92', barcode: '8992388085013', name: 'Deterjen Daia Bubuk Floral 850g', default_price: 18500, category_id: 'cat-exp-15', category_name: 'Pengeluaran Lainnya' },
  { id: 'prod-93', barcode: '8999999072018', name: 'Pewangi Molto All-in-1 Sekali Bilas 720ml', default_price: 24000, category_id: 'cat-exp-15', category_name: 'Pengeluaran Lainnya' },
  { id: 'prod-94', barcode: '8999999070014', name: 'Sabun Cuci Piring Sunlight Jeruk Nipis 700ml', default_price: 15500, category_id: 'cat-exp-15', category_name: 'Pengeluaran Lainnya' },
  { id: 'prod-95', barcode: '8998866680015', name: 'Sabun Cuci Piring Mama Lemon 680ml', default_price: 13500, category_id: 'cat-exp-15', category_name: 'Pengeluaran Lainnya' },
  { id: 'prod-96', barcode: '8999999078010', name: 'Pembersih Lantai Wipol Karbol Wangi 780ml', default_price: 19500, category_id: 'cat-exp-15', category_name: 'Pengeluaran Lainnya' },
  { id: 'prod-97', barcode: '8992736600010', name: 'Baygon Aerosol Anti Nyamuk 600ml', default_price: 41500, category_id: 'cat-exp-15', category_name: 'Pengeluaran Lainnya' },
  { id: 'prod-98', barcode: '8993006250010', name: 'Tisu Wajah Paseo Smart Facial 250s', default_price: 16500, category_id: 'cat-exp-15', category_name: 'Pengeluaran Lainnya' },
  { id: 'prod-99', barcode: '8992744050015', name: 'Tisu Basah Mitu Baby Wipes (50s)', default_price: 17500, category_id: 'cat-exp-15', category_name: 'Pengeluaran Lainnya' },
  { id: 'prod-100', barcode: '8991003004010', name: 'Baterai ABC Alkaline AA (Pack 4s)', default_price: 24000, category_id: 'cat-exp-15', category_name: 'Pengeluaran Lainnya' },
];

export async function seedDefaultProducts(force: boolean = false) {
  const count = await db.products.count();
  if (count < DEFAULT_PRODUCTS.length || force) {
    await db.products.bulkPut(DEFAULT_PRODUCTS);
  }
}

export const db = new FinTrackDB();

