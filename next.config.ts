import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// Load `.env*` next to this config (project root).
const configDir = path.dirname(fileURLToPath(import.meta.url));
loadEnvConfig(configDir);

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(configDir),
  },
};

export default nextConfig;
