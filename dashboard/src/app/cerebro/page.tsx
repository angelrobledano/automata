"use client";

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  FileText, UploadCloud, Plus, Edit2, Trash2, CheckCircle2, AlertCircle, Sparkles, Send, Copy, Check, Eye, HelpCircle, Layers, ArrowRight, ShieldCheck, Loader2, RefreshCw, Bot
} from 'lucide-react';
import { analytics } from '@/lib/analytics';
import { motion, AnimatePresence } from 'framer-motion';

export default function CerebroPage() {
  const [activeTab, setActiveTab] = useState<'upload' | 'text'>('upload');
  
  // File upload state
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('GENERAL');
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  
  // Text thread state
  const [threadTitle, setThreadTitle] = useState('');
  const [threadContent, setThreadContent] = useState('');
  const [threadCategory, setThreadCategory] = useState('GENERAL');
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [isSavingText, setIsSavingText] = useState(false);
  const [textStatus, setTextStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  
  const [sources, setSources] = useState<any[]>([]);

  // Audit Modal state
  const [auditingSource, setAuditingSource] = useState<any>(null);
  const [auditChunks, setAuditChunks] = useState<any[]>([]);
  const [isFetchingChunks, setIsFetchingChunks] = useState(false);
  const [copiedChunkId, setCopiedChunkId] = useState<string | null>(null);

  // Simulator state (persistent right panel)
  const [simMessage, setSimMessage] = useState('');
  const [simMessages, setSimMessages] = useState<any[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [lastMetadata, setLastMetadata] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSources();
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [simMessages, isSimulating]);

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
    setUploadStatus({ type: 'info', message: 'Subiendo y extrayendo texto del documento...' });
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', uploadCategory);
    
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        const countMsg = data.result?.chunksProcessed 
          ? `${data.result.chunksProcessed} fragmentos de "${file.name}"` 
          : `el archivo "${file.name}"`;
        setUploadStatus({ type: 'success', message: `¡Listo! La IA ha memorizado ${countMsg}.` });
        fetchSources();
      } else {
        setUploadStatus({ type: 'error', message: data.error || 'No hemos podido leer este archivo. Asegúrate de que es un documento válido.' });
      }
    } catch (err: any) {
      setUploadStatus({ type: 'error', message: err.message || 'La subida se ha interrumpido. Comprueba tu conexión y vuelve a intentarlo.' });
    } finally {
      setIsUploading(false);
    }
  };

  const saveTextThread = async () => {
    if (!threadTitle || !threadContent) {
      setTextStatus({ type: 'error', message: 'Añade un título y contenido para que la IA pueda aprenderlo.' });
      return;
    }
    setIsSavingText(true);
    setTextStatus({ type: 'info', message: 'Guardando este conocimiento...' });
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
        setTextStatus({ type: 'success', message: `Conocimiento ${editingSourceId ? 'actualizado' : 'guardado'} correctamente.` });
        setThreadTitle('');
        setThreadContent('');
        setThreadCategory('GENERAL');
        setEditingSourceId(null);
        fetchSources();
      } else {
        setTextStatus({ type: 'error', message: data.error || 'No hemos podido guardar los cambios. Revisa la información.' });
      }
    } catch (err: any) {
      setTextStatus({ type: 'error', message: err.message || 'No hemos podido guardar el texto. Revisa tu conexión.' });
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
    setTextStatus(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteSource = async (sourceId: string) => {
    if (!window.confirm('¿Seguro que quieres eliminar este conocimiento? La IA dejará de recordarlo.')) return;
    
    try {
      const res = await fetch(`/api/knowledge/${sourceId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchSources();
      }
    } catch (e) {
      console.error(e);
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

  const handleSimulate = async (customPrompt?: string) => {
    const promptToSend = customPrompt || simMessage;
    if (!promptToSend.trim() || isSimulating) return;
    
    if (!customPrompt) setSimMessage('');
    setSimMessages(prev => [...prev, { role: 'user', content: promptToSend }]);
    setIsSimulating(true);

    try {
      const res = await fetch('/api/knowledge/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: promptToSend, commerceId: 'commerce-seed-id' })
      });
      const data = await res.json();
      if (data.success) {
        setSimMessages(prev => [...prev, { role: 'assistant', content: data.reply, metadata: data.metadata }]);
        if (data.metadata) setLastMetadata(data.metadata);
      } else {
        setSimMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Error: ${data.error}` }]);
      }
    } catch (e) {
      setSimMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Error al comunicarse con la IA.' }]);
    } finally {
      setIsSimulating(false);
    }
  };

  const clearChatHistory = async () => {
    setSimMessages([]);
    setLastMetadata(null);
    try {
      await fetch('/api/knowledge/simulate', { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 pb-16">
      <div className="max-w-7xl mx-auto py-8 px-6 space-y-6">
        
        {/* HEADER PRINCIPAL */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Conocimiento</h1>
          <p className="text-xs text-slate-500 mt-0.5">Añade información de tu negocio y comprueba en tiempo real cómo responderá tu asistente IA</p>
        </div>

        {/* ESTRUCTURA DE 2 COLUMNAS (IZQUIERDA: GESTIÓN DE CONOCIMIENTO | DERECHA: PROBADOR EN VIVO DESPLEGADO) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* COLUMNA IZQUIERDA: EDITOR Y SUBIDA (SPAN 7) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* EDITOR Y SUBIDA DE CONOCIMIENTO */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
              
              {/* TABS DE ENTRADA DE DATOS */}
              <div className="flex border-b border-slate-200 gap-4">
                <button 
                  onClick={() => { setActiveTab('upload'); setEditingSourceId(null); setUploadStatus(null); }}
                  className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                    activeTab === 'upload' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <UploadCloud className="w-4 h-4" />
                  Subir documento (PDF, Word, Excel, TXT)
                </button>
                <button 
                  onClick={() => { setActiveTab('text'); setTextStatus(null); }}
                  className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                    activeTab === 'text' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  {editingSourceId ? 'Editar información' : 'Escribir texto libre o política'}
                </button>
              </div>

              {/* TAB 1: SUBIDA DE DOCUMENTOS */}
              {activeTab === 'upload' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <label className="text-xs font-semibold text-slate-700">Categoría:</label>
                    <select 
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-xs font-semibold rounded-lg px-3 py-1.5 text-slate-900 outline-none"
                    >
                      <option value="GENERAL">General / Negocio</option>
                      <option value="POLICIES">Políticas / Devoluciones</option>
                      <option value="PRODUCTS">Productos / Precios</option>
                      <option value="FAQS">Preguntas frecuentes</option>
                    </select>
                  </div>

                  {/* ZONA DE ARRASTRAR / SELECCIONAR ARCHIVO CON FEEDBACK LOCAL Y ELEGANTE */}
                  <div 
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                      isDragging ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                    }`}
                  >
                    <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                    <p className="text-xs font-bold text-slate-900 mb-1">Arrastra aquí tu documento o selecciónalo de tu ordenador</p>
                    <p className="text-[11px] text-slate-500 mb-4">Soporta PDF, Word (.docx), Excel (.xlsx) o Texto plano (.txt)</p>
                    
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-xs">
                      <span>Seleccionar archivo</span>
                      <input type="file" onChange={handleFileSelect} accept=".pdf,.docx,.xlsx,.txt,.csv" className="hidden" />
                    </label>

                    {/* PROCESANDO / CARGANDO */}
                    {isUploading && (
                      <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        <span>Subiendo y extrayendo texto del documento...</span>
                      </div>
                    )}

                    {/* MENSAJE DE ESTADO UBICADO EXACTAMENTE EN LA ZONA DE SUBIDA (UX BEST PRACTICE) */}
                    {uploadStatus && !isUploading && (
                      <div className={`mt-4 max-w-lg mx-auto p-3 rounded-lg border text-xs font-semibold flex items-center justify-between transition-all ${
                        uploadStatus.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
                        uploadStatus.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-900' :
                        'bg-blue-50 border-blue-200 text-blue-900'
                      }`}>
                        <div className="flex items-center gap-2">
                          {uploadStatus.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                          {uploadStatus.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                          <span>{uploadStatus.message}</span>
                        </div>
                        <button onClick={() => setUploadStatus(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer ml-3">
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: TEXTO LIBRE O POLÍTICA */}
              {activeTab === 'text' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Título de la información</label>
                      <input 
                        type="text"
                        value={threadTitle}
                        onChange={(e) => setThreadTitle(e.target.value)}
                        placeholder="Ej: Horarios de atención y Festivos"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Categoría</label>
                      <select 
                        value={threadCategory}
                        onChange={(e) => setThreadCategory(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold rounded-lg px-3 py-2 text-slate-900 outline-none"
                      >
                        <option value="GENERAL">General / Negocio</option>
                        <option value="POLICIES">Políticas / Devoluciones</option>
                        <option value="PRODUCTS">Productos / Precios</option>
                        <option value="FAQS">Preguntas frecuentes</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Contenido explicativo</label>
                    <textarea 
                      value={threadContent}
                      onChange={(e) => setThreadContent(e.target.value)}
                      placeholder="Escribe la información detallada para que el asistente pueda memorizarla..."
                      rows={5}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-600 resize-y"
                    />
                  </div>

                  {/* MENSAJE DE ESTADO DEL EDITOR DE TEXTO (UX BEST PRACTICE) */}
                  {textStatus && (
                    <div className={`p-3 rounded-lg border text-xs font-semibold flex items-center justify-between transition-all ${
                      textStatus.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
                      textStatus.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-900' :
                      'bg-blue-50 border-blue-200 text-blue-900'
                    }`}>
                      <div className="flex items-center gap-2">
                        {textStatus.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                        {textStatus.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                        <span>{textStatus.message}</span>
                      </div>
                      <button onClick={() => setTextStatus(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer ml-3">
                        ✕
                      </button>
                    </div>
                  )}

                  <div className="flex gap-2 justify-end">
                    {editingSourceId && (
                      <button 
                        onClick={() => { setEditingSourceId(null); setThreadTitle(''); setThreadContent(''); setThreadCategory('GENERAL'); setTextStatus(null); }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        Cancelar edición
                      </button>
                    )}
                    <button 
                      onClick={saveTextThread}
                      disabled={isSavingText}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                    >
                      {isSavingText ? 'Guardando...' : editingSourceId ? 'Actualizar conocimiento' : 'Guardar en memoria de IA'}
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* LISTA DE FUENTES DE CONOCIMIENTO MEMORIZADO */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">Conocimiento memorizado ({sources.length})</h2>
                <span className="text-xs text-slate-500">Haz clic en un documento para auditar su contenido</span>
              </div>

              {sources.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
                  Todavía no has añadido fuentes de conocimiento. Sube tu primer PDF o escribe información de tu negocio arriba.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {sources.map((source) => (
                    <div 
                      key={source.id}
                      className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between space-y-3 hover:border-slate-300 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 truncate max-w-[280px]">
                            {source.type === 'FILE' ? '📄' : '📝'} {source.name}
                          </span>
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => auditSource(source)}
                              title="Auditar fragmentos procesados"
                              className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer rounded-md hover:bg-slate-100"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {source.type === 'TEXT' && (
                              <button 
                                onClick={() => editSource(source)}
                                title="Editar texto"
                                className="p-1 text-slate-400 hover:text-blue-600 cursor-pointer rounded-md hover:bg-slate-100"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button 
                              onClick={() => deleteSource(source.id)}
                              title="Eliminar de memoria de IA"
                              className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer rounded-md hover:bg-slate-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2">
                          {source.content.substring(0, 140)}...
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                        <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                          {source.category || 'GENERAL'}
                        </span>
                        <span>{source.chunks?.length || 0} fragmentos indexados</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* COLUMNA DERECHA: PROBADOR EN VIVO DESPLEGADO CONTINUAMENTE (SPAN 5) - EFECTO WOW */}
          <div className="lg:col-span-5 sticky top-6">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-6.5rem)] min-h-[580px]">
              
              {/* HEADER DEL PROBADOR EN VIVO */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="relative flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping absolute"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 relative"></div>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold flex items-center gap-1.5 text-white">
                      <span>Probador de Asistente IA</span>
                      <span className="text-[9px] bg-blue-500/30 text-blue-300 font-semibold px-1.5 py-0.5 rounded-full border border-blue-400/30">En vivo</span>
                    </h3>
                    <p className="text-[10px] text-slate-400">Comprueba al instante cómo responderá con los datos guardados</p>
                  </div>
                </div>

                <button 
                  onClick={clearChatHistory}
                  title="Reiniciar conversación de prueba"
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* CUERPO DE CHAT STREAM */}
              <div className="p-4 flex-1 overflow-y-auto space-y-3 bg-[#F8FAFC]">
                {simMessages.length === 0 && (
                  <div className="py-8 text-center text-xs space-y-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Prueba el conocimiento en tiempo real</p>
                      <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-1">Haz cualquier pregunta como si fueras un cliente para comprobar las respuestas de la IA.</p>
                    </div>

                    <div className="pt-2 space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Preguntas de sugerencia:</p>
                      <div className="flex flex-col gap-1.5">
                        <button 
                          onClick={() => handleSimulate("¿Cuál es vuestro horario de apertura?")}
                          className="text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 rounded-lg p-2 text-left transition-all shadow-2xs cursor-pointer"
                        >
                          💬 ¿Cuál es vuestro horario de apertura?
                        </button>
                        <button 
                          onClick={() => handleSimulate("¿Abrís por la tarde en verano?")}
                          className="text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 rounded-lg p-2 text-left transition-all shadow-2xs cursor-pointer"
                        >
                          ☀️ ¿Abrís por la tarde en verano?
                        </button>
                        <button 
                          onClick={() => handleSimulate("¿Tenéis información de devoluciones?")}
                          className="text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 rounded-lg p-2 text-left transition-all shadow-2xs cursor-pointer"
                        >
                          📦 ¿Tenéis información de devoluciones?
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {simMessages.map((msg, idx) => (
                  <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-br-none shadow-xs font-medium' 
                        : 'bg-white border border-slate-200 text-slate-900 rounded-bl-none shadow-xs space-y-1.5'
                    }`}>
                      <p>{msg.content}</p>

                      {/* BADGE DE INFORMACIÓN DE REGLA APLICADA */}
                      {msg.metadata && msg.role === 'assistant' && (
                        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400">
                          <span className="font-semibold text-emerald-600 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Regla: {msg.metadata.activeRule || 'Conocimiento memorizado'}
                          </span>
                          <span>{msg.metadata.latencyMs}ms</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isSimulating && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 text-slate-600 rounded-2xl rounded-bl-none px-4 py-2.5 text-xs flex items-center gap-2 shadow-xs">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      <span>Consultando datos y evaluando vigencia...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* BARRA DE ENTRADA DEL PROBADOR */}
              <div className="p-3 bg-white border-t border-slate-200 flex gap-2 shrink-0">
                <input 
                  type="text" 
                  value={simMessage}
                  onChange={(e) => setSimMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSimulate()}
                  placeholder="Pregunta a la IA para probar..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button 
                  onClick={() => handleSimulate()}
                  disabled={isSimulating || !simMessage.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar</span>
                </button>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* MODAL DE AUDITORÍA DE FRAGMENTOS */}
      {auditingSource && (
        <Dialog open={!!auditingSource} onOpenChange={() => setAuditingSource(null)}>
          <DialogContent className="max-w-2xl bg-white p-6 rounded-xl border border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                Auditar fragmentos memorizados: {auditingSource.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Así es exactamente como la Inteligencia Artificial procesa e indexa tu información para responder a tus clientes.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {isFetchingChunks ? (
                <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Cargando fragmentos indexados...</span>
                </div>
              ) : auditChunks.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  No se encontraron fragmentos procesados para este documento.
                </div>
              ) : (
                auditChunks.map((chunk, idx) => (
                  <div key={chunk.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                      <span>Fragmento #{idx + 1}</span>
                      <button 
                        onClick={() => copyChunkToClipboard(chunk.id, chunk.content)}
                        className="text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedChunkId === chunk.id ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-0.5"><Check className="w-3 h-3" /> Copiado</span>
                        ) : (
                          <span className="flex items-center gap-0.5"><Copy className="w-3 h-3" /> Copiar</span>
                        )}
                      </button>
                    </div>
                    <p className="text-slate-800 text-xs whitespace-pre-wrap">{chunk.content}</p>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
