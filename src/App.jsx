import React, { useState, useEffect, useMemo } from 'react';
import { SEED_STUDENTS, SEED_PAYMENTS, SEED_ATTENDANCE, SEED_CONFIG, METODOS_PAGO, PERIODOS, NIVELES } from './data/seedData';
import { rtdb } from './config/firebase';
import { ref, set, get, remove, onValue, off, update } from 'firebase/database';
import DashboardRecibos from './components/DashboardRecibos';
import Config from './components/Config';
import PerfilProfesor from './components/PerfilProfesor';

import { formatDate } from './utils/formatters';
import { getHistoricalValues, MONTHS_ORDER } from './utils/mathHelpers';

const getReceiptBreakdown = (receipt, configLevels, students) => {
    const items = [];
    if (!receipt) return items;

    const insc = receipt.inscripcionPaid || 0;
    const cuota = receipt.cuotaPaid || 0;
    const excess = receipt.excessPaid || 0;
    const period = receipt.period;

    if (insc > 0) {
        items.push({
            label: "Matrícula / Inscripción",
            subtitle: `Pago único inicial | Vía ${receipt.method}`,
            amount: insc
        });
    }

    if (cuota > 0) {
        items.push({
            label: `Cuota Mensual (${period})`,
            subtitle: `Servicio de enseñanza | Vía ${receipt.method}`,
            amount: cuota
        });
    }

    if (excess > 0) {
        // Encontrar valorCuota
        let valorCuota = receipt.cuotaValue;
        if (!valorCuota) {
            const studentObj = students?.find(s => s.id === receipt.studentId);
            if (studentObj) {
                const levelConfig = configLevels?.find(c => c.curso_nivel === studentObj.level)
                                    || configLevels?.find(c => c.curso_nivel === studentObj.taller);
                valorCuota = studentObj.cuotaOverride !== undefined && studentObj.cuotaOverride !== "" 
                             ? Number(studentObj.cuotaOverride) 
                             : (levelConfig?.cuota || 25000);
            } else {
                valorCuota = 25000;
            }
        }

        let remainingExcess = excess;
        let currentMonthIdx = Math.max(1, MONTHS_ORDER.indexOf(period));

        while (remainingExcess > 0 && currentMonthIdx < MONTHS_ORDER.length - 1) {
            currentMonthIdx++;
            const nextMonth = MONTHS_ORDER[currentMonthIdx];
            if (remainingExcess >= valorCuota) {
                items.push({
                    label: `Cuota Mensual (${nextMonth})`,
                    subtitle: `Mensualidad | Vía ${receipt.method}`,
                    amount: valorCuota
                });
                remainingExcess -= valorCuota;
            } else {
                items.push({
                    label: `Parte de pago para el mes de ${nextMonth}`,
                    subtitle: `Acreditado automáticamente | Vía ${receipt.method}`,
                    amount: remainingExcess
                });
                remainingExcess = 0;
            }
        }

        if (remainingExcess > 0) {
            items.push({
                label: "Crédito a Favor (Pago Adelantado)",
                subtitle: `Acreditado para períodos futuros | Vía ${receipt.method}`,
                amount: remainingExcess
            });
        }
    }

    // Fallback si no tiene desgloses
    if (items.length === 0) {
        items.push({
            label: receipt.concept || "Mensualidad",
            subtitle: `Período: ${receipt.period} | Vía ${receipt.method}`,
            amount: receipt.amount
        });
    }

    return items;
};

