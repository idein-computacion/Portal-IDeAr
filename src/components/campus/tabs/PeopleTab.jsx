import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../../../config/firebase';

export default function PeopleTab({ classroom, globalSede }) {
    console.log("=> Renderizando PeopleTab, classroom.id:", classroom.id);
    
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const studentsRef = ref(rtdb, 'alumnos');
        const unsub = onValue(studentsRef, (snap) => {
            if (snap.exists()) {
                const data = snap.val();
                console.log("PeopleTab - Total alumnos in DB:", Object.keys(data).length);
                console.log("PeopleTab - Classroom ID to filter:", classroom.id);
                
                const activeStudents = Object.values(data).filter(s => {
                    const isSedeMatch = s.sede === globalSede;
                    const isActive = !!s.active;
                    const isLevelMatch = s.level === classroom.id || s.taller === classroom.id;
                    
                    return isSedeMatch && isActive && isLevelMatch;
                });
                
                console.log("PeopleTab - Filtered activeStudents count:", activeStudents.length);
                activeStudents.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                setStudents(activeStudents);
            } else {
                setStudents([]);
            }
            setLoading(false);
        });
        return () => unsub();
    }, [globalSede, classroom.id]);

    return (
        <div className="max-w-4xl mx-auto space-y-12 pb-20">
            {/* Profesores */}
            <div>
                <div className="flex items-center justify-between border-b-2 border-indigo-600 pb-4 mb-6">
                    <h2 className="text-3xl font-black text-indigo-700">Profesores</h2>
                </div>
                <div className="flex items-center gap-4 px-4 py-3 hover:bg-stone-50 rounded-xl transition-colors">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                        {classroom.teacherName.charAt(0)}
                    </div>
                    <span className="font-bold text-stone-800">{classroom.teacherName}</span>
                </div>
            </div>

            {/* Alumnos */}
            <div>
                <div className="flex items-center justify-between border-b-2 border-indigo-600 pb-4 mb-6">
                    <h2 className="text-3xl font-black text-indigo-700">Compañeros de clase</h2>
                    <span className="text-indigo-700 font-bold bg-indigo-50 px-3 py-1 rounded-full text-sm">
                        {students.length} alumnos
                    </span>
                </div>
                
                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : students.length === 0 ? (
                    <p className="text-stone-500 text-center py-10">No hay alumnos matriculados aún.</p>
                ) : (
                    <div className="divide-y divide-stone-100">
                        {students.map(student => (
                            <div key={student.id} className="flex items-center gap-4 px-4 py-4 hover:bg-stone-50 transition-colors">
                                <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 font-bold overflow-hidden border border-stone-200">
                                    {student.profilePic ? (
                                        <img src={student.profilePic} alt={student.name} className="w-full h-full object-cover" />
                                    ) : (
                                        student.name.charAt(0)
                                    )}
                                </div>
                                <span className="font-bold text-stone-700">{student.name}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
