// Decorative botanical SVGs — leafy branches and a winding vine.
// All purely decorative (aria-hidden) and pointer-events-none via parent.

type LeafProps = { cx: number; cy: number; r?: number; rot?: number };
function VeinLeaf({ cx, cy, r = 14, rot = 0 }: LeafProps) {
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${rot})`}>
      <path
        d={`M0 ${-r}C${r * 0.85} ${-r * 0.5} ${r * 0.85} ${r * 0.5} 0 ${r}C${-r * 0.85} ${r * 0.5} ${-r * 0.85} ${-r * 0.5} 0 ${-r}Z`}
        fill="currentColor"
        fillOpacity="0.10"
        stroke="currentColor"
        strokeWidth="0.9"
      />
      <path d={`M0 ${-r}V${r}`} stroke="currentColor" strokeWidth="0.7" />
    </g>
  );
}

/** A leafy branch that grows in from a side. flip horizontally with `flip`. */
export function Branch({
  className = "",
  flip = false,
}: {
  className?: string;
  flip?: boolean;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 240 160"
      fill="none"
      aria-hidden="true"
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      {/* main stem */}
      <path
        d="M0 80C50 78 90 70 120 56C150 42 180 30 240 24"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {/* small offshoots */}
      <path d="M70 73C82 60 92 52 104 50" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M120 56C128 72 132 86 130 100" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M180 30C190 44 196 56 196 70" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      {/* leaves */}
      <VeinLeaf cx={104} cy={48} r={15} rot={-35} />
      <VeinLeaf cx={130} cy={104} r={16} rot={20} />
      <VeinLeaf cx={196} cy={74} r={15} rot={10} />
      <VeinLeaf cx={150} cy={42} r={13} rot={-55} />
      <VeinLeaf cx={232} cy={24} r={14} rot={-40} />
      <VeinLeaf cx={58} cy={76} r={11} rot={-20} />
    </svg>
  );
}

/** Enredadera horizontal que conecta los pasos del proceso (desktop).
 *  El tallo se dibuja con el scroll (.vine-path) y las hojas brotan a lo largo. */
export function VineConnectorH({ className = "" }: { className?: string }) {
  const leaves = [
    { x: 95, s: -1 }, { x: 225, s: 1 }, { x: 340, s: -1 },
    { x: 475, s: 1 }, { x: 595, s: -1 }, { x: 715, s: 1 },
    { x: 855, s: -1 }, { x: 975, s: 1 }, { x: 1105, s: -1 },
  ];
  return (
    <svg
      className={className}
      viewBox="0 0 1200 80"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        className="vine-path"
        pathLength={1400}
        d="M0 40C80 32 130 32 200 40S330 48 400 40 540 32 600 40 740 48 800 40 940 32 1000 40 1140 46 1200 40"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {leaves.map(({ x, s }) => (
        <g key={x} transform={`translate(${x} 40) scale(1 ${s})`}>
          <path
            d="M0 0C5 -10 15 -17 26 -15C21 -5 11 1 0 0Z"
            fill="currentColor"
            fillOpacity="0.16"
            stroke="currentColor"
            strokeWidth="1.1"
          />
        </g>
      ))}
    </svg>
  );
}

/** Variante vertical de la enredadera conectora (mobile). */
export function VineConnectorV({ className = "" }: { className?: string }) {
  const leaves = [
    { y: 90, s: -1 }, { y: 210, s: 1 }, { y: 330, s: -1 },
    { y: 460, s: 1 }, { y: 580, s: -1 }, { y: 700, s: 1 },
    { y: 820, s: -1 },
  ];
  return (
    <svg
      className={className}
      viewBox="0 0 80 900"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        className="vine-path"
        pathLength={1400}
        d="M40 0C18 60 18 120 40 180S62 300 40 360 18 480 40 540 62 660 40 720 24 840 40 900"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {leaves.map(({ y, s }) => (
        <g key={y} transform={`translate(40 ${y}) scale(${s} 1)`}>
          <path
            d="M0 0C-10 5 -17 15 -15 26C-5 21 1 11 0 0Z"
            fill="currentColor"
            fillOpacity="0.16"
            stroke="currentColor"
            strokeWidth="1.1"
          />
        </g>
      ))}
    </svg>
  );
}

/** A tall winding vine with leaves — used to connect cards. */
export function Vine({ className = "", draw = false }: { className?: string; draw?: boolean }) {
  return (
    <svg
      className={className}
      viewBox="0 0 80 600"
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <path
        className={draw ? "vine-path" : undefined}
        d="M40 0C20 60 60 110 40 170C20 230 60 280 40 340C20 400 60 450 40 510C28 548 36 580 40 600"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <VeinLeaf cx={30} cy={70} r={16} rot={-40} />
      <VeinLeaf cx={54} cy={150} r={15} rot={35} />
      <VeinLeaf cx={28} cy={250} r={16} rot={-30} />
      <VeinLeaf cx={56} cy={330} r={15} rot={40} />
      <VeinLeaf cx={28} cy={430} r={16} rot={-35} />
      <VeinLeaf cx={54} cy={520} r={14} rot={30} />
    </svg>
  );
}
