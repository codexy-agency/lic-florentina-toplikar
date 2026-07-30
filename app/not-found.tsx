import Link from "next/link";

/** 404 del sitio público.
 *
 *  Es también lo que ve alguien que entra a un host que todavía no está dado de
 *  alta (proxy.ts corta ahí, fail-closed). Por eso el texto no asume que el
 *  visitante se equivocó de dirección: puede ser un consultorio que aún no
 *  publicamos. */
export default function NotFound() {
  return (
    <main className="grain flex min-h-[100dvh] items-center justify-center bg-cream px-6 py-16">
      <div className="w-full max-w-md text-center">
        <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-espresso-soft/60">404</p>
        <h1 className="mt-4 font-serif text-[28px] leading-tight tracking-tight text-espresso">
          Esta página no existe
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-espresso-soft">
          Puede que el link esté incompleto, o que el consultorio que buscás todavía no esté
          publicado.
        </p>
        <Link
          href="/"
          className="mt-7 inline-block rounded-full bg-espresso px-6 py-3 text-[15px] font-medium text-cream transition-transform duration-300 hover:-translate-y-px"
        >
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
