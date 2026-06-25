import React from 'react';
import { ref, set } from 'firebase/database';
import { rtdb } from '../config/firebase';


function Config({ configLevels, setConfigLevels, addNotification, globalSede, generalConfig, setGeneralConfig }) {
    
    const handleSaveToFirebase = async (levelsToSave) => {
        try {
            const safeSede = globalSede.replace(/\./g, '');
            const updates = {};
            levelsToSave.forEach(c => { updates[`config/${safeSede}/${c.id}`] = c; });
            for (const c of levelsToSave) {
                await set(ref(rtdb, `config/${safeSede}/${c.id}`), c);
            }
            await set(ref(rtdb, `config/${safeSede}/info`), generalConfig);
            localStorage.setItem(`idear_config_${safeSede}`, JSON.stringify(levelsToSave));
            addNotification("Configuración de aranceles guardada exitosamente", "success");
        } catch(e) {
            addNotification("Error guardando aranceles en nube", "error");
        }
    };

    const handleLevelChange = (id, field, value) => {
        const updated = configLevels.map(lvl => lvl.id === id ? { ...lvl, [field]: Number(value) } : lvl);
        setConfigLevels(updated);
    };

    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 lg:col-span-2">
            <h3 className="text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
                <i className="fas fa-dollar-sign text-orange-500"></i> Aranceles Vigentes Ciclo 2026 (Por Nivel / Curso)
            </h3>
            <p className="text-sm text-stone-400 mb-6">
                Establece los valores base sugeridos al registrar nuevos pagos según el nivel o curso del estudiante.
            </p>

            <div className="bg-stone-50 border border-stone-100 rounded-2xl p-5 mb-6 flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Profesor a Cargo de la Sede</label>
                    <input 
                        type="text"
                        value={generalConfig?.profesor || ""}
                        onChange={(e) => setGeneralConfig({ ...generalConfig, profesor: e.target.value })}
                        placeholder="Ej. Prof. Juan Pérez"
                        className="w-full p-3 rounded-xl border border-stone-200 outline-none bg-white font-semibold focus:ring-2 focus:ring-amber-500 transition-all"
                    />
                </div>
            </div>

            <div className="overflow-x-auto mb-4">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-stone-100 text-xs text-stone-400 font-bold uppercase">
                            <th className="py-2 px-3">Curso/Nivel</th>
                            <th className="py-2 px-3 text-center">Matrícula ($)</th>
                            <th className="py-2 px-3 text-center">Cuota ($)</th>
                            <th className="py-2 px-3 text-center">Examen ($)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                        {configLevels.map(c => (
                            <tr key={c.id} className="hover:bg-stone-50/50 transition-colors text-sm">
                                <td className="py-2 px-3 font-semibold text-stone-700">{c.curso_nivel}</td>
                                <td className="py-2 px-3">
                                    <div className="relative flex items-center">
                                        <span className="absolute left-3 text-stone-500 font-bold">$</span>
                                        <input 
                                            type="number"
                                            value={c.inscripcion}
                                            onChange={(e) => handleLevelChange(c.id, 'inscripcion', e.target.value)}
                                            className="w-full py-2 pl-7 pr-2 rounded-lg border border-stone-200 bg-white font-bold text-stone-700 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>
                                </td>
                                <td className="py-2 px-3">
                                    <div className="relative flex items-center">
                                        <span className="absolute left-3 text-stone-500 font-bold">$</span>
                                        <input 
                                            type="number"
                                            value={c.cuota}
                                            onChange={(e) => handleLevelChange(c.id, 'cuota', e.target.value)}
                                            className="w-full py-2 pl-7 pr-2 rounded-lg border border-stone-200 bg-white font-bold text-stone-700 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>
                                </td>
                                <td className="py-2 px-3">
                                    <div className="relative flex items-center">
                                        <span className="absolute left-3 text-stone-500 font-bold">$</span>
                                        <input 
                                            type="number"
                                            value={c.examen || 0}
                                            onChange={(e) => handleLevelChange(c.id, 'examen', e.target.value)}
                                            className="w-full py-2 pl-7 pr-2 rounded-lg border border-stone-200 bg-white font-bold text-stone-700 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mt-6">

                <button 
                    onClick={() => handleSaveToFirebase(configLevels)}
                    className="w-full md:w-auto md:ml-auto block bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md"
                >
                    Guardar Cambios
                </button>
            </div>
        </div>
    );
}

export default Config;
