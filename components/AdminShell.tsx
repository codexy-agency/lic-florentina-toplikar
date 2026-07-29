import { AdminSidebar } from "./AdminSidebar";
import { sesionValida } from "@/lib/session";
import { getMarca } from "@/lib/store";
import { iniciales, nombreMostrable, partirNombre } from "@/lib/marca";

/** Layout del panel: sidebar fijo a la izquierda (desktop) / drawer (mobile),
 *  y el contenido aprovechando el ancho. */
export async function AdminShell({ children }: { children: React.ReactNode }) {
  const [sesion, marca] = await Promise.all([sesionValida(), getMarca()]);
  const nombre = nombreMostrable(marca);
  const [pila, apellido] = partirNombre(nombre);

  return (
    <div className="admin-shell md:pl-[252px]">
      <AdminSidebar marca={{ pila, apellido, iniciales: iniciales(nombre) }} />
      {/* Sesión de soporte: el cliente TIENE que ver que alguien de Codexy está
          adentro de su consultorio. Nunca es silencioso. */}
      {sesion?.soporte && (
        <div className="sticky top-0 z-30 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-[var(--a-accent-ink)] px-4 py-2 text-center text-[13px] font-medium text-white">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          </svg>
          Soporte de Codexy conectado a este consultorio.
          <span className="font-normal opacity-85">Sin acceso a las historias clínicas · queda registrado en Equipo.</span>
        </div>
      )}
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 md:px-10 md:pt-12">
        {children}
      </main>
    </div>
  );
}
