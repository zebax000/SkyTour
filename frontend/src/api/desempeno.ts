import type {
  EvaluacionesDeProveedor,
  Evaluacion,
  Gravedad,
  Incidente,
  Observacion,
  PaginaEvaluaciones,
  PaginaIncidentes,
  ProveedorAtencion,
  TipoIncidente,
} from "../desempeno/tipos";
import { apiFetch } from "./client";

export interface EvaluacionEntrada {
  calidad: number;
  puntualidad: number;
  cumplimiento: number;
  precio: number;
  comentario: string | null;
}

export interface IncidenteEntrada {
  tipo: TipoIncidente;
  gravedad: Gravedad;
  descripcion: string;
}

export interface FiltrosEvaluaciones {
  q?: string;
  pagina?: number;
  tamano?: number;
}

export interface FiltrosIncidentes {
  tipo?: string;
  gravedad?: string;
  resuelto?: string;
  q?: string;
  pagina?: number;
  tamano?: number;
}

function consulta(filtros: object): string {
  const parametros = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== "") parametros.set(clave, String(valor));
  }
  const texto = parametros.toString();
  return texto ? `?${texto}` : "";
}

export const desempenoApi = {
  evaluaciones: (proveedorId: number) => apiFetch<EvaluacionesDeProveedor>(`/proveedores/${proveedorId}/evaluaciones`),
  evaluar: (proveedorId: number, datos: EvaluacionEntrada) =>
    apiFetch<Evaluacion>(`/proveedores/${proveedorId}/evaluaciones`, {
      method: "POST",
      body: JSON.stringify(datos),
    }),
  listarEvaluaciones: (filtros: FiltrosEvaluaciones) =>
    apiFetch<PaginaEvaluaciones>(`/evaluaciones${consulta(filtros)}`),

  incidentes: (proveedorId: number) => apiFetch<Incidente[]>(`/proveedores/${proveedorId}/incidentes`),
  registrarIncidente: (proveedorId: number, datos: IncidenteEntrada) =>
    apiFetch<Incidente>(`/proveedores/${proveedorId}/incidentes`, {
      method: "POST",
      body: JSON.stringify(datos),
    }),
  resolverIncidente: (incidenteId: number, comentario: string | null) =>
    apiFetch<Incidente>(`/incidentes/${incidenteId}/cierre`, {
      method: "PATCH",
      body: JSON.stringify({ comentario }),
    }),
  listarIncidentes: (filtros: FiltrosIncidentes) => apiFetch<PaginaIncidentes>(`/incidentes${consulta(filtros)}`),

  observaciones: (proveedorId: number) => apiFetch<Observacion[]>(`/proveedores/${proveedorId}/observaciones`),
  agregarObservacion: (proveedorId: number, texto: string) =>
    apiFetch<Observacion>(`/proveedores/${proveedorId}/observaciones`, {
      method: "POST",
      body: JSON.stringify({ texto }),
    }),

  atencion: () => apiFetch<ProveedorAtencion[]>("/atencion"),
};
