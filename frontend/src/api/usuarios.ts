import type { Rol } from "../auth/tipos";
import type { PaginaUsuarios, UsuarioAdmin } from "../usuarios/tipos";
import { apiFetch } from "./client";

export interface FiltrosUsuarios {
  q?: string;
  rol?: string;
  activo?: string;
  pagina?: number;
  tamano?: number;
}

export interface UsuarioNuevo {
  nombre: string;
  correo: string;
  rol: Rol;
  contrasena: string;
}

export interface UsuarioCambios {
  nombre?: string;
  rol?: Rol;
  activo?: boolean;
}

function consulta(filtros: FiltrosUsuarios): string {
  const parametros = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== "") parametros.set(clave, String(valor));
  }
  const texto = parametros.toString();
  return texto ? `?${texto}` : "";
}

export const usuariosApi = {
  listar: (filtros: FiltrosUsuarios) => apiFetch<PaginaUsuarios>(`/usuarios${consulta(filtros)}`),
  crear: (datos: UsuarioNuevo) =>
    apiFetch<UsuarioAdmin>("/usuarios", { method: "POST", body: JSON.stringify(datos) }),
  actualizar: (id: number, cambios: UsuarioCambios) =>
    apiFetch<UsuarioAdmin>(`/usuarios/${id}`, { method: "PATCH", body: JSON.stringify(cambios) }),
  restablecerContrasena: (id: number, contrasena: string) =>
    apiFetch<void>(`/usuarios/${id}/contrasena`, { method: "POST", body: JSON.stringify({ contrasena }) }),
  // Cada usuario cambia la suya. El servidor responde 400 (no 401) si la actual está mal, así no se cierra la sesión.
  cambiarMiContrasena: (actual: string, nueva: string) =>
    apiFetch<void>("/auth/contrasena", {
      method: "POST",
      body: JSON.stringify({ contrasena_actual: actual, contrasena_nueva: nueva }),
    }),
};
