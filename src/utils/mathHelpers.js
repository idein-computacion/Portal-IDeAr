export const getHistoricalValues = (levelConfig, monthIdx, year) => {
    if (!levelConfig || !levelConfig.historial || levelConfig.historial.length === 0) {
        return { 
            cuota: levelConfig?.cuota || 25000, 
            inscripcion: levelConfig?.inscripcion || 20000 
        };
    }
    let validEntry = levelConfig.historial[0];
    for (const entry of levelConfig.historial) {
        if (entry.year < year || (entry.year === year && entry.month <= monthIdx)) {
            validEntry = entry;
        } else {
            break;
        }
    }
    return { cuota: validEntry.cuota, inscripcion: validEntry.inscripcion };
};

export const MONTHS_ORDER = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
