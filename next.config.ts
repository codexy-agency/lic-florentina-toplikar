import type { NextConfig } from "next";

// CSP: mantenemos script/style permisivos ('unsafe-inline'/'unsafe-eval') para no
// romper el sitio público (estilos inline de Next + libs 3D three/vanta/spline),
// pero SÍ endurecemos lo barato y de alto valor: object-src 'none' (sin Flash/
// embeds), base-uri 'self' (anti secuestro de <base>), form-action 'self' (los
// forms solo postean a nuestro dominio) y frame-ancestors 'self' (anti-clickjacking).
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' data: blob: https:",
  "connect-src 'self' https:",
  "worker-src 'self' blob:",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

// Headers de seguridad aplicados a TODAS las respuestas.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: CSP },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // microphone=(self): habilitado para nuestro propio origen (entrada por voz del
  // asistente). camera/geolocation siguen deshabilitadas.
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), interest-cohort=()" },
  // Aislamiento de contexto de navegación (mitiga XS-Leaks desde ventanas abiertas).
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  // No anunciar el stack (reduce superficie de fingerprinting).
  poweredByHeader: false,
  images: {
    // Servimos las imágenes directo desde /public, SIN pasar por el optimizador
    // de Vercel (/_next/image). Era el único punto que fallaba en producción y
    // que no se podía reproducir localmente: si el optimizer da error, TODAS las
    // <Image> quedan en blanco mientras el resto del sitio funciona. Los archivos
    // estáticos de /public sí se sirven siempre. Trade-off: sin resize/format
    // automático (las imágenes ya están a un peso razonable).
    unoptimized: true,
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // El panel maneja datos clínicos: que no queden en caché de navegador/proxy
      // (importante en equipos compartidos / al volver con el botón atrás).
      {
        source: "/admin/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
    ];
  },
};

export default nextConfig;
