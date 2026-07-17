const fs = require('fs');
const xlsx = require('xlsx');

function excelDateToJSDate(serial) {
    if (!serial) return new Date().toISOString().split('T')[0];
    const utc_days  = Math.floor(serial - 25569);
    const date = new Date(utc_days * 86400 * 1000);
    return date.toISOString().split('T')[0];
}

const workbook = xlsx.readFile('Sistema_IDeAr.xlsx');

// 1. Process Config
const configSheet = workbook.Sheets['Config'];
const configData = xlsx.utils.sheet_to_json(configSheet);
const seedConfig = configData.map(c => ({
    curso_nivel: c['Curso/Nivel'] || '',
    inscripcion: c['Inscripción'] || 0,
    cuota: c['Cuota'] || 0,
    examen: c['Derecho Examen'] || 0
}));

// 2. Process Formulario (Students)
const formSheet = workbook.Sheets['formulario'];
const formData = xlsx.utils.sheet_to_json(formSheet, { header: 1 });
const students = [];
formData.forEach((row, idx) => {
    if (idx === 0) return; // skip headers
    const dniRaw = row[1];
    const name = row[2] ? String(row[2]).trim() : '';
    if (!dniRaw || !name) return;

    const dni = String(dniRaw).trim();
    const email = row[3] ? String(row[3]).trim() : '';
    const address = row[5] ? String(row[5]).trim() : '';
    const phone = row[6] ? String(row[6]).trim() : '';
    const sede = row[8] ? String(row[8]).trim() : 'Leandro N. Alem';
    let taller = row[9] ? String(row[9]).trim() : '';
    const tutorDni = row[11] ? String(row[11]).trim() : '';
    const tutorName = row[12] ? String(row[12]).trim() : '';
    
    // Nivel can be in column 10 or 13 depending on row format from form
    let levelRaw = row[10] ? String(row[10]).trim() : (row[13] ? String(row[13]).trim() : '');
    
    let level = levelRaw || 'No Asignado';

    students.push({
        id: dni,
        name: name,
        dni: dni,
        level: level,
        sede: sede,
        phone: phone,
        email: email,
        tutor: tutorName,
        address: address,
        taller: taller,
        active: true
    });
});

// Remove duplicates by DNI
const uniqueStudents = Object.values(students.reduce((acc, curr) => {
    acc[curr.dni] = curr;
    return acc;
}, {}));

// 3. Process Pagos
const pagosSheet = workbook.Sheets['Pagos'];
const pagosData = xlsx.utils.sheet_to_json(pagosSheet, { header: 1 });
const studentMap = {};
uniqueStudents.forEach(s => {
    const norm = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    studentMap[norm] = s.id;
});

const payments = [];
let receiptCounter = 1;
pagosData.forEach((row, idx) => {
    if (idx === 0) return; // if header
    if (row.length < 5) return;
    
    let dateRaw = row[0];
    const studentName = row[1] ? String(row[1]).trim() : '';
    const period = row[2] ? String(row[2]).trim() : '';
    const concept = row[4] ? String(row[4]).trim() : 'Cuota';
    const amountRaw = row[5];
    const amount = parseInt(amountRaw, 10) || 0;
    
    if (!studentName || amount === 0) return;

    const normName = studentName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const studentId = studentMap[normName] || 'UNKNOWN';

    const dateStr = typeof dateRaw === 'number' ? excelDateToJSDate(dateRaw) : new Date().toISOString().split('T')[0];
    
    const id = `pay-${Date.now()}-${idx}`;
    const receiptNo = `00002-${String(receiptCounter++).padStart(8, '0')}`;

    payments.push({
        id,
        studentId,
        studentName,
        period,
        date: dateStr,
        concept,
        method: "Efectivo",
        amount,
        receiptNo
    });
});

// Create new seedData.js
let seedContent = `export const SEED_CONFIG = [\n`;
seedContent += seedConfig.map(c => `    ${JSON.stringify(c)}`).join(',\n');
seedContent += `\n];\n\n`;

seedContent += `export const SEED_STUDENTS = [\n`;
seedContent += uniqueStudents.map(s => `    ${JSON.stringify(s)}`).join(',\n');
seedContent += `\n];\n\n`;

seedContent += `export const SEED_PAYMENTS = [\n`;
seedContent += payments.map(p => `    ${JSON.stringify(p)}`).join(',\n');
seedContent += `\n];\n\n`;

seedContent += `export const SEED_ATTENDANCE = [
    { id: "att-1", date: "2026-06-22", studentId: "52739073", studentName: "Back Brenda Anahi", level: "2do Preparatorio", sede: "Leandro N. Alem", status: "P" },
    { id: "att-2", date: "2026-06-22", studentId: "40197439", studentName: "Tereschuk Anibal Adrian", level: "1ro Preparatorio", sede: "Leandro N. Alem", status: "P" },
    { id: "att-3", date: "2026-06-22", studentId: "42288209", studentName: "Olexen Mariana Cinthia", level: "1ro Preparatorio", sede: "Leandro N. Alem", status: "A" },
    { id: "att-4", date: "2026-06-22", studentId: "43831994", studentName: "Carolina Belén Rominski", level: "2do Preparatorio", sede: "Leandro N. Alem", status: "P" },
];
`;

const allLevels = new Set(seedConfig.map(c => c.curso_nivel));
uniqueStudents.forEach(s => {
    if (s.level && s.level !== 'No Asignado') allLevels.add(s.level);
});
const nivelesArr = Array.from(allLevels);
nivelesArr.push("No Asignado");

seedContent += `
export const SEDES = ["Leandro N. Alem", "Cerro Azul", "Itacaruaré", "San Javier"];
`;
seedContent += `export const NIVELES = ${JSON.stringify(nivelesArr)};\n`;
seedContent += `export const METODOS_PAGO = ["Efectivo", "Mercado Pago", "Transferencia", "Canje", "BECA"];\n`;
seedContent += `export const PERIODOS = ["Matrícula", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre", "Examen"];\n`;

fs.writeFileSync('src/data/seedData.js', seedContent, 'utf8');
console.log('Successfully updated src/data/seedData.js');
