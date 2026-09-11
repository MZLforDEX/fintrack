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
  Lightbulb,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  ChevronDown,
  ChevronUp,
  Sun,
  SlidersHorizontal,
  Coins
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
import { 
  buildTransactionDateTime, 
  format24HourTime, 
  getLocalDateString, 
  getLocal24TimeString, 
  parseTransactionDate 
} from '@/lib/dateUtils';
import { LiveClock } from '@/components/ui/live-clock';
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

  // Privacy Mode State (Mask Balances - Default HIDE)
  const [isPrivacyMode, setIsPrivacyMode] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("fintrack_privacy_mode");
      if (saved !== null) {
        setIsPrivacyMode(saved === "true");
      } else {
        // Default to TRUE (hide) on initial launch
        setIsPrivacyMode(true);
        localStorage.setItem("fintrack_privacy_mode", "true");
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
  const [txDate, setTxDate] = useState(() => getLocalDateString());
  const [txTime, setTxTime] = useState(() => getLocal24TimeString());
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

  // 6-Month Budget Analysis Expandable State
  const [showSixMonthDetails, setShowSixMonthDetails] = useState(true);

  // Batas Wajar Harian State & Settings
  const [activeLimitTab, setActiveLimitTab] = useState<'daily' | 'monthly'>('daily');
  const [showDailyDetails, setShowDailyDetails] = useState(true);
  const [customDailyLimit, setCustomDailyLimit] = useState<number>(0);
  const [isCustomLimitDialogOpen, setIsCustomLimitDialogOpen] = useState(false);
  const [tempCustomDailyLimit, setTempCustomDailyLimit] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('fintrack_custom_daily_limit');
      if (saved) {
        const val = Number(saved);
        if (!isNaN(val) && val > 0) {
          setCustomDailyLimit(val);
        }
      }
    } catch {}
  }, []);

  const handleOpenCustomLimitDialog = () => {
    setTempCustomDailyLimit(
      customDailyLimit > 0
        ? String(customDailyLimit)
        : smartInsights.autoDailyLimit > 0
        ? String(smartInsights.autoDailyLimit)
        : ''
    );
    setIsCustomLimitDialogOpen(true);
  };

  const handleSaveCustomDailyLimit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(tempCustomDailyLimit);
    if (isNaN(val) || val <= 0) {
      toast.error('Nominal batas wajar harian harus lebih besar dari 0.');
      return;
    }
    setCustomDailyLimit(val);
    try {
      localStorage.setItem('fintrack_custom_daily_limit', String(val));
    } catch {}
    toast.success(`Batas wajar harian berhasil diatur ke ${formatCurrency(val)}/hari`);
    setIsCustomLimitDialogOpen(false);
  };

  const handleResetToAutoDailyLimit = () => {
    setCustomDailyLimit(0);
    try {
      localStorage.removeItem('fintrack_custom_daily_limit');
    } catch {}
    toast.success('Batas wajar harian dikembalikan ke mode otomatis (berdasarkan alokasi saldo 6 bulan)');
    setIsCustomLimitDialogOpen(false);
  };

  // Fetch from local Dexie DB
  const allTransactions = useLiveQuery(() => db.transactions.toArray()) || [];
  const goals = useLiveQuery(() => db.goals.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];

  const filteredCategories = categories.filter(c => c.type === type);
  const expenseCategories = categories.filter(c => c.type === 'Expense');

  const handleOpenAddModal = () => {
    setAmount('');
    setDescription('');
    setTxDate(getLocalDateString());
    setTxTime(getLocal24TimeString());
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
    const fullDateStr = buildTransactionDateTime(txDate, txTime);

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

      if (
        type === 'Expense' &&
        txDate === smartInsights.todayStr &&
        smartInsights.safeDailyLimit > 0 &&
        (smartInsights.todayExpense + Number(amount)) > smartInsights.safeDailyLimit
      ) {
        toast.warning(
          `Pengeluaran dicatat. Peringatan: Total belanja hari ini melampaui batas wajar harian (${maskAmount(smartInsights.safeDailyLimit)})!`,
          { duration: 5000 }
        );
      } else {
        toast.success(`Transaksi ${type === 'Income' ? 'Pemasukan' : 'Pengeluaran'} berhasil dicatat!`);
      }
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
          transaction_date: buildTransactionDateTime(getLocalDateString(), getLocal24TimeString()),
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
        transaction_date: buildTransactionDateTime(getLocalDateString(), getLocal24TimeString()),
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
  
  const {
    totalBalance,
    currentMonthIncome,
    currentMonthExpense,
    monthlyData,
    hasChartData,
    recentTransactions,
    firstDayOfMonthStr,
  } = useMemo(() => {
    let totalBalance = 0;
    let currentMonthIncome = 0;
    let currentMonthExpense = 0;

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const firstDayOfMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;

    // 6 Months data for chart (with day 1 to avoid end-of-month rollover bug)
    const monthlyData: { month: string; rawMonth: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
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
      const amount = Number(tx.amount) || 0;
      // Total Balance
      if (tx.type === 'Income') totalBalance += amount;
      if (tx.type === 'Expense') totalBalance -= amount;

      const txDatePart = (tx.transaction_date || '').slice(0, 10);

      // Current Month
      if (txDatePart >= firstDayOfMonthStr) {
        if (tx.type === 'Income') currentMonthIncome += amount;
        if (tx.type === 'Expense') currentMonthExpense += amount;
      }

      // Chart grouping
      if (txDatePart.length >= 7) {
        const rawMonth = txDatePart.slice(0, 7);
        const target = monthlyData.find(m => m.rawMonth === rawMonth);
        if (target) {
          if (tx.type === 'Income') target.income += amount;
          if (tx.type === 'Expense') target.expense += amount;
        }
      }
    });

    const hasChartData = monthlyData.some(m => m.income > 0 || m.expense > 0);

    const recentTransactions = [...allTransactions]
      .sort((a, b) => (b.transaction_date || '').localeCompare(a.transaction_date || ''))
      .slice(0, 5);

    return {
      totalBalance,
      currentMonthIncome,
      currentMonthExpense,
      monthlyData,
      hasChartData,
      recentTransactions,
      firstDayOfMonthStr,
    };
  }, [allTransactions]);

  // Goals
  const totalGoals = goals.length;
  const completedGoals = goals.filter(g => g.status === 'Completed').length;

  // Mask currency helper for Privacy Mode
  const maskAmount = (val: number) => {
    if (isPrivacyMode) return 'Rp •••••••';
    return formatCurrency(val);
  };

  // Smart Financial Insights Computations
  const smartInsights = useMemo(() => {
    const currentMonthExpenses = allTransactions.filter(
      tx => tx.type === 'Expense' && (tx.transaction_date || '').slice(0, 10) >= firstDayOfMonthStr
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

    // 4. Batas Wajar Penggunaan Bulanan (Alokasi 6 Bulan Berdasarkan Sisa Saldo)
    const sixMonths = 6;
    const safeMonthlyLimit = totalBalance > 0 ? Math.floor(totalBalance / sixMonths) : 0;
    const recommendedSafeLimit = totalBalance > 0 ? Math.floor((totalBalance * 0.85) / sixMonths) : 0;
    const isOverLimit = totalBalance > 0 && currentMonthExpense > safeMonthlyLimit;
    const limitUsagePercent = safeMonthlyLimit > 0 
      ? Math.round((currentMonthExpense / safeMonthlyLimit) * 100) 
      : (currentMonthExpense > 0 ? 100 : 0);
    const remainingMonthlyQuota = Math.max(0, safeMonthlyLimit - currentMonthExpense);

    // Proyeksi Tiap Bulan untuk 6 Bulan ke Depan
    const today = new Date();
    const currYear = today.getFullYear();
    const currMonth = today.getMonth();

    const sixMonthProjections = [];
    let accumulatedStandardExpense = 0;

    for (let i = 0; i < sixMonths; i++) {
      const d = new Date(currYear, currMonth + i, 1);
      const monthShort = d.toLocaleString('id-ID', { month: 'short' });
      const monthFull = d.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
      const isCurrent = i === 0;

      accumulatedStandardExpense += safeMonthlyLimit;
      const projectedBalance = Math.max(0, totalBalance - accumulatedStandardExpense);

      sixMonthProjections.push({
        index: i + 1,
        monthShort,
        monthFull,
        isCurrent,
        monthlyLimit: safeMonthlyLimit,
        spent: isCurrent ? currentMonthExpense : 0,
        remainingQuota: isCurrent ? Math.max(0, safeMonthlyLimit - currentMonthExpense) : safeMonthlyLimit,
        projectedBalance,
      });
    }

    // 5. Batas Wajar Penggunaan Harian
    const todayStr = getLocalDateString();
    const totalDaysInMonth = new Date(currYear, currMonth + 1, 0).getDate();
    const remainingDaysInMonth = Math.max(1, totalDaysInMonth - dayOfMonth + 1);

    const autoDailyLimit = safeMonthlyLimit > 0 ? Math.floor(safeMonthlyLimit / totalDaysInMonth) : 0;
    const safeDailyLimit = customDailyLimit > 0 ? customDailyLimit : autoDailyLimit;

    // Transaksi pengeluaran hari ini
    const todayExpensesList = allTransactions.filter(
      tx => tx.type === 'Expense' && (tx.transaction_date || '').slice(0, 10) === todayStr
    );
    const todayExpense = todayExpensesList.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    const dailyLimitUsagePercent = safeDailyLimit > 0
      ? Math.round((todayExpense / safeDailyLimit) * 100)
      : (todayExpense > 0 ? 100 : 0);
    const isTodayOverLimit = safeDailyLimit > 0 && todayExpense > safeDailyLimit;
    const remainingDailyQuota = Math.max(0, safeDailyLimit - todayExpense);
    const overDailyAmount = Math.max(0, todayExpense - safeDailyLimit);

    // Jatah harian adaptif sisa bulan
    const adaptiveDailyLimit = remainingMonthlyQuota > 0
      ? Math.floor(remainingMonthlyQuota / remainingDaysInMonth)
      : 0;

    const recentTodayExpenses = [...todayExpensesList].sort((a, b) =>
      (b.transaction_date || '').localeCompare(a.transaction_date || '')
    );

    return {
      savingsRate,
      healthScore,
      healthLabel,
      healthColor,
      topCategory,
      topCategoryPercent,
      dailyAverage,
      safeMonthlyLimit,
      recommendedSafeLimit,
      isOverLimit,
      limitUsagePercent,
      remainingMonthlyQuota,
      sixMonthProjections,
      // 5. Batas Wajar Penggunaan Harian
      todayStr,
      totalDaysInMonth,
      dayOfMonth,
      remainingDaysInMonth,
      autoDailyLimit,
      safeDailyLimit,
      isCustomDaily: customDailyLimit > 0,
      todayExpensesList,
      todayExpense,
      dailyLimitUsagePercent,
      isTodayOverLimit,
      remainingDailyQuota,
      overDailyAmount,
      adaptiveDailyLimit,
      recentTodayExpenses,
    };
  }, [allTransactions, currentMonthIncome, currentMonthExpense, firstDayOfMonthStr, categories, totalBalance, customDailyLimit]);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Ringkasan kondisi finansial dan aktivitas transaksi terkini.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Real-time 24-Hour Clock */}
          <LiveClock />

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
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 pt-2 border-t text-xs sm:text-sm">
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
              <p className="text-[11px] text-muted-foreground truncate">
                {smartInsights.topCategory ? `${smartInsights.topCategoryPercent}% (${maskAmount(smartInsights.topCategory.amount)})` : "Tidak ada pengeluaran"}
              </p>
            </div>

            {/* Safe Daily Limit (Batas Wajar Harian) */}
            <div className="p-3 rounded-xl bg-muted/30 border space-y-1 col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Batas Wajar Harian</span>
                {totalBalance <= 0 || smartInsights.isTodayOverLimit ? (
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                ) : (
                  <Sun className="h-3.5 w-3.5 text-amber-500" />
                )}
              </div>
              <div className="text-base sm:text-lg font-bold text-foreground">
                {maskAmount(smartInsights.safeDailyLimit)} <span className="text-xs font-normal text-muted-foreground">/hari</span>
              </div>
              <p className="text-[11px] truncate">
                {totalBalance <= 0 ? (
                  <span className="text-rose-500 font-medium">Saldo kritis / habis</span>
                ) : smartInsights.isTodayOverLimit ? (
                  <span className="text-rose-500 font-medium">Lewat (+{maskAmount(smartInsights.overDailyAmount)})</span>
                ) : smartInsights.todayExpense === 0 ? (
                  <span className="text-muted-foreground">Hari ini belum belanja</span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    {smartInsights.dailyLimitUsagePercent}% terpakai ({maskAmount(smartInsights.todayExpense)})
                  </span>
                )}
              </p>
            </div>

            {/* Safe Monthly Limit (6-Month Horizon) */}
            <div className="p-3 rounded-xl bg-muted/30 border space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs">Batas Wajar (6 Bln)</span>
                {totalBalance <= 0 || smartInsights.isOverLimit ? (
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                )}
              </div>
              <div className="text-base sm:text-lg font-bold text-foreground">
                {maskAmount(smartInsights.safeMonthlyLimit)} <span className="text-xs font-normal text-muted-foreground">/bln</span>
              </div>
              <p className="text-[11px] truncate">
                {totalBalance <= 0 ? (
                  <span className="text-rose-500 font-medium">Saldo kritis / habis</span>
                ) : smartInsights.isOverLimit ? (
                  <span className="text-rose-500 font-medium">Lewat kuota (+{maskAmount(currentMonthExpense - smartInsights.safeMonthlyLimit)})</span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">{smartInsights.limitUsagePercent}% terpakai bln ini</span>
                )}
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

          {/* Batas Wajar Penggunaan (Harian & Bulanan) Panel */}
          <div className="mt-3 p-3 sm:p-3.5 rounded-xl border bg-muted/20 space-y-3">
            {/* Tab Switcher: Harian vs Bulanan */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5">
              <div className="flex items-center gap-1.5 p-1 bg-muted/70 rounded-lg border border-border/50 w-fit">
                <button
                  type="button"
                  onClick={() => setActiveLimitTab('daily')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    activeLimitTab === 'daily'
                      ? 'bg-background text-foreground shadow-sm ring-1 ring-border/50'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Sun className="h-3.5 w-3.5 text-amber-500" />
                  <span>Batas Wajar Harian</span>
                  {smartInsights.isTodayOverLimit && (
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveLimitTab('monthly')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    activeLimitTab === 'monthly'
                      ? 'bg-background text-foreground shadow-sm ring-1 ring-border/50'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  <span>Batas Wajar 6 Bulan</span>
                  {smartInsights.isOverLimit && (
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                  )}
                </button>
              </div>

              {/* Action Buttons for active tab */}
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                {activeLimitTab === 'daily' ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleOpenCustomLimitDialog}
                      className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1 border-border/60"
                      title="Atur Batas Harian Kustom"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5 text-amber-500" />
                      <span>Atur Batas</span>
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDailyDetails(!showDailyDetails)}
                      className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1 border border-border/50"
                    >
                      <span>{showDailyDetails ? 'Tutup Rincian' : 'Rincian Hari Ini'}</span>
                      {showDailyDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSixMonthDetails(!showSixMonthDetails)}
                    className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1 border border-border/50"
                  >
                    <span>{showSixMonthDetails ? 'Tutup Rincian' : 'Rincian Tiap Bulan'}</span>
                    {showSixMonthDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </Button>
                )}
              </div>
            </div>

            {/* Content for TAB HARIAN */}
            {activeLimitTab === 'daily' && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-start sm:items-center gap-2">
                    <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 mt-0.5 sm:mt-0">
                      <Sun className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2 flex-wrap">
                        <span>Kontrol & Batas Wajar Penggunaan Harian</span>
                        {smartInsights.isCustomDaily ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                            Mode Kustom
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border">
                            Otomatis (Saldo 6 Bln)
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Batas pengeluaran wajar Anda hari ini adalah <strong className="text-foreground">{maskAmount(smartInsights.safeDailyLimit)}</strong> / hari agar cash flow tetap sehat dan seimbang.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Current Day Gauge / Progress Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground flex items-center gap-1.5 flex-wrap">
                      <span>Realisasi Hari Ini ({format(new Date(), 'd MMMM yyyy', { locale: id })})</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        totalBalance <= 0 || smartInsights.isTodayOverLimit
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                          : smartInsights.dailyLimitUsagePercent >= 80
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      }`}>
                        {totalBalance <= 0
                          ? 'Saldo Defisit'
                          : smartInsights.isTodayOverLimit
                          ? 'Melebihi Batas Harian'
                          : smartInsights.dailyLimitUsagePercent >= 80
                          ? 'Mendekati Batas'
                          : smartInsights.todayExpense === 0
                          ? 'Belum Ada Belanja'
                          : 'Aman & Terkendali'}
                      </span>
                    </span>
                    <span className="text-muted-foreground text-[11px] font-medium">
                      {maskAmount(smartInsights.todayExpense)} / {maskAmount(smartInsights.safeDailyLimit)} ({smartInsights.dailyLimitUsagePercent}%)
                    </span>
                  </div>

                  {/* Progress Bar Track */}
                  <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        totalBalance <= 0 || smartInsights.isTodayOverLimit
                          ? 'bg-rose-500'
                          : smartInsights.dailyLimitUsagePercent >= 80
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, smartInsights.dailyLimitUsagePercent)}%` }}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-muted-foreground gap-1">
                    <span>
                      {totalBalance <= 0 ? (
                        'Tidak ada saldo tersedia untuk belanja hari ini'
                      ) : smartInsights.isTodayOverLimit ? (
                        <span className="text-rose-500 font-medium">
                          Melampaui batas wajar harian sebesar {maskAmount(smartInsights.overDailyAmount)}
                        </span>
                      ) : (
                        <span>
                          Sisa kuota belanja wajar hari ini: <strong className="text-foreground">{maskAmount(smartInsights.remainingDailyQuota)}</strong>
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Jatah adaptif sisa bulan ({smartInsights.remainingDaysInMonth} hari): <strong className="text-foreground">{maskAmount(smartInsights.adaptiveDailyLimit)}</strong>/hari
                    </span>
                  </div>
                </div>

                {/* Detailed Breakdown for Daily */}
                {showDailyDetails && (
                  <div className="space-y-2.5 pt-2 border-t">
                    {/* 3 Metric Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="p-2.5 rounded-lg border bg-card/70 text-xs space-y-1">
                        <div className="text-muted-foreground flex items-center justify-between">
                          <span>Batas Harian Standar</span>
                          <Sun className="h-3.5 w-3.5 text-amber-500" />
                        </div>
                        <div className="text-sm font-bold text-foreground">
                          {maskAmount(smartInsights.safeDailyLimit)} <span className="text-[10px] font-normal text-muted-foreground">/hari</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {smartInsights.isCustomDaily
                            ? 'Batas kustom yang Anda tetapkan'
                            : `Batas bulanan (${maskAmount(smartInsights.safeMonthlyLimit)}) ÷ ${smartInsights.totalDaysInMonth} hari`}
                        </p>
                      </div>

                      <div className="p-2.5 rounded-lg border bg-card/70 text-xs space-y-1">
                        <div className="text-muted-foreground flex items-center justify-between">
                          <span>Jatah Adaptif Sisa Bulan</span>
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="text-sm font-bold text-primary">
                          {maskAmount(smartInsights.adaptiveDailyLimit)} <span className="text-[10px] font-normal text-muted-foreground">/hari</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Sisa kuota ({maskAmount(smartInsights.remainingMonthlyQuota)}) ÷ {smartInsights.remainingDaysInMonth} hari tersisa
                        </p>
                      </div>

                      <div className="p-2.5 rounded-lg border bg-card/70 text-xs space-y-1">
                        <div className="text-muted-foreground flex items-center justify-between">
                          <span>Rata-Rata Riil (Burn Rate)</span>
                          <Activity className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="text-sm font-bold text-foreground">
                          {maskAmount(smartInsights.dailyAverage)} <span className="text-[10px] font-normal text-muted-foreground">/hari</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {smartInsights.dailyAverage > smartInsights.safeDailyLimit ? (
                            <span className="text-rose-500 font-medium">Di atas batas wajar harian</span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Dalam jangkauan batas wajar</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Today's Transactions List */}
                    <div className="p-2.5 rounded-lg border bg-background/60 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                        <span className="flex items-center gap-1.5">
                          <Coins className="h-3.5 w-3.5 text-primary" />
                          <span>Rincian Pengeluaran Hari Ini</span>
                        </span>
                        <span className="text-[11px] text-muted-foreground font-normal">
                          {smartInsights.todayExpensesList.length} transaksi
                        </span>
                      </div>

                      {smartInsights.recentTodayExpenses.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground py-2 text-center">
                          Belum ada transaksi pengeluaran hari ini. Kuota aman Anda masih utuh {maskAmount(smartInsights.safeDailyLimit)}.
                        </p>
                      ) : (
                        <div className="divide-y divide-border/40 text-xs">
                          {smartInsights.recentTodayExpenses.map(tx => (
                            <div key={tx.id} className="py-1.5 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-muted font-medium text-foreground shrink-0">
                                  {tx.category_name || categories.find(c => c.id === tx.category_id)?.name || 'Pengeluaran'}
                                </span>
                                <span className="truncate text-muted-foreground text-[11px]">
                                  {tx.description || 'Tanpa keterangan'}
                                </span>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-semibold text-rose-500 text-xs">
                                  -{maskAmount(Number(tx.amount))}
                                </span>
                                <span className="text-[10px] text-muted-foreground block">
                                  {format24HourTime(tx.transaction_date)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Content for TAB BULANAN (6 BULAN) */}
            {activeLimitTab === 'monthly' && (
              <div className="space-y-3">
                <div className="flex items-start sm:items-center gap-2">
                  <div className="p-1 rounded-md bg-primary/10 text-primary mt-0.5 sm:mt-0">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-foreground">
                      Alokasi & Proyeksi Batas Wajar 6 Bulan
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Berdasarkan sisa saldo {maskAmount(totalBalance)}, batas pengeluaran wajar adalah {maskAmount(smartInsights.safeMonthlyLimit)} / bulan agar saldo bertahan 6 bulan.
                    </p>
                  </div>
                </div>

                {/* Current Month Gauge / Progress Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground flex items-center gap-1.5">
                      <span>Realisasi Bulan Berjalan ({smartInsights.sixMonthProjections[0]?.monthShort || 'Bulan Ini'})</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        totalBalance <= 0 || smartInsights.isOverLimit 
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' 
                          : smartInsights.limitUsagePercent >= 80 
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' 
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      }`}>
                        {totalBalance <= 0 
                          ? 'Saldo Defisit' 
                          : smartInsights.isOverLimit 
                          ? 'Melebihi Batas' 
                          : smartInsights.limitUsagePercent >= 80 
                          ? 'Mendekati Batas' 
                          : 'Aman & Terkendali'}
                      </span>
                    </span>
                    <span className="text-muted-foreground text-[11px] font-medium">
                      {maskAmount(currentMonthExpense)} / {maskAmount(smartInsights.safeMonthlyLimit)} ({smartInsights.limitUsagePercent}%)
                    </span>
                  </div>

                  {/* Progress Bar Track */}
                  <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        totalBalance <= 0 || smartInsights.isOverLimit 
                          ? 'bg-rose-500' 
                          : smartInsights.limitUsagePercent >= 80 
                          ? 'bg-amber-500' 
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, smartInsights.limitUsagePercent)}%` }}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-muted-foreground gap-1">
                    <span>
                      {totalBalance <= 0 ? (
                        'Tidak ada saldo tersedia untuk belanja'
                      ) : smartInsights.isOverLimit ? (
                        <span className="text-rose-500 font-medium">Melampaui batas aman sebesar {maskAmount(currentMonthExpense - smartInsights.safeMonthlyLimit)}</span>
                      ) : (
                        <span>Sisa kuota belanja wajar bulan ini: <strong className="text-foreground">{maskAmount(smartInsights.remainingMonthlyQuota)}</strong></span>
                      )}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Cadangan darurat disarankan (15%): {maskAmount(smartInsights.recommendedSafeLimit)}/bln
                    </span>
                  </div>
                </div>

                {/* 6-Month Cards Projection */}
                {showSixMonthDetails && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t">
                    {smartInsights.sixMonthProjections.map((item) => (
                      <div 
                        key={item.index} 
                        className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between transition-colors ${
                          item.isCurrent 
                            ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20' 
                            : 'bg-card/70 hover:bg-muted/40'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-semibold text-foreground text-xs">{item.monthShort}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                              item.isCurrent 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {item.isCurrent ? 'Bulan ke-1' : `Bulan ke-${item.index}`}
                            </span>
                          </div>

                          <div className="text-[10px] text-muted-foreground">Batas Wajar:</div>
                          <div className="font-bold text-xs text-foreground">
                            {maskAmount(item.monthlyLimit)}
                          </div>
                        </div>

                        <div className="mt-2 pt-1.5 border-t text-[10px] space-y-0.5">
                          {item.isCurrent ? (
                            <>
                              <div className="flex items-center justify-between text-muted-foreground">
                                <span>Realisasi:</span>
                                <span className={`font-semibold ${item.spent > item.monthlyLimit ? 'text-rose-500' : 'text-foreground'}`}>
                                  {maskAmount(item.spent)}
                                </span>
                              </div>
                              <div className="text-[9px] text-muted-foreground truncate">
                                {item.spent > item.monthlyLimit ? (
                                  <span className="text-rose-500">Over budget</span>
                                ) : (
                                  <span>Sisa: {maskAmount(item.remainingQuota)}</span>
                                )}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center justify-between text-muted-foreground">
                                <span>Est. Saldo:</span>
                                <span className="font-semibold text-foreground">
                                  {maskAmount(item.projectedBalance)}
                                </span>
                              </div>
                              <div className="text-[9px] text-muted-foreground">
                                akhir bulan
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actionable Advice Tip */}
          <div className="flex items-start gap-2.5 mt-3 p-3 rounded-xl bg-primary/5 border border-primary/10 text-xs text-foreground/90">
            <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-primary">Saran Cerdas: </span>
              {totalBalance <= 0
                ? "Sisa saldo Anda saat ini kosong atau defisit. Prioritaskan penerimaan pemasukan dan tunda pengeluaran non-esensial."
                : smartInsights.isOverLimit
                ? `Pengeluaran bulan ini (${maskAmount(currentMonthExpense)}) telah melampaui batas wajar 6 bulan (${maskAmount(smartInsights.safeMonthlyLimit)}/bulan). Disarankan berhemat di sisa bulan agar saldo cukup bertahan selama 6 bulan.`
                : smartInsights.isTodayOverLimit
                ? `Pengeluaran hari ini (${maskAmount(smartInsights.todayExpense)}) telah melampaui batas wajar harian (${maskAmount(smartInsights.safeDailyLimit)}/hari). Tekan pengeluaran esok hari agar jatah adaptif Anda tetap optimal.`
                : smartInsights.dailyLimitUsagePercent >= 80
                ? `Pengeluaran hari ini sudah mencapai ${smartInsights.dailyLimitUsagePercent}% dari batas wajar harian. Pertahankan kendali agar tidak melebihi kuota ${maskAmount(smartInsights.safeDailyLimit)}.`
                : smartInsights.limitUsagePercent >= 80
                ? `Pengeluaran bulan ini sudah mencapai ${smartInsights.limitUsagePercent}% dari batas wajar bulanan. Jaga pengeluaran agar tetap dalam kuota aman ${maskAmount(smartInsights.safeMonthlyLimit)}.`
                : smartInsights.savingsRate >= 30
                ? "Pola keuangan Anda sangat sehat dan belanja berada dalam batas wajar harian maupun bulanan! Pertimbangkan untuk mengalokasikan sebagian surplus dana ke Financial Goals atau Tabungan Darurat."
                : smartInsights.topCategory
                ? `Pengeluaran kategori "${smartInsights.topCategory.name}" mendominasi ${smartInsights.topCategoryPercent}% dari belanja Anda. Mengurangi sedikit pos ini akan menjaga ketahanan saldo 6 bulan Anda tetap optimal.`
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
                        {tx.description || categories.find(c => c.id === tx.category_id)?.name || tx.category_name || 'Transaksi'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(() => {
                          const { displayDateTime } = parseTransactionDate(tx);
                          return displayDateTime;
                        })()}
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
              {type === 'Expense' && txDate === smartInsights.todayStr && smartInsights.safeDailyLimit > 0 && (
                <div className={`p-2.5 rounded-lg text-xs border space-y-1 transition-all ${
                  Number(amount) > smartInsights.remainingDailyQuota && smartInsights.remainingDailyQuota > 0
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
                    : Number(amount) > smartInsights.safeDailyLimit
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
                    : 'bg-muted/40 border-border/50 text-muted-foreground'
                }`}>
                  <div className="flex items-center justify-between font-medium">
                    <span className="flex items-center gap-1">
                      <Sun className="h-3.5 w-3.5 text-amber-500" />
                      Batas Wajar Hari Ini:
                    </span>
                    <span className="text-foreground font-semibold">{maskAmount(smartInsights.safeDailyLimit)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span>Sisa Kuota Hari Ini:</span>
                    <span className={`font-semibold ${smartInsights.remainingDailyQuota <= 0 ? 'text-rose-500' : 'text-foreground'}`}>
                      {maskAmount(smartInsights.remainingDailyQuota)}
                    </span>
                  </div>
                  {Number(amount) > 0 && Number(amount) > smartInsights.remainingDailyQuota && (
                    <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 pt-0.5 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      Nominal ini melampaui sisa kuota hari ini sebesar {maskAmount(Number(amount) - smartInsights.remainingDailyQuota)}
                    </p>
                  )}
                </div>
              )}
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
                <Label>Jam (24 Jam)</Label>
                <Input
                  type="time"
                  step="60"
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

      {/* Dialog Atur Batas Wajar Harian */}
      <Dialog open={isCustomLimitDialogOpen} onOpenChange={setIsCustomLimitDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Sun className="h-5 w-5 text-amber-500" />
              <span>Atur Batas Wajar Harian</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tentukan kuota belanja harian Anda sendiri atau gunakan rekomendasi otomatis berdasarkan alokasi saldo 6 bulan.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCustomDailyLimit} className="space-y-4 pt-2">
            {/* Auto Recommendation Box */}
            <div className="p-3 rounded-lg border bg-muted/40 space-y-1.5 text-xs">
              <div className="flex items-center justify-between font-semibold text-foreground">
                <span>Rekomendasi Otomatis:</span>
                <span className="text-primary font-bold">{maskAmount(smartInsights.autoDailyLimit)} /hari</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Dihitung dari batas wajar bulanan ({maskAmount(smartInsights.safeMonthlyLimit)}) dibagi {smartInsights.totalDaysInMonth} hari bulan ini.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs sm:text-sm font-medium">Batas Harian Kustom (Rp)</Label>
              <Input
                type="number"
                min="1000"
                step="1000"
                value={tempCustomDailyLimit}
                onChange={(e) => setTempCustomDailyLimit(e.target.value)}
                placeholder={`Contoh: ${smartInsights.autoDailyLimit > 0 ? smartInsights.autoDailyLimit : 50000}`}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Masukkan nominal target batas maksimal belanja per hari yang Anda inginkan.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <Button type="submit" className="w-full sm:flex-1">
                Simpan Batas Kustom
              </Button>
              {customDailyLimit > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetToAutoDailyLimit}
                  className="w-full sm:w-auto text-xs"
                >
                  Reset ke Otomatis
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

