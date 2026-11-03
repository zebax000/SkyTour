import { apiFetch } from "./client";

export type NivelRiesgo = "bajo" | "medio" | "alto" | "sin_datos";

export interface ResultadoRiesgo {
  puntaje: number | null;
  nivel: NivelRiesgo;
  factores: Record<string, number>;
  fecha_datos: string;
  evaluaciones_usadas: number;
  documentos_registrados: number;
  servicios_sin_tarifa: number;
}

export interface Explicacion {
  resumen: string;
  acciones: string[];
  origen: "gemini" | "reglas";
  modelo?: string;
  modelo_solicitado?: string;
  motivo?: string;
  aviso?: string;
}

export type RespuestaExplicacion = ResultadoRiesgo & Explicacion;

export const riesgoApi = {
  consultar: (proveedorId: number) => apiFetch<ResultadoRiesgo>(`/proveedores/${proveedorId}/riesgo`),
  recalcular: (proveedorId: number) =>
    apiFetch<ResultadoRiesgo>(`/proveedores/${proveedorId}/riesgo/recalcular`, { method: "POST" }),
  explicar: (proveedorId: number) =>
    apiFetch<RespuestaExplicacion>(`/proveedores/${proveedorId}/riesgo/explicacion`, { method: "POST" }),
};
