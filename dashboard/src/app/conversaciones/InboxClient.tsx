"use client";

import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { 
  MessageSquare, User, Bot, CheckCircle2, Clock, AlertCircle, Phone, ArrowLeft, Send, Sparkles, X, ChevronRight, Lock
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

export default function InboxClient({ initialSessions }: { initialSessions: any[] }) {
  const [sessions, setSessions] = useState(initialSessions);
  const [activeSessionId, setActiveSessionId] = useState(initialSessions[0]?.id || null);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'ai' | 'history'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showListOnMobile, setShowListOnMobile] = useState(true);
  const [showAutopilotModal, setShowAutopilotModal] = useState(false);
  const [autopilotInstruction, setAutopilotInstruction] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const filteredSessions = sessions.filter(s => {
    const matchesSearch = !searchQuery || 
      (s.customerPhone && s.customerPhone.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.messages && s.messages.some((m: any) => m.content.toLowerCase().includes(searchQuery.toLowerCase())));

    if (!matchesSearch) return false;

    if (activeFilter === 'pending') return s.status === 'HUMAN_REQUESTED' || s.status === 'HUMAN_CONTROL';
    if (activeFilter === 'ai') return s.status === 'ACTIVE';
    if (activeFilter === 'history') return s.status === 'CLOSED';
    return true;
  });

  const pendingCount = sessions.filter(s => s.status === 'HUMAN_REQUESTED' || (s.status === 'HUMAN_CONTROL' && s.messages?.[s.messages.length - 1]?.role === 'user')).length;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, activeSessionId]);

  const handleSendMessage = async () => {
    if (!replyText.trim() || !activeSessionId || isSending) return;
    setIsSending(true);

    const messageContent = replyText;
    setReplyText('');

    setSessions(prev => {
      const updated = [...prev];
      const sessionIndex = updated.findIndex(s => s.id === activeSessionId);
      if (sessionIndex > -1) {
        if (!updated[sessionIndex].messages) updated[sessionIndex].messages = [];
        updated[sessionIndex].messages.push({ role: isInternalNote ? 'internal_note' : 'assistant', content: messageContent, createdAt: new Date() });
        updated[sessionIndex].updatedAt = new Date();
      }
      return updated;
    });

    if (!activeSessionId.startsWith('mock-')) {
      try {
        await fetch(`/api/sessions/${activeSessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: messageContent, isInternalNote })
        });
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
    
    setIsSending(false);
  };

  useEffect(() => {
    const socket = io('http://localhost:3001');
    
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
              if (data.sessions) {
                setSessions(data.sessions);
              }
            });
          return prev;
        }
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleHandoff = async (action: 'take_control' | 'return_ai' | 'close_session') => {
    if (!activeSessionId) return;
    
    if (activeSessionId.startsWith('mock-')) {
      let newStatus = 'ACTIVE';
      if (action === 'take_control') newStatus = 'HUMAN_CONTROL';
      if (action === 'close_session') newStatus = 'CLOSED';
      
      setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, status: newStatus } : s));
      if (action === 'return_ai') {
        setShowAutopilotModal(true);
        return;
      }
      if (action === 'close_session') {
        setActiveSessionId(null);
        setShowListOnMobile(true);
      }
      return;
    }

    await executeHandoff(action);
  };

  const executeHandoff = async (action: 'take_control' | 'return_ai' | 'close_session', instruction?: string) => {
    if (!activeSessionId) return;

    try {
      const body: any = { action };
      if (instruction) body.instruction = instruction;

      const res = await fetch(`/api/sessions/${activeSessionId}/handoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (res.ok) {
        const data = await res.json();
        setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, status: data.session.status } : s));
        if (action === 'close_session') {
          setActiveSessionId(null);
          setShowListOnMobile(true);
        }
        if (action === 'return_ai') {
          setShowAutopilotModal(false);
          setAutopilotInstruction('');
        }
      }
    } catch (error) {
      console.error('Error changing handoff status:', error);
    }
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);

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
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Conversaciones</h1>
          <p className="text-xs text-slate-500 mt-0.5">Revisa y atiende las conversaciones mantenidas por tu asistente</p>
        </div>
        
        {pendingCount > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-xs font-semibold text-amber-800">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span>{pendingCount} conversación{pendingCount > 1 ? 'es' : ''} requiere{pendingCount > 1 ? 'n' : ''} respuesta</span>
          </div>
        )}
      </div>

      {/* CONTENEDOR PRINCIPAL CHAT */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-row min-h-0">
        
        {/* PANEL IZQUIERDO: LISTA DE CONVERSACIONES */}
        <div className={`flex-shrink-0 border-r border-slate-200 flex-col bg-slate-50/50 
          ${showListOnMobile ? 'flex w-full md:w-[320px]' : 'hidden md:flex w-[320px]'}`}>
          
          {/* BARRA DE BÚSQUEDA Y FILTROS */}
          <div className="p-3.5 border-b border-slate-200 bg-white space-y-2.5">
            <input 
              type="search" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cliente o mensaje..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />

            <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
              <button 
                onClick={() => setActiveFilter('all')}
                className={`flex-1 text-[11px] font-semibold py-1 rounded-md transition-all ${
                  activeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Todas
              </button>
              <button 
                onClick={() => setActiveFilter('pending')}
                className={`flex-1 text-[11px] font-semibold py-1 rounded-md transition-all flex items-center justify-center gap-1 ${
                  activeFilter === 'pending' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Pendientes
                {pendingCount > 0 && (
                  <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                    {pendingCount}
                  </span>
                )}
              </button>
              <button 
                onClick={() => setActiveFilter('ai')}
                className={`flex-1 text-[11px] font-semibold py-1 rounded-md transition-all ${
                  activeFilter === 'ai' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Autopiloto
              </button>
              <button 
                onClick={() => setActiveFilter('history')}
                className={`flex-1 text-[11px] font-semibold py-1 rounded-md transition-all ${
                  activeFilter === 'history' ? 'bg-white text-slate-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Histórico
              </button>
            </div>
          </div>
          
          {/* LISTA PREDETERMINADA DE CONVERSACIONES */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredSessions.length === 0 ? (
              <div className="p-8 text-center mt-6 space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-800">No hay conversaciones</p>
                <p className="text-[11px] text-slate-500">
                  {searchQuery ? 'No coinciden conversaciones con tu búsqueda.' : 'No hay clientes en este filtro.'}
                </p>
              </div>
            ) : filteredSessions.map((session: any) => {
              const isSelected = activeSessionId === session.id;
              const lastMsg = session.messages?.[session.messages.length - 1];
              const isPending = session.status === 'HUMAN_REQUESTED';
              const isHumanControl = session.status === 'HUMAN_CONTROL';

              return (
                <div 
                  key={session.id} 
                  onClick={() => { setActiveSessionId(session.id); setShowListOnMobile(false); }}
                  className={`p-3.5 cursor-pointer transition-colors relative ${
                    isSelected ? 'bg-blue-50/60' : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {session.customerPhone || 'Cliente WhatsApp'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(session.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 truncate mb-2 pr-2">
                    {lastMsg?.content || 'Sin mensajes recientes'}
                  </p>

                  <div className="flex items-center gap-2">
                    {isPending && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        Necesita atención
                      </span>
                    )}
                    {isHumanControl && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        Atendido por ti
                      </span>
                    )}
                    {!isPending && !isHumanControl && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Resuelta por el asistente
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PANEL DERECHO: DETALLE Y VISTA DEL CHAT */}
        <div className={`flex-1 flex flex-col bg-white ${!showListOnMobile ? 'flex' : 'hidden md:flex'}`}>
          {activeSession ? (
            <>
              {/* CHAT HEADER */}
              <div className="h-14 border-b border-slate-200 flex justify-between items-center px-4 md:px-6 bg-white flex-shrink-0">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setShowListOnMobile(true)}
                    className="md:hidden text-slate-400 hover:text-slate-600 p-1"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      {activeSession.customerPhone || 'Cliente WhatsApp'}
                      <span className="text-[10px] font-medium text-slate-400">WhatsApp</span>
                    </h2>
                    <p className="text-[10px] text-slate-500">
                      ID: {activeSession.id.substring(0, 12)}...
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activeSession.status === 'HUMAN_CONTROL' ? (
                    <button 
                      onClick={() => handleHandoff('return_ai')}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      Devolver a la IA
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleHandoff('take_control')}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <User className="w-3.5 h-3.5" />
                      Tomar control
                    </button>
                  )}

                  {activeSession.status !== 'CLOSED' && (
                    <button 
                      onClick={() => handleHandoff('close_session')}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Cerrar
                    </button>
                  )}
                </div>
              </div>

              {/* LISTA DE MENSAJES */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 bg-slate-50/50">
                {activeSession.messages?.map((msg: any, index: number) => {
                  const isUser = msg.role === 'user';
                  const isInternal = msg.role === 'internal_note';
                  
                  if (isInternal) {
                    return (
                      <div key={index} className="mx-auto max-w-md bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 shadow-xs">
                        <div className="flex items-center gap-1.5 mb-1 font-bold text-amber-800">
                          <Lock className="w-3.5 h-3.5" />
                          Nota interna (visible solo para el equipo)
                        </div>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={index} 
                      className={`flex flex-col ${isUser ? 'items-start' : 'items-end'}`}
                    >
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs shadow-xs ${
                        isUser 
                          ? 'bg-white border border-slate-200 text-slate-900 rounded-tl-xs' 
                          : 'bg-blue-600 text-white rounded-tr-xs'
                      }`}>
                        {renderMessageContent(msg)}
                      </div>
                      
                      <span className="text-[10px] text-slate-400 mt-1 px-1 font-mono">
                        {isUser ? 'Cliente' : 'Asistente IA'} • {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* CAJA DE ENVIAR MENSAJE */}
              <div className="p-3.5 border-t border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isInternalNote} 
                      onChange={(e) => setIsInternalNote(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 border-slate-300" 
                    />
                    <span>Nota interna</span>
                  </label>
                  
                  {activeSession.status === 'HUMAN_REQUESTED' && (
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      Cliente esperando respuesta
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <textarea 
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={isInternalNote ? "Escribe una nota privada para tu equipo..." : "Escribe una respuesta para el cliente..."}
                    rows={2}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none"
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={!replyText.trim() || isSending}
                    className="self-end px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Enviar
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/50">
              <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="text-sm font-bold text-slate-800 mb-1">Selecciona una conversación</h3>
              <p className="text-xs text-slate-500 max-w-xs">
                Haz clic en cualquier chat de la lista de la izquierda para ver los mensajes y responder.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* MODAL AUTOPILOTO (DEVOLVER A LA IA) */}
      <Dialog open={showAutopilotModal} onOpenChange={setShowAutopilotModal}>
        <DialogContent className="bg-white border border-slate-200 rounded-xl p-6 shadow-lg max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-600" />
              Devolver control al Asistente
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              La IA volverá a responder automáticamente a este cliente por WhatsApp. Puedes añadir una instrucción puntual para orientarla.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Instrucción puntual (Opcional)
            </label>
            <textarea 
              value={autopilotInstruction}
              onChange={(e) => setAutopilotInstruction(e.target.value)}
              placeholder="Ej: 'Informa al cliente de que su pedido saldrá mañana por la mañana.'"
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none resize-none"
            />
          </div>

          <DialogFooter className="flex gap-2">
            <button 
              onClick={() => setShowAutopilotModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button 
              onClick={() => executeHandoff('return_ai', autopilotInstruction)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              Reactivar Autopiloto
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
