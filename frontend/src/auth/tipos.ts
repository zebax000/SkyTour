export type Rol = "administrador" | "evaluador" | "consultor";

export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  rol: Rol;
}

export const ETIQUETA_ROL: Record<Rol, string> = {
  administrador: "Administrador",
  evaluador: "Evaluador",
  consultor: "Consultor",
};
