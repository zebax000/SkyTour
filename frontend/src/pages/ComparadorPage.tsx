import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { desempenoApi } from "../api/desempeno";
import { documentosApi } from "../api/documentos";
import { proveedoresApi } from "../api/proveedores";
import { reportesApi, type FilaRanking } from "../api/reportes";
import {
  CRITERIOS,
  formatearPuntaje,
  type ClaveCriterio,
  type EvaluacionesDeProveedor,
} from "../desempeno/tipos";
import { ETIQUETA_ESTADO_DOC, SIMBOLO_ESTADO_DOC, type Documento, type EstadoDocumento } from "../documentos/tipos";
import { InsigniaEstado, InsigniaRiesgo } from "../proveedores/Insignias";
import {
  ETIQUETA_TIPO,
  formatearValor,
  type EstadoProveedor,
  type NivelRiesgo,
  type ProveedorDetalle,
} from "../proveedores/tipos";
import "./dashboard.css";
import "./comparador.css";

const MINIMO = 2;
const MAXIMO = 4;
const ESCALA_MAXIMA = 5; // las evaluaciones van de 1 a 5
const ESTADOS_DOC: EstadoDocumento[] = ["vigente", "por_vencer", "vencido"];

// Datos que se piden aparte por cada proveedor elegido; si uno falla, el resto sigue visible
interface Extra {
  detalle: ProveedorDetalle | null;
  evaluaciones: EvaluacionesDeProveedor | null;
  documentos: Documento[] | null;
}

interface Columna {
  id: number;
  nombre: string;
  tipo: string | null;
  ciudad: string | null;
  estado: EstadoProveedor | null;
  cargando: boolean;
  enRanking: boolean;
  calificacion: number | null;
  totalEvaluaciones: number | null;
  riesgoNivel: NivelRiesgo | null;
  riesgoPuntaje: number | null;
  incidentes: number | null;
  criterios: Record<ClaveCriterio, number | null> | null;
  documentos: Record<EstadoDocumento, number> | null;
  detalle: ProveedorDetalle | null;
}

function leerIds(texto: string | null): number[] {
  if (!texto) return [];
  const ids: number[] = [];
  for (const parte of texto.split(",")) {
    const n = Number(parte);
    if (Number.isInteger(n) && n > 0 && !ids.includes(n)) ids.push(n);
  }
  return ids.slice(0, MAXIMO);
}

// Marca el mejor valor solo si hay al menos dos y no son todos iguales
function marcarMejores(valores: (number | null)[], mayorEsMejor: boolean): boolean[] {
  const presentes = valores.filter((v): v is number => v !== null);
  if (presentes.length < 2) return valores.map(() => false);
  const mejor = mayorEsMejor ? Math.max(...presentes) : Math.min(...presentes);
  const peor = mayorEsMejor ? Math.min(...presentes) : Math.max(...presentes);
  if (mejor === peor) return valores.map(() => false);
  return valores.map((v) => v === mejor);
}

function Barra({ valor, mejor, cifra = true }: { valor: number | null; mejor: boolean; cifra?: boolean }) {
  if (valor === null) return <span className="ayuda">Sin evaluar</span>;
  return (
    <div className="cmp-barra">
      <div className="barra-pista">
        <div
          className="barra-relleno"
          style={{ width: `${(valor / ESCALA_MAXIMA) * 100}%`, background: mejor ? "var(--azul)" : "#7b8da6" }}
        />
      </div>
      {cifra && <span className="barra-cifra">{formatearPuntaje(valor)}</span>}
    </div>
  );
}

interface PropsFila {
  etiqueta: string;
  columnas: Columna[];
  render: (columna: Columna, indice: number) => ReactNode;
}

function Fila({ etiqueta, columnas, render }: PropsFila) {
  return (
    <div className="cmp-fila">
      <span className="cmp-etiqueta">{etiqueta}</span>
      {columnas.map((columna, indice) => (
        <div key={columna.id} className="cmp-celda">
          {render(columna, indice)}
        </div>
      ))}
    </div>
  );
}

