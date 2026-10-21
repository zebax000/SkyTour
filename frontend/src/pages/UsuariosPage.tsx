import { useEffect, useState } from "react";

import { usuariosApi } from "../api/usuarios";
import { ETIQUETA_ROL } from "../auth/tipos";
import { useAuth } from "../auth/useAuth";
import { formatearFecha } from "../proveedores/tipos";
import { PanelUsuario, type EstadoPanel } from "../usuarios/PanelUsuario";
import { ROLES, type PaginaUsuarios, type UsuarioAdmin } from "../usuarios/tipos";
import "../usuarios/usuarios.css";

const TAMANO = 10;

export function UsuariosPage() {
  const { usuario: yo } = useAuth();
  const [busqueda, setBusqueda] = useState("");
  const [q, setQ] = useState("");
  const [rol, setRol] = useState("");
  const [estado, setEstado] = useState("");
  const [pagina, setPagina] = useState(1);
  const [recarga, setRecarga] = useState(0);
  const [datos, setDatos] = useState<PaginaUsuarios | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [panel, setPanel] = useState<EstadoPanel | null>(null);

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
    usuariosApi
      .listar({ q, rol, activo: estado, pagina, tamano: TAMANO })
      .then((respuesta) => {
        if (!vigente) return;
        setError(null);
        // Si el filtro dejó vacía la página en la que estábamos, retrocede una
        if (respuesta.items.length === 0 && pagina > 1) setPagina(pagina - 1);
        else setDatos(respuesta);
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
  }, [q, rol, estado, pagina, recarga]);

  function abrir(nuevo: EstadoPanel) {
    setAviso(null);
    setPanel(nuevo);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function alGuardar(mensaje: string) {
    setPanel(null);
    setAviso(mensaje);
    setRecarga((n) => n + 1);
  }

  async function cambiarActivo(u: UsuarioAdmin) {
    const activar = !u.activo;
    if (!activar && !window.confirm(`¿Desactivar a ${u.nombre}? No podrá iniciar sesión hasta que la actives de nuevo.`)) {
      return;
    }
    setError(null);
    setAviso(null);
    try {
      await usuariosApi.actualizar(u.id, { activo: activar });
      setAviso(`${u.nombre} ${activar ? "activado" : "desactivado"}.`);
      setRecarga((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el cambio.");
    }
  }

  const total = datos?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / TAMANO));
  const hayFiltros = busqueda !== "" || rol !== "" || estado !== "";

  return (
    <section>
      <div className="encabezado-pagina">
        <h1>Usuarios</h1>
        <div className="acciones-encabezado">
          <p className="ayuda" aria-live="polite">
            {datos ? `${total} ${total === 1 ? "usuario" : "usuarios"}` : ""}
          </p>
          <button type="button" className="boton primario pequeno" onClick={() => abrir({ tipo: "crear" })}>
            Nuevo usuario
          </button>
        </div>
      </div>

      {aviso && (
        <p className="usr-exito" role="status">
          {aviso}
        </p>
      )}

      {panel && (
        <PanelUsuario
          key={panel.tipo === "crear" ? "crear" : `${panel.tipo}-${panel.usuario.id}`}
          panel={panel}
          alCancelar={() => setPanel(null)}
          alGuardar={alGuardar}
        />
      )}

      <div className="barra-filtros" role="search">
        <label className="campo ancho">
          Buscar por nombre o correo
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Ej. Lucía o admin@"
          />
        </label>
        <label className="campo">
          Rol
          <select
            value={rol}
            onChange={(e) => {
              setRol(e.target.value);
              setPagina(1);
            }}
          >
            <option value="">Todos</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ETIQUETA_ROL[r]}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          Estado
          <select
            value={estado}
            onChange={(e) => {
              setEstado(e.target.value);
              setPagina(1);
            }}
          >
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </label>
        {hayFiltros && (
          <button
            type="button"
            className="boton secundario pequeno"
            onClick={() => {
              setBusqueda("");
              setQ("");
              setRol("");
              setEstado("");
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
          <caption className="sr-only">Lista de usuarios</caption>
          <thead>
            <tr>
              <th scope="col">Nombre</th>
              <th scope="col">Correo</th>
              <th scope="col">Rol</th>
              <th scope="col">Estado</th>
              <th scope="col">Creado</th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {datos?.items.map((u) => {
              const esYo = u.id === yo?.id;
              return (
                <tr key={u.id}>
                  <td>
                    {u.nombre}
                    {esYo && <span className="ayuda"> (tú)</span>}
                  </td>
                  <td>{u.correo}</td>
                  <td>
                    <span className={`insignia usr-rol-${u.rol}`}>{ETIQUETA_ROL[u.rol]}</span>
                  </td>
                  <td>
                    <span className={`insignia ${u.activo ? "estado-activo" : "estado-inactivo"}`}>
                      {u.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td>{formatearFecha(u.creado_en)}</td>
                  <td>
                    <div className="usr-botones">
                      <button
                        type="button"
                        className="boton secundario pequeno"
                        onClick={() => abrir({ tipo: "editar", usuario: u })}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="boton secundario pequeno"
                        onClick={() => abrir({ tipo: "contrasena", usuario: u })}
                      >
                        Contraseña
                      </button>
                      <button
                        type="button"
                        className="boton secundario pequeno"
                        disabled={esYo && u.activo}
                        title={esYo && u.activo ? "No puedes desactivar tu propia cuenta" : undefined}
                        onClick={() => cambiarActivo(u)}
                      >
                        {u.activo ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {cargando && !datos && <p className="vacio">Cargando usuarios…</p>}
        {!cargando && datos && datos.items.length === 0 && <p className="vacio">No hay usuarios con esos filtros.</p>}
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
