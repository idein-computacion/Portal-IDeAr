import React from 'react';

/**
 * Modal Crear/Editar Alumno.
 * Extraído de App.jsx (líneas 4026–4235).
 */
const StudentModal = ({
    editingStudent,
    globalSede,
    sedes,
    configLevels,
    NIVELES,
    students,
    modalLevel,
    modalCuota,
    setModalCuota,
    modalInscripcion,
    setModalInscripcion,
    modalActive,
    setModalActive,
    modalFechaBaja,
    setModalFechaBaja,
    handleLevelChangeInModal,
    handleSaveStudent,
    onClose,
    setEditingStudent,
    addNotification
}) => {
    return (
        <div className="fixed inset-0 bg-stone-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn no-print">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-stone-800">
                        {editingStudent ? "Editar Perfil del Alumno" : "Registrar Alumno Nuevo"}
                    </h3>
                    <button 
                        onClick={onClose}
                        className="p-1 text-stone-400 hover:text-stone-600"
                    >
                        <i className="fas fa-times text-lg"></i>
                    </button>
                </div>

                <form key={editingStudent ? editingStudent.id : 'new'} onSubmit={handleSaveStudent} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Apellido y Nombre</label>
                        <input 
                            type="text" 
                            name="name"
                            defaultValue={editingStudent?.name || ""}
                            className="w-full p-3 rounded-xl border border-stone-200 outline-none bg-stone-50 font-semibold"
                            required 
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">DNI del Alumno</label>
                            <input 
                                type="text" 
                                name="dni"
                                defaultValue={editingStudent?.dni || ""}
                                onChange={(e) => {
                                    if (!editingStudent) {
                                        const val = e.target.value.trim();
                                        if (val.length >= 7) {
                                            const found = students.find(s => s.dni === val);
                                            if (found) {
                                                setEditingStudent(found);
                                                setModalActive(found.active !== false);
                                                setModalFechaBaja(found.fecha_baja || "");
                                                addNotification(`Estudiante ${found.name} encontrado en el historial. Sus datos han sido cargados.`, "info");
                                            }
                                        }
                                    }
                                }}
                                className={`w-full p-3 rounded-xl border border-stone-200 outline-none focus:border-amber-500 transition-colors ${editingStudent ? 'bg-stone-100 text-stone-400 cursor-not-allowed' : 'bg-stone-50 text-stone-850'}`}
                                required 
                                readOnly={!!editingStudent}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Teléfono de Contacto</label>
                            <input 
                                type="text" 
                                name="phone"
                                defaultValue={editingStudent?.phone || ""}
                                className="w-full p-3 rounded-xl border border-stone-200 outline-none bg-stone-50"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Sede</label>
                            <select 
                                name="sede"
                                defaultValue={editingStudent?.sede || globalSede}
                                className="w-full p-3 rounded-xl border border-stone-200 outline-none bg-stone-50 font-semibold"
                            >
                                {sedes.map(s => <option key={s.nombre} value={s.nombre}>{s.nombre}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Nivel / Curso</label>
                            <select 
                                name="level"
                                value={modalLevel}
                                onChange={(e) => handleLevelChangeInModal(e.target.value)}
                                className="w-full p-3 rounded-xl border border-stone-200 outline-none bg-stone-50 font-semibold"
                            >
                                {[...configLevels].sort((a, b) => NIVELES.indexOf(a.curso_nivel) - NIVELES.indexOf(b.curso_nivel)).map(c => <option key={c.id} value={c.curso_nivel}>{c.curso_nivel}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Email del Alumno/Tutor</label>
                            <input 
                                type="email" 
                                name="email"
                                defaultValue={editingStudent?.email || ""}
                                className="w-full p-3 rounded-xl border border-stone-200 outline-none bg-stone-50"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Fecha de Inscripción *</label>
                            <input 
                                type="date" 
                                name="fecha_inicio"
                                defaultValue={editingStudent?.fecha_inicio || ""}
                                required
                                className="w-full p-3 rounded-xl border border-stone-200 outline-none bg-stone-50 font-semibold"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Tutor Responsable</label>
                            <input 
                                type="text" 
                                name="tutor"
                                defaultValue={editingStudent?.tutor || ""}
                                className="w-full p-3 rounded-xl border border-stone-200 outline-none bg-stone-50"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Domicilio</label>
                            <input 
                                type="text" 
                                name="address"
                                defaultValue={editingStudent?.address || ""}
                                className="w-full p-3 rounded-xl border border-stone-200 outline-none bg-stone-50"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Cuota Mensual ($)</label>
                            <input 
                                type="number" 
                                name="cuotaOverride"
                                value={modalCuota}
                                onChange={(e) => setModalCuota(e.target.value)}
                                className="w-full p-3 rounded-xl border border-stone-200 outline-none bg-amber-50 font-semibold"
                            />
                            <p className="text-[10px] text-stone-400 mt-1">Modificar si es un arancel personalizado</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Inscripción ($)</label>
                            <input 
                                type="number" 
                                name="inscripcionOverride"
                                value={modalInscripcion}
                                onChange={(e) => setModalInscripcion(e.target.value)}
                                className="w-full p-3 rounded-xl border border-stone-200 outline-none bg-amber-50 font-semibold"
                            />
                            <p className="text-[10px] text-stone-400 mt-1">Modificar si es una matrícula personalizada</p>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-stone-100 space-y-3">
                        <div className="flex items-center gap-3">
                            <input 
                                type="checkbox" 
                                name="active" 
                                id="chk-active"
                                checked={modalActive}
                                onChange={(e) => {
                                    setModalActive(e.target.checked);
                                    if (!e.target.checked && !modalFechaBaja) {
                                        setModalFechaBaja(new Date().toISOString().split('T')[0]);
                                    }
                                }}
                                className="w-5 h-5 accent-amber-500"
                            />
                            <label htmlFor="chk-active" className="text-sm font-bold text-stone-700">Estado de Matrícula Activo</label>
                        </div>
                        {!modalActive && (
                            <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 animate-fadeIn">
                                <label className="block text-xs font-bold text-rose-600 uppercase mb-1.5">
                                    <i className="fas fa-calendar-times mr-1"></i> Fecha de Baja *
                                </label>
                                <input 
                                    type="date" 
                                    name="fecha_baja"
                                    value={modalFechaBaja}
                                    onChange={(e) => setModalFechaBaja(e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-rose-300 outline-none bg-white font-semibold text-sm"
                                    required
                                />
                                <p className="text-[10px] text-rose-400 mt-1">La deuda se calculará hasta este mes</p>
                            </div>
                        )}
                    </div>

                    <div className="pt-6 flex gap-3">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold py-3 rounded-xl transition-all"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl transition-all shadow-md"
                        >
                            Guardar Registro
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default StudentModal;
