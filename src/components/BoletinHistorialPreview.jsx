import React, { useEffect } from 'react';

const BoletinHistorialPreview = ({
    student = {},
    sedeObj = {},
    grades,
    gradeColumns,
    mesasGrades,
    mesasColumns,
    attendance,
    onClose,
    profesorName,
    configLevels
}) => {
    // Firebase sometimes returns arrays as objects if they have missing indexes.
    const safeGrades = Array.isArray(grades) ? grades : Object.values(grades || {});
    const safeMesasGrades = Array.isArray(mesasGrades) ? mesasGrades : Object.values(mesasGrades || {});
    const safeMesasColumns = Array.isArray(mesasColumns) ? mesasColumns : Object.values(mesasColumns || {});
    const safeConfigLevels = Array.isArray(configLevels) ? configLevels : Object.values(configLevels || {});

    useEffect(() => {
        try {
            const originalTitle = document.title;
            const levelName = String(student?.level || student?.taller || "SinNivel").replace(/[/\\?%*:|"<>]/g, "-");
            const studentName = student?.name ? String(student.name).split(",")[0].trim() : "";
            document.title = `IDeAr - Resumen - ${levelName} - ${studentName}`;
            return () => {
                document.title = originalTitle;
            };
        } catch (e) {
            console.error(e);
        }
    }, [student]);

    try {
        const studentLevelLower = String(
            (student?.level || "") + " " +
            (student?.taller || "") + " " +
            (student?.promocionadoDe || "")
        ).toLowerCase();
        
        let type = "all";
        if (studentLevelLower.includes("infantil")) {
            type = "infantil";
        } else if (studentLevelLower.includes("instructorado") || studentLevelLower.includes("adultos")) {
            type = "instructorado";
        }

        const studentLevelIndex = safeConfigLevels.findIndex(l => l && l.curso_nivel === student.level);
        const relevantLevels = safeConfigLevels.filter((l, index) => {
            const lvlLower = (l?.curso_nivel || "").toLowerCase();
            if (studentLevelIndex !== -1 && index > studentLevelIndex) return false;

            if (/^([123]|diploma)/i.test(lvlLower) && !lvlLower.includes("3er año superior")) {
                if (type === "infantil") return lvlLower.includes("infantil");
                if (type === "instructorado") return lvlLower.includes("instructorado");
                return true;
            }
            return false;
        });

        // Agrupación en páginas
        const preparatorios = relevantLevels.filter(lvl => lvl.curso_nivel.toLowerCase().includes('preparatorio'));
        const elementales = relevantLevels.filter(lvl => lvl.curso_nivel.toLowerCase().includes('elemental'));
        const superioresYDiplomas = relevantLevels.filter(lvl => {
            const lower = lvl.curso_nivel.toLowerCase();
            return lower.includes('superior') || lower.includes('diploma');
        });

        const pages = [];
        if (preparatorios.length > 0) pages.push({ title: "PREPARATORIOS", levels: preparatorios });
        if (elementales.length > 0) pages.push({ title: "ELEMENTALES", levels: elementales });
        if (superioresYDiplomas.length > 0) pages.push({ title: "SUPERIORES", levels: superioresYDiplomas });

        // Si por alguna razón hay otros (instructorado, adultos) los agrupamos al final
        const otros = relevantLevels.filter(lvl => {
            const lower = lvl.curso_nivel.toLowerCase();
            return !lower.includes('preparatorio') && !lower.includes('elemental') && !lower.includes('superior') && !lower.includes('diploma');
        });
        if (otros.length > 0) pages.push({ title: "OTROS NIVELES", levels: otros });

        // Componente de página
        const Page = ({ page }) => {
            return (
                <div className="w-[210mm] min-h-[130mm] max-w-full mx-auto relative bg-white shadow-2xl mb-8 flex flex-col p-2 print:shadow-none print:mb-4 print:break-inside-avoid print:w-[210mm] print:min-h-[130mm] print:p-0 print:mx-auto">
                    {/* Background Logo */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.10] print:opacity-[0.10] z-0">
                        <img src="/logo.png" alt="" className="w-[45%] max-w-[480px] object-contain grayscale" />
                    </div>

                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            {/* Header Logos and Text */}
                            <div className="flex justify-between items-center border-b border-stone-800 pb-0.5 mb-0.5 w-full gap-2">
                                <div className="flex items-center gap-2 w-full">
                                    <img src="/logo.png" alt="IDeAr" className="h-7 print:h-6 object-contain" />
                                    <div className="flex flex-col items-center justify-center flex-1">
                                        <p className="text-[9px] font-bold text-stone-500 mt-0.5 uppercase text-center leading-tight">
                                            Inscripto en el Servicio Provincial de Enseñanza Privada de Misiones (SPEPM) bajo el Registro Nº 213/21
                                        </p>
                                        <p className="text-[8px] font-bold text-stone-500 mt-0.5 uppercase text-center leading-tight">
                                            Certificación emitida según el Plan de Estudios autorizado por el SPEPM para la especialidad en Danzas Folklóricas Argentinas
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Title */}
                            <div className="text-center mb-0.5 border-b border-stone-800 pb-0.5 mt-0.5">
                                <h2 className="text-[12px] font-black uppercase tracking-widest text-stone-900 underline underline-offset-2 decoration-2">
                                    Boletín de Calificaciones
                                </h2>
                            </div>

                            {/* Student Details Box */}
                            <div className="border border-stone-800 px-1 py-0.5 rounded-sm mb-1 bg-stone-50/30">
                                <div className="grid grid-cols-2 gap-y-0 text-[11px]">
                                    <div>
                                        <p><span className="font-bold text-stone-600 mr-2">Establecimiento:</span> <span className="font-bold text-stone-900">IDeAr (Instituto para el Desarrollo del Arte)</span></p>
                                        <p><span className="font-bold text-stone-600 mr-2">Alumno/a:</span> <span className="font-black text-stone-900 uppercase">{student.name}</span></p>
                                        <p><span className="font-bold text-stone-600 mr-2">Nivel:</span> <span className="font-bold text-stone-900 uppercase">{page.title}</span></p>
                                    </div>
                                    <div>
                                        <p><span className="font-bold text-stone-600 mr-2">Sede:</span> <span className="font-bold text-stone-900">{sedeObj?.nombre || student.sede}</span></p>
                                        <p><span className="font-bold text-stone-600 mr-2">Documento (D.N.I.):</span> <span className="font-bold text-stone-900">{student.dni}</span></p>
                                        <p><span className="font-bold text-stone-600 mr-2">Ciclo Lectivo:</span> <span className="font-bold text-stone-900">{new Date().getFullYear()}</span></p>
                                    </div>
                                </div>
                            </div>

                            {/* Levels Loop */}
                            <div className="flex flex-col gap-0.5">
                                {page.levels.map((lvl) => {
                                    const levelName = lvl?.curso_nivel || "Desconocido";
                                    const safeLevel = levelName.replace(/[.#$\[\]\/]/g, "_");
                                    const isCurrentLevel = levelName === student.level || levelName === student.promocionadoDe;
                                    let hasGrades = false;

                                    let levelGradeCols = (gradeColumns || {})[levelName] || [];
                                    if (!Array.isArray(levelGradeCols)) levelGradeCols = Object.values(levelGradeCols);

                                    return (
                                        <div key={levelName} className="print:break-inside-avoid border border-stone-200 rounded overflow-hidden shadow-sm">
                                            <div className="bg-stone-800 text-white py-[1px] px-2">
                                                <h4 className="font-black text-[9px] uppercase tracking-wider">{levelName}</h4>
                                            </div>
                                            <div className="p-0.5 bg-transparent grid grid-cols-2 gap-1 items-start">
                                                
                                                {/* Calificaciones de Cursada */}
                                                <div>
                                                    <h5 className="text-[9px] font-bold text-stone-500 uppercase mb-0.5 border-b border-stone-100 pb-0.5">Calificaciones de Cursada</h5>
                                                    {levelGradeCols.length === 0 ? (
                                                        <p className="text-[9px] text-stone-400 italic mt-0.5">Sin registros de cursada.</p>
                                                    ) : (
                                                        <table className="w-full text-[10px] text-left border-collapse border border-stone-200">
                                                            <thead>
                                                                <tr className="bg-stone-50/50">
                                                                    {levelGradeCols.map((col) => (
                                                                    <th key={col.id} className="border border-stone-200 p-0.5 text-center uppercase text-[8px] text-stone-600 font-bold">{col.title}</th>
                                                                ))}
                                                                <th className="border border-stone-200 p-0.5 text-center uppercase text-[8px] text-stone-800 font-black bg-stone-200/50">Prom.</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr>
                                                                {levelGradeCols.map((col) => {
                                                                    let grade = safeGrades.find(g => g.id === `${col.id}_${student.id}_${safeLevel}`) || (isCurrentLevel ? safeGrades.find(g => g.columnId === col.id && g.studentId === student.id) : null);
                                                                    if (grade && grade.score) hasGrades = true;
                                                                    return (
                                                                        <td key={col.id} className="border border-stone-200 py-0.5 px-0.5 text-center font-bold text-stone-700 text-[8px]">
                                                                            {grade ? grade.score : "-"}
                                                                        </td>
                                                                    );
                                                                })}
                                                                <td className="border border-stone-200 py-0.5 px-0.5 text-center font-black text-stone-900 bg-stone-100/50 text-[9px]">
                                                                    {(() => {
                                                                        const scores = levelGradeCols.map(col => {
                                                                            let g = safeGrades.find(gr => gr.id === `${col.id}_${student.id}_${safeLevel}`) || (isCurrentLevel ? safeGrades.find(gr => gr.columnId === col.id && gr.studentId === student.id) : null);
                                                                            return g?.score;
                                                                        }).filter(s => s != null && !isNaN(s));
                                                                        if (scores.length === 0) return "-";
                                                                        const sum = scores.reduce((acc, curr) => acc + Number(curr), 0);
                                                                        return (sum / scores.length).toFixed(2);
                                                                    })()}
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                    )}
                                                    {!hasGrades && levelGradeCols.length > 0 && <p className="text-[9px] text-stone-400 italic mt-0.5">Sin registros de cursada.</p>}
                                                </div>

                                                {/* Mesa de Examen Final */}
                                                {safeMesasColumns.length > 0 && (
                                                    <div>
                                                        <h5 className="text-[9px] font-bold text-stone-500 uppercase mb-0.5 border-b border-stone-100 pb-0.5">Mesa de Examen Final</h5>
                                                        <table className="w-full text-[10px] text-left border-collapse border border-stone-200">
                                                            <thead>
                                                                <tr className="bg-stone-50/50">
                                                                    {safeMesasColumns.map((col) => (
                                                                        <th key={col.id} className="border border-stone-200 p-0.5 text-center uppercase text-[8px] text-stone-600 font-bold">{col.title}</th>
                                                                    ))}
                                                                    <th className="border border-stone-200 p-0.5 text-center uppercase text-[8px] text-stone-800 font-black bg-stone-200/50">Final</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                <tr>
                                                                    {safeMesasColumns.map((col) => {
                                                                        let grade = safeMesasGrades.find(g => g.id === `${col.id}_${student.id}_${safeLevel}`);
                                                                        if (!grade && isCurrentLevel) {
                                                                            grade = safeMesasGrades.find(g => g.id === `${col.id}_${student.id}`);
                                                                        }
                                                                        return (
                                                                            <td key={col.id} className="border border-stone-200 py-0.5 px-0.5 text-center font-bold text-stone-700 text-[10px]">
                                                                                {grade ? grade.score : "-"}
                                                                            </td>
                                                                        );
                                                                    })}
                                                                    <td className="border border-stone-200 py-0.5 px-0.5 text-center font-black text-stone-900 bg-stone-100 text-[11px]">
                                                                        {(() => {
                                                                            const scores = safeMesasColumns.map(col => {
                                                                                let g = safeMesasGrades.find(gr => gr.id === `${col.id}_${student.id}_${safeLevel}`);
                                                                                if (!g && isCurrentLevel) {
                                                                                    g = safeMesasGrades.find(gr => gr.id === `${col.id}_${student.id}`);
                                                                                }
                                                                                return g?.score;
                                                                            }).filter(s => s != null && !isNaN(s));
                                                                            if (scores.length === 0) return "-";
                                                                            const sum = scores.reduce((acc, curr) => acc + Number(curr), 0);
                                                                            return (sum / scores.length).toFixed(2);
                                                                        })()}
                                                                    </td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                                
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Signatures at the bottom */}
                        <div className="flex justify-around items-end pt-1 pb-1 mt-auto print:break-inside-avoid">
                            <div className="text-center w-40">
                                <div className="border-t border-stone-400 pt-0.5">
                                    <p className="text-[10px] font-bold text-stone-500 uppercase">Firma del Profesor</p>
                                </div>
                            </div>
                            <div className="text-center w-40">
                                <div className="border-t border-stone-400 pt-0.5">
                                    <p className="text-[10px] font-bold text-stone-500 uppercase">Firma de Dirección</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            );
        };

        return (
            <div className="fixed inset-0 bg-stone-900/80 z-[100] flex flex-col print:absolute print:bg-white print:inset-0">
                
                {/* Estilos para forzar el tamaño de página al imprimir */}
                <style>{`
                    @media print {
                        @page { size: A4 portrait; margin: 1cm; }
                    }
                `}</style>

                <div className="flex justify-end p-4 gap-4 bg-stone-900 shadow-xl no-print">
                    <button
                        onClick={() => window.print()}
                        className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-xl font-bold shadow-md transition-all flex items-center gap-2"
                    >
                        <i className="fas fa-print"></i> Imprimir Boletines
                    </button>
                    <button
                        onClick={onClose}
                        className="bg-stone-700 hover:bg-stone-600 text-white px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2"
                    >
                        <i className="fas fa-times"></i> Cerrar
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center print:overflow-visible print:p-0 print:block" id="boletin-print-area">
                    {pages.map((page, idx) => (
                        <Page key={idx} page={page} />
                    ))}
                    {pages.length === 0 && (
                        <div className="bg-white p-8 rounded-xl text-center">
                            <p className="text-stone-500 italic">No hay niveles registrados para este alumno.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    } catch (error) {
        return (
            <div className="fixed inset-0 bg-stone-900/80 z-[100] flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-xl max-w-2xl w-full text-center">
                    <h2 className="text-red-500 font-bold text-2xl mb-4">Error al renderizar</h2>
                    <p className="text-stone-600 mb-4">{error.message}</p>
                    <pre className="text-left bg-stone-100 p-4 rounded text-xs overflow-auto">{error.stack}</pre>
                    <button onClick={onClose} className="mt-6 bg-stone-800 text-white px-6 py-2 rounded-xl">Cerrar</button>
                </div>
            </div>
        );
    }
};

export default BoletinHistorialPreview;
