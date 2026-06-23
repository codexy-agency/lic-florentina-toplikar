import type { NextConfig } from "next";

// Headers de seguridad aplicados a TODAS las respuestas. No incluimos una CSP de
// scripts estricta para no romper el sitio público (estilos inline + libs 3D);
// sí frame-ancestors para evitar clickjacking del panel autenticado.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
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
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
