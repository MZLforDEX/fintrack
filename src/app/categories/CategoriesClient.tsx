"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Category } from "@/lib/db";
import { Plus, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function CategoriesClient() {
  const categories = useLiveQuery(() => db.categories.toArray()) || [];

  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<'Income' | 'Expense'>("Expense");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const newId = uuidv4();

    const payload: Category = {
      id: newId,
      name,
      type,
    };

    try {
      await db.categories.add(payload);
      
      await db.syncQueue.add({
        operation: 'INSERT',
        table: 'categories',
        payload: {
          id: payload.id,
          name: payload.name,
          type: payload.type,
        },
        created_at: new Date().toISOString()
      });

      toast.success("Kategori berhasil ditambahkan!");
      setIsOpen(false);
      setName("");
    } catch (err) {
      toast.error("Gagal menyimpan kategori.");
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 sm:space-y-8 sm:p-8 sm:pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Kategori</h2>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Tambah Kategori</span>
              <span className="sm:hidden">Tambah</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Kategori Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nama Kategori</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Contoh: Makan & Minum" />
              </div>

              <div className="space-y-2">
                <Label>Tipe</Label>
                <Select value={type} onValueChange={(v: 'Income'|'Expense') => setType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Expense">Pengeluaran</SelectItem>
                    <SelectItem value="Income">Pemasukan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full">Simpan Kategori</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-emerald-500">Kategori Pemasukan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {categories.filter(c => c.type === 'Income').length === 0 && (
                <p className="text-sm text-muted-foreground">Belum ada kategori.</p>
              )}
              {categories.filter(c => c.type === 'Income').map(cat => (
                <div key={cat.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Tags className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{cat.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Kategori Pengeluaran</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {categories.filter(c => c.type === 'Expense').length === 0 && (
                <p className="text-sm text-muted-foreground">Belum ada kategori.</p>
              )}
              {categories.filter(c => c.type === 'Expense').map(cat => (
                <div key={cat.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Tags className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{cat.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
