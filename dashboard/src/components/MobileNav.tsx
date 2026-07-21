"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function MobileNav() {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);
  const [userRole, setUserRole] = useState<string>('OWNER');

  useEffect(() => {
    // Fetch current user
    fetch('/api/auth/me').then(res => res.json()).then(data => {
      if (data.success) {
        setUserRole(data.user.role);
      }
    });

    // Fetch metrics to get pending count
    fetch('/api/metrics').then(res => res.json()).then(data => {
      if (data.pendingCount !== undefined) {
        setPendingCount(data.pendingCount);
      }
    });

    // Poll every 10 seconds for pending count
    const interval = setInterval(() => {
      fetch('/api/metrics').then(res => res.json()).then(data => {
        if (data.pendingCount !== undefined) {
          setPendingCount(data.pendingCount);
        }
      });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  let navItems = [
    { name: 'Panel', path: '/dashboard', icon: '📊' },
    { name: 'Inbox', path: '/conversaciones', icon: '💬', badge: pendingCount > 0 ? pendingCount.toString() : undefined },
    { name: 'Cerebro', path: '/cerebro', icon: '🧠' },
    { name: 'Ajustes', path: '/ajustes', icon: '⚙️' },
  ];

  if (userRole === 'AGENT') {
    navItems = navItems.filter(i => i.path === '/conversaciones');
  }

  // Ocultar el nav en rutas que no sean la app principal
  const appRoutes = ['/dashboard', '/conversaciones', '/cerebro', '/ajustes'];
  const isAppRoute = appRoutes.some(route => pathname.startsWith(route));

  if (!isAppRoute) {
    return null;
  }

  return (
    <nav id="mobile-nav" className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 pb-safe">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.path);
          return (
            <Link 
              key={item.name}
              href={item.path} 
              className={`flex flex-col items-center justify-center w-full h-full relative ${
                isActive 
                ? 'text-primary' 
                : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="relative">
                <span className={`text-xl ${isActive ? 'opacity-100' : 'opacity-70 grayscale'}`}>{item.icon}</span>
                {item.badge && (
                  <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold shadow-none">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-1 font-medium ${isActive ? 'font-bold' : ''}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
