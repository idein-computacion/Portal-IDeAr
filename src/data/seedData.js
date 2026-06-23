export const SEED_STUDENTS = [
    { id: "52739073", name: "Back Brenda Anahi", dni: "52739073", level: "2do Preparatorio", sede: "Leandro N. Alem", phone: "3754472507", email: "brendaback@gmail.com", tutor: "Graciela Back", address: "Alem", active: true },
    { id: "40197439", name: "Tereschuk Anibal Adrian", dni: "40197439", level: "1ro Preparatorio", sede: "Leandro N. Alem", phone: "3754411223", email: "anibal_tereschuk@gmail.com", tutor: "Isabel Tereschuk", address: "Barrio Centro, Alem", active: true },
    { id: "42288209", name: "Olexen Mariana Cinthia", dni: "42288209", level: "1ro Preparatorio", sede: "Leandro N. Alem", phone: "3754456789", email: "mariana_olexen@gmail.com", tutor: "Rosa Olexen", address: "Av. Belgrano, Alem", active: true },
    { id: "43831994", name: "Carolina Belén Rominski", dni: "43831994", level: "2do Preparatorio", sede: "Leandro N. Alem", phone: "3754495541", email: "carogo12mez3@gmail.com", tutor: "María Rominski", address: "Calle Córdoba 519, Alem", active: true },
    { id: "52809887", name: "Hanna Denise Machado", dni: "52809887", level: "2do Preparatorio", sede: "Leandro N. Alem", phone: "3754422334", email: "hanna_machado@gmail.com", tutor: "Silvia Machado", address: "Alem", active: true },
    { id: "28539165", name: "Pufal Mariana Elizabeth", dni: "28539165", level: "2do Preparatorio", sede: "Leandro N. Alem", phone: "3754433445", email: "mariana_pufal@gmail.com", tutor: "Juan Pufal", address: "Alem", active: true },
    { id: "53090248", name: "Wach Candela Jazmín", dni: "53090248", level: "2do Preparatorio", sede: "Leandro N. Alem", phone: "3754556677", email: "candewach@gmail.com", tutor: "Patricia Wach", address: "Barrio Alem", active: true },
    { id: "53785780", name: "Arndt Ona Guillermina", dni: "53785780", level: "2do Preparatorio", sede: "Leandro N. Alem", phone: "3754567890", email: "ona_arndt@gmail.com", tutor: "Gisela Arndt", address: "Alem", active: true },
    { id: "34234803", name: "Leites Franco Emmanuel", dni: "34234803", level: "2do Elemental", sede: "Leandro N. Alem", phone: "3754123456", email: "leitesfranco@gmail.com", tutor: "Leites Pedro", address: "Cataratas del Iguazú 912, Alem", active: true },
    { id: "53796732", name: "Benjamin Maximiliano Losanto", dni: "53796732", level: "2do Elemental", sede: "Leandro N. Alem", phone: "3754678123", email: "benja_losanto@gmail.com", tutor: "Clara Losanto", address: "Barrio Illia, Alem", active: true },
    { id: "53536539", name: "Luz Milagros Pona Romero", dni: "53536539", level: "2do Elemental", sede: "Leandro N. Alem", phone: "3754667788", email: "luz_pona@gmail.com", tutor: "Romero Norma", address: "Alem", active: true },
    { id: "53537483", name: "Cardozo Gómez Fernández Sofía Itati", dni: "53537483", level: "1ro Preparatorio", sede: "Itacaruaré", phone: "3754491823", email: "sofia_cardozo@gmail.com", tutor: "Fernández Solange", address: "Itacaruaré", active: true },
    { id: "53785767", name: "Kohl de Oliveira William", dni: "53785767", level: "1ro Preparatorio", sede: "Itacaruaré", phone: "3754321908", email: "william_kohl@gmail.com", tutor: "Oliveira William", address: "Itacaruaré", active: true },
    { id: "52300816", name: "Da Rosa Luz Morena", dni: "52300816", level: "2do Preparatorio", sede: "Itacaruaré", phone: "3754988776", email: "luz_darosa@gmail.com", tutor: "Da Rosa Hugo", address: "Itacaruaré", active: true },
    { id: "54536877", name: "De Morais Keila Ayelen", dni: "54536877", level: "1ro Preparatorio", sede: "San Javier", phone: "3754129988", email: "keila_demorais@gmail.com", tutor: "De Morais Pedro", address: "San Javier", active: true },
    { id: "53795666", name: "Vasquez Alba Elena", dni: "53795666", level: "1ro Preparatorio", sede: "San Javier", phone: "3754432112", email: "alba_vasquez@gmail.com", tutor: "Vasquez Elena", address: "San Javier", active: true },
    { id: "55617160", name: "Aguirre Guadalupe Xiomara", dni: "55617160", level: "1ro Preparatorio", sede: "Cerro Azul", phone: "3754981245", email: "guadalupe_aguirre@gmail.com", tutor: "Aguirre Carmen", address: "Cerro Azul", active: true },
    { id: "36456601", name: "Ferreyra Yesica Belén", dni: "36456601", level: "1ro Preparatorio", sede: "Cerro Azul", phone: "3754881122", email: "yesica_ferreyra@gmail.com", tutor: "Ferreyra Juan", address: "Cerro Azul", active: true }
];

