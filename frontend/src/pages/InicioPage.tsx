import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { desempenoApi } from "../api/desempeno";
import { documentosApi } from "../api/documentos";
import { reportesApi, type FilaRanking } from "../api/reportes";
import { ETIQUETA_ROL } from "../auth/tipos";
import { useAuth } from "../auth/useAuth";
import { InsigniaGravedad } from "../desempeno/Insignias";
import {
  ETIQUETA_TIPO_INCIDENTE,
  formatearFechaHora,
  formatearPuntaje,
  type PaginaIncidentes,
  type ProveedorAtencion,
} from "../desempeno/tipos";
import "../documentos/documentos.css";
import { ETIQUETA_ESTADO_DOC, SIMBOLO_ESTADO_DOC, type EstadoDocumento, type ResumenDocumentos } from "../documentos/tipos";
import { InsigniaRiesgo } from "../proveedores/Insignias";
import { ETIQUETA_NIVEL_RIESGO, ETIQUETA_TIPO, SIMBOLO_RIESGO, type NivelRiesgo } from "../proveedores/tipos";
import "./dashboard.css";

const PERMISOS = {
  administrador: "Gestionas usuarios y roles, creas y editas proveedores, tarifas y documentos, registras evaluaciones y consultas reportes y riesgo.",
  evaluador: "Registras evaluaciones, incidentes, incumplimientos y observaciones, gestionas el seguimiento y consultas proveedores y riesgo.",
  consultor: "Tienes acceso de solo lectura: proveedores, Dashboard, comparador, reportes y riesgo.",
} as const;

const NIVELES: NivelRiesgo[] = ["alto", "medio", "bajo", "sin_datos"];
const ESTADOS_DOC: EstadoDocumento[] = ["vencido", "por_vencer", "vigente"];
const CLAVE_RESUMEN: Record<EstadoDocumento, keyof ResumenDocumentos> = {
  vigente: "vigentes",
  por_vencer: "por_vencer",
  vencido: "vencidos",
};

// El semaforo solo vive dentro de los graficos; siempre va acompanado de texto y simbolo
const COLOR_RIESGO: Record<NivelRiesgo, string> = {
  alto: "#d64545",
  medio: "#f2a900",
  bajo: "#2e9e5b",
  sin_datos: "#9aa5b1",
};
const COLOR_DOC: Record<EstadoDocumento, string> = {
  vencido: "#d64545",
  por_vencer: "#f2a900",
  vigente: "#0b2545",
};

const ESCALA_MAXIMA = 5; // las evaluaciones van de 1 a 5
const RADIO_DONA = 15.9155; // circunferencia = 100, asi cada segmento mide su porcentaje

// Cada bloque se carga por separado: si uno falla, los demas se siguen viendo
interface Bloque<T> {
  datos: T | null;
  error: boolean;
}

function bloque<T>(resultado: PromiseSettledResult<T>): Bloque<T> {
  return resultado.status === "fulfilled" ? { datos: resultado.value, error: false } : { datos: null, error: true };
}

function contarPorNivel(filas: FilaRanking[]): Record<NivelRiesgo, number> {
  const conteo: Record<NivelRiesgo, number> = { alto: 0, medio: 0, bajo: 0, sin_datos: 0 };
  for (const fila of filas) conteo[fila.riesgo_nivel ?? "sin_datos"] += 1;
  return conteo;
}

const porcentaje = (parte: number, total: number) => (total > 0 ? (parte / total) * 100 : 0);

function ErrorBloque({ texto }: { texto: string }) {
  return (
    <p className="error" role="alert">
      {texto}
    </p>
  );
}

interface PropsKpi {
  etiqueta: string;
  ayuda: string;
  valor: number | null;
  alerta?: boolean;
  a: string;
  enlace: string;
}

function Kpi({ etiqueta, ayuda, valor, alerta, a, enlace }: PropsKpi) {
  return (
    <article className={`kpi${alerta && valor ? " alerta" : ""}`}>
      <span className="kpi-etiqueta" title={ayuda}>
        {etiqueta}
      </span>
      <span className="kpi-valor">{valor === null ? "–" : valor}</span>
      <Link className="kpi-pie" to={a}>
        {enlace} →
      </Link>
    </article>
  );
}

