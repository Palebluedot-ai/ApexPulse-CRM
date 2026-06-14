import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HashKey OTC",
    short_name: "HashKey OTC",
    description: "Personal OTC sales follow-up CRM.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4efe5",
    theme_color: "#0f766e",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
