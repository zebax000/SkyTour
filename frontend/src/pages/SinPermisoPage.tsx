import { Link } from "react-router-dom";

export function SinPermisoPage() {
  return (
    <section>
      <h1>Sin permiso</h1>
      <p>Tu rol no tiene acceso a esta pantalla.</p>
      <Link to="/">Volver al inicio</Link>
    </section>
  );
}
