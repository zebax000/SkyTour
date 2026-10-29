import type { Usuario } from "../auth/tipos";
import { apiFetch } from "./client";

export const solicitarRestablecimiento = (correo: string) => {
    return apiFetch('/auth/olvide-contrasena', {
        method: 'POST',
        body: JSON.stringify({ correo }),
    });
};

export const restablecerContrasena = (token: string, contrasena_nueva: string) => {
    return apiFetch('/auth/restablecer-contrasena', {
        method: 'POST',
        body: JSON.stringify({ token, contrasena_nueva }),
    });
};


export interface TokenRespuesta {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export const authApi = {
  login: (correo: string, contrasena: string) =>
    apiFetch<TokenRespuesta>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ correo, contrasena }),
    }),
  me: () => apiFetch<Usuario>("/auth/me"),
};