export const SEED_PAYMENTS = [
    { id: "pay-1", studentId: "53090248", studentName: "Wach Candela Jazmín", period: "Marzo", date: "2026-03-10", concept: "Inscripción y 1ra Cuota Profesorado", method: "Mercado Pago", amount: 40000, receiptNo: "00002-00000321" },
    { id: "pay-2", studentId: "52739073", studentName: "Back Brenda Anahi", period: "Marzo", date: "2026-03-10", concept: "1ra Cuota Profesorado", method: "Efectivo", amount: 40000, receiptNo: "00002-00000322" },
    { id: "pay-3", studentId: "53796732", studentName: "Benjamin Maximiliano Losanto", period: "Mayo", date: "2026-05-05", concept: "Cuota de Mayo", method: "Transferencia", amount: 20000, receiptNo: "00002-00000323" },
    { id: "pay-4", studentId: "53536539", studentName: "Luz Milagros Pona Romero", period: "Mayo", date: "2026-05-06", concept: "Cuota de Mayo + Matrícula", method: "Mercado Pago", amount: 40000, receiptNo: "00002-00000324" },
    { id: "pay-5", studentId: "40197439", studentName: "Tereschuk Anibal Adrian", period: "Marzo", date: "2026-03-12", concept: "Inscripción", method: "Efectivo", amount: 20000, receiptNo: "00002-00000325" }
];

export const SEED_ATTENDANCE = [
    { id: "att-1", date: "2026-06-22", studentId: "52739073", studentName: "Back Brenda Anahi", level: "2do Preparatorio", sede: "Leandro N. Alem", status: "P" },
    { id: "att-2", date: "2026-06-22", studentId: "40197439", studentName: "Tereschuk Anibal Adrian", level: "1ro Preparatorio", sede: "Leandro N. Alem", status: "P" },
    { id: "att-3", date: "2026-06-22", studentId: "42288209", studentName: "Olexen Mariana Cinthia", level: "1ro Preparatorio", sede: "Leandro N. Alem", status: "A" },
    { id: "att-4", date: "2026-06-22", studentId: "43831994", studentName: "Carolina Belén Rominski", level: "2do Preparatorio", sede: "Leandro N. Alem", status: "P" },
    { id: "att-5", date: "2026-06-22", studentId: "53090248", studentName: "Wach Candela Jazmín", level: "2do Preparatorio", sede: "Leandro N. Alem", status: "J" }
];

export const SEDES = ["Leandro N. Alem", "Cerro Azul", "Itacaruaré", "San Javier"];
export const NIVELES = ["1ro Preparatorio", "2do Preparatorio", "3er Preparatorio", "1ro Elemental", "2do Elemental", "3er Elemental", "Profesorado / Superior"];
export const METODOS_PAGO = ["Efectivo", "Mercado Pago", "Transferencia", "Canje", "BECA"];
export const PERIODOS = ["Matrícula", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre", "Examen"];
