import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import { MobileUrgentAlert } from "@/components/MobileUrgentAlert";
import { GlobalAlerts } from "@/components/GlobalAlerts";
import { AISimulator } from "@/components/AISimulator";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mi Negocio IA - Dashboard",
  description: "Panel de control para tu asistente virtual",
};

import { AnalyticsProvider } from "@/providers/AnalyticsProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-[#F8FAFC] flex h-screen overflow-hidden text-gray-900`}>
        <AnalyticsProvider>
          <Sidebar />
          <main className="flex-1 overflow-auto relative pb-16 md:pb-0">
            <MobileUrgentAlert />
            <GlobalAlerts />
            <AISimulator />
            {children}
          </main>
          <MobileNav />
        </AnalyticsProvider>
      </body>
    </html>
  );
}
