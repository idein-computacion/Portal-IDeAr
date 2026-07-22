import React from 'react';

/**
 * Pantalla de Login, Selección de Sede y Definición de Administrador por primera vez.
 * Extraído de App.jsx (líneas 2549–2799).
 */
const LoginSedeModal = ({
    tempSede,
    setTempSede,
    authDni,
    setAuthDni,
    authPassword,
    setAuthPassword,
    authNombre,
    setAuthNombre,
    setIsFirstTime,
    hasAdmin,
    loading,
    handleAuthSubmit,
    notifications,
    sedes,
    currentUser,
    setGlobalSede,
    addNotification
}) => {
    if (tempSede) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-black via-orange-600 to-yellow-500 flex flex-col items-center justify-center p-4 animate-fadeIn">
                {/* Notificaciones flotantes */}
                <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 no-print">
                    {notifications.map(n => (
                        <div key={n.id} className={`p-4 rounded-xl shadow-lg border text-sm flex items-center gap-3 transition-all transform translate-y-0 duration-300 ${
                            n.type === 'success' ? 'bg-orange-50 border-orange-200 text-orange-800' :
                            n.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-blue-50 border-blue-200 text-blue-800'
                        }`}>
                            <i className={`fas ${n.type === 'success' ? 'fa-check-circle' : n.type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}`}></i>
                            <span>{n.text}</span>
                        </div>
                    ))}
                </div>
                <div className="w-48 h-auto mb-8">
                    <img src="/logo.png" alt="Logo IDeAr" className="w-full h-auto object-contain drop-shadow-lg" />
                </div>
                
                <div className="bg-white/95 backdrop-blur-md p-8 sm:p-10 rounded-[2.5rem] shadow-2xl border border-stone-200/50 max-w-md w-full relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-500 to-yellow-500"></div>
                    
                    <div className="flex items-center gap-2 mb-6">
                        <button 
                            onClick={() => { setTempSede(null); setAuthDni(""); setAuthPassword(""); setAuthNombre(""); setIsFirstTime(false); }}
                            className="text-stone-400 hover:text-stone-700 transition-colors flex items-center gap-1 text-sm font-bold bg-transparent border-0 cursor-pointer"
                        >
                            <i className="fas fa-arrow-left"></i> Volver a Sedes
                        </button>
                    </div>

                    <div className="text-center mb-6 text-stone-800">
                        <span className="bg-orange-50 text-orange-700 text-xs px-3 py-1.5 rounded-full font-black uppercase tracking-wider mb-2 inline-block">
                            Sede: {tempSede}
                        </span>
                        <h2 className="text-2xl font-extrabold mt-1">
                            {tempSede === "Leandro N. Alem" && !hasAdmin 
                                ? "Definir Acceso Administrador (Por única vez)" 
                                : "Acceso a la Sede"}
                        </h2>
                        <p className="text-xs text-stone-500 mt-1">
                            {tempSede === "Leandro N. Alem" && !hasAdmin
                                ? "No se ha configurado ningún administrador para Leandro N. Alem. Define el DNI, Nombre y Contraseña principal."
                                : "Introduce tu usuario y contraseña personal de acceso."}
                        </p>
                    </div>

                    <form onSubmit={handleAuthSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">
                                {authDni === "admin" ? "Usuario Administrador" : "Usuario (DNI)"}
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                                    <i className={authDni === "admin" ? "fas fa-user-shield" : "fas fa-id-card"}></i>
                                </span>
                                <input 
                                    type="text"
                                    placeholder="DNI o usuario admin"
                                    value={authDni}
                                    onChange={(e) => {
                                        setAuthDni(e.target.value);
                                        setIsFirstTime(false);
                                    }}
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-stone-200 outline-none bg-stone-50/50 font-semibold focus:ring-2 focus:ring-orange-500 transition-all text-stone-800"
                                    required
                                />
                            </div>
                        </div>

                        {(tempSede === "Leandro N. Alem" && !hasAdmin) && (
                            <div>
                                <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Nombre Completo</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                                        <i className="fas fa-user"></i>
                                    </span>
                                    <input 
                                        type="text"
                                        placeholder="Nombre y Apellido"
                                        value={authNombre}
                                        onChange={(e) => setAuthNombre(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-stone-200 outline-none bg-stone-50/50 font-semibold focus:ring-2 focus:ring-orange-500 transition-all text-stone-800"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Contraseña</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                                    <i className="fas fa-key"></i>
                                </span>
                                <input 
                                    type="password"
                                    placeholder="Escribe tu contraseña"
                                    value={authPassword}
                                    onChange={(e) => setAuthPassword(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-stone-200 outline-none bg-stone-50/50 font-semibold focus:ring-2 focus:ring-orange-500 transition-all text-stone-800"
                                    required
                                />
                            </div>
                        </div>

                        <button 
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer mt-6 border-0"
                        >
                            {loading ? (
                                <>
                                    <i className="fas fa-spinner fa-spin"></i> Procesando...
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-sign-in-alt"></i> 
                                    {tempSede === "Leandro N. Alem" && !hasAdmin 
                                        ? "Registrar Administrador Principal" 
                                        : `Acceder a ${tempSede}`}
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-black via-orange-600 to-yellow-500 flex flex-col items-center justify-center p-4 animate-fadeIn">
            {/* Notificaciones flotantes */}
            <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 no-print">
                {notifications.map(n => (
                    <div key={n.id} className={`p-4 rounded-xl shadow-lg border text-sm flex items-center gap-3 transition-all transform translate-y-0 duration-300 ${
                        n.type === 'success' ? 'bg-orange-50 border-orange-200 text-orange-800' :
                        n.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-blue-50 border-blue-200 text-blue-800'
                    }`}>
                        <i className={`fas ${n.type === 'success' ? 'fa-check-circle' : n.type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}`}></i>
                        <span>{n.text}</span>
                    </div>
                ))}
            </div>
            <div className="w-48 h-auto mb-10">
                <img src="/logo.png" alt="Logo IDeAr" className="w-full h-auto object-contain drop-shadow-lg" />
            </div>
            <div className="bg-white p-8 sm:p-10 rounded-[2rem] shadow-2xl border border-stone-100 max-w-2xl w-full text-center">
                <h2 className="text-2xl font-black text-stone-850 uppercase tracking-widest mb-6">Selecciona la Sede</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {sedes.map(s => (
                        <button
                            key={s.id}
                            onClick={() => {
                                if (currentUser) {
                                    const userSedes = currentUser.sede ? currentUser.sede.split(',').map(name => name.trim()) : [];
                                    const hasAccess = userSedes.includes(s.nombre) || userSedes.includes("Leandro N. Alem");
                                    if (hasAccess) {
                                        localStorage.setItem('idear_sede', s.nombre);
                                        setGlobalSede(s.nombre);
                                    } else {
                                        addNotification(`Tu usuario está registrado para: "${currentUser.sede}". No tienes acceso a "${s.nombre}".`, "error");
                                    }
                                } else {
                                    setTempSede(s.nombre);
                                    setAuthDni("");
                                    setAuthPassword("");
                                    setAuthNombre("");
                                    setIsFirstTime(false);
                                }
                            }}
                            className="bg-stone-50 hover:bg-orange-500 hover:text-white border-2 border-stone-200 hover:border-orange-500 text-stone-800 p-6 rounded-2xl font-black text-lg transition-all shadow-md active:scale-95 cursor-pointer uppercase flex flex-col items-center justify-center gap-2"
                        >
                            <i className="fas fa-school text-xl"></i>
                            {s.nombre}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LoginSedeModal;
