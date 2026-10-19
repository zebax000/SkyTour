import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export default function App() {
  const [estado, setEstado] = useState("comprobando...");

  useEffect(() => {
    fetch(`${API}/health`)
      .then((r) => r.json())
      .then((d) => setEstado(d.status === "ok" ? "API ok" : "error"))
      .catch(() => setEstado("sin conexión"));
  }, []);

  return (
    <main style={{ fontFamily: "sans-serif", padding: 32 }}>
      <h1>SkyTour</h1>
      <p>Estado del backend: {estado}</p>
    </main>
  );
}