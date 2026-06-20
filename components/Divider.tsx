export function Divider() {
  return (
    <div className="mx-auto max-w-7xl px-5 md:px-10" aria-hidden="true">
      <div className="relative">
        {/* Línea principal */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[rgba(43,39,34,0.18)] to-transparent" />
        {/* Sombra suave proyectada debajo */}
        <div className="absolute inset-x-[6%] top-px h-7 bg-gradient-to-b from-[rgba(43,39,34,0.07)] to-transparent [mask-image:linear-gradient(to_right,transparent,black_25%,black_75%,transparent)]" />
        {/* Ornamento botánico central sobre la línea */}
        <span className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 bg-cream px-5 text-sage">
          <span className="h-px w-6 bg-sage/40" />
          <Leaf className="h-4 w-4" />
          <span className="h-px w-6 bg-sage/40" />
        </span>
      </div>
    </div>
  );
}

export function Leaf({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M50 6C26 22 14 44 14 64c0 18 14 30 36 30s36-12 36-30C86 44 74 22 50 6Z"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path
        d="M50 12v78M50 34c-8 4-16 10-22 18M50 50c8 4 16 10 22 18M50 60c-8 4-14 9-19 16M50 44c7 3 13 7 18 13"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Sprig({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M60 200V20" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      {[40, 70, 100, 130, 160].map((y, i) => (
        <g key={y}>
          <path
            d={`M60 ${y}C40 ${y - 14} 26 ${y - 6} 20 ${y + 8}C36 ${y + 12} 50 ${y + 4} 60 ${y}Z`}
            stroke="currentColor"
            strokeWidth="0.8"
            opacity={0.9 - i * 0.06}
          />
          <path
            d={`M60 ${y - 18}C80 ${y - 32} 94 ${y - 24} 100 ${y - 10}C84 ${y - 6} 70 ${y - 14} 60 ${y - 18}Z`}
            stroke="currentColor"
            strokeWidth="0.8"
            opacity={0.9 - i * 0.06}
          />
        </g>
      ))}
    </svg>
  );
}
