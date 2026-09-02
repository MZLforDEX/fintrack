"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDownIcon, ArrowUpIcon, WalletIcon, TargetIcon, Activity, Cloud, WifiOff, RefreshCw, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Transaction } from '@/lib/db';
import { useSync } from '@/components/providers/SyncProvider';
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

  // Quick Add Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'Income' | 'Expense'>('Expense');
  const [categoryId, setCategoryId] = useState('');
  const [txDate, setTxDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [txTime, setTxTime] = useState(() => format(new Date(), 'HH:mm'));
  const [description, setDescription] = useState('');

  // Fetch from local Dexie DB
  const allTransactions = useLiveQuery(() => db.transactions.toArray()) || [];
  const goals = useLiveQuery(() => db.goals.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];

  const filteredCategories = categories.filter(c => c.type === type);

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
      
      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Balance */}
        <Card className="hover:shadow-lg transition-shadow col-span-2 sm:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Saldo</CardTitle>
            <WalletIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(totalBalance)}</div>
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
            <div className="text-lg sm:text-2xl font-bold text-emerald-500">{formatCurrency(currentMonthIncome)}</div>
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
            <div className="text-lg sm:text-2xl font-bold text-destructive">{formatCurrency(currentMonthExpense)}</div>
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
                      {tx.type === 'Income' ? '+' : '-'} {formatCurrency(Number(tx.amount))}
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
        <DialogContent className="sm:max-w-[425px]">
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

            <Button type="submit" className="w-full">Simpan Transaksi</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

