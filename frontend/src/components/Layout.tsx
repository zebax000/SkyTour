import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { MENU } from "../auth/menu";
import { ETIQUETA_ROL } from "../auth/tipos";
import { useAuth } from "../auth/useAuth";

export function Layout() {
  const { usuario, cerrarSesion } = useAuth();
  const navegar = useNavigate();

  if (!usuario) return null;

  const items = MENU.filter((item) => item.roles.includes(usuario.rol));

  function salir() {
    cerrarSesion();
    navegar("/login", { replace: true });
  }

  return (
    <div className="app">
      <aside className="menu-lateral">
        <img className="logo-menu" src="/logo-claro.png" alt="SkyTour: gestión de proveedores turísticos" />
        <nav aria-label="Principal">
          <ul>
            {items.map((item) => (
              <li key={item.ruta}>
                <NavLink
                  to={item.ruta}
                  end={item.ruta === "/"}
                  className={({ isActive }) => (isActive ? "enlace activo" : "enlace")}
                >
                  {item.etiqueta}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="contenido">
        <header className="barra-superior">
          <div className="usuario">
            <span className="nombre">{usuario.nombre}</span>
            <span className="insignia-rol">{ETIQUETA_ROL[usuario.rol]}</span>
          </div>
          <button type="button" className="boton secundario" onClick={salir}>
            Cerrar sesión
          </button>
        </header>
        <main className="area">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
