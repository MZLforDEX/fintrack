"use client";

import AnalyticsCharts from "./AnalyticsCharts";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

export default function AnalyticsClient() {
  const transactions = useLiveQuery(() => db.transactions.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];

  // Group by Month (Last 6 months)
  const monthlyData: Record<string, { month: string, income: number, expense: number }> = {};
  
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const monthKey = d.toLocaleString('id-ID', { month: 'short', year: 'numeric' });
    monthlyData[monthKey] = { month: monthKey, income: 0, expense: 0 };
  }

  // Group Expense by Category (Current month)
  const categoryData: Record<string, number> = {};

  const currentMonthStart = new Date();
  currentMonthStart.setDate(1);
  currentMonthStart.setHours(0, 0, 0, 0);

  transactions.forEach((tx: any) => {
    const date = new Date(tx.transaction_date);
    const monthKey = !isNaN(date.getTime()) 
      ? date.toLocaleString('id-ID', { month: 'short', year: 'numeric' })
      : 'Bulan Ini';
    
    if (monthlyData[monthKey]) {
      if (tx.type === 'Income') monthlyData[monthKey].income += Number(tx.amount);
      if (tx.type === 'Expense') monthlyData[monthKey].expense += Number(tx.amount);
    }

    if (tx.type === 'Expense' && (!isNaN(date.getTime()) ? date >= currentMonthStart : true)) {
      const catName = categories.find(c => c.id === tx.category_id)?.name || tx.category_name || 'Lainnya';
      categoryData[catName] = (categoryData[catName] || 0) + Number(tx.amount);
    }
  });

  const monthlyChartData = Object.values(monthlyData);
  const categoryChartData = Object.entries(categoryData)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

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
