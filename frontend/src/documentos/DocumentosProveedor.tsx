import { useEffect, useState, type FormEvent } from "react";

import { documentosApi } from "../api/documentos";
import { formatearFecha } from "../proveedores/tipos";
import "../proveedores/formularios.css";
import { guardarArchivo } from "./descarga";
import "./documentos.css";
import { InsigniaDocumento } from "./InsigniaDocumento";
import {
  MAX_ARCHIVO_MB,
  TIPOS_DOCUMENTO_SUGERIDOS,
  archivoABase64,
  describirVencimiento,
  formatearTamano,
  validarArchivoLocal,
  type Documento,
} from "./tipos";

interface Props {
  proveedorId: number;
  puedeEditar: boolean;
}

interface Errores {
  tipo?: string;
  emision?: string;
  vencimiento?: string;
  archivo?: string;
}

const ETIQUETA_MOTIVO_LECTURA: Record<string, string> = {
  sin_clave: "La lectura con IA no está configurada en el servidor.",
  limite_de_frecuencia: "Espera unos segundos y vuelve a intentarlo.",
  clave_invalida_o_solicitud_rechazada: "Gemini rechazó la clave o la solicitud (error 400).",
  clave_o_permiso_rechazado: "Gemini rechazó la clave o sus permisos (error 401 o 403).",
  modelo_no_disponible: "Gemini respondió 404: no encontró el modelo o la operación. El detalle está en los registros del servidor.",
  cuota_agotada: "Se agotó la cuota de Gemini (error 429). Espera o revisa el plan de la cuenta.",
  servicio_saturado: "El servicio de Gemini falló o está saturado. Inténtalo más tarde.",
  tiempo_agotado: "Gemini tardó demasiado en responder.",
  sdk_no_instalado: "La librería de Gemini no está instalada en el servidor.",
  respuesta_invalida: "Gemini respondió con un formato que no se pudo validar.",
  sin_datos_legibles: "La IA no pudo leer datos en este archivo.",
  error_desconocido: "Error desconocido. Revisa los registros del servidor.",
};

function mensajeDe(e: unknown, porDefecto: string): string {
  return e instanceof Error ? e.message : porDefecto;
}

