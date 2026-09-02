'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Product, seedDefaultProducts } from '@/lib/db';
import { createClient } from '@/lib/supabase/client';
import { 
  Barcode, 
  Plus, 
  Pencil, 
  Trash2, 
  Search, 
  RotateCcw, 
  Wallet, 
  Target, 
  Tags,
  ChevronRight,
  PackagePlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';

export default function MoreClient() {
  const products = useLiveQuery(() => db.products.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.where('type').equals('Expense').toArray()) || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Add Product Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addBarcode, setAddBarcode] = useState('');
  const [addName, setAddName] = useState('');
  const [addPrice, setAddPrice] = useState('');
  const [addCategoryId, setAddCategoryId] = useState('');

  // Edit Product Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBarcode, setEditBarcode] = useState('');
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');

  useEffect(() => {
    const init = async () => {
      await seedDefaultProducts();
    };
    init();
  }, []);

  const handleOpenAdd = () => {
    setAddBarcode('');
    setAddName('');
    setAddPrice('');
    setAddCategoryId(categories[0]?.id || '');
    setIsAddOpen(true);
  };

  const handleOpenEdit = (prod: Product) => {
    setEditingId(prod.id);
    setEditBarcode(prod.barcode);
    setEditName(prod.name);
    setEditPrice(String(prod.default_price));
    setEditCategoryId(prod.category_id || (categories[0]?.id || ''));
    setIsEditOpen(true);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addBarcode.trim() || !addName.trim() || !addPrice) {
      toast.error('Mohon lengkapi seluruh kolom produk.');
      return;
    }

    const catName = categories.find(c => c.id === addCategoryId)?.name || 'Pengeluaran';
    const nowIso = new Date().toISOString();

    const newProduct: Product = {
      id: uuidv4(),
      barcode: addBarcode.trim(),
      name: addName.trim(),
      default_price: Number(addPrice),
      category_id: addCategoryId,
      category_name: catName,
      created_at: nowIso,
      updated_at: nowIso,
    };

    try {
      await db.products.add(newProduct);
      toast.success(`Produk "${newProduct.name}" berhasil ditambahkan!`);
      setIsAddOpen(false);
    } catch (err) {
      toast.error('Gagal menambahkan produk. Nomor barcode mungkin sudah terdaftar.');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editBarcode.trim() || !editName.trim() || !editPrice) {
      toast.error('Mohon lengkapi seluruh kolom produk.');
      return;
    }

    const catName = categories.find(c => c.id === editCategoryId)?.name || 'Pengeluaran';
    const nowIso = new Date().toISOString();

    const updatedData = {
      barcode: editBarcode.trim(),
      name: editName.trim(),
      default_price: Number(editPrice),
      category_id: editCategoryId,
      category_name: catName,
      updated_at: nowIso,
    };

    try {
      await db.products.update(editingId, updatedData);
      toast.success(`Produk "${updatedData.name}" berhasil diperbarui!`);
      setIsEditOpen(false);
      setEditingId(null);
    } catch (err) {
      toast.error('Gagal memperbarui produk.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await db.products.delete(id);
      toast.success(`Produk "${name}" berhasil dihapus.`);
    } catch (err) {
      toast.error('Gagal menghapus produk.');
    }
  };

  const handleResetDefault = async () => {
    try {
      await seedDefaultProducts(true);
      toast.success('100 data barcode bawaan berhasil dimuat ulang!');
    } catch (err) {
      toast.error('Gagal memuat ulang data produk bawaan.');
    }
  };

  // Filtered Products
  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex-1 space-y-6 p-4 sm:space-y-8 sm:p-8 sm:pt-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Menu Lainnya</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Akses fitur kategori keuangan, anggaran, target tabungan, dan kelola master data barcode barang.
        </p>
      </div>

      {/* Quick Navigation Cards for Categories, Budget & Goals */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/categories" className="block group">
          <Card className="hover:shadow-md hover:border-primary/50 transition-all cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                  <Tags className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg">Kategori</CardTitle>
                  <CardDescription className="text-xs">
                    Kelola jenis pemasukan & pengeluaran
                  </CardDescription>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
            </CardHeader>
          </Card>
        </Link>

        <Link href="/budgets" className="block group">
          <Card className="hover:shadow-md hover:border-primary/50 transition-all cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg">Budget Bulanan</CardTitle>
                  <CardDescription className="text-xs">
                    Atur limit pengeluaran per kategori
                  </CardDescription>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </CardHeader>
          </Card>
        </Link>

        <Link href="/goals" className="block group">
          <Card className="hover:shadow-md hover:border-primary/50 transition-all cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg">Financial Goals</CardTitle>
                  <CardDescription className="text-xs">
                    Pantau target tabungan & impian
                  </CardDescription>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Barcode Products Management Section */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <Barcode className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl">Master Data Barcode Barang</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Kelola nama, harga, dan kategori barang yang terhubung dengan barcode.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetDefault}
                className="gap-1.5 text-xs"
                title="Muat ulang 100 data barcode standar"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Muat 100 Bawaan</span>
                <span className="sm:hidden">Reset</span>
              </Button>

              <Button
                size="sm"
                onClick={handleOpenAdd}
                className="gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah Barcode
              </Button>
            </div>
          </div>

          {/* Search and Category Filter */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama barang atau kode barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs sm:text-sm"
              />
            </div>

            <div className="w-full sm:w-[220px]">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="text-xs sm:text-sm">
                  <SelectValue placeholder="Semua Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Kategori</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <span>Menampilkan {filteredProducts.length} dari {products.length} produk</span>
          </div>
        </CardHeader>

        <CardContent className="p-0 border-t">
          {products.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-3">
              <Barcode className="h-10 w-10 mx-auto opacity-30 text-primary" />
              <div>
                <p className="font-semibold text-foreground text-sm">Belum ada data barcode tersimpan</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Muat 100 data barcode produk makanan, minuman, dan kebutuhan harian bawaan untuk memulai.
                </p>
              </div>
              <Button size="sm" onClick={handleResetDefault} className="gap-1.5 mt-2">
                <RotateCcw className="h-3.5 w-3.5" />
                Muat 100 Data Barcode Bawaan
              </Button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Tidak ada produk yang cocok dengan pencarian &quot;{searchQuery}&quot;.
            </div>
          ) : (
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {filteredProducts.map(product => (
                <div 
                  key={product.id} 
                  className="flex items-center justify-between p-3 sm:px-6 hover:bg-muted/20 transition-colors group"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted/30 text-primary">
                      <Barcode className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm sm:text-base leading-tight truncate text-foreground">
                        {product.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-muted-foreground">
                        <span className="font-mono bg-muted/60 px-1.5 py-0.5 rounded text-[11px] font-medium text-foreground/80">
                          {product.barcode}
                        </span>
                        <span>•</span>
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {product.category_name || 'Pengeluaran'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <div className="text-sm sm:text-base font-bold text-foreground">
                      {formatCurrency(product.default_price)}
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(product)}
                        className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                        title="Edit produk"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(product.id, product.name)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Hapus produk"
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

      {/* Add Product Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Tambah Data Barcode Produk</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveAdd} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Nomor Barcode / EAN</Label>
              <Input
                value={addBarcode}
                onChange={(e) => setAddBarcode(e.target.value)}
                placeholder="Contoh: 8992753123456"
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Nama Barang / Produk</Label>
              <Input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Contoh: Kopi Kapal Api 65g"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Harga Default (Rp)</Label>
              <Input
                type="number"
                min="0"
                value={addPrice}
                onChange={(e) => setAddPrice(e.target.value)}
                placeholder="Contoh: 8500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Kategori Pengeluaran</Label>
              <Select value={addCategoryId} onValueChange={setAddCategoryId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full">Simpan Produk</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Product Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Edit Data Barcode Produk</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Nomor Barcode / EAN</Label>
              <Input
                value={editBarcode}
                onChange={(e) => setEditBarcode(e.target.value)}
                placeholder="Contoh: 8992753123456"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Nama Barang / Produk</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Contoh: Kopi Kapal Api 65g"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Harga Default (Rp)</Label>
              <Input
                type="number"
                min="0"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                placeholder="Contoh: 8500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Kategori Pengeluaran</Label>
              <Select value={editCategoryId} onValueChange={setEditCategoryId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full">Simpan Perubahan</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
