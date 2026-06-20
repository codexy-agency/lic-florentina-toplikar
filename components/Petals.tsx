// Pétalos de cerezo cayendo — capa decorativa sutil sobre el hero.
// Cada pétalo: el wrapper cae (translateY), el inner se balancea (sway + rotate).
// Solo transform/opacity → corre en el compositor. Respeta reduced-motion vía CSS.

// Pétalos blanco-rosado (como los reales de sakura) para contrastar sobre flores y velo.
const PETALS = [
  { left: 6, size: 14, dur: 11, delay: 0, op: 0.92, hue: "#FBEAF0" },
  { left: 14, size: 10, dur: 14, delay: 4, op: 0.8, hue: "#FFFFFF" },
  { left: 22, size: 12, dur: 9.5, delay: 1.5, op: 0.9, hue: "#FBEAF0" },
  { left: 31, size: 8, dur: 16, delay: 6, op: 0.7, hue: "#FFFFFF" },
  { left: 39, size: 15, dur: 12, delay: 2.5, op: 0.95, hue: "#FDF2F6" },
  { left: 47, size: 9, dur: 13.5, delay: 8, op: 0.75, hue: "#FFFFFF" },
  { left: 55, size: 13, dur: 10.5, delay: 0.8, op: 0.9, hue: "#FBEAF0" },
  { left: 63, size: 11, dur: 15, delay: 5, op: 0.82, hue: "#FFFFFF" },
  { left: 71, size: 14, dur: 11.5, delay: 3, op: 0.92, hue: "#FDF2F6" },
  { left: 78, size: 9, dur: 14.5, delay: 7.5, op: 0.75, hue: "#FFFFFF" },
  { left: 85, size: 12, dur: 9, delay: 1.2, op: 0.9, hue: "#FBEAF0" },
  { left: 92, size: 10, dur: 13, delay: 4.5, op: 0.8, hue: "#FFFFFF" },
  { left: 18, size: 8, dur: 17, delay: 9, op: 0.65, hue: "#FFFFFF" },
  { left: 50, size: 7, dur: 18, delay: 11, op: 0.6, hue: "#FDF2F6" },
  { left: 67, size: 8, dur: 16.5, delay: 10, op: 0.65, hue: "#FFFFFF" },
  { left: 35, size: 11, dur: 12.5, delay: 6.5, op: 0.85, hue: "#FBEAF0" },
];

export function Petals() {
  return (
    <div aria-hidden className="petals pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {PETALS.map((p, i) => (
        <span
          key={i}
          className="petal-fall absolute top-0"
          style={{
            left: `${p.left}%`,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
          }}
        >
          <span
            className="petal-sway block"
            style={{ animationDuration: `${(p.dur / 2.2).toFixed(2)}s` }}
          >
            <span
              className="block"
              style={{
                width: `${p.size}px`,
                height: `${p.size * 1.2}px`,
                opacity: p.op,
                background: `radial-gradient(130% 130% at 32% 18%, #ffffff, ${p.hue} 70%, #F0C9DA)`,
                borderRadius: "100% 0 60% 55% / 100% 0 55% 60%",
                boxShadow: "0 1px 3px rgba(58,49,55,0.28)",
                filter: p.size < 9 ? "blur(0.3px)" : "none",
              }}
            />
          </span>
        </span>
      ))}
    </div>
  );
}
