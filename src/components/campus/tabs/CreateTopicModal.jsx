import React, { useState } from 'react';
import { ref, push, set } from 'firebase/database';
import { rtdb } from '../../../config/firebase';

export default function CreateTopicModal({ classroom, currentUser, onClose, addNotification }) {
    const [title, setTitle] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) return;

        setLoading(true);
        try {
            const topicRef = push(ref(rtdb, `campus_temas/${classroom.id}`));
            await set(topicRef, {
                title: title.trim(),
                timestamp: Date.now(),
                authorId: currentUser.uid || currentUser.dni,
                authorName: currentUser.nombre || currentUser.name
            });
            addNotification('Tema creado con éxito', 'success');
            onClose();
        } catch (error) {
            console.error("Error creating topic:", error);
            addNotification('Error al crear el tema', 'error');
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-stone-100 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-stone-800">Añadir tema</h3>
                    <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
                        <i className="fas fa-times text-lg"></i>
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-stone-700 mb-2">Nombre del tema</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ej: Unidad 1: Introducción"
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                            autoFocus
                        />
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-bold text-stone-500 hover:bg-stone-100 rounded-xl transition-colors"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={!title.trim() || loading}
                            className={`px-6 py-2.5 text-sm font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2 ${
                                title.trim() && !loading ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                            }`}
                        >
                            {loading && <i className="fas fa-circle-notch fa-spin"></i>}
                            Añadir
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
