import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// Load env from the parent workspace folder (e.g. `Quiz App/.env`) as well as `primary-quiz/`.
// Next only reads `.env*` next to this config by default, so keys kept one level up were missing at runtime.
const configDir = path.dirname(fileURLToPath(import.meta.url));
loadEnvConfig(path.resolve(configDir, ".."));
loadEnvConfig(configDir);

const nextConfig: NextConfig = {
  turbopack: {
    root: ".",
  },
};

export default nextConfig;
