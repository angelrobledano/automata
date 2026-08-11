"use client";

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  FileText, UploadCloud, Plus, Edit2, Trash2, CheckCircle2, AlertCircle, Sparkles, Send, Copy, Check, Eye, HelpCircle, Layers, ArrowRight, ShieldCheck, Loader2
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

  // Simulator state
  const [simMessage, setSimMessage] = useState('');
  const [simMessages, setSimMessages] = useState<any[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [lastMetadata, setLastMetadata] = useState<any>(null);
  const [showSimulatorModal, setShowSimulatorModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSources();
  }, []);

  useEffect(() => {
    if (showSimulatorModal && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
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

          {/* BLOQUE 2: Productos y servicios */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span className="p-1 rounded-md bg-emerald-50 text-emerald-600">📦</span>
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
            <button 
              onClick={() => { setActiveTab('text'); setThreadCategory('PRODUCTS'); }}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 self-start cursor-pointer"
            >
              Gestionar productos <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* BLOQUE 3: Documentos (PDF, Word, Excel) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span className="p-1 rounded-md bg-amber-50 text-amber-600">📄</span>
                  Documentos (PDFs, Word, Excel)
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  {sources.filter(s => s.type === 'FILE').length} guardados
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

        {/* LISTA DE FUENTES DE CONOCIMIENTO */}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sources.map((source) => (
                <div 
                  key={source.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between space-y-3 hover:border-slate-300 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 truncate max-w-[220px]">
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
                    <span>{source.chunks?.length || 0} fragmentos</span>
                  </div>
                </div>
              ))}
            </div>
          )}
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

      {/* MODAL SIMULADOR EN VIVO */}
      {showSimulatorModal && (
        <Dialog open={showSimulatorModal} onOpenChange={setShowSimulatorModal}>
          <DialogContent className="max-w-xl bg-white p-0 rounded-2xl border border-slate-200 overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
                <div>
                  <h3 className="text-xs font-bold">Simulador de Asistente en Vivo</h3>
                  <p className="text-[10px] text-slate-400">Prueba cómo responderá tu bot a preguntas reales de tus clientes</p>
                </div>
              </div>
              <button onClick={() => setShowSimulatorModal(false)} className="text-slate-400 hover:text-white text-xs cursor-pointer">✕</button>
            </div>

            <div className="p-4 h-[350px] overflow-y-auto space-y-3 bg-[#F8FAFC]">
              {simMessages.length === 0 && (
                <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                  <Sparkles className="w-8 h-8 mx-auto text-blue-500 opacity-60" />
                  <p className="font-semibold text-slate-700">Haz una pregunta para probar el conocimiento</p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">Ejemplo: "¿Cuál es el horario de atención?", "¿Tenéis devoluciones?"</p>
                </div>
              )}

              {simMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-br-none shadow-xs' 
                      : 'bg-white border border-slate-200 text-slate-900 rounded-bl-none shadow-xs'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}

              {isSimulating && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 text-slate-500 rounded-2xl rounded-bl-none px-4 py-2.5 text-xs flex items-center gap-2 shadow-xs">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    <span>La IA está consultando tu conocimiento...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 bg-white border-t border-slate-200 flex gap-2">
              <input 
                type="text" 
                value={simMessage}
                onChange={(e) => setSimMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSimulate()}
                placeholder="Escribe una pregunta para probar la IA..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button 
                onClick={handleSimulate}
                disabled={isSimulating || !simMessage.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar</span>
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
