"use client";

import { useEffect, useRef, useState } from "react";

function nowLocal() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * Campo de fecha/hora para la nota que por defecto es SIEMPRE "ahora" al guardar:
 * se refresca al volver a la pestaña, al recuperar foco y cada 30 s, así no queda
 * desfasado si abrís el panel y cargás la nota un rato después. Igual permite
 * fijar una fecha a mano (p. ej. para anotar una sesión pasada).
 */
export function FechaNotaAuto({ name }: { name: string }) {
  const [value, setValue] = useState(nowLocal);
  const touched = useRef(false);

  useEffect(() => {
    const refresh = () => {
      if (!touched.current) setValue(nowLocal());
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const id = setInterval(refresh, 30_000);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      clearInterval(id);
    };
  }, []);

  return (
    <input
      id="nota-fecha"
      type="datetime-local"
      name={name}
      value={value}
      onChange={(e) => {
        touched.current = true;
        setValue(e.target.value);
      }}
      className="admin-input px-3 py-2 text-[13px]"
    />
  );
}