function Panel({ titulo, columnas, children }: { titulo: string; columnas: Columna[]; children: ReactNode }) {
  return (
    <article className="dash-panel">
      <div className="dash-panel-cabecera">
        <h2>{titulo}</h2>
      </div>
      <div>
        <div className="cmp-fila cmp-nombres">
          <span />
          {columnas.map((c) => (
            <strong key={c.id}>{c.nombre}</strong>
          ))}
        </div>
        {children}
      </div>
    </article>
  );
}

const cargandoODash = (c: Columna, valor: ReactNode) => (c.cargando ? <span className="ayuda">Cargando…</span> : valor);

export function ComparadorPage() {
  const [params, setParams] = useSearchParams();
  const textoIds = params.get("ids");
  const ids = useMemo(() => leerIds(textoIds), [textoIds]);

  const [opciones, setOpciones] = useState<FilaRanking[] | null>(null);
  const [errorOpciones, setErrorOpciones] = useState(false);
  const [extras, setExtras] = useState<Record<number, Extra>>({});
  const [elegido, setElegido] = useState("");
  const pedidos = useRef(new Set<number>());

  useEffect(() => {
    let vigente = true;
    reportesApi
      .ranking({ orden: "calificacion" })
      .then((filas) => {
        if (vigente) setOpciones(filas);
      })
      .catch(() => {
        if (vigente) setErrorOpciones(true);
      });
    return () => {
      vigente = false;
    };
  }, []);

  useEffect(() => {
    for (const id of ids) {
      if (pedidos.current.has(id)) continue;
      pedidos.current.add(id);
      Promise.allSettled([
        proveedoresApi.detalle(id),
        desempenoApi.evaluaciones(id),
        documentosApi.deProveedor(id),
      ]).then(([d, e, c]) => {
        setExtras((previo) => ({
          ...previo,
          [id]: {
            detalle: d.status === "fulfilled" ? d.value : null,
            evaluaciones: e.status === "fulfilled" ? e.value : null,
            documentos: c.status === "fulfilled" ? c.value : null,
          },
        }));
      });
    }
  }, [ids]);

  function cambiarIds(nuevos: number[]) {
    setParams(nuevos.length > 0 ? { ids: nuevos.join(",") } : {}, { replace: true });
  }

  function agregar() {
    const id = Number(elegido);
    if (!id || ids.includes(id) || ids.length >= MAXIMO) return;
    cambiarIds([...ids, id]);
    setElegido("");
  }

  const columnas: Columna[] = ids.map((id) => {
    const fila = opciones?.find((f) => f.id === id) ?? null;
    const extra = extras[id];
    const detalle = extra?.detalle ?? null;
    const evaluaciones = extra?.evaluaciones ?? null;
    const documentos = extra?.documentos ?? null;

    let criterios: Record<ClaveCriterio, number | null> | null = null;
    if (evaluaciones) {
      const usadas = evaluaciones.items.slice(0, evaluaciones.en_promedio);
      criterios = Object.fromEntries(
        CRITERIOS.map((c) => [c.clave, usadas.length > 0 ? usadas.reduce((suma, e) => suma + e[c.clave], 0) / usadas.length : null]),
      ) as Record<ClaveCriterio, number | null>;
    }

    let conteoDocumentos: Record<EstadoDocumento, number> | null = null;
    if (documentos) {
      conteoDocumentos = { vigente: 0, por_vencer: 0, vencido: 0 };
      for (const d of documentos) conteoDocumentos[d.estado] += 1;
    }

    const tipo = fila?.tipo ?? detalle?.tipo;
    return {
      id,
      nombre: fila?.nombre ?? detalle?.nombre ?? `Proveedor ${id}`,
      tipo: tipo ? ETIQUETA_TIPO[tipo] : null,
      ciudad: fila?.ciudad ?? detalle?.ciudad ?? null,
      estado: fila?.estado ?? detalle?.estado ?? null,
      cargando: extra === undefined,
      enRanking: fila !== null,
      calificacion: evaluaciones ? evaluaciones.promedio : (fila?.calificacion ?? null),
      totalEvaluaciones: evaluaciones ? evaluaciones.total : null,
      riesgoNivel: fila?.riesgo_nivel ?? null,
      riesgoPuntaje: fila?.riesgo_puntaje ?? null,
      incidentes: fila ? fila.incidentes_abiertos : null,
      criterios,
      documentos: conteoDocumentos,
      detalle,
    };
  });

  const disponibles = (opciones ?? []).filter((f) => !ids.includes(f.id));
  const lleno = ids.length >= MAXIMO;
  const listo = columnas.length >= MINIMO;
  const mejoresCalificacion = marcarMejores(columnas.map((c) => c.calificacion), true);
  const mejoresIncidentes = marcarMejores(columnas.map((c) => c.incidentes), false);

  return (
    <section className="cmp">
      <header className="cmp-cabecera">
        <h1>Comparador</h1>
        <p>Elige de 2 a 4 proveedores para verlos lado a lado.</p>
      </header>

      <article className="dash-panel">
        <div className="dash-panel-cabecera">
          <h2>Proveedores a comparar</h2>
          <span className="cmp-contador">
            {ids.length} de {MAXIMO}
          </span>
        </div>

        {columnas.length > 0 && (
          <ul className="cmp-chips">
            {columnas.map((c) => (
              <li key={c.id} className="cmp-chip">
                {c.nombre}
                <button type="button" aria-label={`Quitar ${c.nombre}`} onClick={() => cambiarIds(ids.filter((i) => i !== c.id))}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        {errorOpciones && (
          <p className="error" role="alert">
            No se pudo cargar la lista de proveedores.
          </p>
        )}

        <div className="cmp-agregar">
          <label className="campo">
            Agregar proveedor
            <select value={elegido} disabled={lleno || opciones === null} onChange={(e) => setElegido(e.target.value)}>
              <option value="">{lleno ? `Máximo ${MAXIMO} proveedores` : "Elige un proveedor"}</option>
              {disponibles.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nombre} · {ETIQUETA_TIPO[f.tipo]} · {f.ciudad}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="boton primario" disabled={!elegido || lleno} onClick={agregar}>
            Agregar
          </button>
          {ids.length > 0 && (
            <button type="button" className="boton secundario" onClick={() => cambiarIds([])}>
              Limpiar
            </button>
          )}
        </div>

        {!listo && <p className="ayuda">Elige al menos {MINIMO} proveedores para compararlos.</p>}
      </article>

      {listo && (
        <div className="cmp-desplazable">
          <div
            className="cmp-tabla"
            style={{ "--n": columnas.length, minWidth: 174 + columnas.length * 230 } as CSSProperties}
          >
            <article className="dash-panel">
              <div className="dash-panel-cabecera">
                <h2>Resumen</h2>
              </div>
              <div>
                <div className="cmp-fila cmp-nombres cmp-identidad">
                  <span />
                  {columnas.map((c) => (
                    <div key={c.id} className="cmp-ident">
                      <Link className="cmp-nombre" to={`/proveedores/${c.id}`}>
                        {c.nombre}
                      </Link>
                      <span className="barra-meta">{[c.tipo, c.ciudad].filter(Boolean).join(" · ")}</span>
                      {c.estado && <InsigniaEstado estado={c.estado} />}
                    </div>
                  ))}
                </div>

                <Fila
                  etiqueta="Calificación"
                  columnas={columnas}
                  render={(c, i) =>
                    c.calificacion === null ? (
                      cargandoODash(c, <span className="ayuda">Sin evaluar</span>)
                    ) : (
                      <>
                        <div className="cmp-valor">
                          {formatearPuntaje(c.calificacion)}
                          <small>/ {ESCALA_MAXIMA}</small>
                          {mejoresCalificacion[i] && (
                            <span className="cmp-mejor">
                              <span aria-hidden="true">★ </span>Mejor
                            </span>
                          )}
                        </div>
                        <Barra valor={c.calificacion} mejor={mejoresCalificacion[i]} cifra={false} />
                      </>
                    )
                  }
                />
                <Fila
                  etiqueta="Riesgo"
                  columnas={columnas}
                  render={(c) =>
                    opciones === null && !errorOpciones ? (
                      <span className="ayuda">Cargando…</span>
                    ) : c.enRanking ? (
                      <InsigniaRiesgo nivel={c.riesgoNivel} puntaje={c.riesgoPuntaje} />
                    ) : (
                      <span className="ayuda">–</span>
                    )
                  }
                />
                <Fila
                  etiqueta="Incidentes abiertos"
                  columnas={columnas}
                  render={(c, i) =>
                    c.incidentes === null ? (
                      <span className="ayuda">–</span>
                    ) : (
                      <div className="cmp-valor">
                        <span className={`cmp-numero${c.incidentes > 0 ? " alerta" : ""}`}>{c.incidentes}</span>
                        {mejoresIncidentes[i] && (
                          <span className="cmp-mejor">
                            <span aria-hidden="true">★ </span>Menos
                          </span>
                        )}
                      </div>
                    )
                  }
                />
                <Fila
                  etiqueta="Evaluaciones"
                  columnas={columnas}
                  render={(c) =>
                    c.totalEvaluaciones === null ? cargandoODash(c, <span className="ayuda">–</span>) : <span className="cmp-numero">{c.totalEvaluaciones}</span>
                  }
                />
              </div>
            </article>

            <Panel titulo="Criterios de evaluación" columnas={columnas}>
              {CRITERIOS.map((criterio) => {
                const valores = columnas.map((c) => (c.criterios ? c.criterios[criterio.clave] : null));
                const mejores = marcarMejores(valores, true);
                return (
                  <Fila
                    key={criterio.clave}
                    etiqueta={criterio.etiqueta}
                    columnas={columnas}
                    render={(c, i) =>
                      c.criterios ? <Barra valor={valores[i]} mejor={mejores[i]} /> : cargandoODash(c, <span className="ayuda">No disponible</span>)
                    }
                  />
                );
              })}
              <p className="ayuda">Promedio de las evaluaciones más recientes, sobre {ESCALA_MAXIMA}.</p>
            </Panel>

            <Panel titulo="Documentos" columnas={columnas}>
              {ESTADOS_DOC.map((estado) => (
                <Fila
                  key={estado}
                  etiqueta={`${SIMBOLO_ESTADO_DOC[estado]} ${ETIQUETA_ESTADO_DOC[estado]}`}
                  columnas={columnas}
                  render={(c) =>
                    c.documentos ? (
                      <span className={`cmp-numero${estado === "vencido" && c.documentos[estado] > 0 ? " alerta" : ""}`}>
                        {c.documentos[estado]}
                      </span>
                    ) : (
                      cargandoODash(c, <span className="ayuda">No disponible</span>)
                    )
                  }
                />
              ))}
            </Panel>

            <Panel titulo="Servicios y zonas" columnas={columnas}>
              <Fila
                etiqueta="Servicios"
                columnas={columnas}
                render={(c) => {
                  if (!c.detalle) return cargandoODash(c, <span className="ayuda">No disponible</span>);
                  if (c.detalle.servicios.length === 0) return <span className="ayuda">Sin servicios</span>;
                  return (
                    <ul className="cmp-lista">
                      {c.detalle.servicios.map((s) => {
                        const vigente = s.tarifas.find((t) => t.estado_vigencia === "vigente");
                        return (
                          <li key={s.id}>
                            <strong>{s.nombre}</strong>
                            <span>{vigente ? formatearValor(vigente.valor, vigente.moneda) : "Sin tarifa vigente"}</span>
                          </li>
                        );
                      })}
                    </ul>
                  );
                }}
              />
              <Fila
                etiqueta="Zonas"
                columnas={columnas}
                render={(c) => {
                  if (!c.detalle) return cargandoODash(c, <span className="ayuda">No disponible</span>);
                  if (c.detalle.zonas.length === 0) return <span className="ayuda">Sin zonas</span>;
                  return (
                    <ul className="zonas">
                      {c.detalle.zonas.map((z) => (
                        <li key={z.id}>{z.ciudad_o_region}</li>
                      ))}
                    </ul>
                  );
                }}
              />
            </Panel>
          </div>
        </div>
      )}
    </section>
  );
}
