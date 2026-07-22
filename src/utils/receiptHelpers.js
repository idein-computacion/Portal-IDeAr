/**
 * Genera el desglose de líneas para un Recibo X.
 * Extraído de App.jsx para reutilización en ReceiptModal y print-only.
 */
export function getReceiptBreakdown(receipt, configLevels = [], students = []) {
    if (!receipt) return [];
    const items = [];

    const student = students.find(s => s.id === receipt.studentId);
    const levelConfig = student
        ? (configLevels.find(c => c.curso_nivel === student.level) ||
           configLevels.find(c => c.curso_nivel === student.taller))
        : null;

    const valorCuota = receipt.cuotaValue
        || (student?.cuotaOverride !== undefined && student?.cuotaOverride !== ""
            ? Number(student.cuotaOverride)
            : (levelConfig?.cuota || 25000));

    const valorInscripcion = student?.inscripcionOverride !== undefined && student?.inscripcionOverride !== ""
        ? Number(student.inscripcionOverride)
        : (levelConfig?.inscripcion || 20000);

    if (receipt.period === "Matrícula") {
        items.push({
            label: "Matrícula / Inscripción",
            subtitle: `Año lectivo · Sede ${receipt.studentId ? (student?.sede || '') : ''}`,
            amount: receipt.amount
        });
        return items;
    }

    if (receipt.period === "Examen") {
        items.push({
            label: "Derecho de Examen",
            subtitle: `Mesa de examen correspondiente`,
            amount: receipt.amount
        });
        return items;
    }

    // Pagos de cuotas mensuales
    const inscripcionPaid   = receipt.inscripcionPaid   ?? 0;
    const cuotaPaid         = receipt.cuotaPaid         ?? 0;
    const excessPaid        = receipt.excessPaid        ?? 0;

    if (inscripcionPaid > 0) {
        items.push({
            label: "Inscripción / Matrícula",
            subtitle: `Arancel de inicio · Valor: $${valorInscripcion.toLocaleString()}`,
            amount: inscripcionPaid
        });
    }

    if (cuotaPaid > 0) {
        items.push({
            label: `Cuota Mensual — ${receipt.period}`,
            subtitle: `Arancel mensual · Valor cuota: $${valorCuota.toLocaleString()}`,
            amount: cuotaPaid
        });
    }

    if (excessPaid > 0) {
        items.push({
            label: "Parte de pago anticipado / Excedente",
            subtitle: "Importe aplicado a próxima cuota",
            amount: excessPaid
        });
    }

    // Fallback si no hay desglose (recibos viejos sin breakdown)
    if (items.length === 0) {
        items.push({
            label: receipt.concept || `Cuota de ${receipt.period}`,
            subtitle: `Período: ${receipt.period}`,
            amount: receipt.amount
        });
    }

    return items;
}
