// src/services/databaseService.js
import { rtdb } from "../config/firebase";
import { ref, set, push, onValue, off } from "firebase/database";

export const databaseService = {
  // Guardar un nuevo alumno generando un ID automático único
  crearAlumno: (alumnoData) => {
    const alumnosRef = ref(rtdb, "alumnos");
    const nuevoAlumnoRef = push(alumnosRef);
    return set(nuevoAlumnoRef, alumnoData)
      .then(() => nuevoAlumnoRef.key); // Retorna el UUID generado
  },

  // Registrar un pago / recibo vinculado a un alumno
  registrarRecibo: (reciboData) => {
    const recibosRef = ref(rtdb, "recibos");
    const nuevoReciboRef = push(recibosRef);
    return set(nuevoReciboRef, reciboData);
  },

  // Escuchar cambios en los recibos en tiempo real (Suscripción Activa)
  suscripcionRecibos: (callback) => {
    const recibosRef = ref(rtdb, "recibos");
    onValue(recibosRef, (snapshot) => {
      const data = snapshot.val() || {};
      // Convertimos el objeto de Firebase a Array listo para mapear en HTML
      const listaFormateada = Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      }));
      callback(listaFormateada);
    });

    // Retornamos la función de limpieza para remover el listener
    return () => off(recibosRef);
  }
};
