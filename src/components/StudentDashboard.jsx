import React, { useState, useMemo } from 'react';
import { ref, set, update } from 'firebase/database';
import { rtdb } from '../config/firebase';
import BoletinModal from './modals/BoletinModal';
import { getHistoricalValues, isMonthInactive, MONTHS_ORDER } from '../utils/mathHelpers';

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

/* ─────────────────────────────────────────────── helpers ─── */
function calcDebt(student, payments, configLevels) {
    const currentMonthIdx = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    let startMonthIdx = 2, startYear = currentYear;
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
    let currentCuota = 0;
    let nextPaymentMonth = "";
    
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
            const levelConfig = configLevels.find(c => c.curso_nivel === student.level) || configLevels.find(c => c.curso_nivel === student.taller);
            const hist = getHistoricalValues(levelConfig, i, year);
            const mInsc = student.inscripcionOverride !== undefined && student.inscripcionOverride !== '' ? Number(student.inscripcionOverride) : hist.inscripcion;
            const mCuota = student.cuotaOverride !== undefined && student.cuotaOverride !== '' ? Number(student.cuotaOverride) : hist.cuota;
            
            const expectedForMonth = (year === startYear && i === monthStart) ? (mInsc + mCuota) : mCuota;
            totalExpected += expectedForMonth;
            currentCuota = mCuota;
            
            if (totalExpected > totalPaid && !nextPaymentMonth) {
                nextPaymentMonth = MONTHS_ES[i];
            }
        }
    }
    
    if (!nextPaymentMonth) {
        nextPaymentMonth = MONTHS_ES[(currentMonthIdx + 1) % 12];
    }
    
    return { totalPaid, totalExpected, debt: Math.max(0, totalExpected - totalPaid), currentCuota, nextPaymentMonth };
}

/* ─────────────────────────────── section button component ─── */
function SectionCard({ icon, title, color, active, onClick, badge }) {
    return (
        <button
            onClick={onClick}
            className={`
                relative flex flex-col items-center justify-center gap-3 p-5 rounded-2xl
                font-bold transition-all duration-200 cursor-pointer border-2 text-center
                hover:scale-105 active:scale-95 shadow-md
                ${active
                    ? `${color.active} border-opacity-100 shadow-lg`
                    : `bg-white border-stone-100 text-stone-600 hover:border-stone-300 hover:shadow-lg`}
            `}
            style={active ? { borderColor: color.border, color: color.text, background: color.bg } : {}}
        >
            {badge != null && badge > 0 && (
                <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow">
                    {badge}
                </span>
            )}
            <i className={`fas ${icon} text-2xl`} style={active ? { color: color.text } : { color: color.border }}></i>
            <span className="text-xs uppercase tracking-wide leading-tight">{title}</span>
        </button>
    );
}

