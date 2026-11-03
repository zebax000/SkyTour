import { useState, type FormEvent } from "react";

import { usuariosApi } from "../api/usuarios";
import { ETIQUETA_ROL } from "../auth/tipos";
import { useAuth } from "../auth/useAuth";
import { motivoContrasenaInvalida } from "../usuarios/tipos";
import "../usuarios/usuarios.css";

export function CuentaPage() {
  const { usuario } = useAuth();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);
  const [enviando, setEnviando] = useState(false);

  if (!usuario) return null;

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setExito(false);
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
      await usuariosApi.cambiarMiContrasena(actual, nueva);
      setExito(true);
      setActual("");
      setNueva("");
      setRepetida("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar la contraseña.");
    } finally {
      setEnviando(false);
    }
  }

  const tipoCampo = verClave ? "text" : "password";

  return (
    <section className="usr-cuenta">
      <h1>Mi cuenta</h1>

      <div className="usr-panel">
        <h2>Mis datos</h2>
        <dl className="usr-datos">
          <div>
            <dt>Nombre</dt>
            <dd>{usuario.nombre}</dd>
          </div>
          <div>
            <dt>Correo</dt>
            <dd>{usuario.correo}</dd>
          </div>
          <div>
            <dt>Rol</dt>
            <dd>{ETIQUETA_ROL[usuario.rol]}</dd>
          </div>
        </dl>
      </div>

      <form className="usr-panel" onSubmit={enviar} aria-labelledby="cuenta-clave">
        <h2 id="cuenta-clave">Cambiar contraseña</h2>
        {exito && (
          <p className="usr-exito" role="status">
            Contraseña actualizada.
          </p>
        )}
        <div className="usr-form">
          <label className="campo">
            Contraseña actual
            <input
              type={tipoCampo}
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              autoComplete="current-password"
              required
              maxLength={128}
            />
          </label>
          <label className="campo">
            Contraseña nueva
            <input
              type={tipoCampo}
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              autoComplete="new-password"
              required
              maxLength={128}
            />
            <span className="ayuda">Mínimo 8 caracteres, con letras y números.</span>
          </label>
          <label className="campo">
            Repite la contraseña nueva
            <input
              type={tipoCampo}
              value={repetida}
              onChange={(e) => setRepetida(e.target.value)}
              autoComplete="new-password"
              required
              maxLength={128}
            />
          </label>
        </div>
        <label className="usr-ver">
          <input type="checkbox" checked={verClave} onChange={(e) => setVerClave(e.target.checked)} />
          Mostrar contraseñas
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="usr-acciones">
          <button type="submit" className="boton primario" disabled={enviando}>
            {enviando ? "Guardando…" : "Cambiar contraseña"}
          </button>
        </div>
      </form>
    </section>
  );
}
