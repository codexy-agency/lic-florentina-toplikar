/** Contenedor del panel: fondo greige profundo + ancho máximo consistente. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <div className="mx-auto max-w-6xl px-4 py-7 md:px-8 md:py-12">
        {children}
      </div>
    </div>
  );
}
