import { tokenStorage } from "../auth/tokenStorage";

export const API_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;

  constructor(status: number, mensaje: string) {
    super(mensaje);
    this.status = status;
  }
}

let alNoAutorizado: (() => void) | null = null;

export function setUnauthorizedHandler(manejador: (() => void) | null): void {
  alNoAutorizado = manejador;
}

export async function apiFetch<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const cabeceras = new Headers(init.headers);
  cabeceras.set("Accept", "application/json");
  if (init.body !== undefined) cabeceras.set("Content-Type", "application/json");
  const token = tokenStorage.get();
  if (token) cabeceras.set("Authorization", `Bearer ${token}`);

  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, { ...init, headers: cabeceras });
  } catch {
    throw new ApiError(
      0,
      "No se pudo conectar con el servidor. Si llevaba rato sin uso puede tardar hasta un minuto en despertar: intenta de nuevo.",
    );
  }

  if (!respuesta.ok) {
    let mensaje = "Ocurrió un error inesperado.";
    try {
      const cuerpo = await respuesta.json();
      if (typeof cuerpo?.detail === "string") mensaje = cuerpo.detail;
    } catch {
      // la respuesta no traía cuerpo JSON
    }
    if (respuesta.status === 401 && token && alNoAutorizado) alNoAutorizado();
    throw new ApiError(respuesta.status, mensaje);
  }

  return (await respuesta.json()) as T;
}
