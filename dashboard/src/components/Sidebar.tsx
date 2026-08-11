"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  Home, MessageSquare, Brain, Settings, LogOut, ChevronDown, Sparkles, CheckCircle2, ShieldCheck, AlertCircle
} from 'lucide-react';

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
    { name: 'Inicio', path: '/dashboard', icon: Home },
    { name: 'Conversaciones', path: '/conversaciones', icon: MessageSquare, badge: pendingCount > 0 ? pendingCount.toString() : undefined },
    { name: 'Conocimiento', path: '/cerebro', icon: Brain },
    { name: 'Configuración', path: '/ajustes', icon: Settings },
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
    <aside className="hidden md:flex w-[260px] bg-slate-50 border-r border-slate-200 h-screen flex-col font-sans z-10 overflow-y-auto select-none">
      {/* Header Logo */}
      <div className="px-5 py-6 flex items-center gap-3 border-b border-slate-200/60 bg-white">
        <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-base shadow-sm">
          ⚡
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-slate-900 tracking-tight truncate">Mi Negocio IA</h1>
          <p className="text-[11px] text-slate-500 truncate">Asistente 24/7</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.path);
          return (
            <Link 
              key={item.name}
              href={item.path} 
              className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive 
                  ? 'bg-blue-50 text-blue-600 font-semibold shadow-none' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 mr-3 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              <span className="flex-1">{item.name}</span>
              {item.badge && (
                <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Alerta Global de Chats Pendientes */}
      {pendingCount > 0 && (
        <div className="px-3 mb-3">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <h4 className="text-xs font-bold text-amber-900">Requiere Atención</h4>
            </div>
            <p className="text-[11px] text-amber-800 mb-2">
              {pendingCount} conversación{pendingCount > 1 ? 'es' : ''} requiere respuesta humana.
            </p>
            <Link href="/conversaciones" className="block w-full text-center bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold py-1.5 rounded-lg transition-colors">
              Ir a Conversaciones
            </Link>
          </div>
        </div>
      )}

      {/* User Profile Footer */}
      <div className="px-4 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
            {userName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900 truncate">{userName}</p>
            <p className="text-[10px] text-slate-500 truncate uppercase font-medium">{userRole}</p>
          </div>
        </div>
        <button 
          onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/login';
          }}
          title="Cerrar sesión"
          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
