import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { desempenoApi } from "../api/desempeno";
import "../desempeno/desempeno.css";
import { InsigniaEstadoIncidente, InsigniaGravedad, InsigniaTipoIncidente } from "../desempeno/Insignias";
import {
  ETIQUETA_GRAVEDAD,
  ETIQUETA_MOTIVO_ATENCION,
  ETIQUETA_TIPO_INCIDENTE,
  GRAVEDADES,
  TIPOS_INCIDENTE,
  formatearFechaHora,
  type PaginaIncidentes,
  type ProveedorAtencion,
} from "../desempeno/tipos";
import { InsigniaEstado, InsigniaRiesgo } from "../proveedores/Insignias";
import { ETIQUETA_TIPO } from "../proveedores/tipos";

const TAMANO = 10;

export function IncidentesPage() {
  const [atencion, setAtencion] = useState<ProveedorAtencion[] | null>(null);
  const [errorAtencion, setErrorAtencion] = useState<string | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState("");
  const [gravedad, setGravedad] = useState("");
  const [resuelto, setResuelto] = useState("");
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState<PaginaIncidentes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    desempenoApi
      .atencion()
      .then(setAtencion)
      .catch((e) => setErrorAtencion(e instanceof Error ? e.message : "No se pudo cargar la lista de atención."));
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
    desempenoApi
      .listarIncidentes({ tipo, gravedad, resuelto, q, pagina, tamano: TAMANO })
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
  }, [tipo, gravedad, resuelto, q, pagina]);

  function filtrar(poner: (valor: string) => void, valor: string) {
    poner(valor);
    setPagina(1);
  }

  const total = datos?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / TAMANO));
  const hayFiltros = busqueda !== "" || tipo !== "" || gravedad !== "" || resuelto !== "";

  return (
    <section>
      <h1>Incidentes</h1>

      <div className="seccion-atencion">
        <h2>Requieren atención</h2>
        <p className="ayuda">
          Proveedores marcados "En seguimiento" o con riesgo alto. Los inactivos no aparecen.
        </p>
        {errorAtencion && (
          <p className="error" role="alert">
            {errorAtencion}
          </p>
        )}
        {atencion !== null && atencion.length === 0 && (
          <p className="vacio">Ningún proveedor requiere atención por ahora.</p>
        )}
        {atencion !== null && atencion.length > 0 && (
          <div className="tabla-contenedor">
            <table className="tabla">
              <caption className="sr-only">Proveedores que requieren atención</caption>
              <thead>
                <tr>
                  <th scope="col">Proveedor</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Ciudad</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Riesgo</th>
                  <th scope="col">Motivo</th>
                  <th scope="col">Incidentes abiertos</th>
                </tr>
              </thead>
              <tbody>
                {atencion.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link to={`/proveedores/${p.id}`}>{p.nombre}</Link>
                    </td>
                    <td>{ETIQUETA_TIPO[p.tipo]}</td>
                    <td>{p.ciudad}</td>
                    <td>
                      <InsigniaEstado estado={p.estado} />
                    </td>
                    <td>
                      <InsigniaRiesgo nivel={p.riesgo_nivel} puntaje={p.riesgo_puntaje} />
                    </td>
                    <td>
                      {(p.motivos ?? []).length > 0
                        ? (p.motivos ?? []).map((m) => ETIQUETA_MOTIVO_ATENCION[m] ?? m).join(" y ")
                        : "En seguimiento"}
                    </td>
                    <td>{p.incidentes_abiertos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <h2>Incidentes e incumplimientos</h2>
      <div className="barra-filtros" role="search">
        <label className="campo ancho">
          Buscar por proveedor
          <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Ej. Andes" />
        </label>
        <label className="campo">
          Tipo
          <select value={tipo} onChange={(e) => filtrar(setTipo, e.target.value)}>
            <option value="">Todos</option>
            {TIPOS_INCIDENTE.map((t) => (
              <option key={t} value={t}>
                {ETIQUETA_TIPO_INCIDENTE[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          Gravedad
          <select value={gravedad} onChange={(e) => filtrar(setGravedad, e.target.value)}>
            <option value="">Todas</option>
            {GRAVEDADES.map((g) => (
              <option key={g} value={g}>
                {ETIQUETA_GRAVEDAD[g]}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          Estado
          <select value={resuelto} onChange={(e) => filtrar(setResuelto, e.target.value)}>
            <option value="">Todos</option>
            <option value="false">Abiertos</option>
            <option value="true">Resueltos</option>
          </select>
        </label>
        {hayFiltros && (
          <button
            type="button"
            className="boton secundario pequeno"
            onClick={() => {
              setBusqueda("");
              setQ("");
              setTipo("");
              setGravedad("");
              setResuelto("");
              setPagina(1);
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
          <caption className="sr-only">Incidentes e incumplimientos de todos los proveedores</caption>
          <thead>
            <tr>
              <th scope="col">Proveedor</th>
              <th scope="col">Fecha</th>
              <th scope="col">Tipo</th>
              <th scope="col">Gravedad</th>
              <th scope="col">Descripción</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            {datos?.items.map((i) => (
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
                <td>
                  <InsigniaEstadoIncidente resuelto={i.resuelto} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {cargando && !datos && <p className="vacio">Cargando incidentes…</p>}
        {!cargando && datos && datos.items.length === 0 && <p className="vacio">No hay incidentes con esos filtros.</p>}
      </div>

      <div className="paginacion">
        <span className="ayuda">
          Página {pagina} de {paginas} · {total} {total === 1 ? "registro" : "registros"}
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
