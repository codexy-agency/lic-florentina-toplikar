"use client";

import { useEffect, useState, type FormEvent, type ReactNode, type CSSProperties } from "react";
import { horaAR } from "@/lib/scheduling/slots";
import { Arrow, ArrowLeft } from "./Arrow";
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

// Identidad visual por servicio: cada tarjeta recibe un color de acento y un
// ícono representativo, derivados del nombre (con índice como respaldo) para que
// se distingan de un vistazo SIN configurar nada por tenant.
const SVC_ACCENTS = ["#7C8A6F", "#9C5475", "#B0846A", "#5F7A8C", "#8E7CA8", "#A8746A"];
function serviceVisual(nombre: string, i: number): { color: string; icon: ReactNode } {
  const n = nombre.toLowerCase();
  const color = SVC_ACCENTS[i % SVC_ACCENTS.length];
  let icon: ReactNode;
  if (/pareja|v[ií]nculo|amor/.test(n)) {
    // Dos personas juntas → pareja / vínculo
    icon = <><circle cx="8.5" cy="8" r="2.6" /><circle cx="15.5" cy="8" r="2.6" /><path d="M4 20c0-2.8 2-4.6 4.5-4.6S13 17.2 13 20M11 20c0-2.8 2-4.6 4.5-4.6S20 17.2 20 20" /></>;
  } else if (/padre|madre|famil|crianza|hij|ni[ñn]|infan/.test(n)) {
    // Adulto + niño → orientación a padres / familia
    icon = <><circle cx="8" cy="7" r="2.7" /><path d="M3.5 20c0-3 2-5 4.5-5s4.5 2 4.5 5" /><circle cx="16.5" cy="10.5" r="1.9" /><path d="M13.4 20c0-2.1 1.4-3.6 3.1-3.6s3.1 1.5 3.1 3.6" /></>;
  } else if (/primera|inicial|conocer|consulta|evalua|admis/.test(n)) {
    // Burbuja de conversación → primer encuentro / nos conocemos
    icon = <><path d="M20.5 13.5a2 2 0 0 1-2 2H8l-4 3.5V6a2 2 0 0 1 2-2h12.5a2 2 0 0 1 2 2Z" /><path d="M8 8.7h8.5M8 11.6h5" /></>;
  } else if (/adolesc|joven|juvenil|teen/.test(n)) {
    // Persona joven
    icon = <><circle cx="12" cy="7.5" r="3" /><path d="M6 20a6 6 0 0 1 12 0" /></>;
  } else if (/individual|sesi[oó]n|terap|adult|psico/.test(n)) {
    // Persona → sesión individual
    icon = <><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></>;
  } else {
    // Corazón con latido → cuidado / bienestar (genérico)
    icon = <><path d="M12 20s-6.4-4-8.9-8.1C1.4 9 3 5.9 6.1 5.9c1.8 0 3 1 3.9 2.1.9-1.1 2.1-2.1 3.9-2.1 2.4 0 3.9 1.9 3.7 4.1" /><path d="M13.5 14.5h2.3l1.3 2.4 2.1-5 1.3 2.6H23" /></>;
  }
  return { color, icon };
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
  // Teaser de disponibilidad inmediata (gancho de conversión): el primer horario
  // libre, mostrado en el paso 1 antes de elegir nada.
  const [proximo, setProximo] = useState<string | null>(null);

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

  // Busca el primer slot disponible (servicio principal, online) para el gancho.
  useEffect(() => {
    if (!services.length) return;
    const svc = services[0];
    const staffId = staff.find((s) => s.serviceIds.includes(svc.id))?.id;
    (async () => {
      try {
        const q = new URLSearchParams({ modalidad: "online", serviceId: svc.id });
        if (staffId) q.set("staffId", staffId);
        const r = await fetch(`/api/slots?${q}`, { cache: "no-store" });
        const d = await r.json();
        const dia = (d.dias ?? [])[0];
        if (dia?.slots?.length) {
          setProximo(`${dia.label} · ${horaAR(dia.slots[0].startsAt)} hs`);
        }
      } catch {
        /* sin teaser */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services.length]);

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
      email: String(f.get("email") || "").trim(),
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
      <div className="min-w-0 p-6 md:p-8">
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

        {/* Progreso — visible y sin desbordar en mobile (labels truncan) */}
        <ol className="mb-6 flex items-center gap-1.5">
          {pasos.map((p, i) => {
            const done = step > p.n;
            const active = step === p.n;
            return (
              <li key={p.label} className="flex min-w-0 flex-1 items-center gap-2">
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
                  className={`truncate text-[11px] font-medium uppercase tracking-[0.06em] ${
                    active ? "text-espresso" : "text-espresso-soft/70"
                  }`}
                >
                  {p.label}
                </span>
                {i < pasos.length - 1 && (
                  <span className="ml-0.5 hidden h-px flex-1 bg-[var(--color-line)] sm:block" />
                )}
              </li>
            );
          })}
        </ol>

        {step > 1 && (
          <button
            onClick={back}
            className="group mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-espresso-soft transition-colors hover:text-espresso"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            Volver
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
                {proximo && (
                  <div className="flex items-center gap-2.5 rounded-xl bg-sage/12 px-3.5 py-2.5 text-[13px] text-sage-deep">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sage/60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-sage-deep" />
                    </span>
                    <span>
                      <strong className="font-semibold">Próximo turno disponible:</strong> {proximo}
                    </span>
                  </div>
                )}
                <H>Elegí el servicio</H>
                {services.map((s, i) => {
                  const v = serviceVisual(s.nombre, i);
                  return (
                    <button
                      key={s.id}
                      onClick={() => pickService(s)}
                      style={{ "--svc": v.color } as CSSProperties}
                      className="group relative flex w-full items-center gap-3.5 overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white py-4 pl-4 pr-4 text-left shadow-[0_1px_2px_rgba(58,49,55,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--svc)] hover:shadow-card-hover sm:pl-5"
                    >
                      {/* Barra de acento del servicio (identidad de un vistazo) */}
                      <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-[var(--svc)] opacity-70 transition-opacity duration-300 group-hover:opacity-100" />
                      {/* Ícono representativo */}
                      <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105"
                        style={{ backgroundColor: `${v.color}1A`, color: v.color }}
                      >
                        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                          {v.icon}
                        </svg>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-medium text-espresso">{s.nombre}</span>
                          {i === 0 && (
                            <span className="rounded-full bg-sage/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-sage-deep">
                              Más elegida
                            </span>
                          )}
                        </span>
                        {s.descripcion && (
                          <span className="mt-0.5 block text-[13px] leading-snug text-espresso-soft">
                            {s.descripcion}
                          </span>
                        )}
                        <span className="mt-1.5 inline-flex items-center gap-2 text-[13px]">
                          <span className="font-semibold tabular-nums text-espresso">
                            {precio(s.priceARS) ?? "A coordinar"}
                          </span>
                          <span className="text-espresso-soft/50">·</span>
                          <span className="text-espresso-soft">{s.durationMin} min</span>
                        </span>
                      </span>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream-deep/60 text-espresso transition-all duration-300 group-hover:translate-x-0.5 group-hover:bg-[var(--svc)] group-hover:text-cream">
                        <Arrow className="h-[18px] w-[18px]" />
                      </span>
                    </button>
                  );
                })}
                <p className="flex items-center justify-center gap-2 pt-2 text-center text-[13px] text-espresso-soft">
                  <svg className="h-4 w-4 shrink-0 text-sage-deep" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  </svg>
                  Sin pago online · Te confirmo personalmente en menos de 24 h.
                </p>
              </div>
            )}

            {/* PASO 2 — Profesional */}
            {step === 2 && service && (
              <div className="space-y-3">
                <H>Elegí con quién</H>
                {eligibles(service.id).length === 0 && (
                  <P>
                    Este servicio no tiene profesional disponible por ahora.
                    Escribinos por WhatsApp y lo coordinamos.
                  </P>
                )}
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
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream-deep/60 text-espresso transition-all duration-300 group-hover:translate-x-0.5 group-hover:bg-sage-deep group-hover:text-cream">
                      <Arrow className="h-[18px] w-[18px]" />
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* PASO 3 — Fecha y hora */}
            {step === 3 && service && member && (
              <div className="min-w-0">
                <div className="mb-4 flex items-center gap-3 rounded-2xl bg-cream-deep/40 px-4 py-3 text-[13px]">
                  <Avatar staff={member} small />
                  <span className="min-w-0 text-espresso">
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
                            className="rounded-xl border border-[var(--color-line)] bg-cream px-2 py-3 text-[15px] font-medium tabular-nums text-espresso transition-all duration-200 hover:border-sage/60 hover:bg-sage/10 active:scale-[0.97]"
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
                      WhatsApp / teléfono
                    </span>
                    <input name="contacto" type="tel" inputMode="tel" required placeholder="+54 9 …" className={field} />
                  </label>
                </div>
                <label className="mt-4 block">
                  <span className="mb-1.5 block text-[12px] font-medium uppercase tracking-[0.14em] text-sage-deep">
                    Email <span className="normal-case text-espresso-soft/60">(opcional)</span>
                  </span>
                  <input name="email" type="email" placeholder="tucorreo@ejemplo.com" className={field} />
                </label>
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
