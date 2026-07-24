import React, { useState, useEffect } from 'react';
import { ref, onValue, set, remove, push, get } from 'firebase/database';
import { rtdb } from '../../../config/firebase';

function StudentSubmissionAccordion({ submission, classroomId, workId }) {
    const [expanded, setExpanded] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [grade, setGrade] = useState(submission.grade || '');
    const [viewingDocument, setViewingDocument] = useState(null);
    const chatRefPath = `campus_entregas/${classroomId}/${workId}/${submission.studentId}/chat`;

    useEffect(() => {
        setGrade(submission.grade || '');
    }, [submission.grade]);

    const handleGradeBlur = async () => {
        if (grade === (submission.grade || '')) return;
        try {
            await set(ref(rtdb, `campus_entregas/${classroomId}/${workId}/${submission.studentId}/grade`), grade);
        } catch (err) {
            console.error("Error saving grade:", err);
        }
    };

    useEffect(() => {
        if (!expanded) return;
        
        const chatRef = ref(rtdb, chatRefPath);
        const unsub = onValue(chatRef, (snap) => {
            if (snap.exists()) {
                const msgs = Object.values(snap.val());
                msgs.sort((a, b) => a.timestamp - b.timestamp);
                setChatMessages(msgs);
            } else {
                setChatMessages([]);
            }
        });
        return () => unsub();
    }, [expanded, chatRefPath]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        
        try {
            const chatRef = ref(rtdb, chatRefPath);
            const newMsgRef = push(chatRef);
            await set(newMsgRef, {
                text: newMessage.trim(),
                sender: 'Profesor', // or 'Tú'
                timestamp: Date.now()
            });
            setNewMessage('');
        } catch (err) {
            console.error("Error sending message:", err);
        }
    };

    const handleClearChat = async () => {
        if (!window.confirm("¿Estás seguro de que deseas limpiar el historial de comentarios privados para este alumno?")) return;
        try {
            await remove(ref(rtdb, chatRefPath));
        } catch (err) {
            console.error("Error clearing chat:", err);
        }
    };

    const formatDate = (ts) => {
        const d = new Date(ts);
        return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    };

    const attachments = submission.attachments || [];
    const chatCount = submission.chat ? Object.keys(submission.chat).length : chatMessages.length; // Approximate if not expanded

    return (
        <div className="bg-white border border-stone-200 rounded-xl mb-4 overflow-hidden shadow-sm">
            {/* Header (Accordion Trigger) */}
            <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-stone-50 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center font-bold text-stone-500 uppercase flex-shrink-0">
                        {submission.studentName ? submission.studentName.charAt(0) : 'A'}
                    </div>
                    <div>
                        <h4 className="font-bold text-stone-800 uppercase text-sm">{submission.studentName}</h4>
                        {submission.studentDni && (
                            <p className="text-xs text-stone-400 font-medium mt-0.5">DNI: {submission.studentDni}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-4 text-stone-500">
                    <div className="flex items-center gap-2 mr-2" onClick={e => e.stopPropagation()}>
                        <span className="text-[10px] font-bold uppercase text-stone-400">Nota:</span>
                        <input 
                            type="number"
                            min="0"
                            max="10"
                            step="0.1"
                            className="w-16 h-8 text-center text-sm font-bold text-stone-700 bg-white border border-stone-200 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            value={grade}
                            onChange={(e) => setGrade(e.target.value)}
                            onBlur={handleGradeBlur}
                            placeholder="-"
                        />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold bg-stone-100 px-3 py-1 rounded-full">
                        <i className="far fa-comment-alt"></i>
                        <span>{chatCount}</span>
                    </div>
                    <i className={`fas fa-chevron-${expanded ? 'up' : 'down'} text-xs ml-2 text-stone-400`}></i>
                </div>
            </div>

            {/* Expanded Content */}
            {expanded && (
                <div className="p-4 pt-0 border-t border-stone-100 bg-stone-50/50">
                    
                    {/* Archivos Entregados */}
                    <div className="mb-6 pt-4">
                        <h5 className="text-[10px] font-black text-stone-700 mb-3 tracking-wider uppercase">Archivos entregados</h5>
                        {attachments.length === 0 ? (
                            <p className="text-xs text-stone-500 italic">No ha entregado archivos.</p>
                        ) : (
                            <div className="flex gap-3 flex-wrap">
                                {attachments.map(att => (
                                    <div 
                                        key={att.id} 
                                        onClick={() => {
                                            if (att.type === 'document') {
                                                setViewingDocument(att);
                                            } else if (att.url) {
                                                window.open(att.url, '_blank');
                                            }
                                        }}
                                        className="flex items-center gap-2 bg-white border border-stone-200 rounded-lg p-2 px-3 shadow-sm cursor-pointer hover:bg-stone-50 transition-colors"
                                    >
                                        <div className="w-6 h-6 rounded bg-stone-100 flex items-center justify-center flex-shrink-0">
                                            {att.type === 'drive' && <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" alt="Drive" className="w-4 h-4" />}
                                            {att.type === 'youtube' && <img src="https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg" alt="YouTube" className="w-4 h-4" />}
                                            {att.type === 'link' && <i className="fas fa-link text-stone-400 text-xs"></i>}
                                            {att.type === 'upload' && <i className="fas fa-file text-stone-400 text-xs"></i>}
                                            {att.type === 'document' && <i className="fas fa-file-alt text-blue-500 text-xs"></i>}
                                            {(!att.type || att.type === 'unknown') && <i className="fas fa-link text-stone-400 text-xs"></i>}
                                        </div>
                                        <span className="text-sm font-bold text-blue-600 truncate max-w-[200px] hover:underline" title={att.url || att.title}>{att.title}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Comentarios Privados */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h5 className="text-[10px] font-black text-stone-700 tracking-wider uppercase">Comentarios privados</h5>
                            {chatMessages.length > 0 && (
                                <button 
                                    onClick={handleClearChat}
                                    className="text-[10px] font-bold text-red-500 hover:text-red-600 transition-colors flex items-center gap-1.5"
                                >
                                    <i className="fas fa-trash-alt"></i> Limpiar historial
                                </button>
                            )}
                        </div>

                        {/* Chat History */}
                        {chatMessages.length > 0 && (
                            <div className="space-y-3 mb-4">
                                {chatMessages.map((msg, idx) => {
                                    const isTeacherMsg = msg.sender === 'Profesor' || msg.sender === 'Tú';
                                    return (
                                        <div key={idx} className={`bg-blue-50/50 border border-blue-100 rounded-xl p-3 ${isTeacherMsg ? 'bg-stone-100 border-stone-200' : ''}`}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs font-bold text-stone-600">{isTeacherMsg ? 'Tú' : submission.studentName}</span>
                                                <span className="text-[10px] text-stone-400 font-semibold">{formatDate(msg.timestamp)}</span>
                                            </div>
                                            <p className="text-sm text-stone-700">{msg.text}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Chat Input */}
                        <form onSubmit={handleSendMessage} className="flex gap-2 items-center bg-white p-1.5 rounded-full border border-stone-200 shadow-sm">
                            <input 
                                type="text"
                                placeholder="Responder comentario privado..."
                                className="flex-1 bg-transparent border-none text-sm pl-4 focus:outline-none focus:ring-0 text-stone-700"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                            />
                            <button 
                                type="submit"
                                disabled={!newMessage.trim()}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-stone-300 text-white font-bold text-sm px-6 py-2 rounded-full transition-colors"
                            >
                                Responder
                            </button>
                        </form>
                    </div>

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
            )}
        </div>
    );
}

export default function TeacherTaskCard({ work, classroom, globalSede, isExpanded, onToggle, onEdit, onDelete, addNotification }) {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    const isMaterial = work.type === 'material';

    useEffect(() => {
        if (!isExpanded || isMaterial) {
            setLoading(false);
            return;
        }

        const subsRef = ref(rtdb, `campus_entregas/${classroom.id}/${work.id}`);
        const unsub = onValue(subsRef, (snap) => {
            if (snap.exists()) {
                const data = snap.val();
                setSubmissions(Object.values(data));
            } else {
                setSubmissions([]);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching submissions:", error);
            setSubmissions([]);
            setLoading(false);
            if (addNotification) addNotification("Error al cargar entregas", "error");
        });

        return () => unsub();
    }, [classroom.id, work.id, isExpanded, isMaterial, addNotification]);

    const handleExportGrades = async () => {
        if (!globalSede) {
            addNotification("Sede no identificada", "error");
            return;
        }
        
        const hasGrades = submissions.some(s => s.grade);
        if (!hasGrades) {
            addNotification("No hay calificaciones cargadas para exportar", "warning");
            return;
        }

        if (!window.confirm(`¿Exportar calificaciones de "${work.title}" al boletín general?`)) return;

        setExporting(true);
        try {
            const safeSede = globalSede.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\./g, '');
            const colsRef = ref(rtdb, `config/gradeColumns_${safeSede}/${classroom.id}`);
            const snap = await get(colsRef);
            const currentCols = snap.exists() ? (snap.val() || []) : [];

            const newColId = `col_${Date.now()}`;
            const newCol = { id: newColId, title: work.title, date: new Date().toISOString().split('T')[0] };
            currentCols.push(newCol);

            await set(colsRef, currentCols);

            for (const sub of submissions) {
                if (sub.grade) {
                    const score = parseFloat(String(sub.grade).replace(',', '.'));
                    if (isNaN(score)) continue;

                    const recordId = `${newColId}_${sub.studentId}`;
                    const gradeRecord = {
                        id: recordId,
                        studentId: sub.studentId,
                        columnId: newColId,
                        level: classroom.id,
                        sede: globalSede,
                        score
                    };
                    await set(ref(rtdb, `calificaciones/${recordId}`), gradeRecord);
                }
            }

            addNotification("Calificaciones exportadas exitosamente", "success");
        } catch (err) {
            console.error("Error exporting grades:", err);
            addNotification("Error exportando calificaciones", "error");
        }
        setExporting(false);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const [y, m, d] = dateString.split('-');
        return `${d}/${m}/${y}`;
    };

    return (
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
            {/* Header / Clickable Toggle */}
            <div 
                className="p-4 flex items-start gap-4 cursor-pointer hover:bg-stone-50 transition-colors relative"
                onClick={onToggle}
            >
                <div className="w-10 h-10 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center flex-shrink-0 mt-1">
                    <i className={`fas ${isMaterial ? 'fa-book text-stone-500' : 'fa-clipboard-list text-indigo-600'} text-lg`}></i>
                </div>
                <div className="flex-1 pr-24">
                    <h4 className="text-[15px] font-bold text-stone-700 leading-tight">{work.title}</h4>
                    {work.dueDate && (
                        <p className="text-xs text-stone-500 mt-1">
                            Vence: {formatDate(work.dueDate)}
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="absolute right-4 top-4 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button 
                        onClick={onEdit}
                        className="w-8 h-8 rounded hover:bg-stone-100 flex items-center justify-center text-amber-500 transition-colors"
                        title="Editar"
                    >
                        <i className="fas fa-pen text-sm"></i>
                    </button>
                    <button 
                        onClick={onDelete}
                        className="w-8 h-8 rounded hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-red-500 transition-colors"
                        title="Eliminar"
                    >
                        <i className="fas fa-trash-alt text-sm"></i>
                    </button>
                </div>
            </div>

            {/* Expanded Section (Bottom) */}
            {isExpanded && (
                <div className="bg-slate-50 border-t border-stone-200 p-6 animate-fadeIn">
                    {isMaterial ? (
                        <div className="flex flex-col gap-4">
                            <button className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-2 w-max">
                                Abrir Enlace <i className="fas fa-external-link-alt text-xs"></i>
                            </button>
                            {/* Materials could also render attachments if they have them */}
                            {work.attachments && work.attachments.map(att => (
                                <div key={att.id} className="text-sm font-semibold text-stone-600 flex items-center gap-2">
                                    <i className="fas fa-link text-stone-400"></i> {att.title}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div>
                            {loading ? (
                                <div className="flex justify-center py-6">
                                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-bold text-blue-600 text-sm flex items-center gap-2">
                                            <span className="text-lg leading-none">{submissions.length}</span> 
                                            han presentado la tarea
                                        </h3>
                                        <button 
                                            onClick={handleExportGrades}
                                            disabled={exporting || !submissions.some(s => s.grade)}
                                            className="bg-green-600 hover:bg-green-700 disabled:bg-stone-300 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                                        >
                                            {exporting ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-file-export"></i>}
                                            Exportar Calificaciones
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        {submissions.length === 0 ? (
                                            <p className="text-xs text-stone-500 italic">No hay entregas registradas.</p>
                                        ) : (
                                            submissions.map(sub => (
                                                <StudentSubmissionAccordion 
                                                    key={sub.studentId}
                                                    submission={sub}
                                                    classroomId={classroom.id}
                                                    workId={work.id}
                                                />
                                            ))
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
