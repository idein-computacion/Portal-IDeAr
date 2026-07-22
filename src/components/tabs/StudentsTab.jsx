import React from 'react';

/**
 * Pestaña de Directorio de Estudiantes.
 * Extraído de App.jsx (líneas 3851–3988).
 */
const StudentsTab = ({
    filteredStudents,
    studentSearch,
    setStudentSearch,
    studentNivelFilter,
    setStudentNivelFilter,
    alumnoStatusTab,
    setAlumnoStatusTab,
    configLevels,
    studentDebts,
    setSelectedStudentDetail,
    setEditingStudent,
    setShowStudentModal,
    handleToggleStudentStatus,
    handleDeleteStudent
}) => {
    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
                
                {/* Cabecera y Filtros */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-stone-800">Directorio de Estudiantes</h3>
                        <p className="text-sm text-stone-400">Total registrados: {filteredStudents.length}</p>
                    </div>
                    <button 
                        onClick={() => {
                            setEditingStudent(null);
                            setShowStudentModal(true);
                        }}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 border-0 cursor-pointer"
                    >
                        <i className="fas fa-user-plus"></i> Registrar Alumno
                    </button>
                </div>

                {/* Filtros */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <input 
                        type="text"
                        placeholder="Buscar por Nombre o DNI..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        className="p-3 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-amber-500 text-stone-800"
                    />

                    <select 
                        value={studentNivelFilter}
                        onChange={(e) => setStudentNivelFilter(e.target.value)}
                        className="p-3 rounded-xl border border-stone-200 text-sm outline-none bg-stone-50 font-semibold text-stone-600"
                    >
                        <option value="Todos">Todos los Niveles</option>
                        {configLevels.map(c => <option key={c.id} value={c.curso_nivel}>{c.curso_nivel}</option>)}
                    </select>
                    
                    <select
                        value={alumnoStatusTab}
                        onChange={(e) => setAlumnoStatusTab(e.target.value)}
                        className="p-3 rounded-xl border border-stone-200 text-sm outline-none bg-stone-50 font-semibold text-stone-600"
                    >
                        <option value="activos">Alumnos Activos</option>
                        <option value="bajas">Alumnos en Baja (Bajas)</option>
                        <option value="todos">Todos los Alumnos</option>
                    </select>
                </div>

                {/* Directorio de Cards / Tabla */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-stone-100 text-xs text-stone-400 font-bold uppercase">
                                <th className="py-3 px-4">Alumno</th>
                                <th className="py-3 px-4 text-right">Saldo Deudor</th>
                                <th className="py-3 px-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-50">
                            {filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan="3" className="text-center py-8 text-stone-400 text-sm">No se encontraron alumnos con los filtros seleccionados</td>
                                </tr>
                            ) : (
                                filteredStudents.map(student => (
                                    <tr key={student.id} className="hover:bg-stone-50/50 transition-colors text-sm text-stone-800">
                                        <td className="py-3.5 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-stone-100 text-stone-600 font-bold flex items-center justify-center text-xs">
                                                    {student.name.charAt(0)}
                                                </div>
                                                <span className="font-bold text-stone-800">{student.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                            <span className={`font-bold ${studentDebts[student.id] > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                ${studentDebts[student.id]?.toLocaleString() || 0}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 flex items-center justify-center gap-2">
                                            <button 
                                                onClick={() => setSelectedStudentDetail(student)}
                                                title="Ver Ficha Completa"
                                                className="p-1.5 bg-stone-100 hover:bg-amber-500 hover:text-white text-stone-600 rounded-lg transition-all border-0 cursor-pointer"
                                            >
                                                <i className="fas fa-eye"></i>
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setEditingStudent(student);
                                                    setShowStudentModal(true);
                                                }}
                                                title="Editar Perfil"
                                                className="p-1.5 bg-stone-100 hover:bg-amber-500 hover:text-white text-stone-600 rounded-lg transition-all border-0 cursor-pointer"
                                            >
                                                <i className="fas fa-edit"></i>
                                            </button>
                                            {student.active ? (
                                                <button 
                                                    onClick={() => handleToggleStudentStatus(student.id, false)}
                                                    title="Dar de Baja (Desactivar)"
                                                    className="p-1.5 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-600 rounded-lg transition-all border-0 cursor-pointer"
                                                >
                                                    <i className="fas fa-user-slash text-sm"></i>
                                                </button>
                                            ) : (
                                                <div className="flex gap-1">
                                                    <button 
                                                        onClick={() => handleToggleStudentStatus(student.id, true)}
                                                        title="Reincorporar (Activar)"
                                                        className="p-1.5 bg-emerald-50 hover:bg-emerald-500 hover:text-white text-emerald-600 rounded-lg transition-all border-0 cursor-pointer"
                                                    >
                                                        <i className="fas fa-user-plus text-sm"></i>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteStudent(student.id)}
                                                        title="Eliminar Definitivamente"
                                                        className="p-1.5 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-600 rounded-lg transition-all border-0 cursor-pointer"
                                                    >
                                                        <i className="fas fa-trash-alt text-sm"></i>
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    );
};

export default StudentsTab;
