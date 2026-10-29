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