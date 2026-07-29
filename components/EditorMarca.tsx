"use client";

import { useActionState, useState } from "react";
import { IconoCheck } from "@/components/iconos";
import { guardarMarca, type MarcaState } from "@/app/admin/marca/actions";
import { PALETAS, type Marca } from "@/lib/marca";
import { SubmitButton } from "./SubmitButton";

const field = "admin-input w-full rounded-xl px-3.5 py-2.5 text-[14px] text-espresso";
const label = "admin-kicker mb-1.5 block text-[12px]";

/** Editor de la identidad del consultorio, con vista previa en vivo. */
export function EditorMarca({ inicial }: { inicial: Marca }) {
  const [state, formAction] = useActionState<MarcaState | null, FormData>(guardarMarca, null);
  const [paletaId, setPaletaId] = useState(
    PALETAS.find((p) => p.paleta.acento === inicial.paleta.acento)?.id ?? "personalizada"
  );
  const [nombre, setNombre] = useState(inicial.nombre);
  const [titulo, setTitulo] = useState(inicial.titulo);
  const [heroTitulo, setHeroTitulo] = useState(inicial.heroTitulo);

  const paleta = PALETAS.find((p) => p.id === paletaId)?.paleta ?? inicial.paleta;

  return (
    <form action={formAction} className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
      <div className="space-y-6">
        {/* Identidad */}
        <section className="admin-card rounded-2xl p-5">
          <h3 className="admin-kicker text-[13px]">Tus datos</h3>
          <p className="admin-muted mt-1 text-[13px]">Así te va a ver quien entre a tu sitio.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={label}>Nombre y apellido</span>
              <input name="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} placeholder="Ana Gómez" className={field} />
            </label>
            <label className="block">
              <span className={label}>Título profesional</span>
              <input name="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={80} placeholder="Psicóloga clínica" className={field} />
            </label>
            <label className="block">
              <span className={label}>Matrícula</span>
              <input name="matricula" defaultValue={inicial.matricula} maxLength={40} placeholder="MP 1234" className={field} />
            </label>
            <label className="block">
              <span className={label}>Ciudad</span>
              <input name="ciudad" defaultValue={inicial.ciudad} maxLength={60} placeholder="Tu ciudad" className={field} />
            </label>
          </div>
        </section>

        {/* Textos del sitio */}
        <section className="admin-card rounded-2xl p-5">
          <h3 className="admin-kicker text-[13px]">Textos de tu sitio</h3>
          <p className="admin-muted mt-1 text-[13px]">Si los dejás vacíos usamos textos por defecto.</p>
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className={label}>Frase principal</span>
              <input name="heroTitulo" value={heroTitulo} onChange={(e) => setHeroTitulo(e.target.value)} maxLength={120} placeholder="Un espacio para cuidar tu salud mental." className={field} />
            </label>
            <label className="block">
              <span className={label}>Bajada</span>
              <textarea name="heroSubtitulo" defaultValue={inicial.heroSubtitulo} maxLength={400} rows={2} placeholder="Terapia con respaldo científico para la ansiedad, el estrés y los momentos de cambio." className={`${field} resize-y`} />
            </label>
            <label className="block">
              <span className={label}>Sobre vos</span>
              <textarea name="sobreMi" defaultValue={inicial.sobreMi} maxLength={1200} rows={5} placeholder="Contá tu formación, tu enfoque y cómo trabajás." className={`${field} resize-y`} />
            </label>
          </div>
        </section>

        {/* Contacto */}
        <section className="admin-card rounded-2xl p-5">
          <h3 className="admin-kicker text-[13px]">Contacto</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={label}>WhatsApp</span>
              <input name="whatsapp" type="tel" defaultValue={inicial.whatsapp} maxLength={40} placeholder="+54 9 11 5555 5555" className={field} />
              <span className="admin-faint mt-1 block text-[12px]">
                Con código de país. Si lo dejás vacío, tu sitio no muestra el botón de WhatsApp.
              </span>
            </label>
            <label className="block">
              <span className={label}>Email</span>
              <input name="email" type="email" defaultValue={inicial.email} maxLength={120} placeholder="hola@tuconsultorio.com" className={field} />
            </label>
            <label className="block">
              <span className={label}>Instagram</span>
              <input name="instagram" defaultValue={inicial.instagram} maxLength={80} placeholder="tuusuario (sin @)" className={field} />
            </label>
            <label className="block">
              <span className={label}>Dominio propio <span className="admin-faint normal-case">(opcional)</span></span>
              <input name="dominio" defaultValue={inicial.dominio} maxLength={120} placeholder="anagomez.com" className={field} />
            </label>
          </div>
        </section>

        {/* Cómo te pagan los pacientes */}
        <section className="admin-card rounded-2xl p-5">
          <h3 className="admin-kicker text-[13px]">Cómo te pagan</h3>
          <p className="admin-muted mt-1 text-[13px]">
            Se muestra en tu sitio, en la sección de medios de pago. Lo que dejes vacío no aparece.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className={label}>Tipo de dato</span>
              <select name="aliasPagoLabel" defaultValue={inicial.aliasPagoLabel} className={field}>
                <option value="Alias">Alias (Argentina)</option>
                <option value="CBU">CBU (Argentina)</option>
                <option value="CVU">CVU (Argentina)</option>
                <option value="CLABE">CLABE (México)</option>
                <option value="Cuenta">Cuenta</option>
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className={label}>Tu {inicial.aliasPagoLabel.toLowerCase()}</span>
              <input
                name="aliasPago"
                defaultValue={inicial.aliasPago}
                maxLength={80}
                placeholder="ana.gomez.psi"
                className={`${field} font-mono`}
              />
            </label>
            <label className="block sm:col-span-3">
              <span className={label}>Link de pago <span className="admin-faint normal-case">(opcional)</span></span>
              <input
                name="linkPago"
                type="url"
                defaultValue={inicial.linkPago}
                maxLength={300}
                placeholder="https://link.mercadopago.com.ar/tuusuario"
                className={field}
              />
              <span className="admin-faint mt-1 block text-[12px]">
                Tu link de Mercado Pago, Stripe o PayPal para que paguen con tarjeta.
              </span>
            </label>
          </div>
        </section>

        {/* Colores */}
        <section className="admin-card rounded-2xl p-5">
          <h3 className="admin-kicker text-[13px]">Colores</h3>
          <p className="admin-muted mt-1 text-[13px]">Elegí una paleta. Todas están pensadas para que el texto se lea bien.</p>
          <input type="hidden" name="paletaId" value={paletaId === "personalizada" ? "" : paletaId} />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PALETAS.map((p) => {
              const activa = p.id === paletaId;
              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setPaletaId(p.id)}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    activa
                      ? "border-[var(--a-accent)] ring-2 ring-[var(--a-accent)]/25"
                      : "border-[var(--a-border)] hover:border-[var(--a-border-strong)]"
                  }`}
                >
                  <span className="flex gap-1.5">
                    {[p.paleta.acento, p.paleta.acentoOscuro, p.paleta.secundario, p.paleta.fondoSuave].map((c) => (
                      <span key={c} className="h-6 w-6 rounded-full border border-black/5" style={{ background: c }} />
                    ))}
                  </span>
                  <span className="mt-2 block text-[13px] font-medium text-espresso">{p.nombre}</span>
                </button>
              );
            })}
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton pendingText="Guardando…" className="admin-btn rounded-full px-6 py-2.5 text-[14px] font-medium">
            Guardar y publicar
          </SubmitButton>
          {state?.ok && state.mensaje && (
            <span className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[var(--a-ok)]"><IconoCheck size={14} /> {state.mensaje}</span>
          )}
          {state && !state.ok && state.error && (
            <span className="admin-danger text-[13.5px] font-medium">{state.error}</span>
          )}
          <a href="/" target="_blank" rel="noreferrer" className="admin-btn-ghost rounded-full px-5 py-2.5 text-[13.5px] font-medium">
            Ver mi sitio ↗
          </a>
        </div>
      </div>

      {/* Vista previa */}
      <aside className="lg:sticky lg:top-6">
        <p className="admin-kicker mb-2 text-[12px]">Vista previa</p>
        <div
          className="overflow-hidden rounded-2xl border border-[var(--a-border)] shadow-sm"
          style={{ background: paleta.fondo }}
        >
          <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${paleta.acentoOscuro}, ${paleta.acento}, ${paleta.secundario})` }} />
          <div className="p-5">
            <p className="text-[15px] font-semibold tracking-tight" style={{ color: paleta.texto }}>
              {nombre || "Tu nombre"}
            </p>
            <p className="text-[12px] font-medium uppercase tracking-[0.14em]" style={{ color: paleta.acentoOscuro }}>
              {titulo || "Psicóloga clínica"}
            </p>
            <p className="mt-4 text-[19px] leading-snug" style={{ color: paleta.texto }}>
              {heroTitulo || "Un espacio para cuidar tu salud mental."}
            </p>
            <span
              className="mt-4 inline-flex rounded-full px-4 py-2 text-[13px] font-medium text-white"
              style={{ background: paleta.acentoOscuro }}
            >
              Reservar turno
            </span>
            <div className="mt-5 rounded-xl p-3" style={{ background: paleta.fondoSuave }}>
              <p className="text-[12.5px]" style={{ color: paleta.texto, opacity: 0.75 }}>
                Así se van a ver tus tarjetas y secciones.
              </p>
            </div>
          </div>
        </div>
        <p className="admin-faint mt-3 text-[12px] leading-relaxed">
          Los cambios se publican cuando tocás <strong>Guardar</strong>.
        </p>
      </aside>
    </form>
  );
}
