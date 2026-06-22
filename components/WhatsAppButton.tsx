"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Botón de WhatsApp con plantillas según la intención (recordatorio, pago,
 * saludo). Arma un link wa.me con el mensaje prearmado y lo abre en una pestaña
 * nueva — la doctora revisa y envía. No envía nada solo.
 *
 * `phone` es el contacto crudo del paciente; si no parece teléfono (p. ej. un
 * email), el botón queda deshabilitado con una aclaración.
 */
export function WhatsAppButton({
  phone,
  nombre,
  proximo,
  variant = "button",
  align = "right",
}: {
  phone: string;
  nombre: string;
  proximo?: { cuando: string; servicio?: string } | null;
  variant?: "button" | "icon";
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const digits = (phone || "").replace(/\D/g, "");
  const esTelefono = digits.length >= 8;
  const first = (nombre || "").trim().split(/\s+/)[0] || "";

  const link = (text?: string) =>
    `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

  const plantillas: { key: string; label: string; desc: string; text?: string; icon: string }[] = [
    {
      key: "recordatorio",
      label: "Recordatorio de turno",
      desc: proximo?.cuando ? proximo.cuando : "Próximo turno",
      icon: "🗓️",
      text: proximo?.cuando
        ? `Hola ${first}, ¿cómo estás? Te recuerdo tu turno ${proximo.servicio ? `de ${proximo.servicio} ` : ""}el ${proximo.cuando}. Si necesitás reprogramar, avisame con tiempo. ¡Te espero! 🌿`
        : `Hola ${first}, ¿cómo estás? Te escribo para recordarte tu próximo turno. Si necesitás reprogramar, avisame. ¡Te espero! 🌿`,
    },
    {
      key: "pago",
      label: "Aviso de pago",
      desc: "Recordar/coordinar el pago",
      icon: "💳",
      text: `Hola ${first}, ¿cómo estás? Te escribo por el pago de la sesión. Cuando puedas, coordinamos / te paso los datos. ¡Gracias! 🙂`,
    },
    {
      key: "saludo",
      label: "Saludar",
      desc: "Abrir el chat con un saludo",
      icon: "👋",
      text: `Hola ${first}, ¿cómo estás?`,
    },
    {
      key: "libre",
      label: "Mensaje libre",
      desc: "Abrir el chat en blanco",
      icon: "✍️",
    },
  ];

  const Glyph = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm5.8 14.18c-.24.68-1.42 1.31-1.95 1.35-.5.05-.99.22-3.4-.71-2.87-1.13-4.7-4.06-4.84-4.25-.14-.19-1.16-1.54-1.16-2.94s.73-2.08 1-2.37c.26-.29.57-.36.76-.36h.55c.18 0 .42-.07.64.49.24.57.81 1.97.88 2.11.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.21 1.37.28.14.44.12.6-.07.17-.19.69-.81.88-1.09.18-.28.37-.23.62-.14.25.09 1.6.76 1.87.9.28.14.46.21.53.33.07.12.07.69-.17 1.37Z" />
    </svg>
  );

  // Sin teléfono → botón inerte con aclaración.
  if (!esTelefono) {
    if (variant === "icon") {
      return (
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--a-surface-2)] text-espresso-soft/40"
          title="El contacto no es un número de WhatsApp"
          aria-label="Sin WhatsApp"
        >
          {Glyph}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-[var(--a-surface-2)] px-4 py-2.5 text-[13px] font-medium text-espresso-soft/50" title="El contacto no es un número de WhatsApp">
        {Glyph}
        Sin WhatsApp
      </span>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={
          variant === "icon"
            ? "flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366]/12 text-[#1c7a45] transition-colors hover:bg-[#25D366]/22"
            : "inline-flex items-center gap-2 rounded-full bg-[#25D366]/12 px-4 py-2.5 text-[13px] font-semibold text-[#1c7a45] transition-colors hover:bg-[#25D366]/22"
        }
        aria-label={`Escribir a ${first} por WhatsApp`}
        title={`Escribir a ${first} por WhatsApp`}
      >
        {Glyph}
        {variant === "button" && "WhatsApp"}
        {variant === "button" && (
          <svg className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute z-30 mt-2 w-72 overflow-hidden rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)] shadow-[0_18px_50px_-18px_rgba(58,49,55,0.45)] ${align === "right" ? "right-0" : "left-0"}`}
        >
          <div className="border-b border-[var(--a-border)] px-4 py-2.5">
            <p className="text-[12px] font-semibold text-espresso">Enviar a {first}</p>
            <p className="admin-faint text-[11px]">Se abre WhatsApp con el mensaje listo para revisar.</p>
          </div>
          <ul className="p-1.5">
            {plantillas.map((p) => (
              <li key={p.key}>
                <a
                  href={link(p.text)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  role="menuitem"
                  className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--a-surface-2)]"
                >
                  <span className="mt-0.5 text-[15px] leading-none">{p.icon}</span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-medium text-espresso">{p.label}</span>
                    <span className="admin-muted block truncate text-[12px]">{p.desc}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
