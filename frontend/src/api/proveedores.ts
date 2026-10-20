import type {
  EstadoProveedor,
  Moneda,
  PaginaProveedores,
  ProveedorDetalle,
  Servicio,
  Tarifa,
  TipoProveedor,
  Zona,
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

export interface TarifaEntrada {
  valor: string;
  moneda: Moneda;
  vigente_desde: string;
  vigente_hasta: string | null;
}

export interface ServicioEntrada {
  nombre: string;
  descripcion: string | null;
  tarifas: TarifaEntrada[];
}

export interface ProveedorCambios {
  nombre: string;
  nit: string;
  tipo: TipoProveedor;
  ciudad: string;
  contacto_nombre: string | null;
  contacto_correo: string | null;
  contacto_telefono: string | null;
}

export interface ProveedorEntrada extends ProveedorCambios {
  servicios: ServicioEntrada[];
  zonas: string[];
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
  crear: (datos: ProveedorEntrada) =>
    apiFetch<ProveedorDetalle>("/proveedores", {
      method: "POST",
      body: JSON.stringify(datos),
    }),
  actualizar: (id: number, cambios: ProveedorCambios) =>
    apiFetch<ProveedorDetalle>(`/proveedores/${id}`, {
      method: "PATCH",
      body: JSON.stringify(cambios),
    }),
  agregarServicio: (id: number, datos: ServicioEntrada) =>
    apiFetch<Servicio>(`/proveedores/${id}/servicios`, {
      method: "POST",
      body: JSON.stringify(datos),
    }),
  quitarServicio: (id: number, servicioId: number) =>
    apiFetch<void>(`/proveedores/${id}/servicios/${servicioId}`, { method: "DELETE" }),
  agregarTarifa: (id: number, servicioId: number, datos: TarifaEntrada) =>
    apiFetch<Tarifa>(`/proveedores/${id}/servicios/${servicioId}/tarifas`, {
      method: "POST",
      body: JSON.stringify(datos),
    }),
  quitarTarifa: (id: number, servicioId: number, tarifaId: number) =>
    apiFetch<void>(`/proveedores/${id}/servicios/${servicioId}/tarifas/${tarifaId}`, { method: "DELETE" }),
  agregarZona: (id: number, ciudadORegion: string) =>
    apiFetch<Zona>(`/proveedores/${id}/zonas`, {
      method: "POST",
      body: JSON.stringify({ ciudad_o_region: ciudadORegion }),
    }),
  quitarZona: (id: number, zonaId: number) =>
    apiFetch<void>(`/proveedores/${id}/zonas/${zonaId}`, { method: "DELETE" }),
};