/* ─────────────────────────────────────────────── main ─── */
export default function StudentDashboard({
    currentUser,
    students,
    payments,
    attendance,
    grades,
    gradeColumns,
    mesasGrades,
    mesasColumns,
    configLevels,
    announcements,
    generalConfig,
    globalSede,
    sedes,
    NIVELES,
    addNotification,
    handleLogout,
    setBoletinStudent,
    setShowBoletin,
    setActiveReceipt,
}) {
    /* find student record linked to this login */
    const student = useMemo(() => {
        return students.find(s => s.dni === currentUser.dni && s.sede === globalSede)
            || students.find(s => s.dni === currentUser.dni)
            || currentUser;
    }, [students, currentUser, globalSede]);

    const [activeSection, setActiveSection] = useState('ficha');
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        name: student.name || '',
        phone: student.phone || '',
        email: student.email || '',
        address: student.address || '',
        tutor: student.tutor || '',
    });

    // Exam inscription
    const safeLevel = (student.level || student.taller || '').replace(/[.#$[\]/]/g, '_');
    const inscripcionId = `inscripcion_${student.id}_${safeLevel}`;
    const isInscripto = useMemo(() => !!mesasGrades.find(g => g.id === inscripcionId), [mesasGrades, inscripcionId]);

    // Config for inscription availability
    const inscripcionHabilitada = useMemo(() => {
        if (!generalConfig?.habilitarInscripcionMesas) return false;
        const today = new Date().toISOString().split('T')[0];
        const desde = generalConfig.fechaInicioInscripcionMesas || '';
        const hasta = generalConfig.fechaFinInscripcionMesas || '';
        if (desde && hasta) return today >= desde && today <= hasta;
        if (desde && !hasta) return today >= desde;
        return true;
    }, [generalConfig]);

    // Finance
    const { totalPaid, totalExpected, debt, currentCuota, nextPaymentMonth } = useMemo(() => calcDebt(student, payments, configLevels), [student, payments, configLevels]);
    const myPayments = useMemo(() => payments.filter(p => p.studentId === student.id).sort((a, b) => b.date.localeCompare(a.date)), [payments, student.id]);

    // Attendance
    const myAttendance = useMemo(() => attendance.filter(a => a.studentId === student.id).sort((a, b) => b.date.localeCompare(a.date)), [attendance, student.id]);
    const presents = myAttendance.filter(a => a.status === 'P' || a.status === 'present').length;
    const absents = myAttendance.filter(a => a.status === 'A' || a.status === 'absent').length;
    const justified = myAttendance.filter(a => a.status === 'J').length;
    const totalAtt = myAttendance.length;
    const attRate = totalAtt > 0 ? Math.round((presents / totalAtt) * 100) : 0;

    // Grades
    const myGrades = useMemo(() => grades.filter(g => g.studentId === student.id), [grades, student.id]);
    const myLevel = student.level || student.taller || '';
    const levelColumns = gradeColumns[myLevel] || [];

    // Announcements
    const myAnnouncements = useMemo(() =>
        announcements.filter(a => a.sede === 'Global' || a.sede === globalSede).sort((a, b) => b.date.localeCompare(a.date)),
        [announcements, globalSede]
    );

    // Historial mesas
    const myMesasGrades = useMemo(() => mesasGrades.filter(g => g.studentId === student.id), [mesasGrades, student.id]);

    const sedeObj = sedes.find(s => s.nombre === globalSede);
    const profesorName = generalConfig?.profesor || '';

    async function handleSaveProfile(e) {
        e.preventDefault();
        if (!form.name.trim()) {
            addNotification('El nombre no puede estar vacío', 'error');
            return;
        }
        setSaving(true);
        try {
            await update(ref(rtdb, `alumnos/${student.id}`), {
                name: form.name.trim(),
                phone: form.phone.trim(),
                email: form.email.trim(),
                address: form.address.trim(),
                tutor: form.tutor.trim(),
                updatedAt: Date.now(),
            });
            addNotification('¡Datos actualizados correctamente!', 'success');
            setEditMode(false);
        } catch (err) {
            addNotification('Error al guardar los datos', 'error');
        } finally {
            setSaving(false);
        }
    }

    async function handleInscribirse() {
        try {
            if (isInscripto) {
                await set(ref(rtdb, `mesasExamen/${inscripcionId}`), null);
                addNotification('Te diste de baja de la mesa de examen', 'info');
            } else {
                await set(ref(rtdb, `mesasExamen/${inscripcionId}`), {
                    id: inscripcionId,
                    studentId: student.id,
                    studentName: student.name,
                    level: myLevel,
                    sede: globalSede,
                    inscripto: true,
                    timestamp: Date.now(),
                });
                addNotification('¡Inscripción a mesa de examen confirmada!', 'success');
            }
        } catch (err) {
            addNotification('Error al procesar la inscripción', 'error');
        }
    }

    const sections = [
        { id: 'ficha',        icon: 'fa-id-card',              title: 'Mi Ficha',        color: { bg: '#fff7ed', border: '#f97316', text: '#c2410c', active: '' } },
        { id: 'mensajes',     icon: 'fa-bullhorn',             title: 'Mensajes',        color: { bg: '#eff6ff', border: '#3b82f6', text: '#1d4ed8', active: '' }, badge: myAnnouncements.length },
        { id: 'calificaciones', icon: 'fa-star',               title: 'Calificaciones', color: { bg: '#fefce8', border: '#eab308', text: '#854d0e', active: '' } },
        { id: 'inasistencias', icon: 'fa-calendar-times',      title: 'Inasistencias',  color: { bg: '#fdf4ff', border: '#a855f7', text: '#7e22ce', active: '' }, badge: absents || undefined },
        { id: 'finanzas',     icon: 'fa-file-invoice-dollar',  title: 'Estado Financiero', color: { bg: debt > 0 ? '#fff1f2' : '#f0fdf4', border: debt > 0 ? '#f43f5e' : '#22c55e', text: debt > 0 ? '#be123c' : '#15803d', active: '' } },
        { id: 'mesas',        icon: 'fa-gavel',                title: 'Inscripción Mesas', color: { bg: '#ecfdf5', border: '#10b981', text: '#065f46', active: '' } },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 font-sans">

            {/* ─── Header ─── */}
            <header className="bg-gradient-to-r from-black to-stone-900 text-white shadow-xl no-print">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 sm:w-16 h-auto flex-shrink-0">
                            <img src="/logo.png" alt="Logo IDeAr" className="w-full h-auto object-contain drop-shadow-md" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h1 className="text-base sm:text-lg font-extrabold tracking-tight truncate">Portal del Alumno</h1>
                                <span className="text-[10px] bg-amber-800 text-amber-200 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">IDeAr</span>
                            </div>
                            <p className="text-[10px] text-orange-300 font-semibold truncate">
                                {student.name} · <span className="text-stone-400">{globalSede}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="bg-rose-600 hover:bg-rose-700 text-white text-xs px-3 py-2 rounded-xl font-medium transition-all cursor-pointer border-0 flex items-center gap-1.5"
                    >
                        <i className="fas fa-sign-out-alt"></i>
                        <span className="hidden sm:inline">Cerrar Sesión</span>
                    </button>
                </div>
            </header>

            {/* ─── Hero card ─── */}
            <div className="max-w-5xl mx-auto px-4 pt-8 pb-4">
                <div className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
                    <div className="absolute inset-0 opacity-10">
                        <img src="/logo.png" alt="" className="absolute right-0 bottom-0 w-48 h-48 object-contain translate-x-6 translate-y-6" />
                    </div>
                    <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0 shadow-inner">
                            <i className="fas fa-user-graduate text-white text-3xl"></i>
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-white/80 text-xs font-bold uppercase tracking-widest">Bienvenido/a</p>
                            <h2 className="text-white text-xl sm:text-2xl font-black tracking-tight truncate">{student.name}</h2>
                            <div className="flex flex-wrap gap-2 mt-2">
                                <span className="bg-white/20 text-white text-xs px-2.5 py-1 rounded-full font-semibold backdrop-blur">
                                    <i className="fas fa-school mr-1"></i>{globalSede}
                                </span>
                                <span className="bg-white/20 text-white text-xs px-2.5 py-1 rounded-full font-semibold backdrop-blur">
                                    <i className="fas fa-layer-group mr-1"></i>{myLevel || 'Sin nivel asignado'}
                                </span>
                                <span className="bg-white/20 text-white text-xs px-2.5 py-1 rounded-full font-semibold backdrop-blur">
                                    <i className="fas fa-id-card mr-1"></i>DNI {student.dni}
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <div className={`text-white text-right px-4 py-2 rounded-2xl font-bold shadow-inner backdrop-blur ${debt > 0 ? 'bg-rose-700/60' : 'bg-emerald-600/60'}`}>
                                <p className="text-[10px] uppercase tracking-wider opacity-80">{debt > 0 ? 'Deuda pendiente' : 'Al día ✓'}</p>
                                <p className="text-lg font-black">{debt > 0 ? `$${debt.toLocaleString('es-AR')}` : 'Sin deuda'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Navigation buttons ─── */}
            <div className="max-w-5xl mx-auto px-4 pb-2">
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {sections.map(s => (
                        <SectionCard
                            key={s.id}
                            icon={s.icon}
                            title={s.title}
                            color={s.color}
                            active={activeSection === s.id}
                            onClick={() => setActiveSection(s.id)}
                            badge={s.badge}
                        />
                    ))}
                </div>
            </div>

            {/* ─── Content ─── */}
            <div className="max-w-5xl mx-auto px-4 pb-20 pt-4">

                {/* ─ Ficha ─ */}
                {activeSection === 'ficha' && (
                    <div className="bg-white rounded-3xl shadow-xl p-6 animate-fadeIn">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-black text-stone-800 flex items-center gap-2">
                                <i className="fas fa-id-card text-orange-500"></i> Ficha del Alumno
                            </h3>
                            <button
                                onClick={() => {
                                    if (!editMode) {
                                        setForm({
                                            name: student.name || '',
                                            phone: student.phone || '',
                                            email: student.email || '',
                                            address: student.address || '',
                                            tutor: student.tutor || '',
                                        });
                                    }
                                    setEditMode(!editMode);
                                }}
                                className={`text-xs px-4 py-2 rounded-xl font-bold transition-all cursor-pointer border-0 flex items-center gap-1.5 ${editMode ? 'bg-stone-100 text-stone-600 hover:bg-stone-200' : 'bg-orange-500 hover:bg-orange-600 text-white shadow'}`}
                            >
                                <i className={`fas ${editMode ? 'fa-times' : 'fa-pen'}`}></i>
                                {editMode ? 'Cancelar' : 'Editar Datos'}
                            </button>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4 flex items-start gap-3">
                            <i className="fas fa-info-circle text-amber-500 mt-0.5 flex-shrink-0"></i>
                            <div>
                                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Datos de Contacto Editables</p>
                                <p className="text-[11px] text-amber-600 mt-0.5">Sede, nivel y fecha de inscripción solo pueden modificarse desde el panel administrativo.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                            {[
                                { icon: 'fa-user', label: 'Nombre Completo', value: editMode ? form.name : student.name, editable: true },
                                { icon: 'fa-id-card', label: 'DNI', value: student.dni },
                                { icon: 'fa-school', label: 'Sede', value: student.sede },
                                { icon: 'fa-layer-group', label: 'Nivel / Curso', value: myLevel || '-' },
                                { icon: 'fa-calendar-alt', label: 'Fecha de Inscripción', value: student.fecha_inicio || '-' },
                                { icon: 'fa-user-tie', label: 'Tutor Responsable', value: editMode ? form.tutor : (student.tutor || '-'), editable: true },
                            ].map(f => (
                                <div key={f.label} className={`rounded-2xl p-4 border transition-colors ${editMode ? (f.editable ? 'bg-white border-stone-200 shadow-sm' : 'bg-stone-100 border-stone-100') : 'bg-stone-50 border-stone-100'}`}>
                                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                                        <i className={`fas ${f.icon} mr-1`}></i>{f.label}
                                    </p>
                                    {editMode && f.editable ? (
                                        <input
                                            type="text"
                                            value={f.label === 'Nombre Completo' ? form.name : form.tutor}
                                            onChange={e => setForm(p => ({ ...p, [f.label === 'Nombre Completo' ? 'name' : 'tutor']: e.target.value }))}
                                            className="w-full font-bold text-stone-800 bg-transparent border-none outline-none"
                                        />
                                    ) : (
                                        <p className="font-bold text-stone-800">{f.value}</p>
                                    )}
                                </div>
                            ))}
                        </div>

                        {editMode ? (
                            <form onSubmit={handleSaveProfile} className="space-y-4">
                                <div className="border-t border-orange-100 pt-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Teléfono</label>
                                            <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                                                className="w-full p-3 rounded-xl border border-stone-200 outline-none bg-white font-semibold focus:ring-2 focus:ring-orange-400 transition-all shadow-sm"
                                                placeholder="Ej. 3754 123456" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Email</label>
                                            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                                                className="w-full p-3 rounded-xl border border-stone-200 outline-none bg-white font-semibold focus:ring-2 focus:ring-orange-400 transition-all shadow-sm"
                                                placeholder="tucorreo@email.com" />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Domicilio</label>
                                            <input type="text" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                                                className="w-full p-3 rounded-xl border border-stone-200 outline-none bg-white font-semibold focus:ring-2 focus:ring-orange-400 transition-all shadow-sm"
                                                placeholder="Calle, número, barrio..." />
                                        </div>
                                    </div>
                                </div>
                                <button type="submit" disabled={saving}
                                    className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer border-0">
                                    <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-save'}`}></i>
                                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </form>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-stone-100 pt-4">
                                {[
                                    { icon: 'fa-phone', label: 'Teléfono', value: student.phone || '-' },
                                    { icon: 'fa-envelope', label: 'Email', value: student.email || '-' },
                                    { icon: 'fa-map-marker-alt', label: 'Domicilio', value: student.address || '-' },
                                ].map(f => (
                                    <div key={f.label} className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
                                        <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider mb-1">
                                            <i className={`fas ${f.icon} mr-1`}></i>{f.label}
                                        </p>
                                        <p className="font-bold text-stone-800 break-all">{f.value}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        {!editMode && (
                            <p className="text-[10px] text-stone-400 mt-3 flex items-center gap-1">
                                <i className="fas fa-info-circle"></i>
                                Podés editar tu nombre, tutor y datos de contacto usando el botón "Editar Datos".
                            </p>
                        )}
                    </div>
                )}

                {/* ─ Mensajes ─ */}
                {activeSection === 'mensajes' && (
                    <div className="bg-white rounded-3xl shadow-xl p-6 animate-fadeIn">
                        <h3 className="text-lg font-black text-stone-800 flex items-center gap-2 mb-6">
                            <i className="fas fa-bullhorn text-blue-500"></i> Mensajes del Equipo IDeAr
                        </h3>
                        {myAnnouncements.length === 0 ? (
                            <div className="text-center py-12 text-stone-400">
                                <i className="fas fa-inbox text-4xl mb-3 block opacity-30"></i>
                                <p className="font-semibold">No hay mensajes en este momento</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {myAnnouncements.map(aviso => (
                                    <div key={aviso.id} className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-black text-stone-800 text-sm leading-snug mb-2">{aviso.title || aviso.text}</p>
                                                {aviso.title && <p className="text-stone-600 text-sm leading-relaxed">{aviso.text}</p>}
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${aviso.sede === 'Global' ? 'bg-stone-200 text-stone-600' : 'bg-blue-200 text-blue-700'}`}>
                                                {aviso.sede === 'Global' ? 'General' : aviso.sede}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-3 text-[10px] text-stone-400 font-semibold">
                                            {aviso.authorName && <span><i className="fas fa-user mr-1"></i>{aviso.authorName}</span>}
                                            {aviso.date && <span><i className="fas fa-calendar mr-1"></i>{new Date(aviso.date).toLocaleDateString('es-AR')}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ─ Calificaciones ─ */}
                {activeSection === 'calificaciones' && (
                    <div className="space-y-4 animate-fadeIn">
                        {/* Notas de Cursada */}
                        <div className="bg-white rounded-3xl shadow-xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-black text-stone-800 flex items-center gap-2">
                                    <i className="fas fa-star text-yellow-500"></i> Notas de la Cursada
                                </h3>
                                <button
                                    onClick={() => { setBoletinStudent(student); setShowBoletin(true); }}
                                    className="bg-amber-500 hover:bg-amber-600 text-white text-xs px-4 py-2 rounded-xl font-bold transition-all cursor-pointer border-0 flex items-center gap-1.5 shadow"
                                >
                                    <i className="fas fa-print"></i> Ver Boletín Oficial
                                </button>
                            </div>
                            {levelColumns.length === 0 ? (
                                <div className="text-center py-8 text-stone-400">
                                    <i className="fas fa-star text-3xl mb-2 block opacity-20"></i>
                                    <p className="font-semibold text-sm">No hay calificaciones registradas aún</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-2xl border border-stone-100">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-stone-50">
                                                {levelColumns.map(col => (
                                                    <th key={col.id} className="px-4 py-3 text-center text-[10px] font-black uppercase text-stone-500 tracking-wider border-b border-stone-100">
                                                        {col.title}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                {levelColumns.map(col => {
                                                    const g = myGrades.find(gd => gd.id === `${col.id}_${student.id}`);
                                                    const score = g ? g.score : '';
                                                    const num = parseFloat(score);
                                                    const colorClass = score === '' ? 'text-stone-400'
                                                        : num >= 7 ? 'text-emerald-700 font-black'
                                                        : num >= 4 ? 'text-amber-700 font-black'
                                                        : 'text-rose-700 font-black';
                                                    return (
                                                        <td key={col.id} className="px-4 py-4 text-center border-b border-stone-50">
                                                            <span className={`text-lg ${colorClass}`}>{score || '—'}</span>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Historial de Mesas */}
                        <div className="bg-white rounded-3xl shadow-xl p-6">
                            <h3 className="text-lg font-black text-stone-800 flex items-center gap-2 mb-4">
                                <i className="fas fa-history text-amber-500"></i> Historial de Mesas de Examen
                            </h3>
                            {mesasColumns.length === 0 ? (
                                <div className="text-center py-8 text-stone-400">
                                    <i className="fas fa-gavel text-3xl mb-2 block opacity-20"></i>
                                    <p className="font-semibold text-sm">No hay historial de mesas registrado</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {(NIVELES || []).filter(nivel => {
                                        const safeN = nivel.replace(/[.#$[\]/]/g, '_');
                                        return mesasColumns.some(col => myMesasGrades.find(g => g.id === `${col.id}_${student.id}_${safeN}`));
                                    }).map(nivel => {
                                        const safeN = nivel.replace(/[.#$[\]/]/g, '_');
                                        return (
                                            <div key={nivel} className="bg-stone-50 rounded-2xl p-4 border border-stone-100">
                                                <p className="text-xs font-black text-stone-600 uppercase mb-3">
                                                    {nivel}
                                                    {nivel === myLevel && <span className="ml-2 bg-amber-200 text-amber-800 text-[9px] px-1.5 py-0.5 rounded font-black">Actual</span>}
                                                </p>
                                                <div className="flex flex-wrap gap-3">
                                                    {mesasColumns.map(col => {
                                                        const g = myMesasGrades.find(gd => gd.id === `${col.id}_${student.id}_${safeN}`);
                                                        const score = g ? g.score : '';
                                                        const num = parseFloat(score);
                                                        const colorClass = score === '' ? 'bg-stone-100 text-stone-400'
                                                            : num >= 7 ? 'bg-emerald-100 text-emerald-800'
                                                            : num >= 4 ? 'bg-amber-100 text-amber-800'
                                                            : 'bg-rose-100 text-rose-800';
                                                        return (
                                                            <div key={col.id} className={`rounded-xl px-3 py-2 ${colorClass} text-center`}>
                                                                <p className="text-[9px] font-bold uppercase opacity-70">{col.title}</p>
                                                                <p className="text-lg font-black">{score || '—'}</p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {!(NIVELES || []).some(nivel => {
                                        const safeN = nivel.replace(/[.#$[\]/]/g, '_');
                                        return mesasColumns.some(col => myMesasGrades.find(g => g.id === `${col.id}_${student.id}_${safeN}`));
                                    }) && (
                                        <div className="text-center py-8 text-stone-400">
                                            <i className="fas fa-gavel text-3xl mb-2 block opacity-20"></i>
                                            <p className="font-semibold text-sm">Aún no tienes notas de mesas registradas</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ─ Inasistencias ─ */}
                {activeSection === 'inasistencias' && (
                    <div className="bg-white rounded-3xl shadow-xl p-6 animate-fadeIn">
                        <h3 className="text-lg font-black text-stone-800 flex items-center gap-2 mb-6">
                            <i className="fas fa-calendar-times text-purple-500"></i> Mis Inasistencias
                        </h3>
                        {/* Stats */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                            {[
                                { label: 'Presentes', value: presents, icon: 'fa-check-circle', color: 'emerald' },
                                { label: 'Ausentes', value: absents, icon: 'fa-times-circle', color: 'rose' },
                                { label: 'Justificadas', value: justified, icon: 'fa-info-circle', color: 'blue' },
                                { label: '% Asistencia', value: `${attRate}%`, icon: 'fa-chart-pie', color: attRate >= 75 ? 'emerald' : 'rose' },
                            ].map(stat => (
                                <div key={stat.label} className={`bg-${stat.color}-50 border border-${stat.color}-100 rounded-2xl p-4 text-center`}>
                                    <i className={`fas ${stat.icon} text-${stat.color}-500 text-xl mb-2 block`}></i>
                                    <p className={`text-2xl font-black text-${stat.color}-700`}>{stat.value}</p>
                                    <p className="text-[10px] text-stone-500 font-semibold uppercase">{stat.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Attendance rate bar */}
                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-stone-500 uppercase">Tasa de asistencia</span>
                                <span className={`text-sm font-black ${attRate >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>{attRate}%</span>
                            </div>
                            <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ${attRate >= 75 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                    style={{ width: `${attRate}%` }}
                                ></div>
                            </div>
                            {attRate < 75 && (
                                <p className="text-xs text-rose-500 mt-1 font-semibold">
                                    <i className="fas fa-exclamation-triangle mr-1"></i>
                                    Asistencia por debajo del 75% requerido
                                </p>
                            )}
                        </div>

                        {/* Absence list */}
                        <div>
                            <p className="text-xs font-bold text-stone-500 uppercase mb-3">Registro de Inasistencias</p>
                            {myAttendance.filter(a => a.status === 'A' || a.status === 'absent').length === 0 ? (
                                <div className="text-center py-8 text-emerald-500">
                                    <i className="fas fa-check-circle text-3xl mb-2 block"></i>
                                    <p className="font-bold text-sm">¡Sin inasistencias registradas!</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {myAttendance.filter(a => a.status === 'A' || a.status === 'absent').map((a, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-rose-50 rounded-xl px-4 py-2.5 border border-rose-100">
                                            <div className="flex items-center gap-3">
                                                <i className="fas fa-times-circle text-rose-400 text-sm"></i>
                                                <span className="font-semibold text-stone-700 text-sm">
                                                    {new Date(a.date + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-black bg-rose-200 text-rose-700 px-2 py-0.5 rounded-full uppercase">Ausente</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ─ Finanzas ─ */}
                {activeSection === 'finanzas' && (
                    <div className="space-y-4 animate-fadeIn">
                        {/* Summary card */}
                        <div className={`rounded-3xl shadow-xl p-6 ${debt > 0 ? 'bg-gradient-to-br from-rose-600 to-rose-800' : 'bg-gradient-to-br from-emerald-600 to-emerald-800'}`}>
                            <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">Estado Financiero</p>
                            <div className="grid grid-cols-3 gap-4 mt-4">
                                <div className="text-white text-center">
                                    <p className="text-[10px] uppercase opacity-70">Valor de Cuota</p>
                                    <p className="text-xl font-black">${(currentCuota || 0).toLocaleString('es-AR')}</p>
                                </div>
                                <div className="text-white text-center border-x border-white/20">
                                    <p className="text-[10px] uppercase opacity-70">Deuda o Saldo</p>
                                    <p className="text-xl font-black">${debt.toLocaleString('es-AR')}</p>
                                </div>
                                <div className="text-white text-center">
                                    <p className="text-[10px] uppercase opacity-70">Próximo Pago</p>
                                    <p className="text-xl font-black">{nextPaymentMonth}</p>
                                </div>
                            </div>
                        </div>

                        {/* Payment history */}
                        <div className="bg-white rounded-3xl shadow-xl p-6">
                            <h3 className="text-lg font-black text-stone-800 flex items-center gap-2 mb-4">
                                <i className="fas fa-receipt text-green-500"></i> Historial de Pagos
                            </h3>
                            {myPayments.length === 0 ? (
                                <div className="text-center py-10 text-stone-400">
                                    <i className="fas fa-receipt text-3xl mb-2 block opacity-20"></i>
                                    <p className="font-semibold text-sm">No hay pagos registrados</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {myPayments.map(p => (
                                        <div key={p.id} className="flex items-center justify-between bg-stone-50 hover:bg-emerald-50 rounded-2xl px-4 py-3 border border-stone-100 hover:border-emerald-100 transition-all group cursor-pointer"
                                            onClick={() => setActiveReceipt(p)}>
                                            <div>
                                                <p className="font-bold text-stone-800 text-sm">{p.concept || p.period}</p>
                                                <p className="text-[10px] text-stone-400 font-semibold uppercase">
                                                    <i className="fas fa-calendar mr-1"></i>{new Date(p.date + 'T00:00:00').toLocaleDateString('es-AR')} · {p.method}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-emerald-700">${p.amount.toLocaleString('es-AR')}</p>
                                                <p className="text-[9px] text-stone-400 opacity-0 group-hover:opacity-100 transition-all">
                                                    <i className="fas fa-eye mr-1"></i>Ver recibo
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ─ Inscripción Mesas ─ */}
                {activeSection === 'mesas' && (
                    <div className="bg-white rounded-3xl shadow-xl p-6 animate-fadeIn">
                        <h3 className="text-lg font-black text-stone-800 flex items-center gap-2 mb-2">
                            <i className="fas fa-gavel text-emerald-500"></i> Inscripción a Mesa de Examen
                        </h3>
                        <p className="text-sm text-stone-400 mb-6">
                            Inscribite a la mesa de examen de tu nivel actual. La inscripción se habilita en las fechas determinadas por Dirección.
                        </p>

                        {/* Current level info */}
                        <div className="bg-stone-50 rounded-2xl p-5 border border-stone-100 mb-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-bold text-stone-400 uppercase mb-1">Tu Nivel Actual</p>
                                    <p className="font-black text-stone-800">{myLevel || 'Sin nivel asignado'}</p>
                                </div>
                                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                                    <i className="fas fa-layer-group text-emerald-600 text-xl"></i>
                                </div>
                            </div>
                        </div>

                        {inscripcionHabilitada ? (
                            <div className="space-y-4">
                                {/* Dates info */}
                                {(generalConfig?.fechaInicioInscripcionMesas || generalConfig?.fechaFinInscripcionMesas) && (
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-sm">
                                        <p className="font-bold text-emerald-700 flex items-center gap-2 mb-1">
                                            <i className="fas fa-calendar-check"></i> Período de inscripción habilitado
                                        </p>
                                        {generalConfig.fechaInicioInscripcionMesas && (
                                            <p className="text-emerald-600 text-xs">
                                                Desde: <strong>{new Date(generalConfig.fechaInicioInscripcionMesas + 'T00:00:00').toLocaleDateString('es-AR')}</strong>
                                                {generalConfig.fechaFinInscripcionMesas && ` — Hasta: `}
                                                {generalConfig.fechaFinInscripcionMesas && <strong>{new Date(generalConfig.fechaFinInscripcionMesas + 'T00:00:00').toLocaleDateString('es-AR')}</strong>}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Inscription status */}
                                <div className={`rounded-2xl p-6 border-2 text-center ${isInscripto ? 'bg-emerald-50 border-emerald-200' : 'bg-stone-50 border-stone-200'}`}>
                                    {isInscripto ? (
                                        <>
                                            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200">
                                                <i className="fas fa-check text-white text-2xl"></i>
                                            </div>
                                            <p className="text-emerald-700 font-black text-lg mb-1">¡Estás Inscripto!</p>
                                            <p className="text-emerald-600 text-sm mb-5">Tu inscripción a la mesa de examen fue confirmada exitosamente.</p>
                                            <button onClick={handleInscribirse}
                                                className="bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold py-2.5 px-6 rounded-xl text-sm transition-all cursor-pointer border-0">
                                                <i className="fas fa-times-circle mr-2"></i>Dar de Baja
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-16 h-16 bg-stone-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <i className="fas fa-gavel text-stone-500 text-2xl"></i>
                                            </div>
                                            <p className="text-stone-700 font-black text-lg mb-1">Aún no estás inscripto</p>
                                            <p className="text-stone-500 text-sm mb-5">Hacé clic en el botón para confirmar tu inscripción a la mesa de examen de <strong>{myLevel}</strong>.</p>
                                            <button onClick={handleInscribirse}
                                                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold py-3 px-8 rounded-xl text-sm transition-all cursor-pointer border-0 shadow-lg shadow-emerald-200">
                                                <i className="fas fa-plus-circle mr-2"></i>Inscribirme a la Mesa de Examen
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-2xl p-8 border-2 border-dashed border-stone-200 text-center">
                                <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <i className="fas fa-lock text-stone-400 text-2xl"></i>
                                </div>
                                <p className="text-stone-600 font-black text-lg mb-1">Inscripción no disponible</p>
                                <p className="text-stone-400 text-sm">
                                    La inscripción a mesas de examen no está habilitada en este momento. Cuando Dirección la habilite, podrás inscribirte desde aquí.
                                </p>
                                {generalConfig?.fechaInicioInscripcionMesas && (
                                    <p className="text-amber-600 text-xs font-bold mt-3">
                                        <i className="fas fa-clock mr-1"></i>
                                        Próximo período: desde {new Date(generalConfig.fechaInicioInscripcionMesas + 'T00:00:00').toLocaleDateString('es-AR')}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ─── Footer ─── */}
            <footer className="bg-stone-950 text-stone-500 border-t border-stone-800 py-4 no-print">
                <div className="max-w-5xl mx-auto px-4 text-center text-xs">
                    <p className="font-bold text-stone-400">© 2026 Instituto para el Desarrollo del Arte (IDeAr) — Misiones, Argentina</p>
                </div>
            </footer>
        </div>
    );
}
