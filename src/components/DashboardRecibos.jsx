// src/components/DashboardRecibos.jsx
import { useState, useEffect } from "react";
import { databaseService } from "../services/databaseService";

export default function DashboardRecibos() {
  const [recibos, setRecibos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // Iniciamos la escucha activa en tiempo real mediante el servicio
    const cancelarSuscripcion = databaseService.suscripcionRecibos((datosEnVivo) => {
      setRecibos(datosEnVivo);
      setCargando(false);
    });

    // Cleanup: Desvincular el WebSocket de Firebase al desmontar el componente
    return () => cancelarSuscripcion();
  }, []);

  if (cargando) return <p>Conectando con la base de datos en tiempo real...</p>;

  return (
    <main style={{ padding: "1.5rem", fontFamily: "sans-serif" }}>
      <header style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <img src="/logo.png" alt="Logo IDeAr" style={{ width: "80px", height: "auto" }} />
        <div>
          <h1 style={{ margin: 0 }}>Portal IDeAr - Panel de Facturación</h1>
          <p style={{ margin: 0, color: "#64748b" }}>Monitoreo de transacciones en tiempo real</p>
        </div>
      </header>

      <section style={{ marginTop: "2rem" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ backgroundColor: "#1e293b", color: "#f8fafc" }}>
              <th style={{ padding: "0.75rem", border: "1px solid #cbd5e1" }}>Comprobante</th>
              <th style={{ padding: "0.75rem", border: "1px solid #cbd5e1" }}>Fecha</th>
              <th style={{ padding: "0.75rem", border: "1px solid #cbd5e1" }}>Concepto</th>
              <th style={{ padding: "0.75rem", border: "1px solid #cbd5e1" }}>Importe</th>
            </tr>
          </thead>
          <tbody>
            {recibos.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ padding: "1rem", textAlign: "center", color: "#64748b" }}>
                  No se registran comprobantes emitidos.
                </td>
              </tr>
            ) : (
              recibos.map((recibo) => (
                <tr key={recibo.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "0.75rem" }}>{`${recibo.punto_venta}-${recibo.comprobante_nro}`}</td>
                  <td style={{ padding: "0.75rem" }}>{recibo.fecha_emision}</td>
                  <td style={{ padding: "0.75rem" }}>{recibo.mes_concepto} - {recibo.detalle}</td>
                  <td style={{ padding: "0.75rem", fontWeight: "bold", color: "#16a34a" }}>
                    ${recibo.importe.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
