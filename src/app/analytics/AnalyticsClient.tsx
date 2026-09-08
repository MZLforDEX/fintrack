"use client";

import { useMemo } from "react";
import AnalyticsCharts from "./AnalyticsCharts";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { parseTransactionDate } from "@/lib/dateUtils";

export default function AnalyticsClient() {
  const transactions = useLiveQuery(() => db.transactions.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];

  const { monthlyChartData, categoryChartData } = useMemo(() => {
    // Group by Month (Last 6 months, avoiding end-of-month date rollovers)
    const monthlyData: Record<string, { month: string, income: number, expense: number }> = {};
    const now = new Date();
    const currYear = now.getFullYear();
    const currMonth = now.getMonth();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currYear, currMonth - i, 1);
      const monthKey = d.toLocaleString('id-ID', { month: 'short', year: 'numeric' });
      monthlyData[monthKey] = { month: monthKey, income: 0, expense: 0 };
    }

    // Group Expense by Category (Current month)
    const categoryData: Record<string, number> = {};

    const currentMonthStart = new Date(currYear, currMonth, 1, 0, 0, 0, 0);

    transactions.forEach((tx: any) => {
      const { fullDate } = parseTransactionDate(tx);
      const monthKey = !isNaN(fullDate.getTime()) 
        ? fullDate.toLocaleString('id-ID', { month: 'short', year: 'numeric' })
        : 'Bulan Ini';
      
      if (monthlyData[monthKey]) {
        if (tx.type === 'Income') monthlyData[monthKey].income += Number(tx.amount);
        if (tx.type === 'Expense') monthlyData[monthKey].expense += Number(tx.amount);
      }

      if (tx.type === 'Expense' && (!isNaN(fullDate.getTime()) ? fullDate >= currentMonthStart : true)) {
        const catName = categories.find(c => c.id === tx.category_id)?.name || tx.category_name || 'Lainnya';
        categoryData[catName] = (categoryData[catName] || 0) + Number(tx.amount);
      }
    });

    const monthlyChartData = Object.values(monthlyData);
    const categoryChartData = Object.entries(categoryData)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { monthlyChartData, categoryChartData };
  }, [transactions, categories]);

  return (
    <div className="flex-1 space-y-6 p-4 sm:space-y-8 sm:p-8 sm:pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Analytics</h2>
      </div>
      
      <AnalyticsCharts 
        monthlyData={monthlyChartData} 
        categoryData={categoryChartData} 
      />
    </div>
  );
}
