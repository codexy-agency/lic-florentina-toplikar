"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export const WHATSAPP_URL =
  "https://wa.me/message/2CMA36A63JD5N1?utm_source=web&utm_medium=cta";

export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "-80px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transitionDelay: `${delay}s`,
        transitionProperty: "opacity, transform, filter",
        transitionDuration: "900ms",
        transitionTimingFunction: "cubic-bezier(0.32,0.72,0,1)",
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(48px)",
        filter: shown ? "blur(0)" : "blur(8px)",
      }}
    >
      {children}
    </div>
  );
}
