"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";
import { db, seedDefaultCategories, seedDefaultProducts } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { getLocalDateString, migrateInconsistentTransactionDates } from "@/lib/dateUtils";
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
  forcePushLocalToCloud: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType>({
  isSyncing: false,
  isOnline: true,
  pendingCount: 0,
  syncNow: async () => {},
  forcePushLocalToCloud: async () => {},
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

  // 1. Pull Server Data to Local IndexedDB (LOCAL-WINS STRATEGY)
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

      // A. Pull Categories (Merge with local)
      const { data: categories } = await supabase.from('categories').select('*');
      if (categories && categories.length > 0) {
        const validCategories = categories.filter((c: any) => !pendingDeletes.has(`categories:${c.id}`));
        const localCats = await db.categories.toArray();
        const localCatIds = new Set(localCats.map(c => c.id));
        
        // Add only newly discovered categories from cloud
        const newCatsToInsert = validCategories.filter((c: any) => !localCatIds.has(c.id));
        if (newCatsToInsert.length > 0) {
          await db.categories.bulkPut(newCatsToInsert);
        }
      }

      // B. Pull Transactions (Local data is authority)
      const { data: transactions } = await supabase.from('transactions').select('*, categories(name)');
      if (transactions && transactions.length > 0) {
        const localTxs = await db.transactions.toArray();
        const localTxIds = new Set(localTxs.map(tx => tx.id));

        // Insert new transactions from cloud that do NOT exist locally and were not deleted locally
        const newTxsFromCloud = transactions
          .filter((tx: any) => !localTxIds.has(tx.id) && !pendingDeletes.has(`transactions:${tx.id}`))
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

        if (newTxsFromCloud.length > 0) {
          await db.transactions.bulkPut(newTxsFromCloud);
        }
      }

      // C. Pull Budgets
      const { data: budgets } = await supabase.from('budgets').select('*, categories(name)');
      if (budgets && budgets.length > 0) {
        const localBudgets = await db.budgets.toArray();
        const localBudgetIds = new Set(localBudgets.map(b => b.id));
        const newBudgets = budgets
          .filter((b: any) => !localBudgetIds.has(b.id) && !pendingDeletes.has(`budgets:${b.id}`))
          .map((b: any) => ({
            ...b,
            category_name: b.categories?.name || 'Lainnya'
          }));

        if (newBudgets.length > 0) {
          await db.budgets.bulkPut(newBudgets);
        }
      }

      // D. Pull Financial Goals
      const { data: goals } = await supabase.from('financial_goals').select('*');
      if (goals && goals.length > 0) {
        const localGoals = await db.goals.toArray();
        const localGoalIds = new Set(localGoals.map(g => g.id));
        const newGoals = goals.filter((g: any) => !localGoalIds.has(g.id) && !pendingDeletes.has(`financial_goals:${g.id}`));

        if (newGoals.length > 0) {
          await db.goals.bulkPut(newGoals);
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

            if (payload.transaction_date) {
              const safeDate = payload.transaction_date.slice(0, 10);
              if (/^\d{4}-\d{2}-\d{2}$/.test(safeDate)) {
                payload.transaction_date = safeDate;
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
    }
    
    isSyncingRef.current = false;
    setIsSyncing(false);
  };

  // 3. Force Push: Overwrite everything in Supabase Cloud with Local Device State
  const forcePushLocalToCloud = async () => {
    if (!navigator.onLine) {
      toast.error("Tidak dapat menimpa data cloud saat sedang offline.");
      return;
    }

    setIsSyncing(true);
    isSyncingRef.current = true;
    toast.info("Mengunggah dan menimpa database cloud dengan data lokal...");

    try {
      const serverCats = await getServerCategories();
      const defaultExpenseCat = serverCats.find((c: any) => c.type === 'Expense') || serverCats[0];
      const defaultIncomeCat = serverCats.find((c: any) => c.type === 'Income') || serverCats[0];

      // A. Overwrite Categories
      const localCats = await db.categories.toArray();
      for (const lcat of localCats) {
        const catPayload = {
          id: lcat.id.includes('-') && lcat.id.length === 36 ? lcat.id : undefined,
          user_id: DEFAULT_USER_ID,
          name: lcat.name,
          type: lcat.type,
          icon: lcat.icon || 'Tags',
        };
        if (catPayload.id) {
          await supabase.from('categories').upsert([catPayload]);
        }
      }

      // B. Overwrite Transactions
      const localTxs = await db.transactions.toArray();
      const formattedUploadTxs = [];

      for (const tx of localTxs) {
        const localCat = localCats.find(c => c.id === tx.category_id);
        const targetName = localCat?.name || LOCAL_CAT_NAME_MAP[tx.category_id] || tx.category_name || '';
        const targetType = tx.type || 'Expense';

        let matchedCat = serverCats.find(
          (c: any) => c.type === targetType && targetName && c.name.toLowerCase().trim() === targetName.toLowerCase().trim()
        );

        if (!matchedCat) {
          matchedCat = targetType === 'Expense' ? defaultExpenseCat : defaultIncomeCat;
        }

        let dateFormatted = getLocalDateString();
        if (tx.transaction_date && tx.transaction_date.length >= 10) {
          const safeDate = tx.transaction_date.slice(0, 10);
          if (/^\d{4}-\d{2}-\d{2}$/.test(safeDate)) {
            dateFormatted = safeDate;
          }
        }

        formattedUploadTxs.push({
          id: tx.id,
          user_id: DEFAULT_USER_ID,
          category_id: matchedCat?.id || defaultExpenseCat.id,
          type: tx.type,
          amount: Number(tx.amount),
          description: tx.description || '',
          transaction_date: dateFormatted,
        });
      }

      if (formattedUploadTxs.length > 0) {
        await supabase.from('transactions').upsert(formattedUploadTxs);
      }

      // Clear sync queue
      await db.syncQueue.clear();
      setPendingCount(0);

      toast.success(`✓ Berhasil menimpa cloud! ${formattedUploadTxs.length} transaksi lokal tersimpan di Supabase.`);
    } catch (err: any) {
      console.error("Force push error:", err);
      toast.error("Gagal menimpa data cloud: " + (err.message || "Error"));
    } finally {
      setIsSyncing(false);
      isSyncingRef.current = false;
    }
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
    migrateInconsistentTransactionDates();
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
    <SyncContext.Provider value={{ isSyncing, isOnline, pendingCount, syncNow, forcePushLocalToCloud }}>
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



