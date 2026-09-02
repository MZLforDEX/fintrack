"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Transaction } from "@/lib/db";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";
import { ArrowDownIcon, ArrowUpIcon, Plus, Trash2, Clock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function TransactionsClient() {
  const transactions = useLiveQuery(() => db.transactions.orderBy('transaction_date').reverse().toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];

  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<'Income' | 'Expense'>("Expense");
  const [categoryId, setCategoryId] = useState("");
  
  // Date & Time states
  const [date, setDate] = useState(() => {
    const now = new Date();
    return format(now, "yyyy-MM-dd");
  });
  const [time, setTime] = useState(() => {
    const now = new Date();
    return format(now, "HH:mm");
  });
  const [description, setDescription] = useState("");

  const filteredCategories = categories.filter(c => c.type === type);

  const handleOpenDialog = () => {
    const now = new Date();
    setDate(format(now, "yyyy-MM-dd"));
    setTime(format(now, "HH:mm"));
    setIsOpen(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !categoryId || !date || !time) {
      toast.error("Mohon lengkapi data wajib.");
      return;
    }

    const newId = uuidv4();
    const catName = categories.find(c => c.id === categoryId)?.name || 'Lainnya';

    // Combine date and time
    const dateTimeString = `${date}T${time}:00`;
    const finalDateTime = new Date(dateTimeString).toISOString();

    const payload: Transaction = {
      id: newId,
      category_id: categoryId,
      type,
      amount: Number(amount),
      description: description.trim(),
      transaction_date: finalDateTime,
      category_name: catName,
      created_at: new Date().toISOString()
    };

    try {
      // Save locally
      await db.transactions.add(payload);
      
      // Queue for sync
      await db.syncQueue.add({
        operation: 'INSERT',
        table: 'transactions',
        payload: {
          id: payload.id,
          category_id: payload.category_id,
          type: payload.type,
          amount: payload.amount,
          description: payload.description,
          transaction_date: payload.transaction_date,
        },
        created_at: new Date().toISOString()
      });

      toast.success("Transaksi berhasil ditambahkan!");
      setIsOpen(false);
      setAmount("");
      setDescription("");
    } catch (err) {
      toast.error("Gagal menyimpan transaksi.");
    }
  };

  const handleDelete = async (id: string, desc?: string) => {
    try {
      await db.transactions.delete(id);
      toast.success(`Transaksi ${desc ? `"${desc}"` : ''} berhasil dihapus.`);
    } catch (err) {
      toast.error("Gagal menghapus transaksi.");
    }
  };

  const formatTransactionTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return format(d, "d MMM yyyy, HH:mm", { locale: idLocale });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 sm:space-y-8 sm:p-8 sm:pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Transaksi</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Catat pemasukan dan pengeluaran beserta rincian tanggal & jam transaksi.
          </p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={handleOpenDialog} className="gap-1.5 text-xs sm:text-sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Tambah Transaksi</span>
              <span className="sm:hidden">Tambah</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Tambah Transaksi Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Tipe Transaksi</Label>
                <Select value={type} onValueChange={(v: 'Income'|'Expense') => { setType(v); setCategoryId(""); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Expense">Pengeluaran</SelectItem>
                    <SelectItem value="Income">Pemasukan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-xs sm:text-sm">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    Tanggal
                  </Label>
                  <Input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-xs sm:text-sm">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    Jam (Waktu)
                  </Label>
                  <Input 
                    type="time" 
                    value={time} 
                    onChange={(e) => setTime(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nominal (Rp)</Label>
                <Input 
                  type="number" 
                  min="0" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)} 
                  required 
                  placeholder="Contoh: 50000" 
                />
              </div>

              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select value={categoryId} onValueChange={setCategoryId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.length === 0 ? (
                      <SelectItem value="empty" disabled>Buat kategori dulu di menu Kategori</SelectItem>
                    ) : (
                      filteredCategories.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Keterangan (Opsional)</Label>
                <Input 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Contoh: Makan siang, Beli kopi, dll" 
                />
              </div>

              <Button type="submit" className="w-full">Simpan Transaksi</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg">Riwayat Transaksi</CardTitle>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
              {transactions.length} Transaksi
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Belum ada riwayat transaksi. Klik <strong>+ Tambah Transaksi</strong> untuk mencatat.
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map(tx => (
                <div 
                  key={tx.id} 
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors group"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${tx.type === 'Income' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
                      {tx.type === 'Income' ? <ArrowUpIcon className="h-5 w-5" /> : <ArrowDownIcon className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm sm:text-base leading-snug truncate">
                        {tx.description || tx.category_name || 'Transaksi'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>{formatTransactionTime(tx.transaction_date)}</span>
                        <span>•</span>
                        <span className="font-medium text-foreground/80">{tx.category_name}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <div className={`text-sm sm:text-base font-semibold ${tx.type === 'Income' ? 'text-emerald-500' : 'text-foreground'}`}>
                      {tx.type === 'Income' ? '+' : '-'} {formatCurrency(tx.amount)}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(tx.id, tx.description || tx.category_name)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-50 group-hover:opacity-100 transition-opacity"
                      title="Hapus transaksi"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

