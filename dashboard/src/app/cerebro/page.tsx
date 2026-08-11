"use client";

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  FileText, UploadCloud, Plus, Edit2, Trash2, CheckCircle2, AlertCircle, Sparkles, Send, Copy, Check, Eye, HelpCircle, Layers, ArrowRight, ShieldCheck
} from 'lucide-react';
import { analytics } from '@/lib/analytics';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [showSimulatorModal, setShowSimulatorModal] = useState(false);
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
        const countMsg = data.result?.chunksProcessed 
          ? `${data.result.chunksProcessed} fragmentos de "${file.name}"` 
          : `el archivo "${file.name}"`;
        setStatus(`✅ ¡Listo! La IA ha memorizado ${countMsg}.`);
        fetchSources();
      } else {
        setStatus(`⚠️ ${data.error || 'No hemos podido leer este archivo. Asegúrate de que es un documento válido.'}`);
      }
    } catch (err: any) {
      setStatus(`⚠️ ${err.message || 'La subida se ha interrumpido. Comprueba tu conexión y vuelve a intentarlo.'}`);
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
      } else {
        setStatus(`⚠️ ${data.error || 'No hemos podido guardar los cambios. Revisa la información.'}`);
      }
    } catch (err: any) {
      setStatus(`⚠️ ${err.message || 'No hemos podido guardar el texto. Revisa tu conexión.'}`);
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

  const handleSimulate = async () => {
    if (!simMessage.trim() || isSimulating) return;
    const userMsg = simMessage;
    setSimMessage('');
    setSimMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsSimulating(true);

    try {
      const res = await fetch('/api/knowledge/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, commerceId: 'commerce-seed-id' })
      });
      const data = await res.json();
      if (data.success) {
        setSimMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 pb-16">
      <div className="max-w-6xl mx-auto py-8 px-6 space-y-6">
        
        {/* HEADER PRINCIPAL */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Conocimiento</h1>
            <p className="text-xs text-slate-500 mt-0.5">Añade información para que tu asistente pueda responder mejor a tus clientes</p>
          </div>
          
          <button 
            onClick={() => setShowSimulatorModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Sparkles className="w-4 h-4" />
            Probar asistente en vivo
          </button>
        </div>

        {/* ALERTA DE ESTADO */}
        {status && (
          <div className="p-4 rounded-xl border text-xs font-semibold flex items-center justify-between bg-white border-slate-200 shadow-xs">
            <span>{status}</span>
            <button onClick={() => setStatus(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* 4 BLOQUES COMERCIALES PRINCIPALES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* BLOQUE 1: Información de tu negocio */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span className="p-1 rounded-md bg-blue-50 text-blue-600">🏢</span>
                  Información de tu negocio
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Configurado
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Horarios, dirección, política de devoluciones y preguntas frecuentes.
              </p>
            </div>
            <button 
              onClick={() => { setActiveTab('text'); setThreadCategory('GENERAL'); }}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 self-start cursor-pointer"
            >
              Añadir información <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* BLOQUE 2: Productos y Servicios */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span className="p-1 rounded-md bg-emerald-50 text-emerald-600">🛍️</span>
                  Productos y servicios
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Actualizado
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Permite al asistente consultar tu catálogo y hacer recomendaciones.
              </p>
            </div>
            <a 
              href="/ajustes?tab=tienda"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 self-start"
            >
              Gestionar productos <ArrowRight className="w-3 h-3" />
            </a>
          </div>

          {/* BLOQUE 3: Documentos (PDFs) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span className="p-1 rounded-md bg-indigo-50 text-indigo-600">📄</span>
                  Documentos (PDFs, Word, Excel)
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  {sources.filter(s => s.type === 'DOCUMENT').length} guardados
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Sube catálogos en PDF, manuales de uso o guías de precios.
              </p>
            </div>
            <button 
              onClick={() => setActiveTab('upload')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 self-start cursor-pointer"
            >
              Subir documento <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* BLOQUE 4: Instrucciones del asistente */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span className="p-1 rounded-md bg-violet-50 text-violet-600">⚙️</span>
                  Instrucciones del asistente
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200">
                  Personalizado
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Define el tono de voz, saludo inicial y pautas de comportamiento.
              </p>
            </div>
            <a 
              href="/ajustes?tab=general"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 self-start"
            >
              Ajustar tono e instrucciones <ArrowRight className="w-3 h-3" />
            </a>
          </div>

        </div>

        {/* EDITOR Y SUBIDA DE CONOCIMIENTO */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
          
          {/* TABS DE ENTRADA DE DATOS */}
          <div className="flex border-b border-slate-200 gap-4">
            <button 
              onClick={() => { setActiveTab('upload'); setEditingSourceId(null); }}
              className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'upload' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              Subir documento (PDF, Word, Excel, TXT)
            </button>
            <button 
              onClick={() => setActiveTab('text')}
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

              <div className="flex gap-2 justify-end">
                {editingSourceId && (
                  <button 
                    onClick={() => { setEditingSourceId(null); setThreadTitle(''); setThreadContent(''); setThreadCategory('GENERAL'); }}
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

        {/* LISTADO DE FUENTES DE CONOCIMIENTO */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Conocimiento memorizado ({sources.length})</h3>
            <span className="text-xs text-slate-500">Haz clic en un documento para editarlo o auditar su contenido</span>
          </div>

          {sources.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 border border-slate-100 rounded-lg p-6 space-y-2">
              <Layers className="w-8 h-8 text-slate-300 mx-auto mb-1" />
              <p className="text-xs font-bold text-slate-800">Todavía no has añadido información</p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Utiliza las pestañas superiores para subir un documento PDF o escribir información básica de tu empresa.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sources.map((source) => (
                <div 
                  key={source.id} 
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex justify-between items-start space-x-3"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{source.type === 'DOCUMENT' ? '📄' : '📝'}</span>
                      <h4 className="text-xs font-bold text-slate-900 truncate">{source.name}</h4>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2">
                      {source.content}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                        {source.category || 'GENERAL'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {source._count?.chunks || 1} fragmentos
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button 
                      onClick={() => auditSource(source)}
                      title="Auditar fragmentos memorizados"
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {source.type === 'TEXT' && (
                      <button 
                        onClick={() => editSource(source)}
                        title="Editar hilo"
                        className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => deleteSource(source.id)}
                      title="Eliminar de la memoria"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* MODAL SIMULADOR EN VIVO */}
      <Dialog open={showSimulatorModal} onOpenChange={setShowSimulatorModal}>
        <DialogContent className="bg-white border border-slate-200 rounded-xl p-6 shadow-lg max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Simulador del Asistente
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Prueba preguntas de tus clientes para comprobar exactamente cómo responde la IA con el conocimiento cargado.
            </DialogDescription>
          </DialogHeader>

          <div className="my-3 h-[280px] bg-slate-50 border border-slate-200 rounded-xl p-4 overflow-y-auto space-y-3" ref={chatScrollRef}>
            {simMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400 space-y-1">
                <HelpCircle className="w-8 h-8 text-slate-300" />
                <p className="text-xs font-semibold text-slate-700">Escribe una pregunta para probar a la IA</p>
                <p className="text-[11px] text-slate-500">Ej: "¿Cuáles son vuestros horarios?" o "¿Aceptáis devoluciones?"</p>
              </div>
            ) : simMessages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs shadow-xs ${
                  msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-xs' : 'bg-white border border-slate-200 text-slate-900 rounded-tl-xs'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input 
              type="text"
              value={simMessage}
              onChange={(e) => setSimMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSimulate()}
              placeholder="Haz una pregunta a tu asistente..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-600"
            />
            <button 
              onClick={handleSimulate}
              disabled={!simMessage.trim() || isSimulating}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              Probar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE AUDITORÍA DE FRAGMENTOS */}
      <Dialog open={!!auditingSource} onOpenChange={() => setAuditingSource(null)}>
        <DialogContent className="bg-white border border-slate-200 rounded-xl p-6 shadow-lg max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              Fragmentos memorizados
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Visualiza los bloques exactos en los que la IA dividió "{auditingSource?.name}" para realizar la búsqueda vectorial.
            </DialogDescription>
          </DialogHeader>

          <div className="my-3 max-h-[300px] overflow-y-auto space-y-2">
            {isFetchingChunks ? (
              <div className="p-8 text-center text-xs text-slate-500">Cargando fragmentos...</div>
            ) : auditChunks.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No hay fragmentos procesados aún.</div>
            ) : auditChunks.map((chunk, idx) => (
              <div key={chunk.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <span>Fragmento #{idx + 1}</span>
                  <button 
                    onClick={() => copyChunkToClipboard(chunk.id, chunk.content)}
                    className="text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-1 font-semibold"
                  >
                    {copiedChunkId === chunk.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    {copiedChunkId === chunk.id ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                <p className="text-slate-800 leading-relaxed font-mono text-[11px]">{chunk.content}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
