import React, { useState, useEffect } from 'react';
import { changePassword } from '../services/authService';
import { ref, set, get, remove } from 'firebase/database';
import { rtdb } from '../config/firebase';

function PerfilProfesor({ currentUser, profileUser, globalSede, setCurrentUser, addNotification }) {
    const isAdmin = currentUser?.dni === 'admin';

    // Estado del formulario — se inicializa desde profileUser
    const [nombre, setNombre] = useState(profileUser?.nombre || "");
    const [dni, setDni] = useState(profileUser?.dni || "");
    const [telefono, setTelefono] = useState(profileUser?.telefono || "");
    const [email, setEmail] = useState(profileUser?.email || "");
    const [bio, setBio] = useState(profileUser?.bio || "");
    const [foto, setFoto] = useState(profileUser?.foto || "");
    const [saving, setSaving] = useState(false);
    const [passActual, setPassActual] = useState("");
    const [passNueva, setPassNueva] = useState("");
    const [passConfirm, setPassConfirm] = useState("");
    const [showPassActual, setShowPassActual] = useState(false);
    const [showPassNueva, setShowPassNueva] = useState(false);
    const [changingPass, setChangingPass] = useState(false);

    // Sync cuando cambia el profileUser (ej: admin cambia de sede)
    useEffect(() => {
        if (profileUser) {
            setNombre(profileUser.nombre || "");
            setDni(profileUser.dni || "");
            setTelefono(profileUser.telefono || "");
            setEmail(profileUser.email || "");
            setBio(profileUser.bio || "");
            setFoto(profileUser.foto || "");
        } else {
            setNombre("");
            setDni("");
            setTelefono("");
            setEmail("");
            setBio("");
            setFoto("");
        }
    }, [profileUser]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                addNotification("La imagen es demasiado grande. El límite es de 2MB.", "error");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setFoto(reader.result);
                addNotification("Foto de perfil cargada. Recuerda guardar los cambios.", "info");
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const trimmedDni = dni.trim();
        const trimmedNombre = nombre.trim();

        if (!trimmedDni || !trimmedNombre) {
            addNotification("Nombre y DNI son campos obligatorios", "error");
            return;
        }

        // El usuario "admin" es un usuario especial no numérico
        if (trimmedDni !== "admin" && !/^\d+$/.test(trimmedDni)) {
            addNotification("El DNI debe contener solo números", "error");
            return;
        }

        setSaving(true);

        try {
            // Clave original del perfil que estamos editando
            const originalDni = profileUser?.dni;
            const dniChanged = originalDni && originalDni !== trimmedDni;

            // Si cambió el DNI, validar que no esté ocupado
            if (dniChanged) {
                const checkRef = ref(rtdb, `usuarios/${trimmedDni}`);
                const snapshot = await get(checkRef);
                if (snapshot.exists()) {
                    addNotification("Este DNI ya está registrado por otro profesor", "error");
                    setSaving(false);
                    return;
                }
            }

            const updatedUser = {
                dni: trimmedDni,
                nombre: trimmedNombre,
                // Mantiene la sede del perfil editado (no la del admin)
                sede: profileUser?.sede || globalSede,
                telefono: telefono.trim(),
                email: email.trim(),
                bio: bio.trim(),
                foto: foto
            };

            if (dniChanged) {
                // Migración de clave: crear en nueva clave, borrar la anterior
                await set(ref(rtdb, `usuarios/${trimmedDni}`), updatedUser);
                await remove(ref(rtdb, `usuarios/${originalDni}`));
            } else if (originalDni) {
                await set(ref(rtdb, `usuarios/${originalDni}`), updatedUser);
            } else {
                // Perfil nuevo: profesor sin cuenta aún para esta sede
                await set(ref(rtdb, `usuarios/${trimmedDni}`), updatedUser);
            }

            // Solo actualizar currentUser si el que guarda es el mismo usuario logueado
            if (!isAdmin) {
                setCurrentUser(updatedUser);
            }

            addNotification(
                isAdmin
                    ? `Perfil del profesor de ${globalSede} actualizado`
                    : "Perfil actualizado exitosamente",
                "success"
            );
        } catch (err) {
            console.error("Error al guardar perfil:", err);
            addNotification("Error de conexión: " + err.message, "error");
        } finally {
            setSaving(false);
        }
    };

    // Si el admin está en una sede sin profesor registrado
    if (isAdmin && !profileUser) {
        return (
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-stone-100 max-w-4xl mx-auto animate-fadeIn">
                {/* Banner admin */}
                <div className="flex items-center gap-3 mb-6 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3">
                    <i className="fas fa-user-shield text-amber-600 text-lg"></i>
                    <div>
                        <p className="text-xs font-black text-amber-700 uppercase tracking-wider">Modo Administrador</p>
                        <p className="text-sm text-amber-600">Gestionando sede: <strong>{globalSede}</strong></p>
                    </div>
                </div>

                <div className="text-center py-16 text-stone-400">
                    <i className="fas fa-user-plus text-5xl mb-4 text-stone-300"></i>
                    <h3 className="text-xl font-bold text-stone-600 mb-2">Sin profesor registrado</h3>
                    <p className="text-sm max-w-md mx-auto">
                        No hay ningún profesor con cuenta registrada para la sede <strong>{globalSede}</strong>.
                        El profesor debe iniciar sesión con su DNI para crear su perfil.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-stone-100 max-w-4xl mx-auto animate-fadeIn">

            {/* Banner cuando el admin está editando el perfil de un profesor */}
            {isAdmin && (
                <div className="flex items-center gap-3 mb-6 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3">
                    <i className="fas fa-user-shield text-amber-600 text-lg"></i>
                    <div>
                        <p className="text-xs font-black text-amber-700 uppercase tracking-wider">Modo Administrador</p>
                        <p className="text-sm text-amber-600">
                            Editando perfil del profesor de <strong>{globalSede}</strong>
                        </p>
                    </div>
                </div>
            )}

            <h3 className="text-2xl font-black text-stone-850 mb-2 flex items-center gap-2">
                <i className="fas fa-user-circle text-orange-500"></i>
                {isAdmin ? `Perfil del Profesor — ${globalSede}` : "Mi Perfil de Profesor"}
            </h3>
            <p className="text-sm text-stone-400 mb-8">
                {isAdmin
                    ? "Como administrador podés ver y actualizar los datos del profesor de esta sede."
                    : "Administrá tu información profesional, foto de perfil y tus credenciales de acceso al portal."}
            </p>

            <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Columna Izquierda: Foto y Avatar */}
                <div className="flex flex-col items-center text-center space-y-4 lg:border-r lg:border-stone-100 lg:pr-8">
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider">
                        Foto de Perfil
                    </label>
                    <div className="relative group w-40 h-40 rounded-full overflow-hidden border-4 border-stone-100 hover:border-orange-500 transition-all shadow-md">
                        {foto ? (
                            <img 
                                src={foto} 
                                alt="Profesor Avatar" 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-350"
                            />
                        ) : (
                            <div className="w-full h-full bg-stone-100 flex flex-col items-center justify-center text-stone-400">
                                <i className="fas fa-user text-5xl"></i>
                                <span className="text-[10px] font-bold mt-2">Sin foto</span>
                            </div>
                        )}
                        <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-bold cursor-pointer">
                            <i className="fas fa-camera text-xl mb-1"></i>
                            <span>Cambiar foto</span>
                            <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </label>
                    </div>
                    <p className="text-[10px] text-stone-400 max-w-[200px]">
                        Formatos recomendados: JPG o PNG. Tamaño máximo de archivo: 2MB.
                    </p>

                    <div className="w-full pt-4 border-t border-stone-50">
                        <span className="bg-orange-50 text-orange-700 text-xs px-3 py-1.5 rounded-full font-black uppercase tracking-wider inline-block">
                            Sede: {profileUser?.sede || globalSede}
                        </span>
                    </div>
                </div>

                {/* Columna Derecha: Formulario */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Nombre Completo */}
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Nombre Completo</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                                    <i className="fas fa-user"></i>
                                </span>
                                <input 
                                    type="text" 
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                    placeholder="Nombre y Apellido"
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-stone-200 outline-none bg-stone-50/50 font-semibold focus:ring-2 focus:ring-orange-500 transition-all text-stone-850"
                                    required
                                />
                            </div>
                        </div>

                        {/* DNI (Usuario) */}
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Usuario (DNI)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                                    <i className="fas fa-id-card"></i>
                                </span>
                                <input 
                                    type="text" 
                                    value={dni}
                                    onChange={(e) => setDni(e.target.value)}
                                    placeholder="DNI sin puntos"
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-stone-200 outline-none bg-stone-50/50 font-semibold focus:ring-2 focus:ring-orange-500 transition-all text-stone-850"
                                    required
                                />
                            </div>
                        </div>

                        {/* Contraseña */}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Cambiar Contraseña</label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"><i className="fas fa-lock"></i></span>
                                    <input
                                        type={showPassActual ? "text" : "password"}
                                        value={passActual}
                                        onChange={(e) => setPassActual(e.target.value)}
                                        placeholder="Contraseña actual"
                                        className="w-full pl-11 pr-10 py-3 rounded-xl border border-stone-200 outline-none bg-stone-50/50 font-semibold focus:ring-2 focus:ring-orange-500 transition-all"
                                    />
                                    <button type="button" onClick={() => setShowPassActual(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 bg-transparent border-0 cursor-pointer">
                                        <i className={`fas ${showPassActual ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                    </button>
                                </div>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"><i className="fas fa-key"></i></span>
                                    <input
                                        type={showPassNueva ? "text" : "password"}
                                        value={passNueva}
                                        onChange={(e) => setPassNueva(e.target.value)}
                                        placeholder="Nueva contraseña"
                                        className="w-full pl-11 pr-10 py-3 rounded-xl border border-stone-200 outline-none bg-stone-50/50 font-semibold focus:ring-2 focus:ring-orange-500 transition-all"
                                    />
                                    <button type="button" onClick={() => setShowPassNueva(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 bg-transparent border-0 cursor-pointer">
                                        <i className={`fas ${showPassNueva ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                    </button>
                                </div>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"><i className="fas fa-check-circle"></i></span>
                                    <input
                                        type="password"
                                        value={passConfirm}
                                        onChange={(e) => setPassConfirm(e.target.value)}
                                        placeholder="Confirmar nueva"
                                        className={`w-full pl-11 pr-4 py-3 rounded-xl border outline-none bg-stone-50/50 font-semibold focus:ring-2 focus:ring-orange-500 transition-all ${
                                            passConfirm && passNueva !== passConfirm ? 'border-rose-400 focus:ring-rose-400' : 'border-stone-200'
                                        }`}
                                    />
                                </div>
                            </div>
                            {passActual && (
                                <div className="mt-2 flex justify-end">
                                    <button
                                        type="button"
                                        disabled={changingPass || !passActual || !passNueva || passNueva !== passConfirm || passNueva.length < 6}
                                        onClick={async () => {
                                            if (passNueva.length < 6) { addNotification("La contraseña debe tener al menos 6 caracteres", "error"); return; }
                                            if (passNueva !== passConfirm) { addNotification("Las contraseñas no coinciden", "error"); return; }
                                            setChangingPass(true);
                                            try {
                                                await changePassword(passActual, passNueva);
                                                addNotification("Contraseña actualizada con éxito", "success");
                                                setPassActual(""); setPassNueva(""); setPassConfirm("");
                                            } catch (err) {
                                                if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                                                    addNotification("La contraseña actual es incorrecta", "error");
                                                } else {
                                                    addNotification("Error: " + (err.message || ''), "error");
                                                }
                                            } finally {
                                                setChangingPass(false);
                                            }
                                        }}
                                        className="bg-amber-600 hover:bg-amber-700 disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed text-white font-bold py-2 px-5 rounded-xl transition-all text-sm flex items-center gap-2 border-0 cursor-pointer"
                                    >
                                        {changingPass ? <><i className="fas fa-spinner fa-spin"></i> Cambiando...</> : <><i className="fas fa-key"></i> Confirmar cambio</>}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Teléfono */}
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Teléfono de Contacto</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                                    <i className="fas fa-phone"></i>
                                </span>
                                <input 
                                    type="text" 
                                    value={telefono}
                                    onChange={(e) => setTelefono(e.target.value)}
                                    placeholder="Ej: +54 3754 123456"
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-stone-200 outline-none bg-stone-50/50 font-semibold focus:ring-2 focus:ring-orange-500 transition-all text-stone-855"
                                />
                            </div>
                        </div>

                        {/* Correo Electrónico */}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Correo Electrónico</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                                    <i className="fas fa-envelope"></i>
                                </span>
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="correo@ejemplo.com"
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-stone-200 outline-none bg-stone-50/50 font-semibold focus:ring-2 focus:ring-orange-500 transition-all text-stone-855"
                                />
                            </div>
                        </div>

                        {/* Biografía / Especialidad */}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Especialidad o Breve Biografía</label>
                            <textarea 
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                placeholder="Escribe aquí tu especialidad artística, talleres dictados, experiencia, etc..."
                                rows="4"
                                className="w-full p-4 rounded-xl border border-stone-200 outline-none bg-stone-50/50 font-semibold focus:ring-2 focus:ring-orange-500 transition-all text-stone-855 resize-none"
                            ></textarea>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button 
                            type="submit"
                            disabled={saving}
                            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 px-8 rounded-2xl transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer border-0 w-full sm:w-auto"
                        >
                            {saving ? (
                                <>
                                    <i className="fas fa-spinner fa-spin"></i> Guardando...
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-save"></i> Guardar Cambios
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}

export default PerfilProfesor;
