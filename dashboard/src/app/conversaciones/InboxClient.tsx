"use client";

import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { 
  MessageSquare, User, Bot, CheckCircle2, Clock, AlertCircle, Phone, ArrowLeft, Send, Sparkles, X, ChevronRight, Lock, RotateCcw, AlertTriangle, ShieldAlert
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ConsolidatedStatusBar } from '@/components/ConsolidatedStatusBar';

export default function InboxClient({ initialSessions }: { initialSessions: any[] }) {
  const [sessions, setSessions] = useState(initialSessions);
  const [activeSessionId, setActiveSessionId] = useState(initialSessions[0]?.id || null);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  // Filtros orientados a acción: 'all' | 'need_attention' | 'ai_active' | 'resolved'
  const [activeFilter, setActiveFilter] = useState<'all' | 'need_attention' | 'ai_active' | 'resolved'>('need_attention');
  const [searchQuery, setSearchQuery] = useState('');
  const [showListOnMobile, setShowListOnMobile] = useState(true);
  
  // Modal / Confirmación ligera para Devolución a IA
  const [showReturnConfirm, setShowReturnConfirm] = useState(false);
  const [autopilotInstruction, setAutopilotInstruction] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Calcular contadores reales de negocio
  const needAttentionCount = sessions.filter(s => 
    s.status === 'HUMAN_REQUIRED' || 
    (s.status === 'HUMAN_ACTIVE' && s.messages?.[s.messages.length - 1]?.role === 'user')
  ).length;

  const aiActiveCount = sessions.filter(s => s.status === 'AI_ACTIVE' || (s.status === 'ACTIVE' && s.controlBy !== 'HUMAN')).length;
  const resolvedCount = sessions.filter(s => s.status === 'RESOLVED' || s.status === 'CLOSED').length;

  // Filtrar y Priorizar sesiones
  const filteredSessions = sessions
    .filter(s => {
      const matchesSearch = !searchQuery || 
        (s.customerIdentifier && s.customerIdentifier.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.messages && s.messages.some((m: any) => m.content.toLowerCase().includes(searchQuery.toLowerCase())));

      if (!matchesSearch) return false;

      if (activeFilter === 'need_attention') {
        return s.status === 'HUMAN_REQUIRED' || s.status === 'HUMAN_ACTIVE' || s.status === 'HUMAN_REQUESTED' || s.status === 'HUMAN_CONTROL';
      }
      if (activeFilter === 'ai_active') {
        return (s.status === 'AI_ACTIVE' || s.status === 'ACTIVE') && s.controlBy !== 'HUMAN';
      }
      if (activeFilter === 'resolved') {
        return s.status === 'RESOLVED' || s.status === 'CLOSED';
      }
      return true;
    })
    .sort((a, b) => {
      // Prioridad 1: HUMAN_REQUIRED / Esperando atención
      const isAHelp = a.status === 'HUMAN_REQUIRED' || a.status === 'HUMAN_REQUESTED';
      const isBHelp = b.status === 'HUMAN_REQUIRED' || b.status === 'HUMAN_REQUESTED';
      
      if (isAHelp && !isBHelp) return -1;
      if (!isAHelp && isBHelp) return 1;

      // Dentro de necesitados, ordenar por tiempo de espera (longest waiting first)
      if (isAHelp && isBHelp) {
        const timeA = new Date(a.waitingSince || a.updatedAt).getTime();
        const timeB = new Date(b.waitingSince || b.updatedAt).getTime();
        return timeA - timeB;
      }

      // Prioridad 2: HUMAN_ACTIVE
      const isAHuman = a.status === 'HUMAN_ACTIVE' || a.status === 'HUMAN_CONTROL';
      const isBHuman = b.status === 'HUMAN_ACTIVE' || b.status === 'HUMAN_CONTROL';
      if (isAHuman && !isBHuman) return -1;
      if (!isAHuman && isBHuman) return 1;

      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, activeSessionId]);

  const handleSendMessage = async (overrideContent?: string) => {
    const textToSend = overrideContent || replyText;
    if (!textToSend.trim() || !activeSessionId || isSending) return;
    setIsSending(true);

    if (!overrideContent) setReplyText('');

    // Actualización optimista de estado local: el humano responde -> pasa a HUMAN_ACTIVE
    setSessions(prev => {
      const updated = [...prev];
      const sessionIndex = updated.findIndex(s => s.id === activeSessionId);
      if (sessionIndex > -1) {
        if (!updated[sessionIndex].messages) updated[sessionIndex].messages = [];
        updated[sessionIndex].messages.push({ 
          role: isInternalNote ? 'internal_note' : 'assistant', 
          content: textToSend, 
          createdAt: new Date() 
        });
        updated[sessionIndex].status = 'HUMAN_ACTIVE';
        updated[sessionIndex].controlBy = 'HUMAN';
        updated[sessionIndex].waitingSince = null;
        updated[sessionIndex].updatedAt = new Date();
      }
      return updated;
    });

    if (!activeSessionId.startsWith('mock-')) {
      try {
        await fetch(`/api/sessions/${activeSessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: textToSend, isInternalNote })
        });
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
    
    setIsSending(false);
  };

  useEffect(() => {
    // Solo conectar a localhost si se ejecuta localmente en la maquina del desarrollador
    const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || (isLocalhost ? 'http://localhost:3001' : null);

    if (!socketUrl) return;

    const socket = io(socketUrl, {
      autoConnect: true,
      reconnection: true,
      transports: ['websocket', 'polling']
    });
    
    socket.on('new_message', (data) => {
      setSessions(prev => {
        const updated = [...prev];
        const sessionIndex = updated.findIndex(s => s.id === data.sessionId);
        
        if (sessionIndex > -1) {
          const session = updated[sessionIndex];
          if (!session.messages) session.messages = [];
          
          const msgExists = session.messages.find((m: any) => m.content === data.message.content && m.role === data.message.role);
          if (!msgExists) {
             session.messages.push(data.message);
             session.updatedAt = new Date();
          }
          return updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        } else {
          fetch(`/api/sessions`)
            .then(res => res.json())
            .then(data => {
              if (data.sessions) setSessions(data.sessions);
            });
          return prev;
        }
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Ejecución de cambios de Handoff
  const executeHandoff = async (
    action: 'take_control' | 'return_ai' | 'resolve' | 'resolve_and_return_ai', 
    instruction?: string
  ) => {
    if (!activeSessionId) return;

    try {
      const body: any = { action };
      if (instruction) body.instruction = instruction;

      // Actualización optimista local
      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          if (action === 'take_control') {
            return { ...s, status: 'HUMAN_ACTIVE', controlBy: 'HUMAN', waitingSince: null };
          }
          if (action === 'return_ai') {
            return { ...s, status: 'AI_ACTIVE', controlBy: 'AI', humanReason: null, aiSummary: null, waitingSince: null };
          }
          if (action === 'resolve') {
            return { ...s, status: 'RESOLVED', waitingSince: null };
          }
          if (action === 'resolve_and_return_ai') {
            return { ...s, status: 'RESOLVED', controlBy: 'AI', humanReason: null, waitingSince: null };
          }
        }
        return s;
      }));

      if (action === 'return_ai') setShowReturnConfirm(false);

      if (!activeSessionId.startsWith('mock-')) {
        await fetch(`/api/sessions/${activeSessionId}/handoff`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      }
    } catch (error) {
      console.error('Error changing handoff status:', error);
    }
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);

  // Formateo de tiempo de espera relativo (ej. "12 min")
  const getWaitingTimeFormatted = (dateStr?: string | Date) => {
    if (!dateStr) return 'Recién';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Recién';
    if (diffMins < 60) return `${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours} h ${diffMins % 60} min`;
  };

  const renderMessageContent = (msg: any) => {
    const content = msg.content || '';
    const type = msg.type || 'TEXT';
    
    const isImage = type === 'IMAGE' || /\.(jpeg|jpg|gif|png|webp)$/i.test(content) || content.startsWith('data:image/');
    const isAudio = type === 'AUDIO' || /\.(mp3|wav|ogg)$/i.test(content) || content.startsWith('data:audio/');
    
    if (isImage) {
      return (
        <div className="relative group">
          <img src={content} alt="Media" className="rounded-lg max-h-48 object-cover shadow-xs" />
        </div>
      );
    }
    
    if (isAudio) {
      return (
        <audio controls className="max-w-[200px] h-9">
          <source src={content} />
          Audio no soportado.
        </audio>
      );
    }
    
    return <p className="whitespace-pre-wrap leading-relaxed">{content}</p>;
  };

  return (
    <div className="h-[calc(100vh-2rem)] bg-[#F8FAFC] font-sans text-slate-900 flex flex-col p-4 md:p-6 overflow-hidden">
      
      {/* HEADER PRINCIPAL Y DE CONTROL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Conversaciones</h1>
          <p className="text-xs text-slate-500 mt-0.5">Bandeja de atención humana para supervisar la IA</p>
        </div>
        
        {needAttentionCount > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-xs font-semibold text-amber-900 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span>{needAttentionCount} conversación{needAttentionCount > 1 ? 'es' : ''} requieren tu atención</span>
          </div>
        )}
      </div>

      {/* NUEVA BARRA CONSOLIDADA DE ESTADO DE CONEXIONES (Sincronizada con la DB) */}
      <ConsolidatedStatusBar />

      {/* CONTENEDOR PRINCIPAL CHAT */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-row min-h-0">
        
        {/* PANEL IZQUIERDO: LISTA DE CONVERSACIONES */}
        <div className={`flex-shrink-0 border-r border-slate-200 flex-col bg-slate-50/50 
          ${showListOnMobile ? 'flex w-full md:w-[360px]' : 'hidden md:flex w-[360px]'}`}>
          
          {/* BARRA DE BÚSQUEDA Y FILTROS ORIENTADOS A ACCIÓN */}
          <div className="p-3.5 border-b border-slate-200 bg-white space-y-2.5">
            <input 
              type="search" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por cliente o mensaje..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />

            <div className="grid grid-cols-4 bg-slate-100 p-1 rounded-lg gap-1">
              <button 
                onClick={() => setActiveFilter('all')}
                className={`text-[11px] font-bold py-1 rounded-md transition-all ${
                  activeFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Todas
              </button>
              
              <button 
                onClick={() => setActiveFilter('need_attention')}
                className={`text-[11px] font-bold py-1 rounded-md transition-all flex items-center justify-center gap-1 ${
                  activeFilter === 'need_attention' 
                    ? 'bg-amber-500 text-white shadow-xs' 
                    : 'text-amber-700 hover:bg-amber-50'
                }`}
              >
                Atención
                {needAttentionCount > 0 && (
                  <span className="bg-amber-700 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                    {needAttentionCount}
                  </span>
                )}
              </button>

              <button 
                onClick={() => setActiveFilter('ai_active')}
                className={`text-[11px] font-bold py-1 rounded-md transition-all ${
                  activeFilter === 'ai_active' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                IA
              </button>

              <button 
                onClick={() => setActiveFilter('resolved')}
                className={`text-[11px] font-bold py-1 rounded-md transition-all ${
                  activeFilter === 'resolved' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Resueltas
              </button>
            </div>
          </div>

          {/* LISTA SCROLLABLE DE CONVERSACIONES */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredSessions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 space-y-1">
                <CheckCircle2 className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No hay conversaciones en esta categoría</p>
                <p className="text-[11px] text-slate-400">Todo el trabajo de esta sección está completado</p>
              </div>
            ) : (
              filteredSessions.map((session) => {
                const isActive = session.id === activeSessionId;
                const lastMsg = session.messages?.[session.messages.length - 1];
                const isNeedAttention = session.status === 'HUMAN_REQUIRED' || session.status === 'HUMAN_REQUESTED';
                const isHumanActive = session.status === 'HUMAN_ACTIVE' || session.status === 'HUMAN_CONTROL';
                const isResolved = session.status === 'RESOLVED' || session.status === 'CLOSED';

                return (
                  <div
                    key={session.id}
                    onClick={() => {
                      setActiveSessionId(session.id);
                      setShowListOnMobile(false);
                      setShowReturnConfirm(false);
                    }}
                    className={`p-3.5 cursor-pointer transition-all border-l-4 ${
                      isActive 
                        ? 'bg-blue-50/40 border-l-blue-600' 
                        : isNeedAttention
                        ? 'bg-amber-50/30 border-l-amber-500 hover:bg-amber-50/50'
                        : 'border-l-transparent hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {session.customerIdentifier || 'Cliente WhatsApp'}
                        </span>
                        <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-md uppercase shrink-0">
                          {session.channelConnection?.provider || 'WhatsApp'}
                        </span>
                      </div>
                      
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(session.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* MENSAJE PREVIO */}
                    <p className="text-xs text-slate-600 truncate mb-2 font-normal">
                      {lastMsg ? lastMsg.content : 'Sin mensajes'}
                    </p>

                    {/* BADGES CLAROS DE ESTADO Y RESPONSABILIDAD */}
                    <div className="flex flex-col gap-1">
                      {isNeedAttention && (
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>Requiere atención</span>
                          </div>
                          {session.humanReason && (
                            <p className="text-[11px] font-semibold text-amber-900 bg-amber-50 p-1.5 rounded-md border border-amber-200/60 leading-tight">
                              Motivo: {session.humanReason}
                            </p>
                          )}
                          <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Esperando respuesta · {getWaitingTimeFormatted(session.waitingSince || session.updatedAt)}
                          </span>
                        </div>
                      )}

                      {isHumanActive && !isNeedAttention && (
                        <div className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-800 bg-blue-100/80 px-2 py-0.5 rounded-md self-start">
                          <User className="w-3 h-3 text-blue-600" />
                          <span>Atendido por ti</span>
                        </div>
                      )}

                      {!isNeedAttention && !isHumanActive && !isResolved && (
                        <div className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md self-start">
                          <Bot className="w-3 h-3 text-blue-600" />
                          <span>Gestionada por IA</span>
                        </div>
                      )}

                      {isResolved && (
                        <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md self-start">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Resuelta</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PANEL DERECHO: DETALLE DE CONVERSACIÓN Y ACCIONES */}
        <div className={`flex-1 flex-col bg-white ${showListOnMobile ? 'hidden md:flex' : 'flex w-full'}`}>
          {activeSession ? (
            <>
              {/* ENCABEZADO DE CONVERSACIÓN ABIERTA */}
              <div className="p-4 border-b border-slate-200 bg-white flex flex-col gap-3 shrink-0">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setShowListOnMobile(true)} 
                      className="md:hidden p-1 text-slate-500 hover:text-slate-900"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                      {activeSession.customerIdentifier?.charAt(0).toUpperCase() || 'C'}
                    </div>

                    <div>
                      <h2 className="font-bold text-sm text-slate-900">
                        {activeSession.customerIdentifier || 'Cliente WhatsApp'}
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Canal: {activeSession.channelConnection?.provider || 'WhatsApp'}
                      </p>
                    </div>
                  </div>

                  {/* ESTADO ACTUAL Y ACCIÓN PRINCIPAL DE CONTROL */}
                  <div className="flex items-center gap-2">
                    {activeSession.status === 'HUMAN_REQUIRED' && (
                      <button 
                        onClick={() => executeHandoff('take_control')}
                        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <User className="w-4 h-4" />
                        Tomar el control
                      </button>
                    )}

                    {activeSession.controlBy === 'AI' && activeSession.status !== 'HUMAN_REQUIRED' && activeSession.status !== 'RESOLVED' && (
                      <button 
                        onClick={() => executeHandoff('take_control')}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <User className="w-4 h-4" />
                        Tomar el control
                      </button>
                    )}

                    {activeSession.controlBy === 'HUMAN' && (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setShowReturnConfirm(true)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                          Devolver a la IA
                        </button>

                        <button 
                          onClick={() => executeHandoff('resolve')}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Resolver
                        </button>
                      </div>
                    )}

                    {activeSession.status === 'RESOLVED' && (
                      <button 
                        onClick={() => executeHandoff('return_ai')}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all cursor-pointer"
                      >
                        Reabrir con IA
                      </button>
                    )}
                  </div>
                </div>

                {/* BANNER DE CONTROL DE RESPONSABILIDAD */}
                {activeSession.controlBy === 'HUMAN' ? (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs flex items-center justify-between text-blue-900 font-medium">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-600 shrink-0" />
                      <span><strong>Estás atendiendo esta conversación.</strong> La IA permanecerá en pausa mientras tengas el control.</span>
                    </div>
                  </div>
                ) : activeSession.status === 'HUMAN_REQUIRED' ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1 text-amber-900">
                    <div className="flex items-center gap-2 font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>⚠️ Esta conversación necesita tu atención ahora.</span>
                    </div>
                    {activeSession.humanReason && (
                      <p className="text-xs text-amber-800 pl-6">
                        <strong>Motivo:</strong> {activeSession.humanReason}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center gap-2 text-slate-600 font-medium">
                    <Bot className="w-4 h-4 text-blue-600 shrink-0" />
                    <span><strong>La IA está atendiendo esta conversación.</strong> Si necesitas intervenir, pulsa "Tomar el control".</span>
                  </div>
                )}

                {/* POPUP/CONFIRMACIÓN LIGERA DE DEVOLUCIÓN A LA IA */}
                {showReturnConfirm && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2 animate-in fade-in slide-in-from-top-2">
                    <p className="font-bold text-amber-900">¿Devolver esta conversación a la IA?</p>
                    <p className="text-amber-800">La IA volverá a gestionar de forma automática los nuevos mensajes que envíe este cliente.</p>
                    <div className="flex gap-2 justify-end pt-1">
                      <button 
                        onClick={() => setShowReturnConfirm(false)}
                        className="px-3 py-1 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-md hover:bg-slate-50 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={() => executeHandoff('return_ai')}
                        className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-md hover:bg-blue-700 cursor-pointer"
                      >
                        Confirmar devolución a IA
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* BLOQUE CONTEXTO "RESUMEN DE LA IA" (SI APLICA) */}
              {(activeSession.status === 'HUMAN_REQUIRED' || activeSession.humanReason) && (
                <div className="m-4 p-4 bg-slate-900 text-white rounded-xl shadow-xs space-y-2 text-xs shrink-0">
                  <div className="flex items-center gap-2 text-blue-400 font-bold">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    <span>Resumen de la IA</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-slate-300">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">La IA ha entendido:</p>
                      <p className="font-medium text-white">{activeSession.aiSummary?.intent || 'Consulta de cliente'}</p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Motivo de no resolución:</p>
                      <p className="font-medium text-amber-300">{activeSession.humanReason || 'Requiere intervención humana'}</p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Información relevante:</p>
                      <p className="font-medium text-slate-200">{activeSession.aiSummary?.relevantData || 'Ver historial adjunto'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* CHAT MESSAGES STREAM */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#F8FAFC]">
                {activeSession.messages?.map((msg: any, idx: number) => {
                  const isUser = msg.role === 'user';
                  const isSystem = msg.role === 'system';
                  const isNote = msg.role === 'internal_note';

                  if (isSystem) {
                    return (
                      <div key={idx} className="flex justify-center my-2">
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/60 px-3 py-1 rounded-full">
                          {msg.content}
                        </span>
                      </div>
                    );
                  }

                  if (isNote) {
                    return (
                      <div key={idx} className="flex justify-center my-2">
                        <div className="max-w-[85%] bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 text-xs space-y-1 shadow-2xs">
                          <span className="font-bold text-[10px] uppercase text-amber-700 block">📌 Nota Interna</span>
                          <p>{msg.content}</p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={idx} className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs shadow-2xs ${
                        isUser 
                          ? 'bg-white border border-slate-200 text-slate-900 rounded-tl-none' 
                          : 'bg-blue-600 text-white rounded-tr-none font-medium'
                      }`}>
                        <div className="flex items-center justify-between gap-4 mb-1 text-[10px] opacity-75">
                          <span className="font-bold">
                            {isUser ? activeSession.customerIdentifier || 'Cliente' : 'Atención humana / IA'}
                          </span>
                          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {renderMessageContent(msg)}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* BLOQUE DE RESPUESTA SUGERIDA POR LA IA */}
              {activeSession.suggestedReply && activeSession.controlBy === 'HUMAN' && (
                <div className="p-3 bg-blue-50/60 border-t border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shrink-0">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-blue-900">Respuesta sugerida por la IA:</p>
                      <p className="text-slate-700 italic mt-0.5">"{activeSession.suggestedReply}"</p>
                    </div>
                  </div>
                  <div className="flex gap-2 self-end sm:self-auto shrink-0">
                    <button 
                      onClick={() => setReplyText(activeSession.suggestedReply)}
                      className="px-2.5 py-1 bg-white border border-blue-200 text-blue-700 text-xs font-semibold rounded-md hover:bg-blue-50 cursor-pointer"
                    >
                      Usar texto
                    </button>
                    <button 
                      onClick={() => handleSendMessage(activeSession.suggestedReply)}
                      className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-md hover:bg-blue-700 cursor-pointer"
                    >
                      Enviar respuesta
                    </button>
                  </div>
                </div>
              )}

              {/* BARRA DE COMPOSICIÓN DE MENSAJES */}
              <div className="p-3.5 bg-white border-t border-slate-200 space-y-2.5 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setIsInternalNote(false)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        !isInternalNote ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Respuesta al cliente
                    </button>
                    <button 
                      onClick={() => setIsInternalNote(true)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        isInternalNote ? 'bg-amber-500 text-white' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      📌 Nota interna
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={
                      isInternalNote 
                        ? 'Escribe una nota interna para tu equipo...' 
                        : activeSession.controlBy === 'AI' 
                        ? 'Al enviar un mensaje tomarás el control automático...' 
                        : 'Escribe tu respuesta al cliente...'
                    }
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                  />
                  <button 
                    onClick={() => handleSendMessage()}
                    disabled={isSending || !replyText.trim()}
                    className="px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center justify-center shadow-xs cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-2">
              <MessageSquare className="w-10 h-10 text-slate-300" />
              <p className="font-bold text-slate-700 text-sm">Selecciona una conversación</p>
              <p className="text-xs text-slate-500 max-w-xs">Supervisa las conversaciones de tus clientes o responde a los casos que requieren atención.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
