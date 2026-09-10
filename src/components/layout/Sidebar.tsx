"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Receipt, 
  CalendarDays, 
  PieChart, 
  MoreHorizontal,
  CreditCard
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { title: "Dashboard", href: "/", icon: LayoutDashboard },
    { title: "Transaksi", href: "/transactions", icon: Receipt },
    { title: "Kalender", href: "/calendar", icon: CalendarDays },
    { title: "Analytics", href: "/analytics", icon: PieChart },
    { title: "Lainnya", href: "/more", icon: MoreHorizontal },
  ];

  return (
    <div className="flex h-screen w-72 flex-col border-r bg-card/50 backdrop-blur-sm">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <CreditCard className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold tracking-tight">FinTrack</span>
      </div>
      <div className="flex-1 overflow-auto py-6">
        <div className="px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Menu Utama
        </div>
        <nav className="grid gap-1 px-3">
          {navItems.map((item, index) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            
            return (
              <Link
                key={index}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            )
          })}
        </nav>
      </div>
      <div className="border-t p-4 px-6 text-xs text-muted-foreground flex items-center justify-between">
        <span className="font-medium text-foreground/80">FinTrack</span>
        <span className="font-mono bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded text-[11px] font-semibold border border-emerald-500/20">
          v1.2 Offline
        </span>
      </div>
    </div>
  );
}
