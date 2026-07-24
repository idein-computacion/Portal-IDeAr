import React from 'react';

/**
 * Pestaña Dashboard / Panel.
 * Extraído de App.jsx (líneas 2870–3077).
 */
const DashboardTab = ({
    currentUser,
    profileUser,
    isDirector,
    unreadAnnouncementsCount,
    stats,
    chartData,
    visibleAnnouncements,
    setLastReadTime,
    handleAddAnnouncement,
    handleEditAnnouncement,
    handleDeleteAnnouncement,
    isSendingEmail,
    handleSendReminder,
    setNewPayment,
    setCurrentTab,
    configLevels,
    studentDebts
}) => {
    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Encabezado */}
            <div className="bg-gradient-to-r from-black via-orange-600 to-yellow-500 text-white rounded-3xl p-6 md:p-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                <div 
                    className="absolute inset-0 z-0 opacity-100 mix-blend-overlay pointer-events-none"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cpath fill='rgba(255,255,255,0.1)' d='M35,15h10v5h5v5h5v10h10v10h-10v10h-5v5h-5v5h-10v-5h-5v-5h-5v-10h-10v-10h10v-10h5v-5h5v-5z M35,30v5h-5v10h5v5h10v-5h5v-10h-5v-5h-10z M-5,-10h10v5h5v10h-5v5h-10v-5h-5v-10h5v-5z M75,-10h10v5h5v10h-5v5h-10v-5h-5v-10h5v-5z M-5,70h10v5h5v10h-5v5h-10v-5h-5v-10h5v-5z M75,70h10v5h5v10h-5v5h-10v-5h-5v-10h5v-5z'/%3E%3C/svg%3E")`,
                        backgroundSize: '80px 80px'
                    }}
                ></div>
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 relative z-10">
                    <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur border-4 border-white/40 overflow-hidden flex items-center justify-center shadow-lg text-white flex-shrink-0">
                        {profileUser?.foto ? (
                            <img src={profileUser.foto} alt="Perfil" className="w-full h-full object-cover" />
                        ) : (
                            <i className="fas fa-user-tie text-3xl drop-shadow-md"></i>
                        )}
                    </div>
                    <div className="space-y-2 text-center sm:text-left mt-2 sm:mt-0">
                        <h2 className="text-3xl font-extrabold drop-shadow-md leading-tight">
                            ¡Bienvenido al Portal Docente del Instituto IDeAr!
                        </h2>
                        <p className="text-orange-100 max-w-md drop-shadow text-sm">
                            Accede de forma rápida a la gestión de tus estudiantes, clases y herramientas académicas. A continuación, encontrarás un resumen de la actividad de hoy.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-6 relative z-10">
                    {unreadAnnouncementsCount > 0 && (
                        <div className="bg-white text-orange-600 px-4 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 shadow-lg animate-bounce mr-4">
                            <i className="fas fa-bell"></i>
                            ¡Tienes {unreadAnnouncementsCount} {unreadAnnouncementsCount === 1 ? 'mensaje nuevo' : 'mensajes nuevos'}!
                        </div>
                    )}
                    <div className="bg-white/10 p-4 rounded-2xl text-center backdrop-blur-sm min-w-[100px] border border-white/10">
                        <p className="text-xs text-orange-200 font-medium">Alumnos Activos</p>
                        <p className="text-3xl font-bold">{stats.totalAlumnos}</p>
                    </div>
                    <div className="bg-white/10 p-4 rounded-2xl text-center backdrop-blur-sm min-w-[100px]">
                        <p className="text-xs text-orange-200">Asistencia Hoy</p>
                        <p className="text-3xl font-bold">{stats.assistRate}%</p>
                    </div>
                </div>
            </div>

            {/* Tarjetas de Indicadores */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl">
                        <i className="fas fa-users"></i>
                    </div>
                    <div>
                        <p className="text-xs text-stone-400 font-semibold uppercase">Matrícula Activa</p>
                        <p className="text-2xl font-bold text-stone-800">{stats.totalAlumnos} alumnos</p>
                    </div>
                </div>

                <div 
                    onClick={() => setCurrentTab('campus')}
                    className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 p-6 rounded-2xl shadow-xl border border-indigo-700 flex flex-col justify-between text-white cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group"
                >
                    <div className="absolute -bottom-6 -right-6 opacity-20 text-9xl transform group-hover:scale-110 group-hover:-rotate-12 transition-all duration-500 pointer-events-none">
                        <i className="fas fa-graduation-cap"></i>
                    </div>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm border border-white/20">
                                <i className="fas fa-book-open text-2xl text-indigo-200"></i>
                            </div>
                            <h3 className="text-2xl font-black mb-2 tracking-tight">Campus Virtual</h3>
                            <p className="text-indigo-200 text-sm font-medium leading-relaxed max-w-[90%]">
                                Accede a tus aulas virtuales, publicaciones, tareas y material de estudio.
                            </p>
                        </div>
                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-indigo-700/50">
                            <span className="text-sm font-bold tracking-wide text-indigo-100">Ingresar al Campus</span>
                            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center group-hover:bg-indigo-500 transition-colors shadow-inner">
                                <i className="fas fa-arrow-right text-xs"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Avisos Institucionales y Alertador */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Cartelera de Avisos */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                            <i className="fas fa-bullhorn text-amber-500"></i> Avisos y Novedades
                        </h3>
                        <div className="flex items-center gap-3">
                            {unreadAnnouncementsCount > 0 && (
                                <button 
                                    onClick={() => {
                                        const now = Date.now();
                                        localStorage.setItem('idear_last_aviso', now.toString());
                                        setLastReadTime(now);
                                    }}
                                    className="text-[10px] text-stone-500 hover:text-stone-700 underline flex items-center gap-1 cursor-pointer"
                                >
                                    <i className="fas fa-check-double"></i> Marcar {unreadAnnouncementsCount === 1 ? 'leído' : 'leídos'}
                                </button>
                            )}
                            <button 
                                onClick={handleAddAnnouncement}
                                className="bg-amber-100 text-amber-700 hover:bg-amber-200 px-3 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1 border-0 cursor-pointer"
                            >
                                <i className="fas fa-plus"></i> Nuevo
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-[400px]">
                        {visibleAnnouncements.length === 0 ? (
                            <div className="text-center py-8 text-stone-400">
                                <i className="far fa-comments text-3xl mb-2 opacity-50"></i>
                                <p className="text-sm font-medium">No hay avisos recientes</p>
                            </div>
                        ) : (
                            visibleAnnouncements.map(aviso => (
                                <div key={aviso.id} className="bg-stone-50 p-4 rounded-2xl border border-stone-100 group relative text-stone-800">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <span className="text-[10px] font-bold text-stone-400 uppercase">{new Date(aviso.date).toLocaleDateString('es-AR')}</span>
                                            <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${aviso.sede === 'Global' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {aviso.sede}
                                            </span>
                                        </div>
                                        {(isDirector || aviso.authorId === (currentUser?.id || currentUser?.dni)) && (
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEditAnnouncement(aviso)} className="w-6 h-6 rounded-md bg-white border border-stone-200 text-stone-400 hover:text-blue-500 flex items-center justify-center shadow-sm cursor-pointer">
                                                    <i className="fas fa-pencil-alt text-[10px]"></i>
                                                </button>
                                                <button onClick={() => handleDeleteAnnouncement(aviso.id)} className="w-6 h-6 rounded-md bg-white border border-stone-200 text-stone-400 hover:text-rose-500 flex items-center justify-center shadow-sm cursor-pointer">
                                                    <i className="fas fa-trash text-[10px]"></i>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-sm text-stone-700 font-medium whitespace-pre-wrap">{aviso.text}</p>
                                    <div className="mt-2 text-[10px] text-stone-400 font-semibold text-right">
                                        Por: {aviso.authorName}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Alerta de Cuotas */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                            <i className="fas fa-bell text-rose-500"></i> Alerta de Cuotas
                        </h3>
                        <span className="text-xs bg-rose-50 text-rose-700 px-2 py-1 rounded-full font-bold">Mayo</span>
                    </div>

                    <div className="divide-y divide-stone-100">
                        {stats.deudoresList.length === 0 ? (
                            <div className="text-center py-8 text-stone-400">
                                <i className="fas fa-check-circle text-orange-500 text-3xl mb-2"></i>
                                <p className="text-sm font-medium">¡Todos al día en Mayo!</p>
                            </div>
                        ) : (
                            stats.deudoresList.map(std => {
                                const currentPeriod = new Date().toISOString().substring(0, 7);
                                const isReminderSent = std.lastReminderPeriod === currentPeriod;
                                
                                const levelConfig = configLevels.find(c => c.curso_nivel === std.level) || configLevels.find(c => c.curso_nivel === std.taller);
                                const cuota = std.cuotaOverride !== undefined && std.cuotaOverride !== "" ? Number(std.cuotaOverride) : (levelConfig?.cuota || 25000);
                                const debt = studentDebts[std.id] || 0;
                                const cuotasAprox = Math.max(1, Math.round(debt / cuota));

                                return (
                                    <div key={std.id} className="py-3 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-stone-800">
                                                {std.name} 
                                                <span className="text-rose-600 font-bold ml-2 text-xs bg-rose-50 px-2 py-0.5 rounded-full">
                                                    Deben ~{cuotasAprox} cuota{cuotasAprox > 1 ? 's' : ''}
                                                </span>
                                            </p>
                                            <p className="text-xs text-stone-400">{std.sede} | {std.level}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            {std.email && (
                                                <button 
                                                    onClick={() => handleSendReminder(std)}
                                                    disabled={isSendingEmail || isReminderSent}
                                                    className={`text-xs px-2 py-1.5 rounded-lg font-bold transition-all border-0 cursor-pointer ${isReminderSent ? 'bg-emerald-50 text-emerald-700 cursor-not-allowed' : 'bg-rose-50 hover:bg-rose-100 text-rose-700'}`}
                                                    title={isReminderSent ? "Recordatorio enviado este mes" : "Enviar recordatorio al correo"}
                                                >
                                                    <i className={isReminderSent ? "fas fa-check-circle" : "fas fa-paper-plane"}></i> {isReminderSent ? "Enviado" : "Recordatorio"}
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => {
                                                    setNewPayment(prev => ({ ...prev, studentId: std.id, period: "Mayo" }));
                                                    setCurrentTab("pagos");
                                                }}
                                                className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 px-2 py-1.5 rounded-lg font-bold transition-all border-0 cursor-pointer"
                                            >
                                                Cobrar
                                            </button>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardTab;
