import type { DatosGenerales, ErroresDatos } from "./formulario";
import { ETIQUETA_TIPO, TIPOS } from "./tipos";

interface Props {
  datos: DatosGenerales;
  errores: ErroresDatos;
  alCambiar: (campo: keyof DatosGenerales, valor: string) => void;
}

export function DatosGeneralesCampos({ datos, errores, alCambiar }: Props) {
  function texto(
    campo: Exclude<keyof DatosGenerales, "tipo">,
    etiqueta: string,
    opciones: { type?: string; requerido?: boolean } = {},
  ) {
    const error = errores[campo];
    return (
      <div className="campo-form">
        <label htmlFor={`dato-${campo}`}>
          {etiqueta}
          {opciones.requerido && <span aria-hidden="true"> *</span>}
        </label>
        <input
          id={`dato-${campo}`}
          type={opciones.type ?? "text"}
          value={datos[campo]}
          onChange={(e) => alCambiar(campo, e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `error-${campo}` : undefined}
        />
        {error && (
          <p className="error-campo" id={`error-${campo}`}>
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rejilla">
      {texto("nombre", "Nombre del proveedor", { requerido: true })}
      {texto("nit", "NIT", { requerido: true })}

      <div className="campo-form">
        <label htmlFor="dato-tipo">
          Tipo de proveedor<span aria-hidden="true"> *</span>
        </label>
        <select
          id="dato-tipo"
          value={datos.tipo}
          onChange={(e) => alCambiar("tipo", e.target.value)}
          aria-invalid={errores.tipo ? true : undefined}
          aria-describedby={errores.tipo ? "error-tipo" : undefined}
        >
          <option value="">Elige un tipo</option>
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {ETIQUETA_TIPO[t]}
            </option>
          ))}
        </select>
        {errores.tipo && (
          <p className="error-campo" id="error-tipo">
            {errores.tipo}
          </p>
        )}
      </div>

      {texto("ciudad", "Ciudad", { requerido: true })}
      {texto("contacto_nombre", "Persona de contacto")}
      {texto("contacto_correo", "Correo de contacto", { type: "email" })}
      {texto("contacto_telefono", "Teléfono de contacto", { type: "tel" })}
    </div>
  );
}
