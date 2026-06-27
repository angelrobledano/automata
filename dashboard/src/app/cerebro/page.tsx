"use client";

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Copy, Check } from 'lucide-react';
import { analytics } from '@/lib/analytics';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function CerebroPage() {
  const [activeTab, setActiveTab] = useState<'upload' | 'text'>('upload');
  
  // File upload state
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [uploadCategory, setUploadCategory] = useState('GENERAL');
  
  // Text thread state
  const [threadTitle, setThreadTitle] = useState('');
  const [threadContent, setThreadContent] = useState('');
  const [threadCategory, setThreadCategory] = useState('GENERAL');
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [isSavingText, setIsSavingText] = useState(false);
  
  const [status, setStatus] = useState<string | null>(null);
  const [sources, setSources] = useState<any[]>([]);

  // Audit Modal state
  const [auditingSource, setAuditingSource] = useState<any>(null);
  const [auditChunks, setAuditChunks] = useState<any[]>([]);
  const [isFetchingChunks, setIsFetchingChunks] = useState(false);
  const [copiedChunkId, setCopiedChunkId] = useState<string | null>(null);

  // Simulator state
  const [simMessage, setSimMessage] = useState('');
  const [simMessages, setSimMessages] = useState<any[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [lastMetadata, setLastMetadata] = useState<any>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSources();
  }, []);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [simMessages]);

  const fetchSources = async () => {
    try {
      const res = await fetch('/api/knowledge');
      const data = await res.json();
      if (data.success) {
        setSources(data.sources);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const onDragOver = (e: any) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => { setIsDragging(false); };
  const onDrop = async (e: any) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files[0]) await uploadFile(e.dataTransfer.files[0]);
  };
  const handleFileSelect = async (e: any) => {
    if (e.target.files[0]) await uploadFile(e.target.files[0]);
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setStatus('Subiendo y extrayendo texto...');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', uploadCategory);
    
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setStatus(`✅ ¡Listo! La IA ha memorizado ${data.result.chunksProcessed} fragmentos de "${file.name}".`);
        fetchSources();
      } else setStatus(`⚠️ ${data.error || 'No hemos podido leer este archivo. Asegúrate de que es un documento válido.'}`);
    } catch (err) {
      setStatus('⚠️ La subida se ha interrumpido. Comprueba tu conexión y vuelve a intentarlo.');
    } finally {
      setIsUploading(false);
    }
  };

  const saveTextThread = async () => {
    if (!threadTitle || !threadContent) {
      setStatus('⚠️ Añade un título y contenido para que la IA pueda aprenderlo.');
      return;
    }
    setIsSavingText(true);
    setStatus('Guardando este conocimiento...');
    try {
      const method = editingSourceId ? 'PUT' : 'POST';
      const body = { sourceId: editingSourceId, title: threadTitle, text: threadContent, category: threadCategory };
      const res = await fetch('/api/knowledge/text', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        setStatus(`✅ Conocimiento ${editingSourceId ? 'actualizado' : 'guardado'} correctamente.`);
        setThreadTitle('');
        setThreadContent('');
        setThreadCategory('GENERAL');
        setEditingSourceId(null);
        fetchSources();
      } else setStatus(`⚠️ No hemos podido guardar los cambios. Revisa la información.`);
    } catch (err) {
      setStatus('⚠️ No hemos podido guardar el texto. Revisa tu conexión.');
    } finally {
      setIsSavingText(false);
    }
  };

  const editSource = (source: any) => {
    setActiveTab('text');
    setEditingSourceId(source.id);
    setThreadTitle(source.name);
    setThreadContent(source.content);
    setThreadCategory(source.category || 'GENERAL');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteSource = async (sourceId: string) => {
    if (!window.confirm('¿Seguro que quieres eliminar este conocimiento? La IA dejará de recordarlo.')) return;
    
    try {
      const res = await fetch(`/api/knowledge/${sourceId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setStatus('✅ Conocimiento eliminado correctamente.');
        fetchSources();
      } else {
        setStatus(`⚠️ ${data.error || 'Error al eliminar.'}`);
      }
    } catch (e) {
      setStatus('⚠️ No hemos podido comunicarnos con el servidor. Revisa tu conexión.');
    }
  };

  const auditSource = async (source: any) => {
    analytics.track('knowledge_audited', { source_id: source.id, type: source.type });
    setAuditingSource(source);
    setIsFetchingChunks(true);
    setAuditChunks([]);
    try {
      const res = await fetch(`/api/knowledge/${source.id}/chunks`);
      const data = await res.json();
      if (data.success) {
        setAuditChunks(data.chunks);
      }
    } catch (e) {
      console.error('Error fetching chunks:', e);
    } finally {
      setIsFetchingChunks(false);
    }
  };

  const copyChunkToClipboard = (chunkId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedChunkId(chunkId);
    setTimeout(() => setCopiedChunkId(null), 2000);
  };

  const clearSimulation = async () => {
    try {
      await fetch('/api/knowledge/simulate?commerceId=commerce-seed-id', { method: 'DELETE' });
      setSimMessages([]);
      setLastMetadata(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSimulateMessage = async (e: any) => {
    e.preventDefault();
    if (!simMessage.trim() || isSimulating) return;

    const currentMessage = simMessage;
    setSimMessage('');
    setSimMessages(prev => [...prev, { role: 'user', content: currentMessage }]);
    setIsSimulating(true);
    
    // Add an empty assistant message to stream into
    setSimMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/knowledge/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commerceId: 'commerce-seed-id', message: currentMessage })
      });

      if (!res.ok || !res.body) throw new Error('Error en la API');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let assistantText = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          
          if (chunk.includes('[METADATA]')) {
            const parts = chunk.split('[METADATA]');
            assistantText += parts[0];
            try {
              const meta = JSON.parse(parts[1]);
              setLastMetadata(meta.__metadata);
            } catch(e) {}
          } else {
            assistantText += chunk;
          }

          setSimMessages(prev => {
            const newArr = [...prev];
            newArr[newArr.length - 1].content = assistantText;
            return newArr;
          });
        }
      }
    } catch (err) {
      console.error(err);
      setSimMessages(prev => {
        const newArr = [...prev];
        newArr[newArr.length - 1].content = '⚠️ La IA está tardando demasiado en responder. Inténtalo de nuevo en unos segundos.';
        return newArr;
      });
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="flex h-full font-sans overflow-hidden">
      
      {/* Columna Izquierda: Gestión de Fuentes */}
      <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50 border-r border-gray-200">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Cerebro del Asistente 🧠</h1>
          <p className="text-sm text-gray-500">
            Enseña a tu asistente cómo debe responder. Sube archivos o escribe hilos de conocimiento.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6 border-b border-gray-200">
          <button 
            onClick={() => { setActiveTab('upload'); setEditingSourceId(null); setThreadTitle(''); setThreadContent(''); }}
            className={`py-3 px-4 font-medium text-sm transition-colors ${activeTab === 'upload' ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            📄 Subir Archivo
          </button>
          <button 
            onClick={() => setActiveTab('text')}
            className={`py-3 px-4 font-medium text-sm transition-colors ${activeTab === 'text' ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            ✍️ Hilo de Conocimiento (Manual)
          </button>
        </div>

        {activeTab === 'upload' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all duration-200 flex flex-col items-center justify-center bg-white
              ${isDragging ? 'border-indigo-500 bg-indigo-50 scale-105 shadow-xl' : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30'}`}
            onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
          >
            <motion.div 
              animate={{ y: [0, -10, 0] }} 
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="text-5xl mb-6 opacity-90 drop-shadow-sm"
            >
              📄
            </motion.div>
            <h3 className="text-xl font-extrabold text-gray-800 mb-2">Sube tus archivos aquí</h3>
            <p className="text-sm text-gray-500 mb-8 font-medium">Soporta .PDF, .DOCX, .XLSX, .TXT y .MD</p>
            
            <div className="mb-8 w-72 text-left">
              <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Categoría del conocimiento</label>
              <select 
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 bg-white transition-all outline-none shadow-sm cursor-pointer"
              >
                <option value="GENERAL">General</option>
                <option value="POLICIES">Políticas y Envíos</option>
                <option value="PRODUCTS">Productos / Catálogo</option>
                <option value="QUICK_REPLIES">Respuestas Rápidas</option>
              </select>
            </div>

            <motion.label 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative group bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-2xl font-bold cursor-pointer transition-all shadow-lg hover:shadow-indigo-500/30 text-sm overflow-hidden"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
              <span className="relative z-10 flex items-center gap-2">Examinar archivos</span>
              <input type="file" className="hidden" accept=".pdf,.docx,.xlsx,.txt,.md" onChange={handleFileSelect} />
            </motion.label>
          </motion.div>
        )}

        {activeTab === 'text' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-bold text-gray-800 mb-4">{editingSourceId ? 'Editar Hilo' : 'Nuevo Hilo de Conocimiento'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Título del Hilo</label>
                <input 
                  type="text" 
                  value={threadTitle}
                  onChange={(e) => setThreadTitle(e.target.value)}
                  placeholder="Ej. Horarios de Apertura"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Categoría</label>
                <select 
                  value={threadCategory}
                  onChange={(e) => setThreadCategory(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-600 focus:border-transparent bg-white"
                >
                  <option value="GENERAL">General</option>
                  <option value="POLICIES">Políticas y Envíos</option>
                  <option value="PRODUCTS">Productos / Catálogo</option>
                  <option value="QUICK_REPLIES">Respuestas Rápidas</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Contenido</label>
                <textarea 
                  value={threadContent}
                  onChange={(e) => setThreadContent(e.target.value)}
                  placeholder="Ej. Abrimos de lunes a viernes de 10:00 a 20:00..."
                  className="w-full h-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-600 focus:border-transparent resize-y"
                ></textarea>
              </div>
              <div className="flex justify-end gap-2">
                {editingSourceId && (
                  <button 
                    onClick={() => { setEditingSourceId(null); setThreadTitle(''); setThreadContent(''); }}
                    className="px-4 py-2 rounded-lg font-medium text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                )}
                <button 
                  onClick={saveTextThread}
                  disabled={isSavingText}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSavingText ? 'Guardando...' : (editingSourceId ? 'Actualizar Hilo' : 'Guardar Hilo')}
                </button>
              </div>
            </div>
          </div>
        )}

        {status && (
          <div className={`mt-4 p-3 rounded-lg text-sm font-medium transition-all ${isUploading || isSavingText ? 'bg-indigo-50 text-indigo-800 border border-indigo-100' : status.includes('✅') ? 'bg-green-50 text-green-800 border border-green-100' : 'bg-red-50 text-red-800 border border-red-100'}`}>
            {(isUploading || isSavingText) && <span className="inline-block w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mr-2 align-middle"></span>}
            {status}
          </div>
        )}

        <div className="mt-8">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Fuentes Sincronizadas ({sources.length})</h3>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
            {sources.length === 0 && (
               <div className="p-6 text-center text-sm text-gray-500">Tu asistente está listo para aprender. Sube tu primer PDF o escribe unas normas básicas para empezar.</div>
            )}
            <AnimatePresence>
              {sources.map(source => (
                <motion.div 
                  key={source.id} 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 lg:gap-0 hover:bg-indigo-50/50 transition-colors"
                >
                  <div className="flex items-start gap-3 w-full lg:w-auto overflow-hidden">
                    <span className="text-xl p-2 bg-white rounded-lg shadow-sm border border-gray-100 flex-shrink-0 mt-0.5">{source.type === 'TEXT' ? '✍️' : '📄'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="font-bold text-sm text-gray-900 truncate" title={source.name}>{source.name}</p>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider border border-indigo-100 flex-shrink-0">
                          {source.category === 'POLICIES' ? 'Políticas' : source.category === 'PRODUCTS' ? 'Productos' : source.category === 'QUICK_REPLIES' ? 'Resp. Rápidas' : 'General'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{new Date(source.createdAt).toLocaleDateString()} &middot; <span className="font-medium text-gray-700">{source._count?.chunks || 0} fragmentos</span></p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 w-full lg:w-auto justify-start lg:justify-end ml-12 lg:ml-0">
                    <button onClick={() => auditSource(source)} className="text-indigo-600 bg-white border border-indigo-100 shadow-sm text-xs font-bold hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-all hover:scale-105">Auditar</button>
                    {source.type === 'TEXT' && (
                      <button onClick={() => editSource(source)} className="text-blue-600 bg-white border border-blue-100 shadow-sm text-xs font-bold hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all hover:scale-105">Editar</button>
                    )}
                    <button onClick={() => deleteSource(source.id)} className="text-red-500 bg-white border border-red-100 shadow-sm text-xs font-bold hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all hover:scale-105">Eliminar</button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
        
        {/* Modal de Auditoría */}
        <Dialog open={!!auditingSource} onOpenChange={(open) => !open && setAuditingSource(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
            <DialogHeader className="p-4 border-b border-border bg-muted/50">
              <DialogTitle>Auditoría de Conocimiento</DialogTitle>
              <DialogDescription className="font-mono mt-1">
                {auditingSource?.name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto p-6 bg-muted/30">
              {isFetchingChunks ? (
                <div className="flex flex-col items-center justify-center h-48">
                  <span className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></span>
                  <p className="text-sm text-muted-foreground">Recuperando fragmentos de memoria...</p>
                </div>
              ) : auditChunks.length === 0 ? (
                <div className="text-center text-muted-foreground py-10">Aún no hemos terminado de procesar este documento. Vuelve a intentarlo en unos instantes.</div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-primary/10 text-primary text-xs p-3 rounded-lg border border-primary/20 mb-6">
                    La IA ha troceado este documento en <strong>{auditChunks.length} fragmentos (chunks)</strong>. Así es exactamente como la IA "lee" y busca la información en tu base de datos antes de responder a un cliente.
                  </div>
                  {auditChunks.map((chunk, index) => (
                    <div key={chunk.id} className="bg-background border border-border rounded-xl p-4 shadow-sm relative group transition-all hover:border-indigo-200 hover:shadow-md">
                      <span className="absolute -top-2.5 -left-2.5 bg-foreground text-background text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-background shadow-sm">#{index + 1}</span>
                      
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                        <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-1 rounded-md">
                          {chunk.content.length} chars (~{Math.ceil(chunk.content.length / 4)} tokens)
                        </span>
                        <button 
                          onClick={() => copyChunkToClipboard(chunk.id, chunk.content)}
                          className="p-1.5 bg-white border border-gray-200 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors shadow-sm"
                          title="Copiar texto del fragmento"
                        >
                          {copiedChunkId === chunk.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed font-mono mt-2 pr-12">{chunk.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

      </div>

      {/* Columna Derecha: Simulador Sandbox */}
      <div className="w-[450px] flex-shrink-0 flex flex-col bg-white">
        
        {/* Cabecera Simulador */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <div>
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span> Simulador en Vivo
            </h2>
            <p className="text-[10px] text-gray-500 font-mono mt-1">Conectado a OpenAI real</p>
          </div>
          <button 
            onClick={clearSimulation}
            className="text-xs font-semibold text-gray-500 hover:text-red-600 transition-colors px-2 py-1 bg-white border border-gray-200 rounded shadow-sm"
          >
            Limpiar Chat
          </button>
        </div>

        {/* Panel Inspector (DevTools) */}
        {lastMetadata && (
          <div className="bg-gray-900 text-green-400 p-3 font-mono text-[10px] grid grid-cols-2 gap-2 border-b-4 border-indigo-500">
            <div><span className="text-gray-400">Modelo:</span> {lastMetadata.model}</div>
            <div><span className="text-gray-400">Latencia:</span> {lastMetadata.latencyMs}ms</div>
            <div><span className="text-gray-400">Tokens:</span> {lastMetadata.tokensUsed} (P:{lastMetadata.promptTokens} C:{lastMetadata.completionTokens})</div>
            <div><span className="text-gray-400">Coste:</span> ~${lastMetadata.estimatedCost?.toFixed(6)}</div>
            <div className="col-span-2"><span className="text-gray-400">Fuentes inyectadas:</span> {lastMetadata.contextUsed} fragmentos</div>
          </div>
        )}

        {/* Chat Area */}
        <div ref={chatScrollRef} className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50">
          <AnimatePresence>
            {simMessages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 space-y-3">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-2xl">🤖</div>
                <p className="text-sm">¡Pon a prueba a tu IA! Escríbele como si fueras un cliente para ver qué te responde.</p>
              </div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {simMessages.map((msg, idx) => (
              <motion.div 
                key={idx} 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`
                  ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white text-gray-900 border border-gray-200 shadow-sm rounded-tl-sm'}
                  rounded-2xl px-4 py-2.5 max-w-[85%] text-sm
                `}>
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap leading-relaxed break-words">{msg.content}</p>
                  ) : (
                    <div className="prose prose-sm leading-relaxed max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:my-2 prose-strong:text-gray-900 text-gray-800 break-words">
                      {msg.content ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      ) : (
                        <span className="flex items-center gap-1 h-5"><span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span><span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span><span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span></span>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <form onSubmit={handleSimulateMessage} className="flex gap-2">
            <input 
              type="text" 
              value={simMessage}
              onChange={e => setSimMessage(e.target.value)}
              placeholder="Habla con tu bot..."
              className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
            <button 
              type="submit"
              disabled={isSimulating || !simMessage.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white p-2.5 rounded-xl transition-colors shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
