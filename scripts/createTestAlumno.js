/**
 * Script para crear alumno de prueba en Firebase RTDB
 * Run with: node scripts/createTestAlumno.mjs
 */
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set } from 'firebase/database';


const firebaseConfig = {
    apiKey: "AIzaSyBVQbazZ6h0S8sqXlChVAAqd3ZmS0XswQw",
    authDomain: "portal-idear.firebaseapp.com",
    projectId: "portal-idear",
    storageBucket: "portal-idear.firebasestorage.app",
    messagingSenderId: "89538422100",
    appId: "1:89538422100:web:e1c3ac895408693d6254c1",
    databaseURL: "https://portal-idear-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const testAlumno = {
    id: "99999999",
    dni: "99999999",
    name: "Alumno Demo IDeAr",
    level: "2do Año Preparatorio",
    taller: "2do Año Preparatorio",
    sede: "Leandro N. Alem",
    phone: "3754000000",
    email: "alumno.demo@idear.edu.ar",
    tutor: "Tutor Demo",
    address: "Calle Ejemplo 123, L.N. Alem",
    active: true,
    fecha_inicio: "2026-03-01",
    updatedAt: Date.now()
};

async function createTestAlumno() {
    try {
        await set(ref(db, `alumnos/${testAlumno.id}`), testAlumno);
        console.log('✅ Alumno de prueba creado exitosamente!');
        console.log('   DNI: 99999999');
        console.log('   Sede: Leandro N. Alem');
        console.log('   Contraseña: (dejar vacío)');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

createTestAlumno();
