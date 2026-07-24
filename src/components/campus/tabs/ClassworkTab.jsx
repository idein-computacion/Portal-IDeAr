import React, { useState, useEffect } from 'react';
import { ref, onValue, remove } from 'firebase/database';
import { rtdb } from '../../../config/firebase';
import CreateTopicModal from './CreateTopicModal';
import CreateWorkModal from './CreateWorkModal';
import TaskDetailView from './TaskDetailView';
import TeacherTaskCard from './TeacherTaskCard';

export default function ClassworkTab({ classroom, currentUser, globalSede, addNotification }) {
    // Treat as teacher if they are explicitly 'Profesor', 'admin', or if they don't have an 'Alumno' role (like Sede Directors)
    const isTeacher = currentUser?.rol !== 'Alumno';
    
    // UI State
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [createModalType, setCreateModalType] = useState(null); // 'tarea', 'material', 'tema'
    const [activeDropdown, setActiveDropdown] = useState(null); // ID of the work item with open dropdown (students only)
    const [editingWork, setEditingWork] = useState(null); // Work item being edited
    const [selectedWork, setSelectedWork] = useState(null); // For students, the task being viewed
    const [expandedWorkId, setExpandedWorkId] = useState(null); // For teachers, the task being expanded
    
    // Date formatter dd/mm/aaaa
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const [y, m, d] = dateString.split('-');
        return `${d}/${m}/${y}`;
    };

    console.log("=> Renderizando ClassworkTab. Rol:", currentUser?.rol, "isTeacher:", isTeacher);
    
    // Data State
    const [topics, setTopics] = useState([]);
    const [workItems, setWorkItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const topicsRef = ref(rtdb, `campus_temas/${classroom.id}`);
        const workRef = ref(rtdb, `campus_trabajos/${classroom.id}`);

        let loadedTopics = [];
        let loadedWorks = [];
        let pending = 2;

        const checkDone = () => {
            pending--;
            if (pending === 0) {
                setTopics(loadedTopics);
                setWorkItems(loadedWorks);
                setLoading(false);
            }
        };

        const unsubTopics = onValue(topicsRef, (snap) => {
            loadedTopics = snap.exists() ? Object.entries(snap.val()).map(([id, val]) => ({ id, ...val })) : [];
            // Sort topics by timestamp (oldest first or newest first depending on preference, usually newest)
            loadedTopics.sort((a, b) => b.timestamp - a.timestamp);
            checkDone();
        }, (err) => {
            console.error("Error fetching topics:", err);
            checkDone();
        });

        const unsubWork = onValue(workRef, (snap) => {
            loadedWorks = snap.exists() ? Object.entries(snap.val()).map(([id, val]) => ({ id, ...val })) : [];
            // Sort work by timestamp descending
            loadedWorks.sort((a, b) => b.timestamp - a.timestamp);
            checkDone();
        }, (err) => {
            console.error("Error fetching work items:", err);
            checkDone();
        });

        return () => {
            unsubTopics();
            unsubWork();
        };
    }, [classroom.id]);

    const menuOptions = [
        { id: 'tarea', label: 'Tarea', icon: 'fa-clipboard-list', active: true },
        { id: 'tarea_cuestionario', label: 'Tarea con cuestionario', icon: 'fa-clipboard-check', active: false },
        { id: 'pregunta', label: 'Pregunta', icon: 'fa-question-circle', active: false },
        { id: 'material', label: 'Material', icon: 'fa-book', active: true },
        { id: 'reutilizar', label: 'Reutilizar la publicación', icon: 'fa-exchange-alt', active: false, dividerTop: true },
        { id: 'tema', label: 'Tema', icon: 'fa-list', active: true, dividerTop: true },
    ];

    const handleSelectOption = (opt) => {
        setIsMenuOpen(false);
        if (opt.active) {
            setCreateModalType(opt.id);
            setEditingWork(null); // ensure we open a clean modal for creation
        } else {
            addNotification("Esta función estará disponible próximamente.", "info");
        }
    };

    const handleEditWork = (work) => {
        setEditingWork(work);
        setCreateModalType(work.type);
        setActiveDropdown(null);
    };

    const handleDeleteWork = async (work) => {
        if (!window.confirm(`¿Estás seguro de que deseas eliminar "${work.title}"?`)) return;
        
        setActiveDropdown(null);
        try {
            await remove(ref(rtdb, `campus_trabajos/${classroom.id}/${work.id}`));
            addNotification('Elemento eliminado con éxito', 'success');
        } catch (error) {
            console.error("Error deleting work:", error);
            addNotification('Error al eliminar', 'error');
        }
    };

    if (selectedWork && !isTeacher) {
        return (
            <TaskDetailView 
                work={selectedWork}
                classroom={classroom}
                currentUser={currentUser}
                onBack={() => setSelectedWork(null)}
                addNotification={addNotification}
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4 relative z-20">
                <h2 className="text-2xl font-bold text-stone-800">Trabajo en clase</h2>
                
                {isTeacher && (
                    <div className="relative">
                        <button 
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-full font-bold shadow-sm transition-all flex items-center gap-2"
                        >
                            <i className="fas fa-plus"></i>
                            Crear
                        </button>
                        
                        {/* Dropdown Menu */}
                        {isMenuOpen && (
                            <>
                                <div 
                                    className="fixed inset-0 z-10" 
                                    onClick={() => setIsMenuOpen(false)}
                                ></div>
                                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-stone-100 overflow-hidden z-20 animate-fadeIn">
                                    <div className="py-2">
                                        {menuOptions.map(opt => (
                                            <React.Fragment key={opt.id}>
                                                {opt.dividerTop && <div className="h-px bg-stone-200 my-2"></div>}
                                                <button
                                                    onClick={() => handleSelectOption(opt)}
                                                    className={`w-full text-left px-5 py-3 text-sm font-semibold flex items-center gap-4 hover:bg-stone-50 transition-colors ${
                                                        opt.active ? 'text-stone-700' : 'text-stone-400'
                                                    }`}
                                                >
                                                    <i className={`fas ${opt.icon} w-5 text-center text-lg ${opt.active ? 'text-indigo-600' : 'text-stone-300'}`}></i>
                                                    {opt.label}
                                                </button>
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : topics.length === 0 && workItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-24 h-24 bg-stone-100 rounded-full flex items-center justify-center mb-6">
                        <i className="fas fa-tasks text-stone-300 text-4xl"></i>
                    </div>
                    <h3 className="text-xl font-bold text-stone-700 mb-2">
                        {isTeacher ? 'Asigna trabajo a tu clase aquí' : 'Aún no hay trabajos asignados'}
                    </h3>
                    {isTeacher && (
                        <p className="text-stone-500 max-w-md">
                            Crea tareas y preguntas, organiza el trabajo de clase en módulos o temas y ordena el trabajo como quieres que lo vean los alumnos.
                        </p>
                    )}
                </div>
            ) : (
                <div className="py-8 space-y-12">
                    {/* Items without a topic */}
                    {workItems.filter(w => !w.topicId).length > 0 && (
                        <div className="space-y-4">
                            {workItems.filter(w => !w.topicId).map(work => (
                                isTeacher ? (
                                    <TeacherTaskCard 
                                        key={work.id}
                                        work={work}
                                        classroom={classroom}
                                        globalSede={globalSede}
                                        isExpanded={expandedWorkId === work.id}
                                        onToggle={() => setExpandedWorkId(expandedWorkId === work.id ? null : work.id)}
                                        onEdit={() => handleEditWork(work)}
                                        onDelete={() => handleDeleteWork(work)}
                                        addNotification={addNotification}
                                    />
                                ) : (
                                    <div key={work.id} onClick={() => setSelectedWork(work)} className="bg-white border border-stone-200 rounded-2xl p-4 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer group mb-4">
                                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                            <i className={`fas ${work.type === 'material' ? 'fa-book text-stone-500' : 'fa-clipboard-list text-indigo-600'} text-xl`}></i>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-stone-800 text-lg group-hover:text-indigo-600 transition-colors">{work.title}</h4>
                                            <p className="text-sm text-stone-500">
                                                {work.type === 'material' ? 'Material' : (work.dueDate ? `Fecha de entrega: ${formatDate(work.dueDate)}` : 'Sin fecha de entrega')}
                                            </p>
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>
                    )}

                    {/* Grouped by topic */}
                    {topics.map(topic => {
                        const topicWorks = workItems.filter(w => w.topicId === topic.id);
                        if (topicWorks.length === 0) return null; // Optionally hide empty topics
                        
                        return (
                            <div key={topic.id} className="space-y-6">
                                <div className="border-b-2 border-indigo-600 pb-2 flex items-center justify-between">
                                    <h3 className="text-2xl font-bold text-indigo-900">{topic.title}</h3>
                                    <button className="text-stone-400 hover:text-stone-600">
                                        <i className="fas fa-ellipsis-v"></i>
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    {topicWorks.map(work => (
                                        isTeacher ? (
                                            <TeacherTaskCard 
                                                key={work.id}
                                                work={work}
                                                classroom={classroom}
                                                globalSede={globalSede}
                                                isExpanded={expandedWorkId === work.id}
                                                onToggle={() => setExpandedWorkId(expandedWorkId === work.id ? null : work.id)}
                                                onEdit={() => handleEditWork(work)}
                                                onDelete={() => handleDeleteWork(work)}
                                                addNotification={addNotification}
                                            />
                                        ) : (
                                            <div key={work.id} onClick={() => setSelectedWork(work)} className="bg-white border border-stone-200 rounded-2xl p-4 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer group mb-4">
                                                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                                    <i className={`fas ${work.type === 'material' ? 'fa-book text-stone-500' : 'fa-clipboard-list text-indigo-600'} text-xl`}></i>
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-stone-800 text-lg group-hover:text-indigo-600 transition-colors">{work.title}</h4>
                                                    <p className="text-sm text-stone-500">
                                                        {work.type === 'material' ? 'Material' : (work.dueDate ? `Fecha de entrega: ${formatDate(work.dueDate)}` : 'Sin fecha de entrega')}
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            
            {/* Render Modals based on createModalType */}
            {createModalType === 'tema' && (
                <CreateTopicModal 
                    classroom={classroom}
                    currentUser={currentUser}
                    onClose={() => setCreateModalType(null)}
                    addNotification={addNotification}
                />
            )}
            
            {(createModalType === 'tarea' || createModalType === 'material') && (
                <CreateWorkModal 
                    type={createModalType}
                    classroom={classroom}
                    topics={topics}
                    currentUser={currentUser}
                    existingWork={editingWork}
                    onClose={() => {
                        setCreateModalType(null);
                        setEditingWork(null);
                    }}
                    addNotification={addNotification}
                />
            )}
        </div>
    );
}
