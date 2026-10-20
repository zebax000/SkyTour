const CLAVE = "skytour_token";

// El token vive en sessionStorage: se borra al cerrar la pestaña.
// TODO(frontend): si se compra un dominio propio, pasar a access token en memoria + refresh token en cookie HttpOnly.
export const tokenStorage = {
  get: (): string | null => sessionStorage.getItem(CLAVE),
  set: (token: string): void => sessionStorage.setItem(CLAVE, token),
  clear: (): void => sessionStorage.removeItem(CLAVE),
};
