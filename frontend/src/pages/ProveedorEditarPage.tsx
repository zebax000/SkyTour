import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { proveedoresApi } from "../api/proveedores";
import { ApiError } from "../api/client";
import { DatosGeneralesCampos } from "../proveedores/DatosGeneralesCampos";
import { textoONulo, validarDatos, type DatosGenerales, type ErroresDatos } from "../proveedores/formulario";
import "../proveedores/formularios.css";
import type { TipoProveedor } from "../proveedores/tipos";

export function ProveedorEditarPage() {
  const { id } = useParams();
  const navegar = useNavigate();
  const [datos, setDatos] = useState<DatosGenerales | null>(null);
  const [errores, setErrores] = useState<ErroresDatos>({});
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const proveedorId = Number(id);

  useEffect(() => {
    if (!Number.isInteger(proveedorId) || proveedorId <= 0) {
      setErrorCarga("Proveedor no encontrado.");
      return;
    }
    let vigente = true;
    proveedoresApi
      .detalle(proveedorId)
      .then((p) => {
        if (!vigente) return;
        setDatos({
          nombre: p.nombre,
          nit: p.nit,
          tipo: p.tipo,
          ciudad: p.ciudad,
          contacto_nombre: p.contacto_nombre ?? "",
          contacto_correo: p.contacto_correo ?? "",
          contacto_telefono: p.contacto_telefono ?? "",
        });
      })
      .catch((e) => {
        if (vigente) setErrorCarga(e instanceof Error ? e.message : "No se pudo cargar el proveedor.");
      });
    return () => {
      vigente = false;
    };
  }, [proveedorId]);

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!datos) return;
    const encontrados = validarDatos(datos);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    setEnviando(true);
    setErrorEnvio(null);
    try {
      await proveedoresApi.actualizar(proveedorId, {
        nombre: datos.nombre.trim(),
        nit: datos.nit.trim(),
        tipo: datos.tipo as TipoProveedor,
        ciudad: datos.ciudad.trim(),
        contacto_nombre: textoONulo(datos.contacto_nombre),
        contacto_correo: textoONulo(datos.contacto_correo),
        contacto_telefono: textoONulo(datos.contacto_telefono),
      });
      navegar(`/proveedores/${proveedorId}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setErrores({ nit: e.message });
      else setErrorEnvio(e instanceof Error ? e.message : "No se pudieron guardar los cambios.");
    } finally {
      setEnviando(false);
    }
  }

  if (errorCarga) {
    return (
      <section>
        <Link to="/proveedores" className="enlace-volver">
          ← Volver a proveedores
        </Link>
        <p className="error" role="alert">
          {errorCarga}
        </p>
      </section>
    );
  }

  if (!datos) return <p className="estado-carga">Cargando proveedor…</p>;

  return (
    <section className="formulario-proveedor">
      <Link to={`/proveedores/${proveedorId}`} className="enlace-volver">
        ← Volver a la ficha
      </Link>
      <h1>Editar datos del proveedor</h1>

      <form className="tarjeta-formulario" onSubmit={guardar} noValidate>
        <DatosGeneralesCampos
          datos={datos}
          errores={errores}
          alCambiar={(campo, valor) => setDatos({ ...datos, [campo]: valor })}
        />

        {errorEnvio && (
          <p className="error" role="alert">
            {errorEnvio}
          </p>
        )}

        <div className="acciones-formulario">
          <Link to={`/proveedores/${proveedorId}`} className="boton secundario">
            Cancelar
          </Link>
          <button type="submit" className="boton primario" disabled={enviando}>
            {enviando ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </section>
  );
}
