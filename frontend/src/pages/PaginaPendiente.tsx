interface Props {
  titulo: string;
  fase: string;
  descripcion: string;
}

export function PaginaPendiente({ titulo, fase, descripcion }: Props) {
  return (
    <section>
      <h1>{titulo}</h1>
      <div className="tarjeta">
        <p className="etiqueta-fase">{fase}</p>
        <p>{descripcion}</p>
        <p className="ayuda">Esta pantalla aún está en construcción.</p>
      </div>
    </section>
  );
}
