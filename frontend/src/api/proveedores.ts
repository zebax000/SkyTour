import type {
  EstadoProveedor,
  PaginaProveedores,
  ProveedorDetalle,
} from "../proveedores/tipos";
import { apiFetch } from "./client";

export interface FiltrosProveedores {
  q?: string;
  tipo?: string;
  ciudad?: string;
  estado?: string;
  pagina?: number;
  tamano?: number;
}

function consulta(filtros: FiltrosProveedores): string {
  const parametros = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== "") parametros.set(clave, String(valor));
  }
  const texto = parametros.toString();
  return texto ? `?${texto}` : "";
}

export const proveedoresApi = {
  listar: (filtros: FiltrosProveedores) =>
    apiFetch<PaginaProveedores>(`/proveedores${consulta(filtros)}`),
  ciudades: () => apiFetch<string[]>("/proveedores/ciudades"),
  detalle: (id: number) => apiFetch<ProveedorDetalle>(`/proveedores/${id}`),
  cambiarEstado: (id: number, estado: EstadoProveedor) =>
    apiFetch<ProveedorDetalle>(`/proveedores/${id}/estado`, {
      method: "PATCH",
      body: JSON.stringify({ estado }),
    }),
};
