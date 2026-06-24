const fs = require('fs');
const xlsx = require('xlsx');

// Convert Excel date to string
function excelDateToJSDate(serial) {
    if (!serial) return new Date().toISOString().split('T')[0];
    const utc_days  = Math.floor(serial - 25569);
    const date = new Date(utc_days * 86400 * 1000);
    return date.toISOString().split('T')[0];
}

const workbook = xlsx.readFile('Sistema_IDeAr.xlsx');
const sheet = workbook.Sheets['Pagos'];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

// Load students to map IDs
const seedContent = fs.readFileSync('src/data/seedData.js', 'utf8');
const match = seedContent.match(/export const SEED_STUDENTS = \[([\s\S]*?)\];/);
const studentsStr = '[' + match[1] + ']';
let students = [];
try {
    students = JSON.parse(studentsStr);
} catch (e) {
    console.error("Could not parse students");
}
const studentMap = {};
students.forEach(s => {
    // Normalize string to match easily
    const norm = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    studentMap[norm] = s.id;
});

const newPayments = [];
let receiptCounter = 1;

data.forEach((row, idx) => {
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

    newPayments.push({
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

console.log('Parsed payments:', newPayments.length);
console.log('Sample:', newPayments[0]);

let newArrayStr = 'export const SEED_PAYMENTS = [\n';
newArrayStr += newPayments.map(p => `    ${JSON.stringify(p)}`).join(',\n');
newArrayStr += '\n];';

let newContent = seedContent.replace(
    /export const SEED_PAYMENTS = \[([\s\S]*?)\];/,
    newArrayStr
);

fs.writeFileSync('src/data/seedData.js', newContent, 'utf8');
console.log('SEED_PAYMENTS updated.');
