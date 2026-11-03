import { useState, type FormEvent } from "react";

import { proveedoresApi } from "../api/proveedores";
import { tarifaVacia, textoONulo, validarTarifa, type TarifaForm } from "./formulario";
import "./formularios.css";
import "./gestion.css";
import { InsigniaVigencia } from "./Insignias";
import { formatearFecha, formatearValor, type ProveedorDetalle } from "./tipos";

interface Props {
  proveedor: ProveedorDetalle;
  puedeEditar: boolean;
  alCambiar: () => Promise<void>;
}

const mayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

export function GestionServicios({ proveedor, puedeEditar, alCambiar }: Props) {
  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [errorNombre, setErrorNombre] = useState<string | null>(null);
  const [tarifaDe, setTarifaDe] = useState<number | null>(null);
  const [tarifa, setTarifa] = useState<TarifaForm>(tarifaVacia());
  const [problemas, setProblemas] = useState<string[]>([]);
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

  async function guardarServicio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const limpio = nombre.trim();
    if (!limpio) {
      setErrorNombre("Escribe el nombre del servicio.");
      return;
    }
    if (limpio.length > 150) {
      setErrorNombre("Máximo 150 caracteres.");
      return;
    }
    setErrorNombre(null);
    const bien = await ejecutar(() =>
      proveedoresApi.agregarServicio(proveedor.id, { nombre: limpio, descripcion: textoONulo(descripcion), tarifas: [] }),
    );
    if (bien) {
      setNombre("");
      setDescripcion("");
      setNuevoAbierto(false);
    }
  }

  function abrirTarifa(servicioId: number) {
    setTarifaDe(servicioId);
    setTarifa(tarifaVacia());
    setProblemas([]);
  }

  async function guardarTarifa(evento: FormEvent<HTMLFormElement>, servicioId: number) {
    evento.preventDefault();
    const encontrados = validarTarifa(tarifa);
    setProblemas(encontrados);
    if (encontrados.length > 0) return;
    const bien = await ejecutar(() =>
      proveedoresApi.agregarTarifa(proveedor.id, servicioId, {
        valor: tarifa.valor.trim(),
        moneda: tarifa.moneda,
        vigente_desde: tarifa.vigente_desde,
        vigente_hasta: tarifa.vigente_hasta || null,
      }),
    );
    if (bien) {
      setTarifaDe(null);
      setTarifa(tarifaVacia());
    }
  }

  async function quitarServicio(servicioId: number, nombreServicio: string) {
    const seguro = window.confirm(`¿Quitar el servicio "${nombreServicio}" y todas sus tarifas? Esta acción no se puede deshacer.`);
    if (!seguro) return;
    await ejecutar(() => proveedoresApi.quitarServicio(proveedor.id, servicioId));
  }

  async function quitarTarifa(servicioId: number, tarifaId: number) {
    const seguro = window.confirm(
      "¿Quitar esta tarifa? Si solo cambió el precio, es mejor agregar una nueva y dejar esta como historial.",
    );
    if (!seguro) return;
    await ejecutar(() => proveedoresApi.quitarTarifa(proveedor.id, servicioId, tarifaId));
  }

  return (
    <div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {puedeEditar &&
        (nuevoAbierto ? (
          <form className="grupo-servicio" onSubmit={guardarServicio} noValidate>
            <div className="rejilla">
              <div className="campo-form">
                <label htmlFor="nuevo-servicio-nombre">Nombre del servicio</label>
                <input
                  id="nuevo-servicio-nombre"
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  aria-invalid={errorNombre ? true : undefined}
                  aria-describedby={errorNombre ? "error-nuevo-servicio" : undefined}
                />
                {errorNombre && (
                  <p className="error-campo" id="error-nuevo-servicio">
                    {errorNombre}
                  </p>
                )}
              </div>
              <div className="campo-form">
                <label htmlFor="nuevo-servicio-descripcion">Descripción (opcional)</label>
                <textarea
                  id="nuevo-servicio-descripcion"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                />
              </div>
            </div>
            <div className="acciones-formulario">
              <button type="button" className="boton secundario pequeno" onClick={() => setNuevoAbierto(false)}>
                Cancelar
              </button>
              <button type="submit" className="boton primario pequeno" disabled={ocupado}>
                {ocupado ? "Guardando…" : "Guardar servicio"}
              </button>
            </div>
          </form>
        ) : (
          <div className="barra-seccion">
            <button type="button" className="boton secundario pequeno" onClick={() => setNuevoAbierto(true)}>
              Agregar servicio
            </button>
          </div>
        ))}

      {proveedor.servicios.length === 0 && !nuevoAbierto && (
        <p className="ayuda">Este proveedor aún no tiene servicios registrados.</p>
      )}

      {proveedor.servicios.map((servicio) => {
        // La tarifa más reciente primero; las anteriores quedan como historial
        const tarifas = [...servicio.tarifas].sort((a, b) => b.vigente_desde.localeCompare(a.vigente_desde));
        return (
          <article key={servicio.id} className="servicio">
            <div className="servicio-cabecera">
              <h2>{servicio.nombre}</h2>
              {puedeEditar && (
                <div className="acciones-servicio">
                  <button
                    type="button"
                    className="boton secundario pequeno"
                    disabled={ocupado}
                    onClick={() => abrirTarifa(servicio.id)}
                  >
                    Agregar tarifa
                  </button>
                  <button
                    type="button"
                    className="boton secundario pequeno"
                    disabled={ocupado}
                    onClick={() => quitarServicio(servicio.id, servicio.nombre)}
                  >
                    Quitar servicio
                  </button>
                </div>
              )}
            </div>
            {servicio.descripcion && <p>{servicio.descripcion}</p>}

            {puedeEditar && tarifaDe === servicio.id && (
              <form className="grupo-servicio" onSubmit={(e) => guardarTarifa(e, servicio.id)} noValidate>
                {problemas.length > 0 && (
                  <ul className="lista-problemas" role="alert">
                    {problemas.map((p) => (
                      <li key={p}>{mayuscula(p)}</li>
                    ))}
                  </ul>
                )}
                <div className="rejilla">
                  <div className="campo-form">
                    <label htmlFor="nueva-tarifa-valor">Valor</label>
                    <input
                      id="nueva-tarifa-valor"
                      type="text"
                      inputMode="decimal"
                      value={tarifa.valor}
                      onChange={(e) => setTarifa({ ...tarifa, valor: e.target.value })}
                    />
                  </div>
                  <div className="campo-form">
                    <label htmlFor="nueva-tarifa-moneda">Moneda</label>
                    <select
                      id="nueva-tarifa-moneda"
                      value={tarifa.moneda}
                      onChange={(e) => setTarifa({ ...tarifa, moneda: e.target.value as TarifaForm["moneda"] })}
                    >
                      <option value="COP">COP</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                  <div className="campo-form">
                    <label htmlFor="nueva-tarifa-desde">Válida desde</label>
                    <input
                      id="nueva-tarifa-desde"
                      type="date"
                      value={tarifa.vigente_desde}
                      onChange={(e) => setTarifa({ ...tarifa, vigente_desde: e.target.value })}
                    />
                  </div>
                  <div className="campo-form">
                    <label htmlFor="nueva-tarifa-hasta">Hasta (opcional)</label>
                    <input
                      id="nueva-tarifa-hasta"
                      type="date"
                      value={tarifa.vigente_hasta}
                      onChange={(e) => setTarifa({ ...tarifa, vigente_hasta: e.target.value })}
                    />
                  </div>
                </div>
                <div className="acciones-formulario">
                  <button type="button" className="boton secundario pequeno" onClick={() => setTarifaDe(null)}>
                    Cancelar
                  </button>
                  <button type="submit" className="boton primario pequeno" disabled={ocupado}>
                    {ocupado ? "Guardando…" : "Guardar tarifa"}
                  </button>
                </div>
              </form>
            )}

            {tarifas.length === 0 ? (
              <p className="ayuda">Sin tarifas registradas.</p>
            ) : (
              <div className="tabla-contenedor">
                <table className="tabla">
                  <caption className="sr-only">Tarifas de {servicio.nombre}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Valor</th>
                      <th scope="col">Desde</th>
                      <th scope="col">Hasta</th>
                      <th scope="col">Estado</th>
                      {puedeEditar && <th scope="col">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {tarifas.map((t) => (
                      <tr key={t.id}>
                        <td>{formatearValor(t.valor, t.moneda)}</td>
                        <td>{formatearFecha(t.vigente_desde)}</td>
                        <td>{t.vigente_hasta ? formatearFecha(t.vigente_hasta) : "Sin fecha final"}</td>
                        <td>
                          <InsigniaVigencia estado={t.estado_vigencia} />
                        </td>
                        {puedeEditar && (
                          <td className="celda-accion">
                            <button
                              type="button"
                              className="boton secundario pequeno"
                              disabled={ocupado}
                              onClick={() => quitarTarifa(servicio.id, t.id)}
                            >
                              Quitar
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
