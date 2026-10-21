import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { desempenoApi } from "../api/desempeno";
import { documentosApi } from "../api/documentos";
import { reportesApi, type FilaRanking } from "../api/reportes";
import { ETIQUETA_ROL } from "../auth/tipos";
import { useAuth } from "../auth/useAuth";
import { InsigniaGravedad, InsigniaTipoIncidente } from "../desempeno/Insignias";
import {
  formatearFechaHora,
  formatearPuntaje,
  type IncidenteConProveedor,
  type ProveedorAtencion,
} from "../desempeno/tipos";
import "../documentos/documentos.css";
import { ETIQUETA_ESTADO_DOC, SIMBOLO_ESTADO_DOC, type EstadoDocumento, type ResumenDocumentos } from "../documentos/tipos";
import { InsigniaRiesgo } from "../proveedores/Insignias";
import { ETIQUETA_NIVEL_RIESGO, ETIQUETA_TIPO, SIMBOLO_RIESGO, type NivelRiesgo } from "../proveedores/tipos";

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

// Cada bloque se carga por separado: si uno falla, los demás se siguen viendo
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

function ErrorBloque({ texto }: { texto: string }) {
  return (
    <p className="error" role="alert">
      {texto}
    </p>
  );
}

export function InicioPage() {
  const { usuario } = useAuth();
  const [ranking, setRanking] = useState<Bloque<FilaRanking[]>>({ datos: null, error: false });
  const [documentos, setDocumentos] = useState<Bloque<ResumenDocumentos>>({ datos: null, error: false });
  const [incidentes, setIncidentes] = useState<Bloque<IncidenteConProveedor[]>>({ datos: null, error: false });
  const [atencion, setAtencion] = useState<Bloque<ProveedorAtencion[]>>({ datos: null, error: false });

  useEffect(() => {
    let vigente = true;
    Promise.allSettled([
      reportesApi.ranking({ orden: "calificacion" }),
      documentosApi.resumen(),
      desempenoApi.listarIncidentes({ resuelto: "false", pagina: 1, tamano: 5 }).then((pagina) => pagina.items),
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
  const mejores = ranking.datos ? ranking.datos.filter((f) => f.calificacion !== null).slice(0, 5) : null;

  return (
    <section>
      <h1>Hola, {usuario.nombre}</h1>
      <p>
        Entraste como <strong>{ETIQUETA_ROL[usuario.rol]}</strong>. {PERMISOS[usuario.rol]}
      </p>

      <h2>Proveedores por nivel de riesgo</h2>
      {ranking.error ? (
        <ErrorBloque texto="No se pudo cargar el riesgo de los proveedores." />
      ) : (
        <div className="tarjetas-resumen">
          {NIVELES.map((nivel) => (
            <div key={nivel} className="tarjeta-resumen">
              <span className="cifra">{conteo ? conteo[nivel] : "–"}</span>
              <span>
                <span aria-hidden="true">{SIMBOLO_RIESGO[nivel]} </span>
                {ETIQUETA_NIVEL_RIESGO[nivel]}
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="ayuda">
        No cuenta los proveedores inactivos. <Link to="/proveedores">Ver proveedores</Link>
        {atencion.datos && (
          <>
            {" · "}
            <Link to="/incidentes">
              {atencion.datos.length === 1
                ? "1 proveedor requiere atención"
                : `${atencion.datos.length} proveedores requieren atención`}
            </Link>
          </>
        )}
      </p>

      <h2>Documentos por vencer</h2>
      {documentos.error ? (
        <ErrorBloque texto="No se pudo cargar el resumen de documentos." />
      ) : (
        <div className="tarjetas-resumen">
          {ESTADOS_DOC.map((estado) => (
            <div key={estado} className="tarjeta-resumen">
              <span className="cifra">{documentos.datos ? documentos.datos[CLAVE_RESUMEN[estado]] : "–"}</span>
              <span>
                <span aria-hidden="true">{SIMBOLO_ESTADO_DOC[estado]} </span>
                {ETIQUETA_ESTADO_DOC[estado]}
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="ayuda">
        <Link to="/documentos">Ver documentos y vigencias</Link>
      </p>

      <h2>Incidentes abiertos recientes</h2>
      {incidentes.error && <ErrorBloque texto="No se pudieron cargar los incidentes." />}
      {incidentes.datos !== null && incidentes.datos.length === 0 && <p className="vacio">No hay incidentes abiertos.</p>}
      {incidentes.datos !== null && incidentes.datos.length > 0 && (
        <div className="tabla-contenedor">
          <table className="tabla">
            <caption className="sr-only">Incidentes abiertos más recientes</caption>
            <thead>
              <tr>
                <th scope="col">Proveedor</th>
                <th scope="col">Fecha</th>
                <th scope="col">Tipo</th>
                <th scope="col">Gravedad</th>
                <th scope="col">Descripción</th>
              </tr>
            </thead>
            <tbody>
              {incidentes.datos.map((i) => (
                <tr key={i.id}>
                  <td>
                    <Link to={`/proveedores/${i.proveedor_id}`}>{i.proveedor_nombre}</Link>
                  </td>
                  <td>{formatearFechaHora(i.fecha)}</td>
                  <td>
                    <InsigniaTipoIncidente tipo={i.tipo} />
                  </td>
                  <td>
                    <InsigniaGravedad gravedad={i.gravedad} />
                  </td>
                  <td className="celda-texto">{i.descripcion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="ayuda">
        <Link to="/incidentes">Ver todos los incidentes</Link>
      </p>

      <h2>Los 5 mejor calificados</h2>
      {ranking.error && <ErrorBloque texto="No se pudo cargar el ranking." />}
      {mejores !== null && mejores.length === 0 && <p className="vacio">Todavía no hay proveedores evaluados.</p>}
      {mejores !== null && mejores.length > 0 && (
        <div className="tabla-contenedor">
          <table className="tabla">
            <caption className="sr-only">Los cinco proveedores mejor calificados</caption>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Proveedor</th>
                <th scope="col">Tipo</th>
                <th scope="col">Ciudad</th>
                <th scope="col">Calificación</th>
                <th scope="col">Riesgo</th>
              </tr>
            </thead>
            <tbody>
              {mejores.map((f) => (
                <tr key={f.id}>
                  <td>{f.posicion}</td>
                  <td>
                    <Link to={`/proveedores/${f.id}`}>{f.nombre}</Link>
                  </td>
                  <td>{ETIQUETA_TIPO[f.tipo]}</td>
                  <td>{f.ciudad}</td>
                  <td>{f.calificacion === null ? "–" : formatearPuntaje(f.calificacion)}</td>
                  <td>
                    <InsigniaRiesgo nivel={f.riesgo_nivel} puntaje={f.riesgo_puntaje} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="ayuda">
        <Link to="/reportes">Ver el ranking completo</Link>
      </p>
    </section>
  );
}
