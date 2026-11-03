import type { ProveedorConRiesgo } from "../proveedores/tipos";

export type TipoIncidente = "incidente" | "incumplimiento";
export type Gravedad = "baja" | "media" | "alta" | "critica";
export type MotivoAtencion = "en_seguimiento" | "riesgo_alto";

export interface Evaluacion {
  id: number;
  proveedor_id: number;
  evaluador_id: number;
  evaluador_nombre: string;
  calidad: number;
  puntualidad: number;
  cumplimiento: number;
  precio: number;
  comentario: string | null;
  fecha: string;
  promedio: number;
}

export interface EvaluacionConProveedor extends Evaluacion {
  proveedor_nombre: string;
}

export interface EvaluacionesDeProveedor {
  promedio: number | null;
  en_promedio: number;
  total: number;
  items: Evaluacion[];
}

export interface PaginaEvaluaciones {
  items: EvaluacionConProveedor[];
  total: number;
  pagina: number;
  tamano: number;
}

export interface Incidente {
  id: number;
  proveedor_id: number;
  registrado_por: number;
  registrado_por_nombre: string;
  tipo: TipoIncidente;
  gravedad: Gravedad;
  descripcion: string;
  fecha: string;
  resuelto: boolean;
  fecha_cierre: string | null;
  comentario_cierre: string | null;
}

export interface IncidenteConProveedor extends Incidente {
  proveedor_nombre: string;
}

export interface PaginaIncidentes {
  items: IncidenteConProveedor[];
  total: number;
  pagina: number;
  tamano: number;
}

export interface Observacion {
  id: number;
  proveedor_id: number;
  autor_id: number;
  autor_nombre: string;
  texto: string;
  fecha: string;
}

export interface ProveedorAtencion extends ProveedorConRiesgo {
  incidentes_abiertos: number;
  motivos: MotivoAtencion[];
}

export const ETIQUETA_TIPO_INCIDENTE: Record<TipoIncidente, string> = {
  incidente: "Incidente",
  incumplimiento: "Incumplimiento",
};

export const ETIQUETA_GRAVEDAD: Record<Gravedad, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  critica: "Crítica",
};

export const ETIQUETA_MOTIVO_ATENCION: Record<MotivoAtencion, string> = {
  en_seguimiento: "En seguimiento",
  riesgo_alto: "Riesgo alto",
};

// La gravedad nunca depende solo del color: lleva texto y un símbolo
export const SIMBOLO_GRAVEDAD: Record<Gravedad, string> = {
  baja: "●",
  media: "▲",
  alta: "◆",
  critica: "✖",
};

export const TIPOS_INCIDENTE = Object.keys(ETIQUETA_TIPO_INCIDENTE) as TipoIncidente[];
export const GRAVEDADES = Object.keys(ETIQUETA_GRAVEDAD) as Gravedad[];

export const CRITERIOS = [
  { clave: "calidad", etiqueta: "Calidad" },
  { clave: "puntualidad", etiqueta: "Puntualidad" },
  { clave: "cumplimiento", etiqueta: "Cumplimiento" },
  { clave: "precio", etiqueta: "Precio" },
] as const;

export type ClaveCriterio = (typeof CRITERIOS)[number]["clave"];

export function formatearPuntaje(valor: number): string {
  return valor.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}

const FORMATO_FECHA_HORA = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Bogota",
});

export function formatearFechaHora(iso: string): string {
  return FORMATO_FECHA_HORA.format(new Date(iso));
}
