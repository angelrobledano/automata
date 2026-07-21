"use client";

import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

export default function InboxClient({ initialSessions }: { initialSessions: any[] }) {
  const renderMessageContent = (msg: any) => {
    const content = msg.content || '';
    const type = msg.type || 'TEXT';
    
    // Fallback heurístico por si el backend aún no ha clasificado el tipo (mensajes antiguos)
    const isImage = type === 'IMAGE' || /\.(jpeg|jpg|gif|png|webp)$/i.test(content) || content.startsWith('data:image/');
    const isAudio = type === 'AUDIO' || /\.(mp3|wav|ogg)$/i.test(content) || content.startsWith('data:audio/');
    
    if (isImage) {
      return (
        <div className="relative group">
          <img src={content} alt="Media" className="rounded-lg max-h-48 object-cover shadow-none" />
          <a href={content} target="_blank" rel="noreferrer" className="absolute bottom-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
            </svg>
          </a>
        </div>
      );
    }
    
    if (isAudio) {
      return (
        <audio controls className="max-w-[200px] h-10">
          <source src={content} />
          Tu navegador no soporta el elemento de audio.
        </audio>
      );
    }
    
    return <p className="whitespace-pre-wrap font-medium">{content}</p>;
  };
  const [sessions, setSessions] = useState(initialSessions);
  const [activeSessionId, setActiveSessionId] = useState(initialSessions[0]?.id || null);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'pending' | 'ai' | 'history'>('pending');
  const [showListOnMobile, setShowListOnMobile] = useState(true);
  const [showAutopilotModal, setShowAutopilotModal] = useState(false);
  const [autopilotInstruction, setAutopilotInstruction] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);

  const filteredSessions = sessions.filter(s => {
    if (activeFilter === 'pending') return s.status === 'HUMAN_REQUESTED' || s.status === 'HUMAN_CONTROL';
    if (activeFilter === 'ai') return s.status === 'ACTIVE';
    if (activeFilter === 'history') return s.status === 'CLOSED';
    return true;
  });

  const handleSendMessage = async () => {
    if (!replyText.trim() || !activeSessionId || isSending) return;
    setIsSending(true);

    const messageContent = replyText;
    setReplyText(''); // Limpiamos el input rápido para buena UX

    // Optismistic UI Update (UX primero)
    setSessions(prev => {
      const updated = [...prev];
      const sessionIndex = updated.findIndex(s => s.id === activeSessionId);
      if (sessionIndex > -1) {
        if (!updated[sessionIndex].messages) updated[sessionIndex].messages = [];
        updated[sessionIndex].messages.push({ role: isInternalNote ? 'internal_note' : 'assistant', content: messageContent });
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
    // Conectar a socket.io del servidor Express (asumiendo que corre en localhost:3001)
    const socket = io('http://localhost:3001');
    
    socket.on('new_message', (data) => {
      setSessions(prev => {
        const updated = [...prev];
        const sessionIndex = updated.findIndex(s => s.id === data.sessionId);
        
        if (sessionIndex > -1) {
          // Ya existe la sesión, añadimos el mensaje si no está duplicado
          const session = updated[sessionIndex];
          if (!session.messages) session.messages = [];
          
          // Verificación simple anti-duplicados
          const msgExists = session.messages.find((m: any) => m.content === data.message.content && m.role === data.message.role);
          if (!msgExists) {
             session.messages.push(data.message);
             session.updatedAt = new Date();
          }
          return updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        } else {
          // La sesión no existe en el cliente, deberíamos forzar una recarga para traer el nuevo cliente
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
    
    // Si es una sesión de prueba (mock), simulamos el cambio para mostrar la UX
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
      } else {
        console.error('API Error updating status');
      }
    } catch (error) {
      console.error('Error changing handoff status:', error);
    }
  };

  useEffect(() => {
    if (!showListOnMobile) {
      document.body.classList.add('hide-mobile-nav');
    } else {
      document.body.classList.remove('hide-mobile-nav');
    }
    return () => document.body.classList.remove('hide-mobile-nav');
  }, [showListOnMobile]);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  return (
    <div className="flex h-full bg-card font-sans text-foreground w-full relative">
      {/* Panel Izquierdo: Lista de Chats */}
      <div className={`flex-shrink-0 border-r border-border flex-col bg-background/50 
        ${showListOnMobile ? 'flex w-full md:w-[320px]' : 'hidden md:flex w-[320px]'}`}>
        <div className="p-4 border-b border-border bg-card">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold tracking-tight text-foreground">Conversaciones</h2>
          </div>
          
          <div className="flex bg-muted p-1 rounded-lg mb-3">
            <button 
              onClick={() => setActiveFilter('pending')}
              className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${activeFilter === 'pending' ? 'bg-background shadow-none text-amber-600' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Pendientes
              <span className="ml-1.5 bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full text-[10px]">
                {sessions.filter(s => s.status === 'HUMAN_REQUESTED' || (s.status === 'HUMAN_CONTROL' && s.messages?.[s.messages.length - 1]?.role === 'user')).length}
              </span>
            </button>
            <button 
              onClick={() => setActiveFilter('ai')}
              className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${activeFilter === 'ai' ? 'bg-background shadow-none text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Autopiloto
            </button>
            <button 
              onClick={() => setActiveFilter('history')}
              className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${activeFilter === 'history' ? 'bg-background shadow-none text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Histórico
            </button>
          </div>

          <input 
            type="search" 
            placeholder="Buscar..." 
            className="w-full bg-muted/50 border border-input rounded-lg px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-shadow"
          />
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {filteredSessions.length === 0 ? (
            <div className="p-8 flex flex-col items-center text-center mt-10">
              <div className="w-16 h-16 bg-card border border-gray-100 shadow-none rounded-lg flex items-center justify-center text-2xl mb-4">
                {activeFilter === 'pending' ? '🙌' : activeFilter === 'ai' ? '🤖' : '🗄️'}
              </div>
              <h3 className="text-sm font-bold text-foreground mb-1">Todo al día</h3>
              <p className="text-xs text-muted-foreground">
                {activeFilter === 'pending' ? 'No hay clientes esperando a ser atendidos por un humano.' : 'No hay chats en esta categoría.'}
              </p>
            </div>
          ) : filteredSessions.map((session: any) => (
            <div 
              key={session.id} 
              onClick={() => { setActiveSessionId(session.id); setShowListOnMobile(false); }}
              className={`px-4 py-3 cursor-pointer border-b border-gray-100 transition-colors ${activeSessionId === session.id ? 'bg-primary/10/50' : 'bg-card hover:bg-background'} ${
                session.status === 'HUMAN_REQUESTED' ? 'border-l-2 border-l-amber-500' : 'border-l-2 border-l-transparent'
              }`}
            >
              <div className="flex justify-between items-baseline mb-1">
                <span className="font-semibold text-sm text-foreground">{session.customerPhone}</span>
                <span className="text-xs text-gray-400">
                  {new Date(session.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate pr-4">
                {session.messages?.[session.messages.length - 1]?.content || 'Nueva conversación...'}
              </p>
              {session.status === 'HUMAN_REQUESTED' && (
                <div className="mt-2 flex items-center">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-1.5 animate-pulse"></span>
                  <span className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">Esperando Humano</span>
                </div>
              )}
              {session.status === 'HUMAN_CONTROL' && (
                <div className="mt-2 flex items-center">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mr-1.5"></span>
                  <span className="text-[10px] uppercase font-bold text-primary tracking-wider">Atendido por ti</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Panel Central: El Chat */}
      <div className={`flex-1 flex flex-col bg-card ${!showListOnMobile ? 'flex' : 'hidden md:flex'}`}>
        {activeSession ? (
          <>
            <div className="h-14 border-b border-border flex justify-between items-center px-4 md:px-6">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowListOnMobile(true)}
                  className="md:hidden -ml-1 h-8 w-8 text-muted-foreground"
                  aria-label="Volver a la lista"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </Button>
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold text-sm">
                  C
                </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{activeSession.customerPhone}</h3>
                <p className="text-xs text-muted-foreground leading-none">Cliente Anónimo</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {activeSession.status !== 'CLOSED' && (
                <>
                  <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border">
                    <Button 
                      variant={activeSession.status !== 'HUMAN_CONTROL' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => handleHandoff('return_ai')}
                      className={`h-7 px-3 text-xs font-bold ${activeSession.status !== 'HUMAN_CONTROL' ? 'bg-background shadow-none ring-1 ring-border' : 'text-muted-foreground'}`}
                    >
                      Reactivar bot
                    </Button>
                    <Button 
                      variant={activeSession.status === 'HUMAN_CONTROL' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => handleHandoff('take_control')}
                      className={`h-7 px-3 text-xs font-bold ${activeSession.status === 'HUMAN_CONTROL' ? 'text-primary bg-background shadow-none ring-1 ring-border' : 'text-muted-foreground'}`}
                    >
                      Pausar bot y responder yo
                    </Button>
                  </div>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => handleHandoff('close_session')}
                    title="Atajo: Cmd/Ctrl + Enter"
                    className="h-8 px-3 text-xs font-bold text-muted-foreground hover:bg-green-50 hover:text-green-700 hover:border-green-200 gap-1.5 group"
                  >
                    <span className="text-green-500 text-base leading-none group-hover:scale-110 transition-transform">✔</span> 
                    Resuelto
                    <span className="hidden lg:inline-block ml-1 text-[9px] text-muted-foreground/60 font-normal px-1 py-0.5 bg-muted rounded">⌘/Ctrl + ↵</span>
                  </Button>
                </>
              )}
              {activeSession.status === 'CLOSED' && (
                <Badge variant="secondary" className="uppercase tracking-wider">
                  Cerrada
                </Badge>
              )}
            </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-background/30">
            {activeSession.messages?.map((msg: any, idx: number) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-start items-end gap-2' : 'justify-end items-end gap-2'}`}>
                {msg.role === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-muted-foreground font-bold mb-1">
                    {activeSession.customerPhone ? activeSession.customerPhone.substring(activeSession.customerPhone.length - 2) : 'C'}
                  </div>
                )}
                <div className={`
                  ${msg.role === 'user' ? 'bg-card text-foreground rounded-tl-sm border-border' : ''}
                  ${msg.role === 'assistant' ? 'bg-primary text-white rounded-tr-sm shadow-none' : ''}
                  ${msg.role === 'system' ? 'bg-red-50 text-red-700 border-red-200 rounded-tr-sm shadow-none' : ''}
                  ${msg.role === 'internal_note' ? 'bg-yellow-50 text-yellow-900 border-yellow-200 rounded-tr-sm shadow-none' : ''}
                  rounded-lg px-4 py-2.5 max-w-[70%] text-sm border
                `}>
                  {renderMessageContent(msg)}
                </div>
                {msg.role === 'internal_note' && (
                  <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center text-xs mb-1">🔒</div>
                )}
                {msg.role !== 'user' && msg.role !== 'system' && msg.role !== 'internal_note' && (
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs mb-1">🤖</div>
                )}
                {msg.role === 'system' && (
                  <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-xs mb-1">⚠️</div>
                )}
              </div>
            ))}

            {activeSession.status === 'ACTIVE' && activeSession.messages?.[activeSession.messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start items-end gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs mb-1 shadow-none">🤖</div>
                <div className="bg-card rounded-lg px-4 py-3.5 border border-indigo-100 shadow-none flex items-center gap-1.5 rounded-tl-sm">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}
          </div>

          {activeSession.status === 'HUMAN_CONTROL' ? (
            <div className={`p-4 border-t border-border ${isInternalNote ? 'bg-yellow-50' : 'bg-background'}`}>
              
              <div className="flex gap-2 mb-2">
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsInternalNote(false)}
                  className={`h-7 px-3 text-xs font-bold ${!isInternalNote ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
                >
                  Mensaje
                </Button>
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsInternalNote(true)}
                  className={`h-7 px-3 text-xs font-bold flex items-center gap-1 ${isInternalNote ? 'bg-yellow-200 text-yellow-900 hover:bg-yellow-300' : 'text-muted-foreground hover:text-yellow-700'}`}
                >
                  🔒 Nota Interna
                </Button>
              </div>

              <div className={`flex items-end gap-2 rounded-lg border focus-within:ring-2 focus-within:ring-offset-2 p-2 transition-all ${
                isInternalNote 
                  ? 'bg-yellow-100/50 border-yellow-300 focus-within:border-yellow-500 focus-within:ring-yellow-500' 
                  : 'bg-muted/30 border-input focus-within:border-primary focus-within:ring-ring'
              }`}>
                <Textarea 
                  placeholder={isInternalNote ? "Escribe una nota interna (solo para tu equipo)..." : "Escribe tu respuesta como humano..."} 
                  className={`flex-1 border-none shadow-none resize-none px-2 py-1 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent min-h-[40px] max-h-32 ${isInternalNote ? 'placeholder-yellow-700/50 text-yellow-900' : ''}`}
                  rows={1}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      if (e.metaKey || e.ctrlKey) {
                        e.preventDefault();
                        handleHandoff('close_session');
                      } else {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }
                  }}
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={!replyText.trim() || isSending}
                  size="icon"
                  className={`h-8 w-8 rounded-lg mb-0.5 shrink-0 ${isInternalNote ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : ''}`}
                  aria-label="Enviar"
                >
                  {isSending ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  )}
                </Button>
              </div>
            </div>
          ) : (
             <div className="p-4 border-t border-border bg-background text-center text-xs text-muted-foreground">
                La IA está al mando de esta conversación. Para responder manualmente, pulsa "Pausar bot y responder yo".
             </div>
          )}
        </>
      ) : (
        <div className="flex-1 flex flex-col bg-background items-center justify-center text-center p-8">
          <div className="w-32 h-32 bg-card rounded-full shadow-none flex items-center justify-center mb-6 relative">
            <span className="text-6xl absolute">🧠</span>
            <span className="absolute top-0 right-0 w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-xl shadow-none">✨</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Tu Inbox está tranquilo</h2>
          <p className="text-muted-foreground max-w-sm mb-8 text-sm">
            Mientras esperas a tu primer cliente, puedes seguir entrenando al cerebro de tu IA para que sus respuestas sean impecables.
          </p>
          <a href="/cerebro" className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-bold transition-all shadow-none flex items-center gap-2 hover:-translate-y-0.5">
            <span>Añadir Conocimiento</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </a>
        </div>
      )}
      </div>

      {/* Autopilot Modal */}
      <Dialog open={showAutopilotModal} onOpenChange={(open) => {
        if (!open) {
          setShowAutopilotModal(false);
          setAutopilotInstruction('');
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Devolver control a la IA</DialogTitle>
            <DialogDescription>
              ¿Quieres darle alguna instrucción contextual a la IA para que retome la conversación? (Opcional)
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea 
              value={autopilotInstruction}
              onChange={e => setAutopilotInstruction(e.target.value)}
              placeholder="Ej. Sigue atendiéndole y ofrécele un descuento del 10%"
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button 
              variant="ghost" 
              onClick={() => { setShowAutopilotModal(false); setAutopilotInstruction(''); }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                executeHandoff('return_ai', autopilotInstruction);
                setShowAutopilotModal(false);
                setAutopilotInstruction('');
              }}
            >
              Activar IA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
