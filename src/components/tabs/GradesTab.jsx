import React from 'react';

/**
 * Pestaña de Calificaciones (Cursada y Mesas de Examen).
 * Extraído de App.jsx (líneas 3195–3592).
 */
const GradesTab = ({
    isDirector,
    tipoEvaluacion,
    setTipoEvaluacion,
    gradesNivel,
    setGradesNivel,
    configLevels,
    studentsForGrades,
    currentLevelColumns,
    handleEditGradeColumn,
    handleAddGradeColumn,
    grades,
    handleUpdateGrade,
    mesasNivel,
    setMesasNivel,
    mesasSede,
    setMesasSede,
    sedes,
    studentsForMesas,
    currentMesasColumns,
    handleEditMesasColumn,
    handleAddMesasColumn,
    mesasGrades,
    handleToggleMesasStudent,
    handleUpdateMesasGrade,
    handleUndoPromoteStudent,
    handlePromoteStudent,
    setHistorialStudent,
    setShowHistorialModal,
    setShowBoletin,
    NIVELES
}) => {
    return (
        <div className="space-y-6 animate-fadeIn">
            {isDirector && (
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 flex justify-center no-print">
                    <div className="flex bg-stone-100 p-1 rounded-xl gap-1">
                        <button
                            onClick={() => setTipoEvaluacion('cursada')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all border-0 cursor-pointer ${
                                tipoEvaluacion === 'cursada' 
                                ? 'bg-white text-amber-600 shadow-sm' 
                                : 'text-stone-500 hover:text-stone-700'
                            }`}
                        >
                            <i className="fas fa-star mr-2"></i> En Curso
                        </button>
                        <button
                            onClick={() => setTipoEvaluacion('mesas')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all border-0 cursor-pointer ${
                                tipoEvaluacion === 'mesas' 
                                ? 'bg-white text-amber-600 shadow-sm' 
                                : 'text-stone-500 hover:text-stone-700'
                            }`}
                        >
                            <i className="fas fa-gavel mr-2"></i> Mesas de Examen
                        </button>
                    </div>
                </div>
            )}

            {tipoEvaluacion === "cursada" && (
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <h3 className="text-xl font-bold text-stone-800 flex items-center gap-2">
                            <i className="fas fa-star text-amber-500"></i> Calificaciones (En Curso)
                        </h3>
                    </div>

                    {/* Selector de Filtros */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Nivel / Curso</label>
                            <select 
                                value={gradesNivel} 
                                onChange={(e) => setGradesNivel(e.target.value)}
                                className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-stone-50 font-medium text-stone-700"
                            >
                                <option value="Todos">Todos los cursos</option>
                                {configLevels.map(c => <option key={c.id} value={c.curso_nivel}>{c.curso_nivel}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-t border-b border-stone-100 mb-6">
                        <div className="text-sm font-semibold text-stone-600">
                            Alumnos en este curso: <span className="text-amber-600 font-bold">{studentsForGrades.length}</span>
                        </div>
                    </div>

                    {/* Grilla de Calificaciones */}
                    {studentsForGrades.length === 0 ? (
                        <div className="text-center py-12 text-stone-400">
                            <i className="fas fa-graduation-cap text-4xl mb-3"></i>
                            <p className="font-medium">No hay alumnos registrados en este nivel</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto bg-white border border-stone-100 rounded-xl shadow-inner pb-12">
                            <table className="w-full text-sm text-left whitespace-nowrap">
                                <thead className="text-xs text-stone-500 bg-stone-50 border-b border-stone-100 uppercase font-bold">
                                    <tr>
                                        <th className="px-4 py-3 sticky left-0 bg-stone-50 z-20 border-r border-stone-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">Estudiante</th>
                                        {currentLevelColumns.map((col, idx) => (
                                            <th key={col.id} className="px-4 py-3 text-center border-r border-stone-100 min-w-[100px] group/col">
                                                <div className="flex flex-col items-center relative">
                                                    <span className="text-[10px] text-stone-400 mb-1">Nota {idx + 1}</span>
                                                    <span className="text-xs text-stone-700">{col.title}</span>
                                                    <button 
                                                        onClick={() => handleEditGradeColumn(col.id, col.title)}
                                                        className="absolute -top-1 -right-2 w-5 h-5 bg-stone-100 hover:bg-amber-100 text-stone-400 hover:text-amber-600 rounded flex items-center justify-center opacity-0 group-hover/col:opacity-100 transition-all cursor-pointer shadow-sm border border-stone-200"
                                                        title="Editar o eliminar columna"
                                                    >
                                                        <i className="fas fa-pencil-alt text-[10px]"></i>
                                                    </button>
                                                </div>
                                            </th>
                                        ))}
                                        <th className="px-4 py-3 border-r border-stone-100 text-center min-w-[60px]">
                                            <button 
                                                onClick={handleAddGradeColumn}
                                                className="w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-colors mx-auto shadow-sm border-0 cursor-pointer"
                                                title="Añadir Evaluación"
                                            >
                                                <i className="fas fa-plus"></i>
                                            </button>
                                        </th>
                                        <th className="px-4 py-3 text-center border-l-2 border-stone-200 bg-stone-100 text-stone-800 sticky right-0 z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.02)]">Prom. Anual</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {studentsForGrades.map(student => {
                                        let totalScore = 0;
                                        let countScore = 0;
                                        
                                        return (
                                            <tr key={student.id} className="hover:bg-amber-50/30 transition-colors group">
                                                <td className="px-4 py-3 font-semibold text-stone-700 sticky left-0 bg-white group-hover:bg-amber-50/80 z-10 border-r border-stone-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                                                    <div className="text-sm uppercase">{student.name}</div>
                                                    <div className="text-[10px] text-stone-400 font-normal mt-0.5">DNI {student.dni || '-'}</div>
                                                </td>
                                                {currentLevelColumns.map(col => {
                                                    const grade = grades.find(g => g.studentId === student.id && g.columnId === col.id);
                                                    const scoreVal = grade ? grade.score : "";
                                                    if (grade && grade.score) {
                                                        totalScore += grade.score;
                                                        countScore++;
                                                    }
                                                    
                                                    let colorClass = "border-stone-200 text-stone-700 bg-transparent";
                                                    if (scoreVal !== "") {
                                                        const s = parseFloat(scoreVal);
                                                        if (s >= 7) colorClass = "border-emerald-400 text-emerald-700 bg-emerald-50";
                                                        else if (s >= 4) colorClass = "border-amber-400 text-amber-700 bg-amber-50";
                                                        else colorClass = "border-rose-400 text-rose-700 bg-rose-50";
                                                    }

                                                    return (
                                                        <td key={col.id} className="px-4 py-3 border-r border-stone-100 text-center">
                                                            <input
                                                                type="text"
                                                                defaultValue={scoreVal}
                                                                onBlur={(e) => {
                                                                    if (e.target.value !== String(scoreVal)) {
                                                                        handleUpdateGrade(student.id, col.id, e.target.value);
                                                                    }
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        e.target.blur();
                                                                    }
                                                                }}
                                                                className={`w-16 h-8 text-center font-bold text-sm rounded-full border outline-none focus:ring-2 focus:ring-amber-500/30 transition-colors mx-auto block ${colorClass}`}
                                                                placeholder="-"
                                                            />
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-4 py-3 border-r border-stone-100 bg-stone-50/30 text-center text-stone-800"></td>
                                                
                                                <td className="px-4 py-3 text-center font-bold text-stone-800 border-l-2 border-stone-200 bg-stone-50 sticky right-0 z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.02)]">
                                                    {countScore > 0 ? (totalScore / countScore).toFixed(2) : '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {tipoEvaluacion === "mesas" && isDirector && (
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <h3 className="text-xl font-bold text-stone-800 flex items-center gap-2">
                            <i className="fas fa-gavel text-amber-500"></i> Mesas de Examen
                        </h3>
                    </div>

                    {/* Selector de Filtros */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Nivel / Curso a Evaluar</label>
                            <select 
                                value={mesasNivel} 
                                onChange={(e) => setMesasNivel(e.target.value)}
                                className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-stone-50 font-medium text-stone-700"
                            >
                                <option value="Todos">Todos los niveles</option>
                                {configLevels.map(c => <option key={c.id} value={c.curso_nivel}>{c.curso_nivel}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Filtrar por Sede</label>
                            <select 
                                value={mesasSede} 
                                onChange={(e) => setMesasSede(e.target.value)}
                                className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-stone-50 font-medium text-stone-700"
                            >
                                <option value="Todas">Todas las sedes</option>
                                {sedes.map(s => <option key={s.id} value={s.nombre}>{s.nombre}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-t border-b border-stone-100 mb-6">
                        <div className="text-sm font-semibold text-stone-600">
                            Alumnos listados: <span className="text-amber-600 font-bold">{studentsForMesas.length}</span>
                        </div>
                    </div>

                    {/* Grilla de Mesas de Examen */}
                    {studentsForMesas.length === 0 ? (
                        <div className="text-center py-12 text-stone-400">
                            <i className="fas fa-users-slash text-4xl mb-3"></i>
                            <p className="font-medium">No hay alumnos que coincidan con estos filtros</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto bg-white border border-stone-100 rounded-xl shadow-inner pb-12">
                            <table className="w-full text-sm text-left whitespace-nowrap">
                                <thead className="text-xs text-stone-500 bg-stone-50 border-b border-stone-100 uppercase font-bold">
                                    <tr>
                                        <th className="px-2 py-2 sticky left-0 bg-stone-50 z-20 border-r border-stone-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)] min-w-[180px]">Estudiante</th>
                                        {currentMesasColumns.map((col, idx) => (
                                            <th key={col.id} className="px-2 py-2 text-center border-r border-stone-100 min-w-[80px] group/col">
                                                <div className="flex flex-col items-center relative">
                                                    <span className="text-[10px] text-stone-400 mb-0.5">N°{idx + 1}</span>
                                                    <span className="text-[10px] text-stone-700 font-bold">{col.title}</span>
                                                    <button 
                                                        onClick={() => handleEditMesasColumn(col.id, col.title)}
                                                        className="absolute -top-1 -right-2 w-4 h-4 bg-stone-100 hover:bg-amber-100 text-stone-400 hover:text-amber-600 rounded flex items-center justify-center opacity-0 group-hover/col:opacity-100 transition-all cursor-pointer shadow-sm border border-stone-200"
                                                        title="Editar o eliminar columna"
                                                    >
                                                        <i className="fas fa-pencil-alt text-[8px]"></i>
                                                    </button>
                                                </div>
                                            </th>
                                        ))}
                                        <th className="px-2 py-2 border-r border-stone-100 text-center w-10">
                                            <button 
                                                onClick={handleAddMesasColumn}
                                                className="w-6 h-6 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-colors mx-auto shadow-sm border-0 cursor-pointer"
                                                title="Añadir Evaluación"
                                            >
                                                <i className="fas fa-plus text-[9px]"></i>
                                            </button>
                                        </th>
                                        <th className="px-2 py-2 text-center border-l-2 border-stone-200 bg-stone-100 text-stone-800 min-w-[60px]">Prom.</th>
                                        <th className="px-2 py-2 text-center bg-stone-50 min-w-[130px]">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {studentsForMesas.map(student => {
                                        let totalScore = 0;
                                        let countScore = 0;
                                        
                                        const currentViewLevel = mesasNivel !== "Todos" ? mesasNivel : (student.level || student.taller || "Desconocido");
                                        const safeLevel = currentViewLevel.replace(/[.#$\[\]\/]/g, "_");
                                        
                                        const shouldAllowFallback = !student.promocionadoDe || currentViewLevel === student.promocionadoDe;
                                        
                                        let statusRecord = mesasGrades.find(g => g.id === `status_${student.id}_${safeLevel}`);
                                        if (!statusRecord && shouldAllowFallback) statusRecord = mesasGrades.find(g => g.id === `status_${student.id}`);
                                        const isAbsent = statusRecord ? statusRecord.isAbsent : false;
                                        
                                        return (
                                            <tr key={student.id} className={`hover:bg-amber-50/30 transition-colors group ${isAbsent ? 'opacity-50 grayscale' : ''} ${student.promocionadoDe ? 'bg-emerald-50' : ''}`}>
                                                <td className={`px-2 py-2 font-semibold text-stone-700 sticky left-0 group-hover:bg-amber-50/80 z-10 border-r border-stone-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)] ${student.promocionadoDe ? 'bg-emerald-50' : 'bg-white'}`}>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleToggleMesasStudent(student.id, isAbsent, safeLevel)}
                                                            className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center transition-colors shadow-sm border-0 cursor-pointer ${
                                                                isAbsent 
                                                                    ? 'bg-rose-100 text-rose-600 border border-rose-200 hover:bg-rose-200' 
                                                                    : 'bg-emerald-100 text-emerald-600 border border-emerald-200 hover:bg-emerald-200'
                                                            }`}
                                                            title={isAbsent ? "Marcar como que RINDE" : "Marcar como que NO RINDE"}
                                                        >
                                                            <i className={`fas ${isAbsent ? 'fa-times' : 'fa-check'} text-[10px]`}></i>
                                                        </button>
                                                        <div>
                                                            <div className="text-xs font-bold uppercase flex items-center gap-1 text-stone-800">
                                                                {student.name}
                                                                {student.promocionadoDe && (
                                                                    <span className="text-[9px] text-emerald-600 font-bold bg-emerald-100 px-1 py-0.5 rounded normal-case shadow-sm border border-emerald-200">
                                                                        Promovido a {student.level}
                                                                    </span>
                                                                )}
                                                                {mesasGrades.find(g => g.id === `inscripcion_${student.id}_${safeLevel}`) && (
                                                                    <span className="text-[8px] text-white font-black bg-emerald-500 px-1.5 py-0.5 rounded-full normal-case shadow-sm flex items-center gap-0.5">
                                                                        <i className="fas fa-check text-[6px]"></i> Inscripto
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-1 mt-0.5">
                                                                <span className="text-[9px] text-stone-400">DNI {student.dni || '-'}</span>
                                                                {student.level && (
                                                                    <span className="text-[8px] bg-amber-50 text-amber-600 border border-amber-100 px-1 py-0.5 rounded font-bold">{student.level}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                {currentMesasColumns.map(col => {
                                                    let grade = mesasGrades.find(g => g.id === `${col.id}_${student.id}_${safeLevel}`);
                                                    if (!grade && shouldAllowFallback) grade = mesasGrades.find(g => g.id === `${col.id}_${student.id}`);
                                                    const scoreVal = grade ? grade.score : "";
                                                    if (grade && grade.score && !isAbsent) {
                                                        totalScore += grade.score;
                                                        countScore++;
                                                    }
                                                    
                                                    let colorClass = "border-stone-200 text-stone-700 bg-transparent";
                                                    if (scoreVal !== "") {
                                                        const s = parseFloat(scoreVal);
                                                        if (s >= 7) colorClass = "border-emerald-400 text-emerald-700 bg-emerald-50";
                                                        else if (s >= 4) colorClass = "border-amber-400 text-amber-700 bg-amber-50";
                                                        else colorClass = "border-rose-400 text-rose-700 bg-rose-50";
                                                    }

                                                    return (
                                                        <td key={col.id} className="px-2 py-2 border-r border-stone-100 text-center">
                                                            <input
                                                                type="number"
                                                                inputMode="decimal"
                                                                defaultValue={scoreVal}
                                                                disabled={isAbsent}
                                                                onBlur={(e) => {
                                                                    if (e.target.value !== String(scoreVal)) {
                                                                        handleUpdateMesasGrade(student.id, col.id, e.target.value, safeLevel);
                                                                    }
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        e.target.blur();
                                                                    }
                                                                }}
                                                                className={`w-12 h-7 text-center font-bold text-xs rounded-lg border outline-none focus:ring-2 focus:ring-amber-500/30 transition-colors mx-auto block ${colorClass}`}
                                                                placeholder="-"
                                                            />
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-2 py-2 border-r border-stone-100 bg-stone-50/20"></td>
                                                <td className="px-2 py-2 text-center font-black text-stone-900 border-l-2 border-stone-200 bg-stone-50">
                                                    {countScore > 0 ? (
                                                        <span className={`inline-flex items-center justify-center w-11 h-7 rounded-lg text-xs font-black border-2 ${
                                                            (totalScore/countScore) >= 7 ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                                                            (totalScore/countScore) >= 4 ? 'bg-amber-50 text-amber-800 border-amber-300' :
                                                            'bg-rose-50 text-rose-800 border-rose-300'
                                                        }`}>{(totalScore / countScore).toFixed(1)}</span>
                                                    ) : '-'}
                                                </td>
                                                <td className="px-2 py-2 text-center bg-white">
                                                    <div className="flex items-center justify-center gap-1">
                                                        {student.promocionadoDe ? (
                                                            <>
                                                                <div className="bg-emerald-600 text-white font-bold py-1 px-2 rounded-lg text-[9px] shadow-sm flex items-center gap-1 whitespace-nowrap cursor-default" title="Alumno promovido">
                                                                    <i className="fas fa-check-circle"></i>
                                                                    <span>Promocionado</span>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleUndoPromoteStudent(student)}
                                                                    className="bg-rose-100 hover:bg-rose-200 text-rose-600 border border-rose-200 font-bold py-1 px-2 rounded-lg text-[9px] transition-all shadow-sm flex items-center justify-center whitespace-nowrap border-0 cursor-pointer"
                                                                    title="Deshacer Promoción"
                                                                >
                                                                    <i className="fas fa-undo"></i>
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button
                                                                onClick={() => handlePromoteStudent(student)}
                                                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded-lg text-[9px] transition-all shadow-sm flex items-center gap-1 whitespace-nowrap border-0 cursor-pointer"
                                                                title="Promocionar de Nivel"
                                                            >
                                                                <i className="fas fa-level-up-alt"></i>
                                                                <span>Promocionar</span>
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => {
                                                                setHistorialStudent(student);
                                                                setShowHistorialModal(true);
                                                            }}
                                                            className="bg-amber-100 hover:bg-amber-200 text-amber-700 font-bold py-1 px-2 rounded-lg text-[9px] transition-all shadow-sm flex items-center gap-1 whitespace-nowrap border-0 cursor-pointer"
                                                            title="Historial de Años Previos"
                                                        >
                                                            <i className="fas fa-history"></i>
                                                            <span>Historial</span>
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setBoletinStudent(student);
                                                                setShowBoletin(true);
                                                            }}
                                                            className="bg-stone-700 hover:bg-stone-900 text-white font-bold py-1 px-2 rounded-lg text-[9px] transition-all shadow-sm flex items-center gap-1 whitespace-nowrap border-0 cursor-pointer"
                                                            title="Generar Boletín"
                                                        >
                                                            <i className="fas fa-file-invoice"></i>
                                                            <span>Boletín</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default GradesTab;
