"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { db, seedDefaultCategories } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface SyncContextType {
  isSyncing: boolean;
  isOnline: boolean;
  syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType>({
  isSyncing: false,
  isOnline: true,
  syncNow: async () => {},
});

export const useSync = () => useContext(SyncContext);

export function SyncProvider({ children }: { children: ReactNode }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const supabase = createClient();

  // Initial Data Pull (Server to Local DB)
  const pullData = async () => {
    try {
      // Get current user id
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      if (!userId) return;

      // Pull Categories
      const { data: categories } = await supabase.from('categories').select('*');
      if (categories) await db.categories.bulkPut(categories);

      // Pull Transactions
      const { data: transactions } = await supabase.from('transactions').select('*, categories(name)');
      if (transactions) {
        const formattedTxs = transactions.map((tx: any) => ({
          ...tx,
          category_name: tx.categories?.name
        }));
        await db.transactions.bulkPut(formattedTxs);
      }

      // Pull Budgets
      const { data: budgets } = await supabase.from('budgets').select('*, categories(name)');
      if (budgets) {
        const formattedBudgets = budgets.map((b: any) => ({
          ...b,
          category_name: b.categories?.name
        }));
        await db.budgets.bulkPut(formattedBudgets);
      }

      // Pull Goals
      const { data: goals } = await supabase.from('financial_goals').select('*');
      if (goals) await db.goals.bulkPut(goals);

    } catch (error) {
      console.error("Error pulling data:", error);
    }
  };

  // Push local changes (Sync Queue) to Server
  const pushData = async () => {
    if (!navigator.onLine) return;
    
    const queue = await db.syncQueue.orderBy('created_at').toArray();
    if (queue.length === 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setIsSyncing(true);
    let successCount = 0;

    for (const item of queue) {
      try {
        if (item.operation === 'INSERT') {
          // Inject user_id
          const payload = { ...item.payload, user_id: user.id };
          const { error } = await supabase.from(item.table).insert(payload);
          if (!error) {
            await db.syncQueue.delete(item.id!);
            successCount++;
          } else {
             console.error("Sync error INSERT:", error);
          }
        } else if (item.operation === 'UPDATE') {
          const { id, ...data } = item.payload;
          const { error } = await supabase.from(item.table).update(data).eq('id', id);
          if (!error) {
            await db.syncQueue.delete(item.id!);
            successCount++;
          } else {
             console.error("Sync error UPDATE:", error);
          }
        } else if (item.operation === 'DELETE') {
          const { error } = await supabase.from(item.table).delete().eq('id', item.payload.id);
          if (!error) {
            await db.syncQueue.delete(item.id!);
            successCount++;
          } else {
             console.error("Sync error DELETE:", error);
          }
        }
      } catch (err) {
        console.error("Sync failed for item:", item, err);
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} data berhasil disinkronkan ke server.`);
      await pullData(); // Refresh local DB with server generated fields
    }
    
    setIsSyncing(false);
  };

  const syncNow = async () => {
    if (!navigator.onLine) return;
    await pushData();
    await pullData();
  };

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      toast.info("Kembali online. Menyinkronkan data...");
      syncNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("Koneksi terputus. Mode offline aktif.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Seed default categories if empty
    seedDefaultCategories();

    // Initial sync on mount
    syncNow();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <SyncContext.Provider value={{ isSyncing, isOnline, syncNow }}>
      {children}
      
      {/* Offline Indicator */}
      {!isOnline && (
        <div className="fixed bottom-16 sm:bottom-4 right-4 z-50 bg-orange-500 text-white text-xs px-3 py-1.5 rounded-full shadow-lg font-medium flex items-center gap-2 animate-pulse">
          <div className="w-2 h-2 bg-white rounded-full" />
          Offline Mode
        </div>
      )}
    </SyncContext.Provider>
  );
}
