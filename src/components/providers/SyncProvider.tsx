"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";
import { db, seedDefaultCategories, seedDefaultProducts } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";

const DEFAULT_USER_ID = "e4b67445-6a97-4864-bbd7-1febdde17db0";

const LOCAL_CAT_NAME_MAP: Record<string, string> = {
  'cat-inc-1': 'Gaji Pokok',
  'cat-inc-2': 'Bonus & THR',
  'cat-inc-3': 'Investasi & Dividen',
  'cat-inc-4': 'Bisnis / Usaha',
  'cat-inc-5': 'Freelance / Sampingan',
  'cat-inc-6': 'Hadiah & Hibah',
  'cat-inc-7': 'Pengembalian Dana (Refund)',
  'cat-inc-8': 'Pemasukan Lainnya',
  'cat-exp-1': 'Makanan & Minuman',
  'cat-exp-2': 'Belanja Bulanan & Sembako',
  'cat-exp-3': 'Transportasi & Bensin',
  'cat-exp-4': 'Tagihan & Utilitas (Listrik, Air, Internet)',
  'cat-exp-5': 'Tempat Tinggal (Sewa / Cicilan)',
  'cat-exp-6': 'Kesehatan & Medis',
  'cat-exp-7': 'Pendidikan & Kursus',
  'cat-exp-8': 'Hiburan & Liburan',
  'cat-exp-9': 'Belanja Pakaian & Pribadi',
  'cat-exp-10': 'Keluarga & Anak',
  'cat-exp-11': 'Sedekah, Infaq & Donasi',
  'cat-exp-12': 'Cicilan & Hutang',
  'cat-exp-13': 'Perawatan Diri & Salon',
  'cat-exp-14': 'Servis Kendaraan',
  'cat-exp-15': 'Pengeluaran Lainnya',
};

