import { AdminSidebar } from "./AdminSidebar";

/** Layout del panel: sidebar fijo a la izquierda (desktop) / drawer (mobile),
 *  y el contenido aprovechando el ancho. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell md:pl-[252px]">
      <AdminSidebar />
      <main className="mx-auto w-full max-w-6xl px-5 pb-16 pt-6 md:px-10 md:pt-12">
        {children}
      </main>
    </div>
  );
}
