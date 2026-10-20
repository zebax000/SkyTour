import { ETIQUETA_ESTADO_DOC, SIMBOLO_ESTADO_DOC, type EstadoDocumento } from "./tipos";
import "./documentos.css";

export function InsigniaDocumento({ estado }: { estado: EstadoDocumento }) {
  return (
    <span className={`insignia doc-${estado}`}>
      <span aria-hidden="true">{SIMBOLO_ESTADO_DOC[estado]} </span>
      {ETIQUETA_ESTADO_DOC[estado]}
    </span>
  );
}
