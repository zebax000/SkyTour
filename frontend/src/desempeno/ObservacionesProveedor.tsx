import { useEffect, useState, type FormEvent } from "react";

import { desempenoApi } from "../api/desempeno";
import "../proveedores/formularios.css";
import "./desempeno.css";
import { formatearFechaHora, type Observacion } from "./tipos";

interface Props {
  proveedorId: number;
  puedeRegistrar: boolean;
}

export function ObservacionesProveedor({ proveedorId, puedeRegistrar }: Props) {
  const [notas, setNotas] = useState<Observacion[] | null>(null);
  const [recarga, setRecarga] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let vigente = true;
    desempenoApi
      .observaciones(proveedorId)
      .then((lista) => {
        if (vigente) setNotas(lista);
      })
      .catch((e) => {
        if (vigente) setError(e instanceof Error ? e.message : "No se pudo cargar la bitácora.");
      });
    return () => {
      vigente = false;
    };
  }, [proveedorId, recarga]);

  async function agregar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const limpio = texto.trim();
    if (!limpio) {
      setErrorForm("Escribe la observación.");
      return;
    }
    setEnviando(true);
    setErrorForm(null);
    try {
      await desempenoApi.agregarObservacion(proveedorId, limpio);
      setTexto("");
      setRecarga((r) => r + 1);
    } catch (e) {
      setErrorForm(e instanceof Error ? e.message : "No se pudo guardar la observación.");
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

      {puedeRegistrar && (
        <form onSubmit={agregar} noValidate>
          <div className="campo-form">
            <label htmlFor="obs-texto">Nueva observación</label>
            <textarea
              id="obs-texto"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              aria-invalid={errorForm ? true : undefined}
            />
          </div>
          {errorForm && (
            <p className="error" role="alert">
              {errorForm}
            </p>
          )}
          <div className="acciones-formulario">
            <span className="ayuda">Las observaciones quedan en la bitácora y no se editan.</span>
            <button type="submit" className="boton primario pequeno" disabled={enviando}>
              {enviando ? "Guardando…" : "Agregar"}
            </button>
          </div>
        </form>
      )}

      {notas === null && !error && <p className="ayuda">Cargando bitácora…</p>}

      {notas !== null && notas.length === 0 && <p className="ayuda">Todavía no hay observaciones sobre este proveedor.</p>}

      {notas !== null && notas.length > 0 && (
        <ul className="bitacora">
          {notas.map((n) => (
            <li key={n.id}>
              <p>{n.texto}</p>
              <span className="meta-nota">
                {n.autor_nombre} · {formatearFechaHora(n.fecha)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
