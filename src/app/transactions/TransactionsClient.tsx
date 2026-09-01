"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Transaction, Category } from "@/lib/db";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";
import { ArrowDownIcon, ArrowUpIcon, Plus } from "lucide-react";
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
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState("");

  const filteredCategories = categories.filter(c => c.type === type);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !categoryId || !date) {
      toast.error("Mohon lengkapi data wajib.");
      return;
    }

    const newId = uuidv4();
    const catName = categories.find(c => c.id === categoryId)?.name || 'Lainnya';

    const payload: Transaction = {
      id: newId,
      category_id: categoryId,
      type,
      amount: Number(amount),
      description,
      transaction_date: date,
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

  return (
    <div className="flex-1 space-y-6 p-4 sm:space-y-8 sm:p-8 sm:pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Transaksi</h2>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Tambah Transaksi</span>
              <span className="sm:hidden">Tambah</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Transaksi Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipe</Label>
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
                <div className="space-y-2">
                  <Label>Tanggal</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nominal (Rp)</Label>
                <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="Contoh: 50000" />
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
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Contoh: Beli makan siang" />
              </div>

              <Button type="submit" className="w-full">Simpan Transaksi</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Transaksi</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Belum ada data transaksi.</div>
          ) : (
            <div className="space-y-4">
              {transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${tx.type === 'Income' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
                      {tx.type === 'Income' ? <ArrowUpIcon className="h-5 w-5" /> : <ArrowDownIcon className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-medium leading-none">{tx.description || tx.category_name || 'Transaksi'}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {format(new Date(tx.transaction_date), "d MMM yyyy", { locale: idLocale })} • {tx.category_name}
                      </p>
                    </div>
                  </div>
                  <div className={`font-semibold ${tx.type === 'Income' ? 'text-emerald-500' : 'text-foreground'}`}>
                    {tx.type === 'Income' ? '+' : '-'} {formatCurrency(tx.amount)}
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
