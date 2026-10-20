import { Route, Routes } from "react-router-dom";

import { Layout } from "./components/Layout";
import { RequireAuth } from "./components/RequireAuth";
import { RequireRole } from "./components/RequireRole";
import { InicioPage } from "./pages/InicioPage";
import { LoginPage } from "./pages/LoginPage";
import { NoEncontradaPage } from "./pages/NoEncontradaPage";
import { PaginaPendiente } from "./pages/PaginaPendiente";
import { SinPermisoPage } from "./pages/SinPermisoPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route index element={<InicioPage />} />

          {/* TODO(frontend): cada página pendiente se reemplaza en la fase indicada */}
          <Route
            path="proveedores"
            element={<PaginaPendiente titulo="Proveedores" fase="Fase 4" descripcion="Lista con búsqueda y filtros, ficha con pestañas y alta por pasos." />}
          />
          <Route
            path="documentos"
            element={<PaginaPendiente titulo="Documentos y vigencias" fase="Fase 5" descripcion="Documentos con semáforo: vigente, por vencer o vencido." />}
          />
          <Route
            path="evaluaciones"
            element={<PaginaPendiente titulo="Evaluaciones" fase="Fase 6" descripcion="Calificación de 1 a 5 en calidad, puntualidad, cumplimiento y precio." />}
          />
          <Route
            path="incidentes"
            element={<PaginaPendiente titulo="Incidentes" fase="Fase 6" descripcion="Incidentes e incumplimientos con fecha y gravedad, y lista de atención." />}
          />
          <Route
            path="comparador"
            element={<PaginaPendiente titulo="Comparador" fase="Fase 8" descripcion="De 2 a 4 proveedores lado a lado." />}
          />
          <Route
            path="reportes"
            element={<PaginaPendiente titulo="Reportes" fase="Fase 8" descripcion="Ranking de proveedores por calificación y por riesgo." />}
          />

          <Route element={<RequireRole roles={["administrador"]} />}>
            <Route
              path="usuarios"
              element={<PaginaPendiente titulo="Usuarios" fase="Después del MVP" descripcion="Administración de usuarios desde la interfaz (solo administrador)." />}
            />
          </Route>

          <Route path="sin-permiso" element={<SinPermisoPage />} />
          <Route path="*" element={<NoEncontradaPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
