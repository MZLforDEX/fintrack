"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Category, seedDefaultCategories, DEFAULT_CATEGORIES } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import { 
  Plus, 
  Tags, 
  Trash2, 
  RotateCcw, 
  Briefcase, 
  Gift, 
  TrendingUp, 
  Store, 
  Laptop, 
  HeartHandshake, 
  Coins, 
  Utensils, 
  ShoppingCart, 
  Car, 
  Zap, 
  Home, 
  Stethoscope, 
  GraduationCap, 
  Gamepad2, 
  Shirt, 
  Users, 
  Heart, 
  CreditCard, 
  Sparkles, 
  Wrench, 
  MoreHorizontal 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Map category icons to Lucide components
function getCategoryIcon(iconName?: string, type?: 'Income' | 'Expense') {
  const iconProps = { className: "h-4 w-4 shrink-0" };
  
  switch (iconName) {
    case 'Briefcase': return <Briefcase {...iconProps} />;
    case 'Gift': return <Gift {...iconProps} />;
    case 'TrendingUp': return <TrendingUp {...iconProps} />;
    case 'Store': return <Store {...iconProps} />;
    case 'Laptop': return <Laptop {...iconProps} />;
    case 'HeartHandshake': return <HeartHandshake {...iconProps} />;
    case 'RotateCcw': return <RotateCcw {...iconProps} />;
    case 'Coins': return <Coins {...iconProps} />;
    case 'Utensils': return <Utensils {...iconProps} />;
    case 'ShoppingCart': return <ShoppingCart {...iconProps} />;
    case 'Car': return <Car {...iconProps} />;
    case 'Zap': return <Zap {...iconProps} />;
    case 'Home': return <Home {...iconProps} />;
    case 'Stethoscope': return <Stethoscope {...iconProps} />;
    case 'GraduationCap': return <GraduationCap {...iconProps} />;
    case 'Gamepad2': return <Gamepad2 {...iconProps} />;
    case 'Shirt': return <Shirt {...iconProps} />;
    case 'Users': return <Users {...iconProps} />;
    case 'Heart': return <Heart {...iconProps} />;
    case 'CreditCard': return <CreditCard {...iconProps} />;
    case 'Sparkles': return <Sparkles {...iconProps} />;
    case 'Wrench': return <Wrench {...iconProps} />;
    case 'MoreHorizontal': return <MoreHorizontal {...iconProps} />;
    default:
      return type === 'Income' ? <Coins {...iconProps} /> : <Tags {...iconProps} />;
  }
}

export default function CategoriesClient() {
  const categories = useLiveQuery(() => db.categories.toArray()) || [];

  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<'Income' | 'Expense'>("Expense");
  const [icon, setIcon] = useState("Tags");

  // Auto seed default categories if none exist
  useEffect(() => {
    seedDefaultCategories();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newId = uuidv4();

    const payload: Category = {
      id: newId,
      name: name.trim(),
      type,
      icon,
      created_at: new Date().toISOString()
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
          icon: payload.icon,
        },
        created_at: new Date().toISOString()
      });

      toast.success("Kategori berhasil ditambahkan!");
      setIsOpen(false);
      setName("");
      setIcon("Tags");
    } catch (err) {
      toast.error("Gagal menyimpan kategori.");
    }
  };

  const handleDelete = async (id: string, catName: string) => {
    try {
      await db.categories.delete(id);

      const pendingItems = await db.syncQueue.toArray();
      for (const item of pendingItems) {
        if (item.table === 'categories' && item.payload?.id === id) {
          await db.syncQueue.delete(item.id!);
        }
      }

      await db.syncQueue.add({
        operation: 'DELETE',
        table: 'categories',
        payload: { id },
        created_at: new Date().toISOString()
      });

      try {
        const supabase = createClient();
        await supabase.from('categories').delete().eq('id', id);
      } catch {}

      toast.success(`Kategori "${catName}" berhasil dihapus.`);
    } catch (err) {
      toast.error("Gagal menghapus kategori.");
    }
  };

  const handleResetDefault = async () => {
    try {
      await seedDefaultCategories(true);
      toast.success("Kategori standar berhasil dimuat ulang!");
    } catch (err) {
      toast.error("Gagal memuat kategori standar.");
    }
  };

  const incomeCategories = categories.filter(c => c.type === 'Income');
  const expenseCategories = categories.filter(c => c.type === 'Expense');

  return (
    <div className="flex-1 space-y-6 p-4 sm:space-y-8 sm:p-8 sm:pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Kategori</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola kategori pemasukan dan pengeluaran keuangan pribadi Anda.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleResetDefault} className="gap-1.5 text-xs sm:text-sm">
            <RotateCcw className="h-4 w-4" />
            <span>Muat Kategori Bawaan</span>
          </Button>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 text-xs sm:text-sm">
                <Plus className="h-4 w-4" />
                <span>Tambah Kategori</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Tambah Kategori Baru</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Nama Kategori</Label>
                  <Input 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                    placeholder="Contoh: Belanja Online, Asuransi, dll" 
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipe Transaksi</Label>
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
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Kategori Pemasukan */}
        <Card className="border-emerald-500/20 shadow-sm">
          <CardHeader className="pb-3 border-b bg-emerald-500/5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <Coins className="h-5 w-5" />
                Kategori Pemasukan
              </CardTitle>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {incomeCategories.length} Kategori
              </span>
            </div>
            <CardDescription className="text-xs">
              Sumber penerimaan dana, gaji, dan keuntungan usaha Anda
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {incomeCategories.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Belum ada kategori pemasukan. Klik tombol "Muat Kategori Bawaan" di atas.
                </div>
              ) : (
                incomeCategories.map(cat => (
                  <div 
                    key={cat.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-card border hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        {getCategoryIcon(cat.icon, 'Income')}
                      </div>
                      <span className="text-sm font-medium text-foreground">{cat.name}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(cat.id, cat.name)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-60 group-hover:opacity-100 transition-opacity"
                      title="Hapus kategori"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Kategori Pengeluaran */}
        <Card className="border-destructive/20 shadow-sm">
          <CardHeader className="pb-3 border-b bg-destructive/5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg font-semibold text-destructive flex items-center gap-2">
                <Tags className="h-5 w-5" />
                Kategori Pengeluaran
              </CardTitle>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-destructive/10 text-destructive">
                {expenseCategories.length} Kategori
              </span>
            </div>
            <CardDescription className="text-xs">
              Pos pengeluaran biaya hidup, tagihan, cicilan, dan gaya hidup
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {expenseCategories.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Belum ada kategori pengeluaran. Klik tombol "Muat Kategori Bawaan" di atas.
                </div>
              ) : (
                expenseCategories.map(cat => (
                  <div 
                    key={cat.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-card border hover:border-destructive/40 hover:bg-destructive/5 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                        {getCategoryIcon(cat.icon, 'Expense')}
                      </div>
                      <span className="text-sm font-medium text-foreground">{cat.name}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(cat.id, cat.name)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-60 group-hover:opacity-100 transition-opacity"
                      title="Hapus kategori"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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

