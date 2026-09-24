"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles, RotateCcw, X, Send } from 'lucide-react';
import { analytics } from '@/lib/analytics';

type Role = 'user' | 'assistant';
interface Message {
  role: Role;
  content: string;
}

export function AISimulator() {
  const [isOpen, setIsOpen] = useState(false);
  
  const initialMessages: Message[] = [
    { role: 'assistant', content: '¡Hola! Soy tu simulador. Pruébame enviándome un mensaje para ver cómo responde la interfaz conectada al backend.' }
  ];
  
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return;
    
    const userMessage = inputValue;
    setInputValue('');
    setIsTyping(true);
    
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);

    try {
      analytics.track('ai_test_executed', { has_instruction: false });
      
      const res = await fetch('/api/simulator/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      });
      
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, data.message]);
      } else {
        throw new Error("Error en la API del simulador");
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Hubo un error al conectar con el servidor. Por favor, inténtalo de nuevo.' 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClear = () => {
    setMessages(initialMessages);
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-24 right-6 md:bottom-8 md:right-8 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center z-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 transition-colors cursor-pointer"
            aria-label="Abrir Simulador IA"
            title="Probar simulador"
          >
            <Sparkles className="w-6 h-6 text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-24 right-4 md:bottom-8 md:right-8 w-[350px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[70vh] bg-background rounded-2xl shadow-2xl border border-border z-50 flex flex-col origin-bottom-right overflow-hidden"
          >
            {/* Header */}
            <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight text-white">Simulador IA</h3>
                  <p className="text-[10px] text-blue-100 flex items-center gap-1.5 font-medium">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                    En línea (API real)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={handleClear}
                  className="w-8 h-8 hover:bg-white/15 rounded-full flex items-center justify-center transition-colors text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
                  aria-label="Reiniciar chat"
                  title="Reiniciar chat"
                >
                  <RotateCcw className="w-4 h-4 text-white" />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 hover:bg-white/15 rounded-full flex items-center justify-center transition-colors text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
                  aria-label="Cerrar Simulador IA"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto bg-muted/30 flex flex-col gap-4">
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => {
                  const parseRichText = (text: string) => {
                    let parsedContent = text || '';
                    const buttons: string[] = [];
                    const buttonRegex = /\[(?:Botón|Acción):\s*([^\]]+)\]/gi;
                    parsedContent = parsedContent.replace(buttonRegex, (_, p1) => {
                      buttons.push(p1.trim());
                      return '';
                    });
                    let htmlContent = parsedContent
                      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;")
                      .replace(/\*([^\*]+)\*/g, '<strong>$1</strong>')
                      .replace(/_([^_]+)_/g, '<em>$1</em>')
                      .replace(/~([^~]+)~/g, '<del>$1</del>')
                      .replace(/(\d+(?:[.,]\d+)?\s*€(?:\/\w+)?)/g, '<span class="bg-blue-50 text-blue-700 font-semibold px-1 rounded inline-block">$1</span>')
                      .trim();
                    return { htmlContent, buttons };
                  };
                  const parsed = parseRichText(msg.content);
                  return (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                    )}
                    <div className={`px-4 py-2 text-sm max-w-[80%] flex flex-col gap-2 ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-lg rounded-tr-sm shadow-none font-medium' 
                        : 'bg-background text-foreground rounded-lg rounded-tl-sm border border-border shadow-none'
                    }`}>
                      {parsed.htmlContent && (
                        <div 
                          className="whitespace-pre-wrap leading-relaxed" 
                          dangerouslySetInnerHTML={{ __html: parsed.htmlContent }} 
                        />
                      )}
                      {parsed.buttons.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {parsed.buttons.map((btn, idx) => (
                            <button key={idx} className="bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full cursor-pointer hover:bg-blue-700 transition-colors">
                              {btn}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )})}
              </AnimatePresence>
              
              <AnimatePresence>
                {isTyping && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex justify-start items-end gap-2"
                  >
                    <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div className="bg-background rounded-lg rounded-tl-sm px-4 py-3 border border-border shadow-none flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-blue-600/70 rounded-full animate-pulse"></span>
                      <span className="w-1.5 h-1.5 bg-blue-600/70 rounded-full animate-pulse [animation-delay:150ms]"></span>
                      <span className="w-1.5 h-1.5 bg-blue-600/70 rounded-full animate-pulse [animation-delay:300ms]"></span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border bg-background rounded-b-2xl">
              <div className="flex items-center gap-2 bg-muted/50 border border-input rounded-lg p-1 pr-2 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:border-primary transition-all">
                <input 
                  type="text" 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Escribe algo..."
                  className="flex-1 bg-transparent border-none text-sm px-3 py-2 focus:outline-none focus:ring-0"
                />
                <button 
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isTyping}
                  className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center disabled:opacity-50 hover:bg-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 cursor-pointer"
                  aria-label="Enviar mensaje"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
