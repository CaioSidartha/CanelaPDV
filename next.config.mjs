import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.APP_VERSION || pkg.version || "0.0.0",
    NEXT_PUBLIC_CANELA_EMBEDDED: process.env.CANELA_EMBEDDED === "1" ? "1" : "",
  },
  webpack: (config, { dev }) => {
    if (dev && process.env.PADARIA_NO_WEBPACK_CACHE === "1") {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
