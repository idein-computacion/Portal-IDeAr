const fs = require('fs');
const xlsx = require('xlsx');

function parseLevel(nivelStr) {
    if (!nivelStr) return "No Asignado";
    const n = String(nivelStr).toLowerCase();
    if (n.includes("1er año preparatorio") || n.includes("1ro preparatorio")) return "1ro Preparatorio";
    if (n.includes("2do año preparatorio") || n.includes("2do preparatorio")) return "2do Preparatorio";
    if (n.includes("3er año preparatorio") || n.includes("3er preparatorio")) return "3er Preparatorio";
    if (n.includes("1er año elemental") || n.includes("1ro elemental")) return "1ro Elemental";
    if (n.includes("2do año elemental") || n.includes("2do elemental")) return "2do Elemental";
    if (n.includes("3er año elemental") || n.includes("3er elemental")) return "3er Elemental";
    if (n.includes("1er año superior") || n.includes("superior")) return "Profesorado / Superior";
    return nivelStr;
}

const workbook = xlsx.readFile('Sistema_IDeAr.xlsx');
const sheet = workbook.Sheets['formulario'];
const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

const headers = rawData[0].map(h => h ? String(h).trim() : '');
const dataRows = rawData.slice(1);

const idIndex = headers.findIndex(h => h.includes('DNI'));
const nameIndex = headers.findIndex(h => h.includes('Nombres y Apellido'));
const emailIndex = headers.findIndex(h => h.includes('correo electrónico'));
const addressIndex = headers.findIndex(h => h.includes('Domicilio'));
const phoneIndex = headers.findIndex(h => h.includes('Teléfono'));
const sedeIndex = headers.findIndex(h => h.includes('Sede'));
const tallerIndex = headers.findIndex(h => h.includes('Talleres'));
const nivelIndex = headers.findIndex(h => h === 'Nivel' || h === 'Nivel ');
const tutorIndex = headers.findIndex(h => h.includes('Nombre Responsable'));

const students = [];
const dniSet = new Set();

dataRows.forEach(row => {
    if (row.length === 0) return;
    
    let dniRaw = row[idIndex];
    if (!dniRaw) return;
    const dni = String(dniRaw).trim();
    if (!dni || dniSet.has(dni)) return;
    dniSet.add(dni);

    const name = row[nameIndex] ? String(row[nameIndex]).trim() : '';
    const email = row[emailIndex] ? String(row[emailIndex]).trim() : '';
    const address = row[addressIndex] ? String(row[addressIndex]).trim() : '';
    const phone = row[phoneIndex] ? String(row[phoneIndex]).trim() : '';
    const sede = row[sedeIndex] ? String(row[sedeIndex]).trim() : 'No Asignado';
    const taller = row[tallerIndex] ? String(row[tallerIndex]).trim() : 'No Asignado';
    const nivelRaw = row[nivelIndex] ? String(row[nivelIndex]).trim() : '';
    const level = parseLevel(nivelRaw);
    const tutor = row[tutorIndex] ? String(row[tutorIndex]).trim() : '';

    students.push({
        id: dni,
        name: name,
        dni: dni,
        level: level,
        sede: sede,
        phone: phone,
        email: email,
        tutor: tutor,
        address: address,
        taller: taller,
        active: true
    });
});

// Sort by: level, taller, sede
students.sort((a, b) => {
    if (a.level !== b.level) return a.level.localeCompare(b.level);
    if (a.taller !== b.taller) return a.taller.localeCompare(b.taller);
    return a.sede.localeCompare(b.sede);
});

// Read seedData.js
let seedContent = fs.readFileSync('src/data/seedData.js', 'utf8');

// Build new SEED_STUDENTS array string
let newArrayStr = 'export const SEED_STUDENTS = [\n';
newArrayStr += students.map(s => `    ${JSON.stringify(s)}`).join(',\n');
newArrayStr += '\n];';

seedContent = seedContent.replace(
    /export const SEED_STUDENTS = \[([\s\S]*?)\];/,
    newArrayStr
);

fs.writeFileSync('src/data/seedData.js', seedContent, 'utf8');
console.log(`Successfully generated and sorted ${students.length} students into seedData.js`);
