import { documentosApi } from "../api/documentos";

// Pide el archivo al servidor y hace que el navegador lo guarde con su nombre original
export async function guardarArchivo(documentoId: number, nombre: string): Promise<void> {
  const blob = await documentosApi.descargar(documentoId);
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
