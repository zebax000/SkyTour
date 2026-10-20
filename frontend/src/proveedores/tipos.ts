import type { Rol } from "../auth/tipos";

export type TipoProveedor =
  | "hotel"
  | "aerolinea"
  | "transportador"
  | "operador"
  | "guia"
  | "restaurante"
  | "aseguradora";

export type EstadoProveedor = "activo" | "en_seguimiento" | "suspendido" | "inactivo";
export type Moneda = "COP" | "USD";
export type EstadoVigencia = "vigente" | "vencida" | "futura";
export type NivelRiesgo = "bajo" | "medio" | "alto" | "sin_datos";

export interface Tarifa {
  id: number;
  valor: string; // llega como texto para no perder precisión (ej. "280000.00")
  moneda: Moneda;
  vigente_desde: string;
  vigente_hasta: string | null;
  estado_vigencia: EstadoVigencia;
}

export interface Servicio {
  id: number;
  nombre: string;
  descripcion: string | null;
  tarifas: Tarifa[];
}

export interface Zona {
  id: number;
  ciudad_o_region: string;
}

export interface ProveedorResumen {
  id: number;
  nombre: string;
  nit: string;
  tipo: TipoProveedor;
  ciudad: string;
  estado: EstadoProveedor;
}

// Último riesgo guardado; es nulo mientras no se haya calculado
export interface ProveedorConRiesgo extends ProveedorResumen {
  riesgo_nivel: NivelRiesgo | null;
  riesgo_puntaje: number | null;
}

export interface ProveedorDetalle extends ProveedorResumen {
  contacto_nombre: string | null;
  contacto_correo: string | null;
  contacto_telefono: string | null;
  creado_en: string;
  servicios: Servicio[];
  zonas: Zona[];
}

export interface PaginaProveedores {
  items: ProveedorConRiesgo[];
  total: number;
  pagina: number;
  tamano: number;
}

export const ETIQUETA_TIPO: Record<TipoProveedor, string> = {
  hotel: "Hotel",
  aerolinea: "Aerolínea",
  transportador: "Transportador",
  operador: "Operador turístico",
  guia: "Guía",
  restaurante: "Restaurante",
  aseguradora: "Aseguradora",
};

export const ETIQUETA_ESTADO: Record<EstadoProveedor, string> = {
  activo: "Activo",
  en_seguimiento: "En seguimiento",
  suspendido: "Suspendido",
  inactivo: "Inactivo",
};

export const ETIQUETA_VIGENCIA: Record<EstadoVigencia, string> = {
  vigente: "Vigente",
  vencida: "Vencida",
  futura: "Futura",
};

export const ETIQUETA_NIVEL_RIESGO: Record<NivelRiesgo, string> = {
  bajo: "Riesgo bajo",
  medio: "Riesgo medio",
  alto: "Riesgo alto",
  sin_datos: "Sin datos suficientes",
};

// El riesgo nunca depende solo del color: lleva texto y un símbolo
export const SIMBOLO_RIESGO: Record<NivelRiesgo, string> = {
  bajo: "●",
  medio: "▲",
  alto: "✖",
  sin_datos: "–",
};

export const TIPOS = Object.keys(ETIQUETA_TIPO) as TipoProveedor[];
export const ESTADOS = Object.keys(ETIQUETA_ESTADO) as EstadoProveedor[];
export const NIVELES_RIESGO = Object.keys(ETIQUETA_NIVEL_RIESGO) as NivelRiesgo[];

// Misma regla que el backend (el servidor es quien decide; esto solo evita mostrar opciones que darían error)
export function estadosPermitidos(rol: Rol, actual: EstadoProveedor): EstadoProveedor[] {
  if (rol === "administrador") return ESTADOS;
  if (rol === "evaluador" && (actual === "activo" || actual === "en_seguimiento")) {
    return ["activo", "en_seguimiento"];
  }
  return [];
}

export function formatearValor(valor: string, moneda: Moneda): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: moneda,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(valor));
}

// "2026-10-19" o "2026-10-19T21:00:00Z" -> "19/10/2026" (sin pasar por Date para no correr el día por zona horaria)
export function formatearFecha(iso: string): string {
  const [anio, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${anio}`;
}
