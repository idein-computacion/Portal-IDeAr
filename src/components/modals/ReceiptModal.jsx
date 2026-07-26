import React, { useState } from 'react';
import { formatDate } from '../../utils/formatters';
import { getReceiptBreakdown, enviarReciboPorWhatsApp } from '../../utils/receiptHelpers';
import ReminderPreviewModal from './ReminderPreviewModal';
import { MessageCircle } from 'lucide-react';

/**
 * Modal Visor de Recibo Oficial Alta Fidelidad.
 * Extraído de App.jsx (líneas 4394–4638).
 */
const ReceiptModal = ({
    activeReceipt,
    configLevels,
    students,
    globalSede,
    generalConfig,
    onClose,
    isSendingEmail,
    setIsSendingEmail,
    addNotification,
    isStudent = false
}) => {
    const [receiptEmailPreview, setReceiptEmailPreview] = useState(null);
    const handlePrintReceipt = () => {
        window.print();
    };

    const handleSendEmail = async () => {
        if (!window.html2pdf) {
            addNotification("Faltan librerías para procesar el PDF.", "error");
            return;
        }
        const student = students.find(s => s.id === activeReceipt?.studentId);
        if (!student || !student.email) {
            addNotification("El alumno no tiene un correo registrado.", "error");
            return;
        }

        setIsSendingEmail(true);
        
        const printContainer = document.querySelector('.print-only');
        if (!printContainer) {
            setIsSendingEmail(false);
            return;
        }
        
        printContainer.classList.remove('hidden');
        printContainer.style.position = 'absolute';
        printContainer.style.top = '0';
        printContainer.style.left = '0';
        printContainer.style.width = '100vw';
        printContainer.style.height = 'auto';
        printContainer.style.minHeight = '100vh';
        printContainer.style.backgroundColor = 'white';
        printContainer.style.zIndex = '-1';
        printContainer.style.overflow = 'visible';
        
        window.scrollTo(0, 0);
        
        const targetElement = printContainer.children[0];

        try {
            const opt = {
                margin: [10, 10, 10, 10],
                filename: `Recibo_${activeReceipt.receiptNo}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            const pdfBase64DataUrl = await window.html2pdf().set(opt).from(targetElement).outputPdf('datauristring');
            const base64Data = pdfBase64DataUrl.split(',')[1];
            
            const payload = {
                email: student.email,
                nombre: activeReceipt.studentName,
                asunto: `Comprobante de Pago Nro ${activeReceipt.receiptNo} - IDeAr`,
                cuerpo: `Hola ${activeReceipt.studentName},\n\nNos comunicamos del Instituto Para el Desarrollo del Arte (IDeAr).\n\nAquí tienes adjunto tu comprobante de pago Nro: ${activeReceipt.receiptNo}.\n\nDetalle del Pago:\n- Concepto: ${activeReceipt.concept}\n- Periodo: ${activeReceipt.period}\n- Importe Abonado: $${activeReceipt.amount.toLocaleString()}\n- Medio de Pago: ${activeReceipt.method}\n\nSaludos cordiales,\nEquipo IDeAr - Sede ${globalSede}`,
                pdfBase64: base64Data,
                pdfName: `Recibo_${activeReceipt.receiptNo}.pdf`
            };

            setReceiptEmailPreview(payload);
        } catch (error) {
            console.error("Error generando PDF para email:", error);
            addNotification("Error al intentar procesar el comprobante.", "error");
        } finally {
            printContainer.classList.add('hidden');
            printContainer.style.position = '';
            printContainer.style.top = '';
            printContainer.style.left = '';
            printContainer.style.width = '';
            printContainer.style.height = '';
            printContainer.style.backgroundColor = '';
            printContainer.style.zIndex = '';
            printContainer.style.overflow = '';
            
            setIsSendingEmail(false);
        }
    };

    const handleConfirmSendReceipt = async (editedEmail, editedAsunto, editedCuerpo) => {
        if (!receiptEmailPreview) return;

        setIsSendingEmail(true);
        try {
            const finalPayload = {
                ...receiptEmailPreview,
                email: editedEmail,
                asunto: editedAsunto,
                cuerpo: editedCuerpo
            };

            const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwv_BLt6KWt-e6pvzKIHbOx95OsdAIT0dbaAVqUJC9tCv7Jm602PkWxjv3hC7473sVT/exec";

            await fetch(GOOGLE_SCRIPT_URL, {
                method: "POST",
                mode: "no-cors",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(finalPayload)
            });

            addNotification("¡El comprobante se envió con éxito por correo!", "success");
            setReceiptEmailPreview(null);
            onClose();
        } catch (error) {
            console.error("Error enviando email de recibo:", error);
            addNotification("Error al intentar enviar el correo.", "error");
        } finally {
            setIsSendingEmail(false);
        }
    };

    return (
        <>
            {/* Modal en pantalla */}
            <div className="fixed inset-0 bg-stone-950/65 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn overflow-y-auto no-print">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl p-8 max-h-[95vh] overflow-y-auto relative">
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 p-2 rounded-full hover:bg-stone-50 transition-all"
                    >
                        <i className="fas fa-times text-lg"></i>
                    </button>

                    {/* Contenedor Oficial del Recibo para imprimir */}
                    <div id="receipt-print-area" className="bg-white text-stone-900 p-6 border-2 border-stone-300 rounded-2xl space-y-6">
                        
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
                                <p className="text-xs font-bold text-stone-600 pt-1">Nro: {activeReceipt.receiptNo}</p>
                                <p className="text-[10px] text-stone-400 font-semibold">Fecha: {formatDate(activeReceipt.date)}</p>
                                
                                <div className="pt-3 text-[10px] text-stone-500 font-medium space-y-1.5">
                                    <p>CUIT: 27-25496483-8</p>
                                    <p>Ingresos Brutos: 27-25496483-8</p>
                                    <p>Monotributista Responsable</p>
                                    <p className="font-bold text-stone-400 italic">Documento no válido como Factura</p>
                                </div>
                            </div>
                        </div>

                        {/* Datos del Alumno Receptor */}
                        <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 text-xs space-y-2">
                            <p className="flex justify-between">
                                <span className="text-stone-400 font-bold uppercase text-[10px]">Alumno / Estudiante:</span>
                                <span className="font-extrabold text-stone-800">{activeReceipt.studentName}</span>
                            </p>
                            <p className="flex justify-between">
                                <span className="text-stone-400 font-bold uppercase text-[10px]">Identificación (DNI):</span>
                                <span className="font-semibold text-stone-700">{activeReceipt.studentId}</span>
                            </p>
                        </div>

                        {/* Detalle y Valores */}
                        <div className="space-y-3">
                            <div className="flex justify-between text-xs font-bold text-stone-400 uppercase border-b pb-1">
                                <span>Detalle del Servicio / Concepto</span>
                                <span>Importe</span>
                            </div>
                            {getReceiptBreakdown(activeReceipt, configLevels, students).map((item, idx) => (
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
                        <div className="border-t pt-4 flex justify-between items-center">
                            <span className="text-xs font-black uppercase text-stone-500">Monto Total Recibido</span>
                            <div className="text-right">
                                <p className="text-2xl font-black text-amber-900">${activeReceipt.amount.toLocaleString()}</p>
                                <p className="text-[9px] text-stone-400 italic">Expresado en pesos argentinos</p>
                            </div>
                        </div>

                        {/* Información de Saldos y Deudas */}
                        {(activeReceipt.periodBalance > 0 || activeReceipt.previousDebt > 0 || activeReceipt.balanceToDate !== undefined) && (
                            <div className="bg-amber-50/60 border border-amber-200/50 rounded-xl p-3 text-xs space-y-1.5 mt-2 animate-fadeIn">
                                {activeReceipt.periodBalance > 0 && (
                                    <div className="flex justify-between text-amber-900 font-semibold">
                                        <span>Saldo pendiente de este período ({activeReceipt.period} {activeReceipt.date ? activeReceipt.date.substring(0, 4) : ''}):</span>
                                        <span className="font-extrabold">${activeReceipt.periodBalance.toLocaleString()}</span>
                                    </div>
                                )}
                                {activeReceipt.balanceToDate !== undefined && (
                                    <div className="flex justify-between text-stone-700 font-bold border-t border-dashed border-stone-200 pt-1">
                                        <span>Saldo total pendiente a la fecha:</span>
                                        <span className="font-extrabold">${activeReceipt.balanceToDate.toLocaleString()}</span>
                                    </div>
                                )}
                                {activeReceipt.previousDebt > 0 && (
                                    <div className="flex justify-between text-rose-800 font-bold">
                                        <span>⚠️ Recordatorio de Deuda Anterior Acumulada:</span>
                                        <span className="font-extrabold">${activeReceipt.previousDebt.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Botonera de impresión */}
                    <div className="flex gap-4 mt-6">
                        <button 
                            onClick={onClose}
                            className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold py-3 rounded-xl transition-all"
                        >
                            Volver
                        </button>
                        <button 
                            onClick={handlePrintReceipt}
                            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                        >
                            <i className="fas fa-print"></i> Imprimir (PDF)
                        </button>
                        {!isStudent && (
                            <button 
                                onClick={handleSendEmail}
                                disabled={isSendingEmail}
                                className={`flex-1 ${isSendingEmail ? 'bg-rose-400 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-700'} text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2`}
                            >
                                {isSendingEmail ? (
                                    <><i className="fas fa-spinner fa-spin"></i> Enviando...</>
                                ) : (
                                    <><i className="fas fa-envelope"></i> Enviar Gmail</>
                                )}
                            </button>
                        )}
                        {!isStudent && (
                            <button 
                                onClick={() => {
                                    const student = students.find(s => s.id === activeReceipt?.studentId);
                                    enviarReciboPorWhatsApp(student, activeReceipt, configLevels, students, globalSede, generalConfig);
                                }}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                            >
                                <MessageCircle size={18} /> Enviar por WhatsApp
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* CONTENEDOR ESPECIAL DE IMPRESIÓN SOLO PARA EL RECIBO */}
            <div className="hidden print-only">
                <div className="bg-white text-black p-8 font-sans" style={{ width: "100%", maxWidth: "500px", margin: "0 auto" }}>
                    <div style={{ border: "2px solid #ccc", padding: "20px", borderRadius: "10px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", borderBottom: "1px solid #ccc", paddingBottom: "15px" }}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                                <img src="/logo.png" alt="Logo IDeAr" style={{ width: "144px", height: "auto", objectFit: "contain" }} />
                                <div style={{ marginTop: "12px" }}>
                                    <h2 style={{ fontSize: "14px", fontWeight: "900", margin: "0" }}>{generalConfig?.profesor || "SILVA GRACIELA BEATRIZ"}</h2>
                                    <p style={{ fontSize: "10px", color: "#555", fontWeight: "600", margin: "4px 0 0 0" }}>Instituto Para el Desarrollo del Arte (IDeAr)</p>
                                    <p style={{ fontSize: "10px", color: "#000", fontWeight: "700", margin: "4px 0 0 0" }}>Sede: {globalSede}</p>
                                    <p style={{ fontSize: "10px", color: "#555", margin: "8px 0 0 0" }}>Reg. SPEPM N° 213/21</p>
                                    <p style={{ fontSize: "10px", color: "#666", margin: "8px 0 0 0" }}>Cataratas Del Iguazú 912 - Leandro N. Alem - Mnes.</p>
                                </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <span style={{ background: "black", color: "white", padding: "5px 15px", fontWeight: "bold", fontSize: "12px", borderRadius: "4px" }}>RECIBO X</span>
                                <p style={{ fontSize: "12px", fontWeight: "bold", margin: "5px 0 0 0" }}>N° {activeReceipt.receiptNo}</p>
                                <p style={{ fontSize: "11px", color: "#888", margin: "0" }}>Fecha: {formatDate(activeReceipt.date)}</p>
                                <div style={{ fontSize: "10px", color: "#555", marginTop: "10px", textAlign: "right", lineHeight: "1.4" }}>
                                    <p style={{ margin: "0" }}>CUIT: 27-25496483-8</p>
                                    <p style={{ margin: "0" }}>Ingresos Brutos: 27-25496483-8</p>
                                    <p style={{ margin: "0" }}>Monotributista Responsable</p>
                                    <p style={{ margin: "0", fontWeight: "bold", color: "#888" }}>Documento no válido como Factura</p>
                                </div>
                            </div>
                        </div>
                        <div style={{ padding: "15px 0", borderBottom: "1px solid #ccc", fontSize: "13px" }}>
                            <p style={{ margin: "0 0 5px 0" }}><strong>Estudiante:</strong> {activeReceipt.studentName}</p>
                            <p style={{ margin: "0" }}><strong>DNI:</strong> {activeReceipt.studentId}</p>
                        </div>
                        <div style={{ padding: "15px 0", borderBottom: "1px solid #ccc" }}>
                            <h3 style={{ fontSize: "12px", textTransform: "uppercase", color: "#666", margin: "0 0 10px 0" }}>Detalle del Servicio</h3>
                            {getReceiptBreakdown(activeReceipt, configLevels, students).map((item, idx) => (
                                <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "5px 0", borderBottom: "1px dashed #eee" }}>
                                    <div>
                                        <p style={{ margin: "0", fontWeight: "bold" }}>{item.label}</p>
                                        <p style={{ margin: "2px 0 0 0", fontSize: "10px", color: "#666" }}>{item.subtitle}</p>
                                    </div>
                                    <span style={{ fontWeight: "semibold", color: item.label.includes("Parte de pago") ? "#047857" : "#000" }}>
                                        ${item.amount.toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "15px" }}>
                            <span style={{ fontSize: "12px", fontWeight: "bold", textTransform: "uppercase" }}>Monto Recibido</span>
                            <span style={{ fontSize: "22px", fontWeight: "900" }}>${activeReceipt.amount.toLocaleString()}</span>
                        </div>
                        {(activeReceipt.periodBalance > 0 || activeReceipt.previousDebt > 0 || activeReceipt.balanceToDate !== undefined) && (
                            <div style={{ backgroundColor: "#fef3c7", border: "1px solid #fde68a", borderRadius: "6px", padding: "10px", marginTop: "15px", fontSize: "11px", lineHeight: "1.4" }}>
                                {activeReceipt.periodBalance > 0 && (
                                    <div style={{ display: "flex", justifyContent: "space-between", color: "#78350f", fontWeight: "600" }}>
                                        <span>Saldo pendiente de este período ({activeReceipt.period} {activeReceipt.date ? activeReceipt.date.substring(0, 4) : ''}):</span>
                                        <span><strong>${activeReceipt.periodBalance.toLocaleString()}</strong></span>
                                    </div>
                                )}
                                {activeReceipt.balanceToDate !== undefined && (
                                    <div style={{ display: "flex", justifyContent: "space-between", color: "#44403c", fontWeight: "700", borderTop: "1px dashed #d6d3d1", marginTop: "5px", paddingTop: "5px" }}>
                                        <span>Saldo total pendiente a la fecha:</span>
                                        <span><strong>${activeReceipt.balanceToDate.toLocaleString()}</strong></span>
                                    </div>
                                )}
                                {activeReceipt.previousDebt > 0 && (
                                    <div style={{ display: "flex", justifyContent: "space-between", color: "#991b1b", fontWeight: "700", marginTop: "5px" }}>
                                        <span>⚠️ Recordatorio de Deuda Anterior Acumulada:</span>
                                        <span><strong>${activeReceipt.previousDebt.toLocaleString()}</strong></span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {receiptEmailPreview && (
                <ReminderPreviewModal
                    reminderPreview={receiptEmailPreview}
                    onClose={() => setReceiptEmailPreview(null)}
                    onConfirm={handleConfirmSendReceipt}
                    isSending={isSendingEmail}
                />
            )}
        </>
    );
};

export default ReceiptModal;
