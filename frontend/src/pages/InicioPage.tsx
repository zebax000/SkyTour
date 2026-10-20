import { ETIQUETA_ROL } from "../auth/tipos";
import { useAuth } from "../auth/useAuth";

const PERMISOS = {
  administrador: "Gestionas usuarios y roles, creas y editas proveedores, tarifas y documentos, registras evaluaciones y consultas reportes y riesgo.",
  evaluador: "Registras evaluaciones, incidentes, incumplimientos y observaciones, gestionas el seguimiento y consultas proveedores y riesgo.",
  consultor: "Tienes acceso de solo lectura: proveedores, Dashboard, comparador, reportes y riesgo.",
} as const;

export function InicioPage() {
  const { usuario } = useAuth();
  if (!usuario) return null;

  return (
    <section>
      <h1>Hola, {usuario.nombre}</h1>
      <p>
        Entraste como <strong>{ETIQUETA_ROL[usuario.rol]}</strong>. {PERMISOS[usuario.rol]}
      </p>
      <div className="tarjeta">
        <h2>Estado del proyecto</h2>
        <p>
          El acceso por roles ya funciona. Las demás pantallas del menú se construyen en las fases siguientes y
          mientras tanto muestran un aviso.
        </p>
      </div>
    </section>
  );
}
