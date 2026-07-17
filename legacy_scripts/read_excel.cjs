const xlsx = require('xlsx');
const workbook = xlsx.readFile('Sistema_IDeAr.xlsx');
console.log(workbook.SheetNames);
if (workbook.SheetNames.includes('formulario')) {
    const sheet = workbook.Sheets['formulario'];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    console.log(data[0]); // headers
    console.log(data[1]); // first row
}
