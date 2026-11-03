import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { proveedoresApi } from "../api/proveedores";
import { useAuth } from "../auth/useAuth";
import { InsigniaEstado, InsigniaRiesgo } from "../proveedores/Insignias";
import {
  ESTADOS,
  ETIQUETA_ESTADO,
  ETIQUETA_NIVEL_RIESGO,
  ETIQUETA_TIPO,
  NIVELES_RIESGO,
  TIPOS,
  type PaginaProveedores,
} from "../proveedores/tipos";

const TAMANO = 10;

export function ProveedoresPage() {
  const { usuario } = useAuth();
  const [busqueda, setBusqueda] = useState("");
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [estado, setEstado] = useState("");
  const [riesgo, setRiesgo] = useState("");
  const [pagina, setPagina] = useState(1);
  const [ciudades, setCiudades] = useState<string[]>([]);
  const [datos, setDatos] = useState<PaginaProveedores | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    proveedoresApi
      .ciudades()
      .then(setCiudades)
      .catch(() => setCiudades([]));
  }, []);

  // Espera un momento después de escribir para no consultar en cada tecla
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
    proveedoresApi
      .listar({ q, tipo, ciudad, estado, riesgo, pagina, tamano: TAMANO })
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
  }, [q, tipo, ciudad, estado, riesgo, pagina]);

  function cambiarFiltro(poner: (valor: string) => void, valor: string) {
    poner(valor);
    setPagina(1);
  }

  function limpiar() {
    setBusqueda("");
    setQ("");
    setTipo("");
    setCiudad("");
    setEstado("");
    setRiesgo("");
    setPagina(1);
  }

  const total = datos?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / TAMANO));
  const hayFiltros = busqueda !== "" || tipo !== "" || ciudad !== "" || estado !== "" || riesgo !== "";

  return (
    <section>
      <div className="encabezado-pagina">
        <h1>Proveedores</h1>
        <div className="acciones-encabezado">
          <p className="ayuda" aria-live="polite">
            {datos ? `${total} ${total === 1 ? "proveedor" : "proveedores"}` : ""}
          </p>
          {usuario?.rol === "administrador" && (
            <Link to="/proveedores/nuevo" className="boton primario pequeno">
              Nuevo proveedor
            </Link>
          )}
        </div>
      </div>

      <div className="barra-filtros" role="search">
        <label className="campo ancho">
          Buscar por nombre o NIT
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Ej. Aurora o 900123456"
          />
        </label>
        <label className="campo">
          Tipo
          <select value={tipo} onChange={(e) => cambiarFiltro(setTipo, e.target.value)}>
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
          <select value={ciudad} onChange={(e) => cambiarFiltro(setCiudad, e.target.value)}>
            <option value="">Todas</option>
            {ciudades.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          Estado
          <select value={estado} onChange={(e) => cambiarFiltro(setEstado, e.target.value)}>
            <option value="">Todos</option>
            {ESTADOS.map((s) => (
              <option key={s} value={s}>
                {ETIQUETA_ESTADO[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          Riesgo
          <select value={riesgo} onChange={(e) => cambiarFiltro(setRiesgo, e.target.value)}>
            <option value="">Todos</option>
            {NIVELES_RIESGO.map((n) => (
              <option key={n} value={n}>
                {ETIQUETA_NIVEL_RIESGO[n]}
              </option>
            ))}
          </select>
        </label>
        {hayFiltros && (
          <button type="button" className="boton secundario pequeno" onClick={limpiar}>
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
          <caption className="sr-only">Lista de proveedores</caption>
          <thead>
            <tr>
              <th scope="col">Nombre</th>
              <th scope="col">NIT</th>
              <th scope="col">Tipo</th>
              <th scope="col">Ciudad</th>
              <th scope="col">Estado</th>
              <th scope="col">Riesgo</th>
            </tr>
          </thead>
          <tbody>
            {datos?.items.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link to={`/proveedores/${p.id}`}>{p.nombre}</Link>
                </td>
                <td>{p.nit}</td>
                <td>{ETIQUETA_TIPO[p.tipo]}</td>
                <td>{p.ciudad}</td>
                <td>
                  <InsigniaEstado estado={p.estado} />
                </td>
                <td>
                  <InsigniaRiesgo nivel={p.riesgo_nivel} puntaje={p.riesgo_puntaje} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {cargando && !datos && <p className="vacio">Cargando proveedores…</p>}
        {!cargando && datos && datos.items.length === 0 && (
          <p className="vacio">No hay proveedores con esos filtros.</p>
        )}
      </div>

      <div className="paginacion">
        <span className="ayuda">
          Página {pagina} de {paginas}
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
