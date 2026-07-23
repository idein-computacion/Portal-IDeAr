import React from 'react';
import { formatDate } from '../../utils/formatters';

/**
 * Ficha Completa de Alumno.
 * Extraído de App.jsx (líneas 4238–4396).
 */
const StudentDetailModal = ({
    selectedStudentDetail,
    activeStudentStats,
    studentDebts,
    isSendingEmail,
    handleSendReminder,
    handleDeleteStudent,
    handleUpdateProfilePic,
    onOpenBoletin,
    onClose
}) => {
    const debt = studentDebts[selectedStudentDetail.id] || 0;
    const currentPeriod = new Date().toISOString().substring(0, 7);
    const isReminderSent = selectedStudentDetail.lastReminderPeriod === currentPeriod;

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
                if (handleUpdateProfilePic) {
                    handleUpdateProfilePic(canvas.toDataURL('image/jpeg', 0.8));
                }
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="fixed inset-0 bg-stone-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn no-print">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden relative">
                
                {/* Header Guardapampa */}
                <div className="relative bg-gradient-to-r from-black via-orange-600 to-yellow-500 overflow-hidden p-6 text-white mb-6">
                    <div className="absolute inset-0 z-0 opacity-100 mix-blend-overlay pointer-events-none" style={{ 
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cpath fill='rgba(255,255,255,0.1)' d='M35,15h10v5h5v5h5v10h10v10h-10v10h-5v5h-5v5h-10v-5h-5v-5h-5v-10h-10v-10h10v-10h5v-5h5v-5z M35,30v5h-5v10h5v5h10v-5h5v-10h-5v-5h-10z M-5,-10h10v5h5v10h-5v5h-10v-5h-5v-10h5v-5z M75,-10h10v5h5v10h-5v5h-10v-5h-5v-10h5v-5z M-5,70h10v5h5v10h-5v5h-10v-5h-5v-10h5v-5z M75,70h10v5h5v10h-5v5h-10v-5h-5v-10h5v-5z'/%3E%3C/svg%3E")`,
                        backgroundSize: '80px 80px'
                    }}></div>
                    
                    <div className="absolute -left-8 -top-8 opacity-20 pointer-events-none">
                        <img src="/logo.png" alt="IDeAr" className="w-40 h-40 object-contain drop-shadow-xl filter grayscale contrast-200 brightness-200" />
                    </div>

                    <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur border-4 border-white/40 overflow-hidden flex items-center justify-center shadow-lg text-white">
                                {selectedStudentDetail.profilePic ? (
                                    <img src={selectedStudentDetail.profilePic} alt="Perfil" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-3xl font-bold">{selectedStudentDetail.name.charAt(0)}</span>
                                )}
                            </div>
                            <label className="absolute bottom-0 right-0 bg-amber-500 hover:bg-amber-600 text-white w-8 h-8 rounded-full flex items-center justify-center cursor-pointer shadow-md transition-all">
                                <i className="fas fa-camera text-xs"></i>
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </label>
                        </div>
                        
                        <div className="flex-1 text-center sm:text-left mt-2 sm:mt-0">
                            <div className="flex items-center justify-between">
                                <h3 className="text-2xl font-black tracking-wide text-white drop-shadow-md">
                                    {selectedStudentDetail.name}
                                </h3>
                                <button onClick={onClose} className="text-white/70 hover:text-white transition-colors bg-transparent border-0 cursor-pointer">
                                    <i className="fas fa-times text-xl drop-shadow-md"></i>
                                </button>
                            </div>
                            <p className="text-xs text-orange-100 mt-1">DNI: {selectedStudentDetail.dni} | {selectedStudentDetail.sede}</p>
                            <p className="text-xs font-medium mt-0.5 text-orange-100">Nivel / Curso: <span className="font-bold text-white">{selectedStudentDetail.level || selectedStudentDetail.taller || 'Sin nivel asignado'}</span></p>
                            {selectedStudentDetail.fecha_inicio && (
                                <p className="text-xs font-bold text-white mt-1 bg-black/20 inline-block px-2 py-0.5 rounded backdrop-blur">
                                    Inscripto el: {formatDate(selectedStudentDetail.fecha_inicio)}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-6 pt-0">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Presentismo */}
                    <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                        <h4 className="text-xs font-bold text-stone-400 uppercase mb-3">Estadística de Asistencias</h4>
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-3xl font-extrabold text-amber-600">{activeStudentStats.attendanceRate}%</p>
                                <p className="text-xs text-stone-500">Tasa de presentismo</p>
                            </div>
                            <div className="text-xs space-y-1 text-stone-600">
                                <p className="flex justify-between gap-4"><span>Presentes:</span> <span className="font-bold text-orange-600">{activeStudentStats.presents}</span></p>
                                <p className="flex justify-between gap-4"><span>Justificados:</span> <span className="font-bold text-amber-600">{activeStudentStats.excused}</span></p>
                                <p className="flex justify-between gap-4"><span>Ausentes:</span> <span className="font-bold text-rose-600">{activeStudentStats.absents}</span></p>
                            </div>
                        </div>
                    </div>

                    {/* Estado Financiero */}
                    <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                        <div className="flex justify-between items-start mb-3">
                            <h4 className="text-xs font-bold text-stone-400 uppercase">Estado Financiero</h4>
                            <div className="text-right">
                                <p className={`text-xl font-extrabold ${debt > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    Saldo Total: ${debt.toLocaleString()}
                                </p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {/* Desglose por año */}
                            {activeStudentStats.yearlyBreakdown && activeStudentStats.yearlyBreakdown.map(yb => (
                                <div key={yb.year} className="bg-white p-3 rounded-xl border border-stone-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <h5 className="text-xs font-extrabold text-stone-700">
                                            <i className="fas fa-calendar-alt mr-1 text-amber-500"></i>
                                            Año {yb.year}
                                        </h5>
                                        <span className={`text-sm font-extrabold ${yb.debt > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            {yb.debt > 0 ? `Debe: $${yb.debt.toLocaleString()}` : 'Al día ✓'}
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-stone-500 mb-2">
                                        {yb.monthCount} cuota{yb.monthCount !== 1 ? 's' : ''} + inscripción · 
                                        Total esperado: <span className="font-bold">${yb.totalExpected.toLocaleString()}</span>
                                        {yb.totalPaid > 0 && (<> · Pagado: <span className="font-bold text-emerald-600">${yb.totalPaid.toLocaleString()}</span></>)}
                                    </div>
                                    {yb.missingMonths.length > 0 && (
                                        <p className="text-[10px] text-rose-500 font-bold">
                                            Meses impagos: {yb.missingMonths.join(', ')}
                                        </p>
                                    )}
                                </div>
                            ))}

                            <div className="flex gap-4 text-[11px] text-stone-500 font-medium bg-white p-2 rounded-lg border border-stone-100">
                                <p>Cuota mensual: <span className="font-bold text-stone-700">${activeStudentStats.valorCuota.toLocaleString()}</span></p>
                                <p>Inscripción: <span className="font-bold text-stone-700">${activeStudentStats.valorInscripcion.toLocaleString()}</span></p>
                            </div>
                            {debt > 0 && selectedStudentDetail.email && (
                                <button 
                                    onClick={() => handleSendReminder()}
                                    disabled={isSendingEmail || isReminderSent}
                                    className={`mt-3 block w-full text-center ${isReminderSent ? 'bg-emerald-50 text-emerald-700 cursor-not-allowed border-emerald-200' : (isSendingEmail ? 'bg-rose-100 text-rose-400 cursor-not-allowed' : 'bg-rose-50 hover:bg-rose-100 text-rose-700')} font-bold py-2 px-4 rounded-xl text-xs transition-colors border ${!isReminderSent && 'border-rose-200'} shadow-sm`}
                                >
                                    {isSendingEmail ? (
                                        <><i className="fas fa-spinner fa-spin mr-2"></i> Enviando...</>
                                    ) : isReminderSent ? (
                                        <><i className="fas fa-check-circle mr-2"></i> Recordatorio ya enviado este mes</>
                                    ) : (
                                        <><i className="fas fa-envelope mr-2"></i> Enviar Recordatorio (vía Gmail)</>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Últimos Pagos Registrados */}
                <div>
                    <h4 className="text-sm font-bold text-stone-800 mb-3">Historial de Pagos Efectuados</h4>
                    {activeStudentStats.payments.length === 0 ? (
                        <p className="text-xs text-stone-400 text-center py-6">No hay registros de pago para este alumno</p>
                    ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {activeStudentStats.payments.map(p => (
                                <div key={p.id} className="flex items-center justify-between p-3 bg-stone-50/50 rounded-xl border border-stone-100 text-xs">
                                    <div>
                                        <p className="font-bold text-stone-700">{p.concept}</p>
                                        <p className="text-[10px] text-stone-400">{formatDate(p.date)} | Recibo: {p.receiptNo}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-extrabold text-orange-600">${p.amount.toLocaleString()}</p>
                                        <span className="text-[9px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded font-bold">{p.method}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="pt-6 mt-6 border-t border-stone-100 flex justify-between items-center">
                    {selectedStudentDetail.active === false ? (
                        <button
                            onClick={() => handleDeleteStudent(selectedStudentDetail.id)}
                            className="bg-red-100 hover:bg-red-200 text-red-700 font-bold py-2.5 px-6 rounded-xl text-sm transition-all shadow-sm flex items-center gap-2"
                        >
                            <i className="fas fa-trash-alt"></i> Eliminar Definitivamente
                        </button>
                    ) : (
                        <button
                            onClick={() => onOpenBoletin(selectedStudentDetail)}
                            className="bg-stone-800 hover:bg-stone-900 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all shadow-md flex items-center gap-2"
                        >
                            <i className="fas fa-file-invoice"></i> Generar Boletín
                        </button>
                    )}
                    <button 
                        onClick={onClose}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all shadow-md"
                    >
                        Cerrar Ficha
                    </button>
                </div>
                </div>
            </div>
        </div>
    );
};

export default StudentDetailModal;
