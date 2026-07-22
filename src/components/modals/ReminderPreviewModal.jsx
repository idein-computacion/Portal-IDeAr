import React, { useState } from 'react';

/**
 * Modal para previsualizar, editar y confirmar el correo de recordatorio de pago.
 */
const ReminderPreviewModal = ({
    reminderPreview,
    onClose,
    onConfirm,
    isSending
}) => {
    if (!reminderPreview) return null;

    const [email, setEmail] = useState(reminderPreview.email);
    const [asunto, setAsunto] = useState(reminderPreview.asunto);
    const [cuerpo, setCuerpo] = useState(reminderPreview.cuerpo);

    const handleSubmit = (e) => {
        e.preventDefault();
        onConfirm(email, asunto, cuerpo);
    };

    return (
        <div className="fixed inset-0 bg-stone-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fadeIn no-print">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-100">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                            <i className="fas fa-envelope-open-text text-lg"></i>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-stone-850">Previsualizar Correo de Recordatorio</h3>
                            <p className="text-xs text-stone-500">Revisá y personalizá el mensaje antes de enviarlo</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1 text-stone-400 hover:text-stone-600"
                        disabled={isSending}
                    >
                        <i className="fas fa-times text-lg"></i>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-black text-stone-500 uppercase mb-1.5">Destinatario (Email)</label>
                        <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-3 rounded-xl border border-stone-200 outline-none bg-stone-50 text-stone-800 font-semibold"
                            required
                            disabled={isSending}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-black text-stone-500 uppercase mb-1.5">Asunto del Correo</label>
                        <input 
                            type="text" 
                            value={asunto}
                            onChange={(e) => setAsunto(e.target.value)}
                            className="w-full p-3 rounded-xl border border-stone-200 outline-none bg-stone-50 text-stone-800 font-semibold focus:border-amber-500 transition-colors"
                            required
                            disabled={isSending}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-black text-stone-500 uppercase mb-1.5 flex justify-between">
                            <span>Cuerpo del Mensaje</span>
                            <span className="text-stone-400 font-normal">Editable</span>
                        </label>
                        <textarea 
                            value={cuerpo}
                            onChange={(e) => setCuerpo(e.target.value)}
                            rows={12}
                            className="w-full p-4 rounded-xl border border-stone-200 outline-none bg-stone-50 text-stone-805 font-medium text-sm focus:border-amber-500 transition-colors leading-relaxed resize-y font-mono"
                            required
                            disabled={isSending}
                        />
                    </div>

                    <div className="pt-4 border-t border-stone-100 flex gap-3">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold py-3.5 rounded-xl transition-all"
                            disabled={isSending}
                        >
                            <i className="fas fa-times-circle mr-2"></i>Cancelar
                        </button>
                        <button 
                            type="submit" 
                            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                            disabled={isSending}
                        >
                            {isSending ? (
                                <>
                                    <i className="fas fa-circle-notch fa-spin"></i>
                                    <span>Enviando Correo...</span>
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-paper-plane"></i>
                                    <span>Confirmar y Enviar</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReminderPreviewModal;
