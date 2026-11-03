import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { authApi } from "../api/auth";
import { setUnauthorizedHandler } from "../api/client";
import { AuthContext } from "./AuthContext";
import { tokenStorage } from "./tokenStorage";
import type { Usuario } from "./tipos";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  // Si hay un token guardado, hay que confirmar quién es antes de mostrar nada
  const [cargando, setCargando] = useState<boolean>(() => tokenStorage.get() !== null);

  const cerrarSesion = useCallback(() => {
    tokenStorage.clear();
    setUsuario(null);
  }, []);

  // Si el servidor responde 401 con un token guardado, la sesión venció: se cierra sola
  useEffect(() => {
    setUnauthorizedHandler(cerrarSesion);
    return () => setUnauthorizedHandler(null);
  }, [cerrarSesion]);

  // Al recargar la página, recupera la sesión con el token guardado
  useEffect(() => {
    if (tokenStorage.get() === null) return;
    let activo = true;
    authApi
      .me()
      .then((u) => {
        if (activo) setUsuario(u);
      })
      .catch(() => {
        if (activo) tokenStorage.clear();
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  const iniciarSesion = useCallback(async (correo: string, contrasena: string) => {
    const { access_token } = await authApi.login(correo, contrasena);
    tokenStorage.set(access_token);
    try {
      setUsuario(await authApi.me());
    } catch (error) {
      tokenStorage.clear();
      throw error;
    }
  }, []);

  const valor = useMemo(
    () => ({ usuario, cargando, iniciarSesion, cerrarSesion }),
    [usuario, cargando, iniciarSesion, cerrarSesion],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
