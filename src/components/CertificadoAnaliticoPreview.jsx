import React, { useEffect } from 'react';

const CertificadoAnaliticoPreview = ({
    student,
    sedeObj,
    mesasGrades,
    mesasColumns,
    configLevels,
    allLevels,
    onClose,
    profesorName
}) => {
    const studentMesasGrades = mesasGrades.filter((g) => g.studentId === student.id);
    
    const formatScore = (score) => {
        const s = parseFloat(score);
        if (isNaN(s)) return "";
        const map = {
            1: "Uno", 2: "Dos", 3: "Tres", 4: "Cuatro", 5: "Cinco",
            6: "Seis", 7: "Siete", 8: "Ocho", 9: "Nueve", 10: "Diez"
        };
        return map[s] ? ` (${map[s]})` : "";
    };

    useEffect(() => {
        const originalTitle = document.title;
        document.title = "IDeAr - Certificado Analítico";
        return () => {
            document.title = originalTitle;
        };
    }, []);

    const studentLevelLower = (
        (student.level || "") + " " +
        (student.taller || "") + " " +
        (student.promocionadoDe || "")
    ).toLowerCase();
    
    let type = "all";
    if (studentLevelLower.includes("infantil")) {
        type = "infantil";
    } else if (studentLevelLower.includes("instructorado") || studentLevelLower.includes("adultos")) {
        type = "instructorado";
    }

    const filteredLevels = configLevels.filter((l) => {
        const lvlLower = l.curso_nivel.toLowerCase();
        if (/^([123]|diploma)/i.test(lvlLower) && !lvlLower.includes("3er año superior")) {
            if (type === "infantil") return lvlLower.includes("infantil");
            if (type === "instructorado") return lvlLower.includes("instructorado");
            return true;
        }
        return false;
    });

    return (
        <div className="fixed inset-0 bg-stone-900/90 z-[110] flex flex-col print:absolute print:bg-white print:inset-0">
            <style>{`
                @media print {
                    @page { size: A4 portrait; margin: 0; }
                }
            `}</style>
            <div className="flex justify-end p-4 gap-4 bg-stone-900 shadow-xl no-print">
                <button
                    onClick={() => window.print()}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-xl font-bold shadow-md transition-all flex items-center gap-2"
                >
                    <i className="fas fa-print"></i> Imprimir Analítico
                </button>
                <button
                    onClick={onClose}
                    className="bg-stone-700 hover:bg-stone-600 text-white px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2"
                >
                    <i className="fas fa-times"></i> Cerrar
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 md:p-4 flex justify-center print:overflow-visible print:p-0 print:block">
                <div id="analitico-print-area" className="bg-white text-stone-900 p-2 max-w-[210mm] w-full mx-auto shadow-2xl relative min-h-[297mm] print:shadow-none print:m-0 print:max-w-none print:w-[210mm] print:px-[5mm] print:pt-[5mm] print:pb-[10mm] flex flex-col overflow-visible print:overflow-visible box-border">
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.10] print:opacity-[0.10] z-0">
                        <img src="/logo.png" alt="" className="w-[65%] max-w-[480px] object-contain grayscale" />
                    </div>
                    
                    <div className="relative z-10 flex flex-col flex-1 h-full justify-between">
                        <div className="flex justify-between items-center border-b border-stone-800 pb-0.5 mb-1 w-full gap-2">
                            <div className="flex items-center gap-2 w-full">
                                <img src="/logo.png" alt="IDeAr" className="h-12 print:h-10 object-contain" />
                                <div className="flex flex-col items-center justify-center flex-1">
                                    <p className="text-[9px] font-bold text-stone-500 mt-0.5 uppercase text-center">
                                        Inscripto en el Servicio Provincial de Enseñanza Privada de Misiones (SPEPM) bajo el Registro Nº 213/21
                                    </p>
                                    <p className="text-[8px] font-bold text-stone-500 mt-0.5 uppercase text-center">
                                        Certificación emitida según el Plan de Estudios autorizado por el SPEPM para la especialidad en Danzas Folklóricas Argentinas
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="border-b border-stone-800 pb-0.5 mb-1 text-center mt-0.5">
                            <h2 className="text-[13px] font-black uppercase tracking-widest text-stone-900">
                                Certificado Analítico de Estudios
                            </h2>
                        </div>

                        <div className="border border-stone-800 rounded-lg p-1.5 print:p-1 flex flex-col gap-0 w-full bg-stone-50/50">
                            <div className="grid grid-cols-2 gap-y-0.5 text-[9px]">
                                <div>
                                    <p><span className="font-bold text-stone-600 mr-2">Establecimiento:</span> <span className="font-bold text-stone-900">IDeAr (Instituto para el Desarrollo del Arte)</span></p>
                                    <p><span className="font-bold text-stone-600 mr-2">Alumno/a:</span> <span className="font-black text-stone-900 uppercase text-[10px]">{student.name}</span></p>
                                    <p><span className="font-bold text-stone-600 mr-2">Curso de Egreso / Actual:</span> <span className="font-bold text-stone-900">{student.level || student.taller}</span></p>
                                </div>
                                <div>
                                    <p><span className="font-bold text-stone-600 mr-2">Sede:</span> <span className="font-bold text-stone-900">{sedeObj?.nombre || student.sede}</span></p>
                                    <p><span className="font-bold text-stone-600 mr-2">Documento (D.N.I.):</span> <span className="font-bold text-stone-900">{student.dni}</span></p>
                                    <p><span className="font-bold text-stone-600 mr-2">Ciclo Lectivo:</span> <span className="font-bold text-stone-900">{new Date().getFullYear()}</span></p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 print:gap-x-4 print:gap-y-0 mt-1">
                            {filteredLevels.map((lvl) => {
                                const levelName = lvl.curso_nivel;
                                const safeLevel = levelName.replace(/[.#$\[\]\/]/g, "_");
                                
                                return (
                                    <React.Fragment key={levelName}>
                                        <div className="print:break-inside-avoid">
                                            <h3 className="font-black text-[10px] uppercase tracking-wider text-stone-900 mb-0">{levelName}</h3>
                                            <table className="w-full text-left border-collapse border border-stone-800">
                                                <thead>
                                                    <tr className="bg-stone-100">
                                                        <th className="border border-stone-800 p-0.5 px-1 text-[9px] font-bold text-stone-900">Espacio Curricular</th>
                                                        <th className="border border-stone-800 p-0.5 px-1 text-[9px] font-bold text-stone-900 text-center w-12">Calif.</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {mesasColumns.map((col) => {
                                                        let grade = studentMesasGrades.find(g => g.id === `${col.id}_${student.id}_${safeLevel}`);
                                                        if (!grade && (student.level === levelName || student.promocionadoDe === levelName)) {
                                                            grade = studentMesasGrades.find(g => g.id === `${col.id}_${student.id}`);
                                                        }
                                                        
                                                        let displayScore = "—";
                                                        if (grade && grade.score !== undefined && grade.score !== "") {
                                                            displayScore = `${grade.score}${formatScore(grade.score)}`;
                                                        }

                                                        return (
                                                            <tr key={col.id}>
                                                                <td className="border border-stone-800 py-[1px] px-1 text-[8px] text-stone-800 font-medium">{col.title}</td>
                                                                <td className="border border-stone-800 py-[1px] px-1 text-[8px] text-center font-bold text-stone-900">{displayScore}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>

                                        {levelName.toLowerCase().includes("diploma elemental") && (
                                            <React.Fragment key={`${levelName}-edi-otorga`}>
                                                <div className="print:break-inside-avoid mt-1">
                                                    <h3 className="font-black text-[10px] uppercase tracking-wider text-stone-900 mb-0">E.D.I. (Espacio Def. Institucional)</h3>
                                                    <table className="w-full text-left border-collapse border border-stone-800">
                                                        <thead>
                                                            <tr className="bg-stone-100">
                                                                <th className="border border-stone-800 p-0.5 px-1 text-[9px] font-bold text-stone-900">Materia / Taller</th>
                                                                <th className="border border-stone-800 p-0.5 px-1 text-[9px] font-bold text-stone-900 text-center w-12">Calif.</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {[1, 2, 3, 4, 5].map((i) => (
                                                                <tr key={i}>
                                                                    <td className="border border-stone-800 py-[1px] px-1 text-[8px] text-stone-800 font-medium h-[12px] text-center">—</td>
                                                                    <td className="border border-stone-800 py-[1px] px-1 text-[8px] text-center font-bold text-stone-900 h-[12px]">—</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <div className="print:break-inside-avoid col-span-2 bg-stone-100 border border-stone-800 p-1 mt-1 mb-1 text-center shadow-sm">
                                                    <h3 className="font-black text-[11px] uppercase tracking-widest text-stone-900">OTORGA CERTIFICADO DE: MAESTRO ELEMENTAL</h3>
                                                </div>
                                            </React.Fragment>
                                        )}

                                        {levelName.toLowerCase().includes("diploma superior") && (
                                            <React.Fragment key={`${levelName}-edi-otorga-sup`}>
                                                <div className="print:break-inside-avoid mt-1">
                                                    <h3 className="font-black text-[10px] uppercase tracking-wider text-stone-900 mb-0">E.D.I. (Espacio Def. Institucional)</h3>
                                                    <table className="w-full text-left border-collapse border border-stone-800">
                                                        <thead>
                                                            <tr className="bg-stone-100">
                                                                <th className="border border-stone-800 p-0.5 px-1 text-[9px] font-bold text-stone-900">Materia / Taller</th>
                                                                <th className="border border-stone-800 p-0.5 px-1 text-[9px] font-bold text-stone-900 text-center w-12">Calif.</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {[1, 2, 3, 4, 5].map((i) => (
                                                                <tr key={i}>
                                                                    <td className="border border-stone-800 py-[1px] px-1 text-[8px] text-stone-800 font-medium h-[12px] text-center">—</td>
                                                                    <td className="border border-stone-800 py-[1px] px-1 text-[8px] text-center font-bold text-stone-900 h-[12px]">—</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <div className="print:break-inside-avoid col-span-2 bg-stone-100 border border-stone-800 p-1 mt-1 text-center shadow-sm">
                                                    <h3 className="font-black text-[11px] uppercase tracking-widest text-stone-900">OTORGA CERTIFICADO DE: INSTRUCTOR SUPERIOR</h3>
                                                </div>
                                                <div className="print:break-inside-avoid col-span-2 h-4"></div>
                                            </React.Fragment>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>

                        <div className="mt-auto pt-1 print:pt-1 print:break-inside-avoid">
                            <div className="flex gap-3 items-end w-full">
                                <div className="flex-1 flex flex-col justify-end pb-1">
                                    <p className="text-[8px] font-medium text-stone-800 italic mb-1">
                                        El presente certificado acredita la trayectoria académica del estudiante registrada ante las autoridades de esta institución educativa.
                                    </p>
                                    <div className="text-[9px] font-bold text-stone-800 leading-relaxed">
                                        <p>Registrado en el Libro de Títulos y Certificados Nº ______</p>
                                        <p>Folio Nº ______</p>
                                        <p>Acta Nº ______</p>
                                    </div>
                                </div>
                                <div className="border border-stone-800 rounded-lg text-center print:break-inside-avoid" style={{width: '80mm', height: '40mm', minWidth: '80mm'}}>
                                    <div className="flex justify-around items-end h-full pb-1 px-1">
                                        <div className="text-center w-16">
                                            <div className="border-t-2 border-stone-800 mx-auto"></div>
                                            <p className="text-[8px] font-bold text-stone-900 uppercase mt-0.5">Sello Inst.</p>
                                        </div>
                                        <div className="text-center w-24">
                                            <div className="border-t-2 border-stone-800 mx-auto"></div>
                                            <p className="text-[9px] font-bold text-stone-900 uppercase mt-0.5">Firma de Dirección</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default CertificadoAnaliticoPreview;
