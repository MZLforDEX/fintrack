"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { db, seedDefaultCategories, seedDefaultProducts } from "@/lib/db";
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

      // Get all pending operations from syncQueue to prevent resurrecting deleted items
      const allPendingQueue = await db.syncQueue.toArray();
      const pendingDeletes = new Set(
        allPendingQueue.filter(q => q.operation === 'DELETE').map(q => `${q.table}:${q.payload?.id}`)
      );
      const pendingInserts = new Set(
        allPendingQueue.filter(q => q.operation === 'INSERT').map(q => `${q.table}:${q.payload?.id}`)
      );

      // Pull Categories
      const { data: categories } = await supabase.from('categories').select('*');
      if (categories) {
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

      // Pull Transactions
      const { data: transactions } = await supabase.from('transactions').select('*, categories(name)');
      if (transactions) {
        const formattedTxs = transactions
          .filter((tx: any) => !pendingDeletes.has(`transactions:${tx.id}`))
          .map((tx: any) => ({
            ...tx,
            category_name: tx.categories?.name
          }));
        
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

      // Pull Budgets
      const { data: budgets } = await supabase.from('budgets').select('*, categories(name)');
      if (budgets) {
        const formattedBudgets = budgets
          .filter((b: any) => !pendingDeletes.has(`budgets:${b.id}`))
          .map((b: any) => ({
            ...b,
            category_name: b.categories?.name
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

      // Pull Goals
      const { data: goals } = await supabase.from('financial_goals').select('*');
      if (goals) {
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

    // Seed default categories & products if empty
    seedDefaultCategories();
    seedDefaultProducts();

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
