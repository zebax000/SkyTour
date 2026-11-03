<<<<<<< HEAD
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
=======
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { restablecerContrasena } from '../api/auth';

export function RestablecerContrasenaPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const [token, setToken] = useState('');
    const [contrasenaNueva, setContrasenaNueva] = useState('');
    const [confirmarContrasena, setConfirmarContrasena] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [ocupado, setOcupado] = useState(false);

    useEffect(() => {
        const urlToken = searchParams.get('token');
        if (urlToken) {
            setToken(urlToken);
            // Limpiar el token de la barra de direcciones por seguridad
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (!token) {
            setError("No se encontró un enlace válido. Por favor, solicita uno nuevo.");
        }
    }, [searchParams, token]);

    const validarPolitica = (pwd: string) => {
        if (pwd.length < 8) return false;
        if (!/[a-zA-Z]/.test(pwd)) return false;
        if (!/[0-9]/.test(pwd)) return false;
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (contrasenaNueva !== confirmarContrasena) {
            setError("Las contraseñas no coinciden.");
            return;
        }
        
        if (!validarPolitica(contrasenaNueva)) {
            setError("La contraseña debe tener al menos 8 caracteres, incluyendo letras y números.");
            return;
        }

        setOcupado(true);
        setError(null);
        
        try {
            await restablecerContrasena(token, contrasenaNueva);
            // Redirigir al login enviando un mensaje de éxito en el estado del router
            navigate('/login', { state: { mensajeExito: "Contraseña actualizada exitosamente. Ya puedes iniciar sesión." } });
        } catch (err: any) {
            setError(err.message || "El enlace es inválido o ha caducado.");
        } finally {
            setOcupado(false);
        }
    };

    return (
        <main className="login-page">
            <div className="login-caja">
                <h1>Nueva contraseña</h1>
                
                {error && (
                    <div className="error" role="alert" style={{ marginBottom: '1rem' }}>
                        {error}
                    </div>
                )}
                
                {!token && error ? (
                    <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                        <Link to="/olvide-contrasena">Solicitar nuevo enlace</Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="campo">
                            <label htmlFor="pwd">Nueva contraseña</label>
                            <input
                                id="pwd"
                                type="password"
                                value={contrasenaNueva}
                                onChange={(e) => setContrasenaNueva(e.target.value)}
                                required
                                disabled={ocupado}
                            />
                        </div>
                        
                        <div className="campo">
                            <label htmlFor="pwd2">Repetir contraseña</label>
                            <input
                                id="pwd2"
                                type="password"
                                value={confirmarContrasena}
                                onChange={(e) => setConfirmarContrasena(e.target.value)}
                                required
                                disabled={ocupado}
                            />
                        </div>
                        
                        <button type="submit" className="boton primario" disabled={ocupado}>
                            {ocupado ? 'Guardando...' : 'Guardar contraseña'}
                        </button>
                    </form>
                )}
            </div>
        </main>
    );
}
>>>>>>> origin/main
