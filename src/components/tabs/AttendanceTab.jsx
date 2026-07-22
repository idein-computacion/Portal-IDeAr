import React from 'react';

/**
 * Pestaña de Asistencias.
 * Extraído de App.jsx (líneas 3079–3193).
 */
const AttendanceTab = ({
    attendanceNivel,
    setAttendanceNivel,
    attendanceMonthIdx,
    setAttendanceMonthIdx,
    configLevels,
    studentsForAttendance,
    daysInMonth,
    attendance,
    handleToggleCell
}) => {
    const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
                <h3 className="text-xl font-bold text-stone-800 mb-6 flex items-center gap-2">
                    <i className="fas fa-calendar-alt text-amber-500"></i> Tomar Asistencia Diaria
                </h3>

                {/* Selector de Filtros */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Nivel / Curso</label>
                        <select 
                            value={attendanceNivel} 
                            onChange={(e) => setAttendanceNivel(e.target.value)}
                            className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-stone-50 font-medium text-stone-700"
                        >
                            <option value="Todos">Todos los niveles</option>
                            {configLevels.map(c => <option key={c.id} value={c.curso_nivel}>{c.curso_nivel}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Mes</label>
                        <select 
                            value={attendanceMonthIdx}
                            onChange={(e) => setAttendanceMonthIdx(Number(e.target.value))}
                            className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-stone-50 font-medium text-stone-700"
                        >
                            {MONTHS.map((m, idx) => (
                                <option key={idx} value={idx}>{m}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Atajos Rápidos */}
                <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-t border-b border-stone-100 mb-6">
                    <div className="text-sm font-semibold text-stone-600">
                        Alumnos en este curso: <span className="text-amber-600 font-bold">{studentsForAttendance.length}</span>
                    </div>
                </div>

                {/* Grilla Mensual de Asistencias */}
                {studentsForAttendance.length === 0 ? (
                    <div className="text-center py-12 text-stone-400">
                        <i className="fas fa-graduation-cap text-4xl mb-3"></i>
                        <p className="font-medium">No hay alumnos registrados en esta sede y nivel</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto bg-white border border-stone-100 rounded-xl shadow-inner">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className="text-xs text-stone-500 bg-stone-50 border-b border-stone-100 uppercase font-bold">
                                <tr>
                                    <th className="px-4 py-3 sticky left-0 bg-stone-50 z-20 border-r border-stone-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">Alumno</th>
                                    {daysInMonth.map(d => (
                                        <th key={d.dateStr} className={`px-1 py-3 text-center border-r border-stone-100 min-w-[36px] ${[0, 6].includes(d.dayOfWeek) ? 'bg-stone-100/50 text-stone-400' : ''}`}>
                                            <div className="flex flex-col items-center">
                                                <span className="text-[9px] opacity-70">{['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'][d.dayOfWeek]}</span>
                                                <span>{String(d.dayNum).padStart(2, '0')}</span>
                                            </div>
                                        </th>
                                    ))}
                                    <th className="px-3 py-3 text-center border-l-2 border-stone-200 bg-emerald-50 text-emerald-700 sticky right-12 z-10" title="Presentes">Pres.</th>
                                    <th className="px-3 py-3 text-center bg-rose-50 text-rose-700 sticky right-0 z-10" title="Ausentes">Aus.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {studentsForAttendance.map(student => {
                                    let totalP = 0;
                                    let totalA = 0;
                                    
                                    return (
                                        <tr key={student.id} className="hover:bg-amber-50/30 transition-colors group">
                                            <td className="px-4 py-2 font-semibold text-stone-700 sticky left-0 bg-white group-hover:bg-amber-50/80 z-10 border-r border-stone-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)] text-xs">
                                                {student.name}
                                                {attendanceNivel === "Todos" && (
                                                    <span className="block mt-0.5 px-1.5 py-0.5 bg-orange-100 text-orange-800 rounded text-[9px] font-bold w-fit">
                                                        {student.level}
                                                    </span>
                                                )}
                                            </td>
                                            {daysInMonth.map(d => {
                                                const att = attendance.find(a => a.studentId === student.id && a.date === d.dateStr);
                                                const status = att ? att.status : null;
                                                
                                                if (status === "P" || status === "present") totalP++;
                                                if (status === "A" || status === "absent") totalA++;

                                                return (
                                                    <td key={d.dateStr} className={`px-1 py-1 border-r border-stone-100 text-center ${[0, 6].includes(d.dayOfWeek) ? 'bg-stone-50/50' : ''}`}>
                                                        <button
                                                            onClick={() => handleToggleCell(student, d.dateStr, status)}
                                                            className={`w-7 h-7 rounded text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/30 flex items-center justify-center mx-auto border cursor-pointer ${
                                                                status === 'P' || status === 'present' ? 'bg-emerald-100 text-emerald-700 border-emerald-300 shadow-sm' :
                                                                status === 'A' || status === 'absent' ? 'bg-rose-100 text-rose-700 border-rose-300 shadow-sm' :
                                                                'bg-transparent hover:bg-stone-100 text-transparent hover:text-stone-300 border-transparent hover:border-stone-200'
                                                            }`}
                                                        >
                                                            {status || '+'}
                                                        </button>
                                                    </td>
                                                );
                                            })}
                                            <td className="px-3 py-2 text-center font-bold text-emerald-700 border-l-2 border-stone-200 bg-emerald-50/50 sticky right-12 z-10">{totalP > 0 ? totalP : '-'}</td>
                                            <td className="px-3 py-2 text-center font-bold text-rose-700 bg-rose-50/50 sticky right-0 z-10">{totalA > 0 ? totalA : '-'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AttendanceTab;
