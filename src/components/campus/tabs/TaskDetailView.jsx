import React, { useState, useEffect } from 'react';
import { ref, onValue, set, update, push } from 'firebase/database';
import { rtdb } from '../../../config/firebase';

export default function TaskDetailView({ work, classroom, currentUser, onBack, addNotification }) {
    const isMaterial = work.type === 'material';
    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Student attachments
    const [myAttachments, setMyAttachments] = useState([]);
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    
    // Chat
    const [privateComments, setPrivateComments] = useState([]);
    const [newComment, setNewComment] = useState('');

    // Attachment Modals
    const [linkModalConfig, setLinkModalConfig] = useState(null);
    const [docModalOpen, setDocModalOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [linkTitle, setLinkTitle] = useState('');
    const [docTitle, setDocTitle] = useState('');
    const [docContent, setDocContent] = useState('');
    const [viewingDocument, setViewingDocument] = useState(null);

    const studentId = currentUser?.dni || currentUser?.uid || currentUser?.id || 'alumno_sin_id';
    const studentName = currentUser?.nombre || currentUser?.name || currentUser?.nombreCompleto || 'Alumno';

    useEffect(() => {
        // Load submission data
        if (isMaterial) {
            setLoading(false);
            return;
        }

        const subRef = ref(rtdb, `campus_entregas/${classroom.id}/${work.id}/${studentId}`);
        const unsubSub = onValue(subRef, (snap) => {
            if (snap.exists()) {
                const data = snap.val();
                setSubmission(data);
                setMyAttachments(data.attachments || []);
                
                // Parse chat
                if (data.chat) {
                    const msgs = Object.values(data.chat);
                    msgs.sort((a, b) => a.timestamp - b.timestamp);
                    setPrivateComments(msgs);
                } else {
                    setPrivateComments([]);
                }
            } else {
                setSubmission(null);
                setMyAttachments([]);
                setPrivateComments([]);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching submission:", error);
            setSubmission(null);
            setMyAttachments([]);
            setPrivateComments([]);
            setLoading(false);
        });

        return () => unsubSub();
    }, [classroom.id, work.id, studentId, isMaterial]);

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const [y, m, d] = dateString.split('-');
        return `${d}/${m}/${y}`;
    };

    const saveSubmissionToDB = async (attachmentsList, newStatus = null) => {
        try {
            const subRef = ref(rtdb, `campus_entregas/${classroom.id}/${work.id}/${studentId}`);
            const payload = {
                studentId,
                studentName,
                attachments: attachmentsList,
                updatedAt: Date.now()
            };
            if (newStatus) {
                payload.status = newStatus;
            } else if (submission?.status) {
                payload.status = submission.status;
            } else {
                payload.status = 'Asignada';
            }
            await update(subRef, payload);
        } catch (err) {
            console.error("Error al guardar entrega en base de datos:", err);
        }
    };

    const handleMarkCompleted = async () => {
        try {
            const isCompleted = submission?.status === 'Entregado';
            const newStatus = isCompleted ? 'Asignada' : 'Entregado';
            
            await saveSubmissionToDB(myAttachments, newStatus);
            addNotification(isCompleted ? 'Entrega anulada' : '✅ Tarea entregada con éxito al profesor', 'success');
        } catch (error) {
            console.error("Error updating submission:", error);
            addNotification('Error al procesar la entrega', 'error');
        }
    };

    const handleAddLink = async () => {
        if (!linkUrl.trim()) return;
        const newAtt = {
            id: Date.now().toString(),
            type: linkModalConfig.type,
            url: linkUrl.trim(),
            title: linkTitle.trim() || 'Enlace adjunto'
        };
        const updatedList = [...myAttachments, newAtt];
        setMyAttachments(updatedList);
        await saveSubmissionToDB(updatedList);

        setLinkModalConfig(null);
        setLinkUrl('');
        setLinkTitle('');
    };

    const handleAddDocument = async () => {
        if (!docContent.trim()) return;
        const newAtt = {
            id: Date.now().toString(),
            type: 'document',
            content: docContent,
            title: docTitle.trim() || 'Documento sin título'
        };
        const updatedList = [...myAttachments, newAtt];
        setMyAttachments(updatedList);
        await saveSubmissionToDB(updatedList);

        setDocModalOpen(false);
        setDocTitle('');
        setDocContent('');
    };

    const handleRemoveAttachment = async (attId) => {
        const updatedList = myAttachments.filter(a => a.id !== attId);
        setMyAttachments(updatedList);
        await saveSubmissionToDB(updatedList);
    };



    const handleSendComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            const chatRef = ref(rtdb, `campus_entregas/${classroom.id}/${work.id}/${studentId}/chat`);
            const newMsgRef = push(chatRef);
            await set(newMsgRef, {
                text: newComment.trim(),
                sender: currentUser?.nombre || currentUser?.name || 'Alumno',
                timestamp: Date.now()
            });
            setNewComment('');
        } catch (error) {
            console.error("Error sending message:", error);
            addNotification('Error al enviar el mensaje', 'error');
        }
    };

    return (
        <div className="bg-white min-h-full rounded-3xl animate-fadeIn p-6">
            <div className="flex items-center gap-4 mb-8">
                <button 
                    onClick={onBack}
                    className="flex items-center gap-2 text-stone-500 hover:text-indigo-600 transition-colors font-semibold"
                >
                    <i className="fas fa-arrow-left"></i>
                    Volver a la clase
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Left side: Content */}
                <div className="flex-1">
                    <div className="flex items-start gap-4 border-b border-stone-200 pb-6 mb-6">
                        <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-1">
                            <i className={`fas ${isMaterial ? 'fa-book' : 'fa-clipboard-list'} text-indigo-600 text-2xl`}></i>
                        </div>
                        <div className="flex-1">
                            <div className="flex items-start justify-between">
                                <h1 className="text-3xl font-bold text-stone-800">{work.title}</h1>
                                {!isMaterial && work.dueDate && (
                                    <div className="text-right flex-shrink-0 ml-4">
                                        <p className="text-xs font-bold text-stone-400 uppercase tracking-wide">Fecha límite</p>
                                        <p className="text-rose-500 font-bold">{formatDate(work.dueDate)}</p>
                                    </div>
                                )}
                            </div>
                            <p className="text-sm text-stone-500 mt-2">
                                Profesor · Publicado el {formatDate(new Date(work.timestamp).toISOString().split('T')[0])}
                            </p>
                            
                            {work.score && (
                                <p className="text-sm font-semibold text-stone-600 mt-2">
                                    {work.score} puntos
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="prose max-w-none text-stone-700 whitespace-pre-wrap">
                        {work.description || "Sin instrucciones detalladas."}
                    </div>

                    {/* Teacher Attachments */}
                    {work.attachments && work.attachments.length > 0 && (
                        <div className="mt-8">
                            <h3 className="font-bold text-stone-700 mb-4">Materiales de referencia</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {work.attachments.map(att => (
                                    <div 
                                        key={att.id} 
                                        onClick={() => att.url && window.open(att.url, '_blank')}
                                        className="flex items-center gap-3 p-3 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors cursor-pointer group"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0">
                                            <i className={`fas ${att.type === 'drive' ? 'fa-brands fa-google-drive text-green-500' : att.type === 'youtube' ? 'fa-brands fa-youtube text-red-500' : 'fa-link text-blue-500'}`}></i>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-stone-800 truncate group-hover:underline group-hover:text-indigo-600" title={att.url}>{att.title || att.url}</p>
                                            <p className="text-xs text-stone-500 truncate uppercase">{att.type}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right side: Submission Panel (Only for tasks) */}
                {!isMaterial && (
                    <div className="w-full lg:w-[350px] space-y-6 flex-shrink-0">
                        {/* Tu trabajo card */}
                        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold text-stone-800">Tu trabajo</h2>
                                <span className={`text-sm font-bold ${submission?.status === 'Entregado' ? 'text-green-600' : 'text-stone-500'}`}>
                                    {submission?.status || 'Asignada'}
                                </span>
                            </div>

                            {/* My attachments list */}
                            {myAttachments.length > 0 && (
                                <div className="space-y-3 mb-6">
                                    {myAttachments.map(att => (
                                        <div 
                                            key={att.id} 
                                            onClick={() => {
                                                if (att.type === 'document') {
                                                    setViewingDocument(att);
                                                } else if (att.url) {
                                                    window.open(att.url, '_blank');
                                                }
                                            }}
                                            className="flex items-center justify-between p-3 border border-stone-200 rounded-xl relative group hover:bg-stone-50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden cursor-pointer">
                                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm border border-stone-100">
                                                    {att.type === 'drive' && <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" alt="Drive" className="w-5 h-5" />}
                                                    {att.type === 'youtube' && <img src="https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg" alt="YouTube" className="w-5 h-5" />}
                                                    {att.type === 'link' && <i className="fas fa-link text-stone-400"></i>}
                                                    {att.type === 'upload' && <i className="fas fa-file text-stone-400"></i>}
                                                    {att.type === 'document' && <i className="fas fa-file-alt text-blue-500"></i>}
                                                    {(!att.type || att.type === 'unknown') && <i className="fas fa-link text-stone-400"></i>}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-bold text-sm text-stone-700 truncate group-hover:text-indigo-600 transition-colors" title={att.url}>{att.title || att.url}</span>
                                                    {att.url && <span className="text-xs text-stone-500 truncate">{att.url}</span>}
                                                    {att.type === 'document' && <span className="text-xs text-stone-500 truncate">Documento interno</span>}
                                                </div>
                                            </div>
                                            {submission?.status !== 'Entregado' && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setMyAttachments(myAttachments.filter(a => a.id !== att.id)); }}
                                                    className="w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center text-stone-400 hover:text-red-500 transition-colors flex-shrink-0 ml-2 z-10"
                                                >
                                                    <i className="fas fa-times"></i>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {submission?.status !== 'Entregado' ? (
                                <>
                                    <div className="flex flex-wrap gap-2 justify-center mb-6">
                                        <button type="button" onClick={() => setLinkModalConfig({ type: 'drive' })} className="w-[4.5rem] h-[4.5rem] border border-stone-200 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-stone-50 transition-colors text-stone-600 shadow-sm">
                                            <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" alt="Drive" className="w-6 h-6" />
                                            <span className="text-[10px] font-medium tracking-tight mt-1">Drive</span>
                                        </button>
                                        <button type="button" onClick={() => setLinkModalConfig({ type: 'youtube' })} className="w-[4.5rem] h-[4.5rem] border border-stone-200 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-stone-50 transition-colors text-stone-600 shadow-sm">
                                            <img src="https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg" alt="YouTube" className="w-6 h-6" />
                                            <span className="text-[10px] font-medium tracking-tight mt-1">YouTube</span>
                                        </button>
                                        <button type="button" onClick={() => setDocModalOpen(true)} className="w-[4.5rem] h-[4.5rem] border border-stone-200 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-stone-50 transition-colors text-stone-600 shadow-sm">
                                            <i className="fas fa-plus text-xl text-blue-500"></i>
                                            <span className="text-[10px] font-medium tracking-tight mt-1">Crear</span>
                                        </button>
                                        <button type="button" onClick={() => setLinkModalConfig({ type: 'link' })} className="w-[4.5rem] h-[4.5rem] border border-stone-200 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-stone-50 transition-colors text-stone-600 shadow-sm">
                                            <i className="fas fa-link text-xl text-stone-400"></i>
                                            <span className="text-[10px] font-medium tracking-tight mt-1">Vínculo</span>
                                        </button>
                                    </div>
                                    <button 
                                        onClick={handleMarkCompleted}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-sm"
                                    >
                                        Marcar como completada
                                    </button>
                                </>
                            ) : (
                                <button 
                                    onClick={handleMarkCompleted}
                                    className="w-full bg-white border-2 border-stone-200 hover:bg-stone-50 text-stone-600 font-bold py-3 rounded-xl transition-all"
                                >
                                    Anular entrega
                                </button>
                            )}
                        </div>

                        {/* Private comments */}
                        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm flex flex-col h-[400px]">
                            <h2 className="text-sm font-bold text-stone-800 uppercase tracking-wide mb-1 flex items-center gap-2 flex-shrink-0">
                                <i className="fas fa-user-friends"></i> Comentarios privados
                            </h2>
                            <p className="text-xs text-stone-500 mb-4 flex-shrink-0">Comunícate de forma privada con tu profesor.</p>
                            
                            <div className="flex-1 overflow-y-auto mb-4 space-y-3 pr-2">
                                {privateComments.map((msg, idx) => {
                                    const isMyMsg = msg.sender !== 'Profesor' && msg.sender !== 'Tú'; // Since the student sends their own name
                                    return (
                                        <div key={idx} className={`bg-blue-50/50 border border-blue-100 rounded-xl p-3 ${isMyMsg ? 'bg-stone-100 border-stone-200' : ''}`}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs font-bold text-stone-600">{isMyMsg ? 'Tú' : 'Profesor'}</span>
                                                <span className="text-[10px] text-stone-400 font-semibold">{formatDate(new Date(msg.timestamp).toISOString().split('T')[0])}</span>
                                            </div>
                                            <p className="text-sm text-stone-700">{msg.text}</p>
                                        </div>
                                    );
                                })}
                                {privateComments.length === 0 && (
                                    <p className="text-stone-400 text-sm italic text-center mt-10">No hay comentarios aún.</p>
                                )}
                            </div>

                            <form onSubmit={handleSendComment} className="flex gap-2 flex-shrink-0">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex-shrink-0 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                    {currentUser?.nombre?.[0] || 'U'}
                                </div>
                                <div className="flex-1 relative">
                                    <input 
                                        type="text" 
                                        placeholder="Añadir comentario..."
                                        className="w-full bg-stone-50 border border-stone-200 rounded-full pl-4 pr-10 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                        value={newComment}
                                        onChange={e => setNewComment(e.target.value)}
                                    />
                                    <button 
                                        type="submit"
                                        className="absolute right-1 top-1 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                        disabled={!newComment.trim()}
                                    >
                                        <i className="fas fa-paper-plane text-xs"></i>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Link/Upload Modal */}
            {linkModalConfig && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm animate-fadeIn">
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
                                    placeholder="Mi trabajo práctico"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-10 bg-stone-900/80 backdrop-blur-sm animate-fadeIn">
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

            {/* Document Viewer Modal */}
            {viewingDocument && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 lg:p-10 bg-stone-900/80 backdrop-blur-sm animate-fadeIn" onClick={() => setViewingDocument(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-4xl h-full shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="border-b border-stone-200 p-4 flex items-center justify-between bg-stone-50 flex-shrink-0">
                            <div className="flex items-center gap-4 flex-1">
                                <button onClick={() => setViewingDocument(null)} className="text-stone-500 hover:bg-stone-200 w-10 h-10 rounded-full flex items-center justify-center"><i className="fas fa-arrow-left"></i></button>
                                <span className="text-xl font-bold text-stone-700">{viewingDocument.title}</span>
                                <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded ml-2 uppercase">Solo lectura</span>
                            </div>
                        </div>
                        <div className="flex-1 bg-stone-200 p-4 lg:p-8 overflow-y-auto">
                            <div className="w-full max-w-[800px] mx-auto min-h-full bg-white shadow-md p-8 lg:p-12 text-stone-800 leading-relaxed font-serif whitespace-pre-wrap">
                                {viewingDocument.content}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
