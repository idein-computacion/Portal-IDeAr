import React, { useState, useEffect } from 'react';
import { ref, onValue, push, set } from 'firebase/database';
import { rtdb } from '../../../config/firebase';

export default function StreamTab({ classroom, currentUser, addNotification }) {
    const [posts, setPosts] = useState([]);
    const [newPostContent, setNewPostContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [isCreatingPost, setIsCreatingPost] = useState(false);

    useEffect(() => {
        const postsRef = ref(rtdb, `campus_publicaciones/${classroom.id}`);
        const unsub = onValue(postsRef, (snap) => {
            if (snap.exists()) {
                const data = snap.val();
                const postsArr = Object.entries(data).map(([id, val]) => ({ id, ...val }));
                postsArr.sort((a, b) => b.timestamp - a.timestamp);
                setPosts(postsArr);
            } else {
                setPosts([]);
            }
            setLoading(false);
        }, (error) => {
            console.error("StreamTab - Error fetching posts:", error);
            setLoading(false);
        });
        return () => unsub();
    }, [classroom.id]);

    const handleCreatePost = async () => {
        if (!newPostContent.trim()) return;
        
        try {
            const postsRef = ref(rtdb, `campus_publicaciones/${classroom.id}`);
            const newPostRef = push(postsRef);
            await set(newPostRef, {
                authorId: currentUser.uid || currentUser.dni,
                authorName: currentUser.nombre || currentUser.name,
                content: newPostContent.trim(),
                timestamp: Date.now(),
                type: 'anuncio'
            });
            setNewPostContent('');
            setIsCreatingPost(false);
            addNotification('Publicación creada con éxito', 'success');
        } catch (error) {
            console.error("Error creating post:", error);
            addNotification('Error al crear la publicación', 'error');
        }
    };

    return (
        <div className="space-y-6">
            {/* Banner */}
            <div className={`${classroom.colorTheme?.bg || 'bg-indigo-600'} h-48 sm:h-64 rounded-2xl sm:rounded-3xl p-6 sm:p-8 flex flex-col justify-end relative overflow-hidden shadow-lg`}>
                <div className="absolute right-0 top-0 opacity-10 text-9xl transform translate-x-12 -translate-y-4 pointer-events-none">
                    <i className="fas fa-book-reader"></i>
                </div>
                <h1 className="text-white text-3xl sm:text-5xl font-black drop-shadow-md relative z-10">{classroom.title}</h1>
                <p className="text-white/90 text-lg sm:text-xl font-medium mt-2 drop-shadow relative z-10">{classroom.teacherName}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Left Sidebar (Upcoming work usually goes here) */}
                <div className="hidden md:block col-span-1">
                    <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
                        <h3 className="text-sm font-bold text-stone-700 mb-4">Próximas entregas</h3>
                        <p className="text-xs text-stone-500">¡Yuju! No tienes tareas para entregar pronto.</p>
                        <button className="text-indigo-600 text-xs font-bold mt-4 hover:underline">Ver todo</button>
                    </div>
                </div>

                {/* Main Feed */}
                <div className="col-span-1 md:col-span-3 space-y-6">
                    {/* Create Post Input */}
                    {currentUser?.rol !== 'Alumno' && (
                        <>
                            {!isCreatingPost ? (
                                <button 
                                    onClick={() => setIsCreatingPost(true)}
                                    className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold px-5 py-2.5 rounded-full shadow-sm transition-colors flex items-center gap-2 mb-4"
                                >
                                    <i className="fas fa-pencil-alt"></i> Nuevo anuncio
                                </button>
                            ) : (
                                <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-6 shadow-sm flex gap-4 items-start focus-within:shadow-md transition-shadow">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex-shrink-0 flex items-center justify-center text-indigo-700 font-bold">
                                        {(currentUser.nombre || currentUser.name || 'U').charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <textarea
                                            value={newPostContent}
                                            onChange={(e) => setNewPostContent(e.target.value)}
                                            placeholder="Anuncia algo a tu clase"
                                            className="w-full bg-stone-50 border-0 rounded-xl p-4 text-sm text-stone-700 focus:ring-2 focus:ring-indigo-500 resize-none min-h-[60px]"
                                            rows="2"
                                            autoFocus
                                        ></textarea>
                                        <div className="flex justify-end mt-3 gap-2 animate-fadeIn">
                                            <button 
                                                onClick={() => {
                                                    setNewPostContent('');
                                                    setIsCreatingPost(false);
                                                }}
                                                className="px-4 py-2 text-stone-500 hover:bg-stone-100 rounded-lg text-sm font-bold transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                            <button 
                                                onClick={handleCreatePost}
                                                disabled={!newPostContent.trim()}
                                                className={`px-6 py-2 rounded-lg text-sm font-bold shadow transition-colors ${
                                                    newPostContent.trim() ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                                                }`}
                                            >
                                                Publicar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Posts List */}
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : posts.length === 0 ? (
                        <div className="bg-white border border-stone-200 rounded-2xl p-10 text-center shadow-sm">
                            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <i className="fas fa-comment-dots text-stone-400 text-2xl"></i>
                            </div>
                            <h3 className="text-stone-800 font-bold mb-2">Aquí es donde te comunicas con tu clase</h3>
                            <p className="text-stone-500 text-sm">Usa el tablón para anunciar cosas, hacer preguntas y crear material participativo.</p>
                        </div>
                    ) : (
                        posts.map(post => (
                            <div key={post.id} className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex gap-4">
                                <div className="w-10 h-10 rounded-full bg-stone-100 flex-shrink-0 flex items-center justify-center text-stone-600 font-bold">
                                    {post.authorName?.charAt(0) || 'U'}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-baseline justify-between mb-2">
                                        <h4 className="font-bold text-stone-800">{post.authorName}</h4>
                                        <span className="text-xs text-stone-400">
                                            {new Date(post.timestamp).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                        </span>
                                    </div>
                                    <p className="text-stone-600 text-sm whitespace-pre-wrap leading-relaxed">{post.content}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
