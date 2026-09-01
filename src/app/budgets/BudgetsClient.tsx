"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Budget } from "@/lib/db";
import { Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";

export default function BudgetsClient() {
  const budgets = useLiveQuery(() => db.budgets.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.where('type').equals('Expense').toArray()) || [];
  // Calculate expenses to show budget progress
  const transactions = useLiveQuery(() => db.transactions.where('type').equals('Expense').toArray()) || [];

  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !categoryId) return;

    const newId = uuidv4();
    const catName = categories.find(c => c.id === categoryId)?.name;

    const payload: Budget = {
      id: newId,
      category_id: categoryId,
      amount: Number(amount),
      month,
      year,
      category_name: catName,
    };

    try {
      await db.budgets.add(payload);
      
      await db.syncQueue.add({
        operation: 'INSERT',
        table: 'budgets',
        payload: {
          id: payload.id,
          category_id: payload.category_id,
          amount: payload.amount,
          month: payload.month,
          year: payload.year,
        },
        created_at: new Date().toISOString()
      });

      toast.success("Budget berhasil ditambahkan!");
      setIsOpen(false);
      setAmount("");
    } catch (err) {
      toast.error("Gagal menyimpan budget. Mungkin budget untuk kategori ini di bulan yang sama sudah ada.");
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 sm:space-y-8 sm:p-8 sm:pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Budget</h2>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Buat Budget</span>
              <span className="sm:hidden">Buat</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buat Budget Bulanan Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Bulan</Label>
                <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({length: 12}).map((_, i) => (
                      <SelectItem key={i+1} value={String(i+1)}>Bulan {i+1}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Kategori Pengeluaran</Label>
                <Select value={categoryId} onValueChange={setCategoryId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.length === 0 ? (
                      <SelectItem value="empty" disabled>Buat kategori pengeluaran dulu</SelectItem>
                    ) : (
                      categories.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Limit Budget (Rp)</Label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="Contoh: 1000000" />
              </div>

              <Button type="submit" className="w-full">Simpan Budget</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {budgets.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground border rounded-lg border-dashed">
            Belum ada budget yang dibuat.
          </div>
        ) : (
          budgets.map(budget => {
            // Calculate spent
            const spent = transactions
              .filter(tx => {
                const txDate = new Date(tx.transaction_date);
                return tx.category_id === budget.category_id && 
                       txDate.getMonth() + 1 === budget.month && 
                       txDate.getFullYear() === budget.year;
              })
              .reduce((sum, tx) => sum + tx.amount, 0);
            
            const percentage = Math.min((spent / budget.amount) * 100, 100);
            const isWarning = percentage >= 80;

            return (
              <Card key={budget.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{budget.category_name}</CardTitle>
                    <span className="text-xs px-2 py-1 bg-muted rounded-full font-medium">Bulan {budget.month}/{budget.year}</span>
                  </div>
                  <CardDescription>Limit: {formatCurrency(budget.amount)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Terpakai</span>
                      <span className={`font-medium ${isWarning ? 'text-destructive' : ''}`}>
                        {formatCurrency(spent)}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${isWarning ? 'bg-destructive' : 'bg-primary'} transition-all`} 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-right text-muted-foreground">
                      {percentage.toFixed(0)}%
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  );
}
