import { useEffect, useState, type FormEvent } from "react";

import { desempenoApi } from "../api/desempeno";
import { textoONulo } from "../proveedores/formulario";
import "../proveedores/formularios.css";
import "./desempeno.css";
import { InsigniaEstadoIncidente, InsigniaGravedad, InsigniaTipoIncidente } from "./Insignias";
import {
  ETIQUETA_GRAVEDAD,
  ETIQUETA_TIPO_INCIDENTE,
  GRAVEDADES,
  TIPOS_INCIDENTE,
  formatearFechaHora,
  type Gravedad,
  type Incidente,
  type TipoIncidente,
} from "./tipos";

interface Props {
  proveedorId: number;
  puedeRegistrar: boolean;
}

export function IncidentesProveedor({ proveedorId, puedeRegistrar }: Props) {
  const [incidentes, setIncidentes] = useState<Incidente[] | null>(null);
  const [recarga, setRecarga] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [formAbierto, setFormAbierto] = useState(false);
  const [tipo, setTipo] = useState<TipoIncidente>("incidente");
  const [gravedad, setGravedad] = useState<Gravedad>("media");
  const [descripcion, setDescripcion] = useState("");
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const [resolviendo, setResolviendo] = useState<number | null>(null);
  const [comentarioCierre, setComentarioCierre] = useState("");
  const [cerrando, setCerrando] = useState(false);

  useEffect(() => {
    let vigente = true;
    desempenoApi
      .incidentes(proveedorId)
      .then((lista) => {
        if (vigente) setIncidentes(lista);
      })
      .catch((e) => {
        if (vigente) setError(e instanceof Error ? e.message : "No se pudieron cargar los incidentes.");
      });
    return () => {
      vigente = false;
    };
  }, [proveedorId, recarga]);

  function cerrarFormulario() {
    setFormAbierto(false);
    setTipo("incidente");
    setGravedad("media");
    setDescripcion("");
    setErrorForm(null);
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const limpia = descripcion.trim();
    if (!limpia) {
      setErrorForm("Describe lo que ocurrió.");
      return;
    }
    setEnviando(true);
    setErrorForm(null);
    try {
      await desempenoApi.registrarIncidente(proveedorId, { tipo, gravedad, descripcion: limpia });
      cerrarFormulario();
      setRecarga((r) => r + 1);
    } catch (e) {
      setErrorForm(e instanceof Error ? e.message : "No se pudo registrar.");
    } finally {
      setEnviando(false);
    }
  }

  async function resolver(incidente: Incidente) {
    setCerrando(true);
    setError(null);
    try {
      await desempenoApi.resolverIncidente(incidente.id, textoONulo(comentarioCierre));
      setResolviendo(null);
      setComentarioCierre("");
      setRecarga((r) => r + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo resolver el incidente.");
    } finally {
      setCerrando(false);
    }
  }

  return (
    <div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {puedeRegistrar && !formAbierto && (
        <div className="barra-seccion">
          <button type="button" className="boton secundario pequeno" onClick={() => setFormAbierto(true)}>
            Registrar incidente
          </button>
        </div>
      )}

      {puedeRegistrar && formAbierto && (
        <form className="grupo-servicio" onSubmit={guardar} noValidate>
          <div className="rejilla">
            <div className="campo-form">
              <label htmlFor="inc-tipo">Tipo</label>
              <select id="inc-tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoIncidente)}>
                {TIPOS_INCIDENTE.map((t) => (
                  <option key={t} value={t}>
                    {ETIQUETA_TIPO_INCIDENTE[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="campo-form">
              <label htmlFor="inc-gravedad">Gravedad</label>
              <select id="inc-gravedad" value={gravedad} onChange={(e) => setGravedad(e.target.value as Gravedad)}>
                {GRAVEDADES.map((g) => (
                  <option key={g} value={g}>
                    {ETIQUETA_GRAVEDAD[g]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="campo-form" style={{ marginTop: 12 }}>
            <label htmlFor="inc-descripcion">Descripción</label>
            <textarea
              id="inc-descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              aria-invalid={errorForm ? true : undefined}
            />
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
              {enviando ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      )}

      {incidentes === null && !error && <p className="ayuda">Cargando incidentes…</p>}

      {incidentes !== null && incidentes.length === 0 && (
        <p className="ayuda">Este proveedor no tiene incidentes ni incumplimientos registrados.</p>
      )}

      {incidentes !== null && incidentes.length > 0 && (
        <div className="tabla-contenedor">
          <table className="tabla">
            <caption className="sr-only">Incidentes e incumplimientos del proveedor</caption>
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Tipo</th>
                <th scope="col">Gravedad</th>
                <th scope="col">Descripción</th>
                <th scope="col">Estado</th>
                {puedeRegistrar && <th scope="col">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {incidentes.map((i) => (
                <tr key={i.id}>
                  <td>
                    {formatearFechaHora(i.fecha)}
                    <span className="detalle-cierre">Por {i.registrado_por_nombre}</span>
                  </td>
                  <td>
                    <InsigniaTipoIncidente tipo={i.tipo} />
                  </td>
                  <td>
                    <InsigniaGravedad gravedad={i.gravedad} />
                  </td>
                  <td className="celda-texto">{i.descripcion}</td>
                  <td>
                    <InsigniaEstadoIncidente resuelto={i.resuelto} />
                    {i.resuelto && i.fecha_cierre && (
                      <span className="detalle-cierre">
                        {formatearFechaHora(i.fecha_cierre)}
                        {i.comentario_cierre ? ` · ${i.comentario_cierre}` : ""}
                      </span>
                    )}
                  </td>
                  {puedeRegistrar && (
                    <td>
                      {i.resuelto ? null : resolviendo === i.id ? (
                        <div className="form-cierre">
                          <label htmlFor={`cierre-${i.id}`} className="sr-only">
                            Comentario de cierre (opcional)
                          </label>
                          <textarea
                            id={`cierre-${i.id}`}
                            placeholder="Comentario de cierre (opcional)"
                            value={comentarioCierre}
                            onChange={(e) => setComentarioCierre(e.target.value)}
                          />
                          <div className="acciones-fila">
                            <button
                              type="button"
                              className="boton secundario pequeno"
                              onClick={() => setResolviendo(null)}
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              className="boton primario pequeno"
                              disabled={cerrando}
                              onClick={() => resolver(i)}
                            >
                              {cerrando ? "Guardando…" : "Confirmar"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="boton secundario pequeno"
                          onClick={() => {
                            setResolviendo(i.id);
                            setComentarioCierre("");
                          }}
                        >
                          Resolver
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
