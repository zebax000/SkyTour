import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { proveedoresApi } from "../api/proveedores";
import { useAuth } from "../auth/useAuth";
import { EvaluacionesProveedor } from "../desempeno/EvaluacionesProveedor";
import { IncidentesProveedor } from "../desempeno/IncidentesProveedor";
import { ObservacionesProveedor } from "../desempeno/ObservacionesProveedor";
import { DocumentosProveedor } from "../documentos/DocumentosProveedor";
import { GestionServicios } from "../proveedores/GestionServicios";
import { GestionZonas } from "../proveedores/GestionZonas";
import { InsigniaEstado } from "../proveedores/Insignias";
import {
  ETIQUETA_ESTADO,
  ETIQUETA_TIPO,
  estadosPermitidos,
  formatearFecha,
  type EstadoProveedor,
  type ProveedorDetalle,
} from "../proveedores/tipos";

type Pestana = "datos" | "servicios" | "cobertura" | "documentos" | "evaluaciones" | "incidentes" | "observaciones";

const PESTANAS: { id: Pestana; etiqueta: string }[] = [
  { id: "datos", etiqueta: "Datos" },
  { id: "servicios", etiqueta: "Servicios y tarifas" },
  { id: "cobertura", etiqueta: "Cobertura" },
  { id: "documentos", etiqueta: "Documentos" },
  { id: "evaluaciones", etiqueta: "Evaluaciones" },
  { id: "incidentes", etiqueta: "Incidentes" },
  { id: "observaciones", etiqueta: "Observaciones" },
];

function mensajeDe(e: unknown, porDefecto: string): string {
  return e instanceof Error ? e.message : porDefecto;
}

