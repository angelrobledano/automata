"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Sidebar() {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);
  const [userRole, setUserRole] = useState<string>('OWNER');
  const [userName, setUserName] = useState<string>('Cargando...');

  useEffect(() => {
    // Fetch current user
    fetch('/api/auth/me').then(res => res.json()).then(data => {
      if (data.success) {
        setUserRole(data.user.role);
        setUserName(data.user.email.split('@')[0]);
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
    { name: 'Panel de control', path: '/dashboard', icon: '📊' },
    { name: 'Conversaciones', path: '/conversaciones', icon: '💬', badge: pendingCount > 0 ? pendingCount.toString() : undefined },
    { name: 'Cerebro del Asistente', path: '/cerebro', icon: '🧠' },
    { name: 'Configuración', path: '/ajustes', icon: '⚙️' },
  ];

  if (userRole === 'AGENT') {
    navItems = navItems.filter(i => i.path === '/conversaciones');
  }

  // Ocultar el Sidebar en rutas públicas, onboarding, landing y backoffice
  const appRoutes = ['/dashboard', '/conversaciones', '/cerebro', '/ajustes'];
  const isAppRoute = appRoutes.some(route => pathname.startsWith(route));

  if (!isAppRoute) {
    return null;
  }

  return (
    <aside className="hidden md:flex w-[280px] bg-card border-r border-gray-100 h-screen flex-col font-sans z-10 overflow-y-auto">
      {/* Header Logo */}
      <div className="px-6 py-8 flex items-center gap-3">
        <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center text-primary text-lg">
          🤖
        </div>
        <h1 className="text-lg font-bold text-foreground tracking-tight flex-1">Mi Negocio IA</h1>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.path);
          return (
            <Link 
              key={item.name}
              href={item.path} 
              className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive 
                ? 'bg-primary/10/80 text-indigo-700' 
                : 'text-muted-foreground hover:bg-background hover:text-foreground'
              }`}
            >
              <span className={`mr-3 text-lg ${isActive ? 'opacity-100' : 'opacity-70 grayscale'}`}>{item.icon}</span>
              <span className="flex-1">{item.name}</span>
              {item.badge && (
                <span className="bg-primary/20 text-indigo-700 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Alerta Global de Chats Pendientes */}
      {pendingCount > 0 && (
        <div className="px-4 mb-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 shadow-none animate-pulse">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-amber-600">⚠️</span>
              <h4 className="text-sm font-bold text-amber-900">Requiere Atención</h4>
            </div>
            <p className="text-xs text-amber-800 mb-3">
              Tienes {pendingCount} conversación{pendingCount > 1 ? 'es' : ''} esperando a un agente humano.
            </p>
            <Link href="/conversaciones" className="block w-full text-center bg-amber-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-amber-700 transition-colors">
              Ir al Inbox
            </Link>
          </div>
        </div>
      )}

      {/* Plan Details Card */}
      {userRole !== 'AGENT' && (
        <div className="px-4 mt-auto mb-4">
          <div className="bg-primary/10/50 rounded-lg p-4 border border-indigo-50">
            <h4 className="text-sm font-semibold text-primary mb-0.5">Plan Profesional</h4>
            <p className="text-[11px] text-muted-foreground mb-3">Renovación: 12/06/2025</p>
            
            <div className="mb-1 flex justify-between items-center">
              <span className="text-[11px] font-medium text-muted-foreground">Conversaciones incluidas</span>
            </div>
            <div className="w-full bg-primary/20/50 h-1.5 rounded-full mb-1.5 overflow-hidden">
              <div className="bg-indigo-500 h-full rounded-full" style={{ width: '47%' }}></div>
            </div>
            <p className="text-xs font-semibold text-indigo-900 mb-4">2.350 / 5.000</p>
            
            <Link href="/ajustes" className="block w-full text-center bg-card text-primary border border-indigo-100 hover:border-indigo-200 text-xs font-semibold py-2 rounded-lg transition-colors shadow-none">
              Ver mi plan
            </Link>
          </div>
        </div>
      )}

      {/* User Profile */}
      <div className="px-4 py-4 border-t border-gray-100 flex items-center justify-between group">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 flex-shrink-0 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-sm shadow-none uppercase">
            {userName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0 pr-2">
            <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
            <p className="text-[10px] text-muted-foreground truncate uppercase font-bold tracking-wider">{userRole}</p>
          </div>
        </div>
        <button 
          onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/login';
          }}
          title="Cerrar sesión"
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
