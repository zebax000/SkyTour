import { formatearPuntaje } from "./tipos";
import "./desempeno.css";

export function Puntaje({ valor, pequeno = false }: { valor: number | null; pequeno?: boolean }) {
  if (valor === null) return <span className="puntaje sin-puntaje">Sin evaluaciones</span>;
  return (
    <span className={`puntaje${pequeno ? " pequeno" : ""}`} aria-label={`${formatearPuntaje(valor)} de 5`}>
      <span aria-hidden="true">★ </span>
      {formatearPuntaje(valor)}
      <span className="de-cinco"> / 5</span>
    </span>
  );
}
