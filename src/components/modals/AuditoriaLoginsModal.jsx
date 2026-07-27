import React, { useState, useEffect } from 'react';
import { rtdb } from '../../config/firebase';
import { ref, query, orderByChild, startAt, get } from 'firebase/database';

const AuditoriaLoginsModal = ({ onClose, globalSede }) => {
    const [logins, setLogins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterSede, setFilterSede] = useState("Todas");

    useEffect(() => {
        const fetchLogins = async () => {
            setLoading(true);
            try {
                const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
                // Fetch from Firebase (last 7 days)
                const logsRef = query(ref(rtdb, 'auditoria_logins'), orderByChild('timestamp'), startAt(oneWeekAgo));
                const snapshot = await get(logsRef);
                
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    const parsedLogs = Object.values(data).sort((a, b) => b.timestamp - a.timestamp);
                    setLogins(parsedLogs);
                } else {
                    setLogins([]);
                }
            } catch (err) {
                console.error("Error fetching logins:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchLogins();
    }, []);

    const filteredLogins = logins.filter(l => filterSede === "Todas" || l.sede === filterSede);

    const sedesOptions = ["Todas", ...new Set(logins.map(l => l.sede))];

    return (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleIn">
                
                {/* Header */}
                <div className="bg-stone-900 text-white px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                    <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                        <i className="fas fa-user-clock text-amber-500"></i>
                        Auditoría de Accesos (Última Semana)
                    </h2>
                    <button 
                        onClick={onClose}
                        className="text-stone-400 hover:text-white transition-colors bg-stone-800 hover:bg-stone-700 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer border-0"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-y-auto bg-stone-50">
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                        <p className="text-sm text-stone-500 font-medium">
                            Se muestran los usuarios que iniciaron sesión en los últimos 7 días.
                        </p>
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-stone-600">Filtrar Sede:</label>
                            <select
                                value={filterSede}
                                onChange={(e) => setFilterSede(e.target.value)}
                                className="border border-stone-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                            >
                                {sedesOptions.map(sede => (
                                    <option key={sede} value={sede}>{sede}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-stone-400">
                            <i className="fas fa-spinner fa-spin text-3xl mb-3 text-amber-500"></i>
                            <p className="text-sm font-semibold">Cargando registros...</p>
                        </div>
                    ) : filteredLogins.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-stone-400">
                            <i className="fas fa-calendar-times text-4xl mb-3 opacity-50"></i>
                            <p className="text-sm font-semibold">No se encontraron inicios de sesión recientes.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-stone-100/50">
                                    <tr>
                                        <th className="py-3 px-4 text-[10px] uppercase font-bold text-stone-500 tracking-wider border-b">Fecha y Hora</th>
                                        <th className="py-3 px-4 text-[10px] uppercase font-bold text-stone-500 tracking-wider border-b">Usuario</th>
                                        <th className="py-3 px-4 text-[10px] uppercase font-bold text-stone-500 tracking-wider border-b">Rol</th>
                                        <th className="py-3 px-4 text-[10px] uppercase font-bold text-stone-500 tracking-wider border-b hidden sm:table-cell">Sede</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLogins.map(log => {
                                        const date = new Date(log.timestamp);
                                        return (
                                            <tr key={log.id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                                                <td className="py-3 px-4">
                                                    <div className="text-sm font-semibold text-stone-700">
                                                        {date.toLocaleDateString('es-AR')}
                                                    </div>
                                                    <div className="text-xs text-stone-400">
                                                        {date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="text-sm font-bold text-stone-800">{log.nombre}</div>
                                                    <div className="text-xs text-stone-500">DNI: {log.dni}</div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                                                        log.rol === 'Staff' 
                                                        ? 'bg-blue-100 text-blue-700' 
                                                        : 'bg-emerald-100 text-emerald-700'
                                                    }`}>
                                                        {log.rol}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 hidden sm:table-cell text-sm text-stone-600 font-medium">
                                                    {log.sede}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuditoriaLoginsModal;
