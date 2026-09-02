import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { SyncProvider } from "@/components/providers/SyncProvider";
import { Toaster } from "@/components/ui/sonner";
import { CreditCard, LogOut } from "lucide-react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FinTrack Personal",
  description: "Aplikasi manajemen keuangan pribadi",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-muted/20">
        <div className="flex min-h-screen pb-16 sm:pb-0">
          {/* Desktop Sidebar */}
          <div className="hidden sm:flex">
            <Sidebar />
          </div>
          
          <main className="flex-1 flex flex-col min-w-0 max-w-full">
            {/* Mobile App Bar */}
            <div className="flex items-center justify-between h-14 px-4 border-b bg-background sticky top-0 z-40 sm:hidden">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-primary">
                  <CreditCard className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-bold tracking-tight">FinTrack</span>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 w-full bg-background/50 sm:bg-background">
              <SyncProvider>
                {children}
              </SyncProvider>
            </div>
          </main>

          {/* Mobile Bottom Navigation */}
          <MobileNav />
        </div>
        <Toaster />
      </body>
    </html>
  );
}
