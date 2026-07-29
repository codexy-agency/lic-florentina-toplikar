"use client";

import { useEffect, useState } from "react";
import { IconoAbrir, IconoCheck, IconoCopiar } from "@/components/iconos";

/** Los dos links que el psicólogo comparte: su sitio y la reserva directa.
 *  Se arman en el cliente a partir del host real, así funcionan igual en el
 *  subdominio de la plataforma y en un dominio propio. */
export function LinksDelSitio({ dominio }: { dominio?: string }) {
  const [base, setBase] = useState("");
  const [copiado, setCopiado] = useState<string | null>(null);

  useEffect(() => {
    setBase(dominio ? `https://${dominio}` : window.location.origin);
  }, [dominio]);

  async function copiar(url: string, id: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(id);
      setTimeout(() => setCopiado(null), 1800);
    } catch {
      /* si el navegador lo bloquea, el link igual está a la vista */
    }
  }

  const links = [
    {
      id: "sitio",
      titulo: "Tu página",
      para: "Para tu bio de Instagram, tu firma de mail o tus tarjetas.",
      url: base,
      icono: (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
        </>
      ),
    },
    {
      id: "reservar",
      titulo: "Reservar turno",
      para: "Mandáselo a quien te escribe y reserva solo, sin ida y vuelta.",
      url: base ? `${base}/reservar` : "",
      icono: (
        <>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4" />
        </>
      ),
      destacado: true,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {links.map((l) => (
        <div
          key={l.id}
          className={`rounded-2xl border p-4 ${
            l.destacado
              ? "border-[var(--a-accent)]/35 bg-[var(--a-accent-soft)]/40"
              : "border-[var(--a-border)] bg-[var(--a-surface)]"
          }`}
        >
          <div className="flex items-center gap-2 text-[var(--a-accent-ink)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              {l.icono}
            </svg>
            <p className="text-[13.5px] font-semibold">{l.titulo}</p>
          </div>
          <p className="admin-muted mt-1 text-[12.5px] leading-relaxed">{l.para}</p>
          <p className="mt-2.5 truncate rounded-lg bg-[var(--a-surface-2)] px-2.5 py-1.5 font-mono text-[12px] text-[var(--a-text-2)]">
            {l.url || "…"}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => copiar(l.url, l.id)}
              disabled={!l.url}
              className="admin-btn-ghost inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium disabled:opacity-40"
            >
              {copiado === l.id ? <IconoCheck size={13} /> : <IconoCopiar size={13} />}
              {copiado === l.id ? "Copiado" : "Copiar link"}
            </button>
            {l.url && (
              <a
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="admin-faint inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors hover:text-[var(--a-text)]"
              >
                <IconoAbrir size={13} /> Abrir
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
