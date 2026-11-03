import { Route, Routes } from "react-router-dom";

import { Layout } from "./components/Layout";
import { RequireAuth } from "./components/RequireAuth";
import { RequireRole } from "./components/RequireRole";
import { ComparadorPage } from "./pages/ComparadorPage";
import { CuentaPage } from "./pages/CuentaPage";
import { DocumentosPage } from "./pages/DocumentosPage";
import { EvaluacionesPage } from "./pages/EvaluacionesPage";
import { IncidentesPage } from "./pages/IncidentesPage";
import { InicioPage } from "./pages/InicioPage";
import { LoginPage } from "./pages/LoginPage";
import { NoEncontradaPage } from "./pages/NoEncontradaPage";
<<<<<<< HEAD
import { OlvideContrasenaPage } from "./pages/OlvideContrasenaPage";
=======
>>>>>>> origin/main
import { ProveedorEditarPage } from "./pages/ProveedorEditarPage";
import { ProveedorFichaPage } from "./pages/ProveedorFichaPage";
import { ProveedorNuevoPage } from "./pages/ProveedorNuevoPage";
import { ProveedoresPage } from "./pages/ProveedoresPage";
import { ReportesPage } from "./pages/ReportesPage";
<<<<<<< HEAD
import { RestablecerContrasenaPage } from "./pages/RestablecerContrasenaPage";
import { SinPermisoPage } from "./pages/SinPermisoPage";
import { UsuariosPage } from "./pages/UsuariosPage";
=======
import { SinPermisoPage } from "./pages/SinPermisoPage";
import { UsuariosPage } from "./pages/UsuariosPage";
import { OlvideContrasenaPage } from './pages/OlvideContrasenaPage';
import { RestablecerContrasenaPage } from './pages/RestablecerContrasenaPage';
>>>>>>> origin/main

export default function App() {
  return (
    <Routes>
<<<<<<< HEAD
=======
      {/* --- RUTAS PÚBLICAS --- */}
>>>>>>> origin/main
      <Route path="/login" element={<LoginPage />} />
      <Route path="/olvide-contrasena" element={<OlvideContrasenaPage />} />
      <Route path="/restablecer-contrasena" element={<RestablecerContrasenaPage />} />

<<<<<<< HEAD
=======
      {/* --- RUTAS PRIVADAS --- */}
>>>>>>> origin/main
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route index element={<InicioPage />} />

          <Route path="proveedores" element={<ProveedoresPage />} />
          <Route element={<RequireRole roles={["administrador"]} />}>
            <Route path="proveedores/nuevo" element={<ProveedorNuevoPage />} />
            <Route path="proveedores/:id/editar" element={<ProveedorEditarPage />} />
          </Route>
          <Route path="proveedores/:id" element={<ProveedorFichaPage />} />

          <Route path="documentos" element={<DocumentosPage />} />
          <Route path="evaluaciones" element={<EvaluacionesPage />} />
          <Route path="incidentes" element={<IncidentesPage />} />
          <Route path="reportes" element={<ReportesPage />} />
          <Route path="comparador" element={<ComparadorPage />} />
          <Route path="cuenta" element={<CuentaPage />} />

          <Route element={<RequireRole roles={["administrador"]} />}>
            <Route path="usuarios" element={<UsuariosPage />} />
          </Route>

          <Route path="sin-permiso" element={<SinPermisoPage />} />
          <Route path="*" element={<NoEncontradaPage />} />
        </Route>
      </Route>
    </Routes>
  );
<<<<<<< HEAD
}
=======
}
>>>>>>> origin/main
