import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Servimos las imágenes directo desde /public, SIN pasar por el optimizador
    // de Vercel (/_next/image). Era el único punto que fallaba en producción y
    // que no se podía reproducir localmente: si el optimizer da error, TODAS las
    // <Image> quedan en blanco mientras el resto del sitio funciona. Los archivos
    // estáticos de /public sí se sirven siempre. Trade-off: sin resize/format
    // automático (las imágenes ya están a un peso razonable).
    unoptimized: true,
  },
};

export default nextConfig;
