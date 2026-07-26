import React from 'react';

export default function ManualUsuarioModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl w-full max-w-5xl h-[88vh] shadow-2xl flex flex-col overflow-hidden border border-stone-200">
                {/* Header */}
                <div className="bg-stone-900 text-white px-6 py-4 flex items-center justify-between border-b border-stone-800 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-md">
                            <i className="fas fa-book-reader text-lg"></i>
                        </div>
                        <div>
                            <h3 className="text-lg font-extrabold tracking-tight">Manual del Usuario</h3>
                            <p className="text-xs text-stone-400 font-medium">Instituto IDeAr — Guía y Documentación del Sistema</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <a 
                            href="/manual_usuario.pdf" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-stone-700 shadow-sm"
                            title="Abrir en pestaña completa"
                        >
                            <i className="fas fa-external-link-alt text-xs"></i>
                            <span className="hidden sm:inline">Nueva pestaña</span>
                        </a>

                        <a 
                            href="/manual_usuario.pdf" 
                            download="Manual del Usuario - Portal IDeAr.pdf"
                            className="bg-orange-600 hover:bg-orange-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
                            title="Descargar PDF al equipo"
                        >
                            <i className="fas fa-download text-xs"></i>
                            <span className="hidden sm:inline">Descargar PDF</span>
                        </a>

                        <button 
                            onClick={onClose}
                            className="w-9 h-9 rounded-xl bg-stone-800 hover:bg-rose-600 text-stone-400 hover:text-white transition-colors flex items-center justify-center text-sm ml-2 cursor-pointer"
                            title="Cerrar manual"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                {/* PDF Viewer Body */}
                <div className="flex-1 bg-stone-100 p-2 relative">
                    <iframe 
                        src="/manual_usuario.pdf#toolbar=1" 
                        className="w-full h-full rounded-2xl border border-stone-200 shadow-inner bg-white"
                        title="Manual del Usuario - Portal IDeAr"
                    />
                </div>

                {/* Footer Info */}
                <div className="bg-stone-50 px-6 py-3 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500 flex-shrink-0">
                    <span className="flex items-center gap-2 font-semibold">
                        <i className="fas fa-info-circle text-orange-500"></i>
                        Si la vista previa no carga en tu navegador, usa el botón "Descargar PDF" o "Nueva pestaña".
                    </span>
                    <button 
                        onClick={onClose}
                        className="font-bold text-stone-700 hover:text-stone-900 cursor-pointer"
                    >
                        Cerrar ventana
                    </button>
                </div>
            </div>
        </div>
    );
}
