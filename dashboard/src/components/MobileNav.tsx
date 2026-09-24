"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Home, ShoppingBag, MessageSquare, Brain, Settings } from 'lucide-react';

export default function MobileNav() {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [userRole, setUserRole] = useState<string>('OWNER');

  useEffect(() => {
    // Fetch current user
    fetch('/api/auth/me').then(res => res.json()).then(data => {
      if (data.success) {
        setUserRole(data.user.role);
      }
    });

    // Fetch metrics to get pending count
    const fetchMetrics = () => {
      fetch('/api/metrics').then(res => res.json()).then(data => {
        if (data.pendingCount !== undefined) {
          setPendingCount(data.pendingCount);
        }
      });
    };

    // Fetch orders stats for badge
    const fetchOrdersStats = () => {
      fetch('/api/orders')
        .then(res => res.json())
        .then(data => {
          if (data.stats?.pending !== undefined) {
            setPendingOrdersCount(data.stats.pending);
          }
        })
        .catch(() => {});
    };

    fetchMetrics();
    fetchOrdersStats();

    // Poll every 10 seconds for pending count
    const interval = setInterval(() => {
      fetchMetrics();
      fetchOrdersStats();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  let navItems = [
    { name: 'Inicio', path: '/dashboard', icon: Home },
    { name: 'Pedidos', path: '/pedidos', icon: ShoppingBag, badge: pendingOrdersCount > 0 ? pendingOrdersCount.toString() : undefined },
    { name: 'Inbox', path: '/conversaciones', icon: MessageSquare, badge: pendingCount > 0 ? pendingCount.toString() : undefined },
    { name: 'Cerebro', path: '/cerebro', icon: Brain },
    { name: 'Ajustes', path: '/ajustes', icon: Settings },
  ];

  if (userRole === 'AGENT') {
    navItems = navItems.filter(i => i.path === '/conversaciones' || i.path === '/pedidos');
  }

  // Ocultar el nav en rutas que no sean la app principal
  const appRoutes = ['/dashboard', '/pedidos', '/conversaciones', '/cerebro', '/ajustes'];
  const isAppRoute = appRoutes.some(route => pathname.startsWith(route));

  if (!isAppRoute) {
    return null;
  }

  return (
    <nav id="mobile-nav" className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 pb-safe">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <Link 
              key={item.name}
              href={item.path} 
              aria-label={item.name}
              className={`flex flex-col items-center justify-center w-full min-h-[44px] h-full relative transition-colors ${
                isActive 
                ? 'text-blue-600' 
                : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2 bg-rose-600 text-white text-[10px] min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full font-bold shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-1 font-medium leading-none ${isActive ? 'font-bold text-blue-600' : 'text-slate-500'}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