const BoletinPreview = ({ student, sedeObj, grades, gradeColumns, mesasGrades, mesasColumns, attendance, onClose, profesorName }) => {
    const attRecords = attendance.filter(a => a.studentId === student.id);
    const presentCount = attRecords.filter(a => a.status === 'present').length;
    const absentCount = attRecords.filter(a => a.status === 'absent').length;
    const totalAtt = presentCount + absentCount;
    const percentage = totalAtt > 0 ? Math.round((presentCount / totalAtt) * 100) : 0;

    const studentGrades = grades.filter(g => g.studentId === student.id);
    const studentMesasGrades = mesasGrades.filter(g => g.studentId === student.id);

    return (
        <div className="fixed inset-0 bg-stone-900/80 z-[100] flex flex-col print:absolute print:bg-white print:inset-0">
            <div className="flex justify-end p-4 gap-4 bg-stone-900 shadow-xl no-print">
                <button onClick={() => window.print()} className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-xl font-bold shadow-md transition-all flex items-center gap-2">
                    <i className="fas fa-print"></i> Imprimir Boletín
                </button>
                <button onClick={onClose} className="bg-stone-700 hover:bg-stone-600 text-white px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2">
                    <i className="fas fa-times"></i> Cerrar
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center print:overflow-visible print:p-0 print:block">
                <div id="boletin-print-area" className="bg-white text-stone-900 p-8 max-w-[210mm] w-full mx-auto shadow-2xl relative min-h-[297mm] print:min-h-0 print:shadow-none print:m-0 print:max-w-none print:w-full flex flex-col">
                    <div>
                        <div className="flex justify-between items-center border-b-2 border-stone-800 pb-2 mb-2 w-full gap-2">
                            <div className="flex flex-col items-start whitespace-nowrap">
                                <img src="/logo_1.png" alt="Portal IDeAr" className="h-10 object-contain mb-0.5" />
                                <p className="text-[7px] font-bold text-stone-400">Registro SPEPM 213/21</p>
                            </div>
                            
                            <div className="flex flex-col items-center justify-center text-center px-2">
                                <p className="text-[8px] font-bold text-stone-500 uppercase tracking-widest flex items-center justify-center gap-1 leading-none">SEDE: <span className="text-amber-700 text-lg font-black">{sedeObj?.nombre || student.sede}</span></p>
                                {profesorName && <p className="text-[10px] font-black text-stone-800 uppercase mt-1 leading-none"><span className="text-[8px] font-bold text-stone-500 mr-1 tracking-widest">PROF.:</span>{profesorName}</p>}
                            </div>

                            <div className="flex flex-col items-end text-right whitespace-nowrap">
                                <p className="text-[9px] font-bold text-stone-800 leading-none">Ciclo Lectivo {new Date().getFullYear()}</p>
                                <p className="text-[8px] text-stone-500 font-semibold mt-1 leading-none">Fecha Examen: {new Date().toLocaleDateString('es-AR')}</p>
                            </div>
                        </div>

                    <div className="text-center mb-2">
                        <h3 className="text-lg font-black uppercase text-stone-800 tracking-widest">Boletín de Calificaciones</h3>
                    </div>

                    <div className="bg-stone-50 border-2 border-stone-200 p-2 rounded-lg mb-2">
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <div>
                                <p className="mb-0.5"><span className="font-bold text-stone-500 uppercase mr-1">Alumno:</span> <span className="font-bold text-xs text-stone-800 uppercase">{student.name}</span></p>
                                <p><span className="font-bold text-stone-500 uppercase mr-1">DNI:</span> <span className="font-semibold text-stone-700">{student.dni}</span></p>
                            </div>
                            <div>
                                <p className="mb-0.5"><span className="font-bold text-stone-500 uppercase mr-1">Nivel/Curso:</span> <span className="font-bold text-xs text-stone-800 uppercase">{student.level || student.taller}</span></p>
                                <p><span className="font-bold text-stone-500 uppercase mr-1">Sede:</span> <span className="font-semibold text-stone-700 uppercase">{student.sede}</span></p>
                            </div>
                        </div>
                    </div>

                    <div className="mb-2">
                        <h4 className="text-[11px] font-bold text-stone-800 uppercase mb-1">Calificaciones de Cursada</h4>
                        {(!gradeColumns || gradeColumns.length === 0) ? (
                            <p className="text-xs text-stone-400 italic">No hay calificaciones registradas este año.</p>
                        ) : (
                            <table className="w-full text-xs text-left border-collapse border-2 border-stone-200">
                                <thead>
                                    <tr className="bg-stone-100">
                                        {gradeColumns.map(col => (
                                            <th key={col.id} className="border-2 border-stone-200 p-1 text-center uppercase text-[8px] text-stone-600 font-bold">{col.title}</th>
                                        ))}
                                        <th className="border-2 border-stone-200 p-1 text-center uppercase text-[8px] text-stone-800 font-black bg-stone-200">Promedio Final</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        {gradeColumns.map(col => {
                                            const g = studentGrades.find(gr => gr.columnId === col.id);
                                            return (
                                                <td key={col.id} className="border-2 border-stone-200 py-0.5 px-1 text-center font-bold text-stone-800 text-sm">
                                                    {g ? g.score : '-'}
                                                </td>
                                            );
                                        })}
                                        <td className="border-2 border-stone-200 py-0.5 px-1 text-center font-black text-stone-900 bg-stone-100 text-base">
                                            {(() => {
                                                const scores = gradeColumns.map(c => studentGrades.find(gr => gr.columnId === c.id)?.score).filter(s => s !== undefined && s !== null && !isNaN(s));
                                                if (scores.length === 0) return '-';
                                                const avg = scores.reduce((a,b) => a + Number(b), 0) / scores.length;
                                                return avg.toFixed(2);
                                            })()}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        )}
                    </div>

                    {mesasColumns && mesasColumns.length > 0 && (
                        <div className="mb-2">
                            <h4 className="text-[11px] font-bold text-stone-800 uppercase mb-1">Mesa de Examen Anual</h4>
                            <table className="w-full text-xs text-left border-collapse border-2 border-stone-200">
                                <thead>
                                    <tr className="bg-stone-100">
                                        {mesasColumns.map(col => (
                                            <th key={col.id} className="border-2 border-stone-200 p-1 text-center uppercase text-[8px] text-stone-600 font-bold">{col.title}</th>
                                        ))}
                                        <th className="border-2 border-stone-200 p-1 text-center uppercase text-[8px] text-stone-800 font-black bg-stone-200">Nota Final</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        {mesasColumns.map(col => {
                                            const g = studentMesasGrades.find(gr => gr.columnId === col.id);
                                            return (
                                                <td key={col.id} className="border-2 border-stone-200 py-0.5 px-1 text-center font-bold text-stone-800 text-sm">
                                                    {g ? g.score : '-'}
                                                </td>
                                            );
                                        })}
                                        <td className="border-2 border-stone-200 py-0.5 px-1 text-center font-black text-stone-900 bg-stone-100 text-base">
                                            {(() => {
                                                const scores = mesasColumns.map(c => studentMesasGrades.find(gr => gr.columnId === c.id)?.score).filter(s => s !== undefined && s !== null && !isNaN(s));
                                                if (scores.length === 0) return '-';
                                                const avg = scores.reduce((a,b) => a + Number(b), 0) / scores.length;
                                                return avg.toFixed(2);
                                            })()}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="mb-2">
                        <h4 className="text-[11px] font-bold text-stone-800 uppercase mb-1">Resumen de Asistencias</h4>
                        <div className="grid grid-cols-4 gap-2">
                            <div className="border border-stone-200 rounded p-0.5 text-center bg-transparent">
                                <p className="text-[7px] font-bold text-stone-500 uppercase leading-none mb-0.5 mt-0.5">Total Clases</p>
                                <p className="text-xs font-black text-stone-700 leading-none mb-0.5">{totalAtt}</p>
                            </div>
                            <div className="border border-stone-200 rounded p-0.5 text-center bg-transparent">
                                <p className="text-[7px] font-bold text-amber-700 uppercase leading-none mb-0.5 mt-0.5">Presentes</p>
                                <p className="text-xs font-black text-amber-800 leading-none mb-0.5">{presentCount}</p>
                            </div>
                            <div className="border border-stone-200 rounded p-0.5 text-center bg-transparent">
                                <p className="text-[7px] font-bold text-stone-500 uppercase leading-none mb-0.5 mt-0.5">Ausentes</p>
                                <p className="text-xs font-black text-stone-600 leading-none mb-0.5">{absentCount}</p>
                            </div>
                            <div className="border border-stone-200 rounded p-0.5 text-center bg-transparent">
                                <p className="text-[7px] font-bold text-stone-500 uppercase leading-none mb-0.5 mt-0.5">Asistencia</p>
                                <p className="text-xs font-black text-stone-700 leading-none mb-0.5">{percentage}%</p>
                            </div>
                        </div>
                    </div>

                    <div className="mb-2">
                        <h4 className="text-[11px] font-bold text-stone-800 uppercase mb-1">Observaciones</h4>
                        <div className="border-2 border-stone-200 rounded-xl p-2 bg-stone-50/50 h-16">
                            {/* Espacio para escribir a mano */}
                        </div>
                    </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-8 pb-2">
                        <div className="text-center">
                            <div className="border-t-2 border-stone-400 pt-2 w-40 mx-auto">
                                <p className="text-[10px] font-bold text-stone-600 uppercase">&nbsp;</p>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="border-t-2 border-stone-400 pt-2 w-40 mx-auto">
                                <p className="text-[10px] font-bold text-stone-600 uppercase">Sello Institucional</p>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="border-t-2 border-stone-400 pt-2 w-40 mx-auto">
                                <p className="text-[10px] font-bold text-stone-600 uppercase">Firma de Dirección</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
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
            const [allStudents, setAllStudents] = useState([]);
            const [payments, setPayments] = useState([]);
            const [attendance, setAttendance] = useState([]);
            const [configLevels, setConfigLevels] = useState([]);
            const [generalConfig, setGeneralConfig] = useState({ profesor: "" });
            const [sedes, setSedes] = useState([]);

            // UI feedback
            const [notifications, setNotifications] = useState([]);
            const [loading, setLoading] = useState(false);
            const [isSendingEmail, setIsSendingEmail] = useState(false);

            // Filtros de vistas
            const [studentSearch, setStudentSearch] = useState("");

            const [studentNivelFilter, setStudentNivelFilter] = useState("Todos");
            const [alumnoStatusTab, setAlumnoStatusTab] = useState("activos");

            // Filtros de asistencias

            const [attendanceNivel, setAttendanceNivel] = useState("Todos");
            const [attendanceYear, setAttendanceYear] = useState(new Date().getFullYear());
            const [attendanceMonthIdx, setAttendanceMonthIdx] = useState(new Date().getMonth());

            // Filtros y Estado de Calificaciones
            const [gradesNivel, setGradesNivel] = useState("Todos");
            const [gradeColumns, setGradeColumns] = useState({});
            const [grades, setGrades] = useState([]);

            // Filtros y Estado de Mesas de Examen
            const [mesasNivel, setMesasNivel] = useState("Todos");
            const [mesasSede, setMesasSede] = useState("Todas");
            const [mesasColumns, setMesasColumns] = useState([]);
            const [mesasGrades, setMesasGrades] = useState([]);

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
            const [showBoletin, setShowBoletin] = useState(false);
            const [activeReceipt, setActiveReceipt] = useState(null);
            const [modalLevel, setModalLevel] = useState("");
            const [modalCuota, setModalCuota] = useState("");
            const [modalInscripcion, setModalInscripcion] = useState("");

            // Estado de conexión Firebase Realtime Database
            const [firebaseConnected, setFirebaseConnected] = useState(false);

            // Recibo público (compartido por email)
            const [publicReceipt, setPublicReceipt] = useState(null);

            // --- NOTIFICACIONES PERSONALIZADAS ---
            const addNotification = (text, type = "success") => {
                const id = Date.now();
                setNotifications(prev => [...prev, { id, text, type }]);
                setTimeout(() => {
                    setNotifications(prev => prev.filter(n => n.id !== id));
                }, 4000);
            };

            // Sincronizar estados del modal de alumnos
            useEffect(() => {
                if (showStudentModal) {
                    const initialLevel = editingStudent?.level || configLevels[0]?.curso_nivel || "";
                    setModalLevel(initialLevel);
                    
                    const currentLevelConfig = configLevels.find(c => c.curso_nivel === initialLevel);
                    setModalCuota(editingStudent?.cuotaOverride !== undefined ? editingStudent.cuotaOverride : (currentLevelConfig?.cuota || 40000));
                    setModalInscripcion(editingStudent?.inscripcionOverride !== undefined ? editingStudent.inscripcionOverride : (currentLevelConfig?.inscripcion || 20000));
                }
            }, [showStudentModal, editingStudent, configLevels]);

            const handleLevelChangeInModal = (newLevelName) => {
                setModalLevel(newLevelName);
                const newConfig = configLevels.find(c => c.curso_nivel === newLevelName);
                setModalCuota(newConfig?.cuota || 40000);
                setModalInscripcion(newConfig?.inscripcion || 20000);
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
                // Verificar si es un enlace de descarga de recibo público
                const params = new URLSearchParams(window.location.search);
                const receiptData = params.get('descargar_recibo');
                if (receiptData) {
                    try {
                        const decoded = JSON.parse(decodeURIComponent(escape(atob(receiptData))));
                        setPublicReceipt(decoded);
                    } catch (e) {
                        console.error("Error decodificando recibo:", e);
                    }
                    return; // Detener inicialización normal si es recibo público
                }

                const sedesRef = ref(rtdb, 'sedes');
                const unsubSedes = onValue(sedesRef, (snapshot) => {
                    const data = snapshot.val();
                    const defaultSedes = [
                        { nombre: "Leandro N. Alem", prefix: "00002", base: 326 },
                        { nombre: "Cerro Azul", prefix: "00003", base: 1 },
                        { nombre: "Itacaruaré", prefix: "00004", base: 1 },
                        { nombre: "San Javier", prefix: "00005", base: 1 },
                        { nombre: "La Corita", prefix: "00006", base: 1 },
                        { nombre: "Arroyo del Medio", prefix: "00007", base: 1 }
                    ];

                    if (data) {
                        const lista = Array.isArray(data) ? data : Object.values(data);
                        let hasMissing = false;
                        defaultSedes.forEach(ds => {
                            if (!lista.some(s => s.nombre === ds.nombre)) {
                                lista.push(ds);
                                hasMissing = true;
                            }
                        });
                        if (hasMissing) {
                            set(sedesRef, lista);
                        }
                        setSedes(lista);
                    } else {
                        set(sedesRef, defaultSedes);
                        setSedes(defaultSedes);
                    }
                }, (error) => {
                    console.error('Error leyendo sedes de Firebase:', error);
                    setSedes([
                        { nombre: "Leandro N. Alem", prefix: "00002", base: 326 },
                        { nombre: "Cerro Azul", prefix: "00003", base: 1 },
                        { nombre: "Itacaruaré", prefix: "00004", base: 1 },
                        { nombre: "San Javier", prefix: "00005", base: 1 },
                        { nombre: "La Corita", prefix: "00006", base: 1 },
                        { nombre: "Arroyo del Medio", prefix: "00007", base: 1 }
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
                        setAllStudents(lista);
                        setStudents(lista.filter(s => s.sede === globalSede));
                        saveLocal('idear_students', lista);
                    } else {
                        // Si Firebase está vacío, sembramos con los datos iniciales
                        const seedObj = {};
                        SEED_STUDENTS.forEach(s => { seedObj[s.id] = s; });
                        set(alumnosRef, seedObj);
                        setAllStudents(SEED_STUDENTS);
                        setStudents(SEED_STUDENTS.filter(s => s.sede === globalSede));
                    }
                }, (error) => {
                    console.error('Error leyendo alumnos:', error);
                    // Fallback a localStorage
                    const local = localStorage.getItem('idear_students');
                    if (local) {
                        const parsed = JSON.parse(local);
                        setAllStudents(parsed);
                        setStudents(parsed.filter(s => s.sede === globalSede));
                    } else {
                        setAllStudents(SEED_STUDENTS);
                        setStudents(SEED_STUDENTS.filter(s => s.sede === globalSede));
                    }
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
                const safeSede = globalSede.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\./g, '');
                
                // Listener de Calificaciones (Notas)
                const calificacionesRef = ref(rtdb, 'calificaciones');
                const unsubCalificaciones = onValue(calificacionesRef, (snapshot) => {
                    const data = snapshot.val();
                    if (data) {
                        const lista = fbObjectToArray(data);
                        setGrades(lista.filter(g => g.sede === globalSede));
                    } else {
                        setGrades([]);
                    }
                }, (error) => console.error("Error leyendo calificaciones:", error));

                // Listener de Columnas de Calificaciones (Exámenes/Trabajos)
                const gradeColsRef = ref(rtdb, `config/gradeColumns_${safeSede}`);
                const unsubGradeCols = onValue(gradeColsRef, (snapshot) => {
                    const data = snapshot.val();
                    if (data) {
                        setGradeColumns(data);
                    } else {
                        setGradeColumns({});
                    }
                }, (error) => console.error("Error leyendo gradeColumns:", error));
                
                // Listener de Mesas de Examen (Notas)
                const mesasRef = ref(rtdb, 'mesasExamen');
                const unsubMesas = onValue(mesasRef, (snapshot) => {
                    const data = snapshot.val();
                    if (data) {
                        const lista = fbObjectToArray(data);
                        setMesasGrades(lista);
                    } else {
                        setMesasGrades([]);
                    }
                }, (error) => console.error("Error leyendo mesasExamen:", error));

                // Listener de Columnas de Mesas
                const mesasColsRef = ref(rtdb, 'config/mesasColumns');
                const unsubMesasCols = onValue(mesasColsRef, (snapshot) => {
                    const data = snapshot.val();
                    if (data && Array.isArray(data)) {
                        setMesasColumns(data);
                    } else if (data && typeof data === 'object') {
                        // Migration from old object format if needed, though they shouldn't have any important yet
                        setMesasColumns([]);
                    } else {
                        setMesasColumns([]);
                    }
                }, (error) => console.error("Error leyendo mesasColumns:", error));

                const configRef = ref(rtdb, `config/${safeSede}`);
                const unsubConfig = onValue(configRef, (snapshot) => {
                    const data = snapshot.val();
                    if (data) {
                        const info = data.info || { profesor: "" };
                        setGeneralConfig(info);
                        
                        const lista = fbObjectToArray(data).filter(item => item.id !== 'info');
                        
                        // Limpieza de niveles temporales obsoletos
                        const obsoletos = [
                            "1er Año Preparatorio",
                            "2do Año Preparatorio",
                            "3er Año Preparatorio",
                            "1er Año Elemental",
                            "2do Año Elemental",
                            "3er Año Elemental",
                            "Diploma Elemental",
                            "1ro Año Superior",
                            "2do Año Superior",
                            "Diploma Superior",
                            "Preparatorio Infantil",
                            "Elemental Infantil",
                            "Superior Infantil",
                            "Preparatorio Instructorado",
                            "Elemental Instructorado",
                            "Superior Instructorado"
                        ];
                        // Eliminar obsoletos y duplicados en Firebase
                        const seenNiveles = {};
                        lista.forEach(item => {
                            if (obsoletos.includes(item.curso_nivel)) {
                                remove(ref(rtdb, `config/${safeSede}/${item.id}`));
                            } else if (seenNiveles[item.curso_nivel]) {
                                remove(ref(rtdb, `config/${safeSede}/${item.id}`));
                            } else {
                                seenNiveles[item.curso_nivel] = true;
                            }
                        });

                        // Sincronizar automáticamente cualquier nuevo nivel de la semilla que falte
                        let hasMissing = false;
                        const missingObj = {};
                        SEED_CONFIG.forEach((defaultConfig, idx) => {
                            const exists = lista.some(item => item.curso_nivel === defaultConfig.curso_nivel);
                            if (!exists) {
                                const newId = `config-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`;
                                missingObj[newId] = defaultConfig;
                                hasMissing = true;
                            }
                        });

                        if (hasMissing) {
                            Object.keys(missingObj).forEach(key => {
                                set(ref(rtdb, `config/${safeSede}/${key}`), missingObj[key]);
                            });
                        }

                        const cleanLista = lista.filter((item, index, self) => 
                            !obsoletos.includes(item.curso_nivel) &&
                            self.findIndex(t => t.curso_nivel === item.curso_nivel) === index
                        );
                        cleanLista.sort((a, b) => {
                            let idxA = NIVELES.indexOf(a.curso_nivel);
                            let idxB = NIVELES.indexOf(b.curso_nivel);
                            if (idxA === -1) idxA = 999;
                            if (idxB === -1) idxB = 999;
                            return idxA - idxB;
                        });
                        setConfigLevels(cleanLista);
                        saveLocal('idear_config', cleanLista);
                    } else {
                        const seedObj = { info: { profesor: "" } };
                        const seedList = SEED_CONFIG.map((c, idx) => {
                            const newObj = { id: `config-${idx}`, ...c };
                            seedObj[`config-${idx}`] = c;
                            return newObj;
                        });
                        try {
                            set(configRef, seedObj);
                        } catch (err) {
                            console.error("Error al sembrar configuración en Firebase:", err);
                        }
                        setGeneralConfig({ profesor: "" });
                        setConfigLevels(seedList);
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
                    off(calificacionesRef);
                    off(gradeColsRef);
                    off(mesasRef);
                    off(mesasColsRef);
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
                            const userSedes = userData.sede ? userData.sede.split(',').map(s => s.trim()) : [];
                            const hasAccess = userSedes.includes(tempSede) || userSedes.includes("Leandro N. Alem");
                            if (hasAccess) {
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
                                addNotification(`Tu usuario está registrado para: "${userData.sede}". No tienes acceso a "${tempSede}".`, "error");
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
                    id: editingStudent ? editingStudent.id : ((formData.get("dni") || "").trim() || Date.now().toString()),
                    name: (formData.get("name") || "").trim(),
                    dni: editingStudent ? editingStudent.dni : (formData.get("dni") || "").trim(),
                    level: formData.get("level"),
                    sede: formData.get("sede"),
                    phone: (formData.get("phone") || "").trim(),
                    email: (formData.get("email") || "").trim(),
                    tutor: (formData.get("tutor") || "").trim(),
                    address: (formData.get("address") || "").trim(),
                    fecha_inicio: formData.get("fecha_inicio") || "",
                    active: formData.get("active") === "on" ? true : false
                };

                const cuotaOverride = formData.get("cuotaOverride");
                const inscripcionOverride = formData.get("inscripcionOverride");
                
                const levelConfig = configLevels.find(c => c.curso_nivel === studentData.level);
                const defaultInscripcion = levelConfig?.inscripcion || 20000;
                const defaultCuota = levelConfig?.cuota || 40000;

                if (cuotaOverride && Number(cuotaOverride) !== defaultCuota) {
                    studentData.cuotaOverride = Number(cuotaOverride);
                }
                if (inscripcionOverride && Number(inscripcionOverride) !== defaultInscripcion) {
                    studentData.inscripcionOverride = Number(inscripcionOverride);
                }

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
            const studentsForAttendance = useMemo(() => {
                return students.filter(s => s.sede === globalSede && (attendanceNivel === "Todos" ? true : s.level === attendanceNivel) && s.active);
            }, [students, globalSede, attendanceNivel]);

            const daysInMonth = useMemo(() => {
                const days = [];
                const date = new Date(attendanceYear, attendanceMonthIdx, 1);
                while (date.getMonth() === attendanceMonthIdx) {
                    const dateStr = `${attendanceYear}-${String(attendanceMonthIdx + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    days.push({
                        dateObj: new Date(date),
                        dayNum: date.getDate(),
                        dayOfWeek: date.getDay(),
                        dateStr: dateStr
                    });
                    date.setDate(date.getDate() + 1);
                }
                return days;
            }, [attendanceYear, attendanceMonthIdx]);

            const handleToggleCell = async (student, dateStr, currentStatus) => {
                let nextStatus = null;
                if (!currentStatus) nextStatus = "P";
                else if (currentStatus === "P") nextStatus = "A";
                else nextStatus = null; // empty -> P -> A -> empty

                const recordId = `${dateStr}_${student.id}`;

                try {
                    if (nextStatus) {
                        const attRecord = {
                            id: recordId,
                            date: dateStr,
                            studentId: student.id,
                            studentName: student.name,
                            level: attendanceNivel,
                            sede: globalSede,
                            status: nextStatus
                        };
                        await set(ref(rtdb, `asistencias/${recordId}`), attRecord);
                    } else {
                        await set(ref(rtdb, `asistencias/${recordId}`), null);
                    }
                } catch (err) {
                    addNotification("Error guardando asistencia", "error");
                }
            };

            // --- ACCIONES DE CALIFICACIONES ---
            const studentsForGrades = useMemo(() => {
                return students.filter(s => 
                    s.sede === globalSede && 
                    s.active &&
                    (gradesNivel === "Todos" || s.level === gradesNivel)
                );
            }, [students, globalSede, gradesNivel]);

            const currentLevelColumns = useMemo(() => {
                return gradeColumns[gradesNivel] || [];
            }, [gradeColumns, gradesNivel]);

            const handleAddGradeColumn = async () => {
                const title = prompt("Nombre de la nueva evaluación (Ej: Examen 1, Trabajo Práctico, etc):");
                if (!title) return;
                
                const newCol = { id: `col_${Date.now()}`, title: title, date: new Date().toISOString().split('T')[0] };
                const safeSede = globalSede.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\./g, '');
                
                const currentCols = [...(gradeColumns[gradesNivel] || [])];
                currentCols.push(newCol);
                
                try {
                    await set(ref(rtdb, `config/gradeColumns_${safeSede}/${gradesNivel}`), currentCols);
                } catch (err) {
                    addNotification("Error añadiendo evaluación", "error");
                }
            };

            const handleEditGradeColumn = async (colId, currentTitle) => {
                const action = prompt(`Editando evaluación: "${currentTitle}"\n\n- Modifica el texto para renombrarla.\n- BORRA TODO el texto y presiona Aceptar para ELIMINARLA.`, currentTitle);
                
                if (action === null) return; // Se canceló el prompt

                const safeSede = globalSede.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\./g, '');
                let currentCols = [...(gradeColumns[gradesNivel] || [])];
                const newTitle = action.trim();

                if (newTitle === "") {
                    if (window.confirm(`¿Seguro que quieres eliminar "${currentTitle}"?\n\nLas notas registradas se perderán.`)) {
                        currentCols = currentCols.filter(c => c.id !== colId);
                        try {
                            await set(ref(rtdb, `config/gradeColumns_${safeSede}/${gradesNivel}`), currentCols);
                        } catch (err) {
                            addNotification("Error eliminando evaluación", "error");
                        }
                    }
                } else if (newTitle !== currentTitle) {
                    const idx = currentCols.findIndex(c => c.id === colId);
                    if (idx !== -1) {
                        currentCols[idx].title = newTitle;
                        try {
                            await set(ref(rtdb, `config/gradeColumns_${safeSede}/${gradesNivel}`), currentCols);
                        } catch (err) {
                            addNotification("Error actualizando evaluación", "error");
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
                    studentId: studentId,
                    columnId: columnId,
                    level: gradesNivel,
                    sede: globalSede,
                    score: score
                };

                try {
                    await set(ref(rtdb, `calificaciones/${recordId}`), gradeRecord);
                } catch (err) {
                    addNotification("Error guardando nota", "error");
                }
            };

            // --- ACCIONES DE MESAS DE EXAMEN ---
            const studentsForMesas = useMemo(() => {
                return allStudents.filter(s => {
                    if (!s.active) return false;
                    if (mesasSede !== "Todas" && s.sede !== mesasSede) return false;
                    if (mesasNivel !== "Todos" && s.level !== mesasNivel) return false;
                    
                    const lvl = s.level || "";
                    const validPrefixes = ["1ro", "2do", "3er", "Diploma"];
                    const isValidLevel = validPrefixes.some(prefix => lvl.startsWith(prefix));
                    
                    return isValidLevel;
                });
            }, [allStudents, mesasSede, mesasNivel]);

            const currentMesasColumns = mesasColumns || [];

            useEffect(() => {
                if (!firebaseConnected) return;
                
                if (!mesasColumns || mesasColumns.length === 0) {
                    const defaultCols = [
                        { id: `col_${Date.now()}_1`, title: "Zapateo", date: new Date().toISOString().split('T')[0] },
                        { id: `col_${Date.now()}_2`, title: "Zarandeo", date: new Date().toISOString().split('T')[0] },
                        { id: `col_${Date.now()}_3`, title: "Expresión", date: new Date().toISOString().split('T')[0] },
                        { id: `col_${Date.now()}_4`, title: "Teoría", date: new Date().toISOString().split('T')[0] },
                        { id: `col_${Date.now()}_5`, title: "Danza", date: new Date().toISOString().split('T')[0] }
                    ];
                    set(ref(rtdb, `config/mesasColumns`), defaultCols).catch(console.error);
                }
            }, [mesasColumns, firebaseConnected]);

            const handleAddMesasColumn = async () => {
                const title = prompt("Nombre de la nueva evaluación de mesa (Ej: Práctica):");
                if (!title) return;
                
                const newCol = { id: `col_${Date.now()}`, title: title, date: new Date().toISOString().split('T')[0] };
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

            const handleUpdateMesasGrade = async (studentId, columnId, valueStr) => {
                const recordId = `${columnId}_${studentId}`;
                
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
                    studentId: studentId,
                    columnId: columnId,
                    level: mesasNivel,
                    sede: globalSede,
                    score: score
                };

                try {
                    await set(ref(rtdb, `mesasExamen/${recordId}`), gradeRecord);
                } catch (err) {
                    addNotification("Error guardando nota", "error");
                }
            };

            const handleToggleMesasStudent = async (studentId, currentStatus) => {
                const recordId = `status_${studentId}`;
                if (currentStatus) {
                    try {
                        await set(ref(rtdb, `mesasExamen/${recordId}`), null);
                    } catch(err) {
                        console.error(err);
                    }
                } else {
                    try {
                        await set(ref(rtdb, `mesasExamen/${recordId}`), {
                            id: recordId,
                            studentId: studentId,
                            sede: globalSede,
                            isAbsent: true
                        });
                    } catch(err) {
                        console.error(err);
                    }
                }
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
                if (!studentObj) return 25000;

                let levelConfig = configLevels.find(c => c.curso_nivel === studentObj.level)
                                  || configLevels.find(c => c.curso_nivel === studentObj.taller);

                const valorInscripcion = studentObj.inscripcionOverride !== undefined && studentObj.inscripcionOverride !== "" 
                                         ? Number(studentObj.inscripcionOverride) 
                                         : (levelConfig?.inscripcion || 20000);
                const valorCuota = studentObj.cuotaOverride !== undefined && studentObj.cuotaOverride !== "" 
                                   ? Number(studentObj.cuotaOverride) 
                                   : (levelConfig?.cuota || 25000);

                if (newPayment.period === "Matrícula") return valorInscripcion;
                if (newPayment.period === "Examen") return levelConfig?.examen || 45000;

                const MONTHS_ORDER = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
                const targetMonthIdx = MONTHS_ORDER.indexOf(newPayment.period);
                if (targetMonthIdx === -1) return valorCuota;

                // El usuario solicitó explícitamente eliminar todas las reglas de pagos, 
                // saldos a favor y cálculos históricos para la sugerencia.
                // Se sugiere estrictamente el valor de la cuota (o el valor histórico exacto si existe).
                
                const currentYear = new Date().getFullYear();
                const hist = getHistoricalValues(levelConfig, targetMonthIdx, currentYear);
                const mCuota = studentObj.cuotaOverride !== undefined && studentObj.cuotaOverride !== "" ? Number(studentObj.cuotaOverride) : hist.cuota;
                
                return mCuota;
            }, [newPayment.studentId, newPayment.period, configLevels, students, payments]);

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
                    if (!exists && attendanceNivel !== "Todos") {
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
                        
                        // 1. Calcular el siguiente mes de pago por simulación cronológica acumulada
                        const MONTHS_ORDER = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
                        const studentPayments = payments.filter(p => p.studentId === newPayment.studentId && p.period !== "Examen");
                        
                        const levelConfig = configLevels.find(c => c.curso_nivel === studentObj.level) 
                                            || configLevels.find(c => c.curso_nivel === studentObj.taller);
                        const valorInscripcion = studentObj.inscripcionOverride !== undefined && studentObj.inscripcionOverride !== "" 
                                                 ? Number(studentObj.inscripcionOverride) 
                                                 : (levelConfig?.inscripcion || 20000);
                        const valorCuota = studentObj.cuotaOverride !== undefined && studentObj.cuotaOverride !== "" 
                                           ? Number(studentObj.cuotaOverride) 
                                           : (levelConfig?.cuota || 25000);
                        
                        let startMonthIdx = 2; // Marzo por defecto
                        if (studentObj.fecha_inicio) {
                            const startMonthStr = studentObj.fecha_inicio.split('-')[1];
                            if (startMonthStr) {
                                startMonthIdx = parseInt(startMonthStr, 10) - 1;
                                startMonthIdx = Math.max(2, Math.min(11, startMonthIdx));
                            }
                        }

                        const totalPaid = studentPayments.reduce((sum, p) => sum + p.amount, 0);
                        let remainingPaid = totalPaid;
                        let nextPeriod = "Marzo";
                        let foundUnpaid = false;

                        const currentYear = new Date().getFullYear();
                        for (let i = startMonthIdx; i < MONTHS_ORDER.length; i++) {
                            const isEnrollmentMonth = (i === startMonthIdx);
                            const hist = getHistoricalValues(levelConfig, i, currentYear);
                            const mInsc = studentObj.inscripcionOverride !== undefined && studentObj.inscripcionOverride !== "" ? Number(studentObj.inscripcionOverride) : hist.inscripcion;
                            const mCuota = studentObj.cuotaOverride !== undefined && studentObj.cuotaOverride !== "" ? Number(studentObj.cuotaOverride) : hist.cuota;
                            
                            const expectedForThisMonth = isEnrollmentMonth ? (mInsc + mCuota) : mCuota;

                            if (remainingPaid >= expectedForThisMonth) {
                                remainingPaid -= expectedForThisMonth;
                            } else {
                                nextPeriod = MONTHS_ORDER[i];
                                foundUnpaid = true;
                                break;
                            }
                        }

                        if (!foundUnpaid) {
                            nextPeriod = "Diciembre";
                        }

                        // Verificar si el próximo período coincide con el mes de inscripción del alumno
                        const isEnrollmentMonthNext = (MONTHS_ORDER.indexOf(nextPeriod) === startMonthIdx);
                        const suggestedConcept = isEnrollmentMonthNext 
                            ? `Inscripción y Cuota de ${nextPeriod}` 
                            : `Cuota de ${nextPeriod}`;

                        // 2. Calcular número de recibo según el contador de la sede
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
                
                // Calcular desglose de cobro (inscripción/cuota) y saldos
                const levelConfig = configLevels.find(c => c.curso_nivel === selectedStudent.level) 
                                    || configLevels.find(c => c.curso_nivel === selectedStudent.taller);
                const currentYear = new Date(newPayment.date).getFullYear();
                const paymentMonthIdx = Math.max(0, MONTHS_ORDER.indexOf(newPayment.period));
                const histValues = getHistoricalValues(levelConfig, paymentMonthIdx, currentYear);
                
                const valorInscripcion = selectedStudent.inscripcionOverride !== undefined && selectedStudent.inscripcionOverride !== "" 
                                         ? Number(selectedStudent.inscripcionOverride) 
                                         : histValues.inscripcion;
                const valorCuota = selectedStudent.cuotaOverride !== undefined && selectedStudent.cuotaOverride !== "" 
                                   ? Number(selectedStudent.cuotaOverride) 
                                   : histValues.cuota;

                const startMonthStr = selectedStudent.fecha_inicio?.split('-')[1];
                let startMonthIdx = startMonthStr ? parseInt(startMonthStr, 10) - 1 : -1;
                if (startMonthIdx !== -1) {
                    startMonthIdx = Math.max(2, startMonthIdx);
                }
                const isEnrollmentMonth = startMonthIdx !== -1 && MONTHS_ORDER[startMonthIdx] === newPayment.period;

                // Pagos del alumno en el período actual (excluyendo exámenes)
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

                // Asignar el importe actual desglosándolo
                const amountPaid = Number(newPayment.amount);
                const expectedCuota = totalExpectedForPeriod - expectedInscripcion;
                const alreadyPaidEnrollment = Math.min(alreadyPaidForPeriod, expectedInscripcion);
                const alreadyPaidCuota = Math.max(0, alreadyPaidForPeriod - alreadyPaidEnrollment);

                const remainingEnrollment = expectedInscripcion - alreadyPaidEnrollment;
                const remainingCuota = expectedCuota - alreadyPaidCuota;

                const inscripcionPaid = Math.min(amountPaid, Math.max(0, remainingEnrollment));
                const cuotaPaid = Math.min(Math.max(0, amountPaid - inscripcionPaid), Math.max(0, remainingCuota));

                const periodBalance = Math.max(0, totalExpectedForPeriod - (alreadyPaidForPeriod + amountPaid));

                // Calcular deuda anterior acumulada (meses anteriores al período actual, desde la fecha de inicio del alumno)
                let previousDebt = 0;
                if (newPayment.period !== "Matrícula" && newPayment.period !== "Examen" && startMonthIdx !== -1) {
                    const targetMonthIdx = MONTHS_ORDER.indexOf(newPayment.period);
                    if (targetMonthIdx > startMonthIdx) {
                        for (let i = startMonthIdx; i < targetMonthIdx; i++) {
                            const prevMonthName = MONTHS_ORDER[i];
                            const isPrevEnrollmentMonth = (i === startMonthIdx);
                            const prevHist = getHistoricalValues(levelConfig, i, currentYear);
                            const prevInsc = selectedStudent.inscripcionOverride !== undefined && selectedStudent.inscripcionOverride !== "" ? Number(selectedStudent.inscripcionOverride) : prevHist.inscripcion;
                            const prevCuota = selectedStudent.cuotaOverride !== undefined && selectedStudent.cuotaOverride !== "" ? Number(selectedStudent.cuotaOverride) : prevHist.cuota;
                            const expectedForPrevMonth = isPrevEnrollmentMonth ? (prevInsc + prevCuota) : prevCuota;
                            const paidForPrevMonth = payments
                                .filter(p => p.studentId === selectedStudent.id && p.period === prevMonthName && p.period !== "Examen")
                                .reduce((sum, p) => sum + p.amount, 0);
                            previousDebt += Math.max(0, expectedForPrevMonth - paidForPrevMonth);
                        }
                        
                        // --- FIX: Recalcular la deuda acumulada usando la cascada cronológica correcta ---
                        const studentPaymentsForDebt = payments.filter(p => p.studentId === selectedStudent.id && p.period !== "Examen");
                        let remainingPaidForDebt = studentPaymentsForDebt.reduce((sum, p) => sum + p.amount, 0);
                        let truePreviousDebt = 0;
                        for (let i = startMonthIdx; i < targetMonthIdx; i++) {
                            const isPrevEnrollmentMonth = (i === startMonthIdx);
                            const prevHist = getHistoricalValues(levelConfig, i, currentYear);
                            const prevInsc = selectedStudent.inscripcionOverride !== undefined && selectedStudent.inscripcionOverride !== "" ? Number(selectedStudent.inscripcionOverride) : prevHist.inscripcion;
                            const prevCuota = selectedStudent.cuotaOverride !== undefined && selectedStudent.cuotaOverride !== "" ? Number(selectedStudent.cuotaOverride) : prevHist.cuota;
                            const expectedForPrevMonth = isPrevEnrollmentMonth ? (prevInsc + prevCuota) : prevCuota;
                            
                            if (remainingPaidForDebt >= expectedForPrevMonth) {
                                remainingPaidForDebt -= expectedForPrevMonth;
                            } else {
                                truePreviousDebt += (expectedForPrevMonth - remainingPaidForDebt);
                                remainingPaidForDebt = 0;
                            }
                        }
                        previousDebt = truePreviousDebt;
                        // ----------------------------------------------------------------------------------
                    }
                }

                // Calcular saldo total a la fecha (mes en curso del pago)
                const currentMonthIdx = new Date(newPayment.date).getMonth();
                let totalExpectedUpToDate = 0;
                if (startMonthIdx !== -1) {
                    for (let m = startMonthIdx; m <= Math.max(startMonthIdx, currentMonthIdx); m++) {
                        const mHist = getHistoricalValues(levelConfig, m, currentYear);
                        const mInsc = selectedStudent.inscripcionOverride !== undefined && selectedStudent.inscripcionOverride !== "" ? Number(selectedStudent.inscripcionOverride) : mHist.inscripcion;
                        const mCuota = selectedStudent.cuotaOverride !== undefined && selectedStudent.cuotaOverride !== "" ? Number(selectedStudent.cuotaOverride) : mHist.cuota;
                        totalExpectedUpToDate += (m === startMonthIdx) ? (mInsc + mCuota) : mCuota;
                    }
                } else {
                    totalExpectedUpToDate = valorInscripcion + valorCuota;
                }
                const totalPaidIncludingThis = payments
                    .filter(p => p.studentId === selectedStudent.id && p.period !== "Examen")
                    .reduce((sum, p) => sum + p.amount, 0) + amountPaid;
                const balanceToDate = Math.max(0, totalExpectedUpToDate - totalPaidIncludingThis);

                const paymentRecord = {
                    id: paymentId,
                    studentId: newPayment.studentId,
                    studentName: selectedStudent.name,
                    period: newPayment.period,
                    date: newPayment.date,
                    concept: newPayment.concept || `Cuota de ${newPayment.period}`,
                    method: newPayment.method,
                    amount: amountPaid,
                    receiptNo: receiptNo,
                    inscripcionPaid,
                    cuotaPaid,
                    excessPaid: Math.max(0, amountPaid - (inscripcionPaid + cuotaPaid)),
                    periodExpected: totalExpectedForPeriod,
                    periodBalance,
                    previousDebt,
                    balanceToDate,
                    cuotaValue: valorCuota
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
                    const matchesStatus = alumnoStatusTab === "todos" ? true : (alumnoStatusTab === "activos" ? s.active : !s.active);
                    return matchesSearch && matchesNivel && matchesStatus;
                }).sort((a, b) => {
                    if (a.active !== b.active) return a.active ? -1 : 1;
                    if (a.level !== b.level) return (a.level || '').localeCompare(b.level || '');
                    return (a.name || '').localeCompare(b.name || '');
                });
            }, [students, studentSearch, globalSede, studentNivelFilter, alumnoStatusTab]);

            // --- CÁLCULO DE DEUDA POR ALUMNO ---
            const studentDebts = useMemo(() => {
                const debts = {};
                const currentMonthIdx = new Date().getMonth(); // 0=Jan, 1=Feb, 2=Mar, 3=Apr, 4=May, 5=Jun
                
                students.forEach(student => {
                    let startMonthIdx = 2; // Default a Marzo (idx=2)
                    if (student.fecha_inicio) {
                        const startMonthStr = student.fecha_inicio.split('-')[1];
                        if (startMonthStr) {
                            startMonthIdx = parseInt(startMonthStr, 10) - 1;
                            startMonthIdx = Math.max(2, startMonthIdx); // No cobrar anterior a marzo
                        }
                    }

                    let monthsToPay = 0;
                    if (currentMonthIdx >= startMonthIdx) {
                        monthsToPay = currentMonthIdx - startMonthIdx + 1;
                    } else {
                        monthsToPay = 1; // Mínimo se le cobra el mes de inicio
                    }

                    let levelConfig = configLevels.find(c => c.curso_nivel === student.level) 
                                      || configLevels.find(c => c.curso_nivel === student.taller);
                    
                    const inscripcion = student.inscripcionOverride !== undefined && student.inscripcionOverride !== "" ? Number(student.inscripcionOverride) : (levelConfig?.inscripcion || 20000);
                    const cuota = student.cuotaOverride !== undefined && student.cuotaOverride !== "" ? Number(student.cuotaOverride) : (levelConfig?.cuota || 25000);
                    
                    const totalExpected = inscripcion + (cuota * monthsToPay);
                    
                    const studentPayments = payments.filter(p => p.studentId === student.id && p.period !== 'Examen');
                    const totalPaid = studentPayments.reduce((sum, p) => sum + p.amount, 0);
                    
                    debts[student.id] = Math.max(0, totalExpected - totalPaid);
                });
                return debts;
            }, [students, payments, configLevels]);
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

            // Datos para el gráfico dinámico de barras de ingresos por mes
            const chartData = useMemo(() => {
                const months = ["Marzo", "Abril", "Mayo", "Junio", "Julio"];
                return months.map(m => {
                    const total = activePayments.filter(p => p.period === m).reduce((sum, p) => sum + p.amount, 0);
                    return { month: m, total };
                });
            }, [activePayments]);

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
                let deudores = students.filter(s => s.active && !paidThisMonthStudentIds.has(s.id));

                // Ordenar por mayor deuda calculada previamente en studentDebts
                deudores.sort((a, b) => (studentDebts[b.id] || 0) - (studentDebts[a.id] || 0));

                return {
                    totalAlumnos,
                    totalRecaudadoMes,
                    assistRate,
                    totalDeudores: deudores.length,
                    deudoresList: deudores.slice(0, 10) // top 10 deudores para alerta ordenados por deuda
                };
            }, [students, activePayments, attendance, studentDebts]);

            // Perfil del profesor registrado para la sede actual (usado cuando el admin ingresa a una sede)
            const sedeProfesor = useMemo(() => {
                if (!currentUser || currentUser.dni !== 'admin') return null;
                // Buscar el profesor registrado para la sede actual (excluye al admin)
                return users.find(u => u.sede === globalSede && u.dni !== 'admin') || null;
            }, [currentUser, users, globalSede]);



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
                const valorInscripcion = selectedStudentDetail.inscripcionOverride !== undefined && selectedStudentDetail.inscripcionOverride !== "" ? Number(selectedStudentDetail.inscripcionOverride) : (levelConfig?.inscripcion || 20000);
                const valorCuota = selectedStudentDetail.cuotaOverride !== undefined && selectedStudentDetail.cuotaOverride !== "" ? Number(selectedStudentDetail.cuotaOverride) : (levelConfig?.cuota || 25000);
                const sumaTotal = valorInscripcion + valorCuota;

                const paidPeriods = [];
                const sPaymentsForMonthly = sPayments.filter(p => p.period !== "Examen");
                let remainingPaid = sPaymentsForMonthly.reduce((sum, p) => sum + p.amount, 0);

                let startMonthIdx = 2; // Marzo por defecto
                if (selectedStudentDetail.fecha_inicio) {
                    const startMonthStr = selectedStudentDetail.fecha_inicio.split('-')[1];
                    if (startMonthStr) {
                        startMonthIdx = parseInt(startMonthStr, 10) - 1;
                        startMonthIdx = Math.max(2, Math.min(11, startMonthIdx));
                    }
                }

                const currentYear = new Date().getFullYear();
                for (let i = startMonthIdx; i < MONTHS_ORDER.length; i++) {
                    const isEnrollmentMonth = (i === startMonthIdx);
                    const hist = getHistoricalValues(levelConfig, i, currentYear);
                    const mInsc = selectedStudentDetail.inscripcionOverride !== undefined && selectedStudentDetail.inscripcionOverride !== "" ? Number(selectedStudentDetail.inscripcionOverride) : hist.inscripcion;
                    const mCuota = selectedStudentDetail.cuotaOverride !== undefined && selectedStudentDetail.cuotaOverride !== "" ? Number(selectedStudentDetail.cuotaOverride) : hist.cuota;
                    
                    const expectedForThisMonth = isEnrollmentMonth ? (mInsc + mCuota) : mCuota;
                    
                    if (remainingPaid >= expectedForThisMonth) {
                        paidPeriods.push(MONTHS_ORDER[i]);
                        remainingPaid -= expectedForThisMonth;
                    } else {
                        break;
                    }
                }
                const currentMonthIdx = new Date().getMonth();
                const expectedPeriods = [];
                const endMonth = Math.max(startMonthIdx, currentMonthIdx);
                for (let i = startMonthIdx; i <= endMonth; i++) {
                    if (MONTHS_ORDER[i]) {
                        expectedPeriods.push(MONTHS_ORDER[i]);
                    }
                }

                const missingPeriods = expectedPeriods.filter(p => !paidPeriods.includes(p));

                return {
                    payments: sPayments,
                    attendance: sAttendance,
                    presents,
                    excused,
                    absents,
                    attendanceRate,
                    missingPeriods,
                    paidPeriods,
                    valorCuota,
                    valorInscripcion,
                    expectedPeriods
                };
            }, [selectedStudentDetail, activePayments, attendance, configLevels]);

            const handlePrintReceipt = () => {
                window.print();
            };

            const handleSendEmail = async () => {
                if (!window.html2pdf) {
                    addNotification("Faltan librerías para procesar el PDF.", "error");
                    return;
                }
                const student = students.find(s => s.id === activeReceipt?.studentId);
                if (!student || !student.email) {
                    addNotification("El alumno no tiene un correo registrado.", "error");
                    return;
                }

                setIsSendingEmail(true);
                
                // Usar el elemento original y hacerlo visible temporalmente
                const printContainer = document.querySelector('.print-only');
                if (!printContainer) {
                    setIsSendingEmail(false);
                    return;
                }
                
                // Mostrarlo en pantalla arriba de todo, sin restringir su altura para evitar recortes
                printContainer.classList.remove('hidden');
                printContainer.style.position = 'absolute';
                printContainer.style.top = '0';
                printContainer.style.left = '0';
                printContainer.style.width = '100vw';
                printContainer.style.height = 'auto'; // Permitir que crezca lo necesario
                printContainer.style.minHeight = '100vh';
                printContainer.style.backgroundColor = 'white';
                printContainer.style.zIndex = '-1'; // Oculto detrás del modal
                printContainer.style.overflow = 'visible';
                
                // Asegurarse de que el navegador esté arriba para la captura
                window.scrollTo(0, 0);
                
                // El contenido real a capturar es el div interno
                const targetElement = printContainer.children[0];

                try {
                    const opt = {
                        margin: [10, 10, 10, 10],
                        filename: `Recibo_${activeReceipt.receiptNo}.pdf`,
                        image: { type: 'jpeg', quality: 0.98 },
                        html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
                        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                    };

                    // Generar PDF 
                    const pdfBase64DataUrl = await window.html2pdf().set(opt).from(targetElement).outputPdf('datauristring');
                    const base64Data = pdfBase64DataUrl.split(',')[1];
                    
                    const payload = {
                        email: student.email,
                        nombre: activeReceipt.studentName,
                        asunto: `Comprobante de Pago Nro ${activeReceipt.receiptNo} - IDeAr`,
                        cuerpo: `Hola ${activeReceipt.studentName},\n\nNos comunicamos del Instituto Para el Desarrollo del Arte (IDeAr).\n\nAquí tienes adjunto tu comprobante de pago Nro: ${activeReceipt.receiptNo}.\n\nDetalle del Pago:\n- Concepto: ${activeReceipt.concept}\n- Periodo: ${activeReceipt.period}\n- Importe Abonado: $${activeReceipt.amount.toLocaleString()}\n- Medio de Pago: ${activeReceipt.method}\n\nSaludos cordiales,\nEquipo IDeAr - Sede ${globalSede}`,
                        pdfBase64: base64Data,
                        pdfName: `Recibo_${activeReceipt.receiptNo}.pdf`
                    };

                    // ENLACE AL GOOGLE APPS SCRIPT
                    const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx1mZPGaVuazIkUHxp592MFot0rhBDHOoehbNyRy5SFWFqDbFHXBL9-qhXaqBS9CUF6/exec";

                    await fetch(GOOGLE_SCRIPT_URL, {
                        method: "POST",
                        mode: "no-cors",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(payload)
                    });
                    
                    addNotification("¡El correo se está enviando en segundo plano!", "success");
                    setActiveReceipt(null); // Cierra el modal de recibo
                } catch (error) {
                    console.error("Error enviando email:", error);
                    addNotification("Error al intentar enviar el correo.", "error");
                } finally {
                    // Volver a ocultarlo y limpiar estilos en línea
                    printContainer.classList.add('hidden');
                    printContainer.style.position = '';
                    printContainer.style.top = '';
                    printContainer.style.left = '';
                    printContainer.style.width = '';
                    printContainer.style.height = '';
                    printContainer.style.backgroundColor = '';
                    printContainer.style.zIndex = '';
                    printContainer.style.overflow = '';
                    
                    setIsSendingEmail(false);
                }
            };

            const handleSendReminder = async (studentTarget = null) => {
                const targetStudent = studentTarget?.id ? studentTarget : selectedStudentDetail;
                if (!targetStudent || !targetStudent.email) {
                    addNotification("El alumno no tiene un correo registrado.", "error");
                    return;
                }

                setIsSendingEmail(true);

                try {
                    let missingPeriods = [];
                    let valorCuota = 0;
                    
                    if (targetStudent.id === selectedStudentDetail?.id && activeStudentStats) {
                        missingPeriods = activeStudentStats.missingPeriods;
                        valorCuota = activeStudentStats.valorCuota;
                    } else {
                        // Calcular deuda y meses faltantes para un alumno desde la alerta
                        const sId = targetStudent.id;
                        const sPayments = activePayments.filter(p => p.studentId === sId);
                        
                        const MONTHS_ORDER = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
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

                    const payload = {
                        email: targetStudent.email,
                        asunto: 'Recordatorio de Pago - Instituto IDeAr',
                        cuerpo: `Hola.\n\nNos comunicamos desde el Instituto para el Desarrollo del Arte (IDeAr).\n\nLe informamos que, al día de la fecha, la alumna/o ${targetStudent.name} registra un saldo pendiente de $${studentDebts[targetStudent.id].toLocaleString()}, correspondiente a las cuotas/conceptos impagos de: ${missingPeriods.join(', ')}.\n\nLe recordamos que el valor de la cuota mensual es de $${valorCuota.toLocaleString()}.\n\nAgradeceremos pueda regularizar esta situación a la brevedad. Si el pago ya fue realizado recientemente, le solicitamos desestimar este mensaje o, si corresponde, enviarnos el comprobante para actualizar nuestros registros.\n\nAnte cualquier consulta, quedamos a su disposición.\n\nMuchas gracias.\n\nSaludos cordiales,\nEquipo IDeAr - Sede ${targetStudent.sede}`
                    };

                    const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx1mZPGaVuazIkUHxp592MFot0rhBDHOoehbNyRy5SFWFqDbFHXBL9-qhXaqBS9CUF6/exec";

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

                    // Actualizar el estado local para que el modal refleje el cambio instantáneamente
                    if (selectedStudentDetail && selectedStudentDetail.id === targetStudent.id) {
                        setSelectedStudentDetail(prev => ({ ...prev, lastReminderPeriod: currentPeriod }));
                    }

                    addNotification("¡Recordatorio enviado en segundo plano!", "success");
                } catch (error) {
                    console.error("Error enviando recordatorio:", error);
                    addNotification("Error al intentar enviar el recordatorio.", "error");
                } finally {
                    setIsSendingEmail(false);
                }
            };

            const handleDeleteStudent = async (studentId) => {
                if (!window.confirm("¿Estás seguro que deseas ELIMINAR DEFINITIVAMENTE este alumno de la base de datos? Esta acción no se puede deshacer.")) {
                    return;
                }
                try {
                    await remove(ref(rtdb, 'alumnos/' + studentId));
                    addNotification("Alumno eliminado definitivamente.", "success");
                    setSelectedStudentDetail(null); // Cierra la ficha
                } catch (error) {
                    addNotification("Error al eliminar el alumno: " + error.message, "error");
                }
            };

            const handleDownloadPublicReceipt = () => {
                const element = document.getElementById('public-receipt-print-area');
                if (window.html2pdf && element) {
                    const opt = {
                        margin: 8,
                        filename: `Comprobante_${publicReceipt.receiptNo}.pdf`,
                        image: { type: 'jpeg', quality: 1 },
                        html2canvas: { 
                            scale: 2, 
                            useCORS: true, 
                            scrollY: 0 
                        },
                        jsPDF: { unit: 'mm', format: 'a5', orientation: 'portrait' }
                    };
                    window.html2pdf().set(opt).from(element).save();
                } else {
                    window.print();
                }
            };

            if (publicReceipt) {
                return (
                    <div className="min-h-screen bg-stone-200 flex flex-col items-center p-4 sm:p-8">
                        <div className="w-full max-w-3xl flex flex-col items-center">
                            <h2 className="text-2xl font-black text-center text-stone-800 mb-6">Comprobante Oficial de Pago</h2>
                            
                            {/* CONTENEDOR OPTIMIZADO PARA A5 */}
                            <div 
                                id="public-receipt-print-area" 
                                className="bg-white text-stone-900 p-6 sm:p-8 w-full shadow-2xl relative border-4 border-stone-200 rounded-[2rem]"
                                style={{ maxWidth: '148mm', minHeight: '105mm' }} 
                            >
                                <div className="flex justify-between items-start border-b-2 pb-4 border-stone-200">
                                    <div className="flex flex-col items-center text-center">
                                        <img src="/logo.png" alt="Logo IDeAr" className="w-28 h-auto object-contain" />
                                        <div className="mt-3">
                                            <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Instituto Para el Desarrollo del Arte</p>
                                            <p className="text-[10px] text-stone-400 mt-0.5">Reg. SPEPM N° 213/21</p>
                                        </div>
                                    </div>
                                    <div className="text-right space-y-1.5">
                                        <div className="bg-stone-900 text-white font-black px-4 py-1.5 rounded-lg text-sm inline-block uppercase tracking-wider shadow-sm">
                                            Recibo X
                                        </div>
                                        <p className="text-xs font-bold text-stone-700 pt-1">Nro: {publicReceipt.receiptNo}</p>
                                        <p className="text-[11px] text-stone-500 font-semibold">Fecha: {formatDate(publicReceipt.date)}</p>
                                        <p className="text-[9px] text-stone-400 font-bold italic pt-1">Documento no válido como Factura</p>
                                    </div>
                                </div>
                                
                                <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 mt-6 space-y-2">
                                    <p className="flex justify-between items-center text-xs">
                                        <span className="text-stone-500 font-bold uppercase">Alumno:</span>
                                        <span className="font-extrabold text-stone-900 text-sm">{publicReceipt.studentName}</span>
                                    </p>
                                    <p className="flex justify-between items-center text-xs">
                                        <span className="text-stone-500 font-bold uppercase">DNI:</span>
                                        <span className="font-bold text-stone-700">{publicReceipt.studentId}</span>
                                    </p>
                                </div>
                                
                                <div className="mt-6 space-y-3">
                                    <div className="flex justify-between items-center py-2 border-b border-stone-100">
                                        <div>
                                            <p className="font-black text-stone-800 text-base">{publicReceipt.concept}</p>
                                            <p className="text-xs text-stone-500 mt-1 font-medium">Mes: {publicReceipt.period} | Vía: {publicReceipt.method}</p>
                                        </div>
                                        <span className="font-black text-stone-900 text-xl">${publicReceipt.amount.toLocaleString()}</span>
                                    </div>
                                </div>
                                
                                <div className="mt-8 border-t-2 border-stone-200 pt-4 flex justify-between items-end">
                                    <span className="text-xs font-black uppercase text-stone-500 tracking-wider">Monto Total</span>
                                    <div className="text-right">
                                        <p className="text-3xl font-black text-amber-900">${publicReceipt.amount.toLocaleString()}</p>
                                        <p className="text-[10px] text-stone-400 font-medium italic mt-1">Expresado en pesos argentinos</p>
                                    </div>
                                </div>
                            </div>
                            
                            <button 
                                onClick={handleDownloadPublicReceipt}
                                className="w-full max-w-sm mt-8 bg-amber-600 hover:bg-amber-700 text-white font-bold py-4 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-3 text-lg"
                            >
                                <i className="fas fa-file-pdf text-2xl"></i> Descargar Comprobante
                            </button>
                        </div>
                    </div>
                );
            }

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
                                                const userSedes = currentUser.sede ? currentUser.sede.split(',').map(s => s.trim()) : [];
                                                const hasAccess = userSedes.includes(sede.nombre) || userSedes.includes("Leandro N. Alem");
                                                if (hasAccess) {
                                                    setGlobalSede(sede.nombre);
                                                    localStorage.setItem('idear_sede', sede.nombre);
                                                } else {
                                                    addNotification(`Tu usuario está registrado para: "${currentUser.sede}". No tienes acceso a "${sede.nombre}".`, "error");
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
                                {currentUser && (
                                    currentUser.sede === "Leandro N. Alem" || 
                                    (currentUser.sede ? currentUser.sede.split(',').length > 1 : false)
                                ) && (
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
                            {(() => {
                                const isDirector = currentUser && (currentUser.dni === 'admin' || (currentUser.sede && currentUser.sede.includes("Leandro N. Alem")));
                                const tabs = [
                                    { id: "dashboard",   icon: "fa-chart-pie",            label: "Panel" },
                                    { id: "asistencias", icon: "fa-calendar-check",       label: "Asistencia" },
                                    { id: "calificaciones", icon: "fa-star",              label: "Calificaciones" },
                                    { id: "pagos",       icon: "fa-file-invoice-dollar",  label: "Cobros" },
                                    { id: "alumnos",     icon: "fa-user-graduate",         label: "Alumnos" },
                                    { id: "perfil",      icon: "fa-user-circle",           label: "Mi Perfil" },
                                ];
                                if (isDirector) {
                                    tabs.splice(3, 0, { id: "mesas", icon: "fa-gavel", label: "Mesas" });
                                }
                                return tabs.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setCurrentTab(t.id)}
                                        className={`py-4 px-3 sm:px-5 border-b-2 font-semibold text-sm transition-all whitespace-nowrap flex items-center gap-2 ${
                                            currentTab === t.id ? "border-amber-500 text-amber-600" : "border-transparent text-stone-500 hover:text-stone-800"
                                        }`}
                                    >
                                        <i className={`fas ${t.icon}`}></i> {t.label}
                                    </button>
                                ));
                            })()}
                        </div>
                    </nav>

                    {/* ── Navegación Mobile: barra fija abajo ── */}
                    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-stone-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] no-print safe-area-bottom">
                        {(() => {
                            const isDirector = currentUser && (currentUser.dni === 'admin' || (currentUser.sede && currentUser.sede.includes("Leandro N. Alem")));
                            const tabs = [
                                { id: "dashboard",   icon: "fa-chart-pie",           label: "Panel" },
                                { id: "asistencias", icon: "fa-calendar-check",      label: "Asistencia" },
                                { id: "calificaciones", icon: "fa-star",             label: "Notas" },
                                { id: "pagos",       icon: "fa-dollar-sign",          label: "Cobros" },
                                { id: "alumnos",     icon: "fa-users",                label: "Alumnos" },
                                { id: "perfil",      icon: "fa-user-circle",          label: "Perfil" },
                            ];
                            if (isDirector) {
                                tabs.splice(3, 0, { id: "mesas", icon: "fa-gavel", label: "Mesas" });
                            }
                            return (
                                <div className={`grid ${isDirector ? 'grid-cols-7' : 'grid-cols-6'} h-16`}>
                                    {tabs.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => setCurrentTab(t.id)}
                                            className={`flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 border-0 cursor-pointer ${
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
                            );
                        })()}
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl">
                                            <i className="fas fa-users"></i>
                                        </div>
                                        <div>
                                            <p className="text-xs text-stone-400 font-semibold uppercase">Matrícula Activa</p>
                                            <p className="text-2xl font-bold text-stone-800">{stats.totalAlumnos} alumnos</p>
                                        </div>
                                    </div>

                                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100 flex flex-col justify-between">
                                        <p className="text-xs text-stone-400 font-semibold uppercase mb-3">Cobros por Mes</p>
                                        <div className="flex justify-between items-end h-16 gap-1 w-full mt-auto">
                                            {chartData.map(item => {
                                                const maxVal = Math.max(...chartData.map(c => c.total), 1);
                                                const heightPercent = Math.min(100, Math.max(5, Math.round((item.total / maxVal) * 100)));
                                                return (
                                                    <div key={item.month} className="flex flex-col items-center justify-end flex-1 h-full group relative">
                                                        <span className="text-[10px] font-bold text-stone-600 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6 bg-white border border-stone-100 px-1 rounded shadow-sm z-10 whitespace-nowrap pointer-events-none">
                                                            ${(item.total / 1000).toFixed(0)}k
                                                        </span>
                                                        <div className="w-full flex-1 flex items-end relative">
                                                            <div 
                                                                style={{ height: `${heightPercent}%` }} 
                                                                className="w-full bg-orange-400 group-hover:bg-orange-600 rounded-t-sm transition-all duration-300 cursor-pointer"
                                                            ></div>
                                                        </div>
                                                        <span className="text-[8px] text-stone-400 uppercase font-bold truncate w-full text-center mt-1">{item.month.substring(0,3)}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                </div>

                                {/* Alertador de deudores */}
                                <div className="grid grid-cols-1 gap-8 max-w-3xl">
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
                                                stats.deudoresList.map(std => {
                                                    const currentPeriod = new Date().toISOString().substring(0, 7);
                                                    const isReminderSent = std.lastReminderPeriod === currentPeriod;
                                                    
                                                    const levelConfig = configLevels.find(c => c.curso_nivel === std.level) || configLevels.find(c => c.curso_nivel === std.taller);
                                                    const cuota = std.cuotaOverride !== undefined && std.cuotaOverride !== "" ? Number(std.cuotaOverride) : (levelConfig?.cuota || 25000);
                                                    const debt = studentDebts[std.id] || 0;
                                                    const cuotasAprox = Math.max(1, Math.round(debt / cuota));

                                                    return (
                                                        <div key={std.id} className="py-3 flex items-center justify-between">
                                                            <div>
                                                                <p className="text-sm font-semibold text-stone-800">
                                                                    {std.name} 
                                                                    <span className="text-rose-600 font-bold ml-2 text-xs bg-rose-50 px-2 py-0.5 rounded-full">
                                                                        Deben ~{cuotasAprox} cuota{cuotasAprox > 1 ? 's' : ''}
                                                                    </span>
                                                                </p>
                                                                <p className="text-xs text-stone-400">{std.sede} | {std.level}</p>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                {std.email && (
                                                                    <button 
                                                                        onClick={() => handleSendReminder(std)}
                                                                        disabled={isSendingEmail || isReminderSent}
                                                                        className={`text-xs px-2 py-1.5 rounded-lg font-bold transition-all ${isReminderSent ? 'bg-emerald-50 text-emerald-700 cursor-not-allowed' : 'bg-rose-50 hover:bg-rose-100 text-rose-700'}`}
                                                                        title={isReminderSent ? "Recordatorio enviado este mes" : "Enviar recordatorio al correo"}
                                                                    >
                                                                        <i className={isReminderSent ? "fas fa-check-circle" : "fas fa-paper-plane"}></i> {isReminderSent ? "Enviado" : "Recordatorio"}
                                                                    </button>
                                                                )}
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
                                                        </div>
                                                    )
                                                })
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
                                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Nivel / Curso</label>
                                            <select 
                                                value={attendanceNivel} 
                                                onChange={(e) => setAttendanceNivel(e.target.value)}
                                                className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-stone-50 font-medium"
                                            >
                                                <option value="Todos">Todos los niveles</option>
                                                {configLevels.map(c => <option key={c.id} value={c.curso_nivel}>{c.curso_nivel}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Mes</label>
                                            <select 
                                                value={attendanceMonthIdx}
                                                onChange={(e) => setAttendanceMonthIdx(Number(e.target.value))}
                                                className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-stone-50 font-medium"
                                            >
                                                {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map((m, idx) => (
                                                    <option key={idx} value={idx}>{m}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Atajos Rápidos */}
                                    <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-t border-b border-stone-100 mb-6">
                                        <div className="text-sm font-semibold text-stone-600">
                                            Alumnos en este curso: <span className="text-amber-600 font-bold">{studentsForAttendance.length}</span>
                                        </div>
                                    </div>

                                    {/* Grilla Mensual de Asistencias */}
                                    {studentsForAttendance.length === 0 ? (
                                        <div className="text-center py-12 text-stone-400">
                                            <i className="fas fa-graduation-cap text-4xl mb-3"></i>
                                            <p className="font-medium">No hay alumnos registrados en esta sede y nivel</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto bg-white border border-stone-100 rounded-xl shadow-inner">
                                            <table className="w-full text-sm text-left whitespace-nowrap">
                                                <thead className="text-xs text-stone-500 bg-stone-50 border-b border-stone-100 uppercase font-bold">
                                                    <tr>
                                                        <th className="px-4 py-3 sticky left-0 bg-stone-50 z-20 border-r border-stone-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">Alumno</th>
                                                        {daysInMonth.map(d => (
                                                            <th key={d.dateStr} className={`px-1 py-3 text-center border-r border-stone-100 min-w-[36px] ${[0, 6].includes(d.dayOfWeek) ? 'bg-stone-100/50 text-stone-400' : ''}`}>
                                                                <div className="flex flex-col items-center">
                                                                    <span className="text-[9px] opacity-70">{['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'][d.dayOfWeek]}</span>
                                                                    <span>{String(d.dayNum).padStart(2, '0')}</span>
                                                                </div>
                                                            </th>
                                                        ))}
                                                        <th className="px-3 py-3 text-center border-l-2 border-stone-200 bg-emerald-50 text-emerald-700 sticky right-12 z-10">Presentes</th>
                                                        <th className="px-3 py-3 text-center bg-rose-50 text-rose-700 sticky right-0 z-10">Ausentes</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-stone-100">
                                                    {studentsForAttendance.map(student => {
                                                        let totalP = 0;
                                                        let totalA = 0;
                                                        
                                                        return (
                                                            <tr key={student.id} className="hover:bg-amber-50/30 transition-colors group">
                                                                <td className="px-4 py-2 font-semibold text-stone-700 sticky left-0 bg-white group-hover:bg-amber-50/80 z-10 border-r border-stone-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)] text-xs">
                                                                    {student.name}
                                                                    {attendanceNivel === "Todos" && (
                                                                        <span className="block mt-0.5 px-1.5 py-0.5 bg-orange-100 text-orange-800 rounded text-[9px] font-bold w-fit">
                                                                            {student.level}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                {daysInMonth.map(d => {
                                                                    const att = attendance.find(a => a.studentId === student.id && a.date === d.dateStr);
                                                                    const status = att ? att.status : null;
                                                                    
                                                                    if (status === "P") totalP++;
                                                                    if (status === "A") totalA++;

                                                                    return (
                                                                        <td key={d.dateStr} className={`px-1 py-1 border-r border-stone-100 text-center ${[0, 6].includes(d.dayOfWeek) ? 'bg-stone-50/50' : ''}`}>
                                                                            <button
                                                                                onClick={() => handleToggleCell(student, d.dateStr, status)}
                                                                                className={`w-7 h-7 rounded text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/30 flex items-center justify-center mx-auto ${
                                                                                    status === 'P' ? 'bg-emerald-100 text-emerald-700 border border-emerald-300 shadow-sm' :
                                                                                    status === 'A' ? 'bg-rose-100 text-rose-700 border border-rose-300 shadow-sm' :
                                                                                    'hover:bg-stone-100 text-transparent hover:text-stone-300 border border-transparent hover:border-stone-200 cursor-pointer'
                                                                                }`}
                                                                            >
                                                                                {status || '+'}
                                                                            </button>
                                                                        </td>
                                                                    );
                                                                })}
                                                                <td className="px-3 py-2 text-center font-bold text-emerald-700 border-l-2 border-stone-200 bg-emerald-50/50 sticky right-12 z-10">{totalP > 0 ? totalP : '-'}</td>
                                                                <td className="px-3 py-2 text-center font-bold text-rose-700 bg-rose-50/50 sticky right-0 z-10">{totalA > 0 ? totalA : '-'}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {/* 2.5 SECCIÓN CALIFICACIONES */}
                        {currentTab === "calificaciones" && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                        <h3 className="text-xl font-bold text-stone-800 flex items-center gap-2">
                                            <i className="fas fa-star text-amber-500"></i> Calificaciones
                                        </h3>
                                    </div>

                                    {/* Selector de Filtros */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                        <div>
                                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Nivel / Curso</label>
                                            <select 
                                                value={gradesNivel} 
                                                onChange={(e) => setGradesNivel(e.target.value)}
                                                className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-stone-50 font-medium"
                                            >
                                                <option value="Todos">Todos los cursos</option>
                                                {configLevels.map(c => <option key={c.id} value={c.curso_nivel}>{c.curso_nivel}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-t border-b border-stone-100 mb-6">
                                        <div className="text-sm font-semibold text-stone-600">
                                            Alumnos en este curso: <span className="text-amber-600 font-bold">{studentsForGrades.length}</span>
                                        </div>
                                    </div>

                                    {/* Grilla de Calificaciones */}
                                    {studentsForGrades.length === 0 ? (
                                        <div className="text-center py-12 text-stone-400">
                                            <i className="fas fa-graduation-cap text-4xl mb-3"></i>
                                            <p className="font-medium">No hay alumnos registrados en este nivel</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto bg-white border border-stone-100 rounded-xl shadow-inner pb-12">
                                            <table className="w-full text-sm text-left whitespace-nowrap">
                                                <thead className="text-xs text-stone-500 bg-stone-50 border-b border-stone-100 uppercase font-bold">
                                                    <tr>
                                                        <th className="px-4 py-3 sticky left-0 bg-stone-50 z-20 border-r border-stone-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">Estudiante</th>
                                                        {currentLevelColumns.map((col, idx) => (
                                                            <th key={col.id} className="px-4 py-3 text-center border-r border-stone-100 min-w-[100px] group/col">
                                                                <div className="flex flex-col items-center relative">
                                                                    <span className="text-[10px] text-stone-400 mb-1">Nota {idx + 1}</span>
                                                                    <span className="text-xs text-stone-700">{col.title}</span>
                                                                    <button 
                                                                        onClick={() => handleEditGradeColumn(col.id, col.title)}
                                                                        className="absolute -top-1 -right-2 w-5 h-5 bg-stone-100 hover:bg-amber-100 text-stone-400 hover:text-amber-600 rounded flex items-center justify-center opacity-0 group-hover/col:opacity-100 transition-all cursor-pointer shadow-sm border border-stone-200"
                                                                        title="Editar o eliminar columna"
                                                                    >
                                                                        <i className="fas fa-pencil-alt text-[10px]"></i>
                                                                    </button>
                                                                </div>
                                                            </th>
                                                        ))}
                                                        <th className="px-4 py-3 border-r border-stone-100 text-center min-w-[60px]">
                                                            <button 
                                                                onClick={handleAddGradeColumn}
                                                                className="w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-colors mx-auto shadow-sm"
                                                                title="Añadir Evaluación"
                                                            >
                                                                <i className="fas fa-plus"></i>
                                                            </button>
                                                        </th>
                                                        <th className="px-4 py-3 text-center border-l-2 border-stone-200 bg-stone-100 text-stone-800 sticky right-0 z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.02)]">Prom. Anual</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-stone-100">
                                                    {studentsForGrades.map(student => {
                                                        let totalScore = 0;
                                                        let countScore = 0;
                                                        
                                                        return (
                                                            <tr key={student.id} className="hover:bg-amber-50/30 transition-colors group">
                                                                <td className="px-4 py-3 font-semibold text-stone-700 sticky left-0 bg-white group-hover:bg-amber-50/80 z-10 border-r border-stone-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                                                                    <div className="text-sm uppercase">{student.name}</div>
                                                                    <div className="text-[10px] text-stone-400 font-normal mt-0.5">DNI {student.dni || '-'}</div>
                                                                </td>
                                                                {currentLevelColumns.map(col => {
                                                                    const grade = grades.find(g => g.studentId === student.id && g.columnId === col.id);
                                                                    const scoreVal = grade ? grade.score : "";
                                                                    if (grade && grade.score) {
                                                                        totalScore += grade.score;
                                                                        countScore++;
                                                                    }
                                                                    
                                                                    let colorClass = "border-stone-200 text-stone-700 bg-transparent";
                                                                    if (scoreVal !== "") {
                                                                        const s = parseFloat(scoreVal);
                                                                        if (s >= 7) colorClass = "border-emerald-400 text-emerald-700 bg-emerald-50";
                                                                        else if (s >= 4) colorClass = "border-amber-400 text-amber-700 bg-amber-50";
                                                                        else colorClass = "border-rose-400 text-rose-700 bg-rose-50";
                                                                    }

                                                                    return (
                                                                        <td key={col.id} className="px-4 py-3 border-r border-stone-100 text-center">
                                                                            <input
                                                                                type="text"
                                                                                defaultValue={scoreVal}
                                                                                onBlur={(e) => {
                                                                                    if (e.target.value !== String(scoreVal)) {
                                                                                        handleUpdateGrade(student.id, col.id, e.target.value);
                                                                                    }
                                                                                }}
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === 'Enter') {
                                                                                        e.target.blur();
                                                                                    }
                                                                                }}
                                                                                className={`w-16 h-8 text-center font-bold text-sm rounded-full border outline-none focus:ring-2 focus:ring-amber-500/30 transition-colors mx-auto block ${colorClass}`}
                                                                                placeholder="-"
                                                                            />
                                                                        </td>
                                                                    );
                                                                })}
                                                                <td className="px-4 py-3 border-r border-stone-100 bg-stone-50/30 text-center"></td>
                                                                
                                                                <td className="px-4 py-3 text-center font-bold text-stone-800 border-l-2 border-stone-200 bg-stone-50 sticky right-0 z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.02)]">
                                                                    {countScore > 0 ? (totalScore / countScore).toFixed(2) : '-'}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {/* 2.75 SECCIÓN MESAS DE EXAMEN */}
                        {currentTab === "mesas" && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                        <h3 className="text-xl font-bold text-stone-800 flex items-center gap-2">
                                            <i className="fas fa-gavel text-amber-500"></i> Mesas de Examen
                                        </h3>
                                    </div>

                                    {/* Selector de Filtros */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                        <div>
                                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Nivel / Curso a Evaluar</label>
                                            <select 
                                                value={mesasNivel} 
                                                onChange={(e) => setMesasNivel(e.target.value)}
                                                className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-stone-50 font-medium"
                                            >
                                                <option value="Todos">Todos los niveles</option>
                                                {configLevels.map(c => <option key={c.id} value={c.curso_nivel}>{c.curso_nivel}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Filtrar por Sede</label>
                                            <select 
                                                value={mesasSede} 
                                                onChange={(e) => setMesasSede(e.target.value)}
                                                className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-stone-50 font-medium"
                                            >
                                                <option value="Todas">Todas las sedes</option>
                                                {sedes.map(s => <option key={s.id} value={s.nombre}>{s.nombre}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-t border-b border-stone-100 mb-6">
                                        <div className="text-sm font-semibold text-stone-600">
                                            Alumnos listados: <span className="text-amber-600 font-bold">{studentsForMesas.length}</span>
                                        </div>
                                    </div>

                                    {/* Grilla de Mesas de Examen */}
                                    {studentsForMesas.length === 0 ? (
                                        <div className="text-center py-12 text-stone-400">
                                            <i className="fas fa-users-slash text-4xl mb-3"></i>
                                            <p className="font-medium">No hay alumnos que coincidan con estos filtros</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto bg-white border border-stone-100 rounded-xl shadow-inner pb-12">
                                            <table className="w-full text-sm text-left whitespace-nowrap">
                                                <thead className="text-xs text-stone-500 bg-stone-50 border-b border-stone-100 uppercase font-bold">
                                                    <tr>
                                                        <th className="px-4 py-3 sticky left-0 bg-stone-50 z-20 border-r border-stone-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)] min-w-[200px]">Estudiante</th>
                                                        {currentMesasColumns.map((col, idx) => (
                                                            <th key={col.id} className="px-4 py-3 text-center border-r border-stone-100 min-w-[100px] group/col">
                                                                <div className="flex flex-col items-center relative">
                                                                    <span className="text-[10px] text-stone-400 mb-1">Nota {idx + 1}</span>
                                                                    <span className="text-xs text-stone-700">{col.title}</span>
                                                                    <button 
                                                                        onClick={() => handleEditMesasColumn(col.id, col.title)}
                                                                        className="absolute -top-1 -right-2 w-5 h-5 bg-stone-100 hover:bg-amber-100 text-stone-400 hover:text-amber-600 rounded flex items-center justify-center opacity-0 group-hover/col:opacity-100 transition-all cursor-pointer shadow-sm border border-stone-200"
                                                                        title="Editar o eliminar columna"
                                                                    >
                                                                        <i className="fas fa-pencil-alt text-[10px]"></i>
                                                                    </button>
                                                                </div>
                                                            </th>
                                                        ))}
                                                        <th className="px-4 py-3 border-r border-stone-100 text-center min-w-[60px]">
                                                            <button 
                                                                onClick={handleAddMesasColumn}
                                                                className="w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-colors mx-auto shadow-sm"
                                                                title="Añadir Evaluación"
                                                            >
                                                                <i className="fas fa-plus"></i>
                                                            </button>
                                                        </th>
                                                        <th className="px-4 py-3 text-center border-l-2 border-stone-200 bg-stone-100 text-stone-800 sticky right-0 z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.02)]">Nota Final</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-stone-100">
                                                    {studentsForMesas.map(student => {
                                                        let totalScore = 0;
                                                        let countScore = 0;
                                                        
                                                        const statusRecord = mesasGrades.find(g => g.id === `status_${student.id}`);
                                                        const isAbsent = statusRecord ? statusRecord.isAbsent : false;
                                                        
                                                        return (
                                                            <tr key={student.id} className={`hover:bg-amber-50/30 transition-colors group ${isAbsent ? 'opacity-50 grayscale' : ''}`}>
                                                                <td className="px-4 py-3 font-semibold text-stone-700 sticky left-0 bg-white group-hover:bg-amber-50/80 z-10 border-r border-stone-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                                                                    <div className="flex items-center gap-3">
                                                                        <button
                                                                            onClick={() => handleToggleMesasStudent(student.id, isAbsent)}
                                                                            className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center transition-colors shadow-sm ${
                                                                                isAbsent 
                                                                                    ? 'bg-rose-100 text-rose-600 border border-rose-200 hover:bg-rose-200' 
                                                                                    : 'bg-emerald-100 text-emerald-600 border border-emerald-200 hover:bg-emerald-200'
                                                                            }`}
                                                                            title={isAbsent ? "Marcar como que RINDE" : "Marcar como que NO RINDE"}
                                                                        >
                                                                            <i className={`fas ${isAbsent ? 'fa-times' : 'fa-check'} text-[10px]`}></i>
                                                                        </button>
                                                                        <div>
                                                                            <div className="text-sm uppercase">{student.name}</div>
                                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                                <span className="text-[10px] text-stone-400 font-normal">DNI {student.dni || '-'}</span>
                                                                                <span className="text-[9px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded font-bold">{student.sede}</span>
                                                                                {student.level && (
                                                                                    <span className="text-[9px] bg-amber-50 text-amber-600 border border-amber-100 px-1.5 py-0.5 rounded font-bold">{student.level}</span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                {currentMesasColumns.map(col => {
                                                                    const grade = mesasGrades.find(g => g.studentId === student.id && g.columnId === col.id);
                                                                    const scoreVal = grade ? grade.score : "";
                                                                    if (grade && grade.score && !isAbsent) {
                                                                        totalScore += grade.score;
                                                                        countScore++;
                                                                    }
                                                                    
                                                                    let colorClass = "border-stone-200 text-stone-700 bg-transparent";
                                                                    if (scoreVal !== "") {
                                                                        const s = parseFloat(scoreVal);
                                                                        if (s >= 7) colorClass = "border-emerald-400 text-emerald-700 bg-emerald-50";
                                                                        else if (s >= 4) colorClass = "border-amber-400 text-amber-700 bg-amber-50";
                                                                        else colorClass = "border-rose-400 text-rose-700 bg-rose-50";
                                                                    }

                                                                    return (
                                                                        <td key={col.id} className="px-4 py-3 border-r border-stone-100 text-center">
                                                                            <input
                                                                                type="text"
                                                                                defaultValue={scoreVal}
                                                                                disabled={isAbsent}
                                                                                onBlur={(e) => {
                                                                                    if (e.target.value !== String(scoreVal)) {
                                                                                        handleUpdateMesasGrade(student.id, col.id, e.target.value);
                                                                                    }
                                                                                }}
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === 'Enter') {
                                                                                        e.target.blur();
                                                                                    }
                                                                                }}
                                                                                className={`w-16 h-8 text-center font-bold text-sm rounded-full border outline-none focus:ring-2 focus:ring-amber-500/30 transition-colors mx-auto block ${colorClass}`}
                                                                                placeholder="-"
                                                                            />
                                                                        </td>
                                                                    );
                                                                })}
                                                                <td className="px-4 py-3 border-r border-stone-100 bg-stone-50/30 text-center"></td>
                                                                
                                                                <td className="px-4 py-3 text-center font-bold text-stone-800 border-l-2 border-stone-200 bg-stone-50 sticky right-0 z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.02)]">
                                                                    {countScore > 0 ? (totalScore / countScore).toFixed(2) : '-'}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
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
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                setNewPayment(prev => ({ ...prev, studentId: "" }));
                                                                setStudentSelectSearch("");
                                                            }}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 font-bold text-xs bg-stone-100 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                                                            title="Limpiar selección"
                                                        >
                                                            <i className="fas fa-times"></i> Limpiar
                                                        </button>
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
                                                                <td 
                                                                    className="py-3 px-4 font-semibold text-stone-800 cursor-pointer hover:text-emerald-600 hover:underline transition-colors"
                                                                    title="Nuevo cobro para este alumno"
                                                                    onClick={() => {
                                                                        setNewPayment(prev => ({ ...prev, studentId: p.studentId }));
                                                                        setStudentSelectSearch(p.studentName);
                                                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                                                    }}
                                                                >
                                                                    {p.studentName}
                                                                </td>
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
                                        
                                        <select
                                            value={alumnoStatusTab}
                                            onChange={(e) => setAlumnoStatusTab(e.target.value)}
                                            className="p-3 rounded-xl border border-stone-200 text-sm outline-none bg-stone-50 font-semibold text-stone-600"
                                        >
                                            <option value="activos">Alumnos Activos</option>
                                            <option value="bajas">Alumnos en Baja (Bajas)</option>
                                            <option value="todos">Todos los Alumnos</option>
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
                                                    <th className="py-3 px-4 text-right">Saldo Deudor</th>
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
                                                            <td className="py-3.5 px-4 text-right">
                                                                <span className={`font-bold ${studentDebts[student.id] > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                                    ${studentDebts[student.id]?.toLocaleString() || 0}
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
                                                                    <div className="flex gap-1">
                                                                        <button 
                                                                            onClick={() => handleToggleStudentStatus(student.id, true)}
                                                                            title="Reincorporar (Activar)"
                                                                            className="p-1.5 bg-emerald-50 hover:bg-emerald-500 hover:text-white text-emerald-600 rounded-lg transition-all"
                                                                        >
                                                                            <i className="fas fa-user-plus text-sm"></i>
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteStudent(student.id)}
                                                                            title="Eliminar Definitivamente"
                                                                            className="p-1.5 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-600 rounded-lg transition-all"
                                                                        >
                                                                            <i className="fas fa-trash-alt text-sm"></i>
                                                                        </button>
                                                                    </div>
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
                                                value={modalLevel}
                                                onChange={(e) => handleLevelChangeInModal(e.target.value)}
                                                className="w-full p-3 rounded-xl border border-stone-200 outline-none bg-stone-50 font-semibold"
                                            >
                                                {[...configLevels].sort((a, b) => NIVELES.indexOf(a.curso_nivel) - NIVELES.indexOf(b.curso_nivel)).map(c => <option key={c.id} value={c.curso_nivel}>{c.curso_nivel}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Email del Alumno/Tutor</label>
                                            <input 
                                                type="email" 
                                                name="email"
                                                defaultValue={editingStudent?.email || ""}
                                                className="w-full p-3 rounded-xl border border-stone-200 outline-none bg-stone-50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Fecha de Inscripción *</label>
                                            <input 
                                                type="date" 
                                                name="fecha_inicio"
                                                defaultValue={editingStudent?.fecha_inicio || ""}
                                                required
                                                className="w-full p-3 rounded-xl border border-stone-200 outline-none bg-stone-50 font-semibold"
                                            />
                                        </div>
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

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Cuota Mensual ($)</label>
                                            <input 
                                                type="number" 
                                                name="cuotaOverride"
                                                value={modalCuota}
                                                onChange={(e) => setModalCuota(e.target.value)}
                                                className="w-full p-3 rounded-xl border border-stone-200 outline-none bg-amber-50 font-semibold"
                                            />
                                            <p className="text-[10px] text-stone-400 mt-1">Modificar si es un arancel personalizado</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Inscripción ($)</label>
                                            <input 
                                                type="number" 
                                                name="inscripcionOverride"
                                                value={modalInscripcion}
                                                onChange={(e) => setModalInscripcion(e.target.value)}
                                                className="w-full p-3 rounded-xl border border-stone-200 outline-none bg-amber-50 font-semibold"
                                            />
                                            <p className="text-[10px] text-stone-400 mt-1">Modificar si es una matrícula personalizada</p>
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
                                            {selectedStudentDetail.fecha_inicio && (
                                                <p className="text-xs font-semibold text-amber-600 mt-1">
                                                    Inscripto el: {formatDate(selectedStudentDetail.fecha_inicio)}
                                                </p>
                                            )}
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
                                        <div className="flex justify-between items-start mb-3">
                                            <h4 className="text-xs font-bold text-stone-400 uppercase">Estado Financiero</h4>
                                            <div className="text-right">
                                                <p className={`text-xl font-extrabold ${studentDebts[selectedStudentDetail.id] > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                    Saldo: ${studentDebts[selectedStudentDetail.id]?.toLocaleString() || 0}
                                                </p>
                                                {studentDebts[selectedStudentDetail.id] > 0 && activeStudentStats.missingPeriods.length > 0 && (
                                                    <p className="text-[10px] text-rose-500 font-bold">Meses impagos: {activeStudentStats.missingPeriods.join(', ')}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex flex-wrap gap-1.5">
                                                {(activeStudentStats.expectedPeriods || ["Marzo", "Abril", "Mayo", "Junio"]).map(month => {
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
                                            <div className="flex gap-4 text-[11px] text-stone-500 font-medium bg-white p-2 rounded-lg border border-stone-100">
                                                <p>Cuota mensual: <span className="font-bold text-stone-700">${activeStudentStats.valorCuota.toLocaleString()}</span></p>
                                                <p>Inscripción: <span className="font-bold text-stone-700">${activeStudentStats.valorInscripcion.toLocaleString()}</span></p>
                                            </div>
                                            {studentDebts[selectedStudentDetail.id] > 0 && selectedStudentDetail.email && (() => {
                                                const currentPeriod = new Date().toISOString().substring(0, 7);
                                                const isReminderSent = selectedStudentDetail.lastReminderPeriod === currentPeriod;
                                                return (
                                                    <button 
                                                        onClick={() => handleSendReminder()}
                                                        disabled={isSendingEmail || isReminderSent}
                                                        className={`mt-3 block w-full text-center ${isReminderSent ? 'bg-emerald-50 text-emerald-700 cursor-not-allowed border-emerald-200' : (isSendingEmail ? 'bg-rose-100 text-rose-400 cursor-not-allowed' : 'bg-rose-50 hover:bg-rose-100 text-rose-700')} font-bold py-2 px-4 rounded-xl text-xs transition-colors border ${!isReminderSent && 'border-rose-200'} shadow-sm`}
                                                    >
                                                        {isSendingEmail ? (
                                                            <><i className="fas fa-spinner fa-spin mr-2"></i> Enviando...</>
                                                        ) : isReminderSent ? (
                                                            <><i className="fas fa-check-circle mr-2"></i> Recordatorio ya enviado este mes</>
                                                        ) : (
                                                            <><i className="fas fa-envelope mr-2"></i> Enviar Recordatorio (vía Gmail)</>
                                                        )}
                                                    </button>
                                                );
                                            })()}
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

                                <div className="pt-6 mt-6 border-t border-stone-100 flex justify-between items-center">
                                    {selectedStudentDetail.active === false ? (
                                        <button
                                            onClick={() => handleDeleteStudent(selectedStudentDetail.id)}
                                            className="bg-red-100 hover:bg-red-200 text-red-700 font-bold py-2.5 px-6 rounded-xl text-sm transition-all shadow-sm flex items-center gap-2"
                                        >
                                            <i className="fas fa-trash-alt"></i> Eliminar Definitivamente
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setShowBoletin(true)}
                                            className="bg-stone-800 hover:bg-stone-900 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all shadow-md flex items-center gap-2"
                                        >
                                            <i className="fas fa-file-invoice"></i> Generar Boletín
                                        </button>
                                    )}
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
                                        {getReceiptBreakdown(activeReceipt, configLevels, students).map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-sm py-1 border-b border-dashed border-stone-100 animate-fadeIn">
                                                <div>
                                                    <p className="font-bold text-stone-800">{item.label}</p>
                                                    <p className="text-[10px] text-stone-400">{item.subtitle}</p>
                                                </div>
                                                <span className={`font-semibold ${item.label.includes("Parte de pago") ? "text-emerald-700" : "text-stone-700"}`}>
                                                    ${item.amount.toLocaleString()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Total Final */}
                                    <div className="border-t pt-4 flex justify-between items-center">
                                        <span className="text-xs font-black uppercase text-stone-500">Monto Total Recibido</span>
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-amber-900">${activeReceipt.amount.toLocaleString()}</p>
                                            <p className="text-[9px] text-stone-400 italic">Expresado en pesos argentinos</p>
                                        </div>
                                    </div>

                                    {/* Información de Saldos y Deudas */}
                                    {(activeReceipt.periodBalance > 0 || activeReceipt.previousDebt > 0 || activeReceipt.balanceToDate !== undefined) && (
                                        <div className="bg-amber-50/60 border border-amber-200/50 rounded-xl p-3 text-xs space-y-1.5 mt-2 animate-fadeIn">
                                            {activeReceipt.periodBalance > 0 && (
                                                <div className="flex justify-between text-amber-900 font-semibold">
                                                    <span>Saldo pendiente de este período ({activeReceipt.period}):</span>
                                                    <span className="font-extrabold">${activeReceipt.periodBalance.toLocaleString()}</span>
                                                </div>
                                            )}
                                            {activeReceipt.balanceToDate !== undefined && (
                                                <div className="flex justify-between text-stone-700 font-bold border-t border-dashed border-stone-200 pt-1">
                                                    <span>Saldo total pendiente a la fecha:</span>
                                                    <span className="font-extrabold">${activeReceipt.balanceToDate.toLocaleString()}</span>
                                                </div>
                                            )}
                                            {activeReceipt.previousDebt > 0 && (
                                                <div className="flex justify-between text-rose-800 font-bold">
                                                    <span>⚠️ Recordatorio de Deuda Anterior Acumulada:</span>
                                                    <span className="font-extrabold">${activeReceipt.previousDebt.toLocaleString()}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}



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
                                        <i className="fas fa-print"></i> Imprimir (PDF)
                                    </button>
                                    <button 
                                        onClick={handleSendEmail}
                                        disabled={isSendingEmail}
                                        className={`flex-1 ${isSendingEmail ? 'bg-rose-400 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-700'} text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2`}
                                    >
                                        {isSendingEmail ? (
                                            <><i className="fas fa-spinner fa-spin"></i> Enviando...</>
                                        ) : (
                                            <><i className="fas fa-envelope"></i> Enviar Gmail</>
                                        )}
                                    </button>
                                </div>

                            </div>
                        </div>
                    )}

                    {/* --- FIN MODALES --- */}

                    {/* Footer Institucional */}
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

                    {/* --- CONTENEDOR ESPECIAL DE IMPRESIÓN SOLO PARA EL RECIBO --- */}
                    {activeReceipt && (
                        <div className="hidden print-only">
                            <div className="bg-white text-black p-8 font-sans" style={{ width: "100%", maxWidth: "500px", margin: "0 auto" }}>
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
                                        {getReceiptBreakdown(activeReceipt, configLevels, students).map((item, idx) => (
                                            <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "5px 0", borderBottom: "1px dashed #eee" }}>
                                                <div>
                                                    <p style={{ margin: "0", fontWeight: "bold" }}>{item.label}</p>
                                                    <p style={{ margin: "2px 0 0 0", fontSize: "10px", color: "#666" }}>{item.subtitle}</p>
                                                </div>
                                                <span style={{ fontWeight: "semibold", color: item.label.includes("Parte de pago") ? "#047857" : "#000" }}>
                                                    ${item.amount.toLocaleString()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "15px" }}>
                                        <span style={{ fontSize: "12px", fontWeight: "bold", textTransform: "uppercase" }}>Monto Recibido</span>
                                        <span style={{ fontSize: "22px", fontWeight: "900" }}>${activeReceipt.amount.toLocaleString()}</span>
                                    </div>
                                    {(activeReceipt.periodBalance > 0 || activeReceipt.previousDebt > 0 || activeReceipt.balanceToDate !== undefined) && (
                                        <div style={{ backgroundColor: "#fef3c7", border: "1px solid #fde68a", borderRadius: "6px", padding: "10px", marginTop: "15px", fontSize: "11px", lineHeight: "1.4" }}>
                                            {activeReceipt.periodBalance > 0 && (
                                                <div style={{ display: "flex", justifyContent: "space-between", color: "#78350f", fontWeight: "600" }}>
                                                    <span>Saldo pendiente de este período ({activeReceipt.period}):</span>
                                                    <span><strong>${activeReceipt.periodBalance.toLocaleString()}</strong></span>
                                                </div>
                                            )}
                                            {activeReceipt.balanceToDate !== undefined && (
                                                <div style={{ display: "flex", justifyContent: "space-between", color: "#44403c", fontWeight: "700", borderTop: "1px dashed #d6d3d1", marginTop: "5px", paddingTop: "5px" }}>
                                                    <span>Saldo total pendiente a la fecha:</span>
                                                    <span><strong>${activeReceipt.balanceToDate.toLocaleString()}</strong></span>
                                                </div>
                                            )}
                                            {activeReceipt.previousDebt > 0 && (
                                                <div style={{ display: "flex", justifyContent: "space-between", color: "#991b1b", fontWeight: "700", marginTop: "5px" }}>
                                                    <span>⚠️ Recordatorio de Deuda Anterior Acumulada:</span>
                                                    <span><strong>${activeReceipt.previousDebt.toLocaleString()}</strong></span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                </div>
                            </div>
                        </div>
                    )}


                    {showBoletin && selectedStudentDetail && (
                        <BoletinPreview 
                            student={selectedStudentDetail}
                            sedeObj={sedes.find(s => s.nombre === globalSede)}
                            grades={grades}
                            gradeColumns={gradeColumns[selectedStudentDetail.level] || []}
                            mesasGrades={mesasGrades}
                            mesasColumns={mesasColumns}
                            attendance={attendance}
                            profesorName={generalConfig?.profesor || (currentUser?.dni === 'admin' ? sedeProfesor?.nombre : currentUser?.nombre)}
                            onClose={() => setShowBoletin(false)}
                        />
                    )}

                </div>
            );
        }

        // Renderizado

export default App;
