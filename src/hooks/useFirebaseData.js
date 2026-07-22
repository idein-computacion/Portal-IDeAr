import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../config/firebase';

/**
 * Custom Hook para gestionar todos los listeners en tiempo real de Firebase.
 * Centraliza las suscripciones de RTDB y las limpia al desmontar.
 */
export function useFirebaseData(globalSede) {
    const [students, setStudents] = useState([]);
    const [payments, setPayments] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [configLevels, setConfigLevels] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [generalConfig, setGeneralConfig] = useState(null);
    const [gradeColumns, setGradeColumns] = useState({});
    const [mesasColumns, setMesasColumns] = useState([]);
    const [mesasGrades, setMesasGrades] = useState([]);
    const [grades, setGrades] = useState([]);
    const [users, setUsers] = useState([]);
    const [sedes, setSedes] = useState([]);
    const [loading, setLoading] = useState(true);

    // Helper para guardar en localstorage (como fallback offline)
    const saveLocal = (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error("Error guardando en localStorage", e);
        }
    };

    // 1. Listeners globales que se ejecutan siempre (para login y selección de sede)
    useEffect(() => {
        const unsubscribes = [];

        // Usuarios
        const usersRef = ref(rtdb, 'usuarios');
        const unsubUsers = onValue(usersRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setUsers(Object.values(data));
            } else {
                setUsers([]);
            }
        });
        unsubscribes.push(unsubUsers);

        // Sedes
        const sedesRef = ref(rtdb, 'sedes');
        const unsubSedes = onValue(sedesRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setSedes(Object.values(data));
            } else {
                setSedes([]);
            }
            if (!globalSede) {
                setLoading(false);
            }
        });
        unsubscribes.push(unsubSedes);

        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    }, [globalSede]);

    // 2. Listeners específicos de la sede seleccionada
    useEffect(() => {
        if (!globalSede) {
            return;
        }

        setLoading(true);
        const unsubscribes = [];

        // Alumnos
        const alumnosRef = ref(rtdb, 'alumnos');
        const unsubAlumnos = onValue(alumnosRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const list = Object.values(data).filter(s => s.sede === globalSede);
                setStudents(list);
                saveLocal("idear_students", list);
            } else {
                setStudents([]);
            }
        });
        unsubscribes.push(unsubAlumnos);

        // Pagos
        const pagosRef = ref(rtdb, 'pagos');
        const unsubPagos = onValue(pagosRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const list = Object.values(data);
                setPayments(list);
                saveLocal("idear_payments", list);
            } else {
                setPayments([]);
            }
        });
        unsubscribes.push(unsubPagos);

        // Asistencias
        const asistenciasRef = ref(rtdb, 'asistencias');
        const unsubAsistencias = onValue(asistenciasRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setAttendance(Object.values(data).filter(a => a.sede === globalSede));
            } else {
                setAttendance([]);
            }
        });
        unsubscribes.push(unsubAsistencias);

        const safeSede = globalSede.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\./g, '');

        // Configuración de la sede (niveles y generalConfig)
        const configRef = ref(rtdb, `config/${safeSede}`);
        const unsubConfig = onValue(configRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const info = data.info || { profesor: "" };
                setGeneralConfig(info);
                
                const lista = Object.values(data).filter(x => x && typeof x === 'object' && x.id);
                setConfigLevels(lista);
            } else {
                setGeneralConfig({ profesor: "" });
                setConfigLevels([]);
            }
        });
        unsubscribes.push(unsubConfig);

        // Avisos
        const announcementsRef = ref(rtdb, 'config/announcements');
        const unsubAnnouncements = onValue(announcementsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setAnnouncements(Object.values(data));
            } else {
                setAnnouncements([]);
            }
        });
        unsubscribes.push(unsubAnnouncements);

        // Columnas de Calificaciones específicas de la sede
        const gradeColumnsRef = ref(rtdb, `config/gradeColumns_${safeSede}`);
        const unsubGradeColumns = onValue(gradeColumnsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setGradeColumns(data);
            } else {
                setGradeColumns({});
            }
        });
        unsubscribes.push(unsubGradeColumns);

        // Columnas de Mesas
        const mesasColumnsRef = ref(rtdb, 'config/mesasColumns');
        const unsubMesasColumns = onValue(mesasColumnsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setMesasColumns(Object.values(data));
            } else {
                setMesasColumns([]);
            }
        });
        unsubscribes.push(unsubMesasColumns);

        // Notas de Mesas
        const mesasGradesRef = ref(rtdb, 'mesasExamen');
        const unsubMesasGrades = onValue(mesasGradesRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setMesasGrades(Object.values(data));
            } else {
                setMesasGrades([]);
            }
        });
        unsubscribes.push(unsubMesasGrades);

        // Notas de Cursada
        const gradesRef = ref(rtdb, 'calificaciones');
        const unsubGrades = onValue(gradesRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setGrades(Object.values(data));
            } else {
                setGrades([]);
            }
            setLoading(false);
        });
        unsubscribes.push(unsubGrades);

        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    }, [globalSede]);

    return {
        students,
        setStudents,
        payments,
        setPayments,
        attendance,
        setAttendance,
        configLevels,
        setConfigLevels,
        announcements,
        setAnnouncements,
        generalConfig,
        setGeneralConfig,
        gradeColumns,
        setGradeColumns,
        mesasColumns,
        setMesasColumns,
        mesasGrades,
        setMesasGrades,
        grades,
        setGrades,
        users,
        setUsers,
        sedes,
        setSedes,
        loading
    };
}
