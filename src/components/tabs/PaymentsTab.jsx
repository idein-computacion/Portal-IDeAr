import React from 'react';
import { formatDate } from '../../utils/formatters';

/**
 * Pestaña de Cobros y Pagos.
 * Extraído de App.jsx (líneas 3595–3848).
 */
const PaymentsTab = ({
    handleRegisterPayment,
    studentSelectSearch,
    setStudentSelectSearch,
    isStudentDropdownOpen,
    setIsStudentDropdownOpen,
    newPayment,
    setNewPayment,
    students,
    paymentMissingPeriods,
    METODOS_PAGO,
    filteredPayments,
    paymentFilter,
    setPaymentFilter,
    setActiveReceipt,
    handleDeletePayment,
    studentDebts
}) => {
    return (
        <div className="space-y-8 animate-fadeIn">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Registrador de pagos */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 lg:col-span-1">
                    <h3 className="text-lg font-bold text-stone-800 mb-6 flex items-center gap-2">
                        <i className="fas fa-cash-register text-amber-500"></i> Nuevo Pago / Cobro
                    </h3>

                    <form onSubmit={handleRegisterPayment} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Seleccionar Alumno</label>
                            <div className="relative">
                                <input 
                                    type="text"
                                    placeholder="Escribe para buscar alumno..."
                                    value={studentSelectSearch}
                                    onChange={(e) => {
                                        setStudentSelectSearch(e.target.value);
                                        setIsStudentDropdownOpen(true);
                                        setNewPayment(prev => ({ ...prev, studentId: "" }));
                                    }}
                                    onFocus={() => setIsStudentDropdownOpen(true)}
                                    onBlur={() => {
                                        setTimeout(() => setIsStudentDropdownOpen(false), 200);
                                    }}
                                    className="w-full p-3 rounded-xl border border-stone-200 outline-none bg-stone-50 font-semibold focus:ring-2 focus:ring-amber-500 text-stone-800"
                                    required={!newPayment.studentId}
                                />
                                {newPayment.studentId && (
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            setNewPayment(prev => ({ ...prev, studentId: "" }));
                                            setStudentSelectSearch("");
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 font-bold text-xs bg-stone-100 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors border-0 cursor-pointer"
                                        title="Limpiar selección"
                                    >
                                        <i className="fas fa-times"></i> Limpiar
                                    </button>
                                )}
                            </div>
                            
                            {isStudentDropdownOpen && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-stone-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                    {students
                                        .filter(s => s.name.toLowerCase().includes(studentSelectSearch.toLowerCase()) || s.dni.includes(studentSelectSearch))
                                        .length === 0 ? (
                                            <div className="p-3 text-sm text-stone-400 text-center">No se encontraron alumnos</div>
                                        ) : (
                                            students
                                                .filter(s => s.name.toLowerCase().includes(studentSelectSearch.toLowerCase()) || s.dni.includes(studentSelectSearch))
                                                .sort((a, b) => {
                                                    if (a.active && !b.active) return -1;
                                                    if (!a.active && b.active) return 1;
                                                    return a.name.localeCompare(b.name);
                                                })
                                                .map(s => (
                                                    <button
                                                        key={s.id}
                                                        type="button"
                                                        onMouseDown={() => {
                                                            setNewPayment(prev => ({ ...prev, studentId: s.id }));
                                                            setStudentSelectSearch(s.name);
                                                            setIsStudentDropdownOpen(false);
                                                        }}
                                                        className={`w-full text-left p-3 hover:bg-stone-50 text-sm font-semibold text-stone-700 transition-colors border-b border-stone-50 last:border-0 cursor-pointer ${!s.active ? 'opacity-75' : ''}`}
                                                    >
                                                        <span className="flex items-center justify-between gap-2">
                                                            <span>{s.name} <span className="text-xs text-stone-400 font-normal">({s.level})</span></span>
                                                            {!s.active && (
                                                                <span className="text-[10px] bg-rose-100 text-rose-600 font-bold px-1.5 py-0.5 rounded-full shrink-0">BAJA</span>
                                                            )}
                                                        </span>
                                                        {!s.active && studentDebts[s.id] > 0 && (
                                                            <span className="text-[10px] text-rose-500 font-bold">Deuda: ${studentDebts[s.id].toLocaleString()}</span>
                                                        )}
                                                    </button>
                                                ))
                                        )
                                    }
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Período / Cuota</label>
                                <select 
                                    value={newPayment.period}
                                    onChange={(e) => setNewPayment(prev => ({ ...prev, period: e.target.value }))}
                                    className="w-full p-3.5 rounded-xl border border-stone-200 outline-none bg-stone-50 font-semibold text-base focus:ring-2 focus:ring-amber-500 text-stone-700"
                                >
                                    {paymentMissingPeriods.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Fecha de Cobro</label>
                                <input 
                                    type="date"
                                    value={newPayment.date}
                                    onChange={(e) => setNewPayment(prev => ({ ...prev, date: e.target.value }))}
                                    className="w-full p-3.5 rounded-xl border border-stone-200 outline-none bg-stone-50 font-semibold text-base focus:ring-2 focus:ring-amber-500 text-stone-700"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Medio de Pago</label>
                                <select 
                                    value={newPayment.method}
                                    onChange={(e) => setNewPayment(prev => ({ ...prev, method: e.target.value }))}
                                    className="w-full p-3.5 rounded-xl border border-stone-200 outline-none bg-stone-50 font-semibold text-base focus:ring-2 focus:ring-amber-500 text-stone-700"
                                >
                                    {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>

                            {/* Campo Importe — grande para teclado numérico */}
                            <div>
                                <label className="block text-xs font-bold text-stone-500 uppercase mb-2">
                                    <i className="fas fa-dollar-sign text-amber-500 mr-1"></i> Importe ($)
                                </label>
                                <input 
                                    type="number"
                                    inputMode="numeric"
                                    value={newPayment.amount}
                                    onChange={(e) => setNewPayment(prev => ({ ...prev, amount: Number(e.target.value) }))}
                                    className="w-full px-5 py-5 rounded-2xl border-2 border-amber-200 outline-none bg-amber-50 font-black text-amber-700 text-3xl text-center focus:ring-2 focus:ring-amber-500 focus:border-amber-400 tracking-wide"
                                    required
                                />
                                <p className="text-[10px] text-stone-400 text-center mt-1">Tocá el campo para ingresar el monto</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Detalle o Concepto</label>
                            <input 
                                type="text"
                                placeholder="Ej: Cuota mensual de Mayo"
                                value={newPayment.concept}
                                onChange={(e) => setNewPayment(prev => ({ ...prev, concept: e.target.value }))}
                                className="w-full p-3.5 rounded-xl border border-stone-200 outline-none bg-stone-50 font-medium text-base focus:ring-2 focus:ring-amber-500 text-stone-700"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Nro de Recibo (Opcional)</label>
                            <input 
                                type="text"
                                placeholder="Ej: 00002-00000112"
                                value={newPayment.receiptNo}
                                onChange={(e) => setNewPayment(prev => ({ ...prev, receiptNo: e.target.value }))}
                                className="w-full p-3.5 rounded-xl border border-stone-200 outline-none bg-stone-50 font-medium text-stone-600 text-base focus:ring-2 focus:ring-amber-500"
                            />
                        </div>

                        <button 
                            type="submit"
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-4 px-4 rounded-2xl transition-all shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 text-base active:scale-95 border-0 cursor-pointer"
                        >
                            <i className="fas fa-receipt"></i> Registrar & Emitir Recibo
                        </button>
                    </form>
                </div>

                {/* Listado de cobros realizados */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 lg:col-span-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                        <h3 className="text-lg font-bold text-stone-800 flex flex-wrap items-center gap-2">
                            <i className="fas fa-receipt text-amber-500"></i> Historial de Cobros Recientes
                            {newPayment.studentId && (
                                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
                                    Filtrado por alumno
                                </span>
                            )}
                        </h3>
                        <input 
                            type="text"
                            placeholder="Buscar por alumno, periodo, medio..."
                            value={paymentFilter}
                            onChange={(e) => setPaymentFilter(e.target.value)}
                            className="p-2.5 rounded-xl border border-stone-200 text-sm outline-none w-full sm:w-64"
                        />
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-stone-100 text-xs text-stone-400 font-bold uppercase">
                                    <th className="py-3 px-4">Fecha</th>
                                    <th className="py-3 px-4">Alumno</th>
                                    <th className="py-3 px-4">Período</th>
                                    <th className="py-3 px-4">Medio</th>
                                    <th className="py-3 px-4">Monto</th>
                                    <th className="py-3 px-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-50">
                                {filteredPayments.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center py-8 text-stone-400 text-sm">No se encontraron cobros registrados</td>
                                    </tr>
                                ) : (
                                    filteredPayments.map(p => (
                                        <tr key={p.id} className="hover:bg-stone-50/50 transition-colors text-sm text-stone-800">
                                            <td className="py-3 px-4 font-medium text-stone-500">{formatDate(p.date)}</td>
                                            <td 
                                                className="py-3 px-4 font-semibold text-stone-800 cursor-pointer hover:text-emerald-600 hover:underline transition-colors"
                                                title="Nuevo cobro para este alumno"
                                                onClick={() => {
                                                    setNewPayment(prev => ({ ...prev, studentId: p.studentId }));
                                                    setStudentSelectSearch(p.studentName);
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }}
                                            >
                                                {p.studentName}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded-full text-xs font-bold">{p.period}</span>
                                            </td>
                                            <td className="py-3 px-4 text-stone-500">{p.method}</td>
                                            <td className="py-3 px-4 font-bold text-orange-600">${p.amount.toLocaleString()}</td>
                                            <td className="py-3 px-4 flex items-center justify-center gap-2">
                                                <button 
                                                    onClick={() => setActiveReceipt(p)}
                                                    title="Ver Recibo Oficial"
                                                    className="p-1.5 bg-stone-100 hover:bg-amber-500 hover:text-white text-stone-600 rounded-lg transition-all border-0 cursor-pointer"
                                                >
                                                    <i className="fas fa-file-invoice"></i>
                                                </button>
                                                <button 
                                                    onClick={() => handleDeletePayment(p.id)}
                                                    title="Eliminar registro"
                                                    className="p-1.5 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-600 rounded-lg transition-all border-0 cursor-pointer"
                                                >
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default PaymentsTab;
