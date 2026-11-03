import { createContext } from "react";

import type { Usuario } from "./tipos";

export interface AuthContextValor {
  usuario: Usuario | null;
  cargando: boolean;
  iniciarSesion: (correo: string, contrasena: string) => Promise<void>;
  cerrarSesion: () => void;
}

export const AuthContext = createContext<AuthContextValor | null>(null);
