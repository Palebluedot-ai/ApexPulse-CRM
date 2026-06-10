import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ApexPulse CRM",
    short_name: "OTC CRM",
    description: "Personal OTC sales follow-up CRM.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4efe5",
    theme_color: "#0f766e",
  };
}
