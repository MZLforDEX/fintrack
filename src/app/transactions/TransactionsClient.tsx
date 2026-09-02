"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Transaction } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";
import { 
  ArrowDownIcon, 
  ArrowUpIcon, 
  Plus, 
  Pencil, 
  Trash2, 
  Clock, 
  Calendar 
} from "lucide-react";
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

  // Add Transaction Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<'Income' | 'Expense'>("Expense");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState(() => format(new Date(), "HH:mm"));
  const [description, setDescription] = useState("");

  // Edit Transaction Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editType, setEditType] = useState<'Income' | 'Expense'>("Expense");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const filteredCategories = categories.filter(c => c.type === type);
  const editFilteredCategories = categories.filter(c => c.type === editType);

  const handleOpenAddDialog = () => {
    const now = new Date();
    setDate(format(now, "yyyy-MM-dd"));
    setTime(format(now, "HH:mm"));
    setAmount("");
    setDescription("");
    setCategoryId("");
    setType("Expense");
    setIsOpen(true);
  };

  const handleOpenEditDialog = (tx: Transaction) => {
    setEditingId(tx.id);
    setEditAmount(String(tx.amount));
    setEditType(tx.type);
    setEditCategoryId(tx.category_id);
    setEditDescription(tx.description || "");

    try {
      const d = new Date(tx.transaction_date);
      if (!isNaN(d.getTime())) {
        setEditDate(format(d, "yyyy-MM-dd"));
        setEditTime(format(d, "HH:mm"));
      } else {
        const now = new Date();
        setEditDate(format(now, "yyyy-MM-dd"));
        setEditTime(format(now, "HH:mm"));
      }
    } catch {
      const now = new Date();
      setEditDate(format(now, "yyyy-MM-dd"));
      setEditTime(format(now, "HH:mm"));
    }

    setIsEditOpen(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !categoryId || !date || !time) {
      toast.error("Mohon lengkapi data transaksi wajib.");
      return;
    }

    const newId = uuidv4();
    const catName = categories.find(c => c.id === categoryId)?.name || 'Lainnya';
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
      await db.transactions.add(payload);
      
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

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editAmount || !editCategoryId || !editDate || !editTime) {
      toast.error("Mohon lengkapi data transaksi wajib.");
      return;
    }

    const catName = categories.find(c => c.id === editCategoryId)?.name || 'Lainnya';
    const dateTimeString = `${editDate}T${editTime}:00`;
    const finalDateTime = new Date(dateTimeString).toISOString();

    const updatedData = {
      category_id: editCategoryId,
      type: editType,
      amount: Number(editAmount),
      description: editDescription.trim(),
      transaction_date: finalDateTime,
      category_name: catName,
      updated_at: new Date().toISOString()
    };

    try {
      await db.transactions.update(editingId, updatedData);

      await db.syncQueue.add({
        operation: 'UPDATE',
        table: 'transactions',
        payload: {
          id: editingId,
          category_id: updatedData.category_id,
          type: updatedData.type,
          amount: updatedData.amount,
          description: updatedData.description,
          transaction_date: updatedData.transaction_date,
        },
        created_at: new Date().toISOString()
      });

      toast.success("Transaksi berhasil diperbarui!");
      setIsEditOpen(false);
      setEditingId(null);
    } catch (err) {
      toast.error("Gagal memperbarui transaksi.");
    }
  };

  const handleDelete = async (id: string, desc?: string) => {
    try {
      // 1. Delete locally from Dexie DB
      await db.transactions.delete(id);

      // 2. Remove any pending INSERT / UPDATE for this ID from syncQueue
      const pendingItems = await db.syncQueue.toArray();
      for (const item of pendingItems) {
        if (item.table === 'transactions' && item.payload?.id === id) {
          await db.syncQueue.delete(item.id!);
        }
      }

      // 3. Queue DELETE operation
      await db.syncQueue.add({
        operation: 'DELETE',
        table: 'transactions',
        payload: { id },
        created_at: new Date().toISOString()
      });

      // 4. Try direct delete to Supabase if connected
      try {
        const supabase = createClient();
        await supabase.from('transactions').delete().eq('id', id);
      } catch {
        // Queue will retry if offline
      }

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
            Catat, edit, dan kelola seluruh transaksi pemasukan dan pengeluaran Anda.
          </p>
        </div>
        
        {/* Tambah Transaksi Modal */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={handleOpenAddDialog} className="gap-1.5 text-xs sm:text-sm">
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

      {/* Edit Transaksi Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Edit Transaksi</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Tipe Transaksi</Label>
              <Select value={editType} onValueChange={(v: 'Income'|'Expense') => { setEditType(v); setEditCategoryId(""); }}>
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
                  value={editDate} 
                  onChange={(e) => setEditDate(e.target.value)} 
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
                  value={editTime} 
                  onChange={(e) => setEditTime(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nominal (Rp)</Label>
              <Input 
                type="number" 
                min="0" 
                value={editAmount} 
                onChange={(e) => setEditAmount(e.target.value)} 
                required 
                placeholder="Contoh: 50000" 
              />
            </div>

            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={editCategoryId} onValueChange={setEditCategoryId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Kategori" />
                </SelectTrigger>
                <SelectContent>
                  {editFilteredCategories.length === 0 ? (
                    <SelectItem value="empty" disabled>Buat kategori dulu di menu Kategori</SelectItem>
                  ) : (
                    editFilteredCategories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Keterangan (Opsional)</Label>
              <Input 
                value={editDescription} 
                onChange={(e) => setEditDescription(e.target.value)} 
                placeholder="Contoh: Makan siang, Beli kopi, dll" 
              />
            </div>

            <Button type="submit" className="w-full">Simpan Perubahan</Button>
          </form>
        </DialogContent>
      </Dialog>

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
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
                    <div className={`text-sm sm:text-base font-semibold ${tx.type === 'Income' ? 'text-emerald-500' : 'text-foreground'}`}>
                      {tx.type === 'Income' ? '+' : '-'} {formatCurrency(tx.amount)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEditDialog(tx)}
                        className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 opacity-70 group-hover:opacity-100 transition-opacity"
                        title="Edit transaksi"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(tx.id, tx.description || tx.category_name)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-70 group-hover:opacity-100 transition-opacity"
                        title="Hapus transaksi"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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


