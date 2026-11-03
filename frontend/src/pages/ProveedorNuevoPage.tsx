import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { proveedoresApi } from "../api/proveedores";
import { ApiError } from "../api/client";
import { DatosGeneralesCampos } from "../proveedores/DatosGeneralesCampos";
import {
  DATOS_VACIOS,
  servicioVacio,
  tarifaVacia,
  textoONulo,
  validarDatos,
  validarServicios,
  type DatosGenerales,
  type ErroresDatos,
  type ServicioForm,
  type TarifaForm,
} from "../proveedores/formulario";
import "../proveedores/formularios.css";
import { ETIQUETA_TIPO, formatearFecha, formatearValor, type TipoProveedor } from "../proveedores/tipos";

const TITULOS = ["Datos del proveedor", "Servicios y tarifas", "Zonas de cobertura", "Revisar y guardar"];
const ULTIMO = TITULOS.length - 1;

export function ProveedorNuevoPage() {
  const navegar = useNavigate();
  const [paso, setPaso] = useState(0);
  const [datos, setDatos] = useState<DatosGenerales>(DATOS_VACIOS);
  const [errores, setErrores] = useState<ErroresDatos>({});
  const [servicios, setServicios] = useState<ServicioForm[]>([]);
  const [problemas, setProblemas] = useState<string[]>([]);
  const [zonas, setZonas] = useState<string[]>([]);
  const [zonaTexto, setZonaTexto] = useState("");
  const [errorZona, setErrorZona] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const titulo = useRef<HTMLHeadingElement>(null);

  // Al cambiar de paso, el foco va al título para que lectores de pantalla y teclado sepan dónde están
  useEffect(() => {
    titulo.current?.focus();
  }, [paso]);

  function cambiarDato(campo: keyof DatosGenerales, valor: string) {
    setDatos({ ...datos, [campo]: valor });
  }

  function cambiarServicio(i: number, cambios: Partial<ServicioForm>) {
    setServicios(servicios.map((s, k) => (k === i ? { ...s, ...cambios } : s)));
  }

  function cambiarTarifa(i: number, j: number, cambios: Partial<TarifaForm>) {
    setServicios(
      servicios.map((s, k) =>
        k === i ? { ...s, tarifas: s.tarifas.map((t, l) => (l === j ? { ...t, ...cambios } : t)) } : s,
      ),
    );
  }

  function agregarZona(texto: string) {
    const zona = texto.trim();
    if (!zona) return;
    if (zona.length > 120) {
      setErrorZona("Máximo 120 caracteres.");
      return;
    }
    if (zonas.some((z) => z.toLowerCase() === zona.toLowerCase())) {
      setErrorZona("Esa zona ya está en la lista.");
      return;
    }
    setZonas([...zonas, zona]);
    setZonaTexto("");
    setErrorZona(null);
  }

  function avanzar() {
    if (paso === 0) {
      const encontrados = validarDatos(datos);
      setErrores(encontrados);
      if (Object.keys(encontrados).length > 0) return;
    }
    if (paso === 1) {
      const encontrados = validarServicios(servicios);
      setProblemas(encontrados);
      if (encontrados.length > 0) return;
    }
    setPaso(paso + 1);
  }

  async function guardar() {
    setEnviando(true);
    setErrorEnvio(null);
    try {
      const creado = await proveedoresApi.crear({
        nombre: datos.nombre.trim(),
        nit: datos.nit.trim(),
        tipo: datos.tipo as TipoProveedor,
        ciudad: datos.ciudad.trim(),
        contacto_nombre: textoONulo(datos.contacto_nombre),
        contacto_correo: textoONulo(datos.contacto_correo),
        contacto_telefono: textoONulo(datos.contacto_telefono),
        servicios: servicios.map((s) => ({
          nombre: s.nombre.trim(),
          descripcion: textoONulo(s.descripcion),
          tarifas: s.tarifas.map((t) => ({
            valor: t.valor.trim(),
            moneda: t.moneda,
            vigente_desde: t.vigente_desde,
            vigente_hasta: t.vigente_hasta || null,
          })),
        })),
        zonas,
      });
      navegar(`/proveedores/${creado.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        // NIT repetido: se vuelve al primer paso para corregirlo
        setErrores({ nit: e.message });
        setPaso(0);
      } else {
        setErrorEnvio(e instanceof Error ? e.message : "No se pudo guardar el proveedor.");
      }
    } finally {
      setEnviando(false);
    }
  }

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (paso < ULTIMO) avanzar();
    else void guardar();
  }

  return (
    <section className="formulario-proveedor">
      <Link to="/proveedores" className="enlace-volver">
        ← Volver a proveedores
      </Link>
      <h1>Nuevo proveedor</h1>

      <ol className="pasos" aria-label="Pasos del alta">
        {TITULOS.map((t, i) => (
          <li
            key={t}
            className={`paso${i === paso ? " actual" : ""}${i < paso ? " hecho" : ""}`}
            aria-current={i === paso ? "step" : undefined}
          >
            <span className="numero">{i + 1}</span>
            {t}
          </li>
        ))}
      </ol>

      <form className="tarjeta-formulario" onSubmit={alEnviar} noValidate>
        <h2 ref={titulo} tabIndex={-1}>
          {TITULOS[paso]}
        </h2>

        {paso === 0 && <DatosGeneralesCampos datos={datos} errores={errores} alCambiar={cambiarDato} />}

        {paso === 1 && (
          <div>
            <p className="ayuda">
              Los servicios y tarifas son opcionales: puedes agregarlos ahora o después desde la ficha. Escribe el valor
              solo con números, sin puntos de miles.
            </p>
            {problemas.length > 0 && (
              <ul className="lista-problemas" role="alert">
                {problemas.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            )}
            {servicios.map((s, i) => (
              <fieldset key={i} className="grupo-servicio">
                <legend>Servicio {i + 1}</legend>
                <div className="rejilla">
                  <div className="campo-form">
                    <label htmlFor={`servicio-${i}-nombre`}>Nombre del servicio</label>
                    <input
                      id={`servicio-${i}-nombre`}
                      type="text"
                      value={s.nombre}
                      onChange={(e) => cambiarServicio(i, { nombre: e.target.value })}
                    />
                  </div>
                  <div className="campo-form">
                    <label htmlFor={`servicio-${i}-descripcion`}>Descripción (opcional)</label>
                    <textarea
                      id={`servicio-${i}-descripcion`}
                      value={s.descripcion}
                      onChange={(e) => cambiarServicio(i, { descripcion: e.target.value })}
                    />
                  </div>
                </div>

                {s.tarifas.map((t, j) => (
                  <div key={j} className="fila-tarifa">
                    <div className="campo-form">
                      <label htmlFor={`tarifa-${i}-${j}-valor`}>Valor</label>
                      <input
                        id={`tarifa-${i}-${j}-valor`}
                        type="text"
                        inputMode="decimal"
                        value={t.valor}
                        onChange={(e) => cambiarTarifa(i, j, { valor: e.target.value })}
                      />
                    </div>
                    <div className="campo-form">
                      <label htmlFor={`tarifa-${i}-${j}-moneda`}>Moneda</label>
                      <select
                        id={`tarifa-${i}-${j}-moneda`}
                        value={t.moneda}
                        onChange={(e) => cambiarTarifa(i, j, { moneda: e.target.value as TarifaForm["moneda"] })}
                      >
                        <option value="COP">COP</option>
                        <option value="USD">USD</option>
                      </select>
                    </div>
                    <div className="campo-form">
                      <label htmlFor={`tarifa-${i}-${j}-desde`}>Válida desde</label>
                      <input
                        id={`tarifa-${i}-${j}-desde`}
                        type="date"
                        value={t.vigente_desde}
                        onChange={(e) => cambiarTarifa(i, j, { vigente_desde: e.target.value })}
                      />
                    </div>
                    <div className="campo-form">
                      <label htmlFor={`tarifa-${i}-${j}-hasta`}>Hasta (opcional)</label>
                      <input
                        id={`tarifa-${i}-${j}-hasta`}
                        type="date"
                        value={t.vigente_hasta}
                        onChange={(e) => cambiarTarifa(i, j, { vigente_hasta: e.target.value })}
                      />
                    </div>
                    <button
                      type="button"
                      className="boton secundario pequeno"
                      onClick={() =>
                        cambiarServicio(i, { tarifas: s.tarifas.filter((_, l) => l !== j) })
                      }
                    >
                      Quitar tarifa
                    </button>
                  </div>
                ))}

                <div className="acciones-formulario">
                  <button
                    type="button"
                    className="boton secundario pequeno"
                    onClick={() => cambiarServicio(i, { tarifas: [...s.tarifas, tarifaVacia()] })}
                  >
                    Agregar tarifa
                  </button>
                  <button
                    type="button"
                    className="boton secundario pequeno"
                    onClick={() => setServicios(servicios.filter((_, k) => k !== i))}
                  >
                    Quitar servicio
                  </button>
                </div>
              </fieldset>
            ))}
            <button
              type="button"
              className="boton secundario"
              onClick={() => setServicios([...servicios, servicioVacio()])}
            >
              Agregar servicio
            </button>
          </div>
        )}

        {paso === 2 && (
          <div>
            <p className="ayuda">Ciudades o regiones donde el proveedor presta sus servicios. Es opcional.</p>
            <div className="fila-zona">
              <div className="campo-form">
                <label htmlFor="zona-texto">Ciudad o región</label>
                <input
                  id="zona-texto"
                  type="text"
                  value={zonaTexto}
                  onChange={(e) => setZonaTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      agregarZona(zonaTexto);
                    }
                  }}
                  aria-invalid={errorZona ? true : undefined}
                  aria-describedby={errorZona ? "error-zona" : undefined}
                />
                {errorZona && (
                  <p className="error-campo" id="error-zona">
                    {errorZona}
                  </p>
                )}
              </div>
              <button type="button" className="boton secundario pequeno" onClick={() => agregarZona(zonaTexto)}>
                Agregar zona
              </button>
              {datos.ciudad.trim() && (
                <button
                  type="button"
                  className="boton secundario pequeno"
                  onClick={() => agregarZona(datos.ciudad)}
                >
                  Agregar {datos.ciudad.trim()}
                </button>
              )}
            </div>
            {zonas.length === 0 ? (
              <p className="ayuda">Aún no hay zonas agregadas.</p>
            ) : (
              <ul className="zonas">
                {zonas.map((z) => (
                  <li key={z}>
                    {z}
                    <button
                      type="button"
                      className="quitar"
                      aria-label={`Quitar ${z}`}
                      onClick={() => setZonas(zonas.filter((x) => x !== z))}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {paso === ULTIMO && (
          <div className="resumen">
            <h3>Datos</h3>
            <p>
              <strong>{datos.nombre.trim()}</strong> · NIT {datos.nit.trim()} ·{" "}
              {datos.tipo ? ETIQUETA_TIPO[datos.tipo] : ""} · {datos.ciudad.trim()}
            </p>
            <p className="ayuda">
              Contacto: {datos.contacto_nombre.trim() || "sin registrar"}
              {datos.contacto_correo.trim() ? ` · ${datos.contacto_correo.trim()}` : ""}
              {datos.contacto_telefono.trim() ? ` · ${datos.contacto_telefono.trim()}` : ""}
            </p>

            <h3>Servicios y tarifas</h3>
            {servicios.length === 0 ? (
              <p className="ayuda">Sin servicios por ahora.</p>
            ) : (
              <ul>
                {servicios.map((s, i) => (
                  <li key={i}>
                    {s.nombre.trim()}
                    {s.tarifas.length > 0 && (
                      <ul>
                        {s.tarifas.map((t, j) => (
                          <li key={j}>
                            {formatearValor(t.valor.trim(), t.moneda)} desde {formatearFecha(t.vigente_desde)}
                            {t.vigente_hasta ? ` hasta ${formatearFecha(t.vigente_hasta)}` : " sin fecha final"}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <h3>Zonas de cobertura</h3>
            {zonas.length === 0 ? (
              <p className="ayuda">Sin zonas por ahora.</p>
            ) : (
              <p>{zonas.join(", ")}</p>
            )}
          </div>
        )}

        {errorEnvio && (
          <p className="error" role="alert">
            {errorEnvio}
          </p>
        )}

        <div className="acciones-formulario">
          <button
            type="button"
            className="boton secundario"
            disabled={paso === 0 || enviando}
            onClick={() => setPaso(paso - 1)}
          >
            Atrás
          </button>
          <button type="submit" className="boton primario" disabled={enviando}>
            {paso < ULTIMO ? "Siguiente" : enviando ? "Guardando…" : "Guardar proveedor"}
          </button>
        </div>
      </form>
    </section>
  );
}
