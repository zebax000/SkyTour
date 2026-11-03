import type { Rol } from "../auth/tipos";

export interface UsuarioAdmin {
  id: number;
  nombre: string;
  correo: string;
  rol: Rol;
  activo: boolean;
  creado_en: string;
}

export interface PaginaUsuarios {
  items: UsuarioAdmin[];
  total: number;
  pagina: number;
  tamano: number;
}

export const ROLES: Rol[] = ["administrador", "evaluador", "consultor"];
export const MINIMO_CONTRASENA = 8;

// Misma regla que el backend (el servidor es quien decide; esto solo avisa antes de enviar)
export function motivoContrasenaInvalida(texto: string): string | null {
  if (texto.length < MINIMO_CONTRASENA) return `La contraseña debe tener al menos ${MINIMO_CONTRASENA} caracteres.`;
  if (!/\p{L}/u.test(texto)) return "La contraseña debe incluir al menos una letra.";
  if (!/\p{Nd}/u.test(texto)) return "La contraseña debe incluir al menos un número.";
  return null;
}
