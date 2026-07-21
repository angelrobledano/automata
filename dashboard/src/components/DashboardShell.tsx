"use client";

import { usePathname } from 'next/navigation';
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import { MobileUrgentAlert } from "./MobileUrgentAlert";
import { GlobalAlerts } from "./GlobalAlerts";
import { AISimulator } from "./AISimulator";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute = ['/', '/login', '/register', '/terms'].includes(pathname || '');

  if (isPublicRoute) {
    return <main className="flex-1 overflow-auto relative">{children}</main>;
  }

  return (
    <>
      <Sidebar />
      <main className="flex-1 overflow-auto relative pb-16 md:pb-0">
        <MobileUrgentAlert />
        <GlobalAlerts />
        <AISimulator />
        {children}
      </main>
      <MobileNav />
    </>
  );
}