export function ProveedorFichaPage() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const [proveedor, setProveedor] = useState<ProveedorDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorEstado, setErrorEstado] = useState<string | null>(null);
  const [pestana, setPestana] = useState<Pestana>("datos");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const proveedorId = Number(id);
    if (!Number.isInteger(proveedorId) || proveedorId <= 0) {
      setError("Proveedor no encontrado.");
      return;
    }
    let vigente = true;
    setProveedor(null);
    setError(null);
    proveedoresApi
      .detalle(proveedorId)
      .then((respuesta) => {
        if (vigente) setProveedor(respuesta);
      })
      .catch((e) => {
        if (vigente) setError(mensajeDe(e, "No se pudo cargar el proveedor."));
      });
    return () => {
      vigente = false;
    };
  }, [id]);

  // Vuelve a pedir la ficha después de agregar o quitar servicios, tarifas o zonas
  async function recargar() {
    if (!proveedor) return;
    setProveedor(await proveedoresApi.detalle(proveedor.id));
  }

  async function cambiarEstado(nuevo: EstadoProveedor) {
    if (!proveedor || nuevo === proveedor.estado) return;
    if (nuevo === "suspendido" || nuevo === "inactivo") {
      const confirmado = window.confirm(
        `¿Seguro que quieres marcar a ${proveedor.nombre} como ${ETIQUETA_ESTADO[nuevo].toLowerCase()}?`,
      );
      if (!confirmado) return;
    }
    setGuardando(true);
    setErrorEstado(null);
    try {
      setProveedor(await proveedoresApi.cambiarEstado(proveedor.id, nuevo));
    } catch (e) {
      setErrorEstado(mensajeDe(e, "No se pudo cambiar el estado."));
    } finally {
      setGuardando(false);
    }
  }

  if (error) {
    return (
      <section>
        <Link to="/proveedores" className="enlace-volver">
          ← Volver a proveedores
        </Link>
        <p className="error" role="alert">
          {error}
        </p>
      </section>
    );
  }

  if (!proveedor || !usuario) return <p className="estado-carga">Cargando proveedor…</p>;

  const opcionesEstado = estadosPermitidos(usuario.rol, proveedor.estado);
  const esAdministrador = usuario.rol === "administrador";
  const puedeRegistrar = esAdministrador || usuario.rol === "evaluador";

  return (
    <section>
      <Link to="/proveedores" className="enlace-volver">
        ← Volver a proveedores
      </Link>

      <div className="cabecera-ficha">
        <div>
          <h1>{proveedor.nombre}</h1>
          <div className="meta">
            <InsigniaEstado estado={proveedor.estado} />
            <span>{ETIQUETA_TIPO[proveedor.tipo]}</span>
            <span>{proveedor.ciudad}</span>
          </div>
        </div>

        <div className="acciones-ficha">
          {esAdministrador && (
            <Link to={`/proveedores/${proveedor.id}/editar`} className="boton secundario pequeno">
              Editar datos
            </Link>
          )}
          {opcionesEstado.length > 0 && (
            <label className="campo cambio-estado">
              <span>Cambiar estado</span>
              <select
                value={proveedor.estado}
                disabled={guardando}
                onChange={(e) => cambiarEstado(e.target.value as EstadoProveedor)}
              >
                {opcionesEstado.map((s) => (
                  <option key={s} value={s}>
                    {ETIQUETA_ESTADO[s]}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      {errorEstado && (
        <p className="error" role="alert">
          {errorEstado}
        </p>
      )}

      <div className="pestanas" role="tablist" aria-label="Información del proveedor">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            id={`pestana-${p.id}`}
            aria-selected={pestana === p.id}
            aria-controls={`panel-${p.id}`}
            className="pestana"
            onClick={() => setPestana(p.id)}
          >
            {p.etiqueta}
          </button>
        ))}
      </div>

      <div className="panel" role="tabpanel" id={`panel-${pestana}`} aria-labelledby={`pestana-${pestana}`}>
        {pestana === "datos" && <PanelDatos proveedor={proveedor} />}
        {pestana === "servicios" && (
          <GestionServicios proveedor={proveedor} puedeEditar={esAdministrador} alCambiar={recargar} />
        )}
        {pestana === "cobertura" && (
          <GestionZonas proveedor={proveedor} puedeEditar={esAdministrador} alCambiar={recargar} />
        )}
        {pestana === "documentos" && (
          <DocumentosProveedor proveedorId={proveedor.id} puedeEditar={esAdministrador} />
        )}
        {pestana === "evaluaciones" && (
          <EvaluacionesProveedor proveedorId={proveedor.id} puedeRegistrar={puedeRegistrar} />
        )}
        {pestana === "incidentes" && (
          <IncidentesProveedor proveedorId={proveedor.id} puedeRegistrar={puedeRegistrar} />
        )}
        {pestana === "observaciones" && (
          <ObservacionesProveedor proveedorId={proveedor.id} puedeRegistrar={puedeRegistrar} />
        )}
      </div>
    </section>
  );
}

function PanelDatos({ proveedor }: { proveedor: ProveedorDetalle }) {
  return (
    <dl className="datos">
      <div>
        <dt>NIT</dt>
        <dd>{proveedor.nit}</dd>
      </div>
      <div>
        <dt>Tipo</dt>
        <dd>{ETIQUETA_TIPO[proveedor.tipo]}</dd>
      </div>
      <div>
        <dt>Ciudad</dt>
        <dd>{proveedor.ciudad}</dd>
      </div>
      <div>
        <dt>Contacto</dt>
        <dd>{proveedor.contacto_nombre || "Sin registrar"}</dd>
      </div>
      <div>
        <dt>Correo</dt>
        <dd>
          {proveedor.contacto_correo ? (
            <a href={`mailto:${proveedor.contacto_correo}`}>{proveedor.contacto_correo}</a>
          ) : (
            "Sin registrar"
          )}
        </dd>
      </div>
      <div>
        <dt>Teléfono</dt>
        <dd>{proveedor.contacto_telefono || "Sin registrar"}</dd>
      </div>
      <div>
        <dt>Registrado el</dt>
        <dd>{formatearFecha(proveedor.creado_en)}</dd>
      </div>
    </dl>
  );
}