function Dona({ conteo, total }: { conteo: Record<NivelRiesgo, number>; total: number }) {
  let acumulado = 0;
  return (
    <svg className="dona" viewBox="0 0 42 42" role="img" aria-label={`${total} proveedores por nivel de riesgo`}>
      <circle className="dona-pista" cx="21" cy="21" r={RADIO_DONA} />
      {NIVELES.map((nivel) => {
        const parte = porcentaje(conteo[nivel], total);
        if (parte === 0) return null;
        const desfase = 25 - acumulado;
        acumulado += parte;
        return (
          <circle
            key={nivel}
            className="dona-segmento"
            cx="21"
            cy="21"
            r={RADIO_DONA}
            stroke={COLOR_RIESGO[nivel]}
            strokeDasharray={`${parte} ${100 - parte}`}
            strokeDashoffset={desfase}
          />
        );
      })}
      <text className="dona-total" x="21" y="22">
        {total}
      </text>
      <text className="dona-texto" x="21" y="26.5">
        proveedores
      </text>
    </svg>
  );
}

export function InicioPage() {
  const { usuario } = useAuth();
  const [ranking, setRanking] = useState<Bloque<FilaRanking[]>>({ datos: null, error: false });
  const [documentos, setDocumentos] = useState<Bloque<ResumenDocumentos>>({ datos: null, error: false });
  const [incidentes, setIncidentes] = useState<Bloque<PaginaIncidentes>>({ datos: null, error: false });
  const [atencion, setAtencion] = useState<Bloque<ProveedorAtencion[]>>({ datos: null, error: false });

  useEffect(() => {
    let vigente = true;
    Promise.allSettled([
      reportesApi.ranking({ orden: "calificacion" }),
      documentosApi.resumen(),
      desempenoApi.listarIncidentes({ resuelto: "false", pagina: 1, tamano: 5 }),
      desempenoApi.atencion(),
    ]).then(([r, d, i, a]) => {
      if (!vigente) return;
      setRanking(bloque(r));
      setDocumentos(bloque(d));
      setIncidentes(bloque(i));
      setAtencion(bloque(a));
    });
    return () => {
      vigente = false;
    };
  }, []);

  if (!usuario) return null;

  const conteo = ranking.datos ? contarPorNivel(ranking.datos) : null;
  const totalProveedores = ranking.datos ? ranking.datos.length : 0;
  const mejores = ranking.datos ? ranking.datos.filter((f) => f.calificacion !== null).slice(0, 5) : null;
  const totalDocumentos = documentos.datos
    ? documentos.datos.vencidos + documentos.datos.por_vencer + documentos.datos.vigentes
    : 0;

  return (
    <section className="dash">
      <header className="dash-cabecera">
        <h1>Hola, {usuario.nombre}</h1>
        <p>
          Entraste como <strong>{ETIQUETA_ROL[usuario.rol]}</strong>. {PERMISOS[usuario.rol]}
        </p>
      </header>

      <div className="dash-kpis">
        <Kpi
          etiqueta="Riesgo alto"
          ayuda="Proveedores activos con nivel de riesgo alto"
          valor={conteo ? conteo.alto : null}
          alerta
          a="/proveedores"
          enlace="Ver proveedores"
        />
        <Kpi
          etiqueta="Docs vencidos"
          ayuda="Documentos cuya fecha de vencimiento ya pasó"
          valor={documentos.datos ? documentos.datos.vencidos : null}
          alerta
          a="/documentos"
          enlace="Ver documentos"
        />
        <Kpi
          etiqueta="Incidentes abiertos"
          ayuda="Incidentes e incumplimientos sin resolver"
          valor={incidentes.datos ? incidentes.datos.total : null}
          a="/incidentes"
          enlace="Ver incidentes"
        />
        <Kpi
          etiqueta="Requieren atención"
          ayuda="Proveedores en seguimiento o con riesgo alto"
          valor={atencion.datos ? atencion.datos.length : null}
          alerta
          a="/incidentes"
          enlace="Ver seguimiento"
        />
      </div>

      <div className="dash-fila">
        <article className="dash-panel">
          <div className="dash-panel-cabecera">
            <h2>Riesgo por nivel</h2>
            <Link to="/proveedores">Proveedores</Link>
          </div>
          {ranking.error && <ErrorBloque texto="No se pudo cargar el riesgo de los proveedores." />}
          {conteo && (
            <div className="dona-cuerpo">
              <Dona conteo={conteo} total={totalProveedores} />
              <ul className="leyenda">
                {NIVELES.map((nivel) => (
                  <li key={nivel}>
                    <span className="leyenda-punto" style={{ background: COLOR_RIESGO[nivel] }} aria-hidden="true" />
                    <span className="leyenda-nombre">
                      <span aria-hidden="true">{SIMBOLO_RIESGO[nivel]} </span>
                      {ETIQUETA_NIVEL_RIESGO[nivel]}
                    </span>
                    <span className="leyenda-cifra">{conteo[nivel]}</span>
                    <span className="leyenda-porcentaje">{Math.round(porcentaje(conteo[nivel], totalProveedores))} %</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <span className="ayuda">No incluye proveedores inactivos.</span>
        </article>

        <article className="dash-panel">
          <div className="dash-panel-cabecera">
            <h2>Documentos por estado</h2>
            <Link to="/documentos">Documentos</Link>
          </div>
          {documentos.error && <ErrorBloque texto="No se pudo cargar el resumen de documentos." />}
          {documentos.datos && (
            <ul className="barras">
              {ESTADOS_DOC.map((estado) => {
                const cantidad = documentos.datos ? documentos.datos[CLAVE_RESUMEN[estado]] : 0;
                return (
                  <li key={estado}>
                    <div className="barra-cabecera">
                      <span className="barra-nombre">
                        <span aria-hidden="true">{SIMBOLO_ESTADO_DOC[estado]} </span>
                        {ETIQUETA_ESTADO_DOC[estado]}
                      </span>
                      <span className="barra-cifra">{cantidad}</span>
                    </div>
                    <div className="barra-pista">
                      <div
                        className="barra-relleno"
                        style={{ width: `${porcentaje(cantidad, totalDocumentos)}%`, background: COLOR_DOC[estado] }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </article>
      </div>

      <div className="dash-fila">
        <article className="dash-panel">
          <div className="dash-panel-cabecera">
            <h2>Mejor calificados</h2>
            <Link to="/reportes">Ranking completo</Link>
          </div>
          {ranking.error && <ErrorBloque texto="No se pudo cargar el ranking." />}
          {mejores !== null && mejores.length === 0 && <p className="dash-vacio">Todavía no hay proveedores evaluados.</p>}
          {mejores !== null && mejores.length > 0 && (
            <ul className="barras">
              {mejores.map((f, indice) => (
                <li key={f.id} className="ranking-fila">
                  <span className="ranking-puesto">{indice + 1}</span>
                  <div className="ranking-cuerpo">
                    <div className="ranking-cabecera">
                      <Link className="ranking-nombre" to={`/proveedores/${f.id}`}>
                        {f.nombre}
                      </Link>
                      <InsigniaRiesgo nivel={f.riesgo_nivel} puntaje={f.riesgo_puntaje} />
                    </div>
                    <div className="ranking-barra">
                      <div className="barra-pista">
                        <div
                          className="barra-relleno"
                          style={{
                            width: `${porcentaje(f.calificacion ?? 0, ESCALA_MAXIMA)}%`,
                            background: "var(--azul)",
                          }}
                        />
                      </div>
                      <span className="barra-cifra">{f.calificacion === null ? "–" : formatearPuntaje(f.calificacion)}</span>
                    </div>
                    <div className="barra-meta">
                      {ETIQUETA_TIPO[f.tipo]} · {f.ciudad}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="dash-panel">
          <div className="dash-panel-cabecera">
            <h2>Incidentes abiertos recientes</h2>
            <Link to="/incidentes">Ver todos</Link>
          </div>
          {incidentes.error && <ErrorBloque texto="No se pudieron cargar los incidentes." />}
          {incidentes.datos !== null && incidentes.datos.items.length === 0 && (
            <p className="dash-vacio">No hay incidentes abiertos.</p>
          )}
          {incidentes.datos !== null && incidentes.datos.items.length > 0 && (
            <ul className="incidentes">
              {incidentes.datos.items.map((i) => (
                <li key={i.id} className="incidente">
                  <div className="incidente-cabecera">
                    <Link className="incidente-proveedor" to={`/proveedores/${i.proveedor_id}`}>
                      {i.proveedor_nombre}
                    </Link>
                    <InsigniaGravedad gravedad={i.gravedad} />
                  </div>
                  <p className="incidente-texto" title={i.descripcion}>
                    {i.descripcion}
                  </p>
                  <span className="incidente-meta">
                    {ETIQUETA_TIPO_INCIDENTE[i.tipo]} · {formatearFechaHora(i.fecha)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </section>
  );
}
