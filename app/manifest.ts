import type { MetadataRoute } from "next";
import { RS } from "@/lib/rs";

// Manifest del sitio: nombre e íconos para "Agregar a inicio" en el celular.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: RS.nombre,
    short_name: "RS Odonto",
    description: `${RS.especialidad} en ${RS.ciudad}. Sacá tu turno online.`,
    lang: "es-AR",
    start_url: "/",
    display: "standalone",
    background_color: "#1E3A3D",
    theme_color: "#1E3A3D",
    icons: [
      { src: "/rs/icono-192.png", sizes: "192x192", type: "image/png" },
      { src: "/rs/icono-512.png", sizes: "512x512", type: "image/png" },
      { src: "/rs/icono-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