interface SyncContextType {
  isSyncing: boolean;
  isOnline: boolean;
  pendingCount: number;
  syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType>({
  isSyncing: false,
  isOnline: true,
  pendingCount: 0,
  syncNow: async () => {},
});

export const useSync = () => useContext(SyncContext);

export function SyncProvider({ children }: { children: ReactNode }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const isSyncingRef = useRef(false);
  const supabase = createClient();

  // Self-heal any incorrectly assigned categories in local DB
  const repairMisassignedCategories = async () => {
    try {
      const localTxs = await db.transactions.toArray();
      for (const tx of localTxs) {
        if (tx.type === 'Expense' && (tx.category_name === 'Beasiswa' || tx.category_name === 'Gaji & Upah' || !tx.category_name)) {
          const desc = (tx.description || '').toLowerCase();
          let targetCatName = 'Makanan & Minuman';
          let targetCatId = 'cat-exp-1';

          if (desc.includes('bensin') || desc.includes('pertalite') || desc.includes('transport') || desc.includes('parkir')) {
            targetCatName = 'Transportasi & Bensin';
            targetCatId = 'cat-exp-3';
          } else if (desc.includes('kos') || desc.includes('kontrakan') || desc.includes('sewa')) {
            targetCatName = 'Tempat Tinggal (Sewa / Cicilan)';
            targetCatId = 'cat-exp-5';
          } else if (desc.includes('belanja') || desc.includes('sembako') || desc.includes('indomaret') || desc.includes('alfamart')) {
            targetCatName = 'Belanja Bulanan & Sembako';
            targetCatId = 'cat-exp-2';
          } else if (desc.includes('listrik') || desc.includes('pln') || desc.includes('wifi') || desc.includes('pulsa')) {
            targetCatName = 'Tagihan & Utilitas (Listrik, Air, Internet)';
            targetCatId = 'cat-exp-4';
          }

          await db.transactions.update(tx.id, {
            category_id: targetCatId,
            category_name: targetCatName,
          });
        }
      }
    } catch (e) {
      console.error("Repair error:", e);
    }
  };

  // Helper to map category IDs between local and Supabase UUIDs
  const getServerCategories = async () => {
    try {
      const { data: serverCats } = await supabase.from('categories').select('*');
      return serverCats || [];
    } catch {
      return [];
    }
  };

  // 1. Pull Server Data to Local IndexedDB
  const pullData = async () => {
    if (!navigator.onLine) return;

    try {
      const allPendingQueue = await db.syncQueue.toArray();
      setPendingCount(allPendingQueue.length);

      const pendingDeletes = new Set(
        allPendingQueue.filter(q => q.operation === 'DELETE').map(q => `${q.table}:${q.payload?.id}`)
      );
      const pendingInserts = new Set(
        allPendingQueue.filter(q => q.operation === 'INSERT').map(q => `${q.table}:${q.payload?.id}`)
      );

      // A. Pull Categories
      const { data: categories } = await supabase.from('categories').select('*');
      if (categories && categories.length > 0) {
        const validCategories = categories.filter((c: any) => !pendingDeletes.has(`categories:${c.id}`));
        const serverCatIds = new Set(validCategories.map((c: any) => c.id));
        const localCats = await db.categories.toArray();
        for (const lcat of localCats) {
          if (!serverCatIds.has(lcat.id) && !pendingInserts.has(`categories:${lcat.id}`) && !lcat.id.startsWith('cat-')) {
            await db.categories.delete(lcat.id);
          }
        }
        if (validCategories.length > 0) {
          await db.categories.bulkPut(validCategories);
        }
      }

      // B. Pull Transactions
      const { data: transactions } = await supabase.from('transactions').select('*, categories(name)');
      if (transactions && transactions.length > 0) {
        const formattedTxs = transactions
          .filter((tx: any) => !pendingDeletes.has(`transactions:${tx.id}`))
          .map((tx: any) => {
            const rawCatName = tx.categories?.name;
            const safeCatName = (tx.type === 'Expense' && rawCatName === 'Beasiswa') 
              ? 'Makanan & Minuman' 
              : (rawCatName || (tx.type === 'Income' ? 'Pemasukan' : 'Pengeluaran'));

            return {
              ...tx,
              category_name: safeCatName
            };
          });
        
        const serverTxIds = new Set(formattedTxs.map((tx: any) => tx.id));
        const localTxs = await db.transactions.toArray();
        for (const ltx of localTxs) {
          if (!serverTxIds.has(ltx.id) && !pendingInserts.has(`transactions:${ltx.id}`)) {
            await db.transactions.delete(ltx.id);
          }
        }

        if (formattedTxs.length > 0) {
          await db.transactions.bulkPut(formattedTxs);
        }
      }

      // C. Pull Budgets
      const { data: budgets } = await supabase.from('budgets').select('*, categories(name)');
      if (budgets && budgets.length > 0) {
        const formattedBudgets = budgets
          .filter((b: any) => !pendingDeletes.has(`budgets:${b.id}`))
          .map((b: any) => ({
            ...b,
            category_name: b.categories?.name || 'Lainnya'
          }));
        
        const serverBudgetIds = new Set(formattedBudgets.map((b: any) => b.id));
        const localBudgets = await db.budgets.toArray();
        for (const lb of localBudgets) {
          if (!serverBudgetIds.has(lb.id) && !pendingInserts.has(`budgets:${lb.id}`)) {
            await db.budgets.delete(lb.id);
          }
        }

        if (formattedBudgets.length > 0) {
          await db.budgets.bulkPut(formattedBudgets);
        }
      }

      // D. Pull Financial Goals
      const { data: goals } = await supabase.from('financial_goals').select('*');
      if (goals && goals.length > 0) {
        const validGoals = goals.filter((g: any) => !pendingDeletes.has(`financial_goals:${g.id}`));
        const serverGoalIds = new Set(validGoals.map((g: any) => g.id));
        const localGoals = await db.goals.toArray();
        for (const lg of localGoals) {
          if (!serverGoalIds.has(lg.id) && !pendingInserts.has(`financial_goals:${lg.id}`)) {
            await db.goals.delete(lg.id);
          }
        }

        if (validGoals.length > 0) {
          await db.goals.bulkPut(validGoals);
        }
      }

    } catch (error) {
      console.error("Error pulling cloud data:", error);
    }
  };

  // 2. Push Local Queue to Server
  const pushData = async () => {
    if (!navigator.onLine || isSyncingRef.current) return;
    
    const queue = await db.syncQueue.orderBy('created_at').toArray();
    setPendingCount(queue.length);
    if (queue.length === 0) return;

    isSyncingRef.current = true;
    setIsSyncing(true);
    let successCount = 0;

    const serverCats = await getServerCategories();
    const defaultExpenseCat = serverCats.find((c: any) => c.type === 'Expense') || serverCats[0];
    const defaultIncomeCat = serverCats.find((c: any) => c.type === 'Income') || serverCats[0];

    for (const item of queue) {
      try {
        if (item.operation === 'INSERT' || item.operation === 'UPDATE') {
          let payload = { ...item.payload };
          delete payload.category_name; // Strip local computed field
          payload.user_id = payload.user_id || DEFAULT_USER_ID;

          // Normalize table-specific properties
          if (item.table === 'transactions') {
            // Find local category name
            const localCat = await db.categories.get(payload.category_id);
            const targetName = localCat?.name || LOCAL_CAT_NAME_MAP[payload.category_id] || '';
            const targetType = localCat?.type || payload.type || 'Expense';

            let matchedCat = serverCats.find(
              (c: any) => c.type === targetType && targetName && c.name.toLowerCase().trim() === targetName.toLowerCase().trim()
            );

            if (!matchedCat) {
              matchedCat = targetType === 'Expense' ? defaultExpenseCat : defaultIncomeCat;
            }

            if (matchedCat) {
              payload.category_id = matchedCat.id;
            }

            // Normalize transaction_date
            if (payload.transaction_date) {
              const d = new Date(payload.transaction_date);
              if (!isNaN(d.getTime())) {
                payload.transaction_date = format(d, 'yyyy-MM-dd');
              }
            }
          }

          if (item.table === 'budgets') {
            const localCat = await db.categories.get(payload.category_id);
            const targetName = localCat?.name || LOCAL_CAT_NAME_MAP[payload.category_id] || '';
            let matchedCat = serverCats.find(
              (c: any) => c.type === 'Expense' && targetName && c.name.toLowerCase().trim() === targetName.toLowerCase().trim()
            ) || defaultExpenseCat;

            if (matchedCat) {
              payload.category_id = matchedCat.id;
            }
          }

          const { error } = await supabase.from(item.table).upsert([payload]);
          if (!error) {
            await db.syncQueue.delete(item.id!);
            successCount++;
          } else {
            console.error(`Sync error on ${item.table} (${item.operation}):`, error);
          }
        } else if (item.operation === 'DELETE') {
          const { error } = await supabase.from(item.table).delete().eq('id', item.payload.id);
          if (!error) {
            await db.syncQueue.delete(item.id!);
            successCount++;
          } else {
            console.error(`Sync error DELETE on ${item.table}:`, error);
          }
        }
      } catch (err) {
        console.error("Sync item exception:", item, err);
      }
    }

    const remainingQueue = await db.syncQueue.toArray();
    setPendingCount(remainingQueue.length);

    if (successCount > 0) {
      toast.success(`✓ ${successCount} data offline berhasil disinkronkan ke Supabase Cloud!`);
      await pullData();
    }
    
    isSyncingRef.current = false;
    setIsSyncing(false);
  };

  const syncNow = async () => {
    if (!navigator.onLine) return;
    await pushData();
    await pullData();
  };

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      toast.info("🌐 Kembali online. Menyinkronkan data...");
      syncNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("📡 Mode offline aktif. Data disimpan di memori perangkat.");
    };

