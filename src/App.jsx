import React, { useState, useEffect, useMemo } from 'react';
import { METODOS_PAGO, PERIODOS, NIVELES } from './data/seedData';
import { rtdb } from './config/firebase';
import { ref, set, get, remove, update } from 'firebase/database';
import { loginWithDni, logout as firebaseLogout, observeAuthState, createAuthUser, dniToEmail } from './services/authService';

import DashboardRecibos from './components/DashboardRecibos';
import Config from './components/Config';
import PerfilProfesor from './components/PerfilProfesor';
import BoletinHistorialPreview from './components/BoletinHistorialPreview';
import CampusMain from './components/campus/CampusMain';
import CertificadoAnaliticoPreview from './components/CertificadoAnaliticoPreview';
import PublicReceipt from './components/PublicReceipt';

import LoginSedeModal from './components/auth/LoginSedeModal';
import StudentDashboard from './components/StudentDashboard';

import StudentHistorialModal from './components/modals/StudentHistorialModal';
import BoletinModal from './components/modals/BoletinModal';
import ReceiptModal from './components/modals/ReceiptModal';
import StudentModal from './components/modals/StudentModal';
import StudentDetailModal from './components/modals/StudentDetailModal';
import ReminderPreviewModal from './components/modals/ReminderPreviewModal';

import DashboardTab from './components/tabs/DashboardTab';
import AttendanceTab from './components/tabs/AttendanceTab';
import GradesTab from './components/tabs/GradesTab';
import PaymentsTab from './components/tabs/PaymentsTab';
import StudentsTab from './components/tabs/StudentsTab';

import { useFirebaseData } from './hooks/useFirebaseData';
import { formatDate } from './utils/formatters';
import { getHistoricalValues, MONTHS_ORDER, isMonthInactive } from './utils/mathHelpers';