export function DocumentosProveedor({ proveedorId, puedeEditar }: Props) {
  const [documentos, setDocumentos] = useState<Documento[] | null>(null);
  const [recarga, setRecarga] = useState(0);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState<Documento | null>(null);
  const [tipo, setTipo] = useState("");
  const [emision, setEmision] = useState("");
  const [vencimiento, setVencimiento] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [claveArchivo, setClaveArchivo] = useState(0);
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);
  const [leyendo, setLeyendo] = useState(false);
  const [avisoIA, setAvisoIA] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    documentosApi
      .deProveedor(proveedorId)
      .then((lista) => {
        if (vigente) setDocumentos(lista);
      })
      .catch((e) => {
        if (vigente) setErrorGeneral(mensajeDe(e, "No se pudieron cargar los documentos."));
      });
    return () => {
      vigente = false;
    };
  }, [proveedorId, recarga]);

  function limpiarFormulario() {
    setTipo("");
    setEmision("");
    setVencimiento("");
    setArchivo(null);
    setClaveArchivo((k) => k + 1);
    setErrores({});
    setAvisoIA(null);
  }

  function abrirNuevo() {
    setEditando(null);
    limpiarFormulario();
    setFormAbierto(true);
  }

  function abrirEdicion(documento: Documento) {
    setEditando(documento);
    limpiarFormulario();
    setTipo(documento.tipo);
    setEmision(documento.fecha_emision);
    setVencimiento(documento.fecha_vencimiento);
    setFormAbierto(true);
  }

  function cerrarFormulario() {
    setFormAbierto(false);
    setEditando(null);
    limpiarFormulario();
  }

  function validar(): Errores {
    const e: Errores = {};
    const limpio = tipo.trim();
    if (!limpio) e.tipo = "Escribe el tipo de documento.";
    else if (limpio.length > 100) e.tipo = "Máximo 100 caracteres.";
    if (!emision) e.emision = "Elige la fecha de emisión.";
    if (!vencimiento) e.vencimiento = "Elige la fecha de vencimiento.";
    else if (emision && vencimiento < emision) e.vencimiento = "No puede ser anterior a la fecha de emisión.";
    if (archivo) {
      const problema = validarArchivoLocal(archivo);
      if (problema) e.archivo = problema;
    } else if (!editando) {
      e.archivo = "Elige el archivo del documento (PDF, JPG o PNG).";
    }
    return e;
  }

  // Pide a la IA que lea el archivo elegido y rellena el formulario; nada se guarda hasta que la persona confirme
  async function leerConIA() {
    if (!archivo) return;
    const problema = validarArchivoLocal(archivo);
    if (problema) {
      setErrores((anteriores) => ({ ...anteriores, archivo: problema }));
      return;
    }
    setLeyendo(true);
    setAvisoIA(null);
    setErrorGeneral(null);
    try {
      const propuesta = await documentosApi.extraer({
        nombre: archivo.name,
        contenido_base64: await archivoABase64(archivo),
      });
      if (propuesta.origen !== "gemini") {
        const motivo = propuesta.motivo ? (ETIQUETA_MOTIVO_LECTURA[propuesta.motivo] ?? propuesta.motivo) : "No se pudo leer el documento.";
        setAvisoIA(`${motivo} Completa los datos a mano.${propuesta.advertencia ? ` ${propuesta.advertencia}` : ""}`);
        return;
      }
      const leidos: string[] = [];
      if (propuesta.tipo) {
        setTipo(propuesta.tipo);
        leidos.push("el tipo");
      }
      if (propuesta.fecha_emision) {
        setEmision(propuesta.fecha_emision);
        leidos.push("la fecha de emisión");
      }
      if (propuesta.fecha_vencimiento) {
        setVencimiento(propuesta.fecha_vencimiento);
        leidos.push("la fecha de vencimiento");
      }
      setErrores({});
      const faltan = 3 - leidos.length;
      setAvisoIA(
        `La IA propuso ${leidos.join(", ")}. Revisa los datos antes de guardar.` +
          (faltan > 0 ? ` No pudo leer ${faltan === 1 ? "un dato" : `${faltan} datos`}: completa lo que falta.` : "") +
          (propuesta.advertencia ? ` ${propuesta.advertencia}` : ""),
      );
    } catch (e) {
      setAvisoIA(`${mensajeDe(e, "No se pudo leer el documento.")} Completa los datos a mano.`);
    } finally {
      setLeyendo(false);
    }
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const encontrados = validar();
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    setEnviando(true);
    setErrorGeneral(null);
    try {
      const entrada = archivo ? { nombre: archivo.name, contenido_base64: await archivoABase64(archivo) } : null;
      if (editando) {
        await documentosApi.actualizar(editando.id, {
          tipo: tipo.trim(),
          fecha_emision: emision,
          fecha_vencimiento: vencimiento,
          ...(entrada ? { archivo: entrada } : {}),
        });
      } else if (entrada) {
        await documentosApi.crear(proveedorId, {
          tipo: tipo.trim(),
          fecha_emision: emision,
          fecha_vencimiento: vencimiento,
          archivo: entrada,
        });
      }
      cerrarFormulario();
      setRecarga((r) => r + 1);
    } catch (e) {
      setErrorGeneral(mensajeDe(e, "No se pudo guardar el documento."));
    } finally {
      setEnviando(false);
    }
  }

  async function quitar(documento: Documento) {
    const seguro = window.confirm(`¿Quitar el documento "${documento.tipo}" y su archivo? Esta acción no se puede deshacer.`);
    if (!seguro) return;
    setErrorGeneral(null);
    try {
      await documentosApi.quitar(documento.id);
      setRecarga((r) => r + 1);
    } catch (e) {
      setErrorGeneral(mensajeDe(e, "No se pudo quitar el documento."));
    }
  }

  async function descargar(documento: Documento) {
    if (!documento.archivo) return;
    setErrorGeneral(null);
    try {
      await guardarArchivo(documento.id, documento.archivo.nombre);
    } catch (e) {
      setErrorGeneral(mensajeDe(e, "No se pudo descargar el archivo."));
    }
  }

  return (
    <div>
      {errorGeneral && (
        <p className="error" role="alert">
          {errorGeneral}
        </p>
      )}

      {puedeEditar && !formAbierto && (
        <div className="barra-seccion">
          <button type="button" className="boton secundario pequeno" onClick={abrirNuevo}>
            Agregar documento
          </button>
        </div>
      )}

      {puedeEditar && formAbierto && (
        <form className="grupo-servicio" onSubmit={guardar} noValidate>
          <div className="rejilla">
            <div className="campo-form">
              <label htmlFor="doc-tipo">Tipo de documento</label>
              <input
                id="doc-tipo"
                type="text"
                list="tipos-documento"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                aria-invalid={errores.tipo ? true : undefined}
                aria-describedby={errores.tipo ? "error-doc-tipo" : undefined}
              />
              <datalist id="tipos-documento">
                {TIPOS_DOCUMENTO_SUGERIDOS.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
              {errores.tipo && (
                <p className="error-campo" id="error-doc-tipo">
                  {errores.tipo}
                </p>
              )}
            </div>
            <div className="campo-form">
              <label htmlFor="doc-emision">Fecha de emisión</label>
              <input
                id="doc-emision"
                type="date"
                value={emision}
                onChange={(e) => setEmision(e.target.value)}
                aria-invalid={errores.emision ? true : undefined}
                aria-describedby={errores.emision ? "error-doc-emision" : undefined}
              />
              {errores.emision && (
                <p className="error-campo" id="error-doc-emision">
                  {errores.emision}
                </p>
              )}
            </div>
            <div className="campo-form">
              <label htmlFor="doc-vencimiento">Fecha de vencimiento</label>
              <input
                id="doc-vencimiento"
                type="date"
                value={vencimiento}
                onChange={(e) => setVencimiento(e.target.value)}
                aria-invalid={errores.vencimiento ? true : undefined}
                aria-describedby={errores.vencimiento ? "error-doc-vencimiento" : undefined}
              />
              {errores.vencimiento && (
                <p className="error-campo" id="error-doc-vencimiento">
                  {errores.vencimiento}
                </p>
              )}
            </div>
            <div className="campo-form">
              <label htmlFor="doc-archivo">
                {editando ? "Reemplazar archivo (opcional)" : "Archivo (PDF, JPG o PNG)"}
              </label>
              <input
                key={claveArchivo}
                id="doc-archivo"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={(e) => {
                  setArchivo(e.target.files?.[0] ?? null);
                  setAvisoIA(null);
                }}
                aria-invalid={errores.archivo ? true : undefined}
                aria-describedby="ayuda-doc-archivo"
              />
              <p className="ayuda" id="ayuda-doc-archivo">
                Máximo {MAX_ARCHIVO_MB} MB.{editando ? " Si no eliges uno, se conserva el actual." : ""}
              </p>
              {errores.archivo && <p className="error-campo">{errores.archivo}</p>}
              {archivo && (
                <div>
                  <button type="button" className="boton secundario pequeno" disabled={leyendo || enviando} onClick={leerConIA}>
                    {leyendo ? "Leyendo…" : "Leer con IA"}
                  </button>
                  <p className="ayuda">
                    Al pulsar, el archivo se envía a Gemini (Google) para proponer el tipo y las fechas. Nada se guarda hasta que
                    tú confirmes.
                  </p>
                </div>
              )}
            </div>
          </div>
          {avisoIA && (
            <p className="ayuda" role="status">
              {avisoIA}
            </p>
          )}
          <div className="acciones-formulario">
            <button type="button" className="boton secundario pequeno" onClick={cerrarFormulario}>
              Cancelar
            </button>
            <button type="submit" className="boton primario pequeno" disabled={enviando || leyendo}>
              {enviando ? "Guardando…" : editando ? "Guardar cambios" : "Guardar documento"}
            </button>
          </div>
        </form>
      )}

      {documentos === null && !errorGeneral && <p className="ayuda">Cargando documentos…</p>}

      {documentos !== null && documentos.length === 0 && (
        <p className="ayuda">Este proveedor aún no tiene documentos registrados.</p>
      )}

      {documentos !== null && documentos.length > 0 && (
        <div className="tabla-contenedor">
          <table className="tabla tabla-documentos">
            <caption className="sr-only">Documentos del proveedor</caption>
            <thead>
              <tr>
                <th scope="col">Documento</th>
                <th scope="col" className="col-fecha">
                  Emisión
                </th>
                <th scope="col" className="col-fecha">
                  Vencimiento
                </th>
                <th scope="col" className="col-estado">
                  Estado
                </th>
                <th scope="col">Archivo</th>
                {puedeEditar && (
                  <th scope="col" className="col-acciones">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {documentos.map((d) => (
                <tr key={d.id}>
                  <td>{d.tipo}</td>
                  <td className="col-fecha">{formatearFecha(d.fecha_emision)}</td>
                  <td className="col-fecha">{formatearFecha(d.fecha_vencimiento)}</td>
                  <td className="col-estado">
                    <InsigniaDocumento estado={d.estado} />
                    <span className="detalle-vencimiento">{describirVencimiento(d.dias_restantes)}</span>
                  </td>
                  <td>
                    {d.archivo ? (
                      <div className="celda-archivo">
                        <span className="archivo-nombre" title={d.archivo.nombre}>
                          {d.archivo.nombre}
                        </span>
                        <div className="archivo-meta">
                          <span className="archivo-tamano">{formatearTamano(d.archivo.tamano)}</span>
                          <button type="button" className="boton secundario pequeno" onClick={() => descargar(d)}>
                            Descargar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="sin-archivo">Sin archivo</span>
                    )}
                  </td>
                  {puedeEditar && (
                    <td className="col-acciones">
                      <div className="acciones-fila">
                        <button type="button" className="boton secundario pequeno" onClick={() => abrirEdicion(d)}>
                          Editar
                        </button>
                        <button type="button" className="boton secundario pequeno" onClick={() => quitar(d)}>
                          Quitar
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
