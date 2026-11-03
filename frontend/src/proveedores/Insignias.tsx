import "../riesgo/riesgo.css";
import {
  ETIQUETA_ESTADO,
  ETIQUETA_NIVEL_RIESGO,
  ETIQUETA_VIGENCIA,
  SIMBOLO_RIESGO,
  type EstadoProveedor,
  type EstadoVigencia,
  type NivelRiesgo,
} from "./tipos";

export function InsigniaEstado({ estado }: { estado: EstadoProveedor }) {
  return <span className={`insignia estado-${estado}`}>{ETIQUETA_ESTADO[estado]}</span>;
}

export function InsigniaVigencia({ estado }: { estado: EstadoVigencia }) {
  return <span className={`insignia vigencia-${estado}`}>{ETIQUETA_VIGENCIA[estado]}</span>;
}

// Acepta un nivel ausente (backend sin riesgo) o desconocido: nunca debe romper la pantalla
export function InsigniaRiesgo({ nivel, puntaje }: { nivel?: NivelRiesgo | null; puntaje?: number | null }) {
  if (nivel === null || nivel === undefined || !(nivel in ETIQUETA_NIVEL_RIESGO)) {
    return <span className="insignia riesgo-sin_datos">Sin calcular</span>;
  }
  return (
    <span className={`insignia riesgo-${nivel}`}>
      <span aria-hidden="true">{SIMBOLO_RIESGO[nivel]}</span> {ETIQUETA_NIVEL_RIESGO[nivel]}
      {puntaje !== null && puntaje !== undefined ? ` · ${puntaje}` : ""}
    </span>
  );
}
