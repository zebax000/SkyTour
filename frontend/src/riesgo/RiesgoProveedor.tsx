import { useEffect, useState } from "react";
<<<<<<< HEAD

=======
>>>>>>> origin/main
import { riesgoApi, type Explicacion, type NivelRiesgo, type ResultadoRiesgo } from "../api/riesgo";
import "./riesgo.css";

const ETIQUETA_NIVEL: Record<NivelRiesgo, string> = {
  bajo: "Riesgo bajo",
  medio: "Riesgo medio",
  alto: "Riesgo alto",
  sin_datos: "Sin datos suficientes",
};

const ETIQUETA_FACTOR: Record<string, string> = {
  documentacion: "Documentación",
  calificacion: "Calificación",
  incidentes: "Incidentes",
  incumplimientos: "Incumplimientos",
  tarifas: "Tarifas",
};

const ETIQUETA_MOTIVO: Record<string, string> = {
  sin_clave: "No hay una clave de Gemini configurada en el servidor.",
  sin_datos: "No hay datos suficientes para consultar a Gemini.",
  limite_de_frecuencia: "Se alcanzó el límite de una solicitud cada 15 segundos. Espera un momento e inténtalo de nuevo.",
  clave_invalida_o_solicitud_rechazada: "Gemini rechazó la clave o la solicitud (error 400). Revisa que la clave sea válida.",
  clave_o_permiso_rechazado: "Gemini rechazó la clave o sus permisos (error 401 o 403).",
  modelo_no_disponible: "Gemini respondió 404: no encontró el modelo o la operación. El mensaje exacto de Google está en los registros del servidor.",
  cuota_agotada: "Se agotó la cuota de Gemini (error 429). Espera o revisa el plan de la cuenta.",
  servicio_saturado: "El servicio de Gemini falló o está saturado (error 5xx). Inténtalo más tarde.",
  tiempo_agotado: "Gemini tardó más de 10 segundos en responder.",
  sdk_no_instalado: "La librería de Gemini no está instalada en el servidor.",
  respuesta_invalida: "Gemini respondió con un formato que no se pudo validar.",
  error_desconocido: "Error desconocido. Revisa los registros del servidor.",
};

function mensajeDe(e: unknown, porDefecto: string): string {
  return e instanceof Error ? e.message : porDefecto;
}

