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
    onOpenBoletin,
    onClose
}) => {
    const debt = studentDebts[selectedStudentDetail.id] || 0;
    const currentPeriod = new Date().toISOString().substring(0, 7);
    const isReminderSent = selectedStudentDetail.lastReminderPeriod === currentPeriod;

    return (
        <div className="fixed inset-0 bg-stone-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn no-print">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center">
                            {selectedStudentDetail.name.charAt(0)}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-stone-800">{selectedStudentDetail.name}</h3>
                            <p className="text-xs text-stone-400">DNI: {selectedStudentDetail.dni} | {selectedStudentDetail.sede}</p>
                            <p className="text-xs text-stone-500 font-medium mt-0.5">Nivel / Curso: <span className="font-bold text-stone-700">{selectedStudentDetail.level || selectedStudentDetail.taller || 'Sin nivel asignado'}</span></p>
                            {selectedStudentDetail.fecha_inicio && (
                                <p className="text-xs font-semibold text-amber-600 mt-1">
                                    Inscripto el: {formatDate(selectedStudentDetail.fecha_inicio)}
                                </p>
                            )}
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1 text-stone-400 hover:text-stone-600"
                    >
                        <i className="fas fa-times text-lg"></i>
                    </button>
                </div>

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
    );
};

export default StudentDetailModal;
