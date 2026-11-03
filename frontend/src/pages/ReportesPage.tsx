import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { proveedoresApi } from "../api/proveedores";
import { guardarRanking, reportesApi, type FilaRanking, type FormatoReporte, type OrdenRanking } from "../api/reportes";
import { formatearPuntaje } from "../desempeno/tipos";
import { InsigniaEstado, InsigniaRiesgo } from "../proveedores/Insignias";
import { ETIQUETA_TIPO, TIPOS } from "../proveedores/tipos";

function mensajeDe(e: unknown, porDefecto: string): string {
  return e instanceof Error ? e.message : porDefecto;
}

export function ReportesPage() {
  const [orden, setOrden] = useState<OrdenRanking>("calificacion");
  const [tipo, setTipo] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [ciudades, setCiudades] = useState<string[]>([]);
  const [filas, setFilas] = useState<FilaRanking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [descargando, setDescargando] = useState<FormatoReporte | null>(null);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);

  useEffect(() => {
    proveedoresApi
      .ciudades()
      .then(setCiudades)
      .catch(() => setCiudades([]));
  }, []);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError(null);
    reportesApi
      .ranking({ orden, tipo, ciudad })
      .then((respuesta) => {
        if (vigente) setFilas(respuesta);
      })
      .catch((e) => {
        if (vigente) setError(mensajeDe(e, "No se pudo cargar el ranking."));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [orden, tipo, ciudad]);

  async function descargar(formato: FormatoReporte) {
    setDescargando(formato);
    setErrorDescarga(null);
    try {
      await guardarRanking(formato, { orden, tipo, ciudad });
    } catch (e) {
      setErrorDescarga(mensajeDe(e, "No se pudo descargar el archivo."));
    } finally {
      setDescargando(null);
    }
  }

  const hayFiltros = tipo !== "" || ciudad !== "";

  return (
    <section>
      <div className="encabezado-pagina">
        <h1>Reportes</h1>
        <div className="acciones-encabezado">
          <button
            type="button"
            className="boton secundario pequeno"
            disabled={descargando !== null || cargando}
            onClick={() => descargar("csv")}
          >
            {descargando === "csv" ? "Generando…" : "Descargar CSV"}
          </button>
          <button
            type="button"
            className="boton secundario pequeno"
            disabled={descargando !== null || cargando}
            onClick={() => descargar("pdf")}
          >
            {descargando === "pdf" ? "Generando…" : "Descargar PDF"}
          </button>
        </div>
      </div>

      <p className="ayuda">
        Ranking de proveedores. No incluye los inactivos. El riesgo es el último calculado. Los archivos respetan el orden y
        los filtros que ves.
      </p>

      <div className="barra-filtros" role="search">
        <label className="campo">
          Ordenar por
          <select value={orden} onChange={(e) => setOrden(e.target.value as OrdenRanking)}>
            <option value="calificacion">Calificación (mejor primero)</option>
            <option value="riesgo">Riesgo (mayor riesgo primero)</option>
          </select>
        </label>
        <label className="campo">
          Tipo
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos</option>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {ETIQUETA_TIPO[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          Ciudad
          <select value={ciudad} onChange={(e) => setCiudad(e.target.value)}>
            <option value="">Todas</option>
            {ciudades.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        {hayFiltros && (
          <button
            type="button"
            className="boton secundario pequeno"
            onClick={() => {
              setTipo("");
              setCiudad("");
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {errorDescarga && (
        <p className="error" role="alert">
          {errorDescarga}
        </p>
      )}

      <div className="tabla-contenedor">
        <table className="tabla">
          <caption className="sr-only">
            {orden === "calificacion" ? "Ranking de proveedores por calificación" : "Ranking de proveedores por riesgo"}
          </caption>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Proveedor</th>
              <th scope="col">Tipo</th>
              <th scope="col">Ciudad</th>
              <th scope="col">Estado</th>
              <th scope="col">Calificación</th>
              <th scope="col">Riesgo</th>
              <th scope="col">Incidentes abiertos</th>
            </tr>
          </thead>
          <tbody>
            {filas?.map((f) => (
              <tr key={f.id}>
                <td>{f.posicion}</td>
                <td>
                  <Link to={`/proveedores/${f.id}`}>{f.nombre}</Link>
                </td>
                <td>{ETIQUETA_TIPO[f.tipo]}</td>
                <td>{f.ciudad}</td>
                <td>
                  <InsigniaEstado estado={f.estado} />
                </td>
                <td>
                  {f.calificacion === null ? (
                    "Sin evaluar"
                  ) : (
                    <>
                      {formatearPuntaje(f.calificacion)}{" "}
                      <span className="ayuda">
                        ({f.evaluaciones} {f.evaluaciones === 1 ? "evaluación" : "evaluaciones"})
                      </span>
                    </>
                  )}
                </td>
                <td>
                  <InsigniaRiesgo nivel={f.riesgo_nivel} puntaje={f.riesgo_puntaje} />
                </td>
                <td>{f.incidentes_abiertos}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {cargando && !filas && <p className="vacio">Calculando el ranking…</p>}
        {!cargando && filas && filas.length === 0 && <p className="vacio">No hay proveedores con esos filtros.</p>}
      </div>
    </section>
  );
}
