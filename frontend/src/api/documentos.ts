import { tokenStorage } from "../auth/tokenStorage";
import type {
  Documento,
  PaginaDocumentos,
  ResumenDocumentos,
} from "../documentos/tipos";
import { API_URL, ApiError, apiFetch } from "./client";

export interface ArchivoEntrada {
  nombre: string;
  contenido_base64: string;
}

export interface DocumentoEntrada {
  tipo: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  archivo: ArchivoEntrada;
}

export interface DocumentoCambios {
  tipo?: string;
  fecha_emision?: string;
  fecha_vencimiento?: string;
  archivo?: ArchivoEntrada;
}

// Valores que propone la IA al leer un archivo; nunca se guardan solos
export interface ExtraccionDocumento {
  origen: "gemini" | "ninguno";
  tipo: string | null;
  fecha_emision: string | null;
  fecha_vencimiento: string | null;
  modelo: string | null;
  modelo_solicitado: string | null;
  motivo: string | null;
  advertencia: string | null;
}

export interface FiltrosDocumentos {
  estado?: string;
  q?: string;
  pagina?: number;
  tamano?: number;
}

function consulta(filtros: FiltrosDocumentos): string {
  const parametros = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== "") parametros.set(clave, String(valor));
  }
  const texto = parametros.toString();
  return texto ? `?${texto}` : "";
}

export const documentosApi = {
  listar: (filtros: FiltrosDocumentos) => apiFetch<PaginaDocumentos>(`/documentos${consulta(filtros)}`),
  resumen: () => apiFetch<ResumenDocumentos>("/documentos/resumen"),
  deProveedor: (proveedorId: number) => apiFetch<Documento[]>(`/proveedores/${proveedorId}/documentos`),
  crear: (proveedorId: number, datos: DocumentoEntrada) =>
    apiFetch<Documento>(`/proveedores/${proveedorId}/documentos`, {
      method: "POST",
      body: JSON.stringify(datos),
    }),
  actualizar: (id: number, cambios: DocumentoCambios) =>
    apiFetch<Documento>(`/documentos/${id}`, {
      method: "PATCH",
      body: JSON.stringify(cambios),
    }),
  quitar: (id: number) => apiFetch<void>(`/documentos/${id}`, { method: "DELETE" }),
  // Lee el archivo con IA y devuelve una propuesta; no guarda nada
  extraer: (archivo: ArchivoEntrada) =>
    apiFetch<ExtraccionDocumento>("/documentos/extraer", {
      method: "POST",
      body: JSON.stringify({ archivo }),
    }),
  // El archivo se pide con la sesión (no es un enlace público), por eso se descarga como Blob
  async descargar(id: number): Promise<Blob> {
    const token = tokenStorage.get();
    let respuesta: Response;
    try {
      respuesta = await fetch(`${API_URL}/documentos/${id}/archivo`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {
      throw new ApiError(0, "No se pudo conectar con el servidor.");
    }
    if (!respuesta.ok) {
      throw new ApiError(
        respuesta.status,
        respuesta.status === 404 ? "El documento no tiene archivo." : "No se pudo descargar el archivo.",
      );
    }
    return await respuesta.blob();
  },
};
