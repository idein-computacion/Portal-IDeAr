const xlsx = require('xlsx');
const workbook = xlsx.readFile('Sistema_IDeAr.xlsx');
const formSheet = workbook.Sheets['formulario'];
const formData = xlsx.utils.sheet_to_json(formSheet, { header: 1 });
for(let i=0; i<10; i++) {
    console.log(`Row ${i}: C=${formData[i][2]}, K=${formData[i][10]}`);
}
