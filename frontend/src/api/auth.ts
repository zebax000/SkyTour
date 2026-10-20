import type { Usuario } from "../auth/tipos";
import { apiFetch } from "./client";

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
