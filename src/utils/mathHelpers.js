export const getHistoricalValues = (levelConfig, monthIdx, year) => {
    if (!levelConfig || !levelConfig.historial || levelConfig.historial.length === 0) {
        return { 
            cuota: levelConfig?.cuota !== undefined && levelConfig.cuota !== "" ? Number(levelConfig.cuota) : 0, 
            inscripcion: levelConfig?.inscripcion !== undefined && levelConfig.inscripcion !== "" ? Number(levelConfig.inscripcion) : 0 
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

export const isMonthInactive = (year, monthIndex, historialBajas) => {
    if (!historialBajas || !Array.isArray(historialBajas)) return false;
    for (const r of historialBajas) {
        if (!r.baja || !r.alta) continue;
        const [bajaYear, bajaMonth] = r.baja.split("-").map(Number);
        const [altaYear, altaMonth] = r.alta.split("-").map(Number);
        const currentMonthNum = monthIndex + 1;
        const currentDateNum = year * 100 + currentMonthNum;
        const bajaDateNum = bajaYear * 100 + bajaMonth;
        const altaDateNum = altaYear * 100 + altaMonth;
        
        if (currentDateNum > bajaDateNum && currentDateNum < altaDateNum) return true;
    }
    return false;
};
