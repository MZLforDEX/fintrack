"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, FinancialGoal } from "@/lib/db";
import { Plus, Target } from "lucide-react";
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

  return (
    <div className="flex-1 space-y-6 p-4 sm:space-y-8 sm:p-8 sm:pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Goals</h2>
        
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {goals.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground border rounded-lg border-dashed">
            Belum ada goal yang dibuat.
          </div>
        ) : (
          goals.map(goal => {
            const percentage = Math.min((goal.current_amount / goal.target_amount) * 100, 100);

            return (
              <Card key={goal.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{goal.title}</CardTitle>
                    <Target className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <CardDescription>Target: {formatCurrency(goal.target_amount)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Terkumpul</span>
                      <span className="font-medium text-emerald-500">
                        {formatCurrency(goal.current_amount)}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 transition-all" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs font-medium px-2 py-0.5 bg-muted rounded-full">
                        {goal.status}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {percentage.toFixed(1)}%
                      </p>
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
