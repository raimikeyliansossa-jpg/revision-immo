import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KS & EK",
    short_name: "KS & EK",
    description: "Notre app à deux 💞",
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
