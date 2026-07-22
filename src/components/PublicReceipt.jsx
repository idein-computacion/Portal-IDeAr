import React from 'react';
import { formatDate } from '../utils/formatters';

/**
 * Vista Oficial de Recibo para el Público (acceso por URL hash /query param).
 * Extraído de App.jsx (líneas 2478–2547).
 */
const PublicReceipt = ({ publicReceipt }) => {
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
                
                {/* CONTENEDOR OPTIMIZADO PARA A5 */}
                <div 
                    id="public-receipt-print-area" 
                    className="bg-white text-stone-900 p-6 sm:p-8 w-full shadow-2xl relative border-4 border-stone-200 rounded-[2rem]"
                    style={{ maxWidth: '148mm', minHeight: '105mm' }} 
                >
                    <div className="flex justify-between items-start border-b-2 pb-4 border-stone-200">
                        <div className="flex flex-col items-center text-center">
                            <img src="/logo.png" alt="Logo IDeAr" className="w-28 h-auto object-contain" />
                            <div className="mt-3">
                                <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Instituto Para el Desarrollo del Arte</p>
                                <p className="text-[10px] text-stone-400 mt-0.5">Reg. SPEPM N° 213/21</p>
                            </div>
                        </div>
                        <div className="text-right space-y-1.5">
                            <div className="bg-stone-900 text-white font-black px-4 py-1.5 rounded-lg text-sm inline-block uppercase tracking-wider shadow-sm">
                                Recibo X
                            </div>
                            <p className="text-xs font-bold text-stone-700 pt-1">Nro: {publicReceipt.receiptNo}</p>
                            <p className="text-[11px] text-stone-500 font-semibold">Fecha: {formatDate(publicReceipt.date)}</p>
                            <p className="text-[9px] text-stone-400 font-bold italic pt-1">Documento no válido como Factura</p>
                        </div>
                    </div>
                    
                    <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 mt-6 space-y-2">
                        <p className="flex justify-between items-center text-xs">
                            <span className="text-stone-500 font-bold uppercase">Alumno:</span>
                            <span className="font-extrabold text-stone-900 text-sm">{publicReceipt.studentName}</span>
                        </p>
                        <p className="flex justify-between items-center text-xs">
                            <span className="text-stone-500 font-bold uppercase">DNI:</span>
                            <span className="font-bold text-stone-700">{publicReceipt.studentId}</span>
                        </p>
                    </div>
                    
                    <div className="mt-6 space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-stone-100">
                            <div>
                                <p className="font-black text-stone-800 text-base">{publicReceipt.concept}</p>
                                <p className="text-xs text-stone-500 mt-1 font-medium">Mes: {publicReceipt.period} | Vía: {publicReceipt.method}</p>
                            </div>
                            <span className="font-black text-stone-900 text-xl">${publicReceipt.amount.toLocaleString()}</span>
                        </div>
                    </div>
                    
                    <div className="mt-8 border-t-2 border-stone-200 pt-4 flex justify-between items-end">
                        <span className="text-xs font-black uppercase text-stone-500 tracking-wider">Monto Total</span>
                        <div className="text-right">
                            <p className="text-3xl font-black text-amber-900">${publicReceipt.amount.toLocaleString()}</p>
                            <p className="text-[10px] text-stone-400 font-medium italic mt-1">Expresado en pesos argentinos</p>
                        </div>
                    </div>
                </div>
                
                <button 
                    onClick={handleDownloadPublicReceipt}
                    className="w-full max-w-sm mt-8 bg-amber-600 hover:bg-amber-700 text-white font-bold py-4 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-3 text-lg border-0 cursor-pointer"
                >
                    <i className="fas fa-file-pdf text-2xl"></i> Descargar Comprobante
                </button>
            </div>
        </div>
    );
};

export default PublicReceipt;
