import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { authApi } from "../api/auth";
import { Logo } from "../components/Logo";
import { motivoContrasenaInvalida } from "../usuarios/tipos";
import "./LoginPage.css";

export function RestablecerContrasenaPage() {
  const [parametros] = useSearchParams();
  const [token] = useState(() => (parametros.get("token") ?? "").trim());
  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Retira el token de la barra de direcciones después de leerlo para que no quede en el historial
    if (window.location.search.includes("token=")) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);
    if (!token) {
      setError("El enlace de restablecimiento no es válido. Solicita uno nuevo.");
      return;
    }
    if (nueva !== repetida) {
      setError("La contraseña nueva y su repetición no coinciden.");
      return;
    }
    const motivo = motivoContrasenaInvalida(nueva);
    if (motivo) {
      setError(motivo);
      return;
    }
    setEnviando(true);
    try {
      await authApi.restablecerContrasena(token, nueva);
      setExito(true);
      setNueva("");
      setRepetida("");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "El enlace de restablecimiento no es válido, ya fue utilizado o venció.",
      );
    } finally {
      setEnviando(false);
    }
  }

  const tipoCampo = verClave ? "text" : "password";

  return (
    <main className="login">
      <div className="tarjeta-login">
        <Logo className="logo-login" />
        <h1>Nueva contraseña</h1>

        {!token && !exito ? (
          <>
            <p className="error" role="alert">
              Falta el enlace de verificación o ya no es válido. Solicita uno nuevo.
            </p>
            <p className="enlace-olvide">
              <Link to="/olvide-contrasena">Solicitar un enlace nuevo</Link>
            </p>
          </>
        ) : exito ? (
          <>
            <div className="aviso-exito" role="status">
              Tu contraseña se actualizó correctamente. Ya puedes iniciar sesión con tu clave nueva.
            </div>
            <p className="enlace-olvide">
              <Link to="/login">Ir al inicio de sesión</Link>
            </p>
          </>
        ) : (
          <form onSubmit={enviar} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <p className="ayuda">Mínimo 8 caracteres, con al menos una letra y un número.</p>

            <label htmlFor="nueva-clave">Contraseña nueva</label>
            <input
              id="nueva-clave"
              type={tipoCampo}
              autoComplete="new-password"
              required
              maxLength={128}
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
            />

            <label htmlFor="repetir-clave">Repite la contraseña nueva</label>
            <input
              id="repetir-clave"
              type={tipoCampo}
              autoComplete="new-password"
              required
              maxLength={128}
              value={repetida}
              onChange={(e) => setRepetida(e.target.value)}
            />

            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 400, fontSize: "0.9rem" }}>
              <input type="checkbox" checked={verClave} onChange={(e) => setVerClave(e.target.checked)} />
              Mostrar contraseñas
            </label>

            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="boton primario" disabled={enviando}>
              {enviando ? "Guardando…" : "Guardar contraseña"}
            </button>
          </form>
        )}

        <p className="enlace-olvide">
          <Link to="/login">← Volver al inicio de sesión</Link>
        </p>
      </div>
    </main>
  );
}
