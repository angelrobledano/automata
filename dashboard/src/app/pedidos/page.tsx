"use client";

import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Clock, CheckCircle2, AlertCircle, RefreshCw, Plus, 
  Search, ExternalLink, Phone, MapPin, Calendar, Package, ArrowRight,
  Filter, X, ChevronRight, Check, Store, Truck, Volume2, VolumeX
} from 'lucide-react';
import { io } from 'socket.io-client';
import { playOrderChime, isSoundMuted, toggleSoundMuted } from '@/lib/orderSound';

interface OrderItem {
  name: string;
  quantity: number;
  price?: number;
  notes?: string;
}

interface Order {
  id: string;
  externalOrderId: string | null;
  customerName: string | null;
  customerPhone: string;
  source: 'MANUAL' | 'WOOCOMMERCE' | 'SHOPIFY';
  status: 'PENDING' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED';
  deliveryType: 'PICKUP' | 'DELIVERY';
  deliveryAddress: string | null;
  pickupTime: string | null;
  items: OrderItem[];
  totalAmount: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  total: number;
  pending: number;
  preparing: number;
  ready: number;
  delivered: number;
  cancelled: number;
  totalRevenue: number;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    preparing: 0,
    ready: 0,
    delivered: 0,
    cancelled: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);

  useEffect(() => {
    setSoundMuted(isSoundMuted());
    
    const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001');
    
    socket.on('new_order', (data: any) => {
      if (data?.order) {
        playOrderChime();
        setOrders(prev => {
          if (prev.some(o => o.id === data.order.id)) return prev;
          return [data.order, ...prev];
        });
        setStats(prev => ({
          ...prev,
          total: prev.total + 1,
          pending: prev.pending + 1
        }));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Form State for new Manual Order
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    deliveryType: 'PICKUP',
    deliveryAddress: '',
    pickupTime: '',
    notes: '',
    items: [{ name: '', quantity: 1, price: 0 }]
  });
  const [submittingOrder, setSubmittingOrder] = useState(false);

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (sourceFilter !== 'ALL') params.append('source', sourceFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`/api/orders?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error('Error cargando pedidos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, sourceFilter]);

  // Handle Search submit or enter
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  // Update order status handler
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: newStatus })
      });
      if (res.ok) {
        await fetchOrders();
      }
    } catch (err) {
      console.error('Error actualizando estado del pedido:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Create manual order handler
  const handleCreateManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerPhone) {
      alert('Por favor indica al menos el teléfono del cliente.');
      return;
    }
    const filteredItems = formData.items.filter(i => i.name.trim().length > 0);
    if (filteredItems.length === 0) {
      alert('Añade al menos un producto al encargo.');
      return;
    }

    const calculatedTotal = filteredItems.reduce((acc, curr) => acc + (Number(curr.price) || 0) * (Number(curr.quantity) || 1), 0);

    setSubmittingOrder(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: formData.customerName,
          customerPhone: formData.customerPhone,
          deliveryType: formData.deliveryType,
          deliveryAddress: formData.deliveryAddress,
          pickupTime: formData.pickupTime,
          notes: formData.notes,
          items: filteredItems,
          totalAmount: calculatedTotal > 0 ? calculatedTotal : null
        })
      });

      if (res.ok) {
        setShowModal(false);
        setFormData({
          customerName: '',
          customerPhone: '',
          deliveryType: 'PICKUP',
          deliveryAddress: '',
          pickupTime: '',
          notes: '',
          items: [{ name: '', quantity: 1, price: 0 }]
        });
        await fetchOrders();
      } else {
        const data = await res.json();
        alert(`Error al crear el pedido: ${data.error || 'Intenta de nuevo'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al registrar el pedido.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'WOOCOMMERCE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            WooCommerce
          </span>
        );
      case 'SHOPIFY':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Shopify
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            WhatsApp / Local
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse"></span>
            Pendiente
          </span>
        );
      case 'PREPARING':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <Clock className="w-3.5 h-3.5 mr-1 text-blue-600" />
            En Preparación
          </span>
        );
      case 'READY':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            Listo
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Entregado
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Cancelado
          </span>
        );
      default:
        return null;
    }
  };

  const formatCleanPhone = (phone: string) => {
    return phone.replace(/[^\d+]/g, '');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Encabezado Principal */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/80 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pedidos y Encargos</h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                En Vivo
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Gestiona los pedidos recibidos por WhatsApp, tu tienda online o mostrador en un solo panel.
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => {
                const next = toggleSoundMuted();
                setSoundMuted(next);
                if (!next) playOrderChime();
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors shadow-sm cursor-pointer ${
                soundMuted
                  ? 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                  : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
              }`}
              title={soundMuted ? 'Activar aviso sonoro' : 'Silenciar aviso sonoro'}
            >
              {soundMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-500" /> : <Volume2 className="w-3.5 h-3.5 text-blue-600" />}
              <span className="hidden sm:inline">{soundMuted ? 'Silenciado' : 'Sonido Activo'}</span>
            </button>
            <button
              onClick={() => fetchOrders()}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
              title="Actualizar lista de pedidos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Encargo</span>
            </button>
          </div>
        </div>

        {/* Tarjetas de Métricas Rápidas */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div 
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setStatusFilter('PENDING');
              }
            }}
            onClick={() => setStatusFilter('PENDING')}
            className={`cursor-pointer bg-white p-4 rounded-xl border transition-all ${
              statusFilter === 'PENDING' ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200/90 hover:border-slate-300'
            } shadow-sm`}
          >
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Pendientes</span>
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{stats.pending}</div>
            <div className="text-[11px] text-amber-700 font-medium mt-1">Requieren atención</div>
          </div>

          <div 
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setStatusFilter('PREPARING');
              }
            }}
            onClick={() => setStatusFilter('PREPARING')}
            className={`cursor-pointer bg-white p-4 rounded-xl border transition-all ${
              statusFilter === 'PREPARING' ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200/90 hover:border-slate-300'
            } shadow-sm`}
          >
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>En Preparación</span>
              <Clock className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{stats.preparing}</div>
            <div className="text-[11px] text-blue-600 font-medium mt-1">En cocina / empaquetado</div>
          </div>

          <div 
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setStatusFilter('READY');
              }
            }}
            onClick={() => setStatusFilter('READY')}
            className={`cursor-pointer bg-white p-4 rounded-xl border transition-all ${
              statusFilter === 'READY' ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-slate-200/90 hover:border-slate-300'
            } shadow-sm`}
          >
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Listos</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{stats.ready}</div>
            <div className="text-[11px] text-emerald-700 font-medium mt-1">Para recogida o envío</div>
          </div>

          <div 
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setStatusFilter('DELIVERED');
              }
            }}
            onClick={() => setStatusFilter('DELIVERED')}
            className={`cursor-pointer bg-white p-4 rounded-xl border transition-all ${
              statusFilter === 'DELIVERED' ? 'border-slate-400 ring-2 ring-slate-100' : 'border-slate-200/90 hover:border-slate-300'
            } shadow-sm`}
          >
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Entregados</span>
              <Check className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{stats.delivered}</div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">Completados con éxito</div>
          </div>

          <div className="col-span-2 lg:col-span-1 bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Facturación Total</span>
              <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">
              {stats.totalRevenue ? `${stats.totalRevenue.toFixed(2)} €` : '0,00 €'}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">{stats.total} pedidos totales</div>
          </div>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            {/* Pestañas de Estado */}
            <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
              {[
                { id: 'ALL', label: 'Todos', count: stats.total },
                { id: 'PENDING', label: 'Pendientes', count: stats.pending },
                { id: 'PREPARING', label: 'En Preparación', count: stats.preparing },
                { id: 'READY', label: 'Listos', count: stats.ready },
                { id: 'DELIVERED', label: 'Entregados', count: stats.delivered },
                { id: 'CANCELLED', label: 'Cancelados', count: stats.cancelled }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    statusFilter === tab.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    statusFilter === tab.id ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Selector de Canales */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="ALL">Todos los canales</option>
                <option value="MANUAL">WhatsApp / Local</option>
                <option value="WOOCOMMERCE">WooCommerce</option>
                <option value="SHOPIFY">Shopify</option>
              </select>

              {/* Input de Búsqueda */}
              <form onSubmit={handleSearchSubmit} className="relative flex-1 md:w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar pedido, cliente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
                />
              </form>
            </div>
          </div>
        </div>

        {/* Lista de Pedidos */}
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-600 font-medium">Cargando pedidos en tiempo real...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No hay pedidos en este momento</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Los pedidos que tus clientes hagan a través del bot de WhatsApp, WooCommerce o Shopify aparecerán aquí automáticamente.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Registrar encargo manual
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {orders.map((order) => {
              const displayRef = order.externalOrderId || `ENC-${order.id.substring(0, 6).toUpperCase()}`;
              const cleanPhone = formatCleanPhone(order.customerPhone);
              const waText = encodeURIComponent(
                `Hola ${order.customerName || ''}, te escribimos sobre tu pedido #${displayRef} en nuestro negocio.`
              );
              const waUrl = `https://wa.me/${cleanPhone}?text=${waText}`;

              return (
                <div 
                  key={order.id}
                  className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-sm hover:border-slate-300 transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Bloque Izquierdo: Identificación y Cliente */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                          #{displayRef}
                        </span>
                        {getSourceBadge(order.source)}
                        {getStatusBadge(order.status)}
                        {(order.notes?.includes('[FUERA DE HORARIO') || (order as any).isOutOfHours) && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 mr-1 text-amber-600" />
                            Fuera de horario
                          </span>
                        )}
                        <span className="text-xs text-slate-600 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {new Date(order.createdAt).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
                        <span className="font-semibold text-slate-900">
                          {order.customerName || 'Cliente anónimo'}
                        </span>
                        <span className="text-slate-300">|</span>
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-200 transition-colors"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{order.customerPhone}</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                        </a>
                      </div>

                      {/* Modalidad de Entrega */}
                      <div className="text-xs text-slate-600 flex items-center gap-2">
                        {order.deliveryType === 'DELIVERY' ? (
                          <span className="inline-flex items-center gap-1 text-slate-700">
                            <MapPin className="w-3.5 h-3.5 text-blue-600" />
                            <strong>A domicilio:</strong> {order.deliveryAddress || 'Dirección no especificada'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-700">
                            <Package className="w-3.5 h-3.5 text-amber-600" />
                            <strong>Recogida en tienda:</strong> {order.pickupTime ? `Hora: ${order.pickupTime}` : 'Sin hora fija'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bloque Central: Artículos e Importe */}
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 min-w-[260px] max-w-md">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                        Artículos del encargo:
                      </div>
                      <div className="space-y-1">
                        {Array.isArray(order.items) && order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs text-slate-800">
                            <span className="font-medium">
                              {item.quantity}x {item.name}
                            </span>
                            {item.price ? (
                              <span className="text-slate-500 font-mono">
                                {(item.price * item.quantity).toFixed(2)} €
                              </span>
                            ) : null}
                          </div>
                        ))}
                      </div>

                      {order.notes && (
                        <div className="mt-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 italic">
                          "{order.notes}"
                        </div>
                      )}

                      {order.totalAmount !== null && (
                        <div className="mt-2 pt-2 border-t border-slate-200/80 flex justify-between items-center text-xs font-bold text-slate-900">
                          <span>Total:</span>
                          <span className="text-sm text-blue-600 font-mono">
                            {order.totalAmount.toFixed(2)} €
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Bloque Derecho: Botones de Transición de Estado */}
                    <div className="flex flex-row lg:flex-col gap-2 items-end justify-end">
                      {order.status === 'PENDING' && (
                        <>
                          <button
                            disabled={updatingId === order.id}
                            onClick={() => handleStatusChange(order.id, 'PREPARING')}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Preparar</span>
                          </button>
                          <button
                            disabled={updatingId === order.id}
                            onClick={() => handleStatusChange(order.id, 'CANCELLED')}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200 disabled:opacity-50"
                          >
                            <X className="w-3 h-3" />
                            <span>Rechazar</span>
                          </button>
                        </>
                      )}

                      {order.status === 'PREPARING' && (
                        <button
                          disabled={updatingId === order.id}
                          onClick={() => handleStatusChange(order.id, 'READY')}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Marcar Listo</span>
                        </button>
                      )}

                      {order.status === 'READY' && (
                        <button
                          disabled={updatingId === order.id}
                          onClick={() => handleStatusChange(order.id, 'DELIVERED')}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Marcar Entregado</span>
                        </button>
                      )}

                      {order.status === 'DELIVERED' && (
                        <span className="text-xs text-slate-400 font-medium italic">
                          Completado
                        </span>
                      )}

                      {order.status === 'CANCELLED' && (
                        <span className="text-xs text-rose-500 font-medium italic">
                          Pedido Cancelado
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Modal: Registrar Encargo Manual */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-encargo-title"
            className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 id="modal-encargo-title" className="font-bold text-slate-900 text-base flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-blue-600" />
                Registrar Nuevo Encargo Manual
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                aria-label="Cerrar modal de encargo"
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualOrder} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre del Cliente</label>
                  <input
                    type="text"
                    placeholder="Ej. María García"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono / WhatsApp *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. +34 600 000 000"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Modalidad de Entrega</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, deliveryType: 'PICKUP' })}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      formData.deliveryType === 'PICKUP'
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Store className="w-3.5 h-3.5 text-blue-600" />
                    <span>Recogida en Tienda</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, deliveryType: 'DELIVERY' })}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      formData.deliveryType === 'DELIVERY'
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Envío a Domicilio</span>
                  </button>
                </div>
              </div>

              {formData.deliveryType === 'PICKUP' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hora / Fecha de Recogida</label>
                  <input
                    type="text"
                    placeholder="Ej. Hoy a las 14:00 o Mañana por la tarde"
                    value={formData.pickupTime}
                    onChange={(e) => setFormData({ ...formData, pickupTime: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dirección de Entrega</label>
                  <input
                    type="text"
                    placeholder="Calle, número, piso, código postal..."
                    value={formData.deliveryAddress}
                    onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              )}

              {/* Lista dinámica de artículos */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">Artículos del Pedido *</label>
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      items: [...formData.items, { name: '', quantity: 1, price: 0 }]
                    })}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Añadir otro artículo
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.items.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Producto (ej. Barra de pan)"
                        value={item.name}
                        onChange={(e) => {
                          const newItems = [...formData.items];
                          newItems[index].name = e.target.value;
                          setFormData({ ...formData, items: newItems });
                        }}
                        className="flex-1 text-xs px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20"
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder="Cant."
                        value={item.quantity}
                        onChange={(e) => {
                          const newItems = [...formData.items];
                          newItems[index].quantity = parseInt(e.target.value) || 1;
                          setFormData({ ...formData, items: newItems });
                        }}
                        className="w-16 text-xs px-2 py-1.5 border border-slate-200 rounded-lg text-center"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="€ Unit."
                        value={item.price || ''}
                        onChange={(e) => {
                          const newItems = [...formData.items];
                          newItems[index].price = parseFloat(e.target.value) || 0;
                          setFormData({ ...formData, items: newItems });
                        }}
                        className="w-20 text-xs px-2 py-1.5 border border-slate-200 rounded-lg text-right"
                      />
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = formData.items.filter((_, i) => i !== index);
                            setFormData({ ...formData, items: newItems });
                          }}
                          className="text-slate-400 hover:text-rose-500 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notas u Observaciones</label>
                <textarea
                  rows={2}
                  placeholder="Instrucciones especiales, alergias, empaquetado..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingOrder}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {submittingOrder ? 'Guardando...' : 'Crear Encargo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
