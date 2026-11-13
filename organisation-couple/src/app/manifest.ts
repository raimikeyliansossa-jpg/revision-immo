import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Notre point du dimanche",
    short_name: "Notre point",
    description: "Le point du dimanche, à deux 💞",
    start_url: "/",
    display: "standalone",
    background_color: "#FFF8F0",
    theme_color: "#FFF8F0",
    orientation: "portrait",
    lang: "fr",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
