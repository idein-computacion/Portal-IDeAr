import React from 'react';

/**
 * Modal de historial de mesas de examen por nivel.
 * Extraído de App.jsx (líneas 138–252).
 */
const StudentHistorialModal = ({
    student,
    configLevels,
    allLevels,
    mesasGrades,
    mesasColumns,
    onClose,
    onUpdateGrade,
    onToggleAbsent,
    onOpenBoletinHistorial,
    onOpenAnalitico
}) => {
    const studentLevelIdx = allLevels.indexOf(student.level);
    const relevantLevels = configLevels
        .filter(c => {
            const idx = allLevels.indexOf(c.curso_nivel);
            return idx !== -1 && idx <= studentLevelIdx;
        })
        .sort((a, b) => allLevels.indexOf(a.curso_nivel) - allLevels.indexOf(b.curso_nivel));

    return (
        <div className="fixed inset-0 bg-stone-900/80 z-[100] flex flex-col items-center justify-center p-4 animate-fadeIn no-print">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col" style={{maxHeight:'90vh'}}>
                <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center bg-stone-50 flex-shrink-0">
                    <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                        <i className="fas fa-history text-amber-500"></i> Historial de Mesas
                        <span className="text-sm font-semibold text-stone-400 uppercase">&mdash; {student.name}</span>
                    </h3>
                    <div className="flex items-center gap-3">
                        <button onClick={() => onOpenAnalitico(student)} className="bg-stone-800 hover:bg-stone-900 text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm transition-all flex items-center gap-2">
                            <i className="fas fa-file-contract"></i> Ver Analítico
                        </button>
                        <button onClick={() => onOpenBoletinHistorial(student)} className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm transition-all flex items-center gap-2">
                            <i className="fas fa-file-invoice"></i> Ver Boletín Resumido
                        </button>
                        <button onClick={onClose} className="text-stone-400 hover:text-rose-500 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-rose-50">
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div className="p-4 overflow-y-auto space-y-2">
                    {relevantLevels.length === 0 && (
                        <p className="text-sm text-stone-400 text-center py-6 italic">No hay niveles anteriores registrados.</p>
                    )}
                    {relevantLevels.map(c => {
                        const safeLevel = c.curso_nivel.replace(/[.#$\[\]\/]/g, "_");
                        const statusRecord = mesasGrades?.find(g => g.id === `status_${student.id}_${safeLevel}`)
                                            || mesasGrades?.find(g => g.id === `status_${student.id}`);
                        const isAbsent = statusRecord ? statusRecord.isAbsent : false;
                        const isCurrent = c.curso_nivel === student.level || c.curso_nivel === student.promocionadoDe;
                        return (
                            <div key={c.id} className={`rounded-2xl border p-3 transition-colors ${isCurrent ? 'border-amber-200 bg-amber-50/50' : 'border-stone-100 bg-stone-50/30 hover:bg-stone-50'}`}>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <div className="flex items-center gap-2 min-w-[180px] flex-shrink-0">
                                        <button
                                            onClick={() => onToggleAbsent(student.id, isAbsent, c.curso_nivel)}
                                            className={`w-6 h-6 rounded flex-shrink-0 flex items-center justify-center transition-colors shadow-sm ${
                                                isAbsent ? 'bg-rose-100 text-rose-600 border border-rose-200 hover:bg-rose-200' : 'bg-emerald-100 text-emerald-600 border border-emerald-200 hover:bg-emerald-200'
                                            }`}
                                            title={isAbsent ? "Rinde" : "No Rinde"}
                                        >
                                            <i className={`fas ${isAbsent ? 'fa-times' : 'fa-check'} text-[9px]`}></i>
                                        </button>
                                        <span className={`text-xs font-bold uppercase leading-tight ${isCurrent ? 'text-amber-700' : 'text-stone-600'}`}>
                                            {c.curso_nivel}
                                            {isCurrent && <span className="ml-1 text-[8px] bg-amber-200 text-amber-800 px-1 py-0.5 rounded font-black align-middle">Actual</span>}
                                        </span>
                                    </div>
                                    <div className={`flex items-center gap-1.5 flex-wrap ${isAbsent ? 'opacity-40 pointer-events-none' : ''}`}>
                                        {mesasColumns?.map(col => {
                                            let grade = mesasGrades?.find(g => g.id === `${col.id}_${student.id}_${safeLevel}`);
                                            if (!grade && isCurrent) grade = mesasGrades?.find(g => g.id === `${col.id}_${student.id}`);
                                            const scoreVal = grade ? grade.score : "";
                                            let colorClass = "border-stone-200 bg-white text-stone-700";
                                            if (scoreVal !== "") {
                                                const s = parseFloat(scoreVal);
                                                if (s >= 7) colorClass = "border-emerald-400 bg-emerald-50 text-emerald-800";
                                                else if (s >= 4) colorClass = "border-amber-400 bg-amber-50 text-amber-800";
                                                else colorClass = "border-rose-400 bg-rose-50 text-rose-800";
                                            }
                                            return (
                                                <div key={col.id} className="flex flex-col items-center gap-0.5">
                                                    <span className="text-[9px] text-stone-400 font-semibold uppercase leading-none">{col.title}</span>
                                                    <input
                                                        type="number"
                                                        inputMode="decimal"
                                                        defaultValue={scoreVal}
                                                        key={`${col.id}-${c.curso_nivel}-${scoreVal}`}
                                                        onBlur={(e) => {
                                                            if (e.target.value !== String(scoreVal)) {
                                                                onUpdateGrade(student.id, col.id, e.target.value, c.curso_nivel, isCurrent);
                                                            }
                                                        }}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                                                        className={`w-11 h-7 text-center font-bold text-xs rounded-lg border-2 outline-none focus:ring-2 focus:ring-amber-400 transition-all ${colorClass}`}
                                                        placeholder="-"
                                                    />
                                                </div>
                                            );
                                        })}
                                        {(() => {
                                            const scores = mesasColumns?.map(col => {
                                                let g = mesasGrades?.find(gr => gr.id === `${col.id}_${student.id}_${safeLevel}`);
                                                if (!g && isCurrent) g = mesasGrades?.find(gr => gr.id === `${col.id}_${student.id}`);
                                                return g ? parseFloat(g.score) : null;
                                            }).filter(s => s !== null && !isNaN(s));
                                            if (!scores || scores.length === 0) return null;
                                            const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                                            const avgColor = avg >= 7 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : avg >= 4 ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-rose-100 text-rose-800 border-rose-300';
                                            return (
                                                <div className="flex flex-col items-center gap-0.5 ml-1">
                                                    <span className="text-[9px] text-stone-400 font-semibold uppercase leading-none">Prom.</span>
                                                    <span className={`w-11 h-7 flex items-center justify-center font-black text-xs rounded-lg border-2 ${avgColor}`}>{avg.toFixed(1)}</span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default StudentHistorialModal;
