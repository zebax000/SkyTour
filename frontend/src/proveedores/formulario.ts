import type { Moneda, TipoProveedor } from "./tipos";

export interface DatosGenerales {
  nombre: string;
  nit: string;
  tipo: TipoProveedor | "";
  ciudad: string;
  contacto_nombre: string;
  contacto_correo: string;
  contacto_telefono: string;
}

export const DATOS_VACIOS: DatosGenerales = {
  nombre: "",
  nit: "",
  tipo: "",
  ciudad: "",
  contacto_nombre: "",
  contacto_correo: "",
  contacto_telefono: "",
};

export type ErroresDatos = Partial<Record<keyof DatosGenerales, string>>;

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mismas reglas que valida el servidor; aquí se avisa antes para no hacer esperar al usuario
export function validarDatos(d: DatosGenerales): ErroresDatos {
  const e: ErroresDatos = {};
  const nombre = d.nombre.trim();
  if (!nombre) e.nombre = "Escribe el nombre del proveedor.";
  else if (nombre.length > 150) e.nombre = "Máximo 150 caracteres.";

  const nit = d.nit.trim();
  if (!nit) e.nit = "Escribe el NIT.";
  else if (nit.length < 3 || nit.length > 30) e.nit = "El NIT debe tener entre 3 y 30 caracteres.";

  if (!d.tipo) e.tipo = "Elige el tipo de proveedor.";

  const ciudad = d.ciudad.trim();
  if (!ciudad) e.ciudad = "Escribe la ciudad.";
  else if (ciudad.length > 100) e.ciudad = "Máximo 100 caracteres.";

  if (d.contacto_nombre.trim().length > 120) e.contacto_nombre = "Máximo 120 caracteres.";

  const correo = d.contacto_correo.trim();
  if (correo && (correo.length > 255 || !CORREO.test(correo))) e.contacto_correo = "Escribe un correo válido.";

  if (d.contacto_telefono.trim().length > 30) e.contacto_telefono = "Máximo 30 caracteres.";
  return e;
}

export function textoONulo(texto: string): string | null {
  const limpio = texto.trim();
  return limpio === "" ? null : limpio;
}

export interface TarifaForm {
  valor: string;
  moneda: Moneda;
  vigente_desde: string;
  vigente_hasta: string;
}

export interface ServicioForm {
  nombre: string;
  descripcion: string;
  tarifas: TarifaForm[];
}

export function tarifaVacia(): TarifaForm {
  return { valor: "", moneda: "COP", vigente_desde: "", vigente_hasta: "" };
}

export function servicioVacio(): ServicioForm {
  return { nombre: "", descripcion: "", tarifas: [] };
}

const VALOR = /^\d{1,12}(\.\d{1,2})?$/;

// Devuelve los problemas de una tarifa, redactados para ir después de un prefijo ("Servicio 1, tarifa 2: ...")
export function validarTarifa(t: TarifaForm): string[] {
  const problemas: string[] = [];
  if (!VALOR.test(t.valor.trim())) {
    problemas.push("escribe el valor solo con números y sin puntos de miles (ej. 280000 o 280000.50).");
  }
  if (!t.vigente_desde) problemas.push("elige desde cuándo es válida.");
  else if (t.vigente_hasta && t.vigente_hasta < t.vigente_desde) {
    problemas.push("la fecha final no puede ser anterior a la inicial.");
  }
  return problemas;
}

export function validarServicios(servicios: ServicioForm[]): string[] {
  const problemas: string[] = [];
  servicios.forEach((s, i) => {
    const prefijo = `Servicio ${i + 1}`;
    const nombre = s.nombre.trim();
    if (!nombre) problemas.push(`${prefijo}: escribe el nombre.`);
    else if (nombre.length > 150) problemas.push(`${prefijo}: el nombre admite máximo 150 caracteres.`);

    s.tarifas.forEach((t, j) => {
      validarTarifa(t).forEach((p) => problemas.push(`${prefijo}, tarifa ${j + 1}: ${p}`));
    });
  });
  return problemas;
}
