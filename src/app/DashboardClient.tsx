"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDownIcon, ArrowUpIcon, WalletIcon, TargetIcon, Activity } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

export default function DashboardClient() {
  // Fetch from local Dexie DB
  const allTransactions = useLiveQuery(() => db.transactions.toArray()) || [];
  const goals = useLiveQuery(() => db.goals.toArray()) || [];
  
  let totalBalance = 0;
  let currentMonthIncome = 0;
  let currentMonthExpense = 0;
  
  const date = new Date();
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();

  allTransactions.forEach(tx => {
    // Total Balance
    if (tx.type === 'Income') totalBalance += Number(tx.amount);
    if (tx.type === 'Expense') totalBalance -= Number(tx.amount);

    // Current Month
    if (tx.transaction_date >= firstDayOfMonth) {
      if (tx.type === 'Income') currentMonthIncome += Number(tx.amount);
      if (tx.type === 'Expense') currentMonthExpense += Number(tx.amount);
    }
  });

  // Goals
  const totalGoals = goals.length;
  const completedGoals = goals.filter(g => g.status === 'Completed').length;

  // Recent 5 transactions
  const recentTransactions = [...allTransactions]
    .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
    .slice(0, 5);

  return (
    <div className="flex-1 space-y-6 p-4 sm:space-y-8 sm:p-8 sm:pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h2>
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
        <Card className="col-span-4 hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Aktivitas Keuangan</CardTitle>
            <CardDescription>
              Ringkasan pemasukan dan pengeluaran 6 bulan terakhir.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2 h-[300px] flex items-center justify-center border-t bg-muted/10">
            <div className="flex flex-col items-center text-muted-foreground gap-2">
              <Activity className="h-10 w-10 opacity-20" />
              <p className="text-sm font-medium">Grafik akan ditampilkan di sini</p>
            </div>
          </CardContent>
        </Card>
        
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
