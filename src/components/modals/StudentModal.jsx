import React, { useState } from 'react';

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
    const [profilePic, setProfilePic] = useState(editingStudent?.profilePic || "");

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 250;
                const MAX_HEIGHT = 250;
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                } else {
                    if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                setProfilePic(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="fixed inset-0 bg-stone-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn no-print">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden relative">
                
                {/* Header Guardapampa */}
                <div className="relative bg-[#3e2723] overflow-hidden p-6 text-[#fff8e1]">
                    <div className="absolute inset-0 opacity-10" style={{ 
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0l20 20-20 20L0 20z M20 10l10 10-10 10-10-10z' fill='%23fff8e1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
                        backgroundSize: '40px 40px'
                    }}></div>
                    
                    <div className="absolute -left-8 -top-8 opacity-20 pointer-events-none">
                        <img src="/logo.png" alt="IDeAr" className="w-40 h-40 object-contain drop-shadow-xl filter grayscale contrast-200 brightness-200" />
                    </div>

                    <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-full bg-[#5d4037] border-4 border-[#fff8e1] overflow-hidden flex items-center justify-center shadow-lg">
                                {profilePic ? (
                                    <img src={profilePic} alt="Perfil" className="w-full h-full object-cover" />
                                ) : (
                                    <i className="fas fa-user text-4xl text-[#fff8e1]/50"></i>
                                )}
                            </div>
                            <label className="absolute bottom-0 right-0 bg-amber-500 hover:bg-amber-600 text-white w-8 h-8 rounded-full flex items-center justify-center cursor-pointer shadow-md transition-all">
                                <i className="fas fa-camera text-xs"></i>
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </label>
                        </div>
                        
                        <div className="flex-1 text-center sm:text-left mt-2 sm:mt-0">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-black tracking-wide text-white drop-shadow-md">
                                    {editingStudent ? "Ficha del Alumno" : "Registrar Alumno"}
                                </h3>
                                <button onClick={onClose} className="text-[#fff8e1]/70 hover:text-white transition-colors bg-transparent border-0 cursor-pointer">
                                    <i className="fas fa-times text-xl drop-shadow-md"></i>
                                </button>
                            </div>
                            <p className="text-sm font-semibold opacity-80 uppercase tracking-widest mt-1">
                                {editingStudent ? editingStudent.name : 'Nuevo Ingreso'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <form key={editingStudent ? editingStudent.id : 'new'} onSubmit={handleSaveStudent} className="space-y-4">
                        <input type="hidden" name="profilePic" value={profilePic} />
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
        </div>
    );
};

export default StudentModal;
