/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    if (dev && process.env.PADARIA_NO_WEBPACK_CACHE === "1") {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
