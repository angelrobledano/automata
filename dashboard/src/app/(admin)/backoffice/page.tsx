"use client";

import { useState, useEffect, useCallback } from 'react';
import { 
  Building2, Users, Activity, ShieldCheck, Search, Filter, 
  Eye, LogOut, RefreshCw, Plus, CheckCircle, AlertTriangle, 
  Clock, Zap, DollarSign, KeyRound, UserX, UserCheck, ChevronLeft, ChevronRight
} from 'lucide-react';

export default function BackofficeDashboard() {
  const [activeTab, setActiveTab] = useState<'supervision' | 'tenants' | 'users' | 'audit'>('tenants');
  const [currentAdmin, setCurrentAdmin] = useState<any>(null);
  
  // Metrics state
  const [metrics, setMetrics] = useState<any>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  // Tenants state
  const [commerces, setCommerces] = useState<any[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [tenantSearch, setTenantSearch] = useState('');
  const [tenantStatus, setTenantStatus] = useState('ALL');
  const [tenantPlan, setTenantPlan] = useState('ALL');
  const [tenantPage, setTenantPage] = useState(1);
  const [tenantPagination, setTenantPagination] = useState<any>({ total: 0, totalPages: 1 });

  // Users state
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [userRole, setUserRole] = useState('ALL');
  const [userStatus, setUserStatus] = useState('ALL');
  const [userPage, setUserPage] = useState(1);
  const [userPagination, setUserPagination] = useState<any>({ total: 0, totalPages: 1 });

  // Audit state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditAction, setAuditAction] = useState('ALL');
  const [auditPage, setAuditPage] = useState(1);
  const [auditPagination, setAuditPagination] = useState<any>({ total: 0, totalPages: 1 });

  // Create Commerce Modal State
  const [isCreatingCommerce, setIsCreatingCommerce] = useState(false);

  // Fetch admin session details
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCurrentAdmin(data.user);
        }
      })
      .catch(() => null);
  }, []);

  // Fetch Metrics
  const fetchMetrics = useCallback(() => {
    setMetricsLoading(true);
    fetch('/api/admin/metrics')
      .then(res => res.json())
      .then(data => {
        if (data.success) setMetrics(data.metrics);
        setMetricsLoading(false);
      })
      .catch(() => setMetricsLoading(false));
  }, []);

  // Fetch Tenants (Commerces)
  const fetchTenants = useCallback(() => {
    setTenantsLoading(true);
    const params = new URLSearchParams({
      search: tenantSearch,
      status: tenantStatus,
      plan: tenantPlan,
      page: tenantPage.toString(),
      limit: '10'
    });
    fetch(`/api/admin/commerces?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCommerces(data.commerces);
          setTenantPagination(data.pagination);
        }
        setTenantsLoading(false);
      })
      .catch(() => setTenantsLoading(false));
  }, [tenantSearch, tenantStatus, tenantPlan, tenantPage]);

  // Fetch Users
  const fetchUsers = useCallback(() => {
    setUsersLoading(true);
    const params = new URLSearchParams({
      search: userSearch,
      role: userRole,
      status: userStatus,
      page: userPage.toString(),
      limit: '10'
    });
    fetch(`/api/admin/users?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUsers(data.users);
          setUserPagination(data.pagination);
        }
        setUsersLoading(false);
      })
      .catch(() => setUsersLoading(false));
  }, [userSearch, userRole, userStatus, userPage]);

  // Fetch Audit Logs
  const fetchAuditLogs = useCallback(() => {
    setAuditLoading(true);
    const params = new URLSearchParams({
      action: auditAction,
      page: auditPage.toString(),
      limit: '15'
    });
    fetch(`/api/admin/audit-logs?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAuditLogs(data.logs);
          setAuditPagination(data.pagination);
        }
        setAuditLoading(false);
      })
      .catch(() => setAuditLoading(false));
  }, [auditAction, auditPage]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    if (activeTab === 'tenants') fetchTenants();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'audit') fetchAuditLogs();
  }, [activeTab, fetchTenants, fetchUsers, fetchAuditLogs]);

  // Actions
  const handleImpersonate = async (commerceId: string, commerceName: string) => {
    const confirm = window.confirm(`¿Iniciar sesión temporal en la cuenta de "${commerceName}"?`);
    if (!confirm) return;

    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commerceId })
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = data.redirect || '/dashboard';
      } else {
        alert(data.error || 'Error al iniciar impersonación');
      }
    } catch (err) {
      alert('Error de red al conectar con el servidor');
    }
  };

  const handleToggleCommerceStatus = async (commerceId: string, currentStatus: string, commerceName: string) => {
    const newStatus = currentStatus === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    const confirm = window.confirm(`¿Seguro que deseas ${newStatus === 'SUSPENDED' ? 'SUSPENDER' : 'REACTIVAR'} la empresa "${commerceName}"?`);
    if (!confirm) return;

    try {
      const res = await fetch(`/api/admin/commerces/${commerceId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) fetchTenants();
      else alert('Error al actualizar el estado');
    } catch (err) {
      alert('Error de conexión');
    }
  };

  const handleToggleLifetimeFree = async (commerceId: string, isLifetimeFree: boolean, commerceName: string) => {
    const confirm = window.confirm(`¿Seguro que deseas ${isLifetimeFree ? 'REVOCAR' : 'OTORGAR'} el Plan VIP (Gratis de por vida) a "${commerceName}"?`);
    if (!confirm) return;

    try {
      const res = await fetch(`/api/admin/commerces/${commerceId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLifetimeFree: !isLifetimeFree })
      });
      if (res.ok) fetchTenants();
      else alert('Error al actualizar acceso VIP');
    } catch (err) {
      alert('Error de conexión');
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: string, userEmail: string) => {
    const newStatus = currentStatus === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    const confirm = window.confirm(`¿Seguro que deseas ${newStatus === 'SUSPENDED' ? 'SUSPENDER' : 'REACTIVAR'} al usuario "${userEmail}"?`);
    if (!confirm) return;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status: newStatus })
      });
      if (res.ok) fetchUsers();
      else alert('Error al cambiar estado del usuario');
    } catch (err) {
      alert('Error de conexión');
    }
  };

  const handleResetPassword = async (userId: string, userEmail: string) => {
    const newPassword = prompt(`Introduce la nueva contraseña temporal para "${userEmail}":`);
    if (!newPassword || newPassword.length < 6) {
      if (newPassword !== null) alert('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newPassword })
      });
      if (res.ok) alert(`Contraseña actualizada para ${userEmail}.`);
      else alert('Error al restablecer la contraseña');
    } catch (err) {
      alert('Error de conexión');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-background font-sans p-4 sm:p-8 text-foreground">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* TOP HEADER OPERATIVO */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#0066FF]/10 text-[#0066FF] rounded-lg border border-[#0066FF]/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  Automata Control Center
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-mono font-medium">
                    [PROD] Producción
                  </span>
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">Torre de control multi-tenant, supervisión y soporte directo</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 self-end md:self-auto">
            {currentAdmin && (
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-foreground">{currentAdmin.email}</div>
                <div className="text-[10px] text-[#0066FF] font-semibold uppercase tracking-wider">{currentAdmin.role}</div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
              <span>Salir</span>
            </button>
          </div>
        </div>

        {/* NAVEGACIÓN POR PESTAÑAS (TABS) */}
        <div className="flex border-b border-border gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('tenants')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'tenants' 
                ? 'border-[#0066FF] text-[#0066FF]' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Directorio de Clientes (Tenants)
          </button>
          <button
            onClick={() => setActiveTab('supervision')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'supervision' 
                ? 'border-[#0066FF] text-[#0066FF]' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Activity className="w-4 h-4" />
            Supervisión & Salud
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'users' 
                ? 'border-[#0066FF] text-[#0066FF]' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="w-4 h-4" />
            Usuarios Globales
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'audit' 
                ? 'border-[#0066FF] text-[#0066FF]' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Auditoría (Audit Trail)
          </button>
        </div>

        {/* PESTAÑA 1: DIRECTORIO DE EMPRESAS (TENANTS) */}
        {activeTab === 'tenants' && (
          <div className="space-y-6">
            
            {/* Toolbar de búsqueda y filtros */}
            <div className="bg-card border border-border p-4 rounded-xl flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
              <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <input
                    type="search"
                    value={tenantSearch}
                    onChange={(e) => { setTenantSearch(e.target.value); setTenantPage(1); }}
                    placeholder="Buscar por empresa, ID o email..."
                    className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-[#0066FF]"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <select
                    value={tenantStatus}
                    onChange={(e) => { setTenantStatus(e.target.value); setTenantPage(1); }}
                    className="px-3 py-2 bg-background border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none"
                  >
                    <option value="ALL">Todos los Estados</option>
                    <option value="ACTIVE">Activos</option>
                    <option value="SUSPENDED">Suspendidos</option>
                    <option value="TRIAL">En Pruebas</option>
                  </select>

                  <select
                    value={tenantPlan}
                    onChange={(e) => { setTenantPlan(e.target.value); setTenantPage(1); }}
                    className="px-3 py-2 bg-background border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none"
                  >
                    <option value="ALL">Todos los Planes</option>
                    <option value="VIP">Acceso VIP (Gratis)</option>
                    <option value="PAID">Suscritos (Pago)</option>
                    <option value="INACTIVE">Sin Suscripción</option>
                  </select>
                </div>
              </div>

              <button
                onClick={() => setIsCreatingCommerce(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#0066FF] hover:bg-[#0052cc] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Nueva Empresa
              </button>
            </div>

            {/* Modal Crear Empresa */}
            {isCreatingCommerce && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
                <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
                  <h3 className="text-lg font-bold text-foreground">Crear Nueva Empresa</h3>
                  <form
                    onSubmit={async (e: any) => {
                      e.preventDefault();
                      const form = e.target;
                      const res = await fetch('/api/admin/commerces', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          name: form.name.value,
                          email: form.email.value,
                          password: form.password.value,
                          isLifetimeFree: form.isLifetimeFree.checked
                        })
                      });
                      if (res.ok) {
                        setIsCreatingCommerce(false);
                        fetchTenants();
                      } else {
                        const d = await res.json();
                        alert(d.error || 'Error al crear la empresa');
                      }
                    }}
                    className="space-y-3"
                  >
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Nombre Comercial</label>
                      <input name="name" required className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm" placeholder="Ej: Moda & Estilo S.L." />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Email del Propietario</label>
                      <input type="email" name="email" required className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm" placeholder="admin@empresa.com" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Contraseña Temporal</label>
                      <input type="password" name="password" required minLength={6} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm" placeholder="123456" />
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <input type="checkbox" name="isLifetimeFree" id="modalVip" defaultChecked className="w-4 h-4 rounded text-[#0066FF]" />
                      <label htmlFor="modalVip" className="text-xs font-semibold text-foreground">Otorgar Acceso VIP (Gratis de por vida)</label>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <button
                        type="button"
                        onClick={() => setIsCreatingCommerce(false)}
                        className="px-4 py-2 border border-border text-xs font-semibold rounded-lg hover:bg-muted"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#0066FF] hover:bg-[#0052cc] text-white text-xs font-bold rounded-lg"
                      >
                        Crear Empresa
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Tabla de Comercios */}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                      <th className="py-3.5 px-4">Empresa / ID</th>
                      <th className="py-3.5 px-4">Estado</th>
                      <th className="py-3.5 px-4">Plan / Suscripción</th>
                      <th className="py-3.5 px-4">Usuarios</th>
                      <th className="py-3.5 px-4">Sesiones IA</th>
                      <th className="py-3.5 px-4">Última Actividad</th>
                      <th className="py-3.5 px-4 text-right">Acciones de Soporte</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-xs">
                    {tenantsLoading ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-muted-foreground">Cargando directorio de empresas...</td>
                      </tr>
                    ) : commerces.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-muted-foreground">No se encontraron empresas con los filtros aplicados.</td>
                      </tr>
                    ) : (
                      commerces.map((c) => (
                        <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-foreground">{c.name}</div>
                            <div className="text-[10px] font-mono text-muted-foreground">{c.id}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              c.status === 'SUSPENDED' 
                                ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20' 
                                : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                            }`}>
                              {c.status || 'ACTIVE'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-foreground">{c.planName}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {c.waConnected ? '🟢 WhatsApp Conectado' : '⚪ WhatsApp Desconectado'}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-foreground">{c.usersCount} usuario(s)</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-foreground">{c.sessionsCount} conversaciones</div>
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground">
                            {new Date(c.lastActivity).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Botón Estelar: Impersonation en Azul de Acción #0066FF */}
                              <button
                                onClick={() => handleImpersonate(c.id, c.name)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0066FF] hover:bg-[#0052cc] text-white font-bold text-xs rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
                                title="Acceder a la cuenta de esta empresa sin contraseña"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Ver como cliente
                              </button>

                              <button
                                onClick={() => handleToggleCommerceStatus(c.id, c.status, c.name)}
                                className={`p-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                                  c.status === 'SUSPENDED' 
                                    ? 'border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10' 
                                    : 'border-rose-500/30 text-rose-600 hover:bg-rose-500/10'
                                }`}
                                title={c.status === 'SUSPENDED' ? 'Reactivar empresa' : 'Suspender empresa'}
                              >
                                {c.status === 'SUSPENDED' ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                              </button>

                              <button
                                onClick={() => handleToggleLifetimeFree(c.id, c.isLifetimeFree, c.name)}
                                className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                  c.isLifetimeFree 
                                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20' 
                                    : 'border-border text-muted-foreground hover:bg-muted'
                                }`}
                              >
                                {c.isLifetimeFree ? 'VIP Activo' : 'Hacer VIP'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              <div className="px-4 py-3 border-t border-border flex items-center justify-between bg-muted/20">
                <div className="text-xs text-muted-foreground">
                  Mostrando {commerces.length} de {tenantPagination.total} empresas
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={tenantPage <= 1}
                    onClick={() => setTenantPage(p => p - 1)}
                    className="p-1.5 border border-border rounded-lg text-xs disabled:opacity-40 hover:bg-muted cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-semibold text-foreground">
                    Página {tenantPage} de {tenantPagination.totalPages || 1}
                  </span>
                  <button
                    disabled={tenantPage >= tenantPagination.totalPages}
                    onClick={() => setTenantPage(p => p + 1)}
                    className="p-1.5 border border-border rounded-lg text-xs disabled:opacity-40 hover:bg-muted cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* PESTAÑA 2: SUPERVISIÓN & SALUD DEL SISTEMA */}
        {activeTab === 'supervision' && (
          <div className="space-y-6">
            {metricsLoading ? (
              <div className="text-center py-12 text-muted-foreground">Cargando métricas de supervisión...</div>
            ) : (
              <>
                {/* 1. SECCIÓN USO */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#0066FF]" />
                    Métricas de Uso y Adopción
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-card border border-border p-5 rounded-xl">
                      <div className="text-xs text-muted-foreground font-medium">Empresas Activas</div>
                      <div className="text-3xl font-bold text-foreground mt-2">{metrics?.usage?.activeCommerces}</div>
                      <div className="text-[11px] text-emerald-600 mt-1">de {metrics?.usage?.totalCommerces} registradas</div>
                    </div>
                    <div className="bg-card border border-border p-5 rounded-xl">
                      <div className="text-xs text-muted-foreground font-medium">Usuarios Registrados</div>
                      <div className="text-3xl font-bold text-foreground mt-2">{metrics?.usage?.totalUsers}</div>
                      <div className="text-[11px] text-blue-600 mt-1">{metrics?.usage?.activeUsers24h} activos hoy</div>
                    </div>
                    <div className="bg-card border border-border p-5 rounded-xl">
                      <div className="text-xs text-muted-foreground font-medium">Nuevos Registros (30d)</div>
                      <div className="text-3xl font-bold text-foreground mt-2">{metrics?.usage?.newSignups30d}</div>
                      <div className="text-[11px] text-muted-foreground mt-1">crecimientos de flota</div>
                    </div>
                    <div className="bg-card border border-border p-5 rounded-xl">
                      <div className="text-xs text-muted-foreground font-medium">Empresas Suspendidas</div>
                      <div className="text-3xl font-bold text-rose-600 mt-2">{metrics?.usage?.suspendedCommerces}</div>
                      <div className="text-[11px] text-muted-foreground mt-1">requieren revisión</div>
                    </div>
                  </div>
                </div>

                {/* 2. SECCIÓN SALUD DEL SISTEMA */}
                <div className="space-y-3 pt-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Salud Técnica e Infraestructura
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-card border border-border p-5 rounded-xl">
                      <div className="text-xs text-muted-foreground font-medium">Mensajes IA Procesados</div>
                      <div className="text-3xl font-bold text-foreground mt-2">{metrics?.health?.totalMessages}</div>
                      <div className="text-[11px] text-muted-foreground mt-1">en {metrics?.health?.totalSessions} sesiones</div>
                    </div>
                    <div className="bg-card border border-border p-5 rounded-xl">
                      <div className="text-xs text-muted-foreground font-medium">Latencia Media RAG</div>
                      <div className="text-3xl font-bold text-foreground mt-2">{metrics?.health?.avgLatencyMs} ms</div>
                      <div className="text-[11px] text-emerald-600 mt-1">tiempo de respuesta IA</div>
                    </div>
                    <div className="bg-card border border-border p-5 rounded-xl">
                      <div className="text-xs text-muted-foreground font-medium">Integraciones Caídas</div>
                      <div className="text-3xl font-bold text-amber-500 mt-2">{metrics?.health?.failedIntegrations}</div>
                      <div className="text-[11px] text-muted-foreground mt-1">canales desconectados</div>
                    </div>
                    <div className="bg-card border border-border p-5 rounded-xl">
                      <div className="text-xs text-muted-foreground font-medium">Estado de Workers</div>
                      <div className="text-3xl font-bold text-emerald-600 mt-2">{metrics?.health?.queueStatus}</div>
                      <div className="text-[11px] text-emerald-600 mt-1">0 jobs bloqueados</div>
                    </div>
                  </div>
                </div>

                {/* 3. SECCIÓN NEGOCIO & FINANZAS */}
                <div className="space-y-3 pt-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                    Métricas de Negocio y Monetización
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-card border border-border p-5 rounded-xl">
                      <div className="text-xs text-muted-foreground font-medium">MRR Estimado</div>
                      <div className="text-3xl font-bold text-emerald-600 mt-2">{metrics?.business?.estimatedMRR} €</div>
                      <div className="text-[11px] text-muted-foreground mt-1">ingreso recurrente mensual</div>
                    </div>
                    <div className="bg-card border border-border p-5 rounded-xl">
                      <div className="text-xs text-muted-foreground font-medium">Suscripciones Pagadas</div>
                      <div className="text-3xl font-bold text-foreground mt-2">{metrics?.business?.activeSubscriptions}</div>
                      <div className="text-[11px] text-muted-foreground mt-1">clientes en planes Stripe</div>
                    </div>
                    <div className="bg-card border border-border p-5 rounded-xl">
                      <div className="text-xs text-muted-foreground font-medium">Cuentas VIP (Lifetime Free)</div>
                      <div className="text-3xl font-bold text-amber-500 mt-2">{metrics?.business?.vipCommerces}</div>
                      <div className="text-[11px] text-muted-foreground mt-1">beta testers / accesos VIP</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* PESTAÑA 3: GESTIÓN DE USUARIOS GLOBALES */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="bg-card border border-border p-4 rounded-xl flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
              <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <input
                    type="search"
                    value={userSearch}
                    onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
                    placeholder="Buscar usuario por email o empresa..."
                    className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-[#0066FF]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={userRole}
                    onChange={(e) => { setUserRole(e.target.value); setUserPage(1); }}
                    className="px-3 py-2 bg-background border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none"
                  >
                    <option value="ALL">Todos los Roles</option>
                    <option value="OWNER">Propietario (OWNER)</option>
                    <option value="AGENT">Agente (AGENT)</option>
                    <option value="SUPERADMIN">SuperAdmin</option>
                  </select>

                  <select
                    value={userStatus}
                    onChange={(e) => { setUserStatus(e.target.value); setUserPage(1); }}
                    className="px-3 py-2 bg-background border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none"
                  >
                    <option value="ALL">Todos los Estados</option>
                    <option value="ACTIVE">Activos</option>
                    <option value="SUSPENDED">Suspendidos</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                      <th className="py-3.5 px-4">Usuario / Email</th>
                      <th className="py-3.5 px-4">Empresa</th>
                      <th className="py-3.5 px-4">Rol</th>
                      <th className="py-3.5 px-4">Estado</th>
                      <th className="py-3.5 px-4">Último Acceso</th>
                      <th className="py-3.5 px-4 text-right">Gestión</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-xs">
                    {usersLoading ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-muted-foreground">Cargando usuarios...</td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-muted-foreground">No se encontraron usuarios.</td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-foreground">{u.email}</div>
                            <div className="text-[10px] font-mono text-muted-foreground">{u.id}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-foreground">{u.commerce?.name || 'N/A'}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-foreground">{u.role}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              u.status === 'SUSPENDED' 
                                ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20' 
                                : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                            }`}>
                              {u.status || 'ACTIVE'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground">
                            {u.lastLoginAt 
                              ? new Date(u.lastLoginAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                              : 'Sin accesos recientes'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleResetPassword(u.id, u.email)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 border border-border hover:bg-muted text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                                title="Resetear contraseña"
                              >
                                <KeyRound className="w-3.5 h-3.5 text-muted-foreground" />
                                Reset Clave
                              </button>
                              <button
                                onClick={() => handleToggleUserStatus(u.id, u.status, u.email)}
                                className={`p-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                                  u.status === 'SUSPENDED' 
                                    ? 'border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10' 
                                    : 'border-rose-500/30 text-rose-600 hover:bg-rose-500/10'
                                }`}
                                title={u.status === 'SUSPENDED' ? 'Activar usuario' : 'Suspender usuario'}
                              >
                                {u.status === 'SUSPENDED' ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              <div className="px-4 py-3 border-t border-border flex items-center justify-between bg-muted/20">
                <div className="text-xs text-muted-foreground">
                  Mostrando {users.length} de {userPagination.total} usuarios
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={userPage <= 1}
                    onClick={() => setUserPage(p => p - 1)}
                    className="p-1.5 border border-border rounded-lg text-xs disabled:opacity-40 hover:bg-muted cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-semibold text-foreground">
                    Página {userPage} de {userPagination.totalPages || 1}
                  </span>
                  <button
                    disabled={userPage >= userPagination.totalPages}
                    onClick={() => setUserPage(p => p + 1)}
                    className="p-1.5 border border-border rounded-lg text-xs disabled:opacity-40 hover:bg-muted cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 4: AUDITORÍA (AUDIT TRAIL) */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="bg-card border border-border p-4 rounded-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <select
                  value={auditAction}
                  onChange={(e) => { setAuditAction(e.target.value); setAuditPage(1); }}
                  className="px-3 py-2 bg-background border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none"
                >
                  <option value="ALL">Todas las Acciones</option>
                  <option value="IMPERSONATION_START">Inicio de Impersonación</option>
                  <option value="IMPERSONATION_END">Fin de Impersonación</option>
                  <option value="CREATE_COMMERCE">Creación de Empresa</option>
                  <option value="UPDATE_COMMERCE_STATUS">Cambios de Estado</option>
                  <option value="UPDATE_USER_ADMIN">Gestión de Usuarios</option>
                </select>
              </div>

              <div className="text-xs text-muted-foreground">
                Registros inmutables de seguridad
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                      <th className="py-3.5 px-4">Fecha & Hora</th>
                      <th className="py-3.5 px-4">Acción</th>
                      <th className="py-3.5 px-4">Empresa Receptora</th>
                      <th className="py-3.5 px-4">Detalles del Evento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-xs">
                    {auditLoading ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-muted-foreground">Cargando registros de auditoría...</td>
                      </tr>
                    ) : auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-muted-foreground">No se registraron eventos.</td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3.5 px-4 whitespace-nowrap text-muted-foreground">
                            {new Date(log.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              log.action.includes('IMPERSONATION') 
                                ? 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20' 
                                : 'bg-muted text-foreground border border-border'
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-foreground">{log.commerce?.name || log.commerceId}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="text-foreground">{log.details}</div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              <div className="px-4 py-3 border-t border-border flex items-center justify-between bg-muted/20">
                <div className="text-xs text-muted-foreground">
                  Mostrando {auditLogs.length} de {auditPagination.total} registros
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={auditPage <= 1}
                    onClick={() => setAuditPage(p => p - 1)}
                    className="p-1.5 border border-border rounded-lg text-xs disabled:opacity-40 hover:bg-muted cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-semibold text-foreground">
                    Página {auditPage} de {auditPagination.totalPages || 1}
                  </span>
                  <button
                    disabled={auditPage >= auditPagination.totalPages}
                    onClick={() => setAuditPage(p => p + 1)}
                    className="p-1.5 border border-border rounded-lg text-xs disabled:opacity-40 hover:bg-muted cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
