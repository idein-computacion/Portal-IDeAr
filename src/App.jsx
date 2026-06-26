import React, { useState, useEffect, useMemo } from 'react';
import { SEED_STUDENTS, SEED_PAYMENTS, SEED_ATTENDANCE, SEED_CONFIG, METODOS_PAGO, PERIODOS } from './data/seedData';
import { rtdb } from './config/firebase';
import { ref, set, get, remove, onValue, off } from 'firebase/database';
import DashboardRecibos from './components/DashboardRecibos';
import Config from './components/Config';
import PerfilProfesor from './components/PerfilProfesor';

const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
};

function App() {
            const [currentUser, setCurrentUser] = useState(() => {
                const saved = localStorage.getItem('idear_user');
                return saved ? JSON.parse(saved) : null;
            });
            const [globalSede, setGlobalSede] = useState(() => {
                return localStorage.getItem('idear_sede') || null;
            });
            const [tempSede, setTempSede] = useState(() => {
                return localStorage.getItem('idear_sede') || null;
            });
            const [users, setUsers] = useState([]); // Loaded only for admin console

            // Auth forms state
            const [isFirstTime, setIsFirstTime] = useState(false);
            const [hasAdmin, setHasAdmin] = useState(true);
            const [authDni, setAuthDni] = useState("");
            const [authPassword, setAuthPassword] = useState("");
            const [authNombre, setAuthNombre] = useState("");

            // Navegación
            const [currentTab, setCurrentTab] = useState("dashboard");

            // Estados del Negocio
            const [students, setStudents] = useState([]);
            const [payments, setPayments] = useState([]);
            const [attendance, setAttendance] = useState([]);
            const [configLevels, setConfigLevels] = useState([]);
            const [generalConfig, setGeneralConfig] = useState({ profesor: "" });
            const [sedes, setSedes] = useState([]);

            // UI feedback
            const [notifications, setNotifications] = useState([]);
            const [loading, setLoading] = useState(false);

            // Filtros de vistas
            const [studentSearch, setStudentSearch] = useState("");

            const [studentNivelFilter, setStudentNivelFilter] = useState("Todos");

            // Filtros de asistencias

            const [attendanceNivel, setAttendanceNivel] = useState("2do Preparatorio");
            const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
            const [tempAttendance, setTempAttendance] = useState({}); // studentId -> 'P' | 'A' | 'J'

            // Historial de asistencias visualización
            const [viewAttendanceDate, setViewAttendanceDate] = useState("");
            const [viewAttendanceSede, setViewAttendanceSede] = useState("Todas");

            // Selector de Alumnos Autocompletado / Buscar
            const [studentSelectSearch, setStudentSelectSearch] = useState("");
            const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);

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

            // Estado de conexión Firebase Realtime Database
            const [firebaseConnected, setFirebaseConnected] = useState(false);

            // --- NOTIFICACIONES PERSONALIZADAS ---
            const addNotification = (text, type = "success") => {
                const id = Date.now();
                setNotifications(prev => [...prev, { id, text, type }]);
                setTimeout(() => {
                    setNotifications(prev => prev.filter(n => n.id !== id));
                }, 4000);
            };

            // --- HELPER: Convierte un objeto de Firebase a array ---
            const fbObjectToArray = (data) => {
                if (!data) return [];
                return Object.keys(data).map(key => ({ id: key, ...data[key] }));
            };

            // --- GUARDAR LOCALMENTE SI CAMBIA (COMO BACKUP) ---
            const saveLocal = (key, data) => {
                localStorage.setItem(key, JSON.stringify(data));
            };

            // --- CONEXIÓN DE SEDES DINÁMICAS ---
            useEffect(() => {
                const sedesRef = ref(rtdb, 'sedes');
                const unsubSedes = onValue(sedesRef, (snapshot) => {
                    const data = snapshot.val();
                    if (data) {
                        const lista = Array.isArray(data) ? data : Object.values(data);
                        setSedes(lista);
                    } else {
                        // Sembramos las sedes por defecto si no existen en Firebase
                        const defaultSedes = [
                            { nombre: "Leandro N. Alem", prefix: "00002", base: 326 },
                            { nombre: "Cerro Azul", prefix: "00003", base: 1 },
                            { nombre: "Itacaruaré", prefix: "00004", base: 1 },
                            { nombre: "San Javier", prefix: "00005", base: 1 }
                        ];
                        set(sedesRef, defaultSedes);
                        setSedes(defaultSedes);
                    }
                }, (error) => {
                    console.error('Error leyendo sedes de Firebase:', error);
                    setSedes([
                        { nombre: "Leandro N. Alem", prefix: "00002", base: 326 },
                        { nombre: "Cerro Azul", prefix: "00003", base: 1 },
                        { nombre: "Itacaruaré", prefix: "00004", base: 1 },
                        { nombre: "San Javier", prefix: "00005", base: 1 }
                    ]);
                });
                return () => off(sedesRef, 'value', unsubSedes);
            }, []);

            // --- CONEXIÓN A FIREBASE REALTIME DATABASE ---
            // Suscripciones en tiempo real: cuando cambian los datos en Firebase,
            // se actualizan automáticamente en la UI.
            useEffect(() => {
                if (!globalSede) return;
                
                setLoading(true);

                const alumnosRef = ref(rtdb, 'alumnos');
                const pagosRef = ref(rtdb, 'pagos');
                const asistenciasRef = ref(rtdb, 'asistencias');

                // Listener de Alumnos
                const unsubAlumnos = onValue(alumnosRef, (snapshot) => {
                    const data = snapshot.val();
                    if (data) {
                        const lista = fbObjectToArray(data);
                        setStudents(lista.filter(s => s.sede === globalSede));
                        saveLocal('idear_students', lista);
                    } else {
                        // Si Firebase está vacío, sembramos con los datos iniciales
                        const seedObj = {};
                        SEED_STUDENTS.forEach(s => { seedObj[s.id] = s; });
                        set(alumnosRef, seedObj);
                        setStudents(SEED_STUDENTS.filter(s => s.sede === globalSede));
                    }
                }, (error) => {
                    console.error('Error leyendo alumnos:', error);
                    // Fallback a localStorage
                    const local = localStorage.getItem('idear_students');
                    if (local) setStudents(JSON.parse(local).filter(s => s.sede === globalSede));
                    else setStudents(SEED_STUDENTS.filter(s => s.sede === globalSede));
                });

                // Listener de Pagos
                const unsubPagos = onValue(pagosRef, (snapshot) => {
                    const data = snapshot.val();
                    if (data) {
                        const lista = fbObjectToArray(data);
                        setPayments(lista);
                        saveLocal('idear_payments', lista);
                    } else {
                        const seedObj = {};
                        SEED_PAYMENTS.forEach(p => { seedObj[p.id] = p; });
                        set(pagosRef, seedObj);
                    }
                }, (error) => {
                    console.error('Error leyendo pagos:', error);
                    const local = localStorage.getItem('idear_payments');
                    if (local) setPayments(JSON.parse(local));
                    else setPayments(SEED_PAYMENTS);
                });

                // Listener de Asistencias
                const unsubAsistencias = onValue(asistenciasRef, (snapshot) => {
                    const data = snapshot.val();
                    if (data) {
                        const lista = fbObjectToArray(data);
                        setAttendance(lista.filter(a => a.sede === globalSede));
                        saveLocal('idear_attendance', lista);
                    } else {
                        const seedObj = {};
                        SEED_ATTENDANCE.forEach(a => { seedObj[a.id] = a; });
                        set(asistenciasRef, seedObj);
                        setAttendance(SEED_ATTENDANCE.filter(a => a.sede === globalSede));
                    }
                }, (error) => {
                    console.error('Error leyendo asistencias:', error);
                    const local = localStorage.getItem('idear_attendance');
                    if (local) setAttendance(JSON.parse(local).filter(a => a.sede === globalSede));
                    else setAttendance(SEED_ATTENDANCE.filter(a => a.sede === globalSede));
                });

                // Listener de Configuración
                const safeSede = globalSede.replace(/\./g, '');
                const configRef = ref(rtdb, `config/${safeSede}`);
                const unsubConfig = onValue(configRef, (snapshot) => {
                    const data = snapshot.val();
                    if (data) {
                        const info = data.info || { profesor: "" };
                        setGeneralConfig(info);
                        
                        const lista = fbObjectToArray(data).filter(item => item.id !== 'info');
                        setConfigLevels(lista);
                        saveLocal('idear_config', lista);
                    } else {
                        const seedObj = { info: { profesor: "" } };
                        SEED_CONFIG.forEach((c, idx) => { seedObj[`config-${idx}`] = c; });
                        set(configRef, seedObj);
                        setGeneralConfig({ profesor: "" });
                    }
                }, (error) => {
                    console.error('Error leyendo config:', error);
                    const local = localStorage.getItem('idear_config');
                    if (local) setConfigLevels(JSON.parse(local));
                    else setConfigLevels(SEED_CONFIG.map((c, i) => ({ id: `config-${i}`, ...c })));
                });

                setFirebaseConnected(true);
                setLoading(false);

                // Cleanup: desuscribirse al desmontar
                return () => {
                    off(alumnosRef);
                    off(pagosRef);
                    off(asistenciasRef);
                    off(configRef);
                };
            }, [globalSede]);

            // Listener de usuarios en Firebase para el Administrador
            useEffect(() => {
                if (!currentUser || currentUser.sede !== "Leandro N. Alem") {
                    setUsers([]);
                    return;
                }
                const usuariosRef = ref(rtdb, 'usuarios');
                const unsubUsuarios = onValue(usuariosRef, (snapshot) => {
                    const data = snapshot.val();
                    if (data) {
                        const lista = Object.keys(data).map(key => ({ dni: key, ...data[key] }));
                        setUsers(lista);
                    } else {
                        setUsers([]);
                    }
                }, (error) => {
                    console.error("Error leyendo usuarios:", error);
                });
                return () => off(usuariosRef, 'value', unsubUsuarios);
            }, [currentUser]);

            // Efecto para comprobar por única vez si la sede Alem tiene cuenta administradora registrada
            useEffect(() => {
                if (tempSede === "Leandro N. Alem") {
                    const checkAdminExists = async () => {
                        try {
                            const snapshot = await get(ref(rtdb, 'usuarios'));
                            if (snapshot.exists()) {
                                const data = snapshot.val();
                                const usersList = Object.values(data);
                                const hasAlemAdmin = usersList.some(u => u.sede === "Leandro N. Alem");
                                setHasAdmin(hasAlemAdmin);
                            } else {
                                setHasAdmin(false);
                            }
                        } catch (err) {
                            console.error("Error comprobando existencia de administrador:", err);
                            setHasAdmin(true); // Fallback seguro
                        }
                    };
                    checkAdminExists();
                } else {
                    setHasAdmin(true);
                }
            }, [tempSede]);

            const handleAuthSubmit = async (e) => {
                e.preventDefault();
                const dni = authDni.trim();
                const password = authPassword;

                if (!dni || !password) {
                    addNotification("Por favor, completa todos los campos", "error");
                    return;
                }

                // "admin" es un usuario especial válido en todas las sedes; los profesores usan su DNI numérico
                if (dni !== "admin" && !/^\d+$/.test(dni)) {
                    addNotification("El DNI debe contener solo números", "error");
                    return;
                }

                setLoading(true);

                const isAlemAdminSetup = tempSede === "Leandro N. Alem" && !hasAdmin;

                try {
                    const userRef = ref(rtdb, `usuarios/${dni}`);
                    const snapshot = await get(userRef);

                    if (isAlemAdminSetup) {
                        const nombre = authNombre.trim();
                        if (!nombre) {
                            addNotification("Por favor, completa tu Nombre Completo", "error");
                            setLoading(false);
                            return;
                        }
                        const newUser = {
                            dni,
                            nombre,
                            password,
                            sede: "Leandro N. Alem"
                        };
                        await set(userRef, newUser);
                        setCurrentUser(newUser);
                        setGlobalSede("Leandro N. Alem");
                        localStorage.setItem('idear_user', JSON.stringify(newUser));
                        localStorage.setItem('idear_sede', "Leandro N. Alem");
                        addNotification("Cuenta Administrador Principal inicializada correctamente", "success");
                        setAuthDni("");
                        setAuthPassword("");
                        setAuthNombre("");
                        setHasAdmin(true);
                        setLoading(false);
                        return;
                    }

                    if (snapshot.exists()) {
                        const userData = snapshot.val();
                        if (userData.password === password) {
                            if (userData.sede === tempSede || userData.sede === "Leandro N. Alem") {
                                setCurrentUser(userData);
                                setGlobalSede(tempSede);
                                localStorage.setItem('idear_user', JSON.stringify(userData));
                                localStorage.setItem('idear_sede', tempSede);
                                addNotification(`¡Bienvenido, Prof. ${userData.nombre}!`, "success");
                                setAuthDni("");
                                setAuthPassword("");
                                setAuthNombre("");
                                setIsFirstTime(false);
                            } else {
                                addNotification(`Tu usuario está registrado para la sede "${userData.sede}". No tienes acceso a "${tempSede}".`, "error");
                            }
                        } else {
                            addNotification("Contraseña incorrecta", "error");
                        }
                    } else {
                        // Usuario no registrado — solo el admin puede crear cuentas
                        addNotification("DNI no registrado. Comunicate con el administrador para crear tu cuenta de acceso.", "error");
                    }
                } catch (err) {
                    console.error("Error en autenticación:", err);
                    addNotification("Error de conexión: " + err.message, "error");
                } finally {
                    setLoading(false);
                }
            };

            const handleLogout = () => {
                setCurrentUser(null);
                setGlobalSede(null);
                setTempSede(null);
                setIsFirstTime(false);
                setHasAdmin(true);
                localStorage.removeItem('idear_user');
                localStorage.removeItem('idear_sede');
                addNotification("Sesión cerrada correctamente", "info");
            };

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

                // Guardar en Firebase Realtime Database
                try {
                    await set(ref(rtdb, `alumnos/${studentData.id}`), studentData);
                } catch (err) {
                    addNotification("Error al guardar en nube: " + err.message, "error");
                }

                setShowStudentModal(false);
                setEditingStudent(null);
            };

            const handleToggleStudentStatus = async (id, activeStatus) => {
                const studentObj = students.find(s => s.id === id);
                if (!studentObj) return;

                const updatedStudent = { ...studentObj, active: activeStatus };

                // Actualización optimista de la UI
                const updatedList = students.map(s => s.id === id ? updatedStudent : s);
                setStudents(updatedList);
                saveLocal("idear_students", updatedList);

                try {
                    await set(ref(rtdb, `alumnos/${id}`), updatedStudent);
                    if (activeStatus) {
                        addNotification(`Alumno "${studentObj.name}" reincorporado con éxito`);
                    } else {
                        addNotification(`Alumno "${studentObj.name}" dado de baja (inactivo)`, "info");
                    }
                } catch (err) {
                    addNotification("Error al actualizar estado en la nube: " + err.message, "error");
                }
                
                if (!activeStatus && selectedStudentDetail?.id === id) {
                    setSelectedStudentDetail(null);
                }
            };

            // --- ACCIONES DE ASISTENCIAS ---
            // Cargar estado temporal para la combinación Sede + Nivel + Fecha elegidos
            useEffect(() => {
                const filtered = attendance.filter(a => a.date === attendanceDate && a.sede === globalSede && a.level === attendanceNivel);
                const temp = {};
                filtered.forEach(a => {
                    temp[a.studentId] = a.status;
                });
                setTempAttendance(temp);
            }, [attendanceDate, globalSede, attendanceNivel, attendance]);

            const studentsForAttendance = useMemo(() => {
                return students.filter(s => s.sede === globalSede && s.level === attendanceNivel && s.active);
            }, [students, globalSede, attendanceNivel]);

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
                        sede: globalSede,
                        status: status
                    };

                    updatedAttendance = updatedAttendance.filter(a => a.id !== recordId);
                    updatedAttendance.push(attRecord);
                    savedList.push(attRecord);
                }

                // Guardar en Firebase Realtime Database
                try {
                    const updates = {};
                    for (const rec of savedList) {
                        updates[`asistencias/${rec.id}`] = rec;
                    }
                    // Usamos set individualmente para cada registro
                    for (const rec of savedList) {
                        await set(ref(rtdb, `asistencias/${rec.id}`), rec);
                    }
                } catch (err) {
                    addNotification("Error guardando asistencias en Firebase", "error");
                }

                addNotification(`Asistencias de hoy guardadas para ${studentsForAttendance.length} alumnos`, "success");
            };

            // --- PROCESAMIENTO DE PAGOS ACTIVOS Y CONTADORES ---
            const activePayments = useMemo(() => {
                const activeStudentIds = new Set(students.map(s => s.id));
                return payments
                    .filter(p => activeStudentIds.has(p.studentId))
                    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.id || '').localeCompare(a.id || ''));
            }, [payments, students]);

            const placeholderReceipt = useMemo(() => {
                const config = sedes.find(s => s.nombre === globalSede) || { prefix: "00002", base: 1 };
                const nextSeq = config.base + activePayments.length;
                return `Ej: ${config.prefix}-${String(nextSeq).padStart(8, '0')}`;
            }, [globalSede, activePayments, sedes]);

            // --- ACCIONES DE PAGOS ---
            const suggestedAmount = useMemo(() => {
                const studentObj = students.find(s => s.id === newPayment.studentId);
                let levelConfig = null;
                
                if (studentObj) {
                    // Try to find exact match
                    levelConfig = configLevels.find(c => c.curso_nivel === studentObj.level);
                    // If not found, try finding by taller
                    if (!levelConfig) levelConfig = configLevels.find(c => c.curso_nivel === studentObj.taller);
                }

                if (newPayment.period === "Matrícula") return levelConfig?.inscripcion || 20000;
                if (newPayment.period === "Examen") return levelConfig?.examen || 45000;
                
                return levelConfig?.cuota || 25000;
            }, [newPayment.studentId, newPayment.period, configLevels, students]);

            // Actualizar monto sugerido al cambiar de estudiante o periodo
            useEffect(() => {
                setNewPayment(prev => ({
                    ...prev,
                    amount: suggestedAmount
                }));
            }, [newPayment.studentId, newPayment.period, suggestedAmount]);

            // Sincronizar attendanceNivel con el primer curso disponible cuando se carga la configuración
            useEffect(() => {
                if (configLevels.length > 0) {
                    const exists = configLevels.some(c => c.curso_nivel === attendanceNivel);
                    if (!exists) {
                        setAttendanceNivel(configLevels[0].curso_nivel);
                    }
                }
            }, [configLevels, attendanceNivel]);

            // Sincronizar input de texto del selector con el ID de alumno seleccionado
            // y calcular automáticamente el siguiente período, concepto y número de recibo.
            useEffect(() => {
                if (newPayment.studentId) {
                    const studentObj = students.find(s => s.id === newPayment.studentId);
                    if (studentObj) {
                        setStudentSelectSearch(studentObj.name);
                        
                        // 1. Calcular el siguiente mes de pago
                        const MONTHS_ORDER = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
                        const studentPayments = payments.filter(p => p.studentId === newPayment.studentId);
                        
                        // Obtener aranceles del nivel del alumno para verificar la suma de inscripción + cuota
                        const levelConfig = configLevels.find(c => c.curso_nivel === studentObj.level) 
                                            || configLevels.find(c => c.curso_nivel === studentObj.taller);
                        const valorInscripcion = levelConfig?.inscripcion || 20000;
                        const valorCuota = levelConfig?.cuota || 25000;
                        const sumaTotal = valorInscripcion + valorCuota;

                        let latestMonthIndex = -1;
                        studentPayments.forEach(p => {
                            // Considerar también si es un recibo de Matricula que cubre la cuota del mes correspondiente
                            const conceptLower = (p.concept || "").toLowerCase();
                            const isCombinedPayment = conceptLower.includes("inscrip") && 
                                (conceptLower.includes("1ra cuota") || 
                                 conceptLower.includes("1° cuota") || 
                                 conceptLower.includes("1ra. cuota") || 
                                 conceptLower.includes("primera cuota") || 
                                 conceptLower.includes("1ª cuota"));
                                 
                            if (isCombinedPayment && p.amount >= sumaTotal) {
                                if (p.date && p.date.includes("-")) {
                                    const parts = p.date.split("-");
                                    const monthNum = parseInt(parts[1], 10);
                                    if (monthNum >= 1 && monthNum <= 12) {
                                        const dateMonth = MONTHS_ORDER[monthNum - 1];
                                        const idxDate = MONTHS_ORDER.indexOf(dateMonth);
                                        if (idxDate > latestMonthIndex) {
                                            latestMonthIndex = idxDate;
                                        }
                                    }
                                }
                            }

                            const idx = MONTHS_ORDER.indexOf(p.period);
                            if (idx > latestMonthIndex) {
                                latestMonthIndex = idx;
                            }
                        });
                        
                        const nextPeriod = latestMonthIndex !== -1 && latestMonthIndex < MONTHS_ORDER.length - 1 
                            ? MONTHS_ORDER[latestMonthIndex + 1] 
                            : "Marzo"; // Mes de inicio por defecto
                        
                        // 2. Calcular número de recibo según el contador de la sede
                        const config = sedes.find(s => s.nombre === globalSede) || { prefix: "00002", base: 1 };
                        const nextSeq = config.base + activePayments.length;
                        const generatedReceiptNo = `${config.prefix}-${String(nextSeq).padStart(8, '0')}`;
                        
                        setNewPayment(prev => ({
                            ...prev,
                            period: nextPeriod,
                            concept: `Cuota de ${nextPeriod}`,
                            receiptNo: generatedReceiptNo
                        }));
                    }
                } else {
                    setStudentSelectSearch("");
                    setNewPayment(prev => ({
                        ...prev,
                        receiptNo: ""
                    }));
                }
            }, [newPayment.studentId, students, payments, globalSede, activePayments.length, configLevels, sedes]);

            // Limpiar selección de alumno al cambiar de sede
            useEffect(() => {
                setNewPayment(prev => ({ ...prev, studentId: "" }));
                setStudentSelectSearch("");
            }, [globalSede]);

            const handleRegisterPayment = async (e) => {
                e.preventDefault();
                if (!newPayment.studentId) {
                    addNotification("Debes seleccionar un alumno", "error");
                    return;
                }

                const selectedStudent = students.find(s => s.id === newPayment.studentId);
                const paymentId = "pay-" + Date.now();
                const config = sedes.find(s => s.nombre === globalSede) || { prefix: "00002", base: 1 };
                const nextSeq = config.base + activePayments.length;
                const receiptNo = newPayment.receiptNo || `${config.prefix}-${String(nextSeq).padStart(8, '0')}`;
                
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

                // Guardar en Firebase Realtime Database
                try {
                    await set(ref(rtdb, `pagos/${paymentId}`), paymentRecord);
                } catch (err) {
                    addNotification("Error guardando pago en Firebase", "error");
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
                setStudentSelectSearch("");
            };

            const handleDeletePayment = async (id) => {
                try {
                    await remove(ref(rtdb, `pagos/${id}`));
                } catch (err) {
                    addNotification("Error al eliminar pago en nube", "error");
                }
                addNotification("Pago eliminado", "info");
            };

            // --- FILTROS DE ALUMNOS COMPUTADOS ---
            const filteredStudents = useMemo(() => {
                return students.filter(s => {
                    const matchesSearch = s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.dni.includes(studentSearch);
                    
                    const matchesNivel = studentNivelFilter === "Todos" || s.level === studentNivelFilter;
                    return matchesSearch && matchesNivel;
                }).sort((a, b) => {
                    if (a.level !== b.level) return (a.level || '').localeCompare(b.level || '');
                    return (a.name || '').localeCompare(b.name || '');
                });
            }, [students, studentSearch, globalSede, studentNivelFilter]);
            // --- FILTROS DE PAGOS COMPUTADOS ---
            const filteredPayments = useMemo(() => {
                let basePayments = activePayments;
                if (newPayment.studentId) {
                    basePayments = activePayments.filter(p => p.studentId === newPayment.studentId);
                }
                return basePayments.filter(p => {
                    const term = paymentFilter.toLowerCase();
                    return p.studentName.toLowerCase().includes(term) || p.period.toLowerCase().includes(term) || p.concept.toLowerCase().includes(term) || p.method.toLowerCase().includes(term);
                });
            }, [activePayments, paymentFilter, newPayment.studentId]);

            // --- ESTADÍSTICAS DEL DASHBOARD ---
            const stats = useMemo(() => {
                const totalAlumnos = students.filter(s => s.active).length;
                
                // Recaudación mensual actual (supongamos mes actual en curso, ej: Junio 2026 en base a fecha sistema)
                const currentMonthString = "Mayo"; // Basado en el registro mayoritario de la planilla
                const totalRecaudadoMes = activePayments
                    .filter(p => p.period === currentMonthString)
                    .reduce((sum, p) => sum + p.amount, 0);

                // Tasa de asistencia promedio histórica
                const totalAssists = attendance.length;
                const totalPresents = attendance.filter(a => a.status === "P").length;
                const assistRate = totalAssists > 0 ? Math.round((totalPresents / totalAssists) * 100) : 0;

                // Alumnos con deuda (no tienen pago registrado para el mes actual, por ejemplo "Mayo")
                const paidThisMonthStudentIds = new Set(activePayments.filter(p => p.period === "Mayo").map(p => p.studentId));
                const deudores = students.filter(s => s.active && !paidThisMonthStudentIds.has(s.id));

                return {
                    totalAlumnos,
                    totalRecaudadoMes,
                    assistRate,
                    totalDeudores: deudores.length,
                    deudoresList: deudores.slice(0, 5) // top deudores para alerta
                };
            }, [students, activePayments, attendance]);

            // Perfil del profesor registrado para la sede actual (usado cuando el admin ingresa a una sede)
            const sedeProfesor = useMemo(() => {
                if (!currentUser || currentUser.dni !== 'admin') return null;
                // Buscar el profesor registrado para la sede actual (excluye al admin)
                return users.find(u => u.sede === globalSede && u.dni !== 'admin') || null;
            }, [currentUser, users, globalSede]);

            // Datos para el gráfico dinámico de barras de ingresos por mes
            const chartData = useMemo(() => {
                const months = ["Marzo", "Abril", "Mayo", "Junio"];
                return months.map(m => {
                    const total = activePayments.filter(p => p.period === m).reduce((sum, p) => sum + p.amount, 0);
                    return { month: m, total };
                });
            }, [activePayments]);

            // --- ESTADÍSTICAS DE UN ALUMNO EN PARTICULAR ---
            const activeStudentStats = useMemo(() => {
                if (!selectedStudentDetail) return null;
                const sId = selectedStudentDetail.id;
                
                const sPayments = activePayments.filter(p => p.studentId === sId);
                const sAttendance = attendance.filter(a => a.studentId === sId);

                const totalClasses = sAttendance.length;
                const presents = sAttendance.filter(a => a.status === "P").length;
                const excused = sAttendance.filter(a => a.status === "J").length;
                const absents = sAttendance.filter(a => a.status === "A").length;
                
                const attendanceRate = totalClasses > 0 ? Math.round((presents / totalClasses) * 100) : 100;

                // Obtener los períodos pagados, imputando el mes de la fecha del recibo si es un pago de Matricula combinada
                const MONTHS_ORDER = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
                const levelConfig = configLevels.find(c => c.curso_nivel === selectedStudentDetail.level) 
                                    || configLevels.find(c => c.curso_nivel === selectedStudentDetail.taller);
                const valorInscripcion = levelConfig?.inscripcion || 20000;
                const valorCuota = levelConfig?.cuota || 25000;
                const sumaTotal = valorInscripcion + valorCuota;

                const paidPeriods = [];
                sPayments.forEach(p => {
                    if (p.period && !paidPeriods.includes(p.period)) {
                        paidPeriods.push(p.period);
                    }
                    
                    // Si el recibo tiene inscripción y primera cuota y cubre el monto total
                    const conceptLower = (p.concept || "").toLowerCase();
                    const isCombinedPayment = conceptLower.includes("inscrip") && 
                        (conceptLower.includes("1ra cuota") || 
                         conceptLower.includes("1° cuota") || 
                         conceptLower.includes("1ra. cuota") || 
                         conceptLower.includes("primera cuota") || 
                         conceptLower.includes("1ª cuota"));
                         
                    if (isCombinedPayment && p.amount >= sumaTotal) {
                        if (p.date && p.date.includes("-")) {
                            const parts = p.date.split("-");
                            const monthNum = parseInt(parts[1], 10);
                            if (monthNum >= 1 && monthNum <= 12) {
                                const dateMonth = MONTHS_ORDER[monthNum - 1];
                                if (!paidPeriods.includes(dateMonth)) {
                                    paidPeriods.push(dateMonth);
                                }
                            }
                        }
                    }
                });

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
            }, [selectedStudentDetail, activePayments, attendance, configLevels]);

            const handlePrintReceipt = () => {
                window.print();
            };

            if (!globalSede) {
                if (tempSede) {
                    return (
                        <div className="min-h-screen bg-gradient-to-br from-black via-orange-600 to-yellow-500 flex flex-col items-center justify-center p-4 animate-fadeIn">
                            <div className="w-48 h-auto mb-8">
                                <img src="/logo.png" alt="Logo IDeAr" className="w-full h-auto object-contain drop-shadow-lg" />
                            </div>
                            
                            <div className="bg-white/95 backdrop-blur-md p-8 sm:p-10 rounded-[2.5rem] shadow-2xl border border-stone-200/50 max-w-md w-full relative overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-500 to-yellow-500"></div>
                                
                                <div className="flex items-center gap-2 mb-6">
                                    <button 
                                        onClick={() => { setTempSede(null); setAuthDni(""); setAuthPassword(""); setAuthNombre(""); setIsFirstTime(false); }}
                                        className="text-stone-400 hover:text-stone-700 transition-colors flex items-center gap-1 text-sm font-bold bg-transparent border-0 cursor-pointer"
                                    >
                                        <i className="fas fa-arrow-left"></i> Volver a Sedes
                                    </button>
                                </div>

                                <div className="text-center mb-6">
                                    <span className="bg-orange-50 text-orange-700 text-xs px-3 py-1.5 rounded-full font-black uppercase tracking-wider mb-2 inline-block">
                                        Sede: {tempSede}
                                    </span>
                                    <h2 className="text-2xl font-extrabold text-stone-855 mt-1">
                                        {tempSede === "Leandro N. Alem" && !hasAdmin 
                                            ? "Definir Acceso Administrador (Por única vez)" 
                                            : "Acceso a la Sede"}
                                    </h2>
                                    <p className="text-xs text-stone-500 mt-1">
                                        {tempSede === "Leandro N. Alem" && !hasAdmin
                                            ? "No se ha configurado ningún administrador para Leandro N. Alem. Define el DNI, Nombre y Contraseña principal."
                                            : "Introduce tu usuario y contraseña personal de acceso."}
                                    </p>
                                </div>

                                <form onSubmit={handleAuthSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-stone-500 uppercase mb-2">
                                            {authDni === "admin" ? "Usuario Administrador" : "Usuario (DNI)"}
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                                                <i className={authDni === "admin" ? "fas fa-user-shield" : "fas fa-id-card"}></i>
                                            </span>
                                            <input 
                                                type="text"
                                                placeholder="DNI o usuario admin"
                                                value={authDni}
                                                onChange={(e) => {
                                                    setAuthDni(e.target.value);
                                                    setIsFirstTime(false);
                                                }}
                                                className="w-full pl-11 pr-4 py-3 rounded-xl border border-stone-200 outline-none bg-stone-50/50 font-semibold focus:ring-2 focus:ring-orange-500 transition-all text-stone-855"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {(tempSede === "Leandro N. Alem" && !hasAdmin) && (
                                        <div>
                                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Nombre Completo</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                                                    <i className="fas fa-user"></i>
                                                </span>
                                                <input 
                                                    type="text"
                                                    placeholder="Nombre y Apellido"
                                                    value={authNombre}
                                                    onChange={(e) => setAuthNombre(e.target.value)}
                                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-stone-200 outline-none bg-stone-50/50 font-semibold focus:ring-2 focus:ring-orange-500 transition-all text-stone-855"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Contraseña</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                                                <i className="fas fa-key"></i>
                                            </span>
                                            <input 
                                                type="password"
                                                placeholder="Escribe tu contraseña"
                                                value={authPassword}
                                                onChange={(e) => setAuthPassword(e.target.value)}
                                                className="w-full pl-11 pr-4 py-3 rounded-xl border border-stone-200 outline-none bg-stone-50/50 font-semibold focus:ring-2 focus:ring-orange-500 transition-all text-stone-855"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <button 
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer mt-6 border-0"
                                    >
                                        {loading ? (
                                            <>
                                                <i className="fas fa-spinner fa-spin"></i> Procesando...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-sign-in-alt"></i> 
                                                {tempSede === "Leandro N. Alem" && !hasAdmin 
                                                    ? "Registrar Administrador Principal" 
                                                    : `Acceder a ${tempSede}`}
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>
                        </div>
                    );
                }

                return (
                    <div className="min-h-screen bg-gradient-to-br from-black via-orange-600 to-yellow-500 flex flex-col items-center justify-center p-4 animate-fadeIn">
                        <div className="w-48 h-auto mb-10">
                            <img src="/logo.png" alt="Logo IDeAr" className="w-full h-auto object-contain drop-shadow-lg" />
                        </div>
                        <div className="bg-white p-8 sm:p-10 rounded-[2rem] shadow-2xl border border-stone-100 max-w-2xl w-full text-center">
                            <h2 className="text-3xl font-extrabold text-stone-800 mb-3">Bienvenido al Portal IDeAr</h2>
                            <p className="text-stone-500 mb-10 text-lg">Selecciona tu sede para ingresar y gestionar de forma segura.</p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {sedes.map(sede => (
                                    <button 
                                        key={sede.nombre}
                                        onClick={() => {
                                            if (currentUser) {
                                                if (currentUser.sede === sede.nombre || currentUser.sede === "Leandro N. Alem") {
                                                    setGlobalSede(sede.nombre);
                                                    localStorage.setItem('idear_sede', sede.nombre);
                                                } else {
                                                    addNotification(`Tu usuario está registrado para la sede "${currentUser.sede}". No tienes acceso a "${sede.nombre}".`, "error");
                                                }
                                            } else {
                                                setTempSede(sede.nombre);
                                            }
                                        }}
                                        className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-black py-6 px-6 rounded-2xl shadow-xl shadow-orange-500/20 transition-all transform hover:-translate-y-1 hover:scale-105 text-xl flex flex-col items-center gap-3 border-0 cursor-pointer"
                                    >
                                        <i className="fas fa-map-marker-alt text-3xl opacity-80"></i> 
                                        {sede.nombre}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            }

            return (
                <div className="min-h-screen flex flex-col justify-between">
                    {/* Notificaciones flotantes */}
                    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 no-print">
                        {notifications.map(n => (
                            <div key={n.id} className={`p-4 rounded-xl shadow-lg border text-sm flex items-center gap-3 transition-all transform transtone-y-0 duration-300 ${
                                n.type === 'success' ? 'bg-orange-50 border-orange-200 text-orange-800' :
                                n.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-blue-50 border-blue-200 text-blue-800'
                            }`}>
                                <i className={`fas ${n.type === 'success' ? 'fa-check-circle' : n.type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}`}></i>
                                <span>{n.text}</span>
                            </div>
                        ))}
                    </div>

                    {/* Header Principal */}
                    <header className="bg-gradient-to-r from-black to-stone-900 text-white shadow-xl no-print">
                        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
                            {/* Logo + Título */}
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-14 sm:w-20 h-auto flex-shrink-0">
                                    <img src="/logo.png" alt="Logo IDeAr" className="w-full h-auto object-contain drop-shadow-md" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <h1 className="text-base sm:text-xl font-extrabold tracking-tight truncate">Portal IDeAr</h1>
                                        <span className="text-[10px] bg-amber-800 text-amber-200 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">v2.1</span>
                                    </div>
                                    {currentUser && (
                                        <p className="text-[10px] text-orange-300 font-semibold truncate">
                                            {currentUser.nombre} · <span className="text-stone-400">{globalSede}</span>
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Acciones */}
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                {currentUser && currentUser.sede === "Leandro N. Alem" && (
                                    <button
                                        onClick={() => { setGlobalSede(null); localStorage.removeItem('idear_sede'); }}
                                        className="bg-white/10 hover:bg-white/20 text-white text-xs px-2.5 py-2 rounded-xl font-medium transition-all cursor-pointer border-0 flex items-center gap-1"
                                        title="Cambiar de Sede"
                                    >
                                        <i className="fas fa-network-wired"></i>
                                        <span className="hidden sm:inline">Sedes</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => setCurrentTab("config")}
                                    className={`text-white text-xs px-2.5 py-2 rounded-xl font-medium transition-all cursor-pointer border-0 flex items-center gap-1 ${
                                        currentTab === "config" ? "bg-amber-600" : "bg-white/10 hover:bg-white/20"
                                    }`}
                                >
                                    <i className="fas fa-cog"></i>
                                    <span className="hidden sm:inline">Config</span>
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="bg-rose-600/80 hover:bg-rose-600 text-white text-xs px-2.5 py-2 rounded-xl font-medium transition-all cursor-pointer border-0 flex items-center gap-1"
                                >
                                    <i className="fas fa-sign-out-alt"></i>
                                    <span className="hidden sm:inline">Salir</span>
                                </button>
                            </div>
                        </div>

                        {/* Sede badge en mobile */}
                        <div className="px-4 pb-2 sm:hidden">
                            <span className="text-[10px] text-stone-500">Reg. SPEPM 213/21 · {globalSede}</span>
                        </div>
                    </header>


                    {/* ── Navegación Desktop: pestañas arriba ── */}
                    <nav className="hidden sm:block bg-white border-b border-stone-200 shadow-sm sticky top-0 z-40 no-print">
                        <div className="max-w-7xl mx-auto px-4 overflow-x-auto flex space-x-1 sm:space-x-4">
                            {[
                                { id: "dashboard",   icon: "fa-chart-pie",            label: "Panel" },
                                { id: "asistencias", icon: "fa-calendar-check",       label: "Asistencia" },
                                { id: "pagos",       icon: "fa-file-invoice-dollar",  label: "Cobros" },
                                { id: "alumnos",     icon: "fa-user-graduate",         label: "Alumnos" },
                                { id: "perfil",      icon: "fa-user-circle",           label: "Mi Perfil" },
                            ].map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setCurrentTab(t.id)}
                                    className={`py-4 px-3 sm:px-5 border-b-2 font-semibold text-sm transition-all whitespace-nowrap flex items-center gap-2 ${
                                        currentTab === t.id ? "border-amber-500 text-amber-600" : "border-transparent text-stone-500 hover:text-stone-800"
                                    }`}
                                >
                                    <i className={`fas ${t.icon}`}></i> {t.label}
                                </button>
                            ))}
                        </div>
                    </nav>

                    {/* ── Navegación Mobile: barra fija abajo ── */}
                    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-stone-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] no-print safe-area-bottom">
                        <div className="grid grid-cols-5 h-16">
                            {[
                                { id: "dashboard",   icon: "fa-chart-pie",           label: "Panel" },
                                { id: "asistencias", icon: "fa-calendar-check",      label: "Asistencia" },
                                { id: "pagos",       icon: "fa-dollar-sign",          label: "Cobros" },
                                { id: "alumnos",     icon: "fa-users",                label: "Alumnos" },
                                { id: "perfil",      icon: "fa-user-circle",          label: "Perfil" },
                            ].map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setCurrentTab(t.id)}
                                    className={`flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 border-0 cursor-pointer ${
                                        currentTab === t.id
                                            ? "text-amber-600"
                                            : "text-stone-400"
                                    }`}
                                >
                                    {currentTab === t.id && (
                                        <span className="absolute top-0 w-10 h-0.5 bg-amber-500 rounded-full -translate-y-full"></span>
                                    )}
                                    <i className={`fas ${t.icon} text-xl`}></i>
                                    <span className="text-[10px] font-bold">{t.label}</span>
                                </button>
                            ))}
                        </div>
                    </nav>

                    {/* Contenedor Principal */}
                    <main className="flex-grow max-w-7xl w-full mx-auto px-4 py-6 sm:py-8 sm:px-6 lg:px-8 pb-24 sm:pb-8 no-print">
                        
                        {/* 1. SECCIÓN DASHBOARD */}
                        {currentTab === "dashboard" && (
                            <div className="space-y-8 animate-fadeIn">
                                {/* Encabezado */}
                                <div className="bg-gradient-to-r from-black via-orange-600 to-yellow-500 text-white rounded-3xl p-6 md:p-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                                    <div 
                                        className="absolute inset-0 z-0 opacity-100 mix-blend-overlay pointer-events-none"
                                        style={{
                                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cpath fill='rgba(255,255,255,0.1)' d='M35,15h10v5h5v5h5v10h10v10h-10v10h-5v5h-5v5h-10v-5h-5v-5h-5v-10h-10v-10h10v-10h5v-5h5v-5z M35,30v5h-5v10h5v5h10v-5h5v-10h-5v-5h-10z M-5,-10h10v5h5v10h-5v5h-10v-5h-5v-10h5v-5z M75,-10h10v5h5v10h-5v5h-10v-5h-5v-10h5v-5z M-5,70h10v5h5v10h-5v5h-10v-5h-5v-10h5v-5z M75,70h10v5h5v10h-5v5h-10v-5h-5v-10h5v-5z'/%3E%3C/svg%3E")`,
                                            backgroundSize: '80px 80px'
                                        }}
                                    ></div>
                                    <div className="space-y-2 text-center md:text-left relative z-10">
                                        <h2 className="text-3xl font-extrabold drop-shadow-md">¡Hola, Administrador!</h2>
                                        <p className="text-orange-100 max-w-md drop-shadow">Bienvenido al centro integral de operaciones del Instituto IDeAr. Aquí tienes un vistazo de hoy.</p>
                                    </div>
                                    <div className="flex items-center gap-6 relative z-10">
                                        <div className="bg-white/10 p-4 rounded-2xl text-center backdrop-blur-sm min-w-[100px] border border-white/10">
                                            <p className="text-xs text-orange-200 font-medium">Alumnos Activos</p>
                                            <p className="text-3xl font-bold">{stats.totalAlumnos}</p>
                                        </div>
                                        <div className="bg-white/10 p-4 rounded-2xl text-center backdrop-blur-sm min-w-[100px]">
                                            <p className="text-xs text-orange-200">Asistencia Hoy</p>
                                            <p className="text-3xl font-bold">{stats.assistRate}%</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Tarjetas de Indicadores */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl">
                                            <i className="fas fa-users"></i>
                                        </div>
                                        <div>
                                            <p className="text-xs text-stone-400 font-semibold uppercase">Matrícula Activa</p>
                                            <p className="text-2xl font-bold text-stone-800">{stats.totalAlumnos} alumnos</p>
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center text-xl">
                                            <i className="fas fa-hand-holding-dollar"></i>
                                        </div>
                                        <div>
                                            <p className="text-xs text-stone-400 font-semibold uppercase">Cobrado Mayo</p>
                                            <p className="text-2xl font-bold text-orange-600">${stats.totalRecaudadoMes.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl">
                                            <i className="fas fa-clock"></i>
                                        </div>
                                        <div>
                                            <p className="text-xs text-stone-400 font-semibold uppercase">Tasa Presentismo</p>
                                            <p className="text-2xl font-bold text-amber-600">{stats.assistRate}%</p>
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl">
                                            <i className="fas fa-exclamation-triangle"></i>
                                        </div>
                                        <div>
                                            <p className="text-xs text-stone-400 font-semibold uppercase">Cuotas Pendientes Mayo</p>
                                            <p className="text-2xl font-bold text-rose-600">{stats.totalDeudores} alumnos</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Gráfico e Historial */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    
                                    {/* Gráfico de recaudación SVG */}
                                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 lg:col-span-2">
                                        <h3 className="text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
                                            <i className="fas fa-chart-line text-amber-500"></i> Recaudaciones por Período
                                        </h3>
                                        <div className="h-64 flex items-end justify-between gap-4 pt-6 px-4">
                                            {chartData.map(item => {
                                                const maxVal = Math.max(...chartData.map(c => c.total), 1);
                                                const heightPercent = Math.min(100, Math.round((item.total / maxVal) * 100));
                                                return (
                                                    <div key={item.month} className="flex-1 flex flex-col items-center gap-2 group">
                                                        <span className="text-xs font-semibold text-stone-500 opacity-0 group-hover:opacity-100 transition-opacity bg-stone-800 text-white px-2 py-1 rounded shadow-sm">
                                                            ${item.total.toLocaleString()}
                                                        </span>
                                                        <div 
                                                            style={{ height: `${Math.max(10, heightPercent)}%` }} 
                                                            className="w-full bg-amber-500 hover:bg-amber-600 rounded-t-xl transition-all duration-500 shadow-md flex items-end justify-center"
                                                        >
                                                            <span className="text-[10px] text-white font-bold mb-2 hidden md:inline">
                                                                {heightPercent > 20 ? `$${item.total / 1000}k` : ''}
                                                            </span>
                                                        </div>
                                                        <span className="text-xs font-bold text-stone-600">{item.month}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Alertador de deudores */}
                                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                                                <i className="fas fa-bell text-rose-500"></i> Alerta de Cuotas
                                            </h3>
                                            <span className="text-xs bg-rose-50 text-rose-700 px-2 py-1 rounded-full font-bold">Mayo</span>
                                        </div>

                                        <div className="divide-y divide-stone-100">
                                            {stats.deudoresList.length === 0 ? (
                                                <div className="text-center py-8 text-stone-400">
                                                    <i className="fas fa-check-circle text-orange-500 text-3xl mb-2"></i>
                                                    <p className="text-sm font-medium">¡Todos al día en Mayo!</p>
                                                </div>
                                            ) : (
                                                stats.deudoresList.map(std => (
                                                    <div key={std.id} className="py-3 flex items-center justify-between">
                                                        <div>
                                                            <p className="text-sm font-semibold text-stone-800">{std.name}</p>
                                                            <p className="text-xs text-stone-400">{std.sede} | {std.level}</p>
                                                        </div>
                                                        <button 
                                                            onClick={() => {
                                                                setNewPayment(prev => ({ ...prev, studentId: std.id, period: "Mayo" }));
                                                                setCurrentTab("pagos");
                                                            }}
                                                            className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 px-2 py-1.5 rounded-lg font-bold transition-all"
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
                                <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
                                    <h3 className="text-xl font-bold text-stone-800 mb-6 flex items-center gap-2">
                                        <i className="fas fa-calendar-alt text-amber-500"></i> Tomar Asistencia Diaria
                                    </h3>

                                    {/* Selector de Filtros */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

                                        <div>
                                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Nivel</label>
                                            <select 
                                                value={attendanceNivel} 
                                                onChange={(e) => setAttendanceNivel(e.target.value)}
                                                className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-stone-50 font-medium"
                                            >
                                                {configLevels.map(c => <option key={c.id} value={c.curso_nivel}>{c.curso_nivel}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Fecha de Clase</label>
                                            <input 
                                                type="date" 
                                                value={attendanceDate}
                                                onChange={(e) => setAttendanceDate(e.target.value)}
                                                className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-stone-50 font-medium"
                                            />
                                        </div>
                                    </div>

                                    {/* Atajos Rápidos */}
                                    <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-t border-b border-stone-100 mb-6">
                                        <div className="text-sm font-semibold text-stone-600">
                                            Alumnos en este curso: <span className="text-amber-600 font-bold">{studentsForAttendance.length}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => markAllAttendance("P")}
                                                className="bg-orange-50 hover:bg-orange-100 text-orange-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
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
                                        <div className="text-center py-12 text-stone-400">
                                            <i className="fas fa-graduation-cap text-4xl mb-3"></i>
                                            <p className="font-medium">No hay alumnos registrados en esta sede y nivel</p>
                                            <button 
                                                onClick={() => {
                                                    setEditingStudent(null);
                                                    setShowStudentModal(true);
                                                }}
                                                className="mt-4 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all inline-flex items-center gap-2"
                                            >
                                                <i className="fas fa-plus"></i> Añadir Alumno
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="hidden sm:grid grid-cols-12 gap-4 px-4 text-xs font-bold text-stone-400 uppercase">
                                                <div className="col-span-6">Alumno / DNI</div>
                                                <div className="col-span-6 text-right">Estado de Asistencia</div>
                                            </div>

                                            <div className="divide-y divide-stone-100">
                                                {studentsForAttendance.map(student => {
                                                    const currentStatus = tempAttendance[student.id] || "P";
                                                    return (
                                                        <div key={student.id} className="py-3 px-2 hover:bg-stone-50/80 rounded-xl transition-colors">
                                                            <p className="font-bold text-stone-800 mb-2">{student.name}</p>
                                                            <div className="grid grid-cols-3 gap-2">
                                                                <button
                                                                    onClick={() => handleToggleAttendance(student.id, "P")}
                                                                    className={`py-3 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                                                                        currentStatus === "P"
                                                                        ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30"
                                                                        : "bg-stone-100 text-stone-500"
                                                                    }`}
                                                                >
                                                                    <i className="fas fa-check"></i> P
                                                                </button>
                                                                <button
                                                                    onClick={() => handleToggleAttendance(student.id, "A")}
                                                                    className={`py-3 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                                                                        currentStatus === "A"
                                                                        ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30"
                                                                        : "bg-stone-100 text-stone-500"
                                                                    }`}
                                                                >
                                                                    <i className="fas fa-times"></i> A
                                                                </button>
                                                                <button
                                                                    onClick={() => handleToggleAttendance(student.id, "J")}
                                                                    className={`py-3 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                                                                        currentStatus === "J"
                                                                        ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30"
                                                                        : "bg-stone-100 text-stone-500"
                                                                    }`}
                                                                >
                                                                    <i className="fas fa-question"></i> J
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <div className="pt-6 flex justify-end">
                                                <button 
                                                    onClick={handleSaveAttendance}
                                                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-amber-600/10 flex items-center gap-2 w-full justify-center active:scale-95 text-base"
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
                                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 lg:col-span-1">
                                        <h3 className="text-lg font-bold text-stone-800 mb-6 flex items-center gap-2">
                                            <i className="fas fa-cash-register text-amber-500"></i> Nuevo Pago / Cobro
                                        </h3>

                                        <form onSubmit={handleRegisterPayment} className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Seleccionar Alumno</label>
                                                <div className="relative">
                                                    <input 
                                                        type="text"
                                                        placeholder="Escribe para buscar alumno..."
                                                        value={studentSelectSearch}
                                                        onChange={(e) => {
                                                            setStudentSelectSearch(e.target.value);
                                                            setIsStudentDropdownOpen(true);
                                                            setNewPayment(prev => ({ ...prev, studentId: "" }));
                                                        }}
                                                        onFocus={() => setIsStudentDropdownOpen(true)}
                                                        onBlur={() => {
                                                            setTimeout(() => setIsStudentDropdownOpen(false), 200);
                                                        }}
                                                        className="w-full p-3 rounded-xl border border-stone-200 outline-none bg-stone-50 font-semibold focus:ring-2 focus:ring-amber-500"
                                                        required={!newPayment.studentId}
                                                    />
                                                    {newPayment.studentId && (
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-xs bg-emerald-50 px-2.5 py-1 rounded-lg flex items-center gap-1">
                                                            <i className="fas fa-check-circle"></i> Seleccionado
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                {isStudentDropdownOpen && (
                                                    <div className="absolute z-50 w-full mt-1 bg-white border border-stone-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                                        {students
                                                            .filter(s => s.active)
                                                            .filter(s => s.name.toLowerCase().includes(studentSelectSearch.toLowerCase()) || s.dni.includes(studentSelectSearch))
                                                            .length === 0 ? (
                                                                <div className="p-3 text-sm text-stone-400 text-center">No se encontraron alumnos</div>
                                                            ) : (
                                                                students
                                                                    .filter(s => s.active)
                                                                    .filter(s => s.name.toLowerCase().includes(studentSelectSearch.toLowerCase()) || s.dni.includes(studentSelectSearch))
                                                                    .map(s => (
                                                                        <button
                                                                            key={s.id}
                                                                            type="button"
                                                                            onMouseDown={() => {
                                                                                setNewPayment(prev => ({ ...prev, studentId: s.id }));
                                                                                setStudentSelectSearch(s.name);
                                                                                setIsStudentDropdownOpen(false);
                                                                            }}
                                                                            className="w-full text-left p-3 hover:bg-stone-50 text-sm font-semibold text-stone-700 transition-colors border-b border-stone-50 last:border-0"
                                                                        >
                                                                            {s.name} <span className="text-xs text-stone-400 font-normal">({s.level})</span>
                                                                        </button>
                                                                    ))
                                                            )
                                                        }
                                                    </div>
                                                )}
                                            </div>

                                             <div className="grid grid-cols-1 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Período / Cuota</label>
                                                    <select 
                                                        value={newPayment.period}
                                                        onChange={(e) => setNewPayment(prev => ({ ...prev, period: e.target.value }))}
                                                        className="w-full p-3.5 rounded-xl border border-stone-200 outline-none bg-stone-50 font-semibold text-base focus:ring-2 focus:ring-amber-500"
                                                    >
                                                        {PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Fecha de Cobro</label>
                                                    <input 
                                                        type="date"
                                                        value={newPayment.date}
                                                        onChange={(e) => setNewPayment(prev => ({ ...prev, date: e.target.value }))}
                                                        className="w-full p-3.5 rounded-xl border border-stone-200 outline-none bg-stone-50 font-semibold text-base focus:ring-2 focus:ring-amber-500"
                                                        required
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Medio de Pago</label>
                                                    <select 
                                                        value={newPayment.method}
                                                        onChange={(e) => setNewPayment(prev => ({ ...prev, method: e.target.value }))}
                                                        className="w-full p-3.5 rounded-xl border border-stone-200 outline-none bg-stone-50 font-semibold text-base focus:ring-2 focus:ring-amber-500"
                                                    >
                                                        {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
                                                    </select>
                                                </div>

                                                {/* Campo Importe — grande para teclado numérico */}
                                                <div>
                                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-2">
                                                        <i className="fas fa-dollar-sign text-amber-500 mr-1"></i> Importe ($)
                                                    </label>
                                                    <input 
                                                        type="number"
                                                        inputMode="numeric"
                                                        value={newPayment.amount}
                                                        onChange={(e) => setNewPayment(prev => ({ ...prev, amount: Number(e.target.value) }))}
                                                        className="w-full px-5 py-5 rounded-2xl border-2 border-amber-200 outline-none bg-amber-50 font-black text-amber-700 text-3xl text-center focus:ring-2 focus:ring-amber-500 focus:border-amber-400 tracking-wide"
                                                        required
                                                    />
                                                    <p className="text-[10px] text-stone-400 text-center mt-1">Tocá el campo para ingresar el monto</p>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Detalle o Concepto</label>
                                                <input 
                                                    type="text"
                                                    placeholder="Ej: Cuota mensual de Mayo"
                                                    value={newPayment.concept}
                                                    onChange={(e) => setNewPayment(prev => ({ ...prev, concept: e.target.value }))}
                                                    className="w-full p-3.5 rounded-xl border border-stone-200 outline-none bg-stone-50 font-medium text-base focus:ring-2 focus:ring-amber-500"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Nro de Recibo (Opcional)</label>
                                                <input 
                                                    type="text"
                                                    placeholder="Ej: 00002-00000112"
                                                    value={newPayment.receiptNo}
                                                    onChange={(e) => setNewPayment(prev => ({ ...prev, receiptNo: e.target.value }))}
                                                    className="w-full p-3.5 rounded-xl border border-stone-200 outline-none bg-stone-50 font-medium text-stone-600 text-base focus:ring-2 focus:ring-amber-500"
                                                />
                                            </div>

                                            <button 
                                                type="submit"
                                                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-4 px-4 rounded-2xl transition-all shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 text-base active:scale-95"
                                            >
                                                <i className="fas fa-receipt"></i> Registrar & Emitir Recibo
                                            </button>
                                        </form>
                                    </div>

                                    {/* Listado de cobros realizados */}
                                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 lg:col-span-2">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                                            <h3 className="text-lg font-bold text-stone-800 flex flex-wrap items-center gap-2">
                                                <i className="fas fa-receipt text-amber-500"></i> Historial de Cobros Recientes
                                                {newPayment.studentId && (
                                                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
                                                        Filtrado por alumno
                                                    </span>
                                                )}
                                            </h3>
                                            <input 
                                                type="text"
                                                placeholder="Buscar por alumno, periodo, medio..."
                                                value={paymentFilter}
                                                onChange={(e) => setPaymentFilter(e.target.value)}
                                                className="p-2.5 rounded-xl border border-stone-200 text-sm outline-none w-full sm:w-64"
                                            />
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="border-b border-stone-100 text-xs text-stone-400 font-bold uppercase">
                                                        <th className="py-3 px-4">Fecha</th>
                                                        <th className="py-3 px-4">Alumno</th>
                                                        <th className="py-3 px-4">Período</th>
                                                        <th className="py-3 px-4">Medio</th>
                                                        <th className="py-3 px-4">Monto</th>
                                                        <th className="py-3 px-4 text-center">Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-stone-50">
                                                    {filteredPayments.length === 0 ? (
                                                        <tr>
                                                            <td colSpan="6" className="text-center py-8 text-stone-400 text-sm">No se encontraron cobros registrados</td>
                                                        </tr>
                                                    ) : (
                                                        filteredPayments.map(p => (
                                                            <tr key={p.id} className="hover:bg-stone-50/50 transition-colors text-sm">
                                                                <td className="py-3 px-4 font-medium text-stone-500">{formatDate(p.date)}</td>
                                                                <td className="py-3 px-4 font-semibold text-stone-800">{p.studentName}</td>
                                                                <td className="py-3 px-4">
                                                                    <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded-full text-xs font-bold">{p.period}</span>
                                                                </td>
                                                                <td className="py-3 px-4 text-stone-500">{p.method}</td>
                                                                <td className="py-3 px-4 font-bold text-orange-600">${p.amount.toLocaleString()}</td>
                                                                <td className="py-3 px-4 flex items-center justify-center gap-2">
                                                                    <button 
                                                                        onClick={() => setActiveReceipt(p)}
                                                                        title="Ver Recibo Oficial"
                                                                        className="p-1.5 bg-stone-100 hover:bg-amber-500 hover:text-white text-stone-600 rounded-lg transition-all"
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
                                <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
                                    
                                    {/* Cabecera y Filtros */}
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                                        <div>
                                            <h3 className="text-xl font-bold text-stone-800">Directorio de Estudiantes</h3>
                                            <p className="text-sm text-stone-400">Total registrados: {filteredStudents.length}</p>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                setEditingStudent(null);
                                                setShowStudentModal(true);
                                            }}
                                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
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
                                            className="p-3 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                                        />

                                        <select 
                                            value={studentNivelFilter}
                                            onChange={(e) => setStudentNivelFilter(e.target.value)}
                                            className="p-3 rounded-xl border border-stone-200 text-sm outline-none bg-stone-50 font-semibold text-stone-600"
                                        >
                                            <option value="Todos">Todos los Niveles</option>
                                            {configLevels.map(c => <option key={c.id} value={c.curso_nivel}>{c.curso_nivel}</option>)}
                                        </select>
                                    </div>

                                    {/* Directorio de Cards / Tabla */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-stone-100 text-xs text-stone-400 font-bold uppercase">
                                                    <th className="py-3 px-4">Alumno</th>
                                                    <th className="py-3 px-4">DNI</th>
                                                    <th className="py-3 px-4">Sede / Nivel</th>
                                                    <th className="py-3 px-4">Contacto</th>
                                                    <th className="py-3 px-4 text-center">Estado</th>
                                                    <th className="py-3 px-4 text-center">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-stone-50">
                                                {filteredStudents.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="6" className="text-center py-8 text-stone-400 text-sm">No se encontraron alumnos con los filtros seleccionados</td>
                                                    </tr>
                                                ) : (
                                                    filteredStudents.map(student => (
                                                        <tr key={student.id} className="hover:bg-stone-50/50 transition-colors text-sm">
                                                            <td className="py-3.5 px-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-full bg-stone-100 text-stone-600 font-bold flex items-center justify-center text-xs">
                                                                        {student.name.charAt(0)}
                                                                    </div>
                                                                    <span className="font-bold text-stone-800">{student.name}</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-3.5 px-4 font-medium text-stone-500">{student.dni}</td>
                                                            <td className="py-3.5 px-4">
                                                                <p className="font-semibold text-stone-700">{student.sede}</p>
                                                                <p className="text-xs text-stone-400">{student.level}</p>
                                                            </td>
                                                            <td className="py-3.5 px-4 text-stone-600">
                                                                <p className="text-xs">{student.phone}</p>
                                                                <p className="text-xs text-stone-400">{student.email || 'Sin correo'}</p>
                                                            </td>
                                                            <td className="py-3.5 px-4 text-center">
                                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                                    student.active ? 'bg-orange-50 text-orange-700' : 'bg-rose-50 text-rose-700'
                                                                }`}>
                                                                    {student.active ? 'Activo' : 'Baja'}
                                                                </span>
                                                            </td>
                                                            <td className="py-3.5 px-4 flex items-center justify-center gap-2">
                                                                <button 
                                                                    onClick={() => setSelectedStudentDetail(student)}
                                                                    title="Ver Ficha Completa"
                                                                    className="p-1.5 bg-stone-100 hover:bg-amber-500 hover:text-white text-stone-600 rounded-lg transition-all"
                                                                >
                                                                    <i className="fas fa-eye"></i>
                                                                </button>
                                                                <button 
                                                                    onClick={() => {
                                                                        setEditingStudent(student);
                                                                        setShowStudentModal(true);
                                                                    }}
                                                                    title="Editar Perfil"
                                                                    className="p-1.5 bg-stone-100 hover:bg-amber-500 hover:text-white text-stone-600 rounded-lg transition-all"
                                                                >
                                                                    <i className="fas fa-edit"></i>
                                                                </button>
                                                                {student.active ? (
                                                                    <button 
                                                                        onClick={() => handleToggleStudentStatus(student.id, false)}
                                                                        title="Dar de Baja (Desactivar)"
                                                                        className="p-1.5 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-600 rounded-lg transition-all"
                                                                    >
                                                                        <i className="fas fa-user-slash text-sm"></i>
                                                                    </button>
                                                                ) : (
                                                                    <button 
                                                                        onClick={() => handleToggleStudentStatus(student.id, true)}
                                                                        title="Reincorporar (Activar)"
                                                                        className="p-1.5 bg-emerald-50 hover:bg-emerald-500 hover:text-white text-emerald-600 rounded-lg transition-all"
                                                                    >
                                                                        <i className="fas fa-user-plus text-sm"></i>
                                                                    </button>
                                                                )}
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
                                <div className="grid grid-cols-1 gap-8">
                                    
                                    {/* Configuración de Aranceles */}
                                    <Config 
                                        configLevels={configLevels} 
                                        setConfigLevels={setConfigLevels} 
                                        addNotification={addNotification} 
                                        globalSede={globalSede} 
                                        generalConfig={generalConfig}
                                        setGeneralConfig={setGeneralConfig}
                                        sedes={sedes}
                                        users={users}
                                        currentUser={currentUser}
                                    />
                                </div>
                            </div>
                        )}

                        {/* 6. SECCIÓN MI PERFIL */}
                        {currentTab === "perfil" && (
                            <PerfilProfesor 
                                currentUser={currentUser}
                                profileUser={currentUser?.dni === 'admin' ? sedeProfesor : currentUser}
                                globalSede={globalSede}
                                setCurrentUser={setCurrentUser}
                                addNotification={addNotification}
                            />
                        )}

                    </main>

                    {/* --- MODALES --- */}

                    {/* Modal Crear/Editar Alumno */}
                    {showStudentModal && (
                        <div className="fixed inset-0 bg-stone-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn no-print">
                            <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold text-stone-800">
                                        {editingStudent ? "Editar Perfil del Alumno" : "Registrar Alumno Nuevo"}
                                    </h3>
                                    <button 
                                        onClick={() => setShowStudentModal(false)}
                                        className="p-1 text-stone-400 hover:text-stone-600"
                                    >
                                        <i className="fas fa-times text-lg"></i>
                                    </button>
                                </div>

                                <form onSubmit={handleSaveStudent} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Apellido y Nombre</label>
                                        <input 
                                            type="text" 
                                            name="name"
                                            defaultValue={editingStudent?.name || ""}
                                            className="w-full p-3 rounded-xl border border-stone-200 outline-none bg-stone-50 font-semibold"
                                            required 
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">DNI del Alumno</label>
                                            <input 
                                                type="text" 
                                                name="dni"
                                                defaultValue={editingStudent?.dni || ""}
                                                className="w-full p-3 rounded-xl border border-stone-200 outline-none bg-stone-50"
                                                required 
                                                disabled={!!editingStudent}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Teléfono de Contacto</label>
                                            <input 
                                                type="text" 
                                                name="phone"
                                                defaultValue={editingStudent?.phone || ""}
                                                className="w-full p-3 rounded-xl border border-stone-200 outline-none bg-stone-50"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Sede</label>
                                            <select 
                                                name="sede"
                                                defaultValue={editingStudent?.sede || globalSede}
                                                className="w-full p-3 rounded-xl border border-stone-200 outline-none bg-stone-50 font-semibold"
                                            >
                                                {sedes.map(s => <option key={s.nombre} value={s.nombre}>{s.nombre}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Nivel / Curso</label>
                                            <select 
                                                name="level"
                                                defaultValue={editingStudent?.level || (configLevels[0]?.curso_nivel || "")}
                                                className="w-full p-3 rounded-xl border border-stone-200 outline-none bg-stone-50 font-semibold"
                                            >
                                                {configLevels.map(c => <option key={c.id} value={c.curso_nivel}>{c.curso_nivel}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Email del Alumno/Tutor</label>
                                        <input 
                                            type="email" 
                                            name="email"
                                            defaultValue={editingStudent?.email || ""}
                                            className="w-full p-3 rounded-xl border border-stone-200 outline-none bg-stone-50"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Tutor Responsable</label>
                                            <input 
                                                type="text" 
                                                name="tutor"
                                                defaultValue={editingStudent?.tutor || ""}
                                                className="w-full p-3 rounded-xl border border-stone-200 outline-none bg-stone-50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Domicilio</label>
                                            <input 
                                                type="text" 
                                                name="address"
                                                defaultValue={editingStudent?.address || ""}
                                                className="w-full p-3 rounded-xl border border-stone-200 outline-none bg-stone-50"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 pt-4 border-t border-stone-100">
                                        <input 
                                            type="checkbox" 
                                            name="active" 
                                            id="chk-active"
                                            defaultChecked={editingStudent ? editingStudent.active : true}
                                            className="w-5 h-5 accent-amber-500"
                                        />
                                        <label for="chk-active" className="text-sm font-bold text-stone-700">Estado de Matrícula Activo</label>
                                    </div>

                                    <div className="pt-6 flex gap-3">
                                        <button 
                                            type="button" 
                                            onClick={() => setShowStudentModal(false)}
                                            className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold py-3 rounded-xl transition-all"
                                        >
                                            Cancelar
                                        </button>
                                        <button 
                                            type="submit" 
                                            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl transition-all shadow-md"
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
                        <div className="fixed inset-0 bg-stone-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn no-print">
                            <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
                                <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center">
                                            {selectedStudentDetail.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-stone-800">{selectedStudentDetail.name}</h3>
                                            <p className="text-xs text-stone-400">DNI: {selectedStudentDetail.dni} | {selectedStudentDetail.sede}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedStudentDetail(null)}
                                        className="p-1 text-stone-400 hover:text-stone-600"
                                    >
                                        <i className="fas fa-times text-lg"></i>
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    {/* Presentismo */}
                                    <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                                        <h4 className="text-xs font-bold text-stone-400 uppercase mb-3">Estadística de Asistencias</h4>
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <p className="text-3xl font-extrabold text-amber-600">{activeStudentStats.attendanceRate}%</p>
                                                <p className="text-xs text-stone-500">Tasa de presentismo</p>
                                            </div>
                                            <div className="text-xs space-y-1 text-stone-600">
                                                <p className="flex justify-between gap-4"><span>Presentes:</span> <span className="font-bold text-orange-600">{activeStudentStats.presents}</span></p>
                                                <p className="flex justify-between gap-4"><span>Justificados:</span> <span className="font-bold text-amber-600">{activeStudentStats.excused}</span></p>
                                                <p className="flex justify-between gap-4"><span>Ausentes:</span> <span className="font-bold text-rose-600">{activeStudentStats.absents}</span></p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Estado Financiero */}
                                    <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                                        <h4 className="text-xs font-bold text-stone-400 uppercase mb-3">Historial de Cuotas (2026)</h4>
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap gap-1.5">
                                                {["Marzo", "Abril", "Mayo", "Junio"].map(month => {
                                                    const isPaid = activeStudentStats.paidPeriods.includes(month);
                                                    return (
                                                        <span 
                                                            key={month} 
                                                            className={`text-[10px] px-2 py-1 rounded-full font-bold ${
                                                                isPaid ? 'bg-orange-100 text-orange-800' : 'bg-rose-100 text-rose-800'
                                                            }`}
                                                        >
                                                            {month}: {isPaid ? 'Al día' : 'Impago'}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                            <p className="text-[11px] text-stone-400 italic">Precios sugeridos según configuración de aranceles</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Últimos Pagos Registrados */}
                                <div>
                                    <h4 className="text-sm font-bold text-stone-800 mb-3">Historial de Pagos Efectuados</h4>
                                    {activeStudentStats.payments.length === 0 ? (
                                        <p className="text-xs text-stone-400 text-center py-6">No hay registros de pago para este alumno</p>
                                    ) : (
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {activeStudentStats.payments.map(p => (
                                                <div key={p.id} className="flex items-center justify-between p-3 bg-stone-50/50 rounded-xl border border-stone-100 text-xs">
                                                    <div>
                                                        <p className="font-bold text-stone-700">{p.concept}</p>
                                                        <p className="text-[10px] text-stone-400">{formatDate(p.date)} | Recibo: {p.receiptNo}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-extrabold text-orange-600">${p.amount.toLocaleString()}</p>
                                                        <span className="text-[9px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded font-bold">{p.method}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="pt-6 mt-6 border-t border-stone-100 flex justify-end">
                                    <button 
                                        onClick={() => setSelectedStudentDetail(null)}
                                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all shadow-md"
                                    >
                                        Cerrar Ficha
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Modal Visor de Recibo Oficial Alta Fidelidad */}
                    {activeReceipt && (
                        <div className="fixed inset-0 bg-stone-950/65 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn overflow-y-auto no-print">
                            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl p-8 max-h-[95vh] overflow-y-auto relative">
                                
                                <button 
                                    onClick={() => setActiveReceipt(null)}
                                    className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 p-2 rounded-full hover:bg-stone-50 transition-all"
                                >
                                    <i className="fas fa-times text-lg"></i>
                                </button>

                                {/* Contenedor Oficial del Recibo para imprimir */}
                                <div id="receipt-print-area" className="bg-white text-stone-900 p-6 border-2 border-stone-300 rounded-2xl space-y-6">
                                    
                                    {/* Encabezado Principal Recibo */}
                                    <div className="flex justify-between items-start border-b pb-4 border-stone-200">
                                        <div className="flex flex-col items-center text-center">
                                            <img src="/logo.png" alt="Logo IDeAr" className="w-36 h-auto object-contain" />
                                            <div className="mt-3">
                                                <h4 className="text-sm font-black tracking-tight text-amber-900">{generalConfig?.profesor || "SILVA GRACIELA BEATRIZ"}</h4>
                                                <p className="text-[10px] text-stone-500 font-semibold">Instituto Para el Desarrollo del Arte (IDeAr)</p>
                                                <p className="text-[10px] text-stone-600 font-bold mt-1">Sede: {globalSede}</p>
                                                <p className="text-[10px] text-stone-500 mt-2">Reg. SPEPM N° 213/21</p>
                                                <p className="text-[10px] text-stone-400 mt-2">Cataratas Del Iguazú 912 - Leandro N. Alem - Mnes.</p>
                                            </div>
                                        </div>
                                        <div className="text-right space-y-1">
                                            <div className="bg-stone-900 text-white font-black px-4 py-1.5 rounded-lg text-sm inline-block uppercase tracking-wider">
                                                Recibo X
                                            </div>
                                            <p className="text-xs font-bold text-stone-600 pt-1">Nro: {activeReceipt.receiptNo}</p>
                                            <p className="text-[10px] text-stone-400 font-semibold">Fecha: {formatDate(activeReceipt.date)}</p>
                                            
                                            <div className="pt-3 text-[10px] text-stone-500 font-medium space-y-1.5">
                                                <p>CUIT: 27-25496483-8</p>
                                                <p>Ingresos Brutos: 27-25496483-8</p>
                                                <p>Monotributista Responsable</p>
                                                <p className="font-bold text-stone-400 italic">Documento no válido como Factura</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Datos del Alumno Receptor */}
                                    <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 text-xs space-y-2">
                                        <p className="flex justify-between">
                                            <span className="text-stone-400 font-bold uppercase text-[10px]">Alumno / Estudiante:</span>
                                            <span className="font-extrabold text-stone-800">{activeReceipt.studentName}</span>
                                        </p>
                                        <p className="flex justify-between">
                                            <span className="text-stone-400 font-bold uppercase text-[10px]">Identificación (DNI):</span>
                                            <span className="font-semibold text-stone-700">{activeReceipt.studentId}</span>
                                        </p>
                                    </div>

                                    {/* Detalle y Valores */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-xs font-bold text-stone-400 uppercase border-b pb-1">
                                            <span>Detalle del Servicio / Concepto</span>
                                            <span>Importe</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm py-2">
                                            <div>
                                                <p className="font-bold text-stone-800">{activeReceipt.concept}</p>
                                                <p className="text-[10px] text-stone-400">Cuota mes: {activeReceipt.period} | Vía {activeReceipt.method}</p>
                                            </div>
                                            <span className="font-extrabold text-stone-800">${activeReceipt.amount.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {/* Total Final */}
                                    <div className="border-t pt-4 flex justify-between items-center">
                                        <span className="text-xs font-black uppercase text-stone-500">Monto Total Recibido</span>
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-amber-900">${activeReceipt.amount.toLocaleString()}</p>
                                            <p className="text-[9px] text-stone-400 italic">Expresado en pesos argentinos</p>
                                        </div>
                                    </div>



                                </div>

                                {/* Botonera de impresión */}
                                <div className="flex gap-4 mt-6">
                                    <button 
                                        onClick={() => setActiveReceipt(null)}
                                        className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold py-3 rounded-xl transition-all"
                                    >
                                        Volver
                                    </button>
                                    <button 
                                        onClick={handlePrintReceipt}
                                        className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                                    >
                                        <i className="fas fa-print"></i> Imprimir Recibo X
                                    </button>
                                </div>

                            </div>
                        </div>
                    )}

                    {/* --- FIN MODALES --- */}

                    {/* Footer Institucional */}
                    <footer className="bg-stone-900 text-stone-500 py-6 border-t border-stone-800 text-center text-xs mt-12 no-print">
                        <div className="max-w-7xl mx-auto px-4 space-y-2">
                            <p className="font-bold text-stone-400">© 2026 Instituto para el Desarrollo del Arte (IDeAr) - Misiones, Argentina</p>
                            <p>Sede Alem: Cataratas del Iguazú 912 | Sede San Javier | Sede Itacaruaré | Sede Cerro Azul</p>
                            <p className="text-[10px] text-stone-600">Desarrollado y estructurado según requerimientos y base de datos activa.</p>
                        </div>
                    </footer>

                    {/* --- CONTENEDOR ESPECIAL DE IMPRESIÓN SOLO PARA EL RECIBO --- */}
                    {activeReceipt && (
                        <div className="hidden print-only">
                            <div className="bg-white text-black p-8 font-sans" style={{ width: "100%", maxWidth: "800px", margin: "0 auto" }}>
                                <div style={{ border: "2px solid #ccc", padding: "20px", borderRadius: "10px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", borderBottom: "1px solid #ccc", paddingBottom: "15px" }}>
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                                            <img src="/logo.png" alt="Logo IDeAr" style={{ width: "144px", height: "auto", objectFit: "contain" }} />
                                            <div style={{ marginTop: "12px" }}>
                                                <h2 style={{ fontSize: "14px", fontWeight: "900", margin: "0" }}>{generalConfig?.profesor || "SILVA GRACIELA BEATRIZ"}</h2>
                                                <p style={{ fontSize: "10px", color: "#555", fontWeight: "600", margin: "4px 0 0 0" }}>Instituto Para el Desarrollo del Arte (IDeAr)</p>
                                                <p style={{ fontSize: "10px", color: "#000", fontWeight: "700", margin: "4px 0 0 0" }}>Sede: {globalSede}</p>
                                                <p style={{ fontSize: "10px", color: "#555", margin: "8px 0 0 0" }}>Reg. SPEPM N° 213/21</p>
                                                <p style={{ fontSize: "10px", color: "#666", margin: "8px 0 0 0" }}>Cataratas Del Iguazú 912 - Leandro N. Alem - Mnes.</p>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: "right" }}>
                                            <span style={{ background: "black", color: "white", padding: "5px 15px", fontWeight: "bold", fontSize: "12px", borderRadius: "4px" }}>RECIBO X</span>
                                            <p style={{ fontSize: "12px", fontWeight: "bold", margin: "5px 0 0 0" }}>N° {activeReceipt.receiptNo}</p>
                                            <p style={{ fontSize: "11px", color: "#888", margin: "0" }}>Fecha: {formatDate(activeReceipt.date)}</p>
                                            <div style={{ fontSize: "10px", color: "#555", marginTop: "10px", textAlign: "right", lineHeight: "1.4" }}>
                                                <p style={{ margin: "0" }}>CUIT: 27-25496483-8</p>
                                                <p style={{ margin: "0" }}>Ingresos Brutos: 27-25496483-8</p>
                                                <p style={{ margin: "0" }}>Monotributista Responsable</p>
                                                <p style={{ margin: "0", fontWeight: "bold", color: "#888" }}>Documento no válido como Factura</p>
                                            </div>
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

                                </div>
                            </div>
                        </div>
                    )}

                </div>
            );
        }

        // Renderizado

export default App;
