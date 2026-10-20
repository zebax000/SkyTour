import {
  ETIQUETA_ESTADO,
  ETIQUETA_VIGENCIA,
  type EstadoProveedor,
  type EstadoVigencia,
} from "./tipos";

export function InsigniaEstado({ estado }: { estado: EstadoProveedor }) {
  return <span className={`insignia estado-${estado}`}>{ETIQUETA_ESTADO[estado]}</span>;
}

export function InsigniaVigencia({ estado }: { estado: EstadoVigencia }) {
  return <span className={`insignia vigencia-${estado}`}>{ETIQUETA_VIGENCIA[estado]}</span>;
}
