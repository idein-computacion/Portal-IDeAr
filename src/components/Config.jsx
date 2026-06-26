import React, { useState } from 'react';
import { ref, set, remove, get } from 'firebase/database';
import { rtdb } from '../config/firebase';


function UserRow({ user, currentUser, addNotification }) {
    const [isEditing, setIsEditing] = useState(false);
    const [newPass, setNewPass] = useState(user.password || "");
    const [showPass, setShowPass] = useState(false);

    const handleSavePassword = async () => {
        if (!newPass.trim()) {
            addNotification("La contraseña no puede estar vacía", "error");
            return;
        }
        try {
            await set(ref(rtdb, `usuarios/${user.dni}/password`), newPass.trim());
            addNotification(`Contraseña actualizada para ${user.nombre}`, "success");
            setIsEditing(false);
        } catch (e) {
            addNotification("Error al actualizar contraseña", "error");
        }
    };

    const handleDelete = async () => {
        if (user.sede === "Leandro N. Alem") {
            addNotification("No se pueden eliminar credenciales de administrador de Alem", "error");
            return;
        }
        if (currentUser && currentUser.dni === user.dni) {
            addNotification("No puedes eliminar tu propio usuario", "error");
            return;
        }
        if (!window.confirm(`¿Estás seguro de que deseas eliminar la cuenta de acceso de ${user.nombre} (DNI: ${user.dni})?`)) {
            return;
        }
        try {
            await remove(ref(rtdb, `usuarios/${user.dni}`));
            addNotification(`Usuario ${user.nombre} eliminado con éxito`, "info");
        } catch (e) {
            addNotification("Error al eliminar usuario", "error");
        }
    };

    return (
        <tr className="hover:bg-stone-50/50 transition-colors text-sm">
            <td className="py-3 px-3 font-semibold text-stone-850">{user.nombre}</td>
            <td className="py-3 px-3 text-stone-650">{user.dni}</td>
            <td className="py-3 px-3">
                <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                    user.sede === "Leandro N. Alem" 
                        ? "bg-amber-100 text-amber-800" 
                        : "bg-orange-50 text-orange-700"
                }`}>
                    {user.sede}
                </span>
            </td>
            <td className="py-3 px-3">
                {isEditing ? (
                    <div className="flex items-center gap-2">
                        <input 
                            type="text"
                            value={newPass}
                            onChange={(e) => setNewPass(e.target.value)}
                            className="p-1 px-2 border border-stone-300 rounded text-xs focus:ring-1 focus:ring-orange-500 outline-none w-32 bg-white text-stone-800"
                        />
                        <button 
                            onClick={handleSavePassword}
                            className="p-1 text-emerald-600 hover:text-emerald-800"
                            title="Guardar"
                        >
                            <i className="fas fa-check"></i>
                        </button>
                        <button 
                            onClick={() => { setIsEditing(false); setNewPass(user.password || ""); }}
                            className="p-1 text-rose-600 hover:text-rose-800"
                            title="Cancelar"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-stone-650">
                        <span>{showPass ? user.password : "••••••••"}</span>
                        <button 
                            onClick={() => setShowPass(!showPass)}
                            className="text-stone-400 hover:text-stone-650"
                        >
                            <i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                        </button>
                    </div>
                )}
            </td>
            <td className="py-3 px-3 text-center">
                <div className="flex items-center justify-center gap-2">
                    <button 
                        onClick={() => setIsEditing(true)}
                        title="Cambiar Contraseña"
                        className="p-1.5 bg-orange-50 hover:bg-orange-500 hover:text-white text-orange-600 rounded-lg transition-all"
                    >
                        <i className="fas fa-key text-xs"></i>
                    </button>
                    <button 
                        onClick={handleDelete}
                        disabled={user.sede === "Leandro N. Alem"}
                        title={user.sede === "Leandro N. Alem" ? "No se pueden eliminar credenciales de administrador de Alem" : "Eliminar Usuario"}
                        className={`p-1.5 rounded-lg transition-all ${
                            user.sede === "Leandro N. Alem" 
                            ? "bg-stone-100 text-stone-300 cursor-not-allowed" 
                            : "bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-600"
                        }`}
                    >
                        <i className="fas fa-trash-alt text-xs"></i>
                    </button>
                </div>
            </td>
        </tr>
    );
}

function Config({ configLevels, setConfigLevels, addNotification, globalSede, generalConfig, setGeneralConfig, sedes = [], users = [], currentUser = null }) {
    
    const handleSaveToFirebase = async (levelsToSave) => {
        try {
            const safeSede = globalSede.replace(/\./g, '');
            // Sobreescribimos el nodo completo de la sede en Firebase para persistir eliminaciones
            const dataToSave = {
                info: generalConfig
            };
            levelsToSave.forEach(c => {
                dataToSave[c.id] = c;
            });
            await set(ref(rtdb, `config/${safeSede}`), dataToSave);
            localStorage.setItem(`idear_config_${safeSede}`, JSON.stringify(levelsToSave));
            addNotification("Configuración de aranceles guardada exitosamente", "success");
        } catch(e) {
            addNotification("Error guardando aranceles en nube", "error");
        }
    };

    const handleLevelChange = (id, field, value) => {
        const updated = configLevels.map(lvl => lvl.id === id ? { ...lvl, [field]: Number(value) } : lvl);
        setConfigLevels(updated);
    };

    const handleAddCourse = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const newCourseName = formData.get("curso_nivel").trim();
        const inscripcionVal = Number(formData.get("inscripcion"));
        const cuotaVal = Number(formData.get("cuota"));

        if (!newCourseName) {
            addNotification("El nombre del curso/taller es obligatorio", "error");
            return;
        }

        if (configLevels.some(c => c.curso_nivel.toLowerCase() === newCourseName.toLowerCase())) {
            addNotification("Este curso/taller ya existe", "error");
            return;
        }

        const newLvl = {
            id: `config-${Date.now()}`,
            curso_nivel: newCourseName,
            inscripcion: inscripcionVal,
            cuota: cuotaVal,
            examen: 0
        };

        const updated = [...configLevels, newLvl];
        setConfigLevels(updated);
        addNotification(`Curso "${newCourseName}" añadido a la lista. Recuerda Guardar Cambios.`, "success");
        e.target.reset();
    };

    const handleDeleteLevel = (id) => {
        const itemToDelete = configLevels.find(c => c.id === id);
        const updated = configLevels.filter(lvl => lvl.id !== id);
        setConfigLevels(updated);
        if (itemToDelete) {
            addNotification(`Curso "${itemToDelete.curso_nivel}" eliminado de la lista. Recuerda Guardar Cambios.`, "info");
        }
    };

    const handleCreateSede = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const nombreSede = formData.get("nombreSede").trim();
        const prefixSede = formData.get("prefixSede").trim();
        const baseSede = Number(formData.get("baseSede"));

        if (!nombreSede || !prefixSede) {
            addNotification("Todos los campos son obligatorios", "error");
            return;
        }

        if (sedes.some(s => s.nombre.toLowerCase() === nombreSede.toLowerCase())) {
            addNotification(`La sede "${nombreSede}" ya existe`, "error");
            return;
        }

        if (sedes.some(s => s.prefix === prefixSede)) {
            addNotification(`El prefijo "${prefixSede}" ya está siendo utilizado por otra sede`, "error");
            return;
        }

        const newSede = {
            nombre: nombreSede,
            prefix: prefixSede,
            base: baseSede
        };

        try {
            const updatedSedes = [...sedes, newSede];
            await set(ref(rtdb, 'sedes'), updatedSedes);
            addNotification(`Sede "${nombreSede}" registrada con éxito`, "success");
            e.target.reset();
        } catch (err) {
            console.error("Error al registrar sede:", err);
            addNotification("Error al guardar la sede en Firebase", "error");
        }
    };

    const handleDeleteSede = async (nombreSede) => {
        if (nombreSede === "Leandro N. Alem") {
            addNotification("No se puede eliminar la sede central (administrador)", "error");
            return;
        }

        if (!window.confirm(`¿Estás seguro de que deseas eliminar la sede "${nombreSede}"? Se borrará de la lista de selección para ingresar y de los formularios de registro.`)) {
            return;
        }

        try {
            const updatedSedes = sedes.filter(s => s.nombre !== nombreSede);
            await set(ref(rtdb, 'sedes'), updatedSedes);
            addNotification(`Sede "${nombreSede}" eliminada con éxito`, "info");
        } catch (err) {
            console.error("Error al eliminar sede:", err);
            addNotification("Error al guardar cambios en Firebase", "error");
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const nombre = formData.get("newUserNombre").trim();
        const dni    = formData.get("newUserDni").trim();
        const pass   = formData.get("newUserPass").trim();
        const sede   = formData.get("newUserSede");

        if (!nombre || !dni || !pass || !sede) {
            addNotification("Todos los campos son obligatorios", "error");
            return;
        }

        if (dni !== 'admin' && !/^\d+$/.test(dni)) {
            addNotification("El DNI debe contener solo números", "error");
            return;
        }

        try {
            const snapshot = await get(ref(rtdb, `usuarios/${dni}`));
            if (snapshot.exists()) {
                addNotification(`Ya existe un usuario con el DNI/usuario "${dni}"`, "error");
                return;
            }

            const newUser = { dni, nombre, password: pass, sede };
            await set(ref(rtdb, `usuarios/${dni}`), newUser);
            addNotification(`Usuario "${nombre}" creado con éxito para la sede ${sede}`, "success");
            e.target.reset();
        } catch (err) {
            console.error("Error al crear usuario:", err);
            addNotification("Error de conexión: " + err.message, "error");
        }
    };

    return (
        <>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 lg:col-span-2">
                <h3 className="text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
                    <i className="fas fa-dollar-sign text-orange-500"></i> Aranceles Vigentes Ciclo 2026 (Por Nivel / Curso)
                </h3>
                <p className="text-sm text-stone-400 mb-6">
                    Establece los valores base sugeridos al registrar nuevos pagos según el nivel o curso del estudiante.
                </p>

                <div className="bg-stone-50 border border-stone-100 rounded-2xl p-5 mb-6 flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Profesor a Cargo de la Sede</label>
                        <input 
                            type="text"
                            value={generalConfig?.profesor || ""}
                            onChange={(e) => setGeneralConfig({ ...generalConfig, profesor: e.target.value })}
                            placeholder="Ej. Prof. Juan Pérez"
                            className="w-full p-3 rounded-xl border border-stone-200 outline-none bg-white font-semibold focus:ring-2 focus:ring-amber-500 transition-all"
                        />
                    </div>
                </div>

                {/* Formulario para agregar nuevo curso */}
                <div className="bg-stone-50 border border-stone-100 rounded-2xl p-5 mb-6">
                    <h4 className="text-sm font-bold text-stone-700 mb-4 flex items-center gap-2">
                        <i className="fas fa-plus-circle text-orange-500"></i> Añadir Nuevo Curso / Taller
                    </h4>
                    <form onSubmit={handleAddCourse} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="w-full">
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Nombre del Curso / Taller</label>
                            <input 
                                type="text"
                                name="curso_nivel"
                                placeholder="Ej: Ballet Infantil"
                                className="w-full p-2.5 rounded-xl border border-stone-200 outline-none bg-white font-semibold focus:ring-2 focus:ring-amber-500 text-sm transition-all"
                                required
                            />
                        </div>
                        <div className="w-full">
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Matrícula ($)</label>
                            <input 
                                type="number"
                                name="inscripcion"
                                placeholder="Ej: 20000"
                                className="w-full p-2.5 rounded-xl border border-stone-200 outline-none bg-white font-semibold focus:ring-2 focus:ring-amber-500 text-sm transition-all"
                                required
                            />
                        </div>
                        <div className="w-full">
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Cuota Mensual ($)</label>
                            <input 
                                type="number"
                                name="cuota"
                                placeholder="Ej: 25000"
                                className="w-full p-2.5 rounded-xl border border-stone-200 outline-none bg-white font-semibold focus:ring-2 focus:ring-amber-500 text-sm transition-all"
                                required
                            />
                        </div>
                        <button 
                            type="submit"
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md text-sm cursor-pointer"
                        >
                            Agregar Curso
                        </button>
                    </form>
                </div>

                <div className="overflow-x-auto mb-4">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-stone-100 text-xs text-stone-400 font-bold uppercase">
                                <th className="py-2 px-3">Curso/Nivel</th>
                                <th className="py-2 px-3 text-center">Matrícula ($)</th>
                                <th className="py-2 px-3 text-center">Cuota ($)</th>
                                <th className="py-2 px-3 text-center">Examen ($)</th>
                                <th className="py-2 px-3 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-50">
                            {configLevels.map(c => (
                                <tr key={c.id} className="hover:bg-stone-50/50 transition-colors text-sm">
                                    <td className="py-2 px-3 font-semibold text-stone-700">{c.curso_nivel}</td>
                                    <td className="py-2 px-3">
                                        <div className="relative flex items-center">
                                            <span className="absolute left-3 text-stone-500 font-bold">$</span>
                                            <input 
                                                type="number"
                                                value={c.inscripcion}
                                                onChange={(e) => handleLevelChange(c.id, 'inscripcion', e.target.value)}
                                                className="w-full py-2 pl-7 pr-2 rounded-lg border border-stone-200 bg-white font-bold text-stone-700 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                        </div>
                                    </td>
                                    <td className="py-2 px-3">
                                        <div className="relative flex items-center">
                                            <span className="absolute left-3 text-stone-500 font-bold">$</span>
                                            <input 
                                                type="number"
                                                value={c.cuota}
                                                onChange={(e) => handleLevelChange(c.id, 'cuota', e.target.value)}
                                                className="w-full py-2 pl-7 pr-2 rounded-lg border border-stone-200 bg-white font-bold text-stone-700 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                        </div>
                                    </td>
                                    <td className="py-2 px-3">
                                        <div className="relative flex items-center">
                                            <span className="absolute left-3 text-stone-500 font-bold">$</span>
                                            <input 
                                                type="number"
                                                value={c.examen || 0}
                                                onChange={(e) => handleLevelChange(c.id, 'examen', e.target.value)}
                                                disabled={globalSede !== "Leandro N. Alem"}
                                                title={globalSede !== "Leandro N. Alem" ? "Los precios de examen solo pueden ser modificados por la sede central (Leandro N. Alem)" : ""}
                                                className={`w-full py-2 pl-7 pr-2 rounded-lg border border-stone-200 font-bold text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                                    globalSede !== "Leandro N. Alem" ? "bg-stone-100 text-stone-400 cursor-not-allowed" : "bg-white text-stone-700"
                                                }`}
                                            />
                                        </div>
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                        <button 
                                            type="button"
                                            onClick={() => handleDeleteLevel(c.id)}
                                            title="Eliminar curso/taller"
                                            className="p-1.5 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-600 rounded-lg transition-all"
                                        >
                                            <i className="fas fa-trash-alt text-sm"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col md:flex-row gap-4 mt-6">
                    <button 
                        onClick={() => handleSaveToFirebase(configLevels)}
                        className="w-full md:w-auto md:ml-auto block bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md"
                    >
                        Guardar Cambios
                    </button>
                </div>
            </div>

            {globalSede === "Leandro N. Alem" && (
                <>
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 lg:col-span-2">
                        <h3 className="text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
                            <i className="fas fa-network-wired text-amber-600"></i> Gestión de Sedes y Sucursales (Administrador)
                        </h3>
                        <p className="text-sm text-stone-400 mb-6">
                            Registra o elimina las sedes del instituto. También configura el prefijo de recibos y su número secuencial de inicio.
                        </p>

                        {/* Formulario para Crear Sede */}
                        <div className="bg-stone-50 border border-stone-100 rounded-2xl p-5 mb-6">
                            <h4 className="text-sm font-bold text-stone-700 mb-4 flex items-center gap-2">
                                <i className="fas fa-plus-circle text-amber-600"></i> Registrar Nueva Sede
                            </h4>
                            <form onSubmit={handleCreateSede} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                <div className="w-full">
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Nombre de la Sede</label>
                                    <input 
                                        type="text" 
                                        name="nombreSede"
                                        placeholder="Ej: Sede Oberá"
                                        className="w-full p-2.5 rounded-xl border border-stone-200 outline-none bg-white font-semibold focus:ring-2 focus:ring-amber-500 text-sm transition-all"
                                        required
                                    />
                                </div>
                                <div className="w-full">
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Prefijo de Recibo</label>
                                    <input 
                                        type="text" 
                                        name="prefixSede"
                                        placeholder="Ej: 00006"
                                        className="w-full p-2.5 rounded-xl border border-stone-200 outline-none bg-white font-semibold focus:ring-2 focus:ring-amber-500 text-sm transition-all"
                                        required
                                    />
                                </div>
                                <div className="w-full">
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Nro Secuencial Base</label>
                                    <input 
                                        type="number" 
                                        name="baseSede"
                                        placeholder="Ej: 1"
                                        className="w-full p-2.5 rounded-xl border border-stone-200 outline-none bg-white font-semibold focus:ring-2 focus:ring-amber-500 text-sm transition-all"
                                        required
                                    />
                                </div>
                                <button 
                                    type="submit"
                                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md text-sm cursor-pointer"
                                >
                                    Registrar Sede
                                </button>
                            </form>
                        </div>

                        {/* Tabla de Sedes */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-stone-100 text-xs text-stone-400 font-bold uppercase">
                                        <th className="py-2 px-3">Sede</th>
                                        <th className="py-2 px-3 text-center">Prefijo Recibo</th>
                                        <th className="py-2 px-3 text-center">Nro Secuencial Base</th>
                                        <th className="py-2 px-3 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-50">
                                    {sedes.map(s => (
                                        <tr key={s.nombre} className="hover:bg-stone-50/50 transition-colors text-sm">
                                            <td className="py-3 px-3 font-bold text-stone-800">{s.nombre}</td>
                                            <td className="py-3 px-3 text-center font-semibold text-stone-600">{s.prefix}</td>
                                            <td className="py-3 px-3 text-center font-semibold text-stone-600">{s.base}</td>
                                            <td className="py-3 px-3 text-center">
                                                <button 
                                                    type="button"
                                                    onClick={() => handleDeleteSede(s.nombre)}
                                                    disabled={s.nombre === "Leandro N. Alem"}
                                                    title={s.nombre === "Leandro N. Alem" ? "La sede central no se puede eliminar" : "Eliminar Sede"}
                                                    className={`p-1.5 rounded-lg transition-all ${
                                                        s.nombre === "Leandro N. Alem" 
                                                        ? "bg-stone-100 text-stone-300 cursor-not-allowed" 
                                                        : "bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-600"
                                                    }`}
                                                >
                                                    <i className="fas fa-trash-alt text-sm"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 lg:col-span-2 mt-8">
                        <h3 className="text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
                            <i className="fas fa-users-cog text-amber-600"></i> Gestión de Profesores y Accesos (Administrador)
                        </h3>
                        <p className="text-sm text-stone-400 mb-6">
                            Administra las cuentas de acceso de los profesores del instituto. Puedes restablecer contraseñas o eliminar accesos de filiales.
                        </p>

                        <div className="overflow-x-auto">
                        
                        {/* Formulario: Crear acceso de profesor */}
                        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 mb-6">
                            <h4 className="text-sm font-bold text-amber-800 mb-4 flex items-center gap-2">
                                <i className="fas fa-user-plus text-amber-600"></i> Crear Acceso de Profesor
                            </h4>
                            <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Nombre Completo</label>
                                    <input
                                        type="text"
                                        name="newUserNombre"
                                        placeholder="Apellido y Nombre"
                                        className="w-full p-2.5 rounded-xl border border-stone-200 outline-none bg-white font-semibold focus:ring-2 focus:ring-amber-500 text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-2">DNI (Usuario)</label>
                                    <input
                                        type="text"
                                        name="newUserDni"
                                        placeholder="Sin puntos"
                                        className="w-full p-2.5 rounded-xl border border-stone-200 outline-none bg-white font-semibold focus:ring-2 focus:ring-amber-500 text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Contraseña</label>
                                    <input
                                        type="text"
                                        name="newUserPass"
                                        placeholder="Contraseña inicial"
                                        className="w-full p-2.5 rounded-xl border border-stone-200 outline-none bg-white font-semibold focus:ring-2 focus:ring-amber-500 text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Sede</label>
                                    <select
                                        name="newUserSede"
                                        className="w-full p-2.5 rounded-xl border border-stone-200 outline-none bg-white font-semibold focus:ring-2 focus:ring-amber-500 text-sm"
                                        required
                                    >
                                        <option value="">— Seleccionar —</option>
                                        {sedes.filter(s => s.nombre !== "Leandro N. Alem").map(s => (
                                            <option key={s.nombre} value={s.nombre}>{s.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    type="submit"
                                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md text-sm cursor-pointer flex items-center justify-center gap-2"
                                >
                                    <i className="fas fa-plus"></i> Crear
                                </button>
                            </form>
                        </div>

                        <div className="overflow-x-auto">

                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-stone-100 text-xs text-stone-400 font-bold uppercase">
                                        <th className="py-2 px-3">Nombre</th>
                                        <th className="py-2 px-3">DNI (Usuario)</th>
                                        <th className="py-2 px-3">Sede</th>
                                        <th className="py-2 px-3">Contraseña</th>
                                        <th className="py-2 px-3 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-50">
                                    {users.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="text-center py-6 text-stone-400 text-sm">
                                                No hay profesores registrados.
                                            </td>
                                        </tr>
                                    ) : (
                                        users.map(u => (
                                            <UserRow 
                                                key={u.dni} 
                                                user={u} 
                                                currentUser={currentUser} 
                                                addNotification={addNotification} 
                                            />
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                     </div>
                    </div>
                </>
            )}
        </>
    );
}

export default Config;
