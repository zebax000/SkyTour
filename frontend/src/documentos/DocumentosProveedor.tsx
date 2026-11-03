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

<<<<<<< HEAD
function oNulo(texto: string): string | null {
  const limpio = texto.trim();
  return limpio ? limpio : null;
}

=======
>>>>>>> origin/main
export function DocumentosProveedor({ proveedorId, puedeEditar }: Props) {
  const [documentos, setDocumentos] = useState<Documento[] | null>(null);
  const [recarga, setRecarga] = useState(0);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState<Documento | null>(null);
<<<<<<< HEAD
  const [tipo, setTipo] = useState("");
  const [emision, setEmision] = useState("");
  const [vencimiento, setVencimiento] = useState("");
=======
  
  // Estados originales
  const [tipo, setTipo] = useState("");
  const [emision, setEmision] = useState("");
  const [vencimiento, setVencimiento] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  
  // NUEVOS ESTADOS IA
>>>>>>> origin/main
  const [entidadEmisora, setEntidadEmisora] = useState("");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [titular, setTitular] = useState("");
  const [identificacionTitular, setIdentificacionTitular] = useState("");
  const [lugar, setLugar] = useState("");
  const [objeto, setObjeto] = useState("");
  const [resumen, setResumen] = useState("");
<<<<<<< HEAD
  const [archivo, setArchivo] = useState<File | null>(null);
=======

>>>>>>> origin/main
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
<<<<<<< HEAD
=======
    setArchivo(null);
>>>>>>> origin/main
    setEntidadEmisora("");
    setNumeroDocumento("");
    setTitular("");
    setIdentificacionTitular("");
    setLugar("");
    setObjeto("");
    setResumen("");
<<<<<<< HEAD
    setArchivo(null);
=======
    
>>>>>>> origin/main
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
<<<<<<< HEAD
    setEntidadEmisora(documento.entidad_emisora ?? "");
    setNumeroDocumento(documento.numero_documento ?? "");
    setTitular(documento.titular ?? "");
    setIdentificacionTitular(documento.identificacion_titular ?? "");
    setLugar(documento.lugar ?? "");
    setObjeto(documento.objeto ?? "");
    setResumen(documento.resumen ?? "");
=======
    setEntidadEmisora(documento.entidad_emisora || "");
    setNumeroDocumento(documento.numero_documento || "");
    setTitular(documento.titular || "");
    setIdentificacionTitular(documento.identificacion_titular || "");
    setLugar(documento.lugar || "");
    setObjeto(documento.objeto || "");
    setResumen(documento.resumen || "");
>>>>>>> origin/main
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

<<<<<<< HEAD
  // Pide a la IA que lea el archivo elegido y rellena el formulario; nada se guarda hasta que la persona confirme
=======
>>>>>>> origin/main
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
<<<<<<< HEAD
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
      setEntidadEmisora(propuesta.entidad_emisora ?? "");
      if (propuesta.entidad_emisora) leidos.push("la entidad emisora");
      setNumeroDocumento(propuesta.numero_documento ?? "");
      if (propuesta.numero_documento) leidos.push("el número");
      setTitular(propuesta.titular ?? "");
      if (propuesta.titular) leidos.push("el titular");
      setIdentificacionTitular(propuesta.identificacion_titular ?? "");
      if (propuesta.identificacion_titular) leidos.push("la identificación");
      setLugar(propuesta.lugar ?? "");
      if (propuesta.lugar) leidos.push("el lugar");
      setObjeto(propuesta.objeto ?? "");
      if (propuesta.objeto) leidos.push("el objeto");
      setResumen(propuesta.resumen ?? "");
      if (propuesta.resumen) leidos.push("el resumen");

      setErrores({});
      const obligatoriosFaltantes =
        (propuesta.tipo ? 0 : 1) + (propuesta.fecha_emision ? 0 : 1) + (propuesta.fecha_vencimiento ? 0 : 1);
      setAvisoIA(
        `La IA propuso ${leidos.join(", ")}. Revisa los datos antes de guardar.` +
          (obligatoriosFaltantes > 0
            ? ` No pudo leer ${obligatoriosFaltantes === 1 ? "un dato obligatorio" : `${obligatoriosFaltantes} datos obligatorios`}: completa lo que falta.`
            : "") +
=======
      if (propuesta.tipo) { setTipo(propuesta.tipo); leidos.push("el tipo"); }
      if (propuesta.fecha_emision) { setEmision(propuesta.fecha_emision); leidos.push("emisión"); }
      if (propuesta.fecha_vencimiento) { setVencimiento(propuesta.fecha_vencimiento); leidos.push("vencimiento"); }
      if (propuesta.entidad_emisora) { setEntidadEmisora(propuesta.entidad_emisora); leidos.push("entidad"); }
      if (propuesta.numero_documento) { setNumeroDocumento(propuesta.numero_documento); leidos.push("número"); }
      if (propuesta.titular) { setTitular(propuesta.titular); leidos.push("titular"); }
      if (propuesta.identificacion_titular) { setIdentificacionTitular(propuesta.identificacion_titular); leidos.push("identificación"); }
      if (propuesta.lugar) { setLugar(propuesta.lugar); leidos.push("lugar"); }
      if (propuesta.objeto) { setObjeto(propuesta.objeto); leidos.push("motivo"); }
      if (propuesta.resumen) { setResumen(propuesta.resumen); leidos.push("resumen"); }

      setErrores({});
      const faltan = 10 - leidos.length;
      setAvisoIA(
        `La IA propuso: ${leidos.join(", ")}. Revisa los datos antes de guardar.` +
          (faltan > 0 ? ` Faltan ${faltan} datos por identificar.` : "") +
>>>>>>> origin/main
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
<<<<<<< HEAD
      const metadatos = {
        entidad_emisora: oNulo(entidadEmisora),
        numero_documento: oNulo(numeroDocumento),
        titular: oNulo(titular),
        identificacion_titular: oNulo(identificacionTitular),
        lugar: oNulo(lugar),
        objeto: oNulo(objeto),
        resumen: oNulo(resumen),
      };
      if (editando) {
        await documentosApi.actualizar(editando.id, {
          tipo: tipo.trim(),
          fecha_emision: emision,
          fecha_vencimiento: vencimiento,
          ...metadatos,
=======
      
      const payloadBase = {
        tipo: tipo.trim(),
        fecha_emision: emision,
        fecha_vencimiento: vencimiento,
        entidad_emisora: entidadEmisora.trim() || null,
        numero_documento: numeroDocumento.trim() || null,
        titular: titular.trim() || null,
        identificacion_titular: identificacionTitular.trim() || null,
        lugar: lugar.trim() || null,
        objeto: objeto.trim() || null,
        resumen: resumen.trim() || null,
      };

      if (editando) {
        await documentosApi.actualizar(editando.id, {
          ...payloadBase,
>>>>>>> origin/main
          ...(entrada ? { archivo: entrada } : {}),
        });
      } else if (entrada) {
        await documentosApi.crear(proveedorId, {
<<<<<<< HEAD
          tipo: tipo.trim(),
          fecha_emision: emision,
          fecha_vencimiento: vencimiento,
          ...metadatos,
=======
          ...payloadBase,
>>>>>>> origin/main
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
<<<<<<< HEAD
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
              <label htmlFor="doc-entidad">Entidad emisora (opcional)</label>
              <input
                id="doc-entidad"
                type="text"
                maxLength={200}
                value={entidadEmisora}
                onChange={(e) => setEntidadEmisora(e.target.value)}
              />
            </div>
            <div className="campo-form">
              <label htmlFor="doc-numero">Número del documento (opcional)</label>
              <input
                id="doc-numero"
                type="text"
                maxLength={100}
                value={numeroDocumento}
                onChange={(e) => setNumeroDocumento(e.target.value)}
              />
            </div>
            <div className="campo-form">
              <label htmlFor="doc-titular">Titular (opcional)</label>
              <input
                id="doc-titular"
                type="text"
                maxLength={200}
                value={titular}
                onChange={(e) => setTitular(e.target.value)}
              />
            </div>
            <div className="campo-form">
              <label htmlFor="doc-id-titular">NIT o identificación del titular (opcional)</label>
              <input
                id="doc-id-titular"
                type="text"
                maxLength={50}
                value={identificacionTitular}
                onChange={(e) => setIdentificacionTitular(e.target.value)}
              />
            </div>
            <div className="campo-form">
              <label htmlFor="doc-lugar">Lugar o ciudad (opcional)</label>
              <input
                id="doc-lugar"
                type="text"
                maxLength={120}
                value={lugar}
                onChange={(e) => setLugar(e.target.value)}
              />
            </div>
            <div className="campo-form">
              <label htmlFor="doc-objeto">Objeto o alcance (opcional)</label>
              <input
                id="doc-objeto"
                type="text"
                maxLength={300}
                value={objeto}
                onChange={(e) => setObjeto(e.target.value)}
              />
            </div>
            <div className="campo-form">
              <label htmlFor="doc-resumen">Resumen (opcional)</label>
              <textarea
                id="doc-resumen"
                maxLength={500}
                value={resumen}
                onChange={(e) => setResumen(e.target.value)}
              />
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
                    Al pulsar, el archivo se envía a Gemini (Google) para proponer el tipo, fechas y datos principales. Nada se
                    guarda hasta que tú confirmes.
                  </p>
=======
              <label htmlFor="doc-tipo">Tipo de documento *</label>
              <input id="doc-tipo" type="text" list="tipos-documento" value={tipo} onChange={(e) => setTipo(e.target.value)} aria-invalid={errores.tipo ? true : undefined} />
              <datalist id="tipos-documento">
                {TIPOS_DOCUMENTO_SUGERIDOS.map((t) => <option key={t} value={t} />)}
              </datalist>
              {errores.tipo && <p className="error-campo">{errores.tipo}</p>}
            </div>
            <div className="campo-form">
              <label htmlFor="doc-emision">Fecha de emisión *</label>
              <input id="doc-emision" type="date" value={emision} onChange={(e) => setEmision(e.target.value)} aria-invalid={errores.emision ? true : undefined} />
              {errores.emision && <p className="error-campo">{errores.emision}</p>}
            </div>
            <div className="campo-form">
              <label htmlFor="doc-vencimiento">Fecha de vencimiento *</label>
              <input id="doc-vencimiento" type="date" value={vencimiento} onChange={(e) => setVencimiento(e.target.value)} aria-invalid={errores.vencimiento ? true : undefined} />
              {errores.vencimiento && <p className="error-campo">{errores.vencimiento}</p>}
            </div>

            {/* CAMPOS NUEVOS */}
            <div className="campo-form">
              <label htmlFor="doc-entidad">Entidad emisora</label>
              <input id="doc-entidad" type="text" value={entidadEmisora} onChange={(e) => setEntidadEmisora(e.target.value)} placeholder="Ej. Cámara de Comercio" />
            </div>
            <div className="campo-form">
              <label htmlFor="doc-numero">Número de documento</label>
              <input id="doc-numero" type="text" value={numeroDocumento} onChange={(e) => setNumeroDocumento(e.target.value)} placeholder="Ej. 12345678" />
            </div>
            <div className="campo-form">
              <label htmlFor="doc-titular">Titular</label>
              <input id="doc-titular" type="text" value={titular} onChange={(e) => setTitular(e.target.value)} placeholder="A nombre de..." />
            </div>
            <div className="campo-form">
              <label htmlFor="doc-id-titular">Identificación Titular (NIT/C.C.)</label>
              <input id="doc-id-titular" type="text" value={identificacionTitular} onChange={(e) => setIdentificacionTitular(e.target.value)} />
            </div>
            <div className="campo-form">
              <label htmlFor="doc-lugar">Lugar / Ciudad</label>
              <input id="doc-lugar" type="text" value={lugar} onChange={(e) => setLugar(e.target.value)} />
            </div>
            <div className="campo-form" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="doc-objeto">Motivo o Alcance</label>
              <input id="doc-objeto" type="text" value={objeto} onChange={(e) => setObjeto(e.target.value)} />
            </div>
            <div className="campo-form" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="doc-resumen">Resumen (máx 2 frases)</label>
              <textarea id="doc-resumen" value={resumen} onChange={(e) => setResumen(e.target.value)} rows={2} />
            </div>

            <div className="campo-form" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="doc-archivo">
                {editando ? "Reemplazar archivo (opcional)" : "Archivo (PDF, JPG o PNG) *"}
              </label>
              <input
                key={claveArchivo} id="doc-archivo" type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={(e) => { setArchivo(e.target.files?.[0] ?? null); setAvisoIA(null); }}
                aria-invalid={errores.archivo ? true : undefined}
              />
              <p className="ayuda">Máximo {MAX_ARCHIVO_MB} MB.{editando ? " Si no eliges uno, se conserva el actual." : ""}</p>
              {errores.archivo && <p className="error-campo">{errores.archivo}</p>}
              {archivo && (
                <div style={{ marginTop: '0.5rem' }}>
                  <button type="button" className="boton secundario pequeno" disabled={leyendo || enviando} onClick={leerConIA}>
                    {leyendo ? "Leyendo…" : "Leer con IA"}
                  </button>
                  <p className="ayuda">Al pulsar, el archivo se envía a Gemini para extraer los datos. Nada se guarda hasta que confirmes.</p>
>>>>>>> origin/main
                </div>
              )}
            </div>
          </div>
<<<<<<< HEAD
          {avisoIA && (
            <p className="ayuda" role="status">
              {avisoIA}
            </p>
          )}
          <div className="acciones-formulario">
            <button type="button" className="boton secundario pequeno" onClick={cerrarFormulario}>
              Cancelar
            </button>
=======
          {avisoIA && <p className="ayuda" role="status" style={{ color: '#005a9e', fontWeight: 'bold' }}>{avisoIA}</p>}
          <div className="acciones-formulario">
            <button type="button" className="boton secundario pequeno" onClick={cerrarFormulario}>Cancelar</button>
>>>>>>> origin/main
            <button type="submit" className="boton primario pequeno" disabled={enviando || leyendo}>
              {enviando ? "Guardando…" : editando ? "Guardar cambios" : "Guardar documento"}
            </button>
          </div>
        </form>
      )}

      {documentos === null && !errorGeneral && <p className="ayuda">Cargando documentos…</p>}
<<<<<<< HEAD

      {documentos !== null && documentos.length === 0 && (
        <p className="ayuda">Este proveedor aún no tiene documentos registrados.</p>
      )}

=======
      {documentos !== null && documentos.length === 0 && <p className="ayuda">Este proveedor aún no tiene documentos registrados.</p>}
      
>>>>>>> origin/main
      {documentos !== null && documentos.length > 0 && (
        <div className="tabla-contenedor">
          <table className="tabla tabla-documentos">
            <caption className="sr-only">Documentos del proveedor</caption>
            <thead>
              <tr>
                <th scope="col">Documento</th>
<<<<<<< HEAD
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
              {documentos.map((d) => {
                const linea1 = [
                  d.entidad_emisora ? `Entidad: ${d.entidad_emisora}` : null,
                  d.numero_documento ? `N.º ${d.numero_documento}` : null,
                ].filter(Boolean);
                const linea2 = [
                  d.titular
                    ? `Titular: ${d.titular}${d.identificacion_titular ? ` (${d.identificacion_titular})` : ""}`
                    : d.identificacion_titular
                      ? `ID: ${d.identificacion_titular}`
                      : null,
                  d.lugar ? `Lugar: ${d.lugar}` : null,
                ].filter(Boolean);
                return (
                  <tr key={d.id}>
                    <td>
                      <strong className="doc-titulo">{d.tipo}</strong>
                      {linea1.length > 0 && <span className="doc-secundario">{linea1.join(" · ")}</span>}
                      {linea2.length > 0 && <span className="doc-secundario">{linea2.join(" · ")}</span>}
                      {d.objeto && <span className="doc-secundario">Motivo: {d.objeto}</span>}
                      {d.resumen && <span className="doc-resumen-texto">{d.resumen}</span>}
                    </td>
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
                );
              })}
=======
                <th scope="col" className="col-fecha">Emisión</th>
                <th scope="col" className="col-fecha">Vencimiento</th>
                <th scope="col" className="col-estado">Estado</th>
                <th scope="col">Archivo</th>
                {puedeEditar && <th scope="col" className="col-acciones">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {documentos.map((d) => (
                <tr key={d.id}>
                  <td>
                    <strong>{d.tipo}</strong>
                    {/* Información secundaria extraída */}
                    {(d.entidad_emisora || d.numero_documento || d.titular || d.lugar) && (
                      <div style={{ fontSize: '0.85em', color: '#555', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {d.entidad_emisora && <span>🏢 Entidad: {d.entidad_emisora}</span>}
                        {d.numero_documento && <span>#️⃣ Número: {d.numero_documento}</span>}
                        {d.titular && <span>👤 Titular: {d.titular} {d.identificacion_titular ? `(${d.identificacion_titular})` : ''}</span>}
                        {d.lugar && <span>📍 Lugar: {d.lugar}</span>}
                      </div>
                    )}
                    {d.objeto && (
                      <div style={{ fontSize: '0.85em', color: '#666', fontStyle: 'italic', marginTop: '4px' }}>
                        Motivo: {d.objeto}
                      </div>
                    )}
                  </td>
                  <td className="col-fecha">{formatearFecha(d.fecha_emision)}</td>
                  <td className="col-fecha">{formatearFecha(d.fecha_vencimiento)}</td>
                  <td className="col-estado">
                    <InsigniaDocumento estado={d.estado} />
                    <span className="detalle-vencimiento">{describirVencimiento(d.dias_restantes)}</span>
                  </td>
                  <td>
                    {d.archivo ? (
                      <div className="celda-archivo">
                        <span className="archivo-nombre" title={d.archivo.nombre}>{d.archivo.nombre}</span>
                        <div className="archivo-meta">
                          <span className="archivo-tamano">{formatearTamano(d.archivo.tamano)}</span>
                          <button type="button" className="boton secundario pequeno" onClick={() => descargar(d)}>Descargar</button>
                        </div>
                      </div>
                    ) : (
                      <span className="sin-archivo">Sin archivo</span>
                    )}
                  </td>
                  {puedeEditar && (
                    <td className="col-acciones">
                      <div className="acciones-fila">
                        <button type="button" className="boton secundario pequeno" onClick={() => abrirEdicion(d)}>Editar</button>
                        <button type="button" className="boton secundario pequeno" onClick={() => quitar(d)}>Quitar</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
>>>>>>> origin/main
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
<<<<<<< HEAD
}
=======
}
>>>>>>> origin/main
