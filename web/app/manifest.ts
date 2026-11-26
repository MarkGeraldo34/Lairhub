import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LairHub",
    short_name: "LairHub",
    description: "Book a bed for one night, paid once you confirm.",
    start_url: "/",
    display: "standalone",
    background_color: "#0e1120",
    theme_color: "#0e1120",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
