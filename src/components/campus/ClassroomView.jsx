import React, { useState } from 'react';
import StreamTab from './tabs/StreamTab';
import ClassworkTab from './tabs/ClassworkTab';
import PeopleTab from './tabs/PeopleTab';

export default function ClassroomView({ classroom, currentUser, globalSede, onBack, addNotification }) {
    const [activeTab, setActiveTab] = useState('stream');

    const tabs = [
        { id: 'stream', label: 'Novedades' },
        { id: 'classwork', label: 'Trabajo de clase' },
        { id: 'people', label: 'Personas' }
    ];

    return (
        <div className="min-h-screen bg-stone-50 flex flex-col -mx-4 -mt-8 sm:-mx-6 sm:-mt-6">
            {/* Header / Nav */}
            <div className="bg-white border-b sticky top-0 z-30">
                <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={onBack}
                            className="w-10 h-10 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-500 transition-colors"
                        >
                            <i className="fas fa-arrow-left"></i>
                        </button>
                        <div className="flex items-center gap-2 text-indigo-700 font-black">
                            <i className="fas fa-graduation-cap text-xl"></i>
                            <span className="hidden sm:inline">Campus Virtual</span>
                        </div>
                    </div>
                    
                    <div className="flex gap-1 h-full">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 sm:px-6 h-full flex items-center text-sm font-bold border-b-4 transition-colors ${
                                    activeTab === tab.id 
                                    ? 'border-indigo-600 text-indigo-700' 
                                    : 'border-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-50'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-sm">
                            {currentUser?.nombre?.charAt(0) || currentUser?.name?.charAt(0) || 'U'}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1000px] mx-auto w-full px-4 sm:px-6 py-6 animate-fadeIn">
                {/* Render active tab */}
                {activeTab === 'stream' && (
                    <StreamTab 
                        classroom={classroom} 
                        currentUser={currentUser} 
                        globalSede={globalSede} 
                        addNotification={addNotification} 
                    />
                )}
                {activeTab === 'classwork' && (
                    <ClassworkTab 
                        classroom={classroom} 
                        currentUser={currentUser} 
                        globalSede={globalSede} 
                        addNotification={addNotification} 
                    />
                )}
                {activeTab === 'people' && (
                    <PeopleTab 
                        classroom={classroom} 
                        currentUser={currentUser} 
                        globalSede={globalSede} 
                        addNotification={addNotification} 
                    />
                )}
            </div>
        </div>
    );
}
