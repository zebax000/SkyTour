import { tokenStorage } from "../auth/tokenStorage";
import type { EstadoProveedor, NivelRiesgo, TipoProveedor } from "../proveedores/tipos";
import { API_URL, ApiError, apiFetch } from "./client";

export type OrdenRanking = "calificacion" | "riesgo";
export type FormatoReporte = "csv" | "pdf";

export interface FilaRanking {
  posicion: number;
  id: number;
  nombre: string;
  tipo: TipoProveedor;
  ciudad: string;
  estado: EstadoProveedor;
  calificacion: number | null;
  evaluaciones: number;
  riesgo_nivel: NivelRiesgo | null;
  riesgo_puntaje: number | null;
  incidentes_abiertos: number;
}

export interface FiltrosRanking {
  orden: OrdenRanking;
  tipo?: string;
  ciudad?: string;
}

function consulta(filtros: FiltrosRanking): string {
  const parametros = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== "") parametros.set(clave, String(valor));
  }
  return `?${parametros.toString()}`;
}

export const reportesApi = {
  ranking: (filtros: FiltrosRanking) => apiFetch<FilaRanking[]>(`/reportes/ranking${consulta(filtros)}`),
  // El archivo se pide con la sesión (no es un enlace público), por eso se descarga como Blob
  async descargar(formato: FormatoReporte, filtros: FiltrosRanking): Promise<Blob> {
    const token = tokenStorage.get();
    let respuesta: Response;
    try {
      respuesta = await fetch(`${API_URL}/reportes/ranking.${formato}${consulta(filtros)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {
      throw new ApiError(0, "No se pudo conectar con el servidor.");
    }
    if (!respuesta.ok) {
      throw new ApiError(
        respuesta.status,
        respuesta.status === 401 ? "Tu sesión venció. Vuelve a iniciar sesión." : "No se pudo generar el archivo.",
      );
    }
    return await respuesta.blob();
  },
};

// Pide el archivo y hace que el navegador lo guarde
export async function guardarRanking(formato: FormatoReporte, filtros: FiltrosRanking): Promise<void> {
  const blob = await reportesApi.descargar(formato, filtros);
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `ranking_${filtros.orden}.${formato}`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
