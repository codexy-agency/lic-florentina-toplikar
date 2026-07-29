/** Iconos del panel.
 *
 *  Existe por dos razones concretas:
 *   1. Antes se usaban glifos de texto (✓ ✕ ⌄ ▲ ▼ +) como iconos. Un glifo cambia
 *      de forma, peso y baseline según la fuente y el sistema operativo, y nunca
 *      alinea con el texto de al lado. Es el detalle que delata un prototipo.
 *   2. Los SVG que sí había estaban dibujados a mano en cada archivo, cada uno con
 *      su strokeWidth. Acá el peso es uno solo y sale de un lugar.
 *
 *  Regla: `size` acompaña al tamaño del texto (14 para cuerpo, 16 para títulos),
 *  y siempre van dentro de un flex con gap-1.5, nunca pegados con un espacio.
 */

type Props = {
  size?: number;
  className?: string;
  /** Solo si el icono aporta significado que el texto no dice. */
  title?: string;
};

function Svg({
  size = 14,
  className,
  title,
  strokeWidth = 2,
  children,
}: Props & { strokeWidth?: number; children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className ?? ""}`}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}

export const IconoCheck = (p: Props) => (
  <Svg {...p}>
    <path d="m4 12.5 5 5L20 6.5" />
  </Svg>
);

export const IconoX = (p: Props) => (
  <Svg {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Svg>
);

export const IconoChevron = (p: Props) => (
  <Svg {...p} strokeWidth={2.2}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);

export const IconoMas = (p: Props) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const IconoSube = (p: Props) => (
  <Svg {...p}>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </Svg>
);

export const IconoBaja = (p: Props) => (
  <Svg {...p}>
    <path d="M12 5v14M19 12l-7 7-7-7" />
  </Svg>
);

export const IconoCopiar = (p: Props) => (
  <Svg {...p} strokeWidth={1.8}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
  </Svg>
);

export const IconoAbrir = (p: Props) => (
  <Svg {...p} strokeWidth={1.8}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
  </Svg>
);
