"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDownIcon, ArrowUpIcon, WalletIcon, TargetIcon, Activity, Cloud, WifiOff, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
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

  // Fetch from local Dexie DB
  const allTransactions = useLiveQuery(() => db.transactions.toArray()) || [];
  const goals = useLiveQuery(() => db.goals.toArray()) || [];
  
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
    </div>
  );
}