    const handleFocus = () => {
      if (navigator.onLine) {
        syncNow();
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("focus", handleFocus);

    // Initial setup & auto-repair
    seedDefaultCategories();
    seedDefaultProducts();
    repairMisassignedCategories();
    syncNow();

    // Auto sync interval every 12 seconds when online
    const interval = setInterval(() => {
      if (navigator.onLine && !isSyncingRef.current) {
        syncNow();
      }
    }, 12000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, []);

  return (
    <SyncContext.Provider value={{ isSyncing, isOnline, pendingCount, syncNow }}>
      {children}
      
      {/* Offline Status Badge */}
      {!isOnline && (
        <div className="fixed bottom-16 sm:bottom-4 right-4 z-50 bg-orange-500 text-white text-xs px-3 py-1.5 rounded-full shadow-lg font-medium flex items-center gap-2 animate-pulse">
          <CloudOff className="h-3.5 w-3.5" />
          <span>Mode Offline ({pendingCount} pending)</span>
        </div>
      )}

      {/* Syncing Active Indicator */}
      {isSyncing && (
        <div className="fixed bottom-16 sm:bottom-4 right-4 z-50 bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded-full shadow-lg font-medium flex items-center gap-2">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          <span>Menyinkronkan ke Supabase...</span>
        </div>
      )}
    </SyncContext.Provider>
  );
}


