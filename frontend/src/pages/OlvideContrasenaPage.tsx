<<<<<<< HEAD
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { authApi } from "../api/auth";
import { Logo } from "../components/Logo";
import "./LoginPage.css";

const MENSAJE_CONFIRMACION =
  "Si el correo está registrado, te enviamos un enlace para restablecer la contraseña.";

export function OlvideContrasenaPage() {
  const [correo, setCorreo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const limpio = correo.trim();
    if (!limpio) return;
    setError(null);
    setEnviando(true);
    try {
      await authApi.olvideContrasena(limpio);
      setEnviado(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo procesar la solicitud.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="login">
      <div className="tarjeta-login">
        <Logo className="logo-login" />
        <h1>Recuperar contraseña</h1>
        <p className="ayuda">
          Escribe el correo de tu cuenta y te enviaremos un enlace válido durante 30 minutos.
        </p>

        {enviado ? (
          <div className="aviso-exito" role="status">
            {MENSAJE_CONFIRMACION}
          </div>
        ) : (
          <form onSubmit={enviar} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label htmlFor="olvide-correo">Correo</label>
            <input
              id="olvide-correo"
              type="email"
              autoComplete="email"
              required
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
            />

            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="boton primario" disabled={enviando}>
              {enviando ? "Enviando…" : "Enviar enlace"}
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
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { solicitarRestablecimiento } from '../api/auth'; // Ajusta la ruta si es necesario

export function OlvideContrasenaPage() {
    const [correo, setCorreo] = useState('');
    const [mensaje, setMensaje] = useState<string | null>(null);
    const [ocupado, setOcupado] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setOcupado(true);
        setMensaje(null);
        
        try {
            await solicitarRestablecimiento(correo);
        } catch (error) {
            // Ignoramos el error intencionalmente por seguridad
        } finally {
            setOcupado(false);
            // El mensaje SIEMPRE es el mismo, exista o no la cuenta
            setMensaje("Si el correo está registrado, te enviamos un enlace para restablecer la contraseña.");
        }
    };

    return (
        <main className="login-page"> {/* Reutilizamos la clase para centrar el formulario */}
            <div className="login-caja">
                <h1>Recuperar contraseña</h1>
                
                {mensaje ? (
                    <div className="exito" style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#e6f4ea', color: '#137333', borderRadius: '4px' }}>
                        {mensaje}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="login-form">
                        <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#666' }}>
                            Ingresa tu correo electrónico y te enviaremos instrucciones para restablecer tu contraseña.
                        </p>
                        
                        <div className="campo">
                            <label htmlFor="correo">Correo electrónico</label>
                            <input
                                id="correo"
                                type="email"
                                value={correo}
                                onChange={(e) => setCorreo(e.target.value)}
                                required
                                disabled={ocupado}
                            />
                        </div>
                        
                        <button type="submit" className="boton primario" disabled={ocupado}>
                            {ocupado ? 'Enviando...' : 'Enviar enlace'}
                        </button>
                    </form>
                )}
                
                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    <Link to="/login">Volver al inicio de sesión</Link>
                </div>
            </div>
        </main>
    );
}
>>>>>>> origin/main
