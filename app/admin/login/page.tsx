import { getMarca } from "@/lib/store";
import { iniciales, nombreMostrable, partirNombre } from "@/lib/marca";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const marca = await getMarca();
  const nombre = nombreMostrable(marca);
  const [pila, apellido] = partirNombre(nombre);

  // Pie del acceso: título + nombre + matrícula, salteando lo que esté vacío.
  const pie = ["Acceso privado", [marca.titulo, nombre].filter(Boolean).join(" "), marca.matricula]
    .filter(Boolean)
    .join(" · ");

  return <LoginForm marca={{ pila, apellido, iniciales: iniciales(nombre), pie }} />;
}
