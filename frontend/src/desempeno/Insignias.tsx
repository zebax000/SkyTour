import {
  ETIQUETA_GRAVEDAD,
  ETIQUETA_TIPO_INCIDENTE,
  SIMBOLO_GRAVEDAD,
  type Gravedad,
  type TipoIncidente,
} from "./tipos";
import "./desempeno.css";

export function InsigniaGravedad({ gravedad }: { gravedad: Gravedad }) {
  return (
    <span className={`insignia grav-${gravedad}`}>
      <span aria-hidden="true">{SIMBOLO_GRAVEDAD[gravedad]} </span>
      {ETIQUETA_GRAVEDAD[gravedad]}
    </span>
  );
}

export function InsigniaTipoIncidente({ tipo }: { tipo: TipoIncidente }) {
  return <span className="insignia tipo-inc">{ETIQUETA_TIPO_INCIDENTE[tipo]}</span>;
}

export function InsigniaEstadoIncidente({ resuelto }: { resuelto: boolean }) {
  return resuelto ? (
    <span className="insignia inc-resuelto">
      <span aria-hidden="true">✓ </span>Resuelto
    </span>
  ) : (
    <span className="insignia inc-abierto">
      <span aria-hidden="true">● </span>Abierto
    </span>
  );
}
