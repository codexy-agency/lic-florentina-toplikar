import type { Metadata } from "next";
import { CODEXY, PALETA_CODEXY } from "@/lib/codexy";

/** Sitio comercial de CODEXY.
 *
 *  Vive bajo /plataforma y sólo se llega por la reescritura que hace proxy.ts
 *  cuando el host es el dominio de la plataforma. Nunca lleva header de tenant:
 *  si una página de acá intentara leer datos de un consultorio, el store lanza.
 *
 *  Tiene identidad PROPIA, distinta de la de los consultorios, y eso es
 *  deliberado. Las paletas de los clientes son cálidas y suaves porque le hablan
 *  a un paciente que está por pedir ayuda. Esta le habla a un profesional que
 *  evalúa una herramienta de trabajo: grafito y cobre, seria y precisa.
 *
 *  Los colores salen de PALETA_CODEXY (lib/codexy.ts): cambiar la identidad es
 *  cambiar ese objeto, no recorrer la página.
 */

export const metadata: Metadata = {
  title: {
    default: `${CODEXY.nombre} · ${CODEXY.bajada}`,
    template: `%s | ${CODEXY.nombre}`,
  },
  description:
    "Tu sitio, tu agenda online y la historia clínica de tus pacientes, en un solo lugar. Hecho para consultorios de psicología.",
  robots: { index: true, follow: true },
};

const css = `
.codexy {
  --grafito: ${PALETA_CODEXY.grafito};
  --tinta: ${PALETA_CODEXY.tinta};
  --tinta-2: ${PALETA_CODEXY.tintaSuave};
  --cobre: ${PALETA_CODEXY.cobre};
  --cobre-ink: ${PALETA_CODEXY.cobreProfundo};
  --cal: ${PALETA_CODEXY.cal};
  --cal-2: ${PALETA_CODEXY.calSuave};
  --linea: ${PALETA_CODEXY.linea};
  --linea-fuerte: ${PALETA_CODEXY.lineaFuerte};
  --apagado: ${PALETA_CODEXY.apagado};

  background: var(--cal);
  color: var(--grafito);
  font-family: var(--font-sans), system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* Un solo primario en toda la página, igual que en el panel. */
.cx-btn {
  background: var(--tinta);
  color: var(--cal);
  border-radius: 999px;
  font-weight: 550;
  transition: transform .18s cubic-bezier(.32,.72,0,1), box-shadow .18s ease;
}
.cx-btn:hover { transform: translateY(-1px); box-shadow: 0 12px 28px -14px rgba(27,26,24,.6); }
.cx-btn-2 {
  background: transparent;
  color: var(--grafito);
  border: 1px solid var(--linea-fuerte);
  border-radius: 999px;
  font-weight: 550;
  transition: background .18s ease;
}
.cx-btn-2:hover { background: var(--cal-2); }

.cx-card { background: #fff; border: 1px solid var(--linea); border-radius: 14px; }
.cx-rotulo {
  font-size: 11.5px;
  letter-spacing: .16em;
  text-transform: uppercase;
  color: var(--apagado);
  font-weight: 500;
}

.codexy :is(a, button, summary):focus-visible {
  outline: 2px solid var(--cobre);
  outline-offset: 3px;
  border-radius: inherit;
}

@media (prefers-reduced-motion: reduce) {
  .codexy *, .codexy *::before, .codexy *::after {
    animation-duration: .01ms !important;
    transition-duration: .01ms !important;
  }
}
`;

export default function PlataformaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="codexy min-h-[100dvh]">{children}</div>
    </>
  );
}
