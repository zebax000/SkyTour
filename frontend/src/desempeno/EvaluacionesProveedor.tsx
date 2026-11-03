import { useEffect, useState, type FormEvent } from "react";

import { desempenoApi } from "../api/desempeno";
import "../proveedores/formularios.css";
import "./desempeno.css";
import { Puntaje } from "./Puntaje";
import {
  CRITERIOS,
  formatearFechaHora,
  formatearPuntaje,
  type ClaveCriterio,
  type EvaluacionesDeProveedor,
} from "./tipos";

interface Props {
  proveedorId: number;
  puedeRegistrar: boolean;
}

type Valores = Record<ClaveCriterio, number>;

const VACIOS: Valores = { calidad: 0, puntualidad: 0, cumplimiento: 0, precio: 0 };

export function EvaluacionesProveedor({ proveedorId, puedeRegistrar }: Props) {
  const [datos, setDatos] = useState<EvaluacionesDeProveedor | null>(null);
  const [recarga, setRecarga] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [formAbierto, setFormAbierto] = useState(false);
  const [valores, setValores] = useState<Valores>(VACIOS);
  const [comentario, setComentario] = useState("");
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let vigente = true;
    desempenoApi
      .evaluaciones(proveedorId)
      .then((respuesta) => {
        if (vigente) setDatos(respuesta);
      })
      .catch((e) => {
        if (vigente) setError(e instanceof Error ? e.message : "No se pudieron cargar las evaluaciones.");
      });
    return () => {
      vigente = false;
    };
  }, [proveedorId, recarga]);

  function cerrarFormulario() {
    setFormAbierto(false);
    setValores(VACIOS);
    setComentario("");
    setErrorForm(null);
  }

  const completas = CRITERIOS.every((c) => valores[c.clave] > 0);
  const previo = completas ? CRITERIOS.reduce((suma, c) => suma + valores[c.clave], 0) / CRITERIOS.length : null;

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!completas) {
      setErrorForm("Elige una calificación de 1 a 5 en los cuatro criterios.");
      return;
    }
    setEnviando(true);
    setErrorForm(null);
    try {
      await desempenoApi.evaluar(proveedorId, {
        ...valores,
        comentario: comentario.trim() === "" ? null : comentario.trim(),
      });
      cerrarFormulario();
      setRecarga((r) => r + 1);
    } catch (e) {
      setErrorForm(e instanceof Error ? e.message : "No se pudo guardar la evaluación.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {datos && (
        <div className="resumen-calificacion">
          <div>
            <span className="etiqueta-resumen">Calificación promedio</span>
            <Puntaje valor={datos.promedio} />
          </div>
          <p className="ayuda">
            {datos.total === 0
              ? "Todavía no hay evaluaciones registradas."
              : `Calculada con ${datos.en_promedio} ${datos.en_promedio === 1 ? "evaluación" : "evaluaciones"} (las más recientes, hasta 5). Total registradas: ${datos.total}.`}
          </p>
        </div>
      )}

      {puedeRegistrar && !formAbierto && (
        <div className="barra-seccion">
          <button type="button" className="boton secundario pequeno" onClick={() => setFormAbierto(true)}>
            Nueva evaluación
          </button>
        </div>
      )}

      {puedeRegistrar && formAbierto && (
        <form className="grupo-servicio" onSubmit={guardar} noValidate>
          <p className="ayuda">Califica de 1 (muy deficiente) a 5 (excelente) cada criterio.</p>
          <div className="rejilla">
            {CRITERIOS.map((c) => (
              <fieldset key={c.clave} className="criterio">
                <legend>{c.etiqueta}</legend>
                <div className="escala">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <label key={n} className="opcion-escala">
                      <input
                        type="radio"
                        name={`criterio-${c.clave}`}
                        value={n}
                        checked={valores[c.clave] === n}
                        onChange={() => setValores({ ...valores, [c.clave]: n })}
                      />
                      <span>{n}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
          {previo !== null && <p className="previo">Promedio de esta evaluación: {formatearPuntaje(previo)} / 5</p>}
          <div className="campo-form" style={{ marginTop: 12 }}>
            <label htmlFor="eval-comentario">Comentario (opcional)</label>
            <textarea id="eval-comentario" value={comentario} onChange={(e) => setComentario(e.target.value)} />
          </div>
          {errorForm && (
            <p className="error" role="alert">
              {errorForm}
            </p>
          )}
          <div className="acciones-formulario">
            <button type="button" className="boton secundario pequeno" onClick={cerrarFormulario}>
              Cancelar
            </button>
            <button type="submit" className="boton primario pequeno" disabled={enviando}>
              {enviando ? "Guardando…" : "Guardar evaluación"}
            </button>
          </div>
        </form>
      )}

      {datos !== null && datos.items.length > 0 && (
        <div className="tabla-contenedor">
          <table className="tabla">
            <caption className="sr-only">Historial de evaluaciones</caption>
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Evaluador</th>
                <th scope="col">Calidad</th>
                <th scope="col">Puntualidad</th>
                <th scope="col">Cumplimiento</th>
                <th scope="col">Precio</th>
                <th scope="col">Promedio</th>
                <th scope="col">Comentario</th>
              </tr>
            </thead>
            <tbody>
              {datos.items.map((e) => (
                <tr key={e.id}>
                  <td>{formatearFechaHora(e.fecha)}</td>
                  <td>{e.evaluador_nombre}</td>
                  <td>{e.calidad}</td>
                  <td>{e.puntualidad}</td>
                  <td>{e.cumplimiento}</td>
                  <td>{e.precio}</td>
                  <td>
                    <Puntaje valor={e.promedio} pequeno />
                  </td>
                  <td className="celda-texto">{e.comentario ?? <span className="sin-dato">Sin comentario</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