function App() {
    const [globalSede, setGlobalSede] = useState(() => localStorage.getItem('idear_sede') || "");
    const [tempSede, setTempSede] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [authReady, setAuthReady] = useState(false);
    const [currentTab, setCurrentTab] = useState("dashboard");
    const [notifications, setNotifications] = useState([]);

    const [tipoEvaluacion, setTipoEvaluacion] = useState("cursada");
    const [gradesNivel, setGradesNivel] = useState("Todos");
    const [attendanceNivel, setAttendanceNivel] = useState("Todos");
    const [attendanceMonthIdx, setAttendanceMonthIdx] = useState(new Date().getMonth());
    const [mesasNivel, setMesasNivel] = useState("Todos");
    const [mesasSede, setMesasSede] = useState("Todas");

    const [newPayment, setNewPayment] = useState({
        studentId: "",
        period: "Matrícula",
        date: new Date().toISOString().split('T')[0],
        method: "Efectivo",
        amount: 25000,
        concept: "Mensualidad",
        receiptNo: ""
    });
    const [studentSelectSearch, setStudentSelectSearch] = useState("");
    const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
    const [paymentFilter, setPaymentFilter] = useState("");
    const [studentSearch, setStudentSearch] = useState("");
    const [studentNivelFilter, setStudentNivelFilter] = useState("Todos");
    const [alumnoStatusTab, setAlumnoStatusTab] = useState("activos");

    const [selectedStudentDetail, setSelectedStudentDetail] = useState(null);
    const [activeReceipt, setActiveReceipt] = useState(null);
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);

    const [modalLevel, setModalLevel] = useState("");
    const [modalCuota, setModalCuota] = useState("");
    const [modalInscripcion, setModalInscripcion] = useState("");
    const [modalActive, setModalActive] = useState(true);
    const [modalFechaBaja, setModalFechaBaja] = useState("");

    const [historialStudent, setHistorialStudent] = useState(null);
    const [showHistorialModal, setShowHistorialModal] = useState(false);

    const [boletinStudent, setBoletinStudent] = useState(null);
    const [showBoletin, setShowBoletin] = useState(false);

    const [boletinHistorialStudent, setBoletinHistorialStudent] = useState(null);
    const [showBoletinHistorial, setShowBoletinHistorial] = useState(false);

    const [analiticoStudent, setAnaliticoStudent] = useState(null);
    const [showAnalitico, setShowAnalitico] = useState(false);

    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [reminderPreview, setReminderPreview] = useState(null);
    const [lastReadTime, setLastReadTime] = useState(() => Number(localStorage.getItem('idear_last_aviso')) || 0);

    const [isFirstTime, setIsFirstTime] = useState(false);
    const [authDni, setAuthDni] = useState("");
    const [authPassword, setAuthPassword] = useState("");
    const [authNombre, setAuthNombre] = useState("");
    const [hasAdmin, setHasAdmin] = useState(true);

    const {
        students,
        payments,
        attendance,
        configLevels,
        setConfigLevels,
        announcements,
        generalConfig,
        setGeneralConfig,
        gradeColumns,
        mesasColumns,
        mesasGrades,
        grades,
        users,
        sedes,
        loading
    } = useFirebaseData(globalSede);

    const addNotification = (text, type = 'info') => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, text, type }]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 4000);
    };

    const publicReceipt = useMemo(() => {
        const params = new URLSearchParams(window.location.search);
        const receiptNo = params.get('recibo');
        if (receiptNo && payments.length > 0) {
            return payments.find(p => p.receiptNo === receiptNo) || null;
        }
        const hash = window.location.hash;
        if (hash.startsWith('#/recibo/') && payments.length > 0) {
            const rNo = hash.replace('#/recibo/', '');
            return payments.find(p => p.receiptNo === rNo) || null;
        }
        return null;
    }, [payments]);

    // Firebase Auth observer — restaura sesión real del servidor
    useEffect(() => {
        const unsubscribe = observeAuthState(async (firebaseUser) => {
            if (firebaseUser) {
                // Usuario autenticado en Firebase — buscar su perfil en RTDB
                const dni = firebaseUser.email.replace('@portal-idear.app', '');
                try {
                    const userRef = ref(rtdb, `usuarios/${dni}`);
                    const snapshot = await get(userRef);
                    if (snapshot.exists()) {
                        const userData = snapshot.val();
                        setCurrentUser(userData);
                        const savedSede = localStorage.getItem('idear_sede');
                        if (savedSede) {
                            setGlobalSede(savedSede);
                        }
                    } else {
                        // El usuario auth existe pero no tiene perfil en RTDB
                        // Esto puede pasar con alumnos — buscar en alumnos
                        const alumnosRef = ref(rtdb, 'alumnos');
                        const alumnosSnap = await get(alumnosRef);
                        if (alumnosSnap.exists()) {
                            const alumnosData = alumnosSnap.val();
                            const foundAlumno = Object.values(alumnosData).find(a => a.dni === dni && a.active !== false);
                            if (foundAlumno) {
                                const alumnoUser = { ...foundAlumno, rol: 'Alumno', nombre: foundAlumno.name };
                                setCurrentUser(alumnoUser);
                                const savedSede = localStorage.getItem('idear_sede');
                                if (savedSede) setGlobalSede(savedSede);
                            }
                        }
                    }
                } catch (err) {
                    console.error('Error cargando perfil de usuario:', err);
                }
            } else {
                // No hay sesión activa
                setCurrentUser(null);
                // No limpiamos globalSede aquí — lo hace handleLogout explícitamente
            }
            setAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (tempSede) {
            const hasAdminUser = users.some(u => u.sede === tempSede && u.dni === 'admin');
            setHasAdmin(hasAdminUser);
        }
    }, [tempSede, users]);

    useEffect(() => {
        if (editingStudent) {
            setModalLevel(editingStudent.level || "");
            setModalCuota(editingStudent.cuotaOverride !== undefined ? editingStudent.cuotaOverride : "");
            setModalInscripcion(editingStudent.inscripcionOverride !== undefined ? editingStudent.inscripcionOverride : "");
            setModalActive(editingStudent.active !== false);
            setModalFechaBaja(editingStudent.fecha_baja || "");
        } else {
            if (configLevels.length > 0) {
                const first = configLevels[0];
                setModalLevel(first.curso_nivel);
                setModalCuota(first.cuota || 25000);
                setModalInscripcion(first.inscripcion || 20000);
            }
            setModalActive(true);
            setModalFechaBaja("");
        }
    }, [editingStudent, showStudentModal, configLevels]);

    const handleLevelChangeInModal = (lvl) => {
        setModalLevel(lvl);
        const config = configLevels.find(c => c.curso_nivel === lvl);
        if (config) {
            setModalCuota(config.cuota);
            setModalInscripcion(config.inscripcion);
        }
    };

    const handleAuthSubmit = async (e) => {
        e.preventDefault();
        
        const username = authDni.trim().toLowerCase();
        const pwd = authPassword;

        if (!username) {
            addNotification("Por favor, ingresa tu DNI o usuario", "error");
            return;
        }

        // "admin" es un usuario especial válido en todas las sedes; los profesores usan su DNI numérico
        if (username !== "admin" && !/^\d+$/.test(username)) {
            addNotification("El DNI debe contener solo números", "error");
            return;
        }



        try {
            // 1. INICIAR SESIÓN EN FIREBASE AUTH PRIMERO
            // (Para los alumnos, si no ingresaron contraseña, usamos su DNI como contraseña por defecto)
            const loginPassword = pwd || username; 
            
            try {
                await loginWithDni(username, loginPassword);
            } catch (authErr) {
                console.error("Error Firebase Auth:", authErr);
                addNotification("Credenciales incorrectas o usuario no registrado.", "error");
                return;
            }

            // 2. UNA VEZ AUTENTICADO, LEEMOS RTDB PARA VERIFICAR SEDE Y ROL
            
            // A) Verificar si es un usuario de staff (profesor/director)
            const userRef = ref(rtdb, `usuarios/${username}`);
            const snapshot = await get(userRef);

            if (snapshot.exists()) {
                const userData = snapshot.val();
                const userSedes = userData.sede ? userData.sede.split(',').map(s => s.trim()) : [];
                const hasAccess = userSedes.includes(tempSede) || userSedes.includes("Leandro N. Alem");
                
                if (!hasAccess) {
                    await firebaseLogout();
                    addNotification(`Tu usuario está registrado para: "${userData.sede}". No tienes acceso a "${tempSede}".`, "error");
                    return;
                }

                addNotification(`¡Bienvenido, Prof. ${userData.nombre}!`, "success");
                localStorage.setItem('idear_sede', tempSede);
                setGlobalSede(tempSede);
                setCurrentUser(userData);
                setTempSede(null);
                setAuthDni("");
                setAuthPassword("");
                setAuthNombre("");
                return;
            }

            // B) No es staff, buscar en alumnos
            const alumnosRef = ref(rtdb, 'alumnos');
            const alumnosSnap = await get(alumnosRef);
            if (alumnosSnap.exists()) {
                const alumnosData = alumnosSnap.val();
                const foundAlumno = Object.values(alumnosData).find(
                    a => a.dni === username && a.sede === tempSede && a.active !== false
                );
                
                if (foundAlumno) {
                    const alumnoUser = {
                        ...foundAlumno,
                        rol: 'Alumno',
                        nombre: foundAlumno.name,
                    };
                    addNotification(`¡Bienvenido/a, ${foundAlumno.name}!`, "success");
                    localStorage.setItem('idear_sede', tempSede);
                    setGlobalSede(tempSede);
                    setCurrentUser(alumnoUser);
                    setTempSede(null);
                    setAuthDni("");
                    setAuthPassword("");
                    setAuthNombre("");
                    return;
                }
                
                // Buscar si existe en otra sede
                const alumnoOtraSede = Object.values(alumnosData).find(
                    a => a.dni === username && a.active !== false
                );
                if (alumnoOtraSede) {
                    await firebaseLogout();
                    addNotification(`Tu DNI está registrado en la sede "${alumnoOtraSede.sede}", no en "${tempSede}".`, "error");
                    return;
                }
            }

            await firebaseLogout();
            addNotification("DNI no registrado en esta sede. Contactá a Dirección.", "error");

        } catch (err) {
            console.error("Error al autenticar:", err);
            addNotification("Error de conexión al autenticar", "error");
        }
    };

    const handleLogout = async () => {
        try {
            await firebaseLogout();
        } catch (err) {
            console.error('Error al cerrar sesión:', err);
        }
        localStorage.removeItem('idear_sede');
        localStorage.removeItem('idear_user');
        setGlobalSede("");
        setCurrentUser(null);
        setCurrentTab("dashboard");
    };

    const handleSaveStudent = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const dniRaw = formData.get("dni");
        const dni = editingStudent ? editingStudent.dni : (dniRaw ? dniRaw.trim() : "");
        const name = (formData.get("name") || "").trim();
        const phone = (formData.get("phone") || "").trim();
        const email = (formData.get("email") || "").trim();
        const sede = formData.get("sede");
        const fecha_inicio = formData.get("fecha_inicio");
        const tutor = (formData.get("tutor") || "").trim();
        const address = (formData.get("address") || "").trim();
        const profilePic = formData.get("profilePic") || (editingStudent ? editingStudent.profilePic : "") || "";

        if (!dni || !name || !fecha_inicio) {
            addNotification("DNI, Nombre y Fecha de Inicio son requeridos", "error");
            return;
        }

        const existing = students.find(s => s.dni === dni);
        const studentId = editingStudent ? editingStudent.id : (existing ? existing.id : `std-${Date.now()}`);

        const currentActiveHistory = editingStudent?.historial_bajas || [];
        let updatedBajas = [...currentActiveHistory];
        
        if (editingStudent && editingStudent.active === true && modalActive === false) {
            updatedBajas.push({
                fecha_baja: modalFechaBaja,
                fecha_reincorporacion: null
            });
        } else if (editingStudent && editingStudent.active === false && modalActive === true) {
            if (updatedBajas.length > 0) {
                updatedBajas[updatedBajas.length - 1].fecha_reincorporacion = new Date().toISOString().split('T')[0];
            }
        }

        const payload = {
            id: studentId,
            dni,
            name,
            phone,
            email,
            sede,
            level: modalLevel,
            taller: modalLevel,
            fecha_inicio,
            tutor,
            address,
            cuotaOverride: modalCuota !== "" ? Number(modalCuota) : "",
            inscripcionOverride: modalInscripcion !== "" ? Number(modalInscripcion) : "",
            active: modalActive,
            fecha_baja: modalActive ? null : modalFechaBaja,
            historial_bajas: updatedBajas,
            profilePic,
            updatedAt: Date.now()
        };

        try {
            await set(ref(rtdb, `alumnos/${studentId}`), payload);
            addNotification("Alumno guardado con éxito", "success");
            setShowStudentModal(false);
            setEditingStudent(null);
        } catch (err) {
            addNotification("Error guardando alumno", "error");
        }
    };

    const handleToggleStudentStatus = async (studentId, status) => {
        const student = students.find(s => s.id === studentId);
        if (!student) return;

        let updatedBajas = [...(student.historial_bajas || [])];
        let fechaBaja = null;

        if (status === false) {
            fechaBaja = new Date().toISOString().split('T')[0];
            updatedBajas.push({
                fecha_baja: fechaBaja,
                fecha_reincorporacion: null
            });
        } else {
            if (updatedBajas.length > 0) {
                updatedBajas[updatedBajas.length - 1].fecha_reincorporacion = new Date().toISOString().split('T')[0];
            }
        }

        try {
            await update(ref(rtdb, `alumnos/${studentId}`), {
                active: status,
                fecha_baja: fechaBaja,
                historial_bajas: updatedBajas,
                updatedAt: Date.now()
            });
            addNotification(status ? "Alumno reincorporado" : "Alumno dado de baja", "success");
        } catch (err) {
            addNotification("Error actualizando estado del alumno", "error");
        }
    };

    const handleDeleteStudent = async (studentId) => {
        if (!window.confirm("¿Estás seguro que deseas ELIMINAR DEFINITIVAMENTE este alumno? Esta acción no se puede deshacer.")) {
            return;
        }
        try {
            await remove(ref(rtdb, `alumnos/${studentId}`));
            addNotification("Alumno eliminado definitivamente", "success");
            setSelectedStudentDetail(null);
        } catch (err) {
            addNotification("Error eliminando alumno", "error");
        }
    };

    const handleToggleCell = async (student, dateStr, currentStatus) => {
        const key = `${dateStr}_${student.id}`;
        const newStatus = currentStatus === "P" ? "A" : (currentStatus === "A" ? null : "P");

        try {
            if (newStatus === null) {
                await remove(ref(rtdb, `asistencias/${key}`));
            } else {
                await set(ref(rtdb, `asistencias/${key}`), {
                    id: key,
                    studentId: student.id,
                    studentName: student.name,
                    date: dateStr,
                    status: newStatus,
                    sede: globalSede,
                    level: student.level || student.taller || "Sin nivel"
                });
            }
        } catch (err) {
            addNotification("Error al guardar asistencia", "error");
        }
    };

    const handleAddGradeColumn = async () => {
        const title = prompt("Nombre de la nueva columna evaluativa (Ej: TP 1, Primer Trimestre):");
        if (!title) return;

        const safeNivel = gradesNivel;
        if (safeNivel === "Todos") {
            alert("Selecciona un curso específico antes de agregar una columna.");
            return;
        }

        const newCol = { id: `col_${Date.now()}`, title, date: new Date().toISOString().split('T')[0] };
        const currentCols = [...(gradeColumns[safeNivel] || [])];
        currentCols.push(newCol);

        const safeSede = globalSede.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\./g, '');
        try {
            await set(ref(rtdb, `config/gradeColumns_${safeSede}/${safeNivel}`), currentCols);
            addNotification("Columna agregada", "success");
        } catch (err) {
            addNotification("Error agregando columna", "error");
        }
    };

    const handleEditGradeColumn = async (colId, currentTitle) => {
        const action = prompt(`Editando evaluación: "${currentTitle}"\n\n- Modifica el texto para renombrarla.\n- BORRA TODO el texto y presiona Aceptar para ELIMINARLA.`, currentTitle);
        if (action === null) return;

        const safeNivel = gradesNivel;
        let currentCols = [...(gradeColumns[safeNivel] || [])];
        const newTitle = action.trim();

        if (newTitle === "") {
            if (window.confirm(`¿Seguro que quieres eliminar "${currentTitle}"?`)) {
                currentCols = currentCols.filter(c => c.id !== colId);
                try {
                    const safeSede = globalSede.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\./g, '');
                    await set(ref(rtdb, `config/gradeColumns_${safeSede}/${safeNivel}`), currentCols);
                    addNotification("Columna eliminada", "info");
                } catch (err) {
                    addNotification("Error al eliminar", "error");
                }
            }
        } else if (newTitle !== currentTitle) {
            const idx = currentCols.findIndex(c => c.id === colId);
            if (idx !== -1) {
                currentCols[idx].title = newTitle;
                try {
                    const safeSede = globalSede.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\./g, '');
                    await set(ref(rtdb, `config/gradeColumns_${safeSede}/${safeNivel}`), currentCols);
                    addNotification("Columna renombrada", "success");
                } catch (err) {
                    addNotification("Error al renombrar", "error");
                }
            }
        }
    };

    const handleUpdateGrade = async (studentId, columnId, valueStr) => {
        const recordId = `${columnId}_${studentId}`;
        
        if (valueStr.trim() === "") {
            try {
                await set(ref(rtdb, `calificaciones/${recordId}`), null);
            } catch (err) {
                console.error(err);
            }
            return;
        }

        const score = parseFloat(valueStr.replace(',', '.'));
        if (isNaN(score)) return;

        const gradeRecord = {
            id: recordId,
            studentId,
            columnId,
            level: gradesNivel,
            sede: globalSede,
            score
        };

        try {
            await set(ref(rtdb, `calificaciones/${recordId}`), gradeRecord);
        } catch (err) {
            addNotification("Error guardando nota", "error");
        }
    };

    const handleAddMesasColumn = async () => {
        const title = prompt("Nombre de la nueva evaluación de mesa (Ej: Práctica):");
        if (!title) return;
        
        const newCol = { id: `col_${Date.now()}`, title, date: new Date().toISOString().split('T')[0] };
        const currentCols = [...(mesasColumns || [])];
        currentCols.push(newCol);
        
        try {
            await set(ref(rtdb, `config/mesasColumns`), currentCols);
        } catch (err) {
            addNotification("Error añadiendo evaluación", "error");
        }
    };

    const handleEditMesasColumn = async (colId, currentTitle) => {
        const action = prompt(`Editando evaluación: "${currentTitle}"\n\n- Modifica el texto para renombrarla.\n- BORRA TODO el texto y presiona Aceptar para ELIMINARLA.`, currentTitle);
        if (action === null) return;

        let currentCols = [...(mesasColumns || [])];
        const newTitle = action.trim();

        if (newTitle === "") {
            if (window.confirm(`¿Seguro que quieres eliminar "${currentTitle}"?\n\nLas notas registradas se perderán.`)) {
                currentCols = currentCols.filter(c => c.id !== colId);
                try {
                    await set(ref(rtdb, `config/mesasColumns`), currentCols);
                } catch (err) {
                    addNotification("Error eliminando evaluación", "error");
                }
            }
        } else if (newTitle !== currentTitle) {
            const idx = currentCols.findIndex(c => c.id === colId);
            if (idx !== -1) {
                currentCols[idx].title = newTitle;
                try {
                    await set(ref(rtdb, `config/mesasColumns`), currentCols);
                } catch (err) {
                    addNotification("Error actualizando evaluación", "error");
                }
            }
        }
    };

    const handleUpdateMesasGrade = async (studentId, columnId, valueStr, currentSafeLevel) => {
        const recordId = currentSafeLevel ? `${columnId}_${studentId}_${currentSafeLevel}` : `${columnId}_${studentId}`;
        
        if (valueStr.trim() === "") {
            try {
                await set(ref(rtdb, `mesasExamen/${recordId}`), null);
            } catch (err) {
                console.error(err);
            }
            return;
        }

        const score = parseFloat(valueStr.replace(',', '.'));
        if (isNaN(score)) return;

        const gradeRecord = {
            id: recordId,
            studentId,
            columnId,
            level: mesasNivel,
            sede: globalSede,
            score
        };

        try {
            await set(ref(rtdb, `mesasExamen/${recordId}`), gradeRecord);
        } catch (err) {
            addNotification("Error guardando nota", "error");
        }
    };

    const handleToggleMesasStudent = async (studentId, currentStatus, currentSafeLevel) => {
        const recordId = currentSafeLevel ? `status_${studentId}_${currentSafeLevel}` : `status_${studentId}`;
        try {
            if (currentStatus) {
                await set(ref(rtdb, `mesasExamen/${recordId}`), null);
            } else {
                await set(ref(rtdb, `mesasExamen/${recordId}`), {
                    id: recordId,
                    studentId,
                    sede: globalSede,
                    isAbsent: true
                });
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpdateHistorialGrade = async (studentId, columnId, valueStr, level, isCurrent = false) => {
        const safeLevel = (level || "").replace(/[.#$\[\]\/]/g, "_");
        const recordId = isCurrent ? `${columnId}_${studentId}` : `${columnId}_${studentId}_${safeLevel}`;
        if (valueStr.trim() === "") {
            try { await set(ref(rtdb, `mesasExamen/${recordId}`), null); } catch(e) { console.error(e); }
            return;
        }
        const score = parseFloat(valueStr.replace(',', '.'));
        if (isNaN(score)) return;
        try {
            await set(ref(rtdb, `mesasExamen/${recordId}`), {
                id: recordId, studentId, columnId, level, score, sede: globalSede
            });
        } catch(e) { 
            console.error("Firebase write error:", e);
        }
    };

    const handleToggleHistorialStudent = async (studentId, currentStatus, level) => {
        const safeLevel = (level || "").replace(/[.#$\[\]\/]/g, "_");
        const recordId = `status_${studentId}_${safeLevel}`;
        try {
            if (currentStatus) {
                await set(ref(rtdb, `mesasExamen/${recordId}`), null);
            } else {
                await set(ref(rtdb, `mesasExamen/${recordId}`), { id: recordId, studentId, level, isAbsent: true });
            }
        } catch(e) { console.error(e); }
    };

    const handlePromoteStudent = async (student) => {
        const currentLevel = student.level || student.taller || "Desconocido";
        const safeLevel = currentLevel.replace(/[.#$\[\]\/]/g, "_");
        const hasGrades = mesasGrades.some(g => {
            if (g.studentId !== student.id || g.score === undefined) return false;
            const isCurrentLevel = g.id.endsWith(`_${safeLevel}`);
            const isFallback = g.id === `${g.columnId}_${student.id}`;
            return isCurrentLevel || isFallback;
        });
        
        if (!hasGrades) {
            alert("No se puede promocionar a un alumno sin calificaciones cargadas.");
            return;
        }

        const currentIdx = NIVELES.indexOf(currentLevel);
        if (currentIdx !== -1 && currentIdx < NIVELES.length - 1) {
            const nextLevel = NIVELES[currentIdx + 1];
            if (window.confirm(`¿Estás seguro que deseas promover a ${student.name} de "${currentLevel}" a "${nextLevel}"?`)) {
                try {
                    await set(ref(rtdb, `alumnos/${student.id}`), {
                        ...student,
                        level: nextLevel,
                        taller: nextLevel,
                        promocionadoDe: currentLevel,
                        updatedAt: Date.now()
                    });
                    addNotification(`Alumno promovido a ${nextLevel}`, "success");
                } catch (err) {
                    addNotification("Error al promover al alumno", "error");
                }
            }
        } else {
            alert("El alumno ya se encuentra en el último nivel o su nivel no permite promoción automática.");
        }
    };

    const handleUndoPromoteStudent = async (student) => {
        if (window.confirm(`¿Estás seguro que deseas deshacer la promoción de ${student.name} y devolverlo a "${student.promocionadoDe}"?`)) {
            try {
                await set(ref(rtdb, `alumnos/${student.id}`), {
                    ...student,
                    level: student.promocionadoDe,
                    taller: student.promocionadoDe,
                    promocionadoDe: null,
                    updatedAt: Date.now()
                });
                addNotification("Promoción deshecha con éxito", "success");
            } catch (err) {
                addNotification("Error al deshacer la promoción", "error");
            }
        }
    };

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
        
        const levelConfig = configLevels.find(c => c.curso_nivel === selectedStudent.level) 
                            || configLevels.find(c => c.curso_nivel === selectedStudent.taller);
        const currentYear = new Date(newPayment.date).getFullYear();
        const periodParts = newPayment.period.split(' ');
        const periodMonth = periodParts[0];
        const periodYear = periodParts.length > 1 ? parseInt(periodParts[1], 10) : currentYear;

        const paymentMonthIdx = Math.max(0, MONTHS_ORDER.indexOf(periodMonth));
        const histValues = getHistoricalValues(levelConfig, paymentMonthIdx, periodYear);
        
        const valorInscripcion = selectedStudent.inscripcionOverride !== undefined && selectedStudent.inscripcionOverride !== "" 
                                 ? Number(selectedStudent.inscripcionOverride) 
                                 : histValues.inscripcion;
        const valorCuota = selectedStudent.cuotaOverride !== undefined && selectedStudent.cuotaOverride !== "" 
                           ? Number(selectedStudent.cuotaOverride) 
                           : histValues.cuota;

        let startYear = currentYear;
        const startMonthStr = selectedStudent.fecha_inicio?.split('-')[1];
        const startYearStr = selectedStudent.fecha_inicio?.split('-')[0];
        if (startYearStr) startYear = parseInt(startYearStr, 10);
        
        let startMonthIdx = startMonthStr ? parseInt(startMonthStr, 10) - 1 : -1;
        if (startMonthIdx !== -1) {
            startMonthIdx = Math.max(2, startMonthIdx);
        }
        const isEnrollmentMonth = startMonthIdx !== -1 && MONTHS_ORDER[startMonthIdx] === periodMonth && startYear === periodYear;

        const studentPaymentsForPeriod = payments.filter(p => p.studentId === selectedStudent.id && p.period === newPayment.period && p.period !== "Examen");
        const alreadyPaidForPeriod = studentPaymentsForPeriod.reduce((sum, p) => sum + p.amount, 0);

        let totalExpectedForPeriod = valorCuota;
        let expectedInscripcion = 0;
        
        if (newPayment.period === "Matrícula") {
            totalExpectedForPeriod = valorInscripcion;
            expectedInscripcion = valorInscripcion;
        } else if (newPayment.period === "Examen") {
            totalExpectedForPeriod = levelConfig?.examen || 45000;
        } else if (isEnrollmentMonth) {
            totalExpectedForPeriod = valorInscripcion + valorCuota;
            expectedInscripcion = valorInscripcion;
        }

        const amountPaid = Number(newPayment.amount);
        const expectedCuota = totalExpectedForPeriod - expectedInscripcion;
        const alreadyPaidEnrollment = Math.min(alreadyPaidForPeriod, expectedInscripcion);
        const alreadyPaidCuota = Math.max(0, alreadyPaidForPeriod - alreadyPaidEnrollment);

        const remainingEnrollment = expectedInscripcion - alreadyPaidEnrollment;
        const remainingCuota = expectedCuota - alreadyPaidCuota;

        const inscripcionPaid = Math.min(amountPaid, Math.max(0, remainingEnrollment));
        const cuotaPaid = Math.min(Math.max(0, amountPaid - inscripcionPaid), Math.max(0, remainingCuota));

        const periodBalance = Math.max(0, totalExpectedForPeriod - (alreadyPaidForPeriod + amountPaid));
        const currentStudentDebtBefore = studentDebts[selectedStudent.id] || 0;
        const balanceToDate = Math.max(0, currentStudentDebtBefore - amountPaid);
        const previousDebt = Math.max(0, balanceToDate - periodBalance);

        const paymentRecord = {
            id: paymentId,
            studentId: newPayment.studentId,
            studentName: selectedStudent.name,
            period: newPayment.period,
            date: newPayment.date,
            concept: newPayment.concept || `Cuota de ${newPayment.period}`,
            method: newPayment.method,
            amount: amountPaid,
            receiptNo,
            inscripcionPaid,
            cuotaPaid,
            excessPaid: Math.max(0, amountPaid - (inscripcionPaid + cuotaPaid)),
            periodExpected: totalExpectedForPeriod,
            periodBalance,
            previousDebt,
            balanceToDate,
            cuotaValue: valorCuota
        };

        try {
            await set(ref(rtdb, `pagos/${paymentId}`), paymentRecord);
            addNotification(`Pago registrado para ${selectedStudent.name}`, "success");
            setActiveReceipt(paymentRecord);
            setNewPayment(prev => ({
                ...prev,
                concept: "Mensualidad",
                receiptNo: ""
            }));
            setStudentSelectSearch("");
        } catch (err) {
            addNotification("Error guardando pago", "error");
        }
    };

    const handleDeletePayment = async (id) => {
        try {
            await remove(ref(rtdb, `pagos/${id}`));
            addNotification("Pago eliminado", "info");
        } catch (err) {
            addNotification("Error al eliminar pago", "error");
        }
    };

    const handleAddAnnouncement = async () => {
        const text = prompt("Introduce el contenido del aviso:");
        if (!text) return;
        
        const announceId = `aviso-${Date.now()}`;
        const newAviso = {
            id: announceId,
            text,
            date: new Date().toISOString(),
            authorName: currentUser.nombre,
            authorId: currentUser.id || currentUser.dni,
            sede: isDirector ? "Global" : globalSede
        };

        try {
            await set(ref(rtdb, `config/announcements/${announceId}`), newAviso);
            addNotification("Aviso publicado", "success");
        } catch (err) {
            addNotification("Error al guardar aviso", "error");
        }
    };

    const handleEditAnnouncement = async (aviso) => {
        const text = prompt("Edita el contenido del aviso:", aviso.text);
        if (text === null) return;
        if (!text.trim()) {
            handleDeleteAnnouncement(aviso.id);
            return;
        }
        try {
            await update(ref(rtdb, `config/announcements/${aviso.id}`), { text });
            addNotification("Aviso actualizado", "success");
        } catch (err) {
            addNotification("Error al actualizar aviso", "error");
        }
    };

    const handleDeleteAnnouncement = async (id) => {
        if (!window.confirm("¿Seguro que deseas eliminar este aviso?")) return;
        try {
            await remove(ref(rtdb, `config/announcements/${id}`));
            addNotification("Aviso eliminado", "info");
        } catch (err) {
            addNotification("Error al eliminar aviso", "error");
        }
    };

    const handleSendReminder = (studentTarget = null) => {
        const targetStudent = studentTarget?.id ? studentTarget : selectedStudentDetail;
        if (!targetStudent || !targetStudent.email) {
            addNotification("El alumno no tiene un correo registrado.", "error");
            return;
        }

        try {
            let missingPeriods = [];
            let valorCuota = 0;
            
            if (targetStudent.id === selectedStudentDetail?.id && activeStudentStats) {
                missingPeriods = activeStudentStats.missingPeriods;
                valorCuota = activeStudentStats.valorCuota;
            } else {
                const sId = targetStudent.id;
                const sPayments = activePayments.filter(p => p.studentId === sId);
                const levelConfig = configLevels.find(c => c.curso_nivel === targetStudent.level) || configLevels.find(c => c.curso_nivel === targetStudent.taller);
                const mCuota = targetStudent.cuotaOverride !== undefined && targetStudent.cuotaOverride !== "" ? Number(targetStudent.cuotaOverride) : (levelConfig?.cuota || 25000);
                valorCuota = mCuota;

                const sPaymentsForMonthly = sPayments.filter(p => p.period !== "Examen");
                let remainingPaid = sPaymentsForMonthly.reduce((sum, p) => sum + p.amount, 0);

                let startMonthIdx = 2; 
                if (targetStudent.fecha_inicio) {
                    const startMonthStr = targetStudent.fecha_inicio.split('-')[1];
                    if (startMonthStr) {
                        startMonthIdx = parseInt(startMonthStr, 10) - 1;
                        startMonthIdx = Math.max(2, Math.min(11, startMonthIdx));
                    }
                }

                const currentYear = new Date().getFullYear();
                let expectedIdx = startMonthIdx;
                for (let i = startMonthIdx; i < MONTHS_ORDER.length; i++) {
                    const isEnrollmentMonth = (i === startMonthIdx);
                    const hist = getHistoricalValues(levelConfig, i, currentYear);
                    const tInsc = targetStudent.inscripcionOverride !== undefined && targetStudent.inscripcionOverride !== "" ? Number(targetStudent.inscripcionOverride) : hist.inscripcion;
                    const tCuota = targetStudent.cuotaOverride !== undefined && targetStudent.cuotaOverride !== "" ? Number(targetStudent.cuotaOverride) : hist.cuota;
                    
                    const expectedForThisMonth = isEnrollmentMonth ? (tInsc + tCuota) : tCuota;
                    
                    if (remainingPaid >= expectedForThisMonth) {
                        remainingPaid -= expectedForThisMonth;
                        expectedIdx++;
                    } else {
                        break;
                    }
                }

                const currentMonthIdx = new Date().getMonth();
                for (let i = expectedIdx; i <= currentMonthIdx; i++) {
                    if (i >= startMonthIdx && i < MONTHS_ORDER.length) {
                        missingPeriods.push(MONTHS_ORDER[i]);
                    }
                }
                if (missingPeriods.length === 0) missingPeriods.push("Deuda parcial o matrículas");
            }

            const debtValue = studentDebts[targetStudent.id] || 0;
            const cuerpoText = `Hola.\n\nNos comunicamos desde el Instituto para el Desarrollo del Arte (IDeAr).\n\nLe informamos que, al día de la fecha, la alumna/o ${targetStudent.name} registra un saldo pendiente de $${debtValue.toLocaleString()}, correspondiente a las cuotas/conceptos impagos de: ${missingPeriods.join(', ')}.\n\nLe recordamos que el valor de la cuota mensual es de $${valorCuota.toLocaleString()}.\n\nSi el pago ya fue realizado recientemente, le solicitamos desestimar este mensaje o, si corresponde, enviarnos el comprobante para actualizar nuestros registros.\n\nAnte cualquier consulta, quedamos a su disposición.\n\nMuchas gracias.\n\nSaludos cordiales,\nEquipo IDeAr - Sede ${targetStudent.sede}`;

            setReminderPreview({
                targetStudent,
                email: targetStudent.email,
                asunto: 'Recordatorio de Pago - Instituto IDeAr',
                cuerpo: cuerpoText
            });
        } catch (error) {
            console.error("Error armando recordatorio:", error);
            addNotification("Error al procesar el recordatorio.", "error");
        }
    };

    const handleConfirmSendReminder = async (editedEmail, editedAsunto, editedCuerpo) => {
        if (!reminderPreview) return;
        const { targetStudent } = reminderPreview;

        setIsSendingEmail(true);

        try {
            const payload = {
                email: editedEmail,
                asunto: editedAsunto,
                cuerpo: editedCuerpo
            };

            const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwv_BLt6KWt-e6pvzKIHbOx95OsdAIT0dbaAVqUJC9tCv7Jm602PkWxjv3hC7473sVT/exec";

            await fetch(GOOGLE_SCRIPT_URL, {
                method: "POST",
                mode: "no-cors",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload)
            });
            
            const currentPeriod = new Date().toISOString().substring(0, 7);
            await update(ref(rtdb, 'alumnos/' + targetStudent.id), { lastReminderPeriod: currentPeriod });

            if (selectedStudentDetail && selectedStudentDetail.id === targetStudent.id) {
                setSelectedStudentDetail(prev => ({ ...prev, lastReminderPeriod: currentPeriod }));
            }

            addNotification("¡Recordatorio enviado con éxito!", "success");
            setReminderPreview(null);
        } catch (error) {
            console.error("Error enviando recordatorio:", error);
            addNotification("Error al intentar enviar el recordatorio.", "error");
        } finally {
            setIsSendingEmail(false);
        }
    };

    const isDirector = useMemo(() => currentUser?.dni === 'admin', [currentUser]);

    const getIsStudentActive = (s) => !!s.active;

    const visibleAnnouncements = useMemo(() => {
        return announcements
            .filter(a => a.sede === "Global" || a.sede === globalSede)
            .sort((a, b) => b.date.localeCompare(a.date));
    }, [announcements, globalSede]);

    const unreadAnnouncementsCount = useMemo(() => {
        return visibleAnnouncements.filter(a => new Date(a.date).getTime() > lastReadTime).length;
    }, [visibleAnnouncements, lastReadTime]);

    const studentsForAttendance = useMemo(() => {
        return students.filter(s => {
            if (!s.active) return false;
            return attendanceNivel === "Todos" || s.level === attendanceNivel;
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [students, attendanceNivel]);

    const daysInMonth = useMemo(() => {
        const year = new Date().getFullYear();
        const numDays = new Date(year, attendanceMonthIdx + 1, 0).getDate();
        const list = [];
        for (let i = 1; i <= numDays; i++) {
            const d = new Date(year, attendanceMonthIdx, i);
            const dateStr = `${year}-${String(attendanceMonthIdx + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            list.push({ dayNum: i, dayOfWeek: d.getDay(), dateStr });
        }
        return list;
    }, [attendanceMonthIdx]);

    const studentsForGrades = useMemo(() => {
        return students.filter(s => {
            if (!s.active) return false;
            return gradesNivel === "Todos" || s.level === gradesNivel;
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [students, gradesNivel]);

    const currentLevelColumns = useMemo(() => {
        return gradeColumns[gradesNivel] || [];
    }, [gradeColumns, gradesNivel]);

    const studentsForMesas = useMemo(() => {
        return students.filter(s => {
            if (!s.active) return false;
            if (mesasSede !== "Todas" && s.sede !== mesasSede) return false;
            if (mesasNivel !== "Todos") return s.level === mesasNivel || s.promocionadoDe === mesasNivel;
            const validPrefixes = ["1er", "1ro", "2do", "3er", "Diploma", "Profesorado"];
            return validPrefixes.some(prefix => (s.level || "").startsWith(prefix));
        });
    }, [students, mesasSede, mesasNivel]);

    const currentMesasColumns = useMemo(() => mesasColumns || [], [mesasColumns]);

    const activePayments = useMemo(() => {
        const activeStudentIds = new Set(students.map(s => s.id));
        return payments
            .filter(p => activeStudentIds.has(p.studentId))
            .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    }, [payments, students]);

    const suggestedAmount = useMemo(() => {
        const studentObj = students.find(s => s.id === newPayment.studentId);
        if (!studentObj) return 25000;

        const levelConfig = configLevels.find(c => c.curso_nivel === studentObj.level)
                            || configLevels.find(c => c.curso_nivel === studentObj.taller);

        const valorInscripcion = studentObj.inscripcionOverride !== undefined && studentObj.inscripcionOverride !== "" 
                                 ? Number(studentObj.inscripcionOverride) 
                                 : (levelConfig?.inscripcion || 20000);
        const valorCuota = studentObj.cuotaOverride !== undefined && studentObj.cuotaOverride !== "" 
                           ? Number(studentObj.cuotaOverride) 
                           : (levelConfig?.cuota || 25000);

        if (newPayment.period === "Matrícula") return valorInscripcion;
        if (newPayment.period === "Examen") return levelConfig?.examen || 45000;

        const currentYear = new Date().getFullYear();
        const targetMonthIdx = MONTHS_ORDER.indexOf(newPayment.period);
        if (targetMonthIdx === -1) return valorCuota;
        
        const hist = getHistoricalValues(levelConfig, targetMonthIdx, currentYear);
        return studentObj.cuotaOverride !== undefined && studentObj.cuotaOverride !== "" ? Number(studentObj.cuotaOverride) : hist.cuota;
    }, [newPayment.studentId, newPayment.period, configLevels, students]);

    useEffect(() => {
        setNewPayment(prev => ({ ...prev, amount: suggestedAmount }));
    }, [newPayment.studentId, newPayment.period, suggestedAmount]);

    useEffect(() => {
        if (configLevels.length > 0) {
            const exists = configLevels.some(c => c.curso_nivel === attendanceNivel);
            if (!exists && attendanceNivel !== "Todos") {
                setAttendanceNivel(configLevels[0].curso_nivel);
            }
        }
    }, [configLevels, attendanceNivel]);

    const paymentMissingPeriods = useMemo(() => {
        if (!newPayment.studentId) return PERIODOS;
        const student = students.find(s => s.id === newPayment.studentId);
        if (!student) return PERIODOS;

        const currentYear = new Date().getFullYear();
        const currentMonthIdx = new Date().getMonth();
        
        let startYear = currentYear;
        let startMonthIdx = 2;
        if (student.fecha_inicio) {
            const parts = student.fecha_inicio.split('-');
            if (parts.length >= 2) {
                startYear = parseInt(parts[0], 10);
                startMonthIdx = Math.max(2, parseInt(parts[1], 10) - 1);
            }
        }

        const sPayments = payments.filter(p => p.studentId === student.id && p.period !== 'Examen');
        let remainingPaid = sPayments.reduce((sum, p) => sum + p.amount, 0);
        
        const missing = [];
        for (let year = startYear; year <= currentYear; year++) {
            const monthStart = (year === startYear) ? startMonthIdx : 2;
            let monthEnd = (year < currentYear) ? 11 : currentMonthIdx;
            
            if (!student.active && student.fecha_baja) {
                const bajaP = student.fecha_baja.split('-');
                if (bajaP.length >= 2) {
                    const bYear = parseInt(bajaP[0], 10);
                    const bMonth = parseInt(bajaP[1], 10) - 1;
                    if (bYear < year) break;
                    if (bYear === year) monthEnd = Math.min(monthEnd, bMonth);
                }
            }

            for (let i = monthStart; i <= monthEnd; i++) {
                if (isMonthInactive(year, i, student.historial_bajas)) continue;
                const mName = `${MONTHS_ORDER[i]} ${year}`;
                
                const levelConfig = configLevels.find(c => c.curso_nivel === student.level)
                                  || configLevels.find(c => c.curso_nivel === student.taller);
                const hist = getHistoricalValues(levelConfig, i, year);
                const mInsc = student.inscripcionOverride !== undefined && student.inscripcionOverride !== "" ? Number(student.inscripcionOverride) : hist.inscripcion;
                const mCuota = student.cuotaOverride !== undefined && student.cuotaOverride !== "" ? Number(student.cuotaOverride) : hist.cuota;
                
                const isEnrollment = (year === startYear && i === monthStart);
                const expectedCost = isEnrollment ? (mInsc + mCuota) : mCuota;

                if (remainingPaid >= expectedCost) {
                    remainingPaid -= expectedCost;
                } else {
                    missing.push(mName);
                }
            }
        }
        return missing.length > 0 ? [...missing, "Matrícula", "Examen"] : ["Matrícula", "Examen", ...PERIODOS];
    }, [newPayment.studentId, students, payments, configLevels]);

    useEffect(() => {
        if (newPayment.studentId) {
            const studentObj = students.find(s => s.id === newPayment.studentId);
            if (studentObj) {
                setStudentSelectSearch(studentObj.name);
                const nextPeriod = paymentMissingPeriods[0] || "Matrícula";
                const isEnrollmentMonthNext = (nextPeriod === paymentMissingPeriods[0] && paymentMissingPeriods[0]?.includes(MONTHS_ORDER[2]));
                const suggestedConcept = nextPeriod === "Matrícula"
                    ? "Inscripción"
                    : nextPeriod === "Examen"
                    ? "Derecho de Examen"
                    : isEnrollmentMonthNext 
                    ? `Inscripción y Cuota de ${nextPeriod}` 
                    : `Cuota de ${nextPeriod}`;

                const config = sedes.find(s => s.nombre === globalSede) || { prefix: "00002", base: 1 };
                const nextSeq = config.base + activePayments.length;
                const generatedReceiptNo = `${config.prefix}-${String(nextSeq).padStart(8, '0')}`;
                
                setNewPayment(prev => ({
                    ...prev,
                    period: nextPeriod,
                    concept: suggestedConcept,
                    receiptNo: generatedReceiptNo
                }));
            }
        } else {
            setStudentSelectSearch("");
            setNewPayment(prev => ({ ...prev, receiptNo: "" }));
        }
    }, [newPayment.studentId, students, paymentMissingPeriods, globalSede, activePayments.length, sedes]);

    useEffect(() => {
        setNewPayment(prev => ({ ...prev, studentId: "" }));
        setStudentSelectSearch("");
    }, [globalSede]);

    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            const matchesSearch = s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.dni.includes(studentSearch);
            const matchesNivel = studentNivelFilter === "Todos" || s.level === studentNivelFilter;
            const isActive = getIsStudentActive(s);
            const matchesStatus = alumnoStatusTab === "todos" ? true : (alumnoStatusTab === "activos" ? isActive : !isActive);
            return matchesSearch && matchesNivel && matchesStatus;
        }).sort((a, b) => {
            const aActive = getIsStudentActive(a);
            const bActive = getIsStudentActive(b);
            if (aActive !== bActive) return aActive ? -1 : 1;
            if (a.level !== b.level) return (a.level || '').localeCompare(b.level || '');
            return (a.name || '').localeCompare(b.name || '');
        });
    }, [students, studentSearch, studentNivelFilter, alumnoStatusTab]);

    const studentDebts = useMemo(() => {
        const debts = {};
        const currentMonthIdx = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        students.forEach(student => {
            let startMonthIdx = 2; // Marzo por defecto
            let startYear = currentYear;

            if (student.fecha_inicio) {
                const parts = student.fecha_inicio.split('-');
                if (parts.length >= 2) {
                    startYear = parseInt(parts[0], 10);
                    startMonthIdx = Math.max(2, parseInt(parts[1], 10) - 1);
                }
            }

            const studentPayments = payments.filter(p => p.studentId === student.id && p.period !== 'Examen');
            const totalPaid = studentPayments.reduce((sum, p) => sum + p.amount, 0);

            let totalExpected = 0;
            for (let year = startYear; year <= currentYear; year++) {
                const monthStart = (year === startYear) ? startMonthIdx : 2;
                let monthEnd = (year < currentYear) ? 11 : currentMonthIdx;

                if (!student.active && student.fecha_baja) {
                    const bajaP = student.fecha_baja.split('-');
                    if (bajaP.length >= 2) {
                        const bYear = parseInt(bajaP[0], 10);
                        const bMonth = parseInt(bajaP[1], 10) - 1;
                        if (bYear < year) break;
                        if (bYear === year) monthEnd = Math.min(monthEnd, bMonth);
                    }
                }

                for (let i = monthStart; i <= monthEnd; i++) {
                    if (isMonthInactive(year, i, student.historial_bajas)) continue;
                    
                    const levelConfig = configLevels.find(c => c.curso_nivel === student.level)
                                      || configLevels.find(c => c.curso_nivel === student.taller);
                    const hist = getHistoricalValues(levelConfig, i, year);
                    const mInsc = student.inscripcionOverride !== undefined && student.inscripcionOverride !== "" ? Number(student.inscripcionOverride) : hist.inscripcion;
                    const mCuota = student.cuotaOverride !== undefined && student.cuotaOverride !== "" ? Number(student.cuotaOverride) : hist.cuota;
                    
                    totalExpected += (year === startYear && i === monthStart) ? (mInsc + mCuota) : mCuota;
                }
            }
            debts[student.id] = Math.max(0, totalExpected - totalPaid);
        });
        return debts;
    }, [students, payments, configLevels]);

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

    const chartData = useMemo(() => {
        const months = ["Marzo", "Abril", "Mayo", "Junio", "Julio"];
        return months.map(m => {
            const total = activePayments.filter(p => p.period === m).reduce((sum, p) => sum + p.amount, 0);
            return { month: m, total };
        });
    }, [activePayments]);

    const stats = useMemo(() => {
        const totalAlumnos = students.filter(s => getIsStudentActive(s)).length;
        const currentMonthString = "Mayo"; 
        const totalRecaudadoMes = activePayments.filter(p => p.period === currentMonthString).reduce((sum, p) => sum + p.amount, 0);

        const totalAssists = attendance.length;
        const totalPresents = attendance.filter(a => a.status === "P" || a.status === "present").length;
        const assistRate = totalAssists > 0 ? Math.round((totalPresents / totalAssists) * 100) : 0;

        const paidThisMonthStudentIds = new Set(activePayments.filter(p => p.period === "Mayo").map(p => p.studentId));
        let deudores = students.filter(s => getIsStudentActive(s) && !paidThisMonthStudentIds.has(s.id));
        deudores.sort((a, b) => (studentDebts[b.id] || 0) - (studentDebts[a.id] || 0));

        return {
            totalAlumnos,
            totalRecaudadoMes,
            assistRate,
            totalDeudores: deudores.length,
            deudoresList: deudores.slice(0, 10) 
        };
    }, [students, activePayments, attendance, studentDebts]);

    const sedeProfesor = useMemo(() => {
        if (!currentUser || currentUser.dni !== 'admin') return null;
        return users.find(u => u.sede === globalSede && u.dni !== 'admin') || null;
    }, [currentUser, users, globalSede]);

    const activeStudentStats = useMemo(() => {
        if (!selectedStudentDetail) return null;
        const sId = selectedStudentDetail.id;
        
        const sPayments = activePayments.filter(p => p.studentId === sId);
        const sAttendance = attendance.filter(a => a.studentId === sId);

        const totalClasses = sAttendance.length;
        const presents = sAttendance.filter(a => a.status === "P" || a.status === "present").length;
        const excused = sAttendance.filter(a => a.status === "J").length;
        const absents = sAttendance.filter(a => a.status === "A" || a.status === "absent").length;
        
        const attendanceRate = totalClasses > 0 ? Math.round((presents / totalClasses) * 100) : 100;

        const levelConfig = configLevels.find(c => c.curso_nivel === selectedStudentDetail.level) 
                            || configLevels.find(c => c.curso_nivel === selectedStudentDetail.taller);
        const valorInscripcion = selectedStudentDetail.inscripcionOverride !== undefined && selectedStudentDetail.inscripcionOverride !== "" ? Number(selectedStudentDetail.inscripcionOverride) : (levelConfig?.inscripcion || 20000);
        const valorCuota = selectedStudentDetail.cuotaOverride !== undefined && selectedStudentDetail.cuotaOverride !== "" ? Number(selectedStudentDetail.cuotaOverride) : (levelConfig?.cuota || 25000);

        let startYear = new Date().getFullYear();
        let startMonthIdx = 2; 
        if (selectedStudentDetail.fecha_inicio) {
            const parts = selectedStudentDetail.fecha_inicio.split('-');
            if (parts.length >= 2) {
                startYear = parseInt(parts[0], 10);
                startMonthIdx = parseInt(parts[1], 10) - 1;
                startMonthIdx = Math.max(2, Math.min(11, startMonthIdx));
            }
        }

        const currentYear = new Date().getFullYear();
        const currentMonthIdx = new Date().getMonth();

        let bajaYear = null;
        let bajaMonthIdx = null;
        if (!selectedStudentDetail.active && selectedStudentDetail.fecha_baja) {
            const partsBaja = selectedStudentDetail.fecha_baja.split('-');
            if (partsBaja.length >= 2) {
                bajaYear = parseInt(partsBaja[0], 10);
                bajaMonthIdx = parseInt(partsBaja[1], 10) - 1;
            }
        }

        const sPaymentsForMonthly = sPayments.filter(p => p.period !== "Examen");
        let remainingTotalPaid = sPaymentsForMonthly.reduce((sum, p) => sum + p.amount, 0);

        const yearlyBreakdown = [];
        const allPaidPeriods = [];
        const allExpectedPeriods = [];

        for (let year = startYear; year <= currentYear; year++) {
            const monthStart = (year === startYear) ? startMonthIdx : 2;
            let monthEnd = (year < currentYear) ? 11 : currentMonthIdx;

            if (year < currentYear) {
                if (bajaYear === year && bajaMonthIdx !== null) {
                    monthEnd = Math.min(11, bajaMonthIdx);
                }
            } else {
                if (bajaYear === year && bajaMonthIdx !== null) {
                    monthEnd = Math.min(currentMonthIdx, bajaMonthIdx);
                }
            }

            if (bajaYear !== null && bajaYear < year && !selectedStudentDetail.active) break;

            const yearMonths = [];
            const yearPaidMonths = [];
            const yearMissingMonths = [];
            let yearExpectedCost = 0;
            let yearAllocatedPaid = 0;

            for (let i = monthStart; i <= monthEnd; i++) {
                if (isMonthInactive(year, i, selectedStudentDetail.historial_bajas)) continue;

                const monthName = `${MONTHS_ORDER[i]} ${year}`;
                yearMonths.push(monthName);
                allExpectedPeriods.push(monthName);

                const hist = getHistoricalValues(levelConfig, i, year);
                const mInsc = selectedStudentDetail.inscripcionOverride !== undefined && selectedStudentDetail.inscripcionOverride !== "" ? Number(selectedStudentDetail.inscripcionOverride) : hist.inscripcion;
                const mCuota = selectedStudentDetail.cuotaOverride !== undefined && selectedStudentDetail.cuotaOverride !== "" ? Number(selectedStudentDetail.cuotaOverride) : hist.cuota;
                
                const isEnrollment = (year === startYear && i === monthStart);
                const expectedCost = isEnrollment ? (mInsc + mCuota) : mCuota;
                yearExpectedCost += expectedCost;

                if (remainingTotalPaid >= expectedCost) {
                    yearAllocatedPaid += expectedCost;
                    remainingTotalPaid -= expectedCost;
                    yearPaidMonths.push(monthName);
                    allPaidPeriods.push(monthName);
                } else {
                    if (remainingTotalPaid > 0) {
                        yearAllocatedPaid += remainingTotalPaid;
                        remainingTotalPaid = 0;
                    }
                    yearMissingMonths.push(monthName);
                }
            }

            if (yearMonths.length > 0) {
                yearlyBreakdown.push({
                    year,
                    months: yearMonths,
                    paidMonths: yearPaidMonths,
                    missingMonths: yearMissingMonths,
                    totalExpected: yearExpectedCost,
                    totalPaid: yearAllocatedPaid,
                    debt: Math.max(0, yearExpectedCost - yearAllocatedPaid),
                    monthCount: yearMonths.length,
                    includesInscripcion: (year === startYear)
                });
            }
        }

        const missingPeriods = allExpectedPeriods.filter(p => !allPaidPeriods.includes(p));

        return {
            payments: sPayments,
            attendance: sAttendance,
            presents,
            excused,
            absents,
            attendanceRate,
            missingPeriods,
            paidPeriods: allPaidPeriods,
            valorCuota,
            valorInscripcion,
            expectedPeriods: allExpectedPeriods,
            yearlyBreakdown
        };
    }, [selectedStudentDetail, activePayments, attendance, configLevels]);

    if (publicReceipt) {
        return <PublicReceipt 
            publicReceipt={publicReceipt}
            configLevels={configLevels}
            students={students}
            globalSede={globalSede || "Leandro N. Alem"}
            generalConfig={generalConfig}
        />;
    }

    if (!globalSede) {
        return (
            <LoginSedeModal
                tempSede={tempSede}
                setTempSede={setTempSede}
                authDni={authDni}
                setAuthDni={setAuthDni}
                authPassword={authPassword}
                setAuthPassword={setAuthPassword}
                authNombre={authNombre}
                setAuthNombre={setAuthNombre}
                setIsFirstTime={setIsFirstTime}
                hasAdmin={hasAdmin}
                loading={loading}
                handleAuthSubmit={handleAuthSubmit}
                notifications={notifications}
                sedes={sedes}
                currentUser={currentUser}
                setGlobalSede={setGlobalSede}
                addNotification={addNotification}
            />
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-stone-900 flex items-center justify-center">
                <div className="text-white text-lg font-bold flex items-center gap-3">
                    <i className="fas fa-spinner fa-spin text-2xl text-amber-500"></i> Cargando Sede...
                </div>
            </div>
        );
    }

    if (currentUser?.rol === 'Alumno') {
        return (
            <>
                <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 no-print">
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
                <StudentDashboard
                    currentUser={currentUser}
                    students={students}
                    payments={payments}
                    attendance={attendance}
                    grades={grades}
                    gradeColumns={gradeColumns}
                    mesasGrades={mesasGrades}
                    mesasColumns={mesasColumns}
                    configLevels={configLevels}
                    announcements={announcements}
                    generalConfig={generalConfig}
                    globalSede={globalSede}
                    sedes={sedes}
                    NIVELES={NIVELES}
                    addNotification={addNotification}
                    handleLogout={handleLogout}
                    setBoletinStudent={setBoletinStudent}
                    setShowBoletin={setShowBoletin}
                    setActiveReceipt={setActiveReceipt}
                />
                {showBoletin && boletinStudent && (
                    <BoletinModal
                        student={boletinStudent}
                        sedeObj={sedes.find(s => s.nombre === globalSede)}
                        grades={grades}
                        gradeColumns={gradeColumns[boletinStudent.level] || []}
                        mesasGrades={mesasGrades}
                        mesasColumns={mesasColumns}
                        attendance={attendance}
                        profesorName={generalConfig?.profesor || ''}
                        onClose={() => { setShowBoletin(false); setBoletinStudent(null); }}
                    />
                )}
                {activeReceipt && (
                    <ReceiptModal
                        activeReceipt={activeReceipt}
                        configLevels={configLevels}
                        students={students}
                        globalSede={globalSede}
                        generalConfig={generalConfig}
                        onClose={() => setActiveReceipt(null)}
                        isSendingEmail={isSendingEmail}
                        setIsSendingEmail={setIsSendingEmail}
                        addNotification={addNotification}
                        isStudent={true}
                    />
                )}
            </>
        );
    }

    return (
        <div className="min-h-screen bg-stone-50 flex flex-col font-sans pb-16 sm:pb-0">
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 no-print">
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
                        {currentUser && (
                            currentUser.sede === "Leandro N. Alem" || 
                            (currentUser.sede ? currentUser.sede.split(',').length > 1 : false)
                        ) && (
                            <button
                                onClick={() => { setGlobalSede(""); localStorage.removeItem('idear_sede'); }}
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
                            className="bg-rose-600 hover:bg-rose-700 text-white text-xs px-2.5 py-2 rounded-xl font-medium transition-all cursor-pointer border-0 flex items-center gap-1"
                        >
                            <i className="fas fa-sign-out-alt"></i>
                            <span className="hidden sm:inline">Salir</span>
                        </button>
                    </div>
                </div>
            </header>

            <nav className="hidden sm:block bg-white border-b border-stone-200 shadow-sm sticky top-0 z-40 no-print">
                <div className="max-w-7xl mx-auto px-4 overflow-x-auto flex space-x-1 sm:space-x-4">
                    {[
                        { id: "dashboard",   icon: "fa-chart-pie",            label: "Panel" },
                        { id: "asistencias", icon: "fa-calendar-check",       label: "Asistencia" },
                        { id: "calificaciones", icon: "fa-star",              label: "Calificaciones" },
                        { id: "pagos",       icon: "fa-file-invoice-dollar",  label: "Cobros" },
                        { id: "alumnos",     icon: "fa-user-graduate",         label: "Alumnos" },
                        { id: "perfil",      icon: "fa-user-circle",           label: "Mi Perfil" },
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setCurrentTab(t.id)}
                            className={`py-4 px-3 sm:px-5 border-b-2 font-semibold text-sm transition-all whitespace-nowrap flex items-center gap-2 border-t-0 border-x-0 cursor-pointer bg-transparent ${
                                currentTab === t.id ? "border-amber-500 text-amber-600 font-bold" : "border-transparent text-stone-500 hover:text-stone-800"
                            }`}
                        >
                            <i className={`fas ${t.icon}`}></i> {t.label}
                        </button>
                    ))}
                </div>
            </nav>

            <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-stone-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] no-print safe-area-bottom">
                <div className="grid grid-cols-6 h-16">
                    {[
                        { id: "dashboard",   icon: "fa-chart-pie",           label: "Panel" },
                        { id: "asistencias", icon: "fa-calendar-check",      label: "Asistencia" },
                        { id: "calificaciones", icon: "fa-star",             label: "Notas" },
                        { id: "pagos",       icon: "fa-dollar-sign",          label: "Cobros" },
                        { id: "alumnos",     icon: "fa-users",                label: "Alumnos" },
                        { id: "perfil",      icon: "fa-user-circle",          label: "Perfil" },
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setCurrentTab(t.id)}
                            className={`flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 border-0 cursor-pointer bg-transparent ${
                                currentTab === t.id
                                    ? "text-amber-600 font-bold scale-110"
                                    : "text-stone-500 hover:text-stone-800"
                            }`}
                        >
                            <i className={`fas ${t.icon} text-lg mb-0.5`}></i>
                            <span className="text-[10px] uppercase tracking-wider">{t.label}</span>
                        </button>
                    ))}
                </div>
            </nav>

            <main className="flex-grow max-w-7xl w-full mx-auto px-4 py-6 sm:py-8 sm:px-6 lg:px-8 pb-24 sm:pb-8 no-print">
                {currentTab === "dashboard" && (
                    <DashboardTab
                        currentUser={currentUser}
                        profileUser={currentUser?.dni === 'admin' ? sedeProfesor : currentUser}
                        isDirector={isDirector}
                        unreadAnnouncementsCount={unreadAnnouncementsCount}
                        stats={stats}
                        chartData={chartData}
                        visibleAnnouncements={visibleAnnouncements}
                        setLastReadTime={setLastReadTime}
                        handleAddAnnouncement={handleAddAnnouncement}
                        handleEditAnnouncement={handleEditAnnouncement}
                        handleDeleteAnnouncement={handleDeleteAnnouncement}
                        isSendingEmail={isSendingEmail}
                        handleSendReminder={handleSendReminder}
                        setNewPayment={setNewPayment}
                        setCurrentTab={setCurrentTab}
                        configLevels={configLevels}
                        studentDebts={studentDebts}
                    />
                )}

                {currentTab === "campus" && (
                    <CampusMain
                        currentUser={currentUser}
                        globalSede={globalSede}
                        configLevels={configLevels}
                        generalConfig={generalConfig}
                        gradeColumns={configLevels.length > 0 ? Object.values(configLevels[0].materias || {}) : []}
                        addNotification={addNotification}
                    />
                )}

                {currentTab === "asistencias" && (
                    <AttendanceTab
                        attendanceNivel={attendanceNivel}
                        setAttendanceNivel={setAttendanceNivel}
                        attendanceMonthIdx={attendanceMonthIdx}
                        setAttendanceMonthIdx={setAttendanceMonthIdx}
                        configLevels={configLevels}
                        studentsForAttendance={studentsForAttendance}
                        daysInMonth={daysInMonth}
                        attendance={attendance}
                        handleToggleCell={handleToggleCell}
                    />
                )}

                {currentTab === "calificaciones" && (
                    <GradesTab
                        isDirector={isDirector}
                        tipoEvaluacion={tipoEvaluacion}
                        setTipoEvaluacion={setTipoEvaluacion}
                        gradesNivel={gradesNivel}
                        setGradesNivel={setGradesNivel}
                        configLevels={configLevels}
                        studentsForGrades={studentsForGrades}
                        currentLevelColumns={currentLevelColumns}
                        handleEditGradeColumn={handleEditGradeColumn}
                        handleAddGradeColumn={handleAddGradeColumn}
                        grades={grades}
                        handleUpdateGrade={handleUpdateGrade}
                        mesasNivel={mesasNivel}
                        setMesasNivel={setMesasNivel}
                        mesasSede={mesasSede}
                        setMesasSede={setMesasSede}
                        sedes={sedes}
                        studentsForMesas={studentsForMesas}
                        currentMesasColumns={currentMesasColumns}
                        handleEditMesasColumn={handleEditMesasColumn}
                        handleAddMesasColumn={handleAddMesasColumn}
                        mesasGrades={mesasGrades}
                        handleToggleMesasStudent={handleToggleMesasStudent}
                        handleUpdateMesasGrade={handleUpdateMesasGrade}
                        handleUndoPromoteStudent={handleUndoPromoteStudent}
                        handlePromoteStudent={handlePromoteStudent}
                        setHistorialStudent={setHistorialStudent}
                        setShowHistorialModal={setShowHistorialModal}
                        setBoletinStudent={setBoletinStudent}
                        setShowBoletin={setShowBoletin}
                        NIVELES={NIVELES}
                    />
                )}

                {currentTab === "pagos" && (
                    <PaymentsTab
                        handleRegisterPayment={handleRegisterPayment}
                        studentSelectSearch={studentSelectSearch}
                        setStudentSelectSearch={setStudentSelectSearch}
                        isStudentDropdownOpen={isStudentDropdownOpen}
                        setIsStudentDropdownOpen={setIsStudentDropdownOpen}
                        newPayment={newPayment}
                        setNewPayment={setNewPayment}
                        students={students}
                        paymentMissingPeriods={paymentMissingPeriods}
                        METODOS_PAGO={METODOS_PAGO}
                        filteredPayments={filteredPayments}
                        paymentFilter={paymentFilter}
                        setPaymentFilter={setPaymentFilter}
                        setActiveReceipt={setActiveReceipt}
                        handleDeletePayment={handleDeletePayment}
                        studentDebts={studentDebts}
                        configLevels={configLevels}
                        globalSede={globalSede}
                        generalConfig={generalConfig}
                    />
                )}

                {currentTab === "alumnos" && (
                    <StudentsTab
                        filteredStudents={filteredStudents}
                        studentSearch={studentSearch}
                        setStudentSearch={setStudentSearch}
                        studentNivelFilter={studentNivelFilter}
                        setStudentNivelFilter={setStudentNivelFilter}
                        alumnoStatusTab={alumnoStatusTab}
                        setAlumnoStatusTab={setAlumnoStatusTab}
                        configLevels={configLevels}
                        studentDebts={studentDebts}
                        setSelectedStudentDetail={setSelectedStudentDetail}
                        setEditingStudent={setEditingStudent}
                        setShowStudentModal={setShowStudentModal}
                        handleToggleStudentStatus={handleToggleStudentStatus}
                        handleDeleteStudent={handleDeleteStudent}
                    />
                )}

                {currentTab === "config" && (
                    <div className="space-y-8 animate-fadeIn">
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
                )}

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

            {showStudentModal && (
                <StudentModal
                    editingStudent={editingStudent}
                    globalSede={globalSede}
                    sedes={sedes}
                    configLevels={configLevels}
                    NIVELES={NIVELES}
                    students={students}
                    modalLevel={modalLevel}
                    modalCuota={modalCuota}
                    setModalCuota={setModalCuota}
                    modalInscripcion={modalInscripcion}
                    setModalInscripcion={setModalInscripcion}
                    modalActive={modalActive}
                    setModalActive={setModalActive}
                    modalFechaBaja={modalFechaBaja}
                    setModalFechaBaja={setModalFechaBaja}
                    handleLevelChangeInModal={handleLevelChangeInModal}
                    handleSaveStudent={handleSaveStudent}
                    onClose={() => { setShowStudentModal(false); setEditingStudent(null); }}
                    setEditingStudent={setEditingStudent}
                    addNotification={addNotification}
                />
            )}

            {selectedStudentDetail && activeStudentStats && (
                <StudentDetailModal
                    selectedStudentDetail={selectedStudentDetail}
                    activeStudentStats={activeStudentStats}
                    studentDebts={studentDebts}
                    isSendingEmail={isSendingEmail}
                    handleSendReminder={handleSendReminder}
                    handleDeleteStudent={handleDeleteStudent}
                    handleUpdateProfilePic={async (base64) => {
                        try {
                            await update(ref(rtdb, `alumnos/${selectedStudentDetail.id}`), { profilePic: base64 });
                            setSelectedStudentDetail(prev => ({ ...prev, profilePic: base64 }));
                            addNotification("Foto de perfil actualizada", "success");
                        } catch (e) {
                            addNotification("Error al guardar foto", "error");
                        }
                    }}
                    onOpenBoletin={(student) => {
                        setBoletinStudent(student);
                        setShowBoletin(true);
                    }}
                    onClose={() => setSelectedStudentDetail(null)}
                />
            )}

            {activeReceipt && (
                <ReceiptModal
                    activeReceipt={activeReceipt}
                    configLevels={configLevels}
                    students={students}
                    globalSede={globalSede}
                    generalConfig={generalConfig}
                    onClose={() => setActiveReceipt(null)}
                    isSendingEmail={isSendingEmail}
                    setIsSendingEmail={setIsSendingEmail}
                    addNotification={addNotification}
                />
            )}

            {showHistorialModal && historialStudent && (
                <StudentHistorialModal
                    student={historialStudent}
                    configLevels={configLevels}
                    allLevels={NIVELES}
                    mesasGrades={mesasGrades}
                    mesasColumns={mesasColumns}
                    onClose={() => { setShowHistorialModal(false); setHistorialStudent(null); }}
                    onUpdateGrade={handleUpdateHistorialGrade}
                    onToggleAbsent={handleToggleHistorialStudent}
                    onOpenBoletinHistorial={(student) => {
                        setBoletinHistorialStudent(student);
                        setShowBoletinHistorial(true);
                        setShowAnalitico(false);
                    }}
                    onOpenAnalitico={(student) => {
                        setAnaliticoStudent(student);
                        setShowAnalitico(true);
                        setShowBoletinHistorial(false);
                    }}
                />
            )}

            {showBoletin && boletinStudent && (
                <BoletinModal 
                    student={boletinStudent}
                    sedeObj={sedes.find(s => s.nombre === globalSede)}
                    grades={grades}
                    gradeColumns={gradeColumns[boletinStudent.level] || []}
                    mesasGrades={mesasGrades}
                    mesasColumns={mesasColumns}
                    attendance={attendance}
                    profesorName={generalConfig?.profesor || (currentUser?.dni === 'admin' ? sedeProfesor?.nombre : currentUser?.nombre)}
                    onClose={() => {
                        setShowBoletin(false);
                        setBoletinStudent(null);
                    }}
                />
            )}

            {showBoletinHistorial && boletinHistorialStudent && (
                <BoletinHistorialPreview
                    student={boletinHistorialStudent}
                    sedeObj={sedes.find(s => s.nombre === globalSede)}
                    grades={grades}
                    gradeColumns={gradeColumns}
                    mesasGrades={mesasGrades}
                    mesasColumns={mesasColumns}
                    attendance={attendance}
                    configLevels={configLevels}
                    profesorName={generalConfig?.profesor || (currentUser?.dni === 'admin' ? sedeProfesor?.nombre : currentUser?.nombre)}
                    onClose={() => {
                        setShowBoletinHistorial(false);
                        setBoletinHistorialStudent(null);
                    }}
                />
            )}

            {showAnalitico && analiticoStudent && (
                <CertificadoAnaliticoPreview
                    student={analiticoStudent}
                    sedeObj={sedes.find(s => s.nombre === globalSede)}
                    mesasGrades={mesasGrades}
                    mesasColumns={mesasColumns}
                    configLevels={configLevels}
                    allLevels={NIVELES}
                    profesorName={generalConfig?.profesor || (currentUser?.dni === 'admin' ? sedeProfesor?.nombre : currentUser?.nombre)}
                    onClose={() => {
                        setShowAnalitico(false);
                        setAnaliticoStudent(null);
                    }}
                />
            )}

            {reminderPreview && (
                <ReminderPreviewModal
                    reminderPreview={reminderPreview}
                    onClose={() => setReminderPreview(null)}
                    onConfirm={handleConfirmSendReminder}
                    isSending={isSendingEmail}
                />
            )}

            <footer className="bg-stone-950 text-stone-500 border-t border-stone-800 py-6 mt-12 no-print">
                <div className="max-w-[90rem] mx-auto px-4 flex flex-col justify-center items-center gap-4 text-[10px] sm:text-xs text-center">
                    <div className="space-y-1">
                        <p className="font-bold text-stone-400">© 2026 Instituto para el Desarrollo del Arte (IDeAr) - Misiones, Argentina</p>
                        <p className="text-stone-500">Sede Alem: Cataratas del Iguazú 912 | Sede San Javier | Sede Itacaruaré | Sede Cerro Azul | Sede La Corita | Sede Arroyo del Medio</p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-3">
                        <span>Desarrollado por: <span className="text-stone-300 font-bold">Pedro Turcheñuk</span></span>
                        <span className="hidden sm:inline text-stone-700">&middot;</span>
                        <a href="mailto:ideincom@gmail.com" className="text-blue-500 hover:text-blue-400 transition-colors">ideincom@gmail.com</a>
                        <span className="hidden sm:inline text-stone-700">&middot;</span>
                        <a href="https://wa.me/543754406435" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-400 transition-colors">+54 3754 406435</a>
                        <span className="hidden sm:inline text-stone-700">&middot;</span>
                        <span>IDeIn Computación</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default App;
