"use client";

import { useState, useRef, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowDownIcon, 
  ArrowUpIcon, 
  WalletIcon, 
  TargetIcon, 
  Activity, 
  Cloud, 
  WifiOff, 
  RefreshCw, 
  Plus, 
  ScanBarcode, 
  PackagePlus, 
  Barcode,
  Eye,
  EyeOff,
  Receipt,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Lightbulb
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Transaction, Product } from '@/lib/db';
import { useSync } from '@/components/providers/SyncProvider';
import { BarcodeScannerModal } from '@/components/scanner/BarcodeScannerModal';
import { ReceiptScannerModal } from '@/components/scanner/ReceiptScannerModal';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from "recharts";

export default function DashboardClient() {
  const { isOnline, isSyncing, syncNow } = useSync();

  // Privacy Mode State (Mask Balances)
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("fintrack_privacy_mode");
      if (saved !== null) {
        setIsPrivacyMode(saved === "true");
      }
    } catch {}
  }, []);

  const togglePrivacyMode = () => {
    const next = !isPrivacyMode;
    setIsPrivacyMode(next);
    try {
      localStorage.setItem("fintrack_privacy_mode", String(next));
    } catch {}
    if (next) {
      toast.info("Mode Privasi Aktif: Saldo disembunyikan.");
    } else {
      toast.info("Mode Privasi Nonaktif: Saldo ditampilkan.");
    }
  };

  // Quick Add Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'Income' | 'Expense'>('Expense');
  const [categoryId, setCategoryId] = useState('');
  const [txDate, setTxDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [txTime, setTxTime] = useState(() => format(new Date(), 'HH:mm'));
  const [description, setDescription] = useState('');

  // Barcode Scanner & Product Memory State
  const isHandlingScanRef = useRef(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isRegisterProductOpen, setIsRegisterProductOpen] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productCategory, setProductCategory] = useState('');

  // Receipt Scanner State
  const [isReceiptScannerOpen, setIsReceiptScannerOpen] = useState(false);

  // Fetch from local Dexie DB
  const allTransactions = useLiveQuery(() => db.transactions.toArray()) || [];
  const goals = useLiveQuery(() => db.goals.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];

  const filteredCategories = categories.filter(c => c.type === type);
  const expenseCategories = categories.filter(c => c.type === 'Expense');

  const handleOpenAddModal = () => {
    setAmount('');
    setDescription('');
    setTxDate(format(new Date(), 'yyyy-MM-dd'));
    setTxTime(format(new Date(), 'HH:mm'));
    const defaultCat = categories.filter(c => c.type === type)[0]?.id || '';
    setCategoryId(defaultCat);
    setIsAddOpen(true);
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !categoryId) {
      toast.error('Mohon lengkapi nominal dan kategori transaksi.');
      return;
    }

    const catName = categories.find(c => c.id === categoryId)?.name || 'Lainnya';
    const nowIso = new Date().toISOString();
    const fullDateStr = `${txDate}T${txTime || '12:00'}:00.000Z`;

    const newTx: Transaction = {
      id: uuidv4(),
      category_id: categoryId,
      type,
      amount: Number(amount),
      description: description.trim() || undefined,
      transaction_date: fullDateStr,
      category_name: catName,
      created_at: nowIso,
    };

    try {
      await db.transactions.add(newTx);
      await db.syncQueue.add({
        operation: 'INSERT',
        table: 'transactions',
        payload: {
          id: newTx.id,
          category_id: newTx.category_id,
          type: newTx.type,
          amount: newTx.amount,
          description: newTx.description || '',
          transaction_date: newTx.transaction_date,
        },
        created_at: nowIso,
      });

      toast.success(`Transaksi ${type === 'Income' ? 'Pemasukan' : 'Pengeluaran'} berhasil dicatat!`);
      setIsAddOpen(false);
    } catch (err) {
      toast.error('Gagal menambahkan transaksi.');
    }
  };

  const handleBarcodeDetected = async (barcode: string) => {
    if (isHandlingScanRef.current) return;
    isHandlingScanRef.current = true;
    setIsScannerOpen(false);

    try {
      const existingProduct = await db.products.where('barcode').equals(barcode).first();

      if (existingProduct) {
        // Known product in memory -> Record transaction directly
        const nowIso = new Date().toISOString();
        const newTxId = uuidv4();
        const catId = existingProduct.category_id || (expenseCategories[0]?.id || 'cat-exp-1');
        const catName = categories.find(c => c.id === catId)?.name || existingProduct.category_name || 'Pengeluaran';

        const txPayload: Transaction = {
          id: newTxId,
          category_id: catId,
          type: 'Expense',
          amount: Number(existingProduct.default_price),
          description: existingProduct.name,
          transaction_date: nowIso,
          category_name: catName,
          created_at: nowIso,
        };

        await db.transactions.add(txPayload);
        await db.syncQueue.add({
          operation: 'INSERT',
          table: 'transactions',
          payload: {
            id: txPayload.id,
            category_id: txPayload.category_id,
            type: txPayload.type,
            amount: txPayload.amount,
            description: txPayload.description || '',
            transaction_date: txPayload.transaction_date,
          },
          created_at: nowIso,
        });

        toast.success(`Transaksi berhasil dicatat otomatis: "${existingProduct.name}" (${formatCurrency(existingProduct.default_price)})`, {
          id: 'barcode-scan-toast',
          duration: 3500,
        });
      } else {
        // New barcode -> Open registration dialog
        setScannedBarcode(barcode);
        setProductName('');
        setProductPrice('');
        setProductCategory(expenseCategories[0]?.id || '');
        setIsRegisterProductOpen(true);
        toast.info('Barcode baru terdeteksi! Masukkan nama & harga barang.', {
          id: 'barcode-scan-toast',
          duration: 4000,
        });
      }
    } catch (err) {
      toast.error('Gagal memproses data barcode.', { id: 'barcode-scan-toast' });
    } finally {
      setTimeout(() => {
        isHandlingScanRef.current = false;
      }, 800);
    }
  };

  const handleRegisterProductAndTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName || !productPrice || !productCategory) {
      toast.error('Mohon lengkapi semua data barang.');
      return;
    }

    const catName = categories.find(c => c.id === productCategory)?.name || 'Lainnya';
    const nowIso = new Date().toISOString();

    try {
      const newProduct: Product = {
        id: uuidv4(),
        barcode: scannedBarcode,
        name: productName.trim(),
        default_price: Number(productPrice),
        category_id: productCategory,
        category_name: catName,
        created_at: nowIso,
        updated_at: nowIso,
      };

      await db.products.put(newProduct);

      const newTxId = uuidv4();
      const txPayload: Transaction = {
        id: newTxId,
        category_id: productCategory,
        type: 'Expense',
        amount: Number(productPrice),
        description: newProduct.name,
        transaction_date: nowIso,
        category_name: catName,
        created_at: nowIso,
      };

      await db.transactions.add(txPayload);
      await db.syncQueue.add({
        operation: 'INSERT',
        table: 'transactions',
        payload: {
          id: txPayload.id,
          category_id: txPayload.category_id,
          type: txPayload.type,
          amount: txPayload.amount,
          description: txPayload.description || '',
          transaction_date: txPayload.transaction_date,
        },
        created_at: nowIso,
      });

      toast.success(`Barang baru didaftarkan & transaksi dicatat: "${newProduct.name}" (${formatCurrency(newProduct.default_price)})`);
      setIsRegisterProductOpen(false);
    } catch (err) {
      toast.error('Gagal menyimpan barang baru.');
    }
  };

  const handleSaveReceiptTransaction = async (data: {
    amount: number;
    description: string;
    category_id: string;
    transaction_date: string;
  }) => {
    const catName = categories.find(c => c.id === data.category_id)?.name || 'Pengeluaran';
    const nowIso = new Date().toISOString();
    const newTxId = uuidv4();

    const txPayload: Transaction = {
      id: newTxId,
      category_id: data.category_id,
      type: 'Expense',
      amount: data.amount,
      description: data.description,
      transaction_date: data.transaction_date,
      category_name: catName,
      created_at: nowIso,
    };

    await db.transactions.add(txPayload);
    await db.syncQueue.add({
      operation: 'INSERT',
      table: 'transactions',
      payload: {
        id: txPayload.id,
        category_id: txPayload.category_id,
        type: txPayload.type,
        amount: txPayload.amount,
        description: txPayload.description || '',
        transaction_date: txPayload.transaction_date,
      },
      created_at: nowIso,
    });
  };
  
  let totalBalance = 0;
  let currentMonthIncome = 0;
  let currentMonthExpense = 0;
  
  const date = new Date();
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();

  // 6 Months data for chart
  const monthlyData: { month: string; rawMonth: string; income: number; expense: number }[] = [];
  
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const monthName = d.toLocaleString('id-ID', { month: 'short' });
    const rawMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyData.push({
      month: monthName,
      rawMonth,
      income: 0,
      expense: 0,
    });
  }

  allTransactions.forEach(tx => {
    // Total Balance
    if (tx.type === 'Income') totalBalance += Number(tx.amount);
    if (tx.type === 'Expense') totalBalance -= Number(tx.amount);

    // Current Month
    if (tx.transaction_date >= firstDayOfMonth) {
      if (tx.type === 'Income') currentMonthIncome += Number(tx.amount);
      if (tx.type === 'Expense') currentMonthExpense += Number(tx.amount);
    }

    // Chart grouping
    try {
      const txDate = new Date(tx.transaction_date);
      if (!isNaN(txDate.getTime())) {
        const rawMonth = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
        const target = monthlyData.find(m => m.rawMonth === rawMonth);
        if (target) {
          if (tx.type === 'Income') target.income += Number(tx.amount);
          if (tx.type === 'Expense') target.expense += Number(tx.amount);
        }
      }
    } catch {}
  });

  const hasChartData = monthlyData.some(m => m.income > 0 || m.expense > 0);

  // Goals
  const totalGoals = goals.length;
  const completedGoals = goals.filter(g => g.status === 'Completed').length;

  // Recent 5 transactions
  const recentTransactions = [...allTransactions]
    .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
    .slice(0, 5);

  // Mask currency helper for Privacy Mode
  const maskAmount = (val: number) => {
    if (isPrivacyMode) return 'Rp •••••••';
    return formatCurrency(val);
  };

  // Smart Financial Insights Computations
  const smartInsights = useMemo(() => {
    const currentMonthExpenses = allTransactions.filter(
      tx => tx.type === 'Expense' && tx.transaction_date >= firstDayOfMonth
    );

    // 1. Group by category to find top expense
    const categoryTotals: Record<string, { name: string; amount: number }> = {};
    currentMonthExpenses.forEach(tx => {
      const catId = tx.category_id || 'other';
      const catName = tx.category_name || categories.find(c => c.id === catId)?.name || 'Lainnya';
      if (!categoryTotals[catId]) {
        categoryTotals[catId] = { name: catName, amount: 0 };
      }
      categoryTotals[catId].amount += Number(tx.amount);
    });

    const categoryList = Object.values(categoryTotals).sort((a, b) => b.amount - a.amount);
    const topCategory = categoryList[0] || null;
    const topCategoryPercent = currentMonthExpense > 0 && topCategory
      ? Math.round((topCategory.amount / currentMonthExpense) * 100)
      : 0;

    // 2. Savings Rate & Health Score
    const savingsRate = currentMonthIncome > 0
      ? Math.round(((currentMonthIncome - currentMonthExpense) / currentMonthIncome) * 100)
      : (currentMonthExpense === 0 ? 100 : 0);

    let healthScore = 50;
    let healthLabel = 'Cukup Sehat';
    let healthColor = 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';

    if (savingsRate >= 40) {
      healthScore = 95;
      healthLabel = 'Sangat Sehat';
      healthColor = 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    } else if (savingsRate >= 20) {
      healthScore = 80;
      healthLabel = 'Sehat & Terkendali';
      healthColor = 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    } else if (savingsRate >= 5) {
      healthScore = 65;
      healthLabel = 'Cukup Waspada';
      healthColor = 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
    } else {
      healthScore = 35;
      healthLabel = 'Perlu Berhemat';
      healthColor = 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20';
    }

    // 3. Daily Burn Rate
    const dayOfMonth = Math.max(1, new Date().getDate());
    const dailyAverage = Math.round(currentMonthExpense / dayOfMonth);

    return {
      savingsRate,
      healthScore,
      healthLabel,
      healthColor,
      topCategory,
      topCategoryPercent,
      dailyAverage,
    };
  }, [allTransactions, currentMonthIncome, currentMonthExpense, firstDayOfMonth, categories]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border text-popover-foreground rounded-lg shadow-lg p-3 text-xs sm:text-sm">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 my-1">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-muted-foreground">{entry.name}:</span>
              </div>
              <span className="font-medium">{formatCurrency(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex-1 space-y-6 p-4 sm:space-y-8 sm:p-8 sm:pt-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h2>

        <div className="flex items-center gap-2">
          {/* Privacy Toggle Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={togglePrivacyMode}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            title={isPrivacyMode ? "Tampilkan Saldo" : "Sembunyikan Saldo (Mode Privasi)"}
          >
            {isPrivacyMode ? <EyeOff className="h-3.5 w-3.5 text-amber-500" /> : <Eye className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{isPrivacyMode ? "Buka Saldo" : "Sembunyikan"}</span>
          </Button>

          {/* Small Status Indicator */}
          <button
            type="button"
            onClick={() => isOnline && !isSyncing && syncNow()}
            disabled={!isOnline || isSyncing}
            className="transition-all hover:opacity-80 active:scale-95 focus:outline-none"
            title={!isOnline ? "Aplikasi sedang offline (Data tersimpan di perangkat lokal)" : isSyncing ? "Sedang menyinkronkan data ke cloud..." : "Online • Klik untuk sinkronkan data ke cloud"}
          >
            {!isOnline ? (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <WifiOff className="h-3 w-3" />
                <span>Offline</span>
              </div>
            ) : isSyncing ? (
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 animate-pulse">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Sinkron...</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                <Cloud className="h-3 w-3" />
                <span>Online</span>
              </div>
            )}
          </button>
        </div>
      </div>
      
      {/* 4 Top Metric Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Balance */}
        <Card className="hover:shadow-lg transition-shadow col-span-2 sm:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-1.5">
              <CardTitle className="text-sm font-medium">Total Saldo</CardTitle>
              <button 
                type="button" 
                onClick={togglePrivacyMode}
                className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
                title={isPrivacyMode ? "Tampilkan Saldo" : "Sembunyikan Saldo"}
              >
                {isPrivacyMode ? <EyeOff className="h-3.5 w-3.5 text-amber-500" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            <WalletIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{maskAmount(totalBalance)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Keseluruhan saldo saat ini
            </p>
          </CardContent>
        </Card>

        {/* Pemasukan */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Pemasukan</CardTitle>
            <ArrowUpIcon className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-emerald-500">{maskAmount(currentMonthIncome)}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
              Bulan ini
            </p>
          </CardContent>
        </Card>

        {/* Pengeluaran */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Pengeluaran</CardTitle>
            <ArrowDownIcon className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-destructive">{maskAmount(currentMonthExpense)}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
              Bulan ini
            </p>
          </CardContent>
        </Card>

        {/* Goals Progress */}
        <Card className="hover:shadow-lg transition-shadow col-span-2 sm:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Financial Goals</CardTitle>
            <TargetIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{completedGoals} / {totalGoals}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Goals tercapai dari total goals
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Smart Financial Insights Widget */}
      <Card className="border shadow-sm bg-gradient-to-br from-card via-card to-primary/5">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg">Analisis Pintar & Wawasan Keuangan</CardTitle>
                <CardDescription className="text-xs">
                  Ringkasan kesehatan finansial dan pola pengeluaran bulan ini
                </CardDescription>
              </div>
            </div>

            {/* Health Score Badge */}
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${smartInsights.healthColor} self-start sm:self-auto`}>
              <CheckCircle className="h-3.5 w-3.5" />
              <span>Skor: {smartInsights.healthScore}/100 • {smartInsights.healthLabel}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="grid gap-3 sm:grid-cols-3 pt-2 border-t text-xs sm:text-sm">
            {/* Savings Rate */}
            <div className="p-3 rounded-xl bg-muted/30 border space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs">Tingkat Tabungan</span>
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <div className="text-lg sm:text-xl font-bold text-foreground">
                {smartInsights.savingsRate}%
              </div>
              <p className="text-[11px] text-muted-foreground">
                Dari total pemasukan yang tersisa
              </p>
            </div>

            {/* Top Expense Category */}
            <div className="p-3 rounded-xl bg-muted/30 border space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs">Kategori Terboros</span>
                <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
              </div>
              <div className="text-base sm:text-lg font-bold text-foreground truncate">
                {smartInsights.topCategory ? smartInsights.topCategory.name : "Belum Ada"}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {smartInsights.topCategory ? `${smartInsights.topCategoryPercent}% (${maskAmount(smartInsights.topCategory.amount)})` : "Tidak ada pengeluaran"}
              </p>
            </div>

            {/* Daily Burn Rate */}
            <div className="p-3 rounded-xl bg-muted/30 border space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs">Rata-Rata Harian</span>
                <Activity className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="text-base sm:text-lg font-bold text-foreground">
                {maskAmount(smartInsights.dailyAverage)} <span className="text-xs font-normal text-muted-foreground">/hari</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Kecepatan belanja harian bulan ini
              </p>
            </div>
          </div>

          {/* Actionable Advice Tip */}
          <div className="flex items-start gap-2.5 mt-3 p-3 rounded-xl bg-primary/5 border border-primary/10 text-xs text-foreground/90">
            <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-primary">Saran Cerdas: </span>
              {smartInsights.savingsRate >= 30
                ? "Pola keuangan Anda sangat sehat! Pertimbangkan untuk mengalokasikan sebagian surplus dana ke Financial Goals atau Tabungan Darurat."
                : smartInsights.topCategory
                ? `Pengeluaran kategori "${smartInsights.topCategory.name}" mendominasi ${smartInsights.topCategoryPercent}% dari belanja Anda. Mengurangi sedikit pos ini dapat meningkatkan tabungan bulanan.`
                : "Mulai catat transaksi secara rutin untuk mendapatkan wawasan dan pola keuangan otomatis yang lebih akurat."}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Aktivitas Keuangan Chart */}
        <Card className="col-span-4 hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Aktivitas Keuangan</CardTitle>
            <CardDescription>
              Grafik perbandingan pemasukan dan pengeluaran 6 bulan terakhir.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-0 sm:pl-2">
            {!hasChartData ? (
              <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Activity className="h-10 w-10 opacity-20" />
                <p className="text-sm font-medium">Belum ada data aktivitas transaksi.</p>
              </div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                    <XAxis 
                      dataKey="month" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      dy={5}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toFixed(0)}jt` : val >= 1000 ? `${(val / 1000).toFixed(0)}rb` : val}
                      width={55}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="income" name="Pemasukan" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="expense" name="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Transaksi Terakhir */}
        <Card className="col-span-3 hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Transaksi Terakhir</CardTitle>
            <CardDescription>
              5 transaksi terakhir yang kamu catat.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {recentTransactions.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  Belum ada transaksi.
                </div>
              ) : (
                recentTransactions.map((tx: any) => (
                  <div key={tx.id} className="flex items-center">
                    <div className={`mr-4 flex h-9 w-9 items-center justify-center rounded-full border ${tx.type === 'Income' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
                      {tx.type === 'Income' ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />}
                    </div>
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {tx.description || tx.category_name || 'Transaksi'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(tx.transaction_date), "d MMM yyyy, HH:mm", { locale: id })}
                      </p>
                    </div>
                    <div className={`ml-auto font-medium ${tx.type === 'Income' ? 'text-emerald-500' : ''}`}>
                      {isPrivacyMode ? '••••••' : (tx.type === 'Income' ? '+' : '-') + ' ' + formatCurrency(Number(tx.amount))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floating Action Button (+) Tepat Mengambang di Atas Tombol Kalender (Center) */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 sm:bottom-8 sm:right-8 sm:left-auto sm:translate-x-0 z-40">
        <Button
          type="button"
          onClick={handleOpenAddModal}
          className="h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-2xl bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center p-0 transition-all hover:scale-110 active:scale-95 border-2 border-background ring-4 ring-primary/20"
          title="Tambah Transaksi Cepat"
          aria-label="Tambah Transaksi Cepat"
        >
          <Plus className="h-6 w-6 sm:h-7 sm:w-7" />
        </Button>
      </div>

      {/* Quick Add Transaction Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              Tambah Transaksi Cepat
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveTransaction} className="space-y-4 pt-2">
            {/* Type Selector */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={type === 'Expense' ? 'default' : 'outline'}
                className={type === 'Expense' ? 'bg-rose-600 hover:bg-rose-700 text-white' : ''}
                onClick={() => {
                  setType('Expense');
                  const expCats = categories.filter(c => c.type === 'Expense');
                  setCategoryId(expCats[0]?.id || '');
                }}
              >
                Pengeluaran
              </Button>
              <Button
                type="button"
                variant={type === 'Income' ? 'default' : 'outline'}
                className={type === 'Income' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                onClick={() => {
                  setType('Income');
                  const incCats = categories.filter(c => c.type === 'Income');
                  setCategoryId(incCats[0]?.id || '');
                }}
              >
                Pemasukan
              </Button>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label>Nominal (Rp)</Label>
              <Input
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Contoh: 50000"
                required
                autoFocus
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={categoryId} onValueChange={setCategoryId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Kategori" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Tanggal</Label>
                <Input
                  type="date"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Jam</Label>
                <Input
                  type="time"
                  value={txTime}
                  onChange={(e) => setTxTime(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Deskripsi / Catatan (Opsional)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Contoh: Beli makan siang"
              />
            </div>

            {/* Quick Action Tools Barcode & Receipt */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddOpen(false);
                  setIsScannerOpen(true);
                }}
                className="gap-1.5 border-primary/30 hover:bg-primary/10 text-primary font-medium text-xs"
                title="Pindai barcode barang"
              >
                <ScanBarcode className="h-4 w-4" />
                Scan Barcode
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddOpen(false);
                  setIsReceiptScannerOpen(true);
                }}
                className="gap-1.5 border-primary/30 hover:bg-primary/10 text-primary font-medium text-xs"
                title="Foto struk belanja kasir"
              >
                <Receipt className="h-4 w-4" />
                Scan Struk
              </Button>
            </div>

            <Button type="submit" className="w-full font-semibold">
              Simpan Transaksi
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleBarcodeDetected}
      />

      {/* Receipt OCR Scanner Modal */}
      <ReceiptScannerModal
        isOpen={isReceiptScannerOpen}
        onClose={() => setIsReceiptScannerOpen(false)}
        onSaveTransaction={handleSaveReceiptTransaction}
        categories={categories}
      />

      {/* Register New Scanned Product Dialog */}
      <Dialog open={isRegisterProductOpen} onOpenChange={setIsRegisterProductOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <PackagePlus className="h-5 w-5 text-primary" />
              Daftarkan Barang Baru
            </DialogTitle>
            <DialogDescription className="text-xs">
              Barcode belum terdaftar. Masukkan detail barang untuk disimpan ke memori dan dicatat ke transaksi.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRegisterProductAndTransaction} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Nomor Barcode</Label>
              <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-muted/50 font-mono text-xs font-semibold">
                <Barcode className="h-4 w-4 text-primary" />
                <span>{scannedBarcode}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nama Barang</Label>
              <Input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Contoh: Kopi Kapal Api 65g"
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Harga (Rp)</Label>
              <Input
                type="number"
                min="0"
                value={productPrice}
                onChange={(e) => setProductPrice(e.target.value)}
                placeholder="Contoh: 8500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={productCategory} onValueChange={setProductCategory} required>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Kategori" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full">
              Simpan & Catat Transaksi
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

