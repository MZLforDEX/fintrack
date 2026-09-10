"use client";

import { createContext, useContext, useEffect, ReactNode } from "react";
import { seedDefaultCategories, seedDefaultProducts, db } from "@/lib/db";
import { migrateInconsistentTransactionDates } from "@/lib/dateUtils";

interface SyncContextType {
  isSyncing: boolean;
  isOnline: boolean;
  pendingCount: number;
  syncNow: () => Promise<void>;
  forcePushLocalToCloud: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType>({
  isSyncing: false,
  isOnline: false,
  pendingCount: 0,
  syncNow: async () => {},
  forcePushLocalToCloud: async () => {},
});

export const useSync = () => useContext(SyncContext);

export function SyncProvider({ children }: { children: ReactNode }) {
  // Self-heal any incorrectly assigned categories in local DB
  const repairMisassignedCategories = async () => {
    try {
      const localTxs = await db.transactions.toArray();
      for (const tx of localTxs) {
        if (tx.type === "Expense" && (tx.category_name === "Beasiswa" || tx.category_name === "Gaji & Upah" || !tx.category_name)) {
          const desc = (tx.description || "").toLowerCase();
          let targetCatName = "Makanan & Minuman";
          let targetCatId = "cat-exp-1";

          if (desc.includes("bensin") || desc.includes("pertalite") || desc.includes("transport") || desc.includes("parkir")) {
            targetCatName = "Transportasi & Bensin";
            targetCatId = "cat-exp-3";
          } else if (desc.includes("kos") || desc.includes("kontrakan") || desc.includes("sewa")) {
            targetCatName = "Tempat Tinggal (Sewa / Cicilan)";
            targetCatId = "cat-exp-5";
          } else if (desc.includes("belanja") || desc.includes("sembako") || desc.includes("indomaret") || desc.includes("alfamart")) {
            targetCatName = "Belanja Bulanan & Sembako";
            targetCatId = "cat-exp-2";
          } else if (desc.includes("listrik") || desc.includes("pln") || desc.includes("wifi") || desc.includes("pulsa")) {
            targetCatName = "Tagihan & Utilitas (Listrik, Air, Internet)";
            targetCatId = "cat-exp-4";
          }

          await db.transactions.update(tx.id, {
            category_id: targetCatId,
            category_name: targetCatName,
          });
        }
      }
    } catch (e) {
      console.error("Local repair error:", e);
    }
  };

  useEffect(() => {
    // 100% Offline Local Initialization
    seedDefaultCategories();
    seedDefaultProducts();
    repairMisassignedCategories();
    migrateInconsistentTransactionDates();
  }, []);

  return (
    <SyncContext.Provider
      value={{
        isSyncing: false,
        isOnline: false,
        pendingCount: 0,
        syncNow: async () => {},
        forcePushLocalToCloud: async () => {},
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}
