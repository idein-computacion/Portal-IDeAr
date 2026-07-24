import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../../config/firebase';

const COLORS = [
    { bg: 'bg-indigo-600', text: 'text-indigo-50' },
    { bg: 'bg-blue-600', text: 'text-blue-50' },
    { bg: 'bg-violet-600', text: 'text-violet-50' },
    { bg: 'bg-purple-600', text: 'text-purple-50' },
    { bg: 'bg-fuchsia-600', text: 'text-fuchsia-50' }
];

function getHashColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return COLORS[Math.abs(hash) % COLORS.length];
}

export default function CampusDashboard({ currentUser, globalSede, configLevels, generalConfig, onSelectClassroom }) {
    const [classrooms, setClassrooms] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const studentsRef = ref(rtdb, 'alumnos');
        const usersRef = ref(rtdb, 'usuarios');
        let loadedStudents = [];
        let loadedTeachers = [];

        const calculateClassrooms = () => {
            const activeStudents = loadedStudents.filter(s => s.sede === globalSede && s.active);
            
            const teacherNameFallback = generalConfig?.profesor || currentUser?.nombre || 'Sin Profesor Asignado';
            
            let mappedClassrooms = (configLevels || []).map(levelObj => {
                const levelName = levelObj.curso_nivel;
                const studentsInLevel = activeStudents.filter(s => s.level === levelName || s.taller === levelName);
                
                return {
                    id: levelName,
                    teacherName: teacherNameFallback,
                    title: levelName,
                    colorTheme: getHashColor(levelName),
                    activeStudentsCount: studentsInLevel.length
                };
            }).filter(c => c.activeStudentsCount > 0);

            if (currentUser?.rol === 'Alumno') {
                const studentRecord = activeStudents.find(s => s.dni === currentUser.dni) || activeStudents.find(s => s.email === currentUser.email);
                if (studentRecord) {
                    mappedClassrooms = mappedClassrooms.filter(c => c.id === studentRecord.level || c.id === studentRecord.taller);
                } else {
                    mappedClassrooms = [];
                }
            }

            setClassrooms(mappedClassrooms);
            setLoading(false);
        };

        const unsubStudents = onValue(studentsRef, (snap) => {
            if (snap.exists()) {
                const data = snap.val();
                loadedStudents = Object.values(data);
            } else {
                loadedStudents = [];
            }
            calculateClassrooms();
        });

        return () => {
            unsubStudents();
        };
    }, [globalSede, configLevels, generalConfig]);

    const displayedClassrooms = classrooms;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-fadeIn">
            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center">
                    <i className="fas fa-graduation-cap text-indigo-600 text-2xl"></i>
                </div>
                <div>
                    <h1 className="text-3xl font-black text-stone-800 tracking-tight">Campus Virtual</h1>
                    <p className="text-stone-500 font-medium">Selecciona un aula para ingresar</p>
                </div>
            </div>
            
            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            ) : displayedClassrooms.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-stone-300">
                    <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-folder-open text-stone-400 text-2xl"></i>
                    </div>
                    <h3 className="text-stone-700 font-bold text-lg mb-1">No hay aulas activas</h3>
                    <p className="text-stone-500 text-sm max-w-md mx-auto">No tienes cursos asignados con alumnos matriculados actualmente en esta sede.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {displayedClassrooms.map(c => (
                        <div 
                            key={c.id}
                            onClick={() => onSelectClassroom(c)}
                            className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col h-72 relative"
                        >
                            <div className={`${c.colorTheme.bg} h-32 p-5 relative overflow-hidden flex-shrink-0`}>
                                <div className="absolute right-0 top-0 opacity-10 text-8xl transform translate-x-4 -translate-y-4 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-500 pointer-events-none">
                                    <i className="fas fa-book-reader"></i>
                                </div>
                                <h3 className="text-white font-black text-xl truncate relative z-10 drop-shadow-sm">{c.title}</h3>
                                <p className="text-white/90 text-sm truncate relative z-10 font-medium mt-1">{c.teacherName}</p>
                            </div>
                            
                            <div className="absolute top-24 right-5 w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md border-4 border-white z-20">
                                <span className="text-2xl font-black text-stone-400">{c.teacherName.charAt(0)}</span>
                            </div>

                            <div className="p-5 flex-1 flex flex-col justify-end bg-gradient-to-b from-white to-stone-50">
                                <div className="mb-4">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700">
                                        <i className="fas fa-users"></i> {c.activeStudentsCount} alumnos
                                    </span>
                                </div>
                                <div className="border-t border-stone-200 pt-4 flex justify-between items-center text-stone-500">
                                    <span className="text-sm font-bold group-hover:text-indigo-600 transition-colors">Ingresar al Aula</span>
                                    <button className="w-8 h-8 rounded-full bg-stone-100 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors">
                                        <i className="fas fa-arrow-right text-xs"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
