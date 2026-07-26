import React, { useState, useEffect } from 'react';
import { ref, push, set, update } from 'firebase/database';
import { rtdb } from '../../../config/firebase';

export default function CreateWorkModal({ type, classroom, topics, currentUser, existingWork, onClose, addNotification }) {
    const isEditMode = !!existingWork;
    const isTask = type === 'tarea';

    // State
    const [title, setTitle] = useState(existingWork?.title || '');
    const [description, setDescription] = useState(existingWork?.description || '');
    const [topicId, setTopicId] = useState(existingWork?.topicId || '');
    const [dueDate, setDueDate] = useState(existingWork?.dueDate || '');
    const [points, setPoints] = useState(existingWork?.points || '100');
    const [attachments, setAttachments] = useState(existingWork?.attachments || []);
    const [loading, setLoading] = useState(false);
    
    // Modal States
    const [linkModalConfig, setLinkModalConfig] = useState(null); // { type: 'drive' | 'youtube' | 'upload' | 'link' } | null
    const [docModalOpen, setDocModalOpen] = useState(false);
    
    // Link Modal Form State
    const [linkUrl, setLinkUrl] = useState('');
    const [linkTitle, setLinkTitle] = useState('');
    
    // Document Modal Form State
    const [docTitle, setDocTitle] = useState('');
    const [docContent, setDocContent] = useState('');

    const handleSubmit = async (e) => {
        e?.preventDefault();
        if (!title.trim()) return;

        setLoading(true);
        try {
            const payload = {
                type: type,
                title: title.trim(),
                description: description.trim(),
                topicId: topicId || null,
                points: points,
                attachments: attachments,
                authorId: currentUser.uid || currentUser.dni,
                authorName: currentUser.nombre || currentUser.name
            };
            
            if (isTask && dueDate) {
                payload.dueDate = dueDate;
            } else if (isTask) {
                payload.dueDate = null;
            }

            if (isEditMode) {
                payload.updatedAt = Date.now();
                await update(ref(rtdb, `campus_trabajos/${classroom.id}/${existingWork.id}`), payload);
                addNotification(`${isTask ? 'Tarea' : 'Material'} actualizado con éxito`, 'success');
            } else {
                payload.timestamp = Date.now();
                const workRef = push(ref(rtdb, `campus_trabajos/${classroom.id}`));
                await set(workRef, payload);
                addNotification(`${isTask ? 'Tarea' : 'Material'} creado con éxito`, 'success');
            }
            onClose();
        } catch (error) {
            console.error("Error saving work:", error);
            addNotification('Error al guardar', 'error');
            setLoading(false);
        }
    };

    const handleAddLink = () => {
        if (!linkUrl.trim()) return;
        setAttachments([...attachments, {
            id: Date.now().toString(),
            type: linkModalConfig.type,
            url: linkUrl.trim(),
            title: linkTitle.trim() || 'Enlace adjunto'
        }]);
        setLinkModalConfig(null);
        setLinkUrl('');
        setLinkTitle('');
    };



    const handleAddDocument = () => {
        if (!docContent.trim()) return;
        setAttachments([...attachments, {
            id: Date.now().toString(),
            type: 'document',
            content: docContent,
            title: docTitle.trim() || 'Documento sin título'
        }]);
        setDocModalOpen(false);
        setDocTitle('');
        setDocContent('');
    };

    const handleRemoveAttachment = (idToRemove) => {
        setAttachments(attachments.filter(a => a.id !== idToRemove));
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-stone-50 animate-fadeIn">
            {/* Top Navigation Bar */}
            <div className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-500 transition-colors">
                        <i className="fas fa-times text-xl"></i>
                    </button>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${isTask ? 'bg-indigo-600' : 'bg-stone-500'}`}>
                        <i className={`fas ${isTask ? 'fa-clipboard-list' : 'fa-book'} text-sm`}></i>
                    </div>
                    <span className="text-xl font-medium text-stone-700 hidden sm:block">
                        {isTask ? 'Tarea' : 'Material'}
                    </span>
                </div>
                
                <div className="flex items-center gap-4">
                    <span className="text-sm text-stone-500 hidden sm:block">Guardado automáticamente</span>
                    <button
                        onClick={handleSubmit}
                        disabled={!title.trim() || loading}
                        className={`px-6 py-2 text-sm font-bold rounded-md shadow-sm transition-colors flex items-center gap-2 ${
                            title.trim() && !loading ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                        }`}
                    >
                        {loading && <i className="fas fa-circle-notch fa-spin"></i>}
                        {isEditMode ? 'Guardar' : 'Asignar'}
                    </button>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-[1200px] mx-auto p-4 lg:p-8 flex flex-col lg:flex-row gap-8">
                    
                    {/* Left Column: Content */}
                    <div className="flex-1 space-y-6">
                        {/* Title & Instructions Block */}
                        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm">
                            <div className="space-y-6">
                                <div>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Título"
                                        className="w-full text-lg bg-stone-50 border-b-2 border-stone-300 focus:border-indigo-600 focus:bg-stone-100 p-4 outline-none transition-colors rounded-t-md"
                                        autoFocus
                                    />
                                </div>
                                
                                <div>
                                    <p className="text-sm text-stone-500 mb-2">Instrucciones (opcional)</p>
                                    <div className="border border-stone-300 rounded-md overflow-hidden focus-within:ring-1 focus-within:ring-indigo-600 focus-within:border-indigo-600">
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            className="w-full min-h-[150px] p-4 outline-none resize-y"
                                        ></textarea>
                                        
                                        {/* Fake Formatting Toolbar */}
                                        <div className="border-t border-stone-200 bg-stone-50 p-2 flex items-center gap-1">
                                            <button className="w-8 h-8 rounded hover:bg-stone-200 flex items-center justify-center text-stone-600"><i className="fas fa-bold"></i></button>
                                            <button className="w-8 h-8 rounded hover:bg-stone-200 flex items-center justify-center text-stone-600"><i className="fas fa-italic"></i></button>
                                            <button className="w-8 h-8 rounded hover:bg-stone-200 flex items-center justify-center text-stone-600"><i className="fas fa-underline"></i></button>
                                            <div className="w-px h-5 bg-stone-300 mx-1"></div>
                                            <button className="w-8 h-8 rounded hover:bg-stone-200 flex items-center justify-center text-stone-600"><i className="fas fa-list-ul"></i></button>
                                            <button className="w-8 h-8 rounded hover:bg-stone-200 flex items-center justify-center text-stone-600"><i className="fas fa-remove-format"></i></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Attachments Mockup Block */}
                        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm">
                            <h4 className="font-bold text-stone-800 mb-4">Adjuntar</h4>
                            <div className="flex flex-wrap gap-4">
                                <button type="button" onClick={() => setLinkModalConfig({ type: 'drive' })} className="w-20 h-20 border border-stone-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-stone-50 transition-colors text-stone-600">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" alt="Drive" className="w-8 h-8" />
                                    <span className="text-xs">Drive</span>
                                </button>
                                <button type="button" onClick={() => setLinkModalConfig({ type: 'youtube' })} className="w-20 h-20 border border-stone-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-stone-50 transition-colors text-stone-600">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg" alt="YouTube" className="w-8 h-8" />
                                    <span className="text-xs">YouTube</span>
                                </button>
                                <button type="button" onClick={() => setDocModalOpen(true)} className="w-20 h-20 border border-stone-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-stone-50 transition-colors text-stone-600">
                                    <i className="fas fa-plus text-2xl text-blue-500"></i>
                                    <span className="text-xs">Crear</span>
                                </button>
                                <button type="button" onClick={() => setLinkModalConfig({ type: 'link' })} className="w-20 h-20 border border-stone-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-stone-50 transition-colors text-stone-600">
                                    <i className="fas fa-link text-2xl text-stone-400"></i>
                                    <span className="text-xs">Vínculo</span>
                                </button>
                            </div>
                            
                            {/* Attachments List */}
                            {attachments.length > 0 && (
                                <div className="mt-6 space-y-3">
                                    {attachments.map(att => (
                                        <div key={att.id} className="flex items-center justify-between border border-stone-200 rounded-xl p-3 bg-stone-50">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                                                    {att.type === 'drive' && <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" alt="Drive" className="w-5 h-5" />}
                                                    {att.type === 'youtube' && <img src="https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg" alt="YouTube" className="w-5 h-5" />}
                                                    {att.type === 'link' && <i className="fas fa-link text-stone-400"></i>}
                                                    {att.type === 'upload' && <i className="fas fa-file text-stone-400"></i>}
                                                    {att.type === 'document' && <i className="fas fa-file-alt text-blue-500"></i>}
                                                </div>
                                                <div className="flex flex-col overflow-hidden">
                                                    <span className="font-bold text-sm text-stone-800 truncate">{att.title}</span>
                                                    {att.url && <span className="text-xs text-stone-500 truncate">{att.url}</span>}
                                                    {att.type === 'document' && <span className="text-xs text-stone-500 truncate">Documento interno</span>}
                                                </div>
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={() => handleRemoveAttachment(att.id)}
                                                className="w-8 h-8 rounded-full hover:bg-stone-200 flex items-center justify-center text-stone-500 transition-colors"
                                            >
                                                <i className="fas fa-times"></i>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Settings */}
                    <div className="w-full lg:w-80 space-y-6">
                        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden divide-y divide-stone-100">
                            
                            {/* Para */}
                            <div className="p-4">
                                <label className="block text-sm font-bold text-stone-700 mb-2">Para</label>
                                <div className="flex gap-2">
                                    <div className="flex-1 bg-stone-100 border border-stone-200 rounded-md p-2 text-sm text-stone-700 truncate cursor-not-allowed">
                                        {classroom.id}
                                    </div>
                                    <div className="flex-1 bg-stone-100 border border-stone-200 rounded-md p-2 text-sm text-stone-700 truncate cursor-not-allowed">
                                        Todos los estudiantes
                                    </div>
                                </div>
                            </div>
                            
                            {/* Puntos */}
                            {isTask && (
                                <div className="p-4">
                                    <label className="block text-sm font-bold text-stone-700 mb-2">Puntos</label>
                                    <select
                                        value={points}
                                        onChange={(e) => setPoints(e.target.value)}
                                        className="w-32 bg-stone-50 border border-stone-200 rounded-md p-2 text-sm focus:border-indigo-600 outline-none"
                                    >
                                        <option value="100">100</option>
                                        <option value="10">10</option>
                                        <option value="Sin calificar">Sin calificar</option>
                                    </select>
                                </div>
                            )}

                            {/* Fecha de entrega */}
                            {isTask && (
                                <div className="p-4">
                                    <label className="block text-sm font-bold text-stone-700 mb-2">Fecha límite</label>
                                    <input
                                        type="date"
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                        className="w-full bg-stone-50 border border-stone-200 rounded-md p-2 text-sm focus:border-indigo-600 outline-none"
                                    />
                                    {!dueDate && (
                                        <p className="text-xs text-stone-500 mt-1">Sin fecha límite</p>
                                    )}
                                </div>
                            )}

                            {/* Tema */}
                            <div className="p-4">
                                <label className="block text-sm font-bold text-stone-700 mb-2">Tema</label>
                                <select
                                    value={topicId}
                                    onChange={(e) => setTopicId(e.target.value)}
                                    className="w-full bg-stone-50 border border-stone-200 rounded-md p-2 text-sm focus:border-indigo-600 outline-none"
                                >
                                    <option value="">Sin tema</option>
                                    {topics.map(t => (
                                        <option key={t.id} value={t.id}>{t.title}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                    
                </div>
            </div>

            {/* Link Attachment Modal */}
            {linkModalConfig && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6">
                        <h3 className="text-xl font-bold text-stone-800 mb-4 flex items-center gap-2">
                            {linkModalConfig.type === 'drive' && <><img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" alt="Drive" className="w-6 h-6" /> Añadir enlace de Google Drive</>}
                            {linkModalConfig.type === 'youtube' && <><img src="https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg" alt="YouTube" className="w-6 h-6" /> Añadir video de YouTube</>}
                            {linkModalConfig.type === 'link' && <><i className="fas fa-link text-stone-500"></i> Añadir enlace</>}
                        </h3>
                        
                        <div className="space-y-4">

                            <div>
                                <label className="block text-sm font-bold text-stone-700 mb-1">URL / Enlace</label>
                                <input 
                                    type="text" 
                                    value={linkUrl}
                                    onChange={(e) => setLinkUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-stone-700 mb-1">Título (opcional)</label>
                                <input 
                                    type="text" 
                                    value={linkTitle}
                                    onChange={(e) => setLinkTitle(e.target.value)}
                                    placeholder="Ej: Material de lectura"
                                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-6">
                            <button onClick={() => setLinkModalConfig(null)} className="px-4 py-2 font-bold text-stone-500 hover:bg-stone-100 rounded-lg">Cancelar</button>
                            <button onClick={handleAddLink} disabled={!linkUrl.trim()} className={`px-4 py-2 font-bold text-white rounded-lg ${linkUrl.trim() ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-stone-300'}`}>Añadir</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Document Editor Modal (Wordpad) */}
            {docModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 lg:p-10 bg-stone-900/80 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl w-full max-w-4xl h-full shadow-2xl flex flex-col overflow-hidden">
                        <div className="border-b border-stone-200 p-4 flex items-center justify-between bg-stone-50 flex-shrink-0">
                            <div className="flex items-center gap-4 flex-1">
                                <button onClick={() => setDocModalOpen(false)} className="text-stone-500 hover:bg-stone-200 w-10 h-10 rounded-full flex items-center justify-center"><i className="fas fa-arrow-left"></i></button>
                                <input type="text" value={docTitle} onChange={e => setDocTitle(e.target.value)} placeholder="Documento sin título" className="text-xl font-bold bg-transparent border-b border-transparent focus:border-stone-300 outline-none w-full max-w-sm px-2 py-1 text-stone-700" autoFocus />
                            </div>
                            <button onClick={handleAddDocument} disabled={!docContent.trim()} className={`px-5 py-2 font-bold text-white rounded-lg shadow-sm ${docContent.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-stone-300'}`}>Guardar adjunto</button>
                        </div>
                        <div className="border-b border-stone-200 bg-stone-100 p-2 flex items-center justify-center gap-2 flex-shrink-0">
                            <button className="w-8 h-8 rounded hover:bg-stone-200 flex items-center justify-center text-stone-700"><i className="fas fa-bold"></i></button>
                            <button className="w-8 h-8 rounded hover:bg-stone-200 flex items-center justify-center text-stone-700"><i className="fas fa-italic"></i></button>
                            <button className="w-8 h-8 rounded hover:bg-stone-200 flex items-center justify-center text-stone-700"><i className="fas fa-underline"></i></button>
                            <div className="w-px h-5 bg-stone-300 mx-2"></div>
                            <button className="w-8 h-8 rounded hover:bg-stone-200 flex items-center justify-center text-stone-700"><i className="fas fa-align-left"></i></button>
                            <button className="w-8 h-8 rounded hover:bg-stone-200 flex items-center justify-center text-stone-700"><i className="fas fa-align-center"></i></button>
                            <button className="w-8 h-8 rounded hover:bg-stone-200 flex items-center justify-center text-stone-700"><i className="fas fa-align-right"></i></button>
                        </div>
                        <div className="flex-1 bg-stone-200 p-4 lg:p-8 overflow-y-auto">
                            <textarea 
                                value={docContent}
                                onChange={e => setDocContent(e.target.value)}
                                className="w-full max-w-[800px] mx-auto min-h-full bg-white shadow-md p-8 lg:p-12 outline-none resize-none text-stone-800 leading-relaxed font-serif"
                                placeholder="Escribe aquí el contenido del documento..."
                            ></textarea>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
