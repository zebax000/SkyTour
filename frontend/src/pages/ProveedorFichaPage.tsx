import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { proveedoresApi } from "../api/proveedores";
import { useAuth } from "../auth/useAuth";
import { InsigniaEstado, InsigniaVigencia } from "../proveedores/Insignias";
import {
  ETIQUETA_ESTADO,
  ETIQUETA_TIPO,
  estadosPermitidos,
  formatearFecha,
  formatearValor,
  type EstadoProveedor,
  type ProveedorDetalle,
} from "../proveedores/tipos";

type Pestana = "datos" | "servicios" | "cobertura";

const PESTANAS: { id: Pestana; etiqueta: string }[] = [
  { id: "datos", etiqueta: "Datos" },
  { id: "servicios", etiqueta: "Servicios y tarifas" },
  { id: "cobertura", etiqueta: "Cobertura" },
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
          {usuario.rol === "administrador" && (
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
        {pestana === "servicios" && <PanelServicios proveedor={proveedor} />}
        {pestana === "cobertura" && <PanelCobertura proveedor={proveedor} />}
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

function PanelServicios({ proveedor }: { proveedor: ProveedorDetalle }) {
  if (proveedor.servicios.length === 0) {
    return <p className="ayuda">Este proveedor aún no tiene servicios registrados.</p>;
  }
  return (
    <div>
      {proveedor.servicios.map((servicio) => {
        // La tarifa más reciente primero; las anteriores quedan como historial
        const tarifas = [...servicio.tarifas].sort((a, b) => b.vigente_desde.localeCompare(a.vigente_desde));
        return (
          <article key={servicio.id} className="servicio">
            <h2>{servicio.nombre}</h2>
            {servicio.descripcion && <p>{servicio.descripcion}</p>}
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

function PanelCobertura({ proveedor }: { proveedor: ProveedorDetalle }) {
  if (proveedor.zonas.length === 0) {
    return <p className="ayuda">Este proveedor aún no tiene zonas de cobertura registradas.</p>;
  }
  return (
    <ul className="zonas">
      {proveedor.zonas.map((z) => (
        <li key={z.id}>{z.ciudad_o_region}</li>
      ))}
    </ul>
  );
}
