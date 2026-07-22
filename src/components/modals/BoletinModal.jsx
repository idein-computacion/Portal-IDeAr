import React, { useEffect } from 'react';

/**
 * BoletinPreview / BoletinModal
 * Extraído de App.jsx (líneas 254-457).
 */
const BoletinModal = ({ 
    student, 
    sedeObj, 
    grades, 
    gradeColumns, 
    mesasGrades, 
    mesasColumns, 
    attendance, 
    onClose, 
    profesorName 
}) => {
    useEffect(() => {
        const originalTitle = document.title;
        const safeLevel = (student.level || student.taller || 'SinNivel').replace(/[/\\?%*:|"<>]/g, '-');
        const surname = student.name ? student.name.split(',')[0].trim() : '';
        document.title = `IDeAr - ${safeLevel} - ${surname}`;
        return () => {
            document.title = originalTitle;
        };
    }, [student]);

    const attRecords = attendance.filter(a => a.studentId === student.id);
    const presentCount = attRecords.filter(a => a.status === 'P' || a.status === 'present').length;
    const absentCount = attRecords.filter(a => a.status === 'A' || a.status === 'absent').length;
    const totalAtt = presentCount + absentCount;
    const percentage = totalAtt > 0 ? Math.round((presentCount / totalAtt) * 100) : 0;

    const studentGrades = grades.filter(g => g.studentId === student.id);
    const studentMesasGrades = mesasGrades.filter(g => g.studentId === student.id);

    return (
        <div className="fixed inset-0 bg-stone-900/80 z-[100] flex flex-col print:absolute print:bg-white print:inset-0">
            <div className="flex justify-end p-4 gap-4 bg-stone-900 shadow-xl no-print">
                <button onClick={() => window.print()} className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-xl font-bold shadow-md transition-all flex items-center gap-2">
                    <i className="fas fa-print"></i> Imprimir Boletín
                </button>
                <button onClick={onClose} className="bg-stone-700 hover:bg-stone-600 text-white px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2">
                    <i className="fas fa-times"></i> Cerrar
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center print:overflow-visible print:p-0 print:block">
                <div id="boletin-print-area" className="bg-white text-stone-900 p-4 max-w-[210mm] w-full mx-auto shadow-2xl relative min-h-[130mm] print:min-h-[130mm] print:h-[130mm] print:shadow-none print:m-0 print:max-w-none print:w-full flex flex-col overflow-hidden">
                    
                    {/* WATERMARK */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center pb-4 print:pb-4 opacity-[0.10] print:opacity-[0.10] z-0">
                        <img src="/logo.png" alt="" className="w-[65%] max-w-[480px] object-contain grayscale" />
                    </div>

                    <div className="relative z-10 flex flex-col flex-1">
                        <div className="flex justify-between items-center border-b-2 border-stone-800 pb-1 mb-1 w-full gap-2">
                            <div className="flex flex-col items-start whitespace-nowrap">
                                <img src="/logo_1.png" alt="Portal IDeAr" className="h-10 object-contain mb-0.5" />
                                <p className="text-[7px] font-bold text-stone-400">Registro SPEPM 213/21</p>
                            </div>
                            
                            <div className="flex flex-col items-center justify-center text-center px-2">
                                <p className="text-[8px] font-bold text-stone-500 uppercase tracking-widest flex items-center justify-center gap-1 leading-none">SEDE: <span className="text-amber-700 text-lg font-black">{sedeObj?.nombre || student.sede}</span></p>
                                {profesorName && <p className="text-[10px] font-black text-stone-800 uppercase mt-1 leading-none"><span className="text-[8px] font-bold text-stone-500 mr-1 tracking-widest">PROF.:</span>{profesorName}</p>}
                            </div>

                            <div className="flex flex-col items-end text-right whitespace-nowrap">
                                <p className="text-[9px] font-bold text-stone-800 leading-none">Ciclo Lectivo {new Date().getFullYear()}</p>
                                <p className="text-[8px] text-stone-500 font-semibold mt-1 leading-none">Fecha Examen: {new Date().toLocaleDateString('es-AR')}</p>
                            </div>
                        </div>

                        <div className="text-center mb-1">
                            <h3 className="text-lg font-black uppercase text-stone-800 tracking-widest">Boletín de Calificaciones</h3>
                        </div>

                        <div className="bg-stone-50/40 border-2 border-stone-200 p-1.5 rounded-lg mb-1">
                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                                <div>
                                    <p className="mb-0.5"><span className="font-bold text-stone-500 uppercase mr-1">Alumno:</span> <span className="font-bold text-xs text-stone-800 uppercase">{student.name}</span></p>
                                    <p><span className="font-bold text-stone-500 uppercase mr-1">DNI:</span> <span className="font-semibold text-stone-700">{student.dni}</span></p>
                                </div>
                                <div>
                                    <p className="mb-0.5"><span className="font-bold text-stone-500 uppercase mr-1">Nivel/Curso:</span> <span className="font-bold text-xs text-stone-800 uppercase">{student.level || student.taller}</span></p>
                                    <p><span className="font-bold text-stone-500 uppercase mr-1">Sede:</span> <span className="font-semibold text-stone-700 uppercase">{student.sede}</span></p>
                                </div>
                            </div>
                        </div>

                        <div className="mb-1">
                            <h4 className="text-[11px] font-bold text-stone-800 uppercase mb-1">Calificaciones de Cursada</h4>
                            {(!gradeColumns || gradeColumns.length === 0) ? (
                                <p className="text-xs text-stone-400 italic">No hay calificaciones registradas este año.</p>
                            ) : (
                                <table className="w-full text-xs text-left border-collapse border-2 border-stone-200">
                                    <thead>
                                        <tr className="bg-stone-100/50">
                                            {gradeColumns.map(col => (
                                                <th key={col.id} className="border-2 border-stone-200 p-1 text-center uppercase text-[8px] text-stone-600 font-bold">{col.title}</th>
                                            ))}
                                            <th className="border-2 border-stone-200 p-1 text-center uppercase text-[8px] text-stone-800 font-black bg-stone-200/50">Promedio Final</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            {gradeColumns.map(col => {
                                                const g = studentGrades.find(gr => gr.columnId === col.id);
                                                return (
                                                    <td key={col.id} className="border-2 border-stone-200 py-0.5 px-1 text-center font-bold text-stone-800 text-sm">
                                                        {g ? g.score : '-'}
                                                    </td>
                                                );
                                            })}
                                            <td className="border-2 border-stone-200 py-0.5 px-1 text-center font-black text-stone-900 bg-stone-100 text-base">
                                                {(() => {
                                                    const scores = gradeColumns.map(c => studentGrades.find(gr => gr.columnId === c.id)?.score).filter(s => s !== undefined && s !== null && !isNaN(s));
                                                    if (scores.length === 0) return '-';
                                                    const avg = scores.reduce((a,b) => a + Number(b), 0) / scores.length;
                                                    return avg.toFixed(2);
                                                })()}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {mesasColumns && mesasColumns.length > 0 && (
                            <div className="mb-1">
                                <h4 className="text-[11px] font-bold text-stone-800 uppercase mb-1">Mesa de Examen Anual</h4>
                                <table className="w-full text-xs text-left border-collapse border-2 border-stone-200">
                                    <thead>
                                        <tr className="bg-stone-100/50">
                                            {mesasColumns.map(col => (
                                                <th key={col.id} className="border-2 border-stone-200 p-1 text-center uppercase text-[8px] text-stone-600 font-bold">{col.title}</th>
                                            ))}
                                            <th className="border-2 border-stone-200 p-1 text-center uppercase text-[8px] text-stone-800 font-black bg-stone-200/50">Final</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            {mesasColumns.map(col => {
                                                const safeLevel = (student.level || student.taller || "Desconocido").replace(/[.#$\[\]]/g, "_").replace(/\//g, "_");
                                                let g = studentMesasGrades.find(gr => gr.id === `${col.id}_${student.id}_${safeLevel}`);
                                                if (!g) g = studentMesasGrades.find(gr => gr.id === `${col.id}_${student.id}`);
                                                return (
                                                    <td key={col.id} className="border-2 border-stone-200 py-0.5 px-1 text-center font-bold text-stone-800 text-sm">
                                                        {g ? g.score : '-'}
                                                    </td>
                                                );
                                            })}
                                            <td className="border-2 border-stone-200 py-0.5 px-1 text-center font-black text-stone-900 bg-stone-100 text-base">
                                                {(() => {
                                                    const scores = mesasColumns.map(c => {
                                                        const safeLevel = (student.level || student.taller || "Desconocido").replace(/[.#$\[\]]/g, "_").replace(/\//g, "_");
                                                        let gr = studentMesasGrades.find(g => g.id === `${c.id}_${student.id}_${safeLevel}`);
                                                        if (!gr) gr = studentMesasGrades.find(g => g.id === `${c.id}_${student.id}`);
                                                        return gr?.score;
                                                    }).filter(s => s !== undefined && s !== null && !isNaN(s));
                                                    if (scores.length === 0) return '-';
                                                    const avg = scores.reduce((a,b) => a + Number(b), 0) / scores.length;
                                                    return avg.toFixed(2);
                                                })()}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="mb-1 flex items-center justify-between bg-stone-50/50 border border-stone-200 px-2 py-0.5 rounded-lg">
                            <h4 className="text-[9px] font-bold text-stone-800 uppercase">Resumen de Asistencias</h4>
                            <div className="flex gap-4 items-center">
                                <div className="flex items-center gap-1">
                                    <p className="text-[8px] font-bold text-stone-500 uppercase">Total:</p>
                                    <p className="text-xs font-black text-stone-800">{totalAtt}</p>
                                </div>
                                <div className="flex items-center gap-1 border-l border-stone-200 pl-2">
                                    <p className="text-[8px] font-bold text-stone-500 uppercase">Presentes:</p>
                                    <p className="text-xs font-black text-emerald-600">{presentCount}</p>
                                </div>
                                <div className="flex items-center gap-1 border-l border-stone-200 pl-2">
                                    <p className="text-[8px] font-bold text-stone-500 uppercase">Ausentes:</p>
                                    <p className="text-xs font-black text-rose-600">{absentCount}</p>
                                </div>
                                <div className="flex items-center gap-1 border-l border-stone-200 pl-2 bg-stone-100/50 rounded-r-lg">
                                    <p className="text-[8px] font-bold text-stone-500 uppercase">%:</p>
                                    <p className={`text-xs font-black ${percentage >= 80 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {percentage}%
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mb-1">
                            <h4 className="text-[11px] font-bold text-stone-800 uppercase mb-1">Observaciones</h4>
                            <div className="border-2 border-stone-200 rounded-xl p-1 bg-stone-50/50 h-10">
                                {/* Espacio para escribir a mano */}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mt-6 pb-0 px-8">
                        <div className="text-center">
                            <div className="border-t-2 border-stone-400 pt-1 w-48 mx-auto">
                                <p className="text-[9px] font-bold text-stone-600 uppercase">Firma del Profesor</p>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="border-t-2 border-stone-400 pt-1 w-48 mx-auto">
                                <p className="text-[9px] font-bold text-stone-600 uppercase">Firma de Dirección</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BoletinModal;
