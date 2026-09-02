"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Receipt, 
  Tags,
  PieChart,
  MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    { title: "Home", href: "/", icon: LayoutDashboard },
    { title: "Transaksi", href: "/transactions", icon: Receipt },
    { title: "Kategori", href: "/categories", icon: Tags },
    { title: "Analytics", href: "/analytics", icon: PieChart },
    { title: "Lainnya", href: "/more", icon: MoreHorizontal },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t bg-background/80 px-2 backdrop-blur-lg pb-safe sm:hidden">
      {navItems.map((item, index) => {
        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        
        return (
          <Link
            key={index}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 w-full h-full transition-colors",
              isActive 
                ? "text-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className={cn(
              "flex items-center justify-center rounded-full p-1",
              isActive ? "bg-primary/10" : ""
            )}>
              <item.icon className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-medium">{item.title}</span>
          </Link>
        )
      })}
    </div>
  );
}
