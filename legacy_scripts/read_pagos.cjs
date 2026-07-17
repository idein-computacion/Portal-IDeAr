const xlsx = require('xlsx');
const workbook = xlsx.readFile('Sistema_IDeAr.xlsx');
if (workbook.SheetNames.includes('Pagos')) {
    const sheet = workbook.Sheets['Pagos'];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    console.log('Total rows:', data.length);
    console.log('Headers:', data[0]);
    console.log('Row 1:', data[1]);
    console.log('Row 2:', data[2]);
} else {
    console.log('Sheet Pagos not found.');
}
