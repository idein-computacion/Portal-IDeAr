import React, { useState, useEffect, useMemo } from 'react';
import { SEED_STUDENTS, SEED_PAYMENTS, SEED_ATTENDANCE, SEDES, NIVELES, METODOS_PAGO, PERIODOS } from './data/seedData';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, getDocs, setDoc, doc, deleteDoc, onSnapshot } from 'firebase/firestore';
import DashboardRecibos from './components/DashboardRecibos';

function App() {
            // Navegación
            const [currentTab, setCurrentTab] = useState("dashboard");

            // Estados del Negocio
            const [students, setStudents] = useState([]);
            const [payments, setPayments] = useState([]);
            const [attendance, setAttendance] = useState([]);
            
            // Tarifas configurables
            const [aranceles, setAranceles] = useState({
                matricula: 20000,
                cuotaPrep: 25000,
                cuotaElem: 30000,
                cuotaSup: 40000,
                examen: 45000
            });

            // UI feedback
            const [notifications, setNotifications] = useState([]);
            const [loading, setLoading] = useState(false);

            // Filtros de vistas
            const [studentSearch, setStudentSearch] = useState("");
            const [studentSedeFilter, setStudentSedeFilter] = useState("Todas");
            const [studentNivelFilter, setStudentNivelFilter] = useState("Todos");

            // Filtros de asistencias
            const [attendanceSede, setAttendanceSede] = useState("Leandro N. Alem");
            const [attendanceNivel, setAttendanceNivel] = useState("2do Preparatorio");
            const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
            const [tempAttendance, setTempAttendance] = useState({}); // studentId -> 'P' | 'A' | 'J'

            // Historial de asistencias visualización
            const [viewAttendanceDate, setViewAttendanceDate] = useState("");
            const [viewAttendanceSede, setViewAttendanceSede] = useState("Todas");

            // Gestión de pagos formulario
            const [newPayment, setNewPayment] = useState({
                studentId: "",
                period: "Marzo",
                date: new Date().toISOString().split('T')[0],
                concept: "Mensualidad",
                method: "Efectivo",
                amount: 25000,
                receiptNo: ""
            });
            const [paymentFilter, setPaymentFilter] = useState("");

            // Modales
            const [showStudentModal, setShowStudentModal] = useState(false);
            const [editingStudent, setEditingStudent] = useState(null);
            const [selectedStudentDetail, setSelectedStudentDetail] = useState(null);
            const [activeReceipt, setActiveReceipt] = useState(null);

            // Configuración de Firebase
            const [firebaseConfigStr, setFirebaseConfigStr] = useState("");
            const [firebaseConnected, setFirebaseConnected] = useState(false);
            const [db, setDb] = useState(null);
            const [auth, setAuth] = useState(null);
            const [user, setUser] = useState(null);
            const [appId, setAppId] = useState("default-app-id");

            // --- NOTIFICACIONES PERSONALIZADAS ---
            const addNotification = (text, type = "success") => {
                const id = Date.now();
                setNotifications(prev => [...prev, { id, text, type }]);
                setTimeout(() => {
                    setNotifications(prev => prev.filter(n => n.id !== id));
                }, 4000);
            };

            // --- INICIALIZACIÓN DE DATOS (LOCALSTORAGE O SEED) ---
            useEffect(() => {
                const localStudents = localStorage.getItem("idear_students");
                const localPayments = localStorage.getItem("idear_payments");
                const localAttendance = localStorage.getItem("idear_attendance");
                const localAranceles = localStorage.getItem("idear_aranceles");
                const localFirebase = localStorage.getItem("idear_firebase_config");

                if (localStudents) setStudents(JSON.parse(localStudents));
                else {
                    setStudents(SEED_STUDENTS);
                    localStorage.setItem("idear_students", JSON.stringify(SEED_STUDENTS));
                }

                if (localPayments) setPayments(JSON.parse(localPayments));
                else {
                    setPayments(SEED_PAYMENTS);
                    localStorage.setItem("idear_payments", JSON.stringify(SEED_PAYMENTS));
                }

                if (localAttendance) setAttendance(JSON.parse(localAttendance));
                else {
                    setAttendance(SEED_ATTENDANCE);
                    localStorage.setItem("idear_attendance", JSON.stringify(SEED_ATTENDANCE));
                }

                if (localAranceles) setAranceles(JSON.parse(localAranceles));

                if (localFirebase) {
                    setFirebaseConfigStr(localFirebase);
                } else if (typeof __firebase_config !== "undefined" && __firebase_config) {
                    setFirebaseConfigStr(JSON.stringify(__firebase_config, null, 2));
                }
            }, []);

            // --- GUARDAR LOCALMENTE SI CAMBIA (COMO BACKUP O MODO LOCAL) ---
            const saveLocal = (key, data) => {
                localStorage.setItem(key, JSON.stringify(data));
            };

            // --- CONEXIÓN / DESCONEXIÓN FIREBASE (REGLAS 1, 2, 3) ---
            const connectFirebase = async (customConfig = null) => {
                setLoading(true);
                try {
                    const configToUse = customConfig || firebaseConfigStr;
                    if (!configToUse) {
                        addNotification("Por favor ingresa una configuración de Firebase válida", "error");
                        setLoading(false);
                        return;
                    }

                    const configObj = JSON.parse(configToUse);
                    const currentAppId = typeof __app_id !== 'undefined' ? __app_id : 'idear-portal';
                    setAppId(currentAppId);

                    // Firebase SDK ya importado al inicio del archivo
                    
                    const app = initializeApp(configObj, "IDeArApp");
                    const firebaseAuth = getAuth(app);
                    const firestoreDb = getFirestore(app);

                    setDb(firestoreDb);
                    setAuth(firebaseAuth);

                    // Regla 3: Autenticación ANTES de consultas
                    let loggedUser = null;
                    if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                        const credential = await signInWithCustomToken(firebaseAuth, __initial_auth_token);
                        loggedUser = credential.user;
                    } else {
                        const credential = await signInAnonymously(firebaseAuth);
                        loggedUser = credential.user;
                    }

                    setUser(loggedUser);
                    setFirebaseConnected(true);
                    localStorage.setItem("idear_firebase_config", configToUse);
                    addNotification("Conectado con éxito a la nube de Firebase", "success");

                    // Sincronizar colecciones (Regla 1: Rutas estrictas)
                    // Para simplificar, descargamos y fusionamos con el local
                    syncFirebaseData(firestoreDb, currentAppId);

                } catch (error) {
                    console.error("Error connecting to Firebase:", error);
                    addNotification("Error de conexión Firebase: " + error.message, "error");
                } finally {
                    setLoading(false);
                }
            };

            const syncFirebaseData = async (firestoreDb, currentAppId) => {
                try {
                    // Cargar Alumnos
                    const studentsRef = collection(firestoreDb, 'artifacts', currentAppId, 'public', 'data', 'students');
                    const studentsSnap = await getDocs(studentsRef);
                    let dbStudents = [];
                    studentsSnap.forEach(doc => {
                        dbStudents.push({ id: doc.id, ...doc.data() });
                    });

                    if (dbStudents.length > 0) {
                        setStudents(dbStudents);
                        saveLocal("idear_students", dbStudents);
                    } else {
                        // Si Firebase está vacío, sembramos con nuestro local
                        for (const std of students) {
                            await setDoc(doc(firestoreDb, 'artifacts', currentAppId, 'public', 'data', 'students', std.id), std);
                        }
                    }

                    // Cargar Pagos
                    const paymentsRef = collection(firestoreDb, 'artifacts', currentAppId, 'public', 'data', 'payments');
                    const paymentsSnap = await getDocs(paymentsRef);
                    let dbPayments = [];
                    paymentsSnap.forEach(doc => {
                        dbPayments.push({ id: doc.id, ...doc.data() });
                    });

                    if (dbPayments.length > 0) {
                        setPayments(dbPayments);
                        saveLocal("idear_payments", dbPayments);
                    } else {
                        for (const pay of payments) {
                            await setDoc(doc(firestoreDb, 'artifacts', currentAppId, 'public', 'data', 'payments', pay.id), pay);
                        }
                    }

                    // Cargar Asistencias
                    const attRef = collection(firestoreDb, 'artifacts', currentAppId, 'public', 'data', 'attendance');
                    const attSnap = await getDocs(attRef);
                    let dbAtt = [];
                    attSnap.forEach(doc => {
                        dbAtt.push({ id: doc.id, ...doc.data() });
                    });

                    if (dbAtt.length > 0) {
                        setAttendance(dbAtt);
                        saveLocal("idear_attendance", dbAtt);
                    } else {
                        for (const attItem of attendance) {
                            await setDoc(doc(firestoreDb, 'artifacts', currentAppId, 'public', 'data', 'attendance', attItem.id), attItem);
                        }
                    }

                    addNotification("Datos sincronizados con la nube", "success");
                } catch (err) {
                    console.error("Error syncing:", err);
                    addNotification("Error sincronizando colecciones: " + err.message, "error");
                }
            };

            // Intentar conectar automáticamente si ya está guardado
            useEffect(() => {
                const savedConfig = localStorage.getItem("idear_firebase_config");
                if (savedConfig) {
                    connectFirebase(savedConfig);
                }
            }, []);

            // --- ACCIONES DE ALUMNOS ---
            const handleSaveStudent = async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const studentData = {
                    id: editingStudent ? editingStudent.id : (formData.get("dni").trim() || Date.now().toString()),
                    name: formData.get("name").trim(),
                    dni: formData.get("dni").trim(),
                    level: formData.get("level"),
                    sede: formData.get("sede"),
                    phone: formData.get("phone").trim(),
                    email: formData.get("email").trim(),
                    tutor: formData.get("tutor").trim(),
                    address: formData.get("address").trim(),
                    active: formData.get("active") === "on" ? true : false
                };

                if (!studentData.name || !studentData.dni) {
                    addNotification("DNI y Apellido/Nombre son obligatorios", "error");
                    return;
                }

                let updatedStudents = [...students];
                if (editingStudent) {
                    updatedStudents = updatedStudents.map(s => s.id === editingStudent.id ? studentData : s);
                    addNotification("Alumno actualizado");
                } else {
                    if (students.some(s => s.dni === studentData.dni)) {
                        addNotification("Ya existe un alumno con este DNI", "error");
                        return;
                    }
                    updatedStudents.push(studentData);
                    addNotification("Alumno registrado con éxito");
                }

                setStudents(updatedStudents);
                saveLocal("idear_students", updatedStudents);

                // Guardar en Firebase si está conectado
                if (firebaseConnected && db) {
                    try {
                        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', studentData.id), studentData);
                    } catch (err) {
                        addNotification("Error al guardar en nube: " + err.message, "error");
                    }
                }

                setShowStudentModal(false);
                setEditingStudent(null);
            };

            const handleDeleteStudent = async (id) => {
                const updated = students.filter(s => s.id !== id);
                setStudents(updated);
                saveLocal("idear_students", updated);

                if (firebaseConnected && db) {
                    try {
                        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', id));
                    } catch (err) {
                        addNotification("Error al eliminar de nube", "error");
                    }
                }
                addNotification("Alumno eliminado correctamente", "info");
                if (selectedStudentDetail?.id === id) setSelectedStudentDetail(null);
            };

            // --- ACCIONES DE ASISTENCIAS ---
            // Cargar estado temporal para la combinación Sede + Nivel + Fecha elegidos
            useEffect(() => {
                const filtered = attendance.filter(a => a.date === attendanceDate && a.sede === attendanceSede && a.level === attendanceNivel);
                const temp = {};
                filtered.forEach(a => {
                    temp[a.studentId] = a.status;
                });
                setTempAttendance(temp);
            }, [attendanceDate, attendanceSede, attendanceNivel, attendance]);

            const studentsForAttendance = useMemo(() => {
                return students.filter(s => s.sede === attendanceSede && s.level === attendanceNivel && s.active);
            }, [students, attendanceSede, attendanceNivel]);

            const markAllAttendance = (status) => {
                const temp = {};
                studentsForAttendance.forEach(s => {
                    temp[s.id] = status;
                });
                setTempAttendance(temp);
            };

            const handleToggleAttendance = (studentId, status) => {
                setTempAttendance(prev => ({
                    ...prev,
                    [studentId]: prev[studentId] === status ? undefined : status
                }));
            };

            const handleSaveAttendance = async () => {
                let updatedAttendance = [...attendance];
                const savedList = [];

                for (const student of studentsForAttendance) {
                    const status = tempAttendance[student.id] || "P"; // default Presente
                    const recordId = `${attendanceDate}_${student.id}`;
                    const attRecord = {
                        id: recordId,
                        date: attendanceDate,
                        studentId: student.id,
                        studentName: student.name,
                        level: attendanceNivel,
                        sede: attendanceSede,
                        status: status
                    };

                    updatedAttendance = updatedAttendance.filter(a => a.id !== recordId);
                    updatedAttendance.push(attRecord);
                    savedList.push(attRecord);
                }

                setAttendance(updatedAttendance);
                saveLocal("idear_attendance", updatedAttendance);

                if (firebaseConnected && db) {
                    try {
                        for (const rec of savedList) {
                            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'attendance', rec.id), rec);
                        }
                    } catch (err) {
                        addNotification("Error guardando asistencias en Firebase", "error");
                    }
                }

                addNotification(`Asistencias de hoy guardadas para ${studentsForAttendance.length} alumnos`, "success");
            };

            // --- ACCIONES DE PAGOS ---
            const suggestedAmount = useMemo(() => {
                if (newPayment.period === "Matrícula") return aranceles.matricula;
                if (newPayment.period === "Examen") return aranceles.examen;
                
                // Buscar nivel del alumno seleccionado
                const studentObj = students.find(s => s.id === newPayment.studentId);
                if (studentObj) {
                    if (studentObj.level.includes("Preparatorio")) return aranceles.cuotaPrep;
                    if (studentObj.level.includes("Elemental")) return aranceles.cuotaElem;
                    return aranceles.cuotaSup;
                }
                return aranceles.cuotaPrep;
            }, [newPayment.studentId, newPayment.period, aranceles, students]);

            // Actualizar monto sugerido al cambiar de estudiante o periodo
            useEffect(() => {
                setNewPayment(prev => ({
                    ...prev,
                    amount: suggestedAmount
                }));
            }, [newPayment.studentId, newPayment.period, suggestedAmount]);

            const handleRegisterPayment = async (e) => {
                e.preventDefault();
                if (!newPayment.studentId) {
                    addNotification("Debes seleccionar un alumno", "error");
                    return;
                }

                const selectedStudent = students.find(s => s.id === newPayment.studentId);
                const paymentId = "pay-" + Date.now();
                const receiptNo = newPayment.receiptNo || `00002-${String(payments.length + 326).padStart(8, '0')}`;
                
                const paymentRecord = {
                    id: paymentId,
                    studentId: newPayment.studentId,
                    studentName: selectedStudent.name,
                    period: newPayment.period,
                    date: newPayment.date,
                    concept: newPayment.concept || `Cuota de ${newPayment.period}`,
                    method: newPayment.method,
                    amount: Number(newPayment.amount),
                    receiptNo: receiptNo
                };

                const updated = [paymentRecord, ...payments];
                setPayments(updated);
                saveLocal("idear_payments", updated);

                if (firebaseConnected && db) {
                    try {
                        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'payments', paymentId), paymentRecord);
                    } catch (err) {
                        addNotification("Error guardando pago en Firebase", "error");
                    }
                }

                addNotification(`Pago registrado para ${selectedStudent.name}`, "success");
                
                // Mostrar recibo generado inmediatamente para su impresión/envío
                setActiveReceipt(paymentRecord);

                // Resetear form conservando datos estructurales
                setNewPayment(prev => ({
                    ...prev,
                    concept: "Mensualidad",
                    receiptNo: ""
                }));
            };

            const handleDeletePayment = async (id) => {
                const updated = payments.filter(p => p.id !== id);
                setPayments(updated);
                saveLocal("idear_payments", updated);

                if (firebaseConnected && db) {
                    try {
                        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'payments', id));
                    } catch (err) {
                        addNotification("Error al eliminar pago en nube", "error");
                    }
                }
                addNotification("Pago eliminado", "info");
            };

            // --- FILTROS DE ALUMNOS COMPUTADOS ---
            const filteredStudents = useMemo(() => {
                return students.filter(s => {
                    const matchesSearch = s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.dni.includes(studentSearch);
                    const matchesSede = studentSedeFilter === "Todas" || s.sede === studentSedeFilter;
                    const matchesNivel = studentNivelFilter === "Todos" || s.level === studentNivelFilter;
                    return matchesSearch && matchesSede && matchesNivel;
                });
            }, [students, studentSearch, studentSedeFilter, studentNivelFilter]);

            // --- FILTROS DE PAGOS COMPUTADOS ---
            const filteredPayments = useMemo(() => {
                return payments.filter(p => {
                    const term = paymentFilter.toLowerCase();
                    return p.studentName.toLowerCase().includes(term) || p.period.toLowerCase().includes(term) || p.concept.toLowerCase().includes(term) || p.method.toLowerCase().includes(term);
                });
            }, [payments, paymentFilter]);

            // --- ESTADÍSTICAS DEL DASHBOARD ---
            const stats = useMemo(() => {
                const totalAlumnos = students.filter(s => s.active).length;
                
                // Recaudación mensual actual (supongamos mes actual en curso, ej: Junio 2026 en base a fecha sistema)
                const currentMonthString = "Mayo"; // Basado en el registro mayoritario de la planilla
                const totalRecaudadoMes = payments
                    .filter(p => p.period === currentMonthString)
                    .reduce((sum, p) => sum + p.amount, 0);

                // Tasa de asistencia promedio histórica
                const totalAssists = attendance.length;
                const totalPresents = attendance.filter(a => a.status === "P").length;
                const assistRate = totalAssists > 0 ? Math.round((totalPresents / totalAssists) * 100) : 0;

                // Alumnos con deuda (no tienen pago registrado para el mes actual, por ejemplo "Mayo")
                const paidThisMonthStudentIds = new Set(payments.filter(p => p.period === "Mayo").map(p => p.studentId));
                const deudores = students.filter(s => s.active && !paidThisMonthStudentIds.has(s.id));

                return {
                    totalAlumnos,
                    totalRecaudadoMes,
                    assistRate,
                    totalDeudores: deudores.length,
                    deudoresList: deudores.slice(0, 5) // top deudores para alerta
                };
            }, [students, payments, attendance]);

            // Datos para el gráfico dinámico de barras de ingresos por mes
            const chartData = useMemo(() => {
                const months = ["Marzo", "Abril", "Mayo", "Junio"];
                return months.map(m => {
                    const total = payments.filter(p => p.period === m).reduce((sum, p) => sum + p.amount, 0);
                    return { month: m, total };
                });
            }, [payments]);

            // --- ESTADÍSTICAS DE UN ALUMNO EN PARTICULAR ---
            const activeStudentStats = useMemo(() => {
                if (!selectedStudentDetail) return null;
                const sId = selectedStudentDetail.id;
                
                const sPayments = payments.filter(p => p.studentId === sId);
                const sAttendance = attendance.filter(a => a.studentId === sId);

                const totalClasses = sAttendance.length;
                const presents = sAttendance.filter(a => a.status === "P").length;
                const excused = sAttendance.filter(a => a.status === "J").length;
                const absents = sAttendance.filter(a => a.status === "A").length;
                
                const attendanceRate = totalClasses > 0 ? Math.round((presents / totalClasses) * 100) : 100;

                const paidPeriods = sPayments.map(p => p.period);
                const missingPeriods = ["Marzo", "Abril", "Mayo", "Junio"].filter(p => !paidPeriods.includes(p));

                return {
                    payments: sPayments,
                    attendance: sAttendance,
                    presents,
                    excused,
                    absents,
                    attendanceRate,
                    missingPeriods,
                    paidPeriods
                };
            }, [selectedStudentDetail, payments, attendance]);

            const handlePrintReceipt = () => {
                window.print();
            };

            return (
                <div className="min-h-screen flex flex-col justify-between">
                    {/* Notificaciones flotantes */}
                    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 no-print">
                        {notifications.map(n => (
                            <div key={n.id} className={`p-4 rounded-xl shadow-lg border text-sm flex items-center gap-3 transition-all transform translate-y-0 duration-300 ${
                                n.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                                n.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-blue-50 border-blue-200 text-blue-800'
                            }`}>
                                <i className={`fas ${n.type === 'success' ? 'fa-check-circle' : n.type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}`}></i>
                                <span>{n.text}</span>
                            </div>
                        ))}
                    </div>

                    {/* Header Principal */}
                    <header className="bg-gradient-to-r from-slate-900 to-brand-900 text-white shadow-xl no-print">
                        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-brand-500 flex items-center justify-center text-white text-2xl font-bold shadow-md">
                                    I
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h1 className="text-2xl font-extrabold tracking-tight">Portal IDeAr</h1>
                                        <span className="text-xs bg-brand-800 text-brand-200 px-2 py-0.5 rounded-full font-medium">v2.1</span>
                                    </div>
                                    <p className="text-xs text-brand-200">Reg. SPEPM 213/21 | Leandro N. Alem & Filiales</p>
                                </div>
                            </div>

                            {/* Estado Firebase */}
                            <div className="flex items-center gap-3">
                                <div className={`text-xs px-3 py-1.5 rounded-full font-semibold flex items-center gap-2 ${
                                    firebaseConnected ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}>
                                    <span className={`w-2 h-2 rounded-full ${firebaseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
                                    {firebaseConnected ? 'Nube Firebase Activa' : 'Modo Local / Demo'}
                                </div>
                                <button 
                                    onClick={() => setCurrentTab("config")}
                                    className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                                >
                                    <i className="fas fa-cog mr-1"></i> Configurar
                                </button>
                            </div>
                        </div>
                    </header>

                    {/* Navegación de Pestañas */}
                    <nav className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40 no-print">
                        <div className="max-w-7xl mx-auto px-4 overflow-x-auto flex space-x-1 sm:space-x-4">
                            <button 
                                onClick={() => setCurrentTab("dashboard")} 
                                className={`py-4 px-3 sm:px-5 border-b-2 font-semibold text-sm transition-all whitespace-nowrap flex items-center gap-2 ${
                                    currentTab === "dashboard" ? "border-brand-500 text-brand-600" : "border-transparent text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                <i className="fas fa-chart-pie"></i> Panel General
                            </button>
                            <button 
                                onClick={() => setCurrentTab("asistencias")} 
                                className={`py-4 px-3 sm:px-5 border-b-2 font-semibold text-sm transition-all whitespace-nowrap flex items-center gap-2 ${
                                    currentTab === "asistencias" ? "border-brand-500 text-brand-600" : "border-transparent text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                <i className="fas fa-calendar-check"></i> Tomar Asistencia
                            </button>
                            <button 
                                onClick={() => setCurrentTab("pagos")} 
                                className={`py-4 px-3 sm:px-5 border-b-2 font-semibold text-sm transition-all whitespace-nowrap flex items-center gap-2 ${
                                    currentTab === "pagos" ? "border-brand-500 text-brand-600" : "border-transparent text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                <i className="fas fa-file-invoice-dollar"></i> Cobros & Recibos
                            </button>
                            <button 
                                onClick={() => setCurrentTab("alumnos")} 
                                className={`py-4 px-3 sm:px-5 border-b-2 font-semibold text-sm transition-all whitespace-nowrap flex items-center gap-2 ${
                                    currentTab === "alumnos" ? "border-brand-500 text-brand-600" : "border-transparent text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                <i className="fas fa-user-graduate"></i> Directorio Alumnos
                            </button>
                        </div>
                    </nav>

                    {/* Contenedor Principal */}
                    <main className="flex-grow max-w-7xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 no-print">
                        
                        {/* 1. SECCIÓN DASHBOARD */}
                        {currentTab === "dashboard" && (
                            <div className="space-y-8 animate-fadeIn">
                                {/* Encabezado */}
                                <div className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-3xl p-6 md:p-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                                    <div className="space-y-2 text-center md:text-left">
                                        <h2 className="text-3xl font-extrabold">¡Hola, Administrador!</h2>
                                        <p className="text-emerald-100 max-w-md">Bienvenido al centro integral de operaciones del Instituto IDeAr. Aquí tienes un vistazo de hoy.</p>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="bg-white/10 p-4 rounded-2xl text-center backdrop-blur-sm min-w-[100px]">
                                            <p className="text-xs text-emerald-200">Alumnos Activos</p>
                                            <p className="text-3xl font-bold">{stats.totalAlumnos}</p>
                                        </div>
                                        <div className="bg-white/10 p-4 rounded-2xl text-center backdrop-blur-sm min-w-[100px]">
                                            <p className="text-xs text-emerald-200">Asistencia Hoy</p>
                                            <p className="text-3xl font-bold">{stats.assistRate}%</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Tarjetas de Indicadores */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center text-xl">
                                            <i className="fas fa-users"></i>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400 font-semibold uppercase">Matrícula Activa</p>
                                            <p className="text-2xl font-bold text-slate-800">{stats.totalAlumnos} alumnos</p>
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
                                            <i className="fas fa-hand-holding-dollar"></i>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400 font-semibold uppercase">Cobrado Mayo</p>
                                            <p className="text-2xl font-bold text-emerald-600">${stats.totalRecaudadoMes.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl">
                                            <i className="fas fa-clock"></i>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400 font-semibold uppercase">Tasa Presentismo</p>
                                            <p className="text-2xl font-bold text-amber-600">{stats.assistRate}%</p>
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl">
                                            <i className="fas fa-exclamation-triangle"></i>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400 font-semibold uppercase">Cuotas Pendientes Mayo</p>
                                            <p className="text-2xl font-bold text-rose-600">{stats.totalDeudores} alumnos</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Gráfico e Historial */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    
                                    {/* Gráfico de recaudación SVG */}
                                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 lg:col-span-2">
                                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <i className="fas fa-chart-line text-brand-500"></i> Recaudaciones por Período
                                        </h3>
                                        <div className="h-64 flex items-end justify-between gap-4 pt-6 px-4">
                                            {chartData.map(item => {
                                                const maxVal = Math.max(...chartData.map(c => c.total), 1);
                                                const heightPercent = Math.min(100, Math.round((item.total / maxVal) * 100));
                                                return (
                                                    <div key={item.month} className="flex-1 flex flex-col items-center gap-2 group">
                                                        <span className="text-xs font-semibold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white px-2 py-1 rounded shadow-sm">
                                                            ${item.total.toLocaleString()}
                                                        </span>
                                                        <div 
                                                            style={{ height: `${Math.max(10, heightPercent)}%` }} 
                                                            className="w-full bg-brand-500 hover:bg-brand-600 rounded-t-xl transition-all duration-500 shadow-md flex items-end justify-center"
                                                        >
                                                            <span className="text-[10px] text-white font-bold mb-2 hidden md:inline">
                                                                {heightPercent > 20 ? `$${item.total / 1000}k` : ''}
                                                            </span>
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-600">{item.month}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Alertador de deudores */}
                                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                                <i className="fas fa-bell text-rose-500"></i> Alerta de Cuotas
                                            </h3>
                                            <span className="text-xs bg-rose-50 text-rose-700 px-2 py-1 rounded-full font-bold">Mayo</span>
                                        </div>

                                        <div className="divide-y divide-slate-100">
                                            {stats.deudoresList.length === 0 ? (
                                                <div className="text-center py-8 text-slate-400">
                                                    <i className="fas fa-check-circle text-emerald-500 text-3xl mb-2"></i>
                                                    <p className="text-sm font-medium">¡Todos al día en Mayo!</p>
                                                </div>
                                            ) : (
                                                stats.deudoresList.map(std => (
                                                    <div key={std.id} className="py-3 flex items-center justify-between">
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-800">{std.name}</p>
                                                            <p className="text-xs text-slate-400">{std.sede} | {std.level}</p>
                                                        </div>
                                                        <button 
                                                            onClick={() => {
                                                                setNewPayment(prev => ({ ...prev, studentId: std.id, period: "Mayo" }));
                                                                setCurrentTab("pagos");
                                                            }}
                                                            className="text-xs bg-brand-50 hover:bg-brand-100 text-brand-700 px-2 py-1.5 rounded-lg font-bold transition-all"
                                                        >
                                                            Cobrar
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 2. SECCIÓN ASISTENCIAS */}
                        {currentTab === "asistencias" && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                                    <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                        <i className="fas fa-calendar-alt text-brand-500"></i> Tomar Asistencia Diaria
                                    </h3>

                                    {/* Selector de Filtros */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Sede</label>
                                            <select 
                                                value={attendanceSede} 
                                                onChange={(e) => setAttendanceSede(e.target.value)}
                                                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none bg-slate-50 font-medium"
                                            >
                                                {SEDES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nivel</label>
                                            <select 
                                                value={attendanceNivel} 
                                                onChange={(e) => setAttendanceNivel(e.target.value)}
                                                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none bg-slate-50 font-medium"
                                            >
                                                {NIVELES.map(n => <option key={n} value={n}>{n}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Fecha de Clase</label>
                                            <input 
                                                type="date" 
                                                value={attendanceDate}
                                                onChange={(e) => setAttendanceDate(e.target.value)}
                                                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none bg-slate-50 font-medium"
                                            />
                                        </div>
                                    </div>

                                    {/* Atajos Rápidos */}
                                    <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-t border-b border-slate-100 mb-6">
                                        <div className="text-sm font-semibold text-slate-600">
                                            Alumnos en este curso: <span className="text-brand-600 font-bold">{studentsForAttendance.length}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => markAllAttendance("P")}
                                                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                            >
                                                Todos Presentes
                                            </button>
                                            <button 
                                                onClick={() => markAllAttendance("A")}
                                                className="bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                            >
                                                Todos Ausentes
                                            </button>
                                        </div>
                                    </div>

                                    {/* Listado de Alumnos */}
                                    {studentsForAttendance.length === 0 ? (
                                        <div className="text-center py-12 text-slate-400">
                                            <i className="fas fa-graduation-cap text-4xl mb-3"></i>
                                            <p className="font-medium">No hay alumnos registrados en esta sede y nivel</p>
                                            <button 
                                                onClick={() => {
                                                    setEditingStudent(null);
                                                    setShowStudentModal(true);
                                                }}
                                                className="mt-4 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all inline-flex items-center gap-2"
                                            >
                                                <i className="fas fa-plus"></i> Añadir Alumno
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="hidden sm:grid grid-cols-12 gap-4 px-4 text-xs font-bold text-slate-400 uppercase">
                                                <div className="col-span-6">Alumno / DNI</div>
                                                <div className="col-span-6 text-right">Estado de Asistencia</div>
                                            </div>

                                            <div className="divide-y divide-slate-100">
                                                {studentsForAttendance.map(student => {
                                                    const currentStatus = tempAttendance[student.id] || "P";
                                                    return (
                                                        <div key={student.id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-2 hover:bg-slate-50/80 rounded-xl transition-colors">
                                                            <div>
                                                                <p className="font-bold text-slate-800">{student.name}</p>
                                                                <p className="text-xs text-slate-400">DNI: {student.dni}</p>
                                                            </div>

                                                            <div className="flex items-center gap-2 sm:self-center">
                                                                <button
                                                                    onClick={() => handleToggleAttendance(student.id, "P")}
                                                                    className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                                                        currentStatus === "P" 
                                                                        ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" 
                                                                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                                                    }`}
                                                                >
                                                                    <i className="fas fa-check"></i> Presente
                                                                </button>
                                                                <button
                                                                    onClick={() => handleToggleAttendance(student.id, "A")}
                                                                    className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                                                        currentStatus === "A" 
                                                                        ? "bg-rose-500 text-white shadow-md shadow-rose-500/20" 
                                                                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                                                    }`}
                                                                >
                                                                    <i className="fas fa-times"></i> Ausente
                                                                </button>
                                                                <button
                                                                    onClick={() => handleToggleAttendance(student.id, "J")}
                                                                    className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                                                        currentStatus === "J" 
                                                                        ? "bg-amber-500 text-white shadow-md shadow-amber-500/20" 
                                                                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                                                    }`}
                                                                >
                                                                    <i className="fas fa-question"></i> Justificado
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <div className="pt-6 flex justify-end">
                                                <button 
                                                    onClick={handleSaveAttendance}
                                                    className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-6 rounded-2xl transition-all shadow-lg shadow-brand-600/10 flex items-center gap-2 w-full sm:w-auto justify-center"
                                                >
                                                    <i className="fas fa-save"></i> Guardar Planilla de Asistencias
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 3. SECCIÓN PAGOS Y ARANCELES */}
                        {currentTab === "pagos" && (
                            <div className="space-y-8 animate-fadeIn">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    
                                    {/* Registrador de pagos */}
                                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 lg:col-span-1">
                                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                                            <i className="fas fa-cash-register text-brand-500"></i> Nuevo Pago / Cobro
                                        </h3>

                                        <form onSubmit={handleRegisterPayment} className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Seleccionar Alumno</label>
                                                <select 
                                                    value={newPayment.studentId}
                                                    onChange={(e) => setNewPayment(prev => ({ ...prev, studentId: e.target.value }))}
                                                    className="w-full p-3 rounded-xl border border-slate-200 outline-none bg-slate-50 font-semibold"
                                                    required
                                                >
                                                    <option value="">-- Elige un Alumno --</option>
                                                    {students.filter(s => s.active).map(s => (
                                                        <option key={s.id} value={s.id}>{s.name} ({s.sede})</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Período / Cuota</label>
                                                    <select 
                                                        value={newPayment.period}
                                                        onChange={(e) => setNewPayment(prev => ({ ...prev, period: e.target.value }))}
                                                        className="w-full p-3 rounded-xl border border-slate-200 outline-none bg-slate-50 font-semibold"
                                                    >
                                                        {PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Fecha de Cobro</label>
                                                    <input 
                                                        type="date"
                                                        value={newPayment.date}
                                                        onChange={(e) => setNewPayment(prev => ({ ...prev, date: e.target.value }))}
                                                        className="w-full p-3 rounded-xl border border-slate-200 outline-none bg-slate-50 font-semibold"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Medio de Pago</label>
                                                    <select 
                                                        value={newPayment.method}
                                                        onChange={(e) => setNewPayment(prev => ({ ...prev, method: e.target.value }))}
                                                        className="w-full p-3 rounded-xl border border-slate-200 outline-none bg-slate-50 font-semibold"
                                                    >
                                                        {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Importe ($)</label>
                                                    <input 
                                                        type="number"
                                                        value={newPayment.amount}
                                                        onChange={(e) => setNewPayment(prev => ({ ...prev, amount: Number(e.target.value) }))}
                                                        className="w-full p-3 rounded-xl border border-slate-200 outline-none bg-slate-50 font-bold text-brand-600"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Detalle o Concepto</label>
                                                <input 
                                                    type="text"
                                                    placeholder="Ej: Cuota mensual de Mayo"
                                                    value={newPayment.concept}
                                                    onChange={(e) => setNewPayment(prev => ({ ...prev, concept: e.target.value }))}
                                                    className="w-full p-3 rounded-xl border border-slate-200 outline-none bg-slate-50 font-medium"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nro de Recibo (Manual/Opcional)</label>
                                                <input 
                                                    type="text"
                                                    placeholder="Ej: 00002-00000112"
                                                    value={newPayment.receiptNo}
                                                    onChange={(e) => setNewPayment(prev => ({ ...prev, receiptNo: e.target.value }))}
                                                    className="w-full p-3 rounded-xl border border-slate-200 outline-none bg-slate-50 font-medium text-slate-600"
                                                />
                                            </div>

                                            <button 
                                                type="submit"
                                                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                                            >
                                                <i className="fas fa-receipt"></i> Registrar & Emitir Recibo
                                            </button>
                                        </form>
                                    </div>

                                    {/* Listado de cobros realizados */}
                                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 lg:col-span-2">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                                <i className="fas fa-receipt text-brand-500"></i> Historial de Cobros Recientes
                                            </h3>
                                            <input 
                                                type="text"
                                                placeholder="Buscar por alumno, periodo, medio..."
                                                value={paymentFilter}
                                                onChange={(e) => setPaymentFilter(e.target.value)}
                                                className="p-2.5 rounded-xl border border-slate-200 text-sm outline-none w-full sm:w-64"
                                            />
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="border-b border-slate-100 text-xs text-slate-400 font-bold uppercase">
                                                        <th className="py-3 px-4">Fecha</th>
                                                        <th className="py-3 px-4">Alumno</th>
                                                        <th className="py-3 px-4">Período</th>
                                                        <th className="py-3 px-4">Medio</th>
                                                        <th className="py-3 px-4">Monto</th>
                                                        <th className="py-3 px-4 text-center">Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {filteredPayments.length === 0 ? (
                                                        <tr>
                                                            <td colSpan="6" className="text-center py-8 text-slate-400 text-sm">No se encontraron cobros registrados</td>
                                                        </tr>
                                                    ) : (
                                                        filteredPayments.map(p => (
                                                            <tr key={p.id} className="hover:bg-slate-50/50 transition-colors text-sm">
                                                                <td className="py-3 px-4 font-medium text-slate-500">{p.date}</td>
                                                                <td className="py-3 px-4 font-semibold text-slate-800">{p.studentName}</td>
                                                                <td className="py-3 px-4">
                                                                    <span className="bg-brand-50 text-brand-700 px-2 py-1 rounded-full text-xs font-bold">{p.period}</span>
                                                                </td>
                                                                <td className="py-3 px-4 text-slate-500">{p.method}</td>
                                                                <td className="py-3 px-4 font-bold text-emerald-600">${p.amount.toLocaleString()}</td>
                                                                <td className="py-3 px-4 flex items-center justify-center gap-2">
                                                                    <button 
                                                                        onClick={() => setActiveReceipt(p)}
                                                                        title="Ver Recibo Oficial"
                                                                        className="p-1.5 bg-slate-100 hover:bg-brand-500 hover:text-white text-slate-600 rounded-lg transition-all"
                                                                    >
                                                                        <i className="fas fa-file-invoice"></i>
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => handleDeletePayment(p.id)}
                                                                        title="Eliminar registro"
                                                                        className="p-1.5 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-600 rounded-lg transition-all"
                                                                    >
                                                                        <i className="fas fa-trash"></i>
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        )}

                        {/* 4. SECCIÓN ALUMNOS DIRECTORIO */}
                        {currentTab === "alumnos" && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                                    
                                    {/* Cabecera y Filtros */}
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-800">Directorio de Estudiantes</h3>
                                            <p className="text-sm text-slate-400">Total registrados: {filteredStudents.length}</p>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                setEditingStudent(null);
                                                setShowStudentModal(true);
                                            }}
                                            className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
                                        >
                                            <i className="fas fa-user-plus"></i> Registrar Alumno
                                        </button>
                                    </div>

                                    {/* Filtros */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                                        <input 
                                            type="text"
                                            placeholder="Buscar por Nombre o DNI..."
                                            value={studentSearch}
                                            onChange={(e) => setStudentSearch(e.target.value)}
                                            className="p-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-brand-500"
                                        />
                                        <select 
                                            value={studentSedeFilter}
                                            onChange={(e) => setStudentSedeFilter(e.target.value)}
                                            className="p-3 rounded-xl border border-slate-200 text-sm outline-none bg-slate-50 font-semibold text-slate-600"
                                        >
                                            <option value="Todas">Todas las Sedes</option>
                                            {SEDES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                        <select 
                                            value={studentNivelFilter}
                                            onChange={(e) => setStudentNivelFilter(e.target.value)}
                                            className="p-3 rounded-xl border border-slate-200 text-sm outline-none bg-slate-50 font-semibold text-slate-600"
                                        >
                                            <option value="Todos">Todos los Niveles</option>
                                            {NIVELES.map(n => <option key={n} value={n}>{n}</option>)}
                                        </select>
                                    </div>

                                    {/* Directorio de Cards / Tabla */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-slate-100 text-xs text-slate-400 font-bold uppercase">
                                                    <th className="py-3 px-4">Alumno</th>
                                                    <th className="py-3 px-4">DNI</th>
                                                    <th className="py-3 px-4">Sede / Nivel</th>
                                                    <th className="py-3 px-4">Contacto</th>
                                                    <th className="py-3 px-4 text-center">Estado</th>
                                                    <th className="py-3 px-4 text-center">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {filteredStudents.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="6" className="text-center py-8 text-slate-400 text-sm">No se encontraron alumnos con los filtros seleccionados</td>
                                                    </tr>
                                                ) : (
                                                    filteredStudents.map(student => (
                                                        <tr key={student.id} className="hover:bg-slate-50/50 transition-colors text-sm">
                                                            <td className="py-3.5 px-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-xs">
                                                                        {student.name.charAt(0)}
                                                                    </div>
                                                                    <span className="font-bold text-slate-800">{student.name}</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-3.5 px-4 font-medium text-slate-500">{student.dni}</td>
                                                            <td className="py-3.5 px-4">
                                                                <p className="font-semibold text-slate-700">{student.sede}</p>
                                                                <p className="text-xs text-slate-400">{student.level}</p>
                                                            </td>
                                                            <td className="py-3.5 px-4 text-slate-600">
                                                                <p className="text-xs">{student.phone}</p>
                                                                <p className="text-xs text-slate-400">{student.email || 'Sin correo'}</p>
                                                            </td>
                                                            <td className="py-3.5 px-4 text-center">
                                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                                    student.active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                                                }`}>
                                                                    {student.active ? 'Activo' : 'Baja'}
                                                                </span>
                                                            </td>
                                                            <td className="py-3.5 px-4 flex items-center justify-center gap-2">
                                                                <button 
                                                                    onClick={() => setSelectedStudentDetail(student)}
                                                                    title="Ver Ficha Completa"
                                                                    className="p-1.5 bg-slate-100 hover:bg-brand-500 hover:text-white text-slate-600 rounded-lg transition-all"
                                                                >
                                                                    <i className="fas fa-eye"></i>
                                                                </button>
                                                                <button 
                                                                    onClick={() => {
                                                                        setEditingStudent(student);
                                                                        setShowStudentModal(true);
                                                                    }}
                                                                    title="Editar Perfil"
                                                                    className="p-1.5 bg-slate-100 hover:bg-amber-500 hover:text-white text-slate-600 rounded-lg transition-all"
                                                                >
                                                                    <i className="fas fa-edit"></i>
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDeleteStudent(student.id)}
                                                                    title="Eliminar Alumno"
                                                                    className="p-1.5 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-600 rounded-lg transition-all"
                                                                >
                                                                    <i className="fas fa-trash-alt"></i>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                </div>
                            </div>
                        )}

                        {/* 5. SECCIÓN CONFIGURACIÓN */}
                        {currentTab === "config" && (
                            <div className="space-y-8 animate-fadeIn">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    
                                    {/* Ajustes de Firebase */}
                                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <i className="fab fa-firebase text-amber-500"></i> Conectar con Firebase (Cloud Sync)
                                        </h3>
                                        <p className="text-sm text-slate-400 mb-6">
                                            Coloca tu configuración JSON de Firebase para sincronizar los datos en tiempo real entre múltiples dispositivos de forma segura.
                                        </p>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">JSON Configuración</label>
                                                <textarea 
                                                    rows="8"
                                                    value={firebaseConfigStr}
                                                    onChange={(e) => setFirebaseConfigStr(e.target.value)}
                                                    placeholder='{ "apiKey": "AIzaSy...", "authDomain": "...", "projectId": "..." }'
                                                    className="w-full p-3 font-mono text-xs rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-brand-500 outline-none"
                                                ></textarea>
                                            </div>

                                            <button 
                                                onClick={() => connectFirebase()}
                                                disabled={loading}
                                                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                                            >
                                                {loading ? (
                                                    <span className="inline-block w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                                                ) : <i className="fas fa-cloud-upload-alt"></i>}
                                                Establecer Conexión y Sincronizar
                                            </button>
                                        </div>
                                    </div>

                                    {/* Configuración de Aranceles */}
                                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <i className="fas fa-dollar-sign text-emerald-500"></i> Aranceles Vigentes Ciclo 2026
                                        </h3>
                                        <p className="text-sm text-slate-400 mb-6">
                                            Establece los valores base sugeridos al registrar nuevos pagos.
                                        </p>

                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Matrícula ($)</label>
                                                    <input 
                                                        type="number"
                                                        value={aranceles.matricula}
                                                        onChange={(e) => setAranceles(prev => ({ ...prev, matricula: Number(e.target.value) }))}
                                                        className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Derecho de Examen ($)</label>
                                                    <input 
                                                        type="number"
                                                        value={aranceles.examen}
                                                        onChange={(e) => setAranceles(prev => ({ ...prev, examen: Number(e.target.value) }))}
                                                        className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cuota Prep ($)</label>
                                                    <input 
                                                        type="number"
                                                        value={aranceles.cuotaPrep}
                                                        onChange={(e) => setAranceles(prev => ({ ...prev, cuotaPrep: Number(e.target.value) }))}
                                                        className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cuota Elem ($)</label>
                                                    <input 
                                                        type="number"
                                                        value={aranceles.cuotaElem}
                                                        onChange={(e) => setAranceles(prev => ({ ...prev, cuotaElem: Number(e.target.value) }))}
                                                        className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cuota Superior ($)</label>
                                                    <input 
                                                        type="number"
                                                        value={aranceles.cuotaSup}
                                                        onChange={(e) => setAranceles(prev => ({ ...prev, cuotaSup: Number(e.target.value) }))}
                                                        className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700"
                                                    />
                                                </div>
                                            </div>

                                            <button 
                                                onClick={() => {
                                                    localStorage.setItem("idear_aranceles", JSON.stringify(aranceles));
                                                    addNotification("Tarifas guardadas localmente");
                                                }}
                                                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md"
                                            >
                                                Guardar Configuración de Aranceles
                                            </button>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        )}

                    </main>

                    {/* --- MODALES --- */}

                    {/* Modal Crear/Editar Alumno */}
                    {showStudentModal && (
                        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn no-print">
                            <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold text-slate-800">
                                        {editingStudent ? "Editar Perfil del Alumno" : "Registrar Alumno Nuevo"}
                                    </h3>
                                    <button 
                                        onClick={() => setShowStudentModal(false)}
                                        className="p-1 text-slate-400 hover:text-slate-600"
                                    >
                                        <i className="fas fa-times text-lg"></i>
                                    </button>
                                </div>

                                <form onSubmit={handleSaveStudent} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Apellido y Nombre</label>
                                        <input 
                                            type="text" 
                                            name="name"
                                            defaultValue={editingStudent?.name || ""}
                                            className="w-full p-3 rounded-xl border border-slate-200 outline-none bg-slate-50 font-semibold"
                                            required 
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">DNI del Alumno</label>
                                            <input 
                                                type="text" 
                                                name="dni"
                                                defaultValue={editingStudent?.dni || ""}
                                                className="w-full p-3 rounded-xl border border-slate-200 outline-none bg-slate-50"
                                                required 
                                                disabled={!!editingStudent}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Teléfono de Contacto</label>
                                            <input 
                                                type="text" 
                                                name="phone"
                                                defaultValue={editingStudent?.phone || ""}
                                                className="w-full p-3 rounded-xl border border-slate-200 outline-none bg-slate-50"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Sede</label>
                                            <select 
                                                name="sede"
                                                defaultValue={editingStudent?.sede || "Leandro N. Alem"}
                                                className="w-full p-3 rounded-xl border border-slate-200 outline-none bg-slate-50 font-semibold"
                                            >
                                                {SEDES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nivel / Curso</label>
                                            <select 
                                                name="level"
                                                defaultValue={editingStudent?.level || "1ro Preparatorio"}
                                                className="w-full p-3 rounded-xl border border-slate-200 outline-none bg-slate-50 font-semibold"
                                            >
                                                {NIVELES.map(n => <option key={n} value={n}>{n}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email del Alumno/Tutor</label>
                                        <input 
                                            type="email" 
                                            name="email"
                                            defaultValue={editingStudent?.email || ""}
                                            className="w-full p-3 rounded-xl border border-slate-200 outline-none bg-slate-50"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tutor Responsable</label>
                                            <input 
                                                type="text" 
                                                name="tutor"
                                                defaultValue={editingStudent?.tutor || ""}
                                                className="w-full p-3 rounded-xl border border-slate-200 outline-none bg-slate-50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Domicilio</label>
                                            <input 
                                                type="text" 
                                                name="address"
                                                defaultValue={editingStudent?.address || ""}
                                                className="w-full p-3 rounded-xl border border-slate-200 outline-none bg-slate-50"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                                        <input 
                                            type="checkbox" 
                                            name="active" 
                                            id="chk-active"
                                            defaultChecked={editingStudent ? editingStudent.active : true}
                                            className="w-5 h-5 accent-brand-500"
                                        />
                                        <label for="chk-active" className="text-sm font-bold text-slate-700">Estado de Matrícula Activo</label>
                                    </div>

                                    <div className="pt-6 flex gap-3">
                                        <button 
                                            type="button" 
                                            onClick={() => setShowStudentModal(false)}
                                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition-all"
                                        >
                                            Cancelar
                                        </button>
                                        <button 
                                            type="submit" 
                                            className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl transition-all shadow-md"
                                        >
                                            Guardar Registro
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Ficha Completa Alumno */}
                    {selectedStudentDetail && activeStudentStats && (
                        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn no-print">
                            <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
                                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-brand-500 text-white font-bold flex items-center justify-center">
                                            {selectedStudentDetail.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-800">{selectedStudentDetail.name}</h3>
                                            <p className="text-xs text-slate-400">DNI: {selectedStudentDetail.dni} | {selectedStudentDetail.sede}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedStudentDetail(null)}
                                        className="p-1 text-slate-400 hover:text-slate-600"
                                    >
                                        <i className="fas fa-times text-lg"></i>
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    {/* Presentismo */}
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Estadística de Asistencias</h4>
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <p className="text-3xl font-extrabold text-brand-600">{activeStudentStats.attendanceRate}%</p>
                                                <p className="text-xs text-slate-500">Tasa de presentismo</p>
                                            </div>
                                            <div className="text-xs space-y-1 text-slate-600">
                                                <p className="flex justify-between gap-4"><span>Presentes:</span> <span className="font-bold text-emerald-600">{activeStudentStats.presents}</span></p>
                                                <p className="flex justify-between gap-4"><span>Justificados:</span> <span className="font-bold text-amber-600">{activeStudentStats.excused}</span></p>
                                                <p className="flex justify-between gap-4"><span>Ausentes:</span> <span className="font-bold text-rose-600">{activeStudentStats.absents}</span></p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Estado Financiero */}
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Historial de Cuotas (2026)</h4>
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap gap-1.5">
                                                {["Marzo", "Abril", "Mayo", "Junio"].map(month => {
                                                    const isPaid = activeStudentStats.paidPeriods.includes(month);
                                                    return (
                                                        <span 
                                                            key={month} 
                                                            className={`text-[10px] px-2 py-1 rounded-full font-bold ${
                                                                isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                                            }`}
                                                        >
                                                            {month}: {isPaid ? 'Al día' : 'Impago'}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                            <p className="text-[11px] text-slate-400 italic">Precios sugeridos según configuración de aranceles</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Últimos Pagos Registrados */}
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800 mb-3">Historial de Pagos Efectuados</h4>
                                    {activeStudentStats.payments.length === 0 ? (
                                        <p className="text-xs text-slate-400 text-center py-6">No hay registros de pago para este alumno</p>
                                    ) : (
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {activeStudentStats.payments.map(p => (
                                                <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-slate-100 text-xs">
                                                    <div>
                                                        <p className="font-bold text-slate-700">{p.concept}</p>
                                                        <p className="text-[10px] text-slate-400">{p.date} | Recibo: {p.receiptNo}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-extrabold text-emerald-600">${p.amount.toLocaleString()}</p>
                                                        <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">{p.method}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="pt-6 mt-6 border-t border-slate-100 flex justify-end">
                                    <button 
                                        onClick={() => setSelectedStudentDetail(null)}
                                        className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all shadow-md"
                                    >
                                        Cerrar Ficha
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Modal Visor de Recibo Oficial Alta Fidelidad */}
                    {activeReceipt && (
                        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn overflow-y-auto no-print">
                            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl p-8 max-h-[95vh] overflow-y-auto relative">
                                
                                <button 
                                    onClick={() => setActiveReceipt(null)}
                                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-50 transition-all"
                                >
                                    <i className="fas fa-times text-lg"></i>
                                </button>

                                {/* Contenedor Oficial del Recibo para imprimir */}
                                <div id="receipt-print-area" className="bg-white text-slate-900 p-6 border-2 border-slate-300 rounded-2xl space-y-6">
                                    
                                    {/* Encabezado Principal Recibo */}
                                    <div className="flex justify-between items-start border-b pb-4 border-slate-200">
                                        <div className="space-y-1">
                                            <h4 className="text-lg font-black tracking-tight text-brand-900">SILVA GRACIELA BEATRIZ</h4>
                                            <p className="text-[10px] text-slate-500 font-semibold">Instituto Para el Desarrollo del Arte (IDeAr)</p>
                                            <p className="text-[10px] text-slate-500">Reg. SPEPM N° 213/21</p>
                                            <p className="text-[10px] text-slate-400">Cataratas Del Iguazú 912 - Leandro N. Alem - Mnes.</p>
                                        </div>
                                        <div className="text-right space-y-1">
                                            <div className="bg-slate-900 text-white font-black px-4 py-1.5 rounded-lg text-sm inline-block uppercase tracking-wider">
                                                Recibo X
                                            </div>
                                            <p className="text-xs font-bold text-slate-600 pt-1">Nro: {activeReceipt.receiptNo}</p>
                                            <p className="text-[10px] text-slate-400 font-semibold">Fecha: {activeReceipt.date}</p>
                                        </div>
                                    </div>

                                    {/* Datos Fiscales */}
                                    <div className="grid grid-cols-2 gap-4 text-[10px] text-slate-500 border-b pb-4 border-slate-200 font-medium">
                                        <div>
                                            <p>CUIT: 27-25496483-8</p>
                                            <p>Ingresos Brutos: 27-25496483-8</p>
                                        </div>
                                        <div className="text-right">
                                            <p>Monotributista Responsable</p>
                                            <p className="font-bold text-slate-400 italic">Documento no válido como Factura</p>
                                        </div>
                                    </div>

                                    {/* Datos del Alumno Receptor */}
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs space-y-2">
                                        <p className="flex justify-between">
                                            <span className="text-slate-400 font-bold uppercase text-[10px]">Alumno / Estudiante:</span>
                                            <span className="font-extrabold text-slate-800">{activeReceipt.studentName}</span>
                                        </p>
                                        <p className="flex justify-between">
                                            <span className="text-slate-400 font-bold uppercase text-[10px]">Identificación (DNI):</span>
                                            <span className="font-semibold text-slate-700">{activeReceipt.studentId}</span>
                                        </p>
                                    </div>

                                    {/* Detalle y Valores */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-xs font-bold text-slate-400 uppercase border-b pb-1">
                                            <span>Detalle del Servicio / Concepto</span>
                                            <span>Importe</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm py-2">
                                            <div>
                                                <p className="font-bold text-slate-800">{activeReceipt.concept}</p>
                                                <p className="text-[10px] text-slate-400">Cuota mes: {activeReceipt.period} | Vía {activeReceipt.method}</p>
                                            </div>
                                            <span className="font-extrabold text-slate-800">${activeReceipt.amount.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {/* Total Final */}
                                    <div className="border-t pt-4 flex justify-between items-center">
                                        <span className="text-xs font-black uppercase text-slate-500">Monto Total Recibido</span>
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-brand-900">${activeReceipt.amount.toLocaleString()}</p>
                                            <p className="text-[9px] text-slate-400 italic">Expresado en pesos argentinos</p>
                                        </div>
                                    </div>

                                    {/* Firmas */}
                                    <div className="grid grid-cols-2 gap-8 pt-8 text-center text-[10px] text-slate-400">
                                        <div className="border-t border-dashed pt-2">
                                            Firma Responsable Caja / Sello
                                        </div>
                                        <div className="border-t border-dashed pt-2">
                                            Tutor / Alumno Receptor
                                        </div>
                                    </div>

                                </div>

                                {/* Botonera de impresión */}
                                <div className="flex gap-4 mt-6">
                                    <button 
                                        onClick={() => setActiveReceipt(null)}
                                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition-all"
                                    >
                                        Volver
                                    </button>
                                    <button 
                                        onClick={handlePrintReceipt}
                                        className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                                    >
                                        <i className="fas fa-print"></i> Imprimir Recibo X
                                    </button>
                                </div>

                            </div>
                        </div>
                    )}

                    {/* --- FIN MODALES --- */}

                    {/* Footer Institucional */}
                    <footer className="bg-slate-900 text-slate-500 py-6 border-t border-slate-800 text-center text-xs mt-12 no-print">
                        <div className="max-w-7xl mx-auto px-4 space-y-2">
                            <p className="font-bold text-slate-400">© 2026 Instituto para el Desarrollo del Arte (IDeAr) - Misiones, Argentina</p>
                            <p>Sede Alem: Cataratas del Iguazú 912 | Sede San Javier | Sede Itacaruaré | Sede Cerro Azul</p>
                            <p className="text-[10px] text-slate-600">Desarrollado y estructurado según requerimientos y base de datos activa.</p>
                        </div>
                    </footer>

                    {/* --- CONTENEDOR ESPECIAL DE IMPRESIÓN SOLO PARA EL RECIBO --- */}
                    {activeReceipt && (
                        <div className="hidden print-only">
                            <div className="bg-white text-black p-8 font-sans" style={{ width: "100%", maxWidth: "800px", margin: "0 auto" }}>
                                <div style={{ border: "2px solid #ccc", padding: "20px", borderRadius: "10px" }}>
                                    <div style={{ display: "flex", justifyContent: "between", alignItems: "start", borderBottom: "1px solid #ccc", paddingBottom: "15px" }}>
                                        <div style={{ flexGrow: 1 }}>
                                            <h2 style={{ fontSize: "20px", fontWeight: "900", margin: "0 0 5px 0" }}>SILVA GRACIELA BEATRIZ</h2>
                                            <p style={{ fontSize: "11px", color: "#666", margin: "0" }}>Instituto Para el Desarrollo del Arte (IDeAr) | Reg. SPEPM N° 213/21</p>
                                            <p style={{ fontSize: "11px", color: "#666", margin: "0" }}>Cataratas Del Iguazú 912 - Leandro N. Alem - Misiones</p>
                                        </div>
                                        <div style={{ textAlign: "right" }}>
                                            <span style={{ background: "black", color: "white", padding: "5px 15px", fontWeight: "bold", fontSize: "12px", borderRadius: "4px" }}>RECIBO X</span>
                                            <p style={{ fontSize: "12px", fontWeight: "bold", margin: "5px 0 0 0" }}>N° {activeReceipt.receiptNo}</p>
                                            <p style={{ fontSize: "11px", color: "#888", margin: "0" }}>Fecha: {activeReceipt.date}</p>
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#555", padding: "10px 0", borderBottom: "1px solid #ccc" }}>
                                        <div>
                                            <p style={{ margin: "0 0 3px 0" }}>CUIT: 27-25496483-8</p>
                                            <p style={{ margin: "0" }}>Ingresos Brutos: 27-25496483-8</p>
                                        </div>
                                        <div style={{ textAlign: "right" }}>
                                            <p style={{ margin: "0 0 3px 0" }}>Monotributista Responsable</p>
                                            <p style={{ margin: "0", fontWeight: "bold" }}>Documento no válido como Factura</p>
                                        </div>
                                    </div>
                                    <div style={{ padding: "15px 0", borderBottom: "1px solid #ccc", fontSize: "13px" }}>
                                        <p style={{ margin: "0 0 5px 0" }}><strong>Estudiante:</strong> {activeReceipt.studentName}</p>
                                        <p style={{ margin: "0" }}><strong>DNI:</strong> {activeReceipt.studentId}</p>
                                    </div>
                                    <div style={{ padding: "15px 0", borderBottom: "1px solid #ccc" }}>
                                        <h3 style={{ fontSize: "12px", textTransform: "uppercase", color: "#666", margin: "0 0 10px 0" }}>Detalle del Servicio</h3>
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                                            <div>
                                                <p style={{ margin: "0", fontWeight: "bold" }}>{activeReceipt.concept}</p>
                                                <p style={{ margin: "3px 0 0 0", fontSize: "11px", color: "#666" }}>Período: {activeReceipt.period} | Vía {activeReceipt.method}</p>
                                            </div>
                                            <span style={{ fontWeight: "bold" }}>${activeReceipt.amount.toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "15px" }}>
                                        <span style={{ fontSize: "12px", fontWeight: "bold", textTransform: "uppercase" }}>Monto Recibido</span>
                                        <span style={{ fontSize: "22px", fontWeight: "900" }}>${activeReceipt.amount.toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "50px", fontSize: "11px" }}>
                                        <div style={{ borderTop: "1px dashed #000", width: "40%", textAlign: "center", paddingTop: "5px" }}>Firma Responsable Caja</div>
                                        <div style={{ borderTop: "1px dashed #000", width: "40%", textAlign: "center", paddingTop: "5px" }}>Firma Alumno / Tutor</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            );
        }

        // Renderizado

export default App;
