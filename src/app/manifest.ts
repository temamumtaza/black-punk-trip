import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Black Punk Trip",
    short_name: "Black Punk Trip",
    description: "Catat talangan dan bereskan settlement trip.",
    id: "/",
    scope: "/",
    start_url: "/app?view=home",
    display: "standalone",
    background_color: "#f7f4ed",
    theme_color: "#f7f4ed",
    orientation: "portrait-primary",
    icons: [
      { src: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml", purpose: "maskable" },
      { src: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
