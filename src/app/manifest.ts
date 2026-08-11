import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Black Punk Trip",
    short_name: "Black Punk Trip",
    description: "Catat talangan dan bereskan settlement trip.",
    lang: "id",
    dir: "ltr",
    categories: ["finance", "travel", "productivity"],
    id: "/",
    scope: "/",
    start_url: "/app?view=home",
    display: "standalone",
    display_override: ["standalone", "browser"],
    launch_handler: { client_mode: "focus-existing" },
    prefer_related_applications: false,
    related_applications: [{ platform: "webapp", url: "https://black-punk-trip.vercel.app/manifest.webmanifest", id: "/" }],
    background_color: "#f7f4ed",
    theme_color: "#f7f4ed",
    orientation: "portrait-primary",
    icons: [
      { src: "/icons/bp-logo-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/bp-logo-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
