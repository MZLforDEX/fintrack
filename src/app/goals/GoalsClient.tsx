"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, FinancialGoal } from "@/lib/db";
import { Plus, Target, Trash2, TrendingUp, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";

export default function GoalsClient() {
  const goals = useLiveQuery(() => db.goals.toArray()) || [];

  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");

  // Add Progress Modal
  const [selectedGoal, setSelectedGoal] = useState<FinancialGoal | null>(null);
  const [progressAmount, setProgressAmount] = useState("");
  const [isProgressOpen, setIsProgressOpen] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !targetAmount) return;

    const newId = uuidv4();

    const payload: FinancialGoal = {
      id: newId,
      title,
      target_amount: Number(targetAmount),
      current_amount: 0,
      status: 'Active',
      created_at: new Date().toISOString()
    };

    try {
      await db.goals.add(payload);
      
      await db.syncQueue.add({
        operation: 'INSERT',
        table: 'financial_goals',
        payload: {
          id: payload.id,
          title: payload.title,
          target_amount: payload.target_amount,
          current_amount: payload.current_amount,
          status: payload.status,
        },
        created_at: new Date().toISOString()
      });

      toast.success("Goal berhasil ditambahkan!");
      setIsOpen(false);
      setTitle("");
      setTargetAmount("");
    } catch (err) {
      toast.error("Gagal menyimpan goal.");
    }
  };

  const handleSaveProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal || !progressAmount) return;

    const addVal = Number(progressAmount);
    if (isNaN(addVal) || addVal <= 0) {
      toast.error("Nominal tabungan tidak valid.");
      return;
    }

    const newCurrent = selectedGoal.current_amount + addVal;
    const newStatus = newCurrent >= selectedGoal.target_amount ? 'Completed' : selectedGoal.status;

    try {
      await db.goals.update(selectedGoal.id, {
        current_amount: newCurrent,
        status: newStatus,
        updated_at: new Date().toISOString()
      });

      await db.syncQueue.add({
        operation: 'UPDATE',
        table: 'financial_goals',
        payload: {
          id: selectedGoal.id,
          title: selectedGoal.title,
          target_amount: selectedGoal.target_amount,
          current_amount: newCurrent,
          status: newStatus,
        },
        created_at: new Date().toISOString()
      });

      if (newStatus === 'Completed') {
        toast.success(`🎉 Selamat! Target goal "${selectedGoal.title}" telah tercapai 100%!`);
      } else {
        toast.success(`Tabungan Rp ${addVal.toLocaleString('id-ID')} berhasil ditambahkan ke goal "${selectedGoal.title}"!`);
      }

      setIsProgressOpen(false);
      setSelectedGoal(null);
      setProgressAmount("");
    } catch (err) {
      toast.error("Gagal memperbarui tabungan goal.");
    }
  };

  const handleDeleteGoal = async (id: string, goalTitle?: string) => {
    try {
      await db.goals.delete(id);

      const pendingItems = await db.syncQueue.toArray();
      for (const item of pendingItems) {
        if (item.table === 'financial_goals' && item.payload?.id === id) {
          await db.syncQueue.delete(item.id!);
        }
      }

      await db.syncQueue.add({
        operation: 'DELETE',
        table: 'financial_goals',
        payload: { id },
        created_at: new Date().toISOString()
      });

      toast.success(`Goal "${goalTitle || 'Target'}" berhasil dihapus.`);
    } catch (err) {
      toast.error("Gagal menghapus goal.");
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 sm:space-y-8 sm:p-8 sm:pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Financial Goals</h2>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Tambah Goal</span>
              <span className="sm:hidden">Tambah</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buat Financial Goal Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nama Goal</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Contoh: Beli Laptop Baru" />
              </div>

              <div className="space-y-2">
                <Label>Target Dana (Rp)</Label>
                <Input type="number" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} required placeholder="Contoh: 15000000" />
              </div>

              <Button type="submit" className="w-full">Simpan Goal</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Add Progress Dialog */}
      <Dialog open={isProgressOpen} onOpenChange={setIsProgressOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Setor Tabungan ke Goal</DialogTitle>
            <CardDescription>
              Target: <strong>{selectedGoal?.title}</strong> ({formatCurrency(selectedGoal?.target_amount || 0)})
            </CardDescription>
          </DialogHeader>
          <form onSubmit={handleSaveProgress} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Nominal Tabungan yang Disetor (Rp)</Label>
              <Input 
                type="number" 
                min="1"
                value={progressAmount} 
                onChange={(e) => setProgressAmount(e.target.value)} 
                required 
                placeholder="Contoh: 500000" 
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full gap-2">
              <TrendingUp className="h-4 w-4" />
              Tambah ke Tabungan
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {goals.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground border rounded-lg border-dashed">
            Belum ada goal yang dibuat.
          </div>
        ) : (
          goals.map(goal => {
            const percentage = Math.min((goal.current_amount / (goal.target_amount || 1)) * 100, 100);
            const isCompleted = percentage >= 100 || goal.status === 'Completed';

            return (
              <Card key={goal.id} className="relative group hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 pr-2">
                      <CardTitle className="text-lg truncate">{goal.title}</CardTitle>
                      <CardDescription>Target: {formatCurrency(goal.target_amount)}</CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteGoal(goal.id, goal.title)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-70 group-hover:opacity-100 transition-opacity"
                        title="Hapus goal"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mt-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Terkumpul</span>
                      <span className="font-semibold text-emerald-500">
                        {formatCurrency(goal.current_amount)}
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${isCompleted ? 'bg-emerald-500' : 'bg-primary'}`} 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <div className="flex items-center gap-1.5">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-full">
                            <CheckCircle className="h-3 w-3" />
                            Tercapai
                          </span>
                        ) : (
                          <span className="text-xs font-medium px-2 py-0.5 bg-muted rounded-full">
                            {percentage.toFixed(0)}%
                          </span>
                        )}
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedGoal(goal);
                          setProgressAmount("");
                          setIsProgressOpen(true);
                        }}
                        className="h-7 text-xs gap-1 border-primary/30 hover:bg-primary/10 text-primary"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Setor Tabungan
                      </Button>
                    </div>
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

