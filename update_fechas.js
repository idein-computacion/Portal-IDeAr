import fs from 'fs';
import xlsx from 'xlsx';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, update } from 'firebase/database';

function parseEnv() {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    const env = {};
    envFile.split('\n').forEach(line => {
        const [key, ...val] = line.split('=');
        if (key && val.length > 0) {
            env[key.trim()] = val.join('=').trim();
        }
    });
    return env;
}

const env = parseEnv();

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL
};

function excelDateToJSDate(serial) {
    if (!serial) return new Date().toISOString().split('T')[0];
    const utc_days  = Math.floor(serial - 25569);
    const date = new Date(utc_days * 86400 * 1000);
    return date.toISOString().split('T')[0];
}

async function main() {
    try {
        const app = initializeApp(firebaseConfig);
        const rtdb = getDatabase(app);

        console.log("Leyendo archivo Excel...");
        const workbook = xlsx.readFile('Sistema_IDeAr.xlsx');
        const formSheet = workbook.Sheets['formulario'];
        const formData = xlsx.utils.sheet_to_json(formSheet, { header: 1 });

        const datesMap = {}; // dni -> date string

        formData.forEach((row, idx) => {
            if (idx === 0) return; // skip headers
            const dateRaw = row[0];
            const dniRaw = row[1];
            if (!dniRaw) return;

            const dni = String(dniRaw).trim();
            const dateStr = typeof dateRaw === 'number' ? excelDateToJSDate(dateRaw) : new Date().toISOString().split('T')[0];
            
            datesMap[dni] = dateStr;
        });

        console.log(`Leídas ${Object.keys(datesMap).length} fechas de inscripción únicas del Excel.`);

        console.log("Obteniendo alumnos de Firebase...");
        const alumnosRef = ref(rtdb, 'alumnos');
        const snapshot = await get(alumnosRef);
        
        if (!snapshot.exists()) {
            console.log("No se encontraron alumnos en Firebase.");
            process.exit(0);
        }

        const alumnosData = snapshot.val();
        let updateCount = 0;
        const updates = {};

        for (const [key, alumno] of Object.entries(alumnosData)) {
            const dni = alumno.dni;
            if (dni && datesMap[dni]) {
                updates[`alumnos/${key}/fecha_inicio`] = datesMap[dni];
                updateCount++;
            }
        }

        if (updateCount > 0) {
            console.log(`Actualizando ${updateCount} alumnos en Firebase...`);
            await update(ref(rtdb), updates);
            console.log("Actualización completada en la base de datos.");
        } else {
            console.log("No hay alumnos para actualizar.");
        }
        
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

main();
