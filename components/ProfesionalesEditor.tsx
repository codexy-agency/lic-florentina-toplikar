"use client";

import { useState } from "react";
import { guardarProfesionales } from "@/app/admin/profesionales/actions";
import { DeleteConfirm } from "@/components/DeleteConfirm";
import type { Staff, Service } from "@/lib/scheduling/types";

const COLORES = ["#9C5475", "#7c8a6f", "#C9A227", "#6E7BA6", "#B07154"];

/** Lee una imagen, la recorta cuadrada y la achica a `size`px → data URL liviano.
 *  Todo en el navegador: no necesita storage ni servidor. */
function resizeToDataUrl(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no canvas");
        const scale = Math.max(size / img.width, size / img.height); // cover
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("imagen inválida"));
    };
    img.src = url;
  });
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L8 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-4l-1.5-2Z" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  );
}

export function ProfesionalesEditor({
  initial,
  services,
}: {
  initial: Staff[];
  services: Service[];
}) {
  const [rows, setRows] = useState<Staff[]>(initial);
  const [estado, setEstado] = useState<"idle" | "guardando" | "ok" | "error">("idle");
  const [subiendo, setSubiendo] = useState<string | null>(null);

  async function onFile(i: number, id: string, file?: File) {
    if (!file) return;
    setSubiendo(id);
    try {
      const dataUrl = await resizeToDataUrl(file, 256);
      patch(i, { imageUrl: dataUrl });
    } catch {
      alert("No se pudo procesar la imagen. Probá con otra.");
    } finally {
      setSubiendo(null);
    }
  }

  function add() {
    setRows((r) => [
      ...r,
      {
        id: `nuevo-${r.length}-${Date.now()}`,
        nombre: "",
        titulo: "",
        bio: "",
        serviceIds: services.map((s) => s.id),
        color: COLORES[r.length % COLORES.length],
        activo: true,
      },
    ]);
  }
  function patch(i: number, p: Partial<Staff>) {
    setRows((r) => r.map((x, idx) => (idx === i ? { ...x, ...p } : x)));
  }
  function toggleSvc(i: number, svcId: string) {
    setRows((r) =>
      r.map((x, idx) => {
        if (idx !== i) return x;
        const has = x.serviceIds.includes(svcId);
        return {
          ...x,
          serviceIds: has
            ? x.serviceIds.filter((id) => id !== svcId)
            : [...x.serviceIds, svcId],
        };
      })
    );
  }
  function del(i: number) {
    setRows((r) => r.filter((_, idx) => idx !== i));
  }
  async function guardar() {
    setEstado("guardando");
    try {
      await guardarProfesionales(rows);
      setEstado("ok");
      setTimeout(() => setEstado("idle"), 2200);
    } catch {
      setEstado("error");
    }
  }

  const color = (m: Staff) => m.color || "#7c8a6f";

  return (
    <div className="space-y-5">
      {services.length === 0 && (
        <p className="rounded-2xl admin-empty p-5 text-center text-[14px] admin-muted">
          Primero cargá algún servicio para poder asignárselo a cada profesional.
        </p>
      )}

      {rows.map((m, i) => {
        const activos = services.filter((s) => m.serviceIds.includes(s.id)).length;
        return (
          <div
            key={m.id}
            className={`admin-card overflow-hidden p-0 transition-opacity ${m.activo ? "" : "opacity-70"}`}
          >
            {/* ── Cabecera tipo perfil (avatar editable + nombre/título en vivo) ── */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start border-b border-[var(--a-border)] p-5">
              <div className="flex items-start gap-4 min-w-0 flex-1">
              <label className="group/av relative h-16 w-16 shrink-0 cursor-pointer" title="Cambiar foto">
                {m.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.imageUrl}
                    alt={m.nombre || "Profesional"}
                    className="h-16 w-16 rounded-full object-cover ring-2 ring-[var(--a-border-strong)]"
                  />
                ) : (
                  <span
                    className="flex h-16 w-16 items-center justify-center rounded-full text-[22px] font-serif"
                    style={{ backgroundColor: `${color(m)}22`, color: color(m) }}
                  >
                    {(m.nombre.trim()[0] || "?").toUpperCase()}
                  </span>
                )}
                {/* Overlay al pasar el mouse */}
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-espresso/0 opacity-0 transition-all duration-200 group-hover/av:bg-espresso/45 group-hover/av:opacity-100">
                  <CameraIcon className="h-5 w-5 text-cream" />
                </span>
                {/* Badge cámara (señal de editable) */}
                <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-espresso text-cream ring-2 ring-[var(--a-surface)]">
                  <CameraIcon className="h-3.5 w-3.5" />
                </span>
                {subiendo === m.id && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-espresso/55">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-cream/40 border-t-cream" />
                  </span>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onFile(i, m.id, e.target.files?.[0])}
                />
              </label>

              <div className="min-w-0 flex-1">
                <input
                  value={m.nombre}
                  onChange={(e) => patch(i, { nombre: e.target.value })}
                  placeholder="Nombre y apellido"
                  aria-label="Nombre y apellido"
                  className="w-full rounded-md bg-transparent px-1.5 py-1.5 text-[17px] font-semibold tracking-tight text-espresso outline-none transition-colors placeholder:font-normal placeholder:text-espresso-soft/45 hover:bg-[var(--a-surface-2)] focus:bg-[var(--a-surface-2)]"
                />
                <input
                  value={m.titulo ?? ""}
                  onChange={(e) => patch(i, { titulo: e.target.value })}
                  placeholder="Psicóloga clínica · MP 0000"
                  aria-label="Título o matrícula"
                  className="mt-0.5 w-full rounded-md bg-transparent px-1.5 py-1.5 text-[13.5px] text-espresso-soft outline-none transition-colors placeholder:text-espresso-soft/45 hover:bg-[var(--a-surface-2)] focus:bg-[var(--a-surface-2)]"
                />
                {activos > 0 && (
                  <span className="admin-faint mt-1 ml-1.5 inline-block text-[12px]">
                    {activos} {activos === 1 ? "servicio" : "servicios"} asignados
                  </span>
                )}
              </div>
              </div>

              <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-2.5">
                <button
                  type="button"
                  role="switch"
                  aria-checked={m.activo}
                  onClick={() => patch(i, { activo: !m.activo })}
                  className="group/sw inline-flex items-center gap-2"
                  title={m.activo ? "Visible para reservar" : "Oculto"}
                >
                  <span className={`text-[12px] font-medium ${m.activo ? "text-[var(--a-accent-ink)]" : "admin-muted"}`}>
                    {m.activo ? "Activa" : "Oculta"}
                  </span>
                  <span
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${m.activo ? "bg-[var(--a-accent)]" : "bg-[var(--a-border-strong)]"}`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${m.activo ? "translate-x-[22px]" : "translate-x-0.5"}`}
                    />
                  </span>
                </button>
                <DeleteConfirm
                  onConfirm={() => del(i)}
                  itemLabel={m.nombre ? `a ${m.nombre}` : "esta profesional"}
                />
              </div>
            </div>

            {/* ── Cuerpo: campos agrupados ── */}
            <div className="space-y-5 p-5">
              <label className="block">
                <span className="admin-kicker mb-1.5 block text-[12px]">Presentación</span>
                <textarea
                  value={m.bio ?? ""}
                  onChange={(e) => patch(i, { bio: e.target.value })}
                  placeholder="Enfoque y especialidad (ej. Terapia Cognitivo Conductual y ACT). Aparece en la reserva."
                  aria-label="Bio o especialidad"
                  rows={3}
                  className="admin-input w-full resize-none px-3 py-2 text-[14px] leading-relaxed text-espresso"
                />
              </label>

              <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
                {/* Color del avatar */}
                <div>
                  <span className="admin-kicker mb-2 block text-[12px]">Color</span>
                  <div className="flex items-center gap-2">
                    {COLORES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => patch(i, { color: c })}
                        aria-label="Color del avatar"
                        aria-pressed={m.color === c}
                        className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
                          m.color === c ? "scale-110 border-espresso" : "border-transparent"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                {/* Servicios que ofrece */}
                {services.length > 0 && (
                  <div className="min-w-0">
                    <span className="admin-kicker mb-2 block text-[12px]">
                      Servicios que ofrece
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {services.map((svc) => {
                        const on = m.serviceIds.includes(svc.id);
                        return (
                          <button
                            key={svc.id}
                            onClick={() => toggleSvc(i, svc.id)}
                            className={`inline-flex items-center rounded-full border px-3.5 py-2 min-h-[40px] text-[13px] transition-colors ${
                              on
                                ? "admin-chip-accent border-transparent font-medium"
                                : "admin-chip hover:border-[var(--a-border-strong)]"
                            }`}
                          >
                            {on ? "✓ " : ""}
                            {svc.nombre}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <p className="admin-faint text-[12px]">
                La foto se recorta cuadrada y se achica sola (JPG o PNG).
              </p>
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={add}
          className="admin-btn-ghost rounded-full px-4 py-2 text-[13px] font-medium transition-colors"
        >
          + Agregar profesional
        </button>
        <button
          onClick={guardar}
          disabled={estado === "guardando"}
          className="rounded-full bg-espresso px-6 py-2.5 text-[14px] font-medium text-cream transition-all hover:-translate-y-px disabled:opacity-60"
        >
          {estado === "guardando" ? "Guardando…" : "Guardar profesionales"}
        </button>
        {estado === "ok" && (
          <span className="text-[14px] font-medium text-[var(--a-accent-ink)]">✓ Guardado</span>
        )}
        {estado === "error" && (
          <span className="admin-danger text-[14px] font-medium">
            No se pudo guardar. Reintentá.
          </span>
        )}
      </div>
    </div>
  );
}
