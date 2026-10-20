import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { desempenoApi } from "../api/desempeno";
import "../desempeno/desempeno.css";
import { Puntaje } from "../desempeno/Puntaje";
import { formatearFechaHora, type PaginaEvaluaciones } from "../desempeno/tipos";

const TAMANO = 10;

export function EvaluacionesPage() {
  const [busqueda, setBusqueda] = useState("");
  const [q, setQ] = useState("");
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState<PaginaEvaluaciones | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

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
      .listarEvaluaciones({ q, pagina, tamano: TAMANO })
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
  }, [q, pagina]);

  const total = datos?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / TAMANO));

  return (
    <section>
      <h1>Evaluaciones</h1>
      <p className="ayuda">
        Las evaluaciones más recientes de todos los proveedores. Para registrar una, abre la ficha del proveedor y entra a
        la pestaña Evaluaciones.
      </p>

      <div className="barra-filtros" role="search">
        <label className="campo ancho">
          Buscar por proveedor
          <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Ej. Aurora" />
        </label>
        {busqueda !== "" && (
          <button
            type="button"
            className="boton secundario pequeno"
            onClick={() => {
              setBusqueda("");
              setQ("");
              setPagina(1);
            }}
          >
            Limpiar búsqueda
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
          <caption className="sr-only">Evaluaciones recientes</caption>
          <thead>
            <tr>
              <th scope="col">Proveedor</th>
              <th scope="col">Fecha</th>
              <th scope="col">Evaluador</th>
              <th scope="col">Calidad</th>
              <th scope="col">Puntualidad</th>
              <th scope="col">Cumplimiento</th>
              <th scope="col">Precio</th>
              <th scope="col">Promedio</th>
            </tr>
          </thead>
          <tbody>
            {datos?.items.map((e) => (
              <tr key={e.id}>
                <td>
                  <Link to={`/proveedores/${e.proveedor_id}`}>{e.proveedor_nombre}</Link>
                </td>
                <td>{formatearFechaHora(e.fecha)}</td>
                <td>{e.evaluador_nombre}</td>
                <td>{e.calidad}</td>
                <td>{e.puntualidad}</td>
                <td>{e.cumplimiento}</td>
                <td>{e.precio}</td>
                <td>
                  <Puntaje valor={e.promedio} pequeno />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {cargando && !datos && <p className="vacio">Cargando evaluaciones…</p>}
        {!cargando && datos && datos.items.length === 0 && <p className="vacio">No hay evaluaciones para mostrar.</p>}
      </div>

      <div className="paginacion">
        <span className="ayuda">
          Página {pagina} de {paginas} · {total} {total === 1 ? "evaluación" : "evaluaciones"}
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