export function RiesgoProveedor({ proveedorId, puedeRegistrar }: { proveedorId: number; puedeRegistrar: boolean }) {
  const [resultado, setResultado] = useState<ResultadoRiesgo | null>(null);
  const [explicacion, setExplicacion] = useState<Explicacion | null>(null);
  const [error, setError] = useState<string | null>(null);
<<<<<<< HEAD
  const [ocupado, setOcupado] = useState<"recalcular" | "explicar" | null>(null);
=======
  const [ocupado, setOcupado] = useState<"recalcular" | "regenerar" | null>(null);
  const [cargandoIA, setCargandoIA] = useState(false);
>>>>>>> origin/main

  useEffect(() => {
    let vigente = true;
    setResultado(null);
    setExplicacion(null);
    setError(null);
<<<<<<< HEAD
    riesgoApi
      .consultar(proveedorId)
      .then((r) => {
        if (vigente) setResultado(r);
      })
      .catch((e) => {
        if (vigente) setError(mensajeDe(e, "No se pudo cargar el riesgo."));
      });
=======
    setCargandoIA(true);

    const cargarRiesgoYExplicacion = async () => {
      try {
        // 1. Consultar el riesgo base
        const res = await riesgoApi.consultar(proveedorId);
        if (!vigente) return;
        setResultado(res);

        // 2. Pedir la explicación automáticamente
        pedirExplicacionConReintento(proveedorId, vigente);
      } catch (e) {
        if (vigente) {
          setError(mensajeDe(e, "No se pudo cargar el riesgo."));
          setCargandoIA(false);
        }
      }
    };

    cargarRiesgoYExplicacion();

>>>>>>> origin/main
    return () => {
      vigente = false;
    };
  }, [proveedorId]);

<<<<<<< HEAD
=======
  // Función recursiva para reintentar si Gemini alcanza el límite de llamadas
  const pedirExplicacionConReintento = async (id: number, vigente: boolean, esReintento = false) => {
    try {
      // Necesitarás añadir este método a riesgoApi en frontend/src/api/riesgo.ts
      const data = await riesgoApi.obtenerExplicacion(id);
      if (!vigente) return;

      if (data.origen === "reglas" && data.motivo === "limite_de_frecuencia" && !esReintento) {
        // Reintentar automáticamente una sola vez tras esperar 5 segundos
        setTimeout(() => {
          pedirExplicacionConReintento(id, vigente, true);
        }, 5000);
      } else {
        setExplicacion(data);
        setCargandoIA(false);
      }
    } catch (e) {
      if (vigente) {
        console.error("Error al cargar la explicación:", e);
        setCargandoIA(false);
      }
    }
  };

>>>>>>> origin/main
  async function recalcular() {
    setOcupado("recalcular");
    setError(null);
    try {
      setResultado(await riesgoApi.recalcular(proveedorId));
      setExplicacion(null);
<<<<<<< HEAD
    } catch (e) {
      setError(mensajeDe(e, "No se pudo recalcular el riesgo."));
    } finally {
=======
      // Al recalcular, volvemos a pedir la explicación automáticamente
      setCargandoIA(true);
      pedirExplicacionConReintento(proveedorId, true, false);
    } catch (e) {
      setError(mensajeDe(e, "No se pudo recalcular el riesgo."));
>>>>>>> origin/main
      setOcupado(null);
    }
  }

<<<<<<< HEAD
  async function explicar() {
    setOcupado("explicar");
    setError(null);
    try {
      const { resumen, acciones, origen, modelo, modelo_solicitado, motivo, aviso, ...calculo } =
        await riesgoApi.explicar(proveedorId);
      setResultado(calculo);
      setExplicacion({ resumen, acciones, origen, modelo, modelo_solicitado, motivo, aviso });
    } catch (e) {
      setError(mensajeDe(e, "No se pudo generar la explicación."));
    } finally {
      setOcupado(null);
=======
  // Ahora esta función se llama "regenerar" y usa la ruta POST existente
  async function regenerar() {
    setOcupado("regenerar");
    setError(null);
    setCargandoIA(true);
    try {
      const { resumen, acciones, origen, modelo, modelo_solicitado, motivo, aviso, ...calculo } =
        await riesgoApi.explicar(proveedorId); // Tu API que hace el POST
      setResultado(calculo);
      setExplicacion({ resumen, acciones, origen, modelo, modelo_solicitado, motivo, aviso });
    } catch (e) {
      setError(mensajeDe(e, "No se pudo regenerar la explicación."));
    } finally {
      setOcupado(null);
      setCargandoIA(false);
>>>>>>> origin/main
    }
  }

  if (error && !resultado) {
    return (
      <p className="error" role="alert">
        {error}
      </p>
    );
  }
  if (!resultado) return <p className="estado-carga">Calculando riesgo…</p>;

  return (
    <div>
      <div className="riesgo-resumen">
        <span className="riesgo-puntaje">{resultado.puntaje === null ? "—" : `${resultado.puntaje}/100`}</span>
        <span className={`insignia riesgo-${resultado.nivel}`}>{ETIQUETA_NIVEL[resultado.nivel]}</span>
        <span>Datos al {resultado.fecha_datos}</span>
      </div>

      {resultado.nivel === "sin_datos" ? (
        <p>Se necesita al menos una evaluación y un documento para calcular el riesgo.</p>
      ) : (
        <ul className="riesgo-factores">
          {Object.entries(resultado.factores).map(([factor, puntos]) => (
            <li key={factor}>
              <span>{ETIQUETA_FACTOR[factor] ?? factor}</span>
              <strong>{puntos} puntos</strong>
            </li>
          ))}
        </ul>
      )}

      <p className="meta">
        Evaluaciones usadas: {resultado.evaluaciones_usadas} · Documentos: {resultado.documentos_registrados} ·
        Servicios sin tarifa vigente: {resultado.servicios_sin_tarifa}
      </p>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {puedeRegistrar && (
        <div className="riesgo-acciones">
          <button type="button" className="boton secundario pequeno" disabled={ocupado !== null} onClick={recalcular}>
            {ocupado === "recalcular" ? "Recalculando…" : "Recalcular"}
          </button>
<<<<<<< HEAD
          <button type="button" className="boton pequeno" disabled={ocupado !== null} onClick={explicar}>
            {ocupado === "explicar" ? "Generando…" : "Generar explicación"}
=======
          <button type="button" className="boton pequeno" disabled={ocupado !== null} onClick={regenerar}>
            {ocupado === "regenerar" ? "Generando…" : "Regenerar"}
>>>>>>> origin/main
          </button>
        </div>
      )}

<<<<<<< HEAD
      {explicacion && (
=======
      {/* Aquí mostramos el estado de carga o la explicación final */}
      {cargandoIA ? (
        <div className="aviso-carga" style={{ marginTop: '1rem', fontStyle: 'italic', color: '#666' }}>
          Analizando con IA...
        </div>
      ) : explicacion ? (
>>>>>>> origin/main
        <div className="riesgo-explicacion">
          <p>{explicacion.resumen}</p>
          <ul>
            {explicacion.acciones.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          <p className="meta">
            {explicacion.origen === "gemini"
              ? `Generado con Gemini (${explicacion.modelo ?? "modelo no indicado"}).`
              : "Generado con reglas internas; Gemini no se usó."}{" "}
            {explicacion.aviso}
          </p>
          {explicacion.origen === "reglas" && explicacion.motivo && (
            <p className="meta">
              Motivo: {ETIQUETA_MOTIVO[explicacion.motivo] ?? explicacion.motivo}
              {explicacion.modelo_solicitado && ` Modelo solicitado por el servidor: ${explicacion.modelo_solicitado}.`}
            </p>
          )}
        </div>
<<<<<<< HEAD
      )}
    </div>
  );
}
=======
      ) : null}
    </div>
  );
}
>>>>>>> origin/main
