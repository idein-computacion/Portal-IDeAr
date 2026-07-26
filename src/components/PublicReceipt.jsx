import React from 'react';
import { formatDate } from '../utils/formatters';
import { getReceiptBreakdown } from '../utils/receiptHelpers';

/**
 * Vista Oficial de Recibo para el Público (acceso por URL hash /query param).
 * Extraído de App.jsx (líneas 2478–2547).
 */
const PublicReceipt = ({ publicReceipt, configLevels = [], students = [], globalSede = 'Leandro N. Alem', generalConfig = {} }) => {
    const handleDownloadPublicReceipt = () => {
        const element = document.getElementById('public-receipt-print-area');
        if (window.html2pdf && element) {
            const opt = {
                margin: 8,
                filename: `Comprobante_${publicReceipt.receiptNo}.pdf`,
                image: { type: 'jpeg', quality: 1 },
                html2canvas: { 
                    scale: 2, 
                    useCORS: true, 
                    scrollY: 0 
                },
                jsPDF: { unit: 'mm', format: 'a5', orientation: 'portrait' }
            };
            window.html2pdf().set(opt).from(element).save();
        } else {
            window.print();
        }
    };

    return (
        <div className="min-h-screen bg-stone-200 flex flex-col items-center p-4 sm:p-8">
            <div className="w-full max-w-3xl flex flex-col items-center">
                <h2 className="text-2xl font-black text-center text-stone-800 mb-6">Comprobante Oficial de Pago</h2>
                
                {/* CONTENEDOR OPTIMIZADO PARA IMPRESIÓN OFICIAL */}
                <div 
                    id="public-receipt-print-area" 
                    className="bg-white text-stone-900 p-6 sm:p-8 w-full shadow-2xl relative border-4 border-stone-200 rounded-[2rem]"
                    style={{ maxWidth: '148mm', minHeight: '105mm' }} 
                >
                    {/* Encabezado Principal Recibo */}
                    <div className="flex justify-between items-start border-b pb-4 border-stone-200">
                        <div className="flex flex-col items-center text-center">
                            <img src="/logo.png" alt="Logo IDeAr" className="w-36 h-auto object-contain" />
                            <div className="mt-3">
                                <h4 className="text-sm font-black tracking-tight text-amber-900">{generalConfig?.profesor || "SILVA GRACIELA BEATRIZ"}</h4>
                                <p className="text-[10px] text-stone-500 font-semibold">Instituto Para el Desarrollo del Arte (IDeAr)</p>
                                <p className="text-[10px] text-stone-600 font-bold mt-1">Sede: {globalSede}</p>
                                <p className="text-[10px] text-stone-500 mt-2">Reg. SPEPM N° 213/21</p>
                                <p className="text-[10px] text-stone-400 mt-2">Cataratas Del Iguazú 912 - Leandro N. Alem - Mnes.</p>
                            </div>
                        </div>
                        <div className="text-right space-y-1">
                            <div className="bg-stone-900 text-white font-black px-4 py-1.5 rounded-lg text-sm inline-block uppercase tracking-wider">
                                Recibo X
                            </div>
                            <p className="text-xs font-bold text-stone-600 pt-1">Nro: {publicReceipt.receiptNo}</p>
                            <p className="text-[10px] text-stone-400 font-semibold">Fecha: {formatDate(publicReceipt.date)}</p>
                            
                            <div className="pt-3 text-[10px] text-stone-500 font-medium space-y-1.5">
                                <p>CUIT: 27-25496483-8</p>
                                <p>Ingresos Brutos: 27-25496483-8</p>
                                <p>Monotributista Responsable</p>
                                <p className="font-bold text-stone-400 italic">Documento no válido como Factura</p>
                            </div>
                        </div>
                    </div>

                    {/* Datos del Alumno Receptor */}
                    <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 text-xs space-y-2 mt-6">
                        <p className="flex justify-between">
                            <span className="text-stone-400 font-bold uppercase text-[10px]">Alumno / Estudiante:</span>
                            <span className="font-extrabold text-stone-800">{publicReceipt.studentName}</span>
                        </p>
                        <p className="flex justify-between">
                            <span className="text-stone-400 font-bold uppercase text-[10px]">Identificación (DNI):</span>
                            <span className="font-semibold text-stone-700">{publicReceipt.studentId}</span>
                        </p>
                    </div>

                    {/* Detalle y Valores */}
                    <div className="space-y-3 mt-6">
                        <div className="flex justify-between text-xs font-bold text-stone-400 uppercase border-b pb-1">
                            <span>Detalle del Servicio / Concepto</span>
                            <span>Importe</span>
                        </div>
                        {getReceiptBreakdown(publicReceipt, configLevels, students).map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm py-1 border-b border-dashed border-stone-100 animate-fadeIn">
                                <div>
                                    <p className="font-bold text-stone-800">{item.label}</p>
                                    <p className="text-[10px] text-stone-400">{item.subtitle}</p>
                                </div>
                                <span className={`font-semibold ${item.label.includes("Parte de pago") ? "text-emerald-700" : "text-stone-700"}`}>
                                    ${item.amount.toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Total Final */}
                    <div className="border-t mt-6 pt-4 flex justify-between items-center">
                        <span className="text-xs font-black uppercase text-stone-500">Monto Total Recibido</span>
                        <div className="text-right">
                            <p className="text-2xl font-black text-amber-900">${publicReceipt.amount.toLocaleString()}</p>
                            <p className="text-[9px] text-stone-400 italic">Expresado en pesos argentinos</p>
                        </div>
                    </div>

                    {/* Información de Saldos y Deudas */}
                    {(publicReceipt.periodBalance > 0 || publicReceipt.previousDebt > 0 || publicReceipt.balanceToDate !== undefined) && (
                        <div className="bg-amber-50/60 border border-amber-200/50 rounded-xl p-3 text-xs space-y-1.5 mt-4 animate-fadeIn">
                            {publicReceipt.periodBalance > 0 && (
                                <div className="flex justify-between text-amber-900 font-semibold">
                                    <span>Saldo pendiente de este período ({publicReceipt.period} {publicReceipt.date ? publicReceipt.date.substring(0, 4) : ''}):</span>
                                    <span className="font-extrabold">${publicReceipt.periodBalance.toLocaleString()}</span>
                                </div>
                            )}
                            {publicReceipt.balanceToDate !== undefined && (
                                <div className="flex justify-between text-stone-700 font-bold border-t border-dashed border-stone-200 pt-1">
                                    <span>Saldo total pendiente a la fecha:</span>
                                    <span className="font-extrabold">${publicReceipt.balanceToDate.toLocaleString()}</span>
                                </div>
                            )}
                            {publicReceipt.previousDebt > 0 && (
                                <div className="flex justify-between text-rose-800 font-bold">
                                    <span>⚠️ Recordatorio de Deuda Anterior Acumulada:</span>
                                    <span className="font-extrabold">${publicReceipt.previousDebt.toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                
                <div className="w-full max-w-sm mt-8 flex flex-col sm:flex-row gap-4">
                    <button 
                        onClick={handleDownloadPublicReceipt}
                        className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-4 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 text-base border-0 cursor-pointer"
                    >
                        <i className="fas fa-file-pdf text-xl"></i> Descargar
                    </button>
                    <button 
                        onClick={() => { 
                            try {
                                window.close();
                            } catch (e) {
                                console.log(e);
                            }
                            // Si el navegador bloquea window.close(), redirigimos al inicio
                            setTimeout(() => {
                                window.location.replace('/');
                            }, 300);
                        }}
                        className="flex-1 bg-stone-300 hover:bg-stone-400 text-stone-800 font-bold py-4 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 text-base border-0 cursor-pointer"
                    >
                        <i className="fas fa-times text-xl"></i> Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PublicReceipt;
