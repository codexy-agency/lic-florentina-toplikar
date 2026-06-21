"use client";

import { useEffect, useState, type FormEvent } from "react";
import { horaAR } from "@/lib/scheduling/slots";
import type { DaySlots, Slot, Modalidad, Service, Staff } from "@/lib/scheduling/types";

/**
 * Reserva NATIVA por pasos (estilo Calendly/Lumière):
 *   Servicio → Profesional → Fecha y hora → Tus datos.
 * Si NINGÚN servicio necesita elegir profesional (consultorio de una sola
 * profesional), el indicador muestra 3 pasos reales (Servicio · Horario · Datos)
 * en vez de "saltar" del 1 al 3. Todo se configura desde el panel interno.
 */
function precio(n?: number) {
  return n ? "$" + n.toLocaleString("es-AR") : null;
}
function iniciales(nombre: string) {
  return nombre
    .replace(/lic\.?/i, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function TurnoForm() {
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loadingCfg, setLoadingCfg] = useState(true);

  const [step, setStep] = useState(1);
  const [service, setService] = useState<Service | null>(null);
  const [member, setMember] = useState<Staff | null>(null);
  const [skipStaff, setSkipStaff] = useState(false);

  const [modalidad, setModalidad] = useState<Modalidad>("online");
  const [dias, setDias] = useState<DaySlots[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [diaSel, setDiaSel] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/reservar-config", { cache: "no-store" });
        const d = await r.json();
        setServices(d.services ?? []);
        setStaff(d.staff ?? []);
      } catch {
        /* sin config */
      } finally {
        setLoadingCfg(false);
      }
    })();
  }, []);

  const eligibles = (svcId: string) =>
    staff.filter((s) => s.serviceIds.includes(svcId));

  function pickService(svc: Service) {
    setService(svc);
    setSlot(null);
    setMember(null);
    const elig = eligibles(svc.id);
    if (elig.length === 1) {
      setMember(elig[0]);
      setSkipStaff(true);
      setStep(3);
    } else {
      setSkipStaff(false);
      setStep(2);
    }
  }

  function pickMember(m: Staff) {
    setMember(m);
    setSlot(null);
    setStep(3);
  }

  async function loadSlots() {
    if (!service || !member) return;
    setLoadingSlots(true);
    setError(null);
    try {
      const q = new URLSearchParams({
        modalidad,
        serviceId: service.id,
        staffId: member.id,
      });
      const r = await fetch(`/api/slots?${q}`, { cache: "no-store" });
      const d = await r.json();
      const ds: DaySlots[] = d.dias ?? [];
      setDias(ds);
      setDiaSel(ds[0]?.date ?? null);
    } catch {
      setDias([]);
    } finally {
      setSlot(null);
      setLoadingSlots(false);
    }
  }

  useEffect(() => {
    if (step === 3 && service && member) loadSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, modalidad, service?.id, member?.id]);

  function back() {
    setError(null);
    if (step === 4) setStep(3);
    else if (step === 3) setStep(skipStaff ? 1 : 2);
    else if (step === 2) setStep(1);
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!slot || !service || !member) return;
    setEnviando(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const payload = {
      nombre: String(f.get("nombre") || "").trim(),
      contacto: String(f.get("contacto") || "").trim(),
      modalidad,
      serviceId: service.id,
      staffId: member.id,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      motivo: String(f.get("motivo") || "").trim(),
    };
    try {
      const r = await fetch("/api/turnos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) {
        if (r.status === 409) {
          setError("Ese horario se acaba de ocupar. Elegí otro, por favor.");
          setStep(3);
          await loadSlots();
        } else {
          setError(d.error || "No se pudo reservar. Probá de nuevo.");
        }
        return;
      }
      setEnviado(true);
    } catch {
      setError("Hubo un problema de conexión. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  const field =
    "w-full rounded-2xl border border-[var(--color-line)] bg-cream px-4 py-3 text-[15px] text-espresso placeholder:text-espresso-soft/60 transition-colors duration-300 focus:border-sage/60 focus:outline-none focus:ring-2 focus:ring-sage/30";
  const dia = dias.find((d) => d.date === diaSel) ?? null;

  // Indicador de pasos adaptativo: si ningún servicio requiere elegir profesional
  // (un solo profesional eligible en todos), mostramos 3 pasos reales. Los `n`
  // son los pasos internos (3 = horario, 4 = datos) aunque el número visible sea
  // correlativo (1·2·3), para que nunca se vea "saltar" un número.
  const staffNeeded =
    staff.length > 1 && services.some((s) => eligibles(s.id).length > 1);
  // Mostramos "Profesional" sólo si el tenant lo usa Y el servicio elegido no lo
  // saltea: si se salteó (skipStaff), usamos 3 pasos para no marcar como ✓ hecho
  // un paso que el paciente nunca vio.
  const mostrarProfesional = staffNeeded && !skipStaff;
  const pasos = mostrarProfesional
    ? [
        { label: "Servicio", n: 1 },
        { label: "Profesional", n: 2 },
        { label: "Horario", n: 3 },
        { label: "Datos", n: 4 },
      ]
    : [
        { label: "Servicio", n: 1 },
        { label: "Horario", n: 3 },
        { label: "Datos", n: 4 },
      ];

  // ───────────────────────── Éxito ─────────────────────────
  if (enviado) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center p-10 text-center md:p-14">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-sage/20 text-sage-deep">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          <h3 className="mt-5 font-serif text-2xl tracking-tight text-espresso">
            ¡Turno reservado!
          </h3>
          <p className="mt-3 max-w-sm leading-relaxed text-espresso-soft">
            {service?.nombre} con {member?.nombre}. Te confirmamos al contacto que
            dejaste, normalmente dentro de las 24 horas.
          </p>
          <button
            onClick={() => {
              setEnviado(false);
              setService(null);
              setMember(null);
              setSlot(null);
              setStep(1);
            }}
            className="mt-7 text-[14px] font-medium text-sage-deep underline-offset-4 transition-colors hover:text-espresso hover:underline"
          >
            Reservar otro turno
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="p-6 md:p-8">
        {/* Encabezado "en vivo": deja claro que es un reservador funcional. */}
        <div className="mb-5 flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sage/50" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sage-deep" />
          </span>
          <span className="text-[12px] font-medium uppercase tracking-[0.16em] text-sage-deep">
            Reservá en línea ahora
          </span>
        </div>

        {/* Progreso */}
        <ol className="mb-6 flex items-center gap-2">
          {pasos.map((p, i) => {
            const done = step > p.n;
            const active = step === p.n;
            return (
              <li key={p.label} className="flex flex-1 items-center gap-2">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-medium transition-colors ${
                    active
                      ? "bg-espresso text-cream"
                      : done
                        ? "bg-sage/25 text-sage-deep"
                        : "bg-cream-deep/60 text-espresso-soft/60"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                <span
                  className={`hidden text-[12px] font-medium uppercase tracking-[0.08em] sm:block ${
                    active ? "text-espresso" : "text-espresso-soft/60"
                  }`}
                >
                  {p.label}
                </span>
                {i < pasos.length - 1 && (
                  <span className="ml-1 hidden h-px flex-1 bg-[var(--color-line)] sm:block" />
                )}
              </li>
            );
          })}
        </ol>

        {step > 1 && (
          <button
            onClick={back}
            className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-espresso-soft transition-colors hover:text-espresso"
          >
            ← Volver
          </button>
        )}

        {loadingCfg ? (
          <P>Cargando…</P>
        ) : services.length === 0 ? (
          <P>
            Todavía no hay servicios configurados. Cargalos desde el panel
            (/admin/servicios).
          </P>
        ) : (
          <>
            {/* PASO 1 — Servicio */}
            {step === 1 && (
              <div className="space-y-3">
                <H>Elegí el servicio</H>
                {services.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => pickService(s)}
                    className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-[var(--color-line)] bg-white px-5 py-4 text-left shadow-[0_1px_2px_rgba(58,49,55,0.05)] transition-all duration-300 hover:border-sage/50 hover:bg-sage/[0.05]"
                  >
                    <span>
                      <span className="block font-medium text-espresso">{s.nombre}</span>
                      {s.descripcion && (
                        <span className="mt-0.5 block text-[13px] text-espresso-soft">
                          {s.descripcion}
                        </span>
                      )}
                      <span className="mt-1 block text-[13px] text-sage-deep">
                        {s.durationMin} min{precio(s.priceARS) ? ` · ${precio(s.priceARS)}` : ""}
                      </span>
                    </span>
                    <span className="text-espresso-soft transition-transform duration-300 group-hover:translate-x-0.5">
                      →
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* PASO 2 — Profesional */}
            {step === 2 && service && (
              <div className="space-y-3">
                <H>Elegí con quién</H>
                {eligibles(service.id).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => pickMember(m)}
                    className="group flex w-full items-center gap-4 rounded-2xl border border-[var(--color-line)] bg-white px-5 py-4 text-left shadow-[0_1px_2px_rgba(58,49,55,0.05)] transition-all duration-300 hover:border-sage/50 hover:bg-sage/[0.05]"
                  >
                    <Avatar staff={m} />
                    <span className="flex-1">
                      <span className="block font-medium text-espresso">{m.nombre}</span>
                      {m.titulo && (
                        <span className="block text-[13px] text-espresso-soft">{m.titulo}</span>
                      )}
                    </span>
                    <span className="text-espresso-soft transition-transform duration-300 group-hover:translate-x-0.5">
                      →
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* PASO 3 — Fecha y hora */}
            {step === 3 && service && member && (
              <div>
                <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-cream-deep/40 px-4 py-3 text-[13px]">
                  <Avatar staff={member} small />
                  <span className="text-espresso">
                    <span className="font-medium">{service.nombre}</span> con{" "}
                    {member.nombre} · {service.durationMin} min
                  </span>
                </div>

                {/* Modalidad */}
                <span className="mb-2 block text-[12px] font-medium uppercase tracking-[0.14em] text-sage-deep">
                  Modalidad
                </span>
                <div className="mb-5 flex flex-wrap gap-3">
                  {([
                    { v: "online", l: "Online" },
                    { v: "presencial", l: "Presencial en Viedma" },
                  ] as const).map((m) => (
                    <button
                      key={m.v}
                      onClick={() => setModalidad(m.v)}
                      className={`rounded-full border px-5 py-2.5 text-[14px] font-medium transition-all duration-300 ${
                        modalidad === m.v
                          ? "border-sage bg-sage/15 text-espresso"
                          : "border-[var(--color-line)] bg-cream text-espresso-soft hover:border-sage/40"
                      }`}
                    >
                      {m.l}
                    </button>
                  ))}
                </div>

                <H>Elegí día y horario</H>
                {loadingSlots ? (
                  <P>Buscando horarios disponibles…</P>
                ) : dias.length === 0 ? (
                  <P>
                    No hay horarios libres en esta modalidad por ahora. Probá la otra
                    modalidad o escribinos por WhatsApp.
                  </P>
                ) : (
                  <>
                    <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
                      {dias.map((d) => {
                        const activo = d.date === diaSel;
                        return (
                          <button
                            key={d.date}
                            onClick={() => {
                              setDiaSel(d.date);
                              setSlot(null);
                            }}
                            className={`flex shrink-0 flex-col items-center rounded-2xl border px-4 py-3 text-center transition-all duration-300 ${
                              activo
                                ? "border-espresso bg-espresso text-cream"
                                : "border-[var(--color-line)] bg-cream text-espresso-soft hover:border-sage/50"
                            }`}
                          >
                            <span className="text-[13px] font-medium capitalize leading-tight">
                              {d.label}
                            </span>
                            <span className={`mt-0.5 text-[11px] ${activo ? "text-cream/70" : "text-espresso-soft/60"}`}>
                              {d.slots.length} {d.slots.length === 1 ? "horario" : "horarios"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {dia && (
                      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {dia.slots.map((sl) => (
                          <button
                            key={sl.startsAt}
                            onClick={() => {
                              setSlot(sl);
                              setStep(4);
                            }}
                            className="rounded-xl border border-[var(--color-line)] bg-cream px-2 py-2.5 text-[14px] font-medium text-espresso transition-all duration-200 hover:border-sage/60 hover:bg-sage/10"
                          >
                            {horaAR(sl.startsAt)}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* PASO 4 — Datos */}
            {step === 4 && service && member && slot && (
              <form onSubmit={submit}>
                <div className="mb-5 rounded-2xl bg-cream-deep/40 p-4 text-[14px]">
                  <p className="font-medium text-espresso">{service.nombre}</p>
                  <p className="mt-0.5 text-espresso-soft">
                    {member.nombre} · {dia?.label} · {horaAR(slot.startsAt)} hs ·{" "}
                    {modalidad === "online" ? "Online" : "Presencial"}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-[12px] font-medium uppercase tracking-[0.14em] text-sage-deep">
                      Nombre y apellido
                    </span>
                    <input name="nombre" required placeholder="Tu nombre" className={field} />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[12px] font-medium uppercase tracking-[0.14em] text-sage-deep">
                      Email o WhatsApp
                    </span>
                    <input name="contacto" required placeholder="Para confirmarte el turno" className={field} />
                  </label>
                </div>
                <label className="mt-4 block">
                  <span className="mb-1.5 block text-[12px] font-medium uppercase tracking-[0.14em] text-sage-deep">
                    Motivo <span className="normal-case text-espresso-soft/60">(opcional)</span>
                  </span>
                  <textarea name="motivo" rows={3} placeholder="Contanos brevemente qué te gustaría trabajar" className={`${field} resize-none`} />
                </label>

                {error && (
                  <p className="mt-4 rounded-xl bg-[#9C5475]/10 px-4 py-3 text-[14px] text-[#9C5475]">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={enviando}
                  className="group mt-6 flex w-full items-center justify-center gap-3 rounded-full bg-espresso px-6 py-4 text-[15px] font-medium text-cream transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-px hover:shadow-card-hover active:scale-[0.99] disabled:opacity-60"
                >
                  {enviando ? "Reservando…" : "Confirmar reserva"}
                </button>
                <p className="mt-4 text-center text-[13px] text-espresso-soft">
                  Te confirmamos personalmente al contacto que dejes.
                </p>
              </form>
            )}

            {error && step === 3 && (
              <p className="mt-4 rounded-xl bg-[#9C5475]/10 px-4 py-3 text-[14px] text-[#9C5475]">
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-sage/25 bg-white shadow-[0_30px_70px_-30px_rgba(58,49,55,0.38)] ring-1 ring-black/[0.03]">
      {/* Acento superior: señal de que es una herramienta viva, no una imagen. */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-sage/60 via-sage-deep/50 to-clay/50"
      />
      {children}
    </div>
  );
}
function H({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-3 block text-[12px] font-medium uppercase tracking-[0.14em] text-sage-deep">
      {children}
    </span>
  );
}
function P({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--color-line)] p-8 text-center text-[14px] text-espresso-soft">
      {children}
    </div>
  );
}
function Avatar({ staff, small = false }: { staff: Staff; small?: boolean }) {
  const size = small ? "h-9 w-9" : "h-12 w-12";
  const c = staff.color || "#7c8a6f";
  if (staff.imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={staff.imageUrl}
        alt={staff.nombre}
        className={`${size} shrink-0 rounded-full object-cover ring-1 ring-[var(--color-line)]`}
      />
    );
  }
  return (
    <span
      className={`flex ${size} shrink-0 items-center justify-center rounded-full font-medium ${small ? "text-[13px]" : "text-[15px]"}`}
      style={{ backgroundColor: `${c}22`, color: c }}
    >
      {iniciales(staff.nombre)}
    </span>
  );
}
