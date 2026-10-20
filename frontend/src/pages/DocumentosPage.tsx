import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { documentosApi } from "../api/documentos";
import { guardarArchivo } from "../documentos/descarga";
import "../documentos/documentos.css";
import { InsigniaDocumento } from "../documentos/InsigniaDocumento";
import {
  ETIQUETA_ESTADO_DOC,
  SIMBOLO_ESTADO_DOC,
  describirVencimiento,
  type DocumentoConProveedor,
  type EstadoDocumento,
  type PaginaDocumentos,
  type ResumenDocumentos,
} from "../documentos/tipos";
import { formatearFecha } from "../proveedores/tipos";

const TAMANO = 10;
const ESTADOS: EstadoDocumento[] = ["vencido", "por_vencer", "vigente"];
const CLAVE_RESUMEN: Record<EstadoDocumento, keyof ResumenDocumentos> = {
  vigente: "vigentes",
  por_vencer: "por_vencer",
  vencido: "vencidos",
};

const plural = (n: number, singular: string, varios: string) => `${n} ${n === 1 ? singular : varios}`;

export function DocumentosPage() {
  const [resumen, setResumen] = useState<ResumenDocumentos | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<EstadoDocumento | "">("");
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState<PaginaDocumentos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    documentosApi
      .resumen()
      .then(setResumen)
      .catch(() => setResumen(null));
  }, []);

  useEffect(() => {
    const espera = setTimeout(() => {
      setQ(busqueda.trim());
      setPagina(1);
    }, 350);
    return () => clearTimeout(espera);
  }, [busqueda]);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError(null);
    documentosApi
      .listar({ estado, q, pagina, tamano: TAMANO })
      .then((respuesta) => {
        if (vigente) setDatos(respuesta);
      })
      .catch((e) => {
        if (vigente) setError(e instanceof Error ? e.message : "No se pudo cargar la lista.");
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [estado, q, pagina]);

  function elegirEstado(nuevo: EstadoDocumento | "") {
    setEstado(nuevo);
    setPagina(1);
  }

  async function descargar(documento: DocumentoConProveedor) {
    if (!documento.archivo) return;
    try {
      await guardarArchivo(documento.id, documento.archivo.nombre);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo descargar el archivo.");
    }
  }

  const total = datos?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / TAMANO));
  const hayFiltros = busqueda !== "" || estado !== "";

  return (
    <section>
      <h1>Documentos y vigencias</h1>
      <p className="ayuda">
        Los documentos se suben desde la ficha de cada proveedor, en la pestaña Documentos. Aquí se ven todos, con lo
        más urgente primero.
      </p>

      {resumen && (resumen.vencidos > 0 || resumen.por_vencer > 0) && (
        <p className={`aviso${resumen.vencidos > 0 ? " peligro" : ""}`} role="status">
          <strong>Atención:</strong> {plural(resumen.vencidos, "documento vencido", "documentos vencidos")} y{" "}
          {plural(resumen.por_vencer, "documento por vencer", "documentos por vencer")}.
        </p>
      )}

      <div className="tarjetas-resumen">
        {ESTADOS.map((e) => (
          <button
            key={e}
            type="button"
            className="tarjeta-resumen"
            aria-pressed={estado === e}
            onClick={() => elegirEstado(estado === e ? "" : e)}
          >
            <span className="cifra">{resumen ? resumen[CLAVE_RESUMEN[e]] : "–"}</span>
            <span>
              <span aria-hidden="true">{SIMBOLO_ESTADO_DOC[e]} </span>
              {ETIQUETA_ESTADO_DOC[e]}
            </span>
          </button>
        ))}
      </div>

      <div className="barra-filtros" role="search">
        <label className="campo ancho">
          Buscar por proveedor o tipo de documento
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Ej. Aurora o RNT"
          />
        </label>
        <label className="campo">
          Estado
          <select value={estado} onChange={(e) => elegirEstado(e.target.value as EstadoDocumento | "")}>
            <option value="">Todos</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {ETIQUETA_ESTADO_DOC[e]}
              </option>
            ))}
          </select>
        </label>
        {hayFiltros && (
          <button
            type="button"
            className="boton secundario pequeno"
            onClick={() => {
              setBusqueda("");
              setQ("");
              elegirEstado("");
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

      <div className="tabla-contenedor">
        <table className="tabla">
          <caption className="sr-only">Documentos de todos los proveedores</caption>
          <thead>
            <tr>
              <th scope="col">Proveedor</th>
              <th scope="col">Documento</th>
              <th scope="col">Vencimiento</th>
              <th scope="col">Estado</th>
              <th scope="col">Archivo</th>
            </tr>
          </thead>
          <tbody>
            {datos?.items.map((d) => (
              <tr key={d.id}>
                <td>
                  <Link to={`/proveedores/${d.proveedor_id}`}>{d.proveedor_nombre}</Link>
                </td>
                <td>{d.tipo}</td>
                <td>{formatearFecha(d.fecha_vencimiento)}</td>
                <td>
                  <InsigniaDocumento estado={d.estado} />
                  <span className="detalle-vencimiento">{describirVencimiento(d.dias_restantes)}</span>
                </td>
                <td>
                  {d.archivo ? (
                    <button type="button" className="boton secundario pequeno" onClick={() => descargar(d)}>
                      Descargar
                    </button>
                  ) : (
                    "Sin archivo"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {cargando && !datos && <p className="vacio">Cargando documentos…</p>}
        {!cargando && datos && datos.items.length === 0 && (
          <p className="vacio">No hay documentos con esos filtros.</p>
        )}
      </div>

      <div className="paginacion">
        <span className="ayuda">
          Página {pagina} de {paginas} · {plural(total, "documento", "documentos")}
        </span>
        <div className="botones">
          <button
            type="button"
            className="boton secundario pequeno"
            disabled={pagina <= 1 || cargando}
            onClick={() => setPagina(pagina - 1)}
          >
            Anterior
          </button>
          <button
            type="button"
            className="boton secundario pequeno"
            disabled={pagina >= paginas || cargando}
            onClick={() => setPagina(pagina + 1)}
          >
            Siguiente
          </button>
        </div>
      </div>
    </section>
  );
}
