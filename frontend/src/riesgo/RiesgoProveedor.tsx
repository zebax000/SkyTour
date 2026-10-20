import { useEffect, useState } from "react";

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
  modelo_no_disponible: "El modelo no está disponible para esta cuenta (error 404). Define otro en GEMINI_MODEL.",
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
  const [ocupado, setOcupado] = useState<"recalcular" | "explicar" | null>(null);

  useEffect(() => {
    let vigente = true;
    setResultado(null);
    setExplicacion(null);
    setError(null);
    riesgoApi
      .consultar(proveedorId)
      .then((r) => {
        if (vigente) setResultado(r);
      })
      .catch((e) => {
        if (vigente) setError(mensajeDe(e, "No se pudo cargar el riesgo."));
      });
    return () => {
      vigente = false;
    };
  }, [proveedorId]);

  async function recalcular() {
    setOcupado("recalcular");
    setError(null);
    try {
      setResultado(await riesgoApi.recalcular(proveedorId));
      setExplicacion(null);
    } catch (e) {
      setError(mensajeDe(e, "No se pudo recalcular el riesgo."));
    } finally {
      setOcupado(null);
    }
  }

  async function explicar() {
    setOcupado("explicar");
    setError(null);
    try {
      const { resumen, acciones, origen, modelo, motivo, aviso, ...calculo } = await riesgoApi.explicar(proveedorId);
      setResultado(calculo);
      setExplicacion({ resumen, acciones, origen, modelo, motivo, aviso });
    } catch (e) {
      setError(mensajeDe(e, "No se pudo generar la explicación."));
    } finally {
      setOcupado(null);
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
          <button type="button" className="boton pequeno" disabled={ocupado !== null} onClick={explicar}>
            {ocupado === "explicar" ? "Generando…" : "Generar explicación"}
          </button>
        </div>
      )}

      {explicacion && (
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
            </p>
          )}
        </div>
      )}
    </div>
  );
}
