import { useState, type FormEvent } from "react";

import { proveedoresApi } from "../api/proveedores";
import "./formularios.css";
import "./gestion.css";
import type { ProveedorDetalle } from "./tipos";

interface Props {
  proveedor: ProveedorDetalle;
  puedeEditar: boolean;
  alCambiar: () => Promise<void>;
}

export function GestionZonas({ proveedor, puedeEditar, alCambiar }: Props) {
  const [texto, setTexto] = useState("");
  const [errorTexto, setErrorTexto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  // Ejecuta una acción contra el servidor y vuelve a cargar la ficha; devuelve si salió bien
  async function ejecutar(accion: () => Promise<unknown>): Promise<boolean> {
    setOcupado(true);
    setError(null);
    try {
      await accion();
      await alCambiar();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar la acción.");
      return false;
    } finally {
      setOcupado(false);
    }
  }

  const yaEsta = (zona: string) =>
    proveedor.zonas.some((z) => z.ciudad_o_region.toLowerCase() === zona.toLowerCase());

  async function agregar(valor: string) {
    const zona = valor.trim();
    if (!zona) return;
    if (zona.length > 120) {
      setErrorTexto("Máximo 120 caracteres.");
      return;
    }
    if (yaEsta(zona)) {
      setErrorTexto("Esa zona ya está registrada.");
      return;
    }
    setErrorTexto(null);
    const bien = await ejecutar(() => proveedoresApi.agregarZona(proveedor.id, zona));
    if (bien) setTexto("");
  }

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    void agregar(texto);
  }

  return (
    <div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {puedeEditar && (
        <form className="fila-zona" onSubmit={alEnviar} noValidate>
          <div className="campo-form">
            <label htmlFor="nueva-zona">Agregar ciudad o región</label>
            <input
              id="nueva-zona"
              type="text"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              aria-invalid={errorTexto ? true : undefined}
              aria-describedby={errorTexto ? "error-nueva-zona" : undefined}
            />
            {errorTexto && (
              <p className="error-campo" id="error-nueva-zona">
                {errorTexto}
              </p>
            )}
          </div>
          <button type="submit" className="boton secundario pequeno" disabled={ocupado}>
            Agregar zona
          </button>
          {!yaEsta(proveedor.ciudad) && (
            <button
              type="button"
              className="boton secundario pequeno"
              disabled={ocupado}
              onClick={() => agregar(proveedor.ciudad)}
            >
              Agregar {proveedor.ciudad}
            </button>
          )}
        </form>
      )}

      {proveedor.zonas.length === 0 ? (
        <p className="ayuda">Este proveedor aún no tiene zonas de cobertura registradas.</p>
      ) : (
        <ul className="zonas">
          {proveedor.zonas.map((z) => (
            <li key={z.id}>
              {z.ciudad_o_region}
              {puedeEditar && (
                <button
                  type="button"
                  className="quitar"
                  aria-label={`Quitar ${z.ciudad_o_region}`}
                  disabled={ocupado}
                  onClick={() => ejecutar(() => proveedoresApi.quitarZona(proveedor.id, z.id))}
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
