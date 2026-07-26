import { formatDate } from './formatters';

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

/**
 * Función para enviar el recibo de pago a través de WhatsApp.
 * Valida el teléfono, formatea a E.164 (Argentina) y construye el mensaje.
 */
export function enviarReciboPorWhatsApp(alumno, pago, configLevels = [], students = [], globalSede = 'Leandro N. Alem', generalConfig = {}) {
    const telefono = alumno?.telefono || alumno?.phone;
    if (!telefono) {
        alert("El alumno no tiene un teléfono registrado.");
        return;
    }

    let telefonoLimpio = String(telefono).replace(/\D/g, '');
    
    // Si tiene 10 dígitos y no inicia con 549 (ej: 3764123456), agregar prefijo de Argentina 549
    if (telefonoLimpio.length === 10 && !telefonoLimpio.startsWith('549')) {
        telefonoLimpio = '549' + telefonoLimpio;
    }

    const nombreProfesor = generalConfig?.profesor || "SILVA GRACIELA BEATRIZ";
    const numeroRecibo = pago?.numeroRecibo || pago?.receiptNo || pago?.id || '';
    const fecha = pago?.date ? formatDate(pago.date) : '';
    const nombreAlumno = alumno?.nombre || alumno?.name || pago?.studentName || "Alumno";
    const dniAlumno = alumno?.dni || alumno?.studentId || pago?.studentId || '';
    const linkRecibo = `${window.location.origin}/#/recibo/${numeroRecibo}`;

    const concepto = pago?.concepto || pago?.concept || `Pago de ${pago?.period || ''}`;
    const montoTotal = pago?.monto || pago?.amount || 0;

    const mensaje = `Hola ${nombreAlumno},

Nos comunicamos del Instituto Para el Desarrollo del Arte (IDeAr).

Aquí tienes tu comprobante de pago Nro: ${numeroRecibo}.

Detalle del Pago:
- Concepto: ${concepto}
- Importe Abonado: $${montoTotal.toLocaleString()}

Puedes ver tu recibo digital aquí:
${linkRecibo}

Saludos cordiales,
Equipo IDeAr`;

    const esCelular = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const urlWhatsApp = `https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`;

    if (esCelular) {
        window.location.href = urlWhatsApp;
    } else {
        window.open(urlWhatsApp, '_blank');
    }
}
