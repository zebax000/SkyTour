import type { Rol } from "./tipos";

export interface ItemMenu {
  ruta: string;
  etiqueta: string;
  roles: Rol[];
}

const TODOS: Rol[] = ["administrador", "evaluador", "consultor"];

// El menú se filtra por rol. Ocultar un botón NO es seguridad: el backend valida los permisos de cada ruta.
export const MENU: ItemMenu[] = [
  { ruta: "/", etiqueta: "Dashboard", roles: TODOS },
  { ruta: "/proveedores", etiqueta: "Proveedores", roles: TODOS },
  { ruta: "/documentos", etiqueta: "Documentos y vigencias", roles: TODOS },
  { ruta: "/evaluaciones", etiqueta: "Evaluaciones", roles: TODOS },
  { ruta: "/incidentes", etiqueta: "Incidentes", roles: TODOS },
  { ruta: "/comparador", etiqueta: "Comparador", roles: TODOS },
  { ruta: "/reportes", etiqueta: "Reportes", roles: TODOS },
  { ruta: "/usuarios", etiqueta: "Usuarios", roles: ["administrador"] },
];
