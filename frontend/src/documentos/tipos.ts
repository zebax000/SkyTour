export type EstadoDocumento = "vigente" | "por_vencer" | "vencido";

export interface ArchivoInfo {
  nombre: string;
  tipo_mime: string;
  tamano: number;
}

export interface Documento {
  id: number;
  proveedor_id: number;
  tipo: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  creado_en: string;
  archivo: ArchivoInfo | null;
  estado: EstadoDocumento;
  dias_restantes: number;
}

export interface DocumentoConProveedor extends Documento {
  proveedor_nombre: string;
}

export interface PaginaDocumentos {
  items: DocumentoConProveedor[];
  total: number;
  pagina: number;
  tamano: number;
}

export interface ResumenDocumentos {
  vigentes: number;
  por_vencer: number;
  vencidos: number;
}

export const ETIQUETA_ESTADO_DOC: Record<EstadoDocumento, string> = {
  vigente: "Vigente",
  por_vencer: "Por vencer",
  vencido: "Vencido",
};

// El semáforo nunca depende solo del color: lleva texto y un símbolo
export const SIMBOLO_ESTADO_DOC: Record<EstadoDocumento, string> = {
  vigente: "●",
  por_vencer: "▲",
  vencido: "✖",
};

export const TIPOS_DOCUMENTO_SUGERIDOS = [
  "RUT",
  "Cámara de Comercio",
  "Registro Nacional de Turismo (RNT)",
  "Póliza de responsabilidad civil",
  "Certificado de calidad turística",
  "Contrato",
];

export const MAX_ARCHIVO_MB = 5;

export function describirVencimiento(dias: number): string {
  if (dias < 0) return `Venció hace ${-dias} ${-dias === 1 ? "día" : "días"}`;
  if (dias === 0) return "Vence hoy";
  return `Vence en ${dias} ${dias === 1 ? "día" : "días"}`;
}

export function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Revisión rápida antes de enviar; el servidor vuelve a validar el contenido real del archivo
export function validarArchivoLocal(archivo: File): string | null {
  if (archivo.size === 0) return "El archivo está vacío.";
  if (archivo.size > MAX_ARCHIVO_MB * 1024 * 1024) return `El archivo supera el máximo de ${MAX_ARCHIVO_MB} MB.`;
  if (!/\.(pdf|jpe?g|png)$/i.test(archivo.name)) return "Solo se aceptan archivos PDF, JPG o PNG.";
  return null;
}

export function archivoABase64(archivo: File): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => {
      const resultado = String(lector.result);
      resolver(resultado.slice(resultado.indexOf(",") + 1)); // quita el prefijo "data:...;base64,"
    };
    lector.onerror = () => rechazar(new Error("No se pudo leer el archivo."));
    lector.readAsDataURL(archivo);
  });
}
