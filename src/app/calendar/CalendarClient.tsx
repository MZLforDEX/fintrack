'use client';

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Transaction } from '@/lib/db';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isToday
} from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  ArrowUpIcon, 
  ArrowDownIcon, 
  Plus, 
  Receipt, 
  Trash2,
  Scale,
  Clock
} from 'lucide-react';
import { buildTransactionDateTime, format24HourTime, getLocal24TimeString } from '@/lib/dateUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

export default function CalendarClient() {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  // Quick Add Transaction Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'Income' | 'Expense'>('Expense');
  const [categoryId, setCategoryId] = useState('');
  const [time, setTime] = useState(() => getLocal24TimeString());
  const [description, setDescription] = useState('');

  // Live queries from Dexie DB
  const transactions = useLiveQuery(() => db.transactions.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];

  const filteredCategories = categories.filter(c => c.type === type);

  // Month interval & calendar grid days (starts on Monday) - optimized with useMemo
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  // Map transactions by YYYY-MM-DD
  const dateDataMap = useMemo(() => {
    const map: Record<string, { income: number; expense: number; txs: Transaction[] }> = {};

    transactions.forEach(tx => {
      const dateKey = tx.transaction_date.slice(0, 10);
      if (!map[dateKey]) {
        map[dateKey] = { income: 0, expense: 0, txs: [] };
      }
      const val = Number(tx.amount) || 0;
      if (tx.type === 'Income') {
        map[dateKey].income += val;
      } else {
        map[dateKey].expense += val;
      }
      map[dateKey].txs.push(tx);
    });

    return map;
  }, [transactions]);

  // Current visible month aggregate summary
  const monthSummary = useMemo(() => {
    let income = 0;
    let expense = 0;

    transactions.forEach(tx => {
      const txDate = new Date(tx.transaction_date);
      if (isSameMonth(txDate, currentMonth)) {
        const val = Number(tx.amount) || 0;
        if (tx.type === 'Income') income += val;
        if (tx.type === 'Expense') expense += val;
      }
    });

    return {
      income,
      expense,
      net: income - expense,
    };
  }, [transactions, currentMonth]);

  // Selected date transactions and summary
  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');
  const selectedDayData = dateDataMap[selectedDateKey] || { income: 0, expense: 0, txs: [] };

  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  const handleOpenAddModal = () => {
    setAmount('');
    setDescription('');
    setTime(getLocal24TimeString());
    setCategoryId(filteredCategories[0]?.id || '');
    setIsAddOpen(true);
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !categoryId) {
      toast.error('Mohon isi nominal dan kategori transaksi.');
      return;
    }

    const catName = categories.find(c => c.id === categoryId)?.name || 'Lainnya';
    const txDateStr = buildTransactionDateTime(selectedDateKey, time);
    const newId = uuidv4();

    const newTx: Transaction = {
      id: newId,
      category_id: categoryId,
      type,
      amount: Number(amount),
      description: description.trim() || undefined,
      transaction_date: txDateStr,
      category_name: catName,
      created_at: new Date().toISOString(),
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
        created_at: newTx.created_at || new Date().toISOString(),
      });

      toast.success('Transaksi berhasil ditambahkan!');
      setIsAddOpen(false);
    } catch (err) {
      toast.error('Gagal menambahkan transaksi.');
    }
  };

  const handleDeleteTransaction = async (id: string, desc?: string) => {
    try {
      await db.transactions.delete(id);
      await db.syncQueue.where('payload.id').equals(id).delete();
      await db.syncQueue.add({
        operation: 'DELETE',
        table: 'transactions',
        payload: { id },
        created_at: new Date().toISOString(),
      });
      toast.success(`Transaksi "${desc || 'Item'}" berhasil dihapus.`);
    } catch (err) {
      toast.error('Gagal menghapus transaksi.');
    }
  };

  const weekDayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  return (
    <div className="flex-1 space-y-6 p-4 sm:space-y-8 sm:p-8 sm:pt-6">
      {/* Page Header with Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2.5">
            <CalendarIcon className="h-7 w-7 text-primary" />
            Kalender Keuangan
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Pantau arus pemasukan, pengeluaran, dan saldo harian dalam tampilan kalender interaktif.
          </p>
        </div>

        {/* Month Navigation Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button variant="outline" size="sm" onClick={handleToday} className="text-xs">
            Bulan Ini
          </Button>
          <div className="flex items-center border rounded-lg bg-card shadow-sm p-0.5">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevMonth} title="Bulan Sebelumnya">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 font-semibold text-xs sm:text-sm min-w-[130px] text-center">
              {format(currentMonth, 'MMMM yyyy', { locale: idLocale })}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextMonth} title="Bulan Berikutnya">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Monthly Summary Cards */}
      <div className="grid gap-3 grid-cols-3">
        <Card className="hover:shadow-sm transition-shadow">
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] sm:text-xs font-medium">Pemasukan Bulan Ini</span>
              <ArrowUpIcon className="h-3.5 w-3.5 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-sm sm:text-xl font-bold text-emerald-500">
              {formatCurrency(monthSummary.income)}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-sm transition-shadow">
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] sm:text-xs font-medium">Pengeluaran Bulan Ini</span>
              <ArrowDownIcon className="h-3.5 w-3.5 text-rose-500" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-sm sm:text-xl font-bold text-rose-500">
              {formatCurrency(monthSummary.expense)}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-sm transition-shadow">
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] sm:text-xs font-medium">Selisih Bersih</span>
              <Scale className="h-3.5 w-3.5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className={`text-sm sm:text-xl font-bold ${monthSummary.net >= 0 ? 'text-primary' : 'text-rose-500'}`}>
              {formatCurrency(monthSummary.net)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Calendar Grid */}
      <Card className="border shadow-sm overflow-hidden">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b bg-muted/40 text-center font-semibold text-xs sm:text-sm text-muted-foreground py-2.5">
          {weekDayNames.map((d, i) => (
            <div key={i} className={i >= 5 ? 'text-rose-500/80 font-bold' : ''}>
              {d}
            </div>
          ))}
        </div>

        {/* Days Grid Cells */}
        <div className="grid grid-cols-7 divide-x divide-y border-b">
          {calendarDays.map((day, idx) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayData = dateDataMap[dateKey];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = isSameDay(day, selectedDate);
            const today = isToday(day);

            const hasIncome = dayData && dayData.income > 0;
            const hasExpense = dayData && dayData.expense > 0;
            const netDaily = (dayData?.income || 0) - (dayData?.expense || 0);

            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedDate(day)}
                className={`min-h-[75px] sm:min-h-[105px] p-1.5 sm:p-2 text-left flex flex-col justify-between transition-all relative focus:outline-none ${
                  !isCurrentMonth ? 'bg-muted/15 text-muted-foreground/40' : 'hover:bg-muted/30 bg-card'
                } ${
                  isSelected ? 'ring-2 ring-primary ring-inset z-10 bg-primary/5' : ''
                }`}
              >
                {/* Date Number Header */}
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`inline-flex items-center justify-center text-xs font-semibold h-5 w-5 sm:h-6 sm:w-6 rounded-full ${
                      today 
                        ? 'bg-primary text-primary-foreground font-bold' 
                        : isSelected 
                        ? 'bg-primary/20 text-primary' 
                        : ''
                    }`}
                  >
                    {format(day, 'd')}
                  </span>

                  {/* Dot indicator if has txs on mobile */}
                  {(hasIncome || hasExpense) && (
                    <div className="flex gap-1 sm:hidden">
                      {hasIncome && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                      {hasExpense && <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />}
                    </div>
                  )}
                </div>

                {/* Day Financial Numbers */}
                <div className="space-y-0.5 mt-1 w-full overflow-hidden">
                  {hasIncome && (
                    <div className="text-[10px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400 truncate leading-tight">
                      <span className="hidden sm:inline">+</span>
                      {formatCurrency(dayData.income)}
                    </div>
                  )}

                  {hasExpense && (
                    <div className="text-[10px] sm:text-xs font-semibold text-rose-600 dark:text-rose-400 truncate leading-tight">
                      <span className="hidden sm:inline">-</span>
                      {formatCurrency(dayData.expense)}
                    </div>
                  )}

                  {/* Net indicator for desktop */}
                  {(hasIncome || hasExpense) && (
                    <div className="hidden sm:block text-[10px] font-medium text-muted-foreground border-t border-muted/50 pt-0.5 truncate">
                      Sisa: <span className={netDaily >= 0 ? 'text-foreground' : 'text-rose-500 font-semibold'}>{formatCurrency(netDaily)}</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Selected Date Details Breakdown Card */}
      <Card className="border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
          <div>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" />
              {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: idLocale })}
            </CardTitle>
            <CardDescription className="text-xs">
              Rincian transaksi dan arus kas pada tanggal yang dipilih
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleOpenAddModal} className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              Catat di Tanggal Ini
            </Button>
          </div>
        </CardHeader>

        {/* Selected Day Aggregate Badges */}
        <div className="grid grid-cols-3 gap-2 px-6 py-2 border-y bg-muted/20 text-xs sm:text-sm">
          <div>
            <span className="text-muted-foreground block text-[10px] sm:text-xs">Pemasukan</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(selectedDayData.income)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px] sm:text-xs">Pengeluaran</span>
            <span className="font-bold text-rose-600 dark:text-rose-400">
              {formatCurrency(selectedDayData.expense)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px] sm:text-xs">Total Bersih</span>
            <span className={`font-bold ${selectedDayData.income - selectedDayData.expense >= 0 ? 'text-primary' : 'text-rose-500'}`}>
              {formatCurrency(selectedDayData.income - selectedDayData.expense)}
            </span>
          </div>
        </div>

        <CardContent className="p-0">
          {selectedDayData.txs.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-xs sm:text-sm space-y-2">
              <Receipt className="h-8 w-8 mx-auto opacity-30" />
              <p>Belum ada transaksi yang dicatat pada tanggal ini.</p>
            </div>
          ) : (
            <div className="divide-y max-h-[400px] overflow-y-auto">
              {selectedDayData.txs.map(tx => {
                const isIncome = tx.type === 'Income';
                const txTime = format24HourTime(tx.transaction_date, tx.created_at);

                return (
                  <div key={tx.id} className="flex items-center justify-between p-3 sm:px-6 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        isIncome ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                      }`}>
                        {isIncome ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-xs sm:text-sm truncate text-foreground">
                          {tx.description || tx.category_name || (isIncome ? 'Pemasukan' : 'Pengeluaran')}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                          <span>{tx.category_name || 'Kategori'}</span>
                          {txTime && (
                            <>
                              <span>•</span>
                              <span className="inline-flex items-center gap-1 font-mono">
                                <Clock className="h-3 w-3" />
                                {txTime}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <span className={`text-xs sm:text-sm font-bold ${
                        isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTransaction(tx.id, tx.description)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Hapus transaksi"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Add Modal For Selected Date */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              Catat Transaksi ({format(selectedDate, 'd MMMM yyyy', { locale: idLocale })})
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddTransaction} className="space-y-4 pt-2">
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

            {/* Time & Description */}
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2 col-span-1">
                <Label>Jam (24 Jam)</Label>
                <Input
                  type="time"
                  step="60"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Deskripsi / Catatan</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Keterangan transaksi"
                />
              </div>
            </div>

            <Button type="submit" className="w-full">Simpan Transaksi</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
