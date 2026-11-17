import type { ReactNode } from "react";

/**
 * Íconos de tratamientos, dibujados a medida sobre el lenguaje del logo de RS:
 * la muela de trazo redondeado y el rayo. Todos parten de la MISMA muela
 * (grilla de 48, trazo 2.4) y cambian un solo detalle, así se leen como familia.
 *
 * Dos tintas: el trazo usa currentColor y el detalle usa --volt (el rayo).
 */
const MUELA =
  "M16 7c-5.500 0-9 4-9 9.500 0 4 1.700 7 2.600 10.800 1 4.200 1.400 13.700 5.200 13.700 3.400 0 3-9.500 6.200-9.500h6c3.200 0 2.800 9.500 6.200 9.500 3.800 0 4.200-9.500 5.200-13.700.900-3.800 2.600-6.800 2.600-10.800C41 11 37.500 7 32 7c-3.400 0-5.300 1.800-8 1.800S19.400 7 16 7Z";

export type TratamientoId =
  | "carillas"
  | "blanqueamiento"
  | "limpieza"
  | "ortodoncia"
  | "implantes"
  | "protesis"
  | "cirugia"
  | "ninos"
  | "bruxismo"
  | "sensibilidad"
  | "consulta";

const trazo = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
const volt = { ...trazo, fill: "var(--volt, #d4f26a)" };

function Muela({ children, relleno = true }: { children?: ReactNode; relleno?: boolean }) {
  return (
    <>
      {relleno && <path d={MUELA} fill="currentColor" opacity={0.1} />}
      <path d={MUELA} {...trazo} />
      {children}
    </>
  );
}

/** Insignia redonda abajo a la derecha, con un símbolo adentro. */
function Insignia({ children }: { children: ReactNode }) {
  return (
    <>
      <circle cx="36" cy="36" r="9.500" {...volt} />
      {children}
    </>
  );
}

const DIBUJOS: Record<TratamientoId, ReactNode> = {
  // La lámina que cubre la cara visible: media muela en color.
  carillas: (
    <>
      <path d={MUELA} fill="currentColor" opacity={0.1} />
      <path
        d="M24 8.800c2.700 0 4.600-1.800 8-1.800 5.500 0 9 4 9 9.500 0 4-1.700 7-2.600 10.800-1 4.200-1.400 13.700-5.200 13.700-3.400 0-3-9.500-6.200-9.500h-3Z"
        fill="var(--volt, #d4f26a)"
      />
      <path d={MUELA} {...trazo} />
      <path d="M24 9v22.500" {...trazo} />
    </>
  ),
  // Brillos.
  blanqueamiento: (
    <Muela>
      <path d="M37 2.500c.500 3.200 1.800 4.500 5 5-3.200.500-4.500 1.800-5 5-.500-3.200-1.800-4.500-5-5 3.200-.500 4.500-1.800 5-5Z" {...volt} strokeWidth={2} />
      <path d="M17 15.500c.300 2 1.200 2.900 3.200 3.200-2 .300-2.900 1.200-3.200 3.200-.300-2-1.200-2.900-3.200-3.200 2-.300 2.900-1.200 3.200-3.200Z" fill="currentColor" />
    </Muela>
  ),
  // Control al día.
  limpieza: (
    <Muela>
      <Insignia>
        <path d="m31.800 36.200 3 3 5.400-5.800" {...trazo} />
      </Insignia>
    </Muela>
  ),
  // Bracket y arco.
  ortodoncia: (
    <Muela>
      <path d="M2.500 20h13.500M32 20h13.500" {...trazo} />
      <rect x="17.500" y="14.500" width="13" height="11" rx="3" {...volt} />
      <path d="M21.500 20h5" {...trazo} />
    </Muela>
  ),
  // Corona arriba, tornillo abajo.
  implantes: (
    <>
      <path
        d="M16 5c-5 0-8.500 3.300-8.500 8 0 4.200 2.300 7.500 6 9h21c3.700-1.500 6-4.800 6-9 0-4.700-3.500-8-8.500-8-3.300 0-5.300 1.600-8 1.600S19.300 5 16 5Z"
        fill="currentColor"
        opacity={0.1}
      />
      <path
        d="M16 5c-5 0-8.500 3.300-8.500 8 0 4.200 2.300 7.500 6 9h21c3.700-1.500 6-4.800 6-9 0-4.700-3.500-8-8.500-8-3.300 0-5.300 1.600-8 1.600S19.300 5 16 5Z"
        {...trazo}
      />
      <path d="M19 22h10l-1.500 17.500a3.500 3.500 0 0 1-7 0Z" {...volt} />
      <path d="M18.500 28h11M19 33.500h10" {...trazo} />
    </>
  ),
  // Puente de tres piezas.
  protesis: (
    <>
      <path d="M4 30v-9a6.500 6.500 0 0 1 13 0v9M17.500 30V17.500a6.500 6.500 0 0 1 13 0V30M31 30v-9a6.500 6.500 0 0 1 13 0v9" fill="none" />
      <path d="M17.500 30V17.500a6.500 6.500 0 0 1 13 0V30Z" {...volt} />
      <path d="M4.500 30v-8.500a6.500 6.500 0 0 1 13 0V30M30.500 30v-8.500a6.500 6.500 0 0 1 13 0V30" {...trazo} />
      <path d="M2.500 30h43" {...trazo} />
      <path d="M11 30v8M24 30v10M37 30v8" {...trazo} />
    </>
  ),
  // La pieza que sale.
  cirugia: (
    <Muela>
      <Insignia>
        <path d="M36 41v-9.500M32 35l4-4 4 4" {...trazo} />
      </Insignia>
    </Muela>
  ),
  // Muela con carita.
  ninos: (
    <Muela>
      <path d="M18 17.500h.010M30 17.500h.010" {...trazo} strokeWidth={3.400} />
      <path d="M19 23c1.400 1.800 3 2.600 5 2.600s3.600-.800 5-2.600" {...trazo} />
      <path d="M40 2.500v6M37 5.500h6" stroke="var(--volt, #d4f26a)" strokeWidth={2.800} strokeLinecap="round" />
    </Muela>
  ),
  // Presión de los dos lados.
  bruxismo: (
    <Muela>
      <path d="m3 9 3.500 3L3 15l3.500 3M45 9l-3.500 3 3.500 3-3.500 3" {...trazo} stroke="currentColor" />
      <path d="M14.500 18.500 19 15l4.500 3.500L28 15l5.500 3.500" {...trazo} stroke="var(--volt, #d4f26a)" strokeWidth={3} />
    </Muela>
  ),
  // Frío.
  sensibilidad: (
    <Muela>
      <Insignia>
        <path d="M36 30.500v11M31.300 33.300l9.400 5.400M40.700 33.300l-9.400 5.400" {...trazo} strokeWidth={2} />
      </Insignia>
    </Muela>
  ),
  // Primera consulta: la muela con el rayo del logo.
  consulta: (
    <Muela>
      <path d="M38.500 1.500 31 12h5l-1.500 8.500L42 10h-5Z" {...volt} strokeWidth={2} />
    </Muela>
  ),
};

export function IconoTratamiento({ id, className }: { id: TratamientoId; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" width="48" height="48" aria-hidden focusable="false">
      {DIBUJOS[id]}
    </svg>
  );
}
