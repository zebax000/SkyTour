import { useState, type FormEvent } from "react";

import { usuariosApi, type UsuarioCambios } from "../api/usuarios";
import { ETIQUETA_ROL, type Rol } from "../auth/tipos";
import { useAuth } from "../auth/useAuth";
import { ROLES, motivoContrasenaInvalida, type UsuarioAdmin } from "./tipos";
import "./usuarios.css";

export type EstadoPanel =
  | { tipo: "crear" }
  | { tipo: "editar"; usuario: UsuarioAdmin }
  | { tipo: "contrasena"; usuario: UsuarioAdmin };

interface Props {
  panel: EstadoPanel;
  alCancelar: () => void;
  alGuardar: (mensaje: string) => void;
}

const TITULO = { crear: "Nuevo usuario", editar: "Editar usuario", contrasena: "Restablecer contraseña" } as const;

export function PanelUsuario({ panel, alCancelar, alGuardar }: Props) {
  const { usuario: yo } = useAuth();
  const editando = panel.tipo === "editar" ? panel.usuario : null;
  const [nombre, setNombre] = useState(editando?.nombre ?? "");
  const [correo, setCorreo] = useState("");
  const [rol, setRol] = useState<Rol>(editando?.rol ?? "consultor");
  const [contrasena, setContrasena] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const esYo = editando !== null && yo?.id === editando.id;

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    if (panel.tipo !== "editar") {
      const motivo = motivoContrasenaInvalida(contrasena);
      if (motivo) {
        setError(motivo);
        return;
      }
    }
    setEnviando(true);
    try {
      if (panel.tipo === "crear") {
        await usuariosApi.crear({ nombre: nombre.trim(), correo: correo.trim(), rol, contrasena });
        alGuardar(`Usuario ${correo.trim().toLowerCase()} creado.`);
      } else if (panel.tipo === "editar") {
        const cambios: UsuarioCambios = {};
        if (nombre.trim() !== panel.usuario.nombre) cambios.nombre = nombre.trim();
        if (rol !== panel.usuario.rol) cambios.rol = rol;
        if (Object.keys(cambios).length === 0) {
          alCancelar();
          return;
        }
        await usuariosApi.actualizar(panel.usuario.id, cambios);
        alGuardar("Cambios guardados.");
      } else {
        await usuariosApi.restablecerContrasena(panel.usuario.id, contrasena);
        alGuardar(`Contraseña de ${panel.usuario.nombre} restablecida.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="usr-panel" onSubmit={enviar} aria-labelledby="usr-titulo">
      <h2 id="usr-titulo">
        {TITULO[panel.tipo]}
        {panel.tipo !== "crear" ? ` · ${panel.usuario.nombre}` : ""}
      </h2>

      <div className="usr-form">
        {panel.tipo !== "contrasena" && (
          <label className="campo">
            Nombre completo
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} required maxLength={120} />
          </label>
        )}
        {panel.tipo === "crear" && (
          <label className="campo">
            Correo
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
              maxLength={255}
              autoComplete="off"
            />
          </label>
        )}
        {panel.tipo !== "contrasena" && (
          <label className="campo">
            Rol
            <select value={rol} onChange={(e) => setRol(e.target.value as Rol)} disabled={esYo}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ETIQUETA_ROL[r]}
                </option>
              ))}
            </select>
            {esYo && <span className="ayuda">No puedes cambiar tu propio rol.</span>}
          </label>
        )}
        {panel.tipo !== "editar" && (
          <label className="campo">
            {panel.tipo === "crear" ? "Contraseña inicial" : "Contraseña nueva"}
            <input
              type={verClave ? "text" : "password"}
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              autoComplete="new-password"
              required
              maxLength={128}
            />
            <span className="ayuda">Mínimo 8 caracteres, con letras y números.</span>
          </label>
        )}
      </div>

      {panel.tipo !== "editar" && (
        <label className="usr-ver">
          <input type="checkbox" checked={verClave} onChange={(e) => setVerClave(e.target.checked)} />
          Mostrar contraseña
        </label>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="usr-acciones">
        <button type="submit" className="boton primario" disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar"}
        </button>
        <button type="button" className="boton secundario" onClick={alCancelar} disabled={enviando}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
