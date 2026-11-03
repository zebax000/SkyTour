import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../auth/useAuth";
import type { Rol } from "../auth/tipos";

export function RequireRole({ roles }: { roles: Rol[] }) {
  const { usuario } = useAuth();
  if (!usuario || !roles.includes(usuario.rol)) {
    return <Navigate to="/sin-permiso" replace />;
  }
  return <Outlet />;
}
