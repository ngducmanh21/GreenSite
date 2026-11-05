const onVercel = process.env.VERCEL === "1" || process.env.GREENSITE_DEPLOYMENT === "vercel";
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: onVercel ? undefined : "standalone",
  outputFileTracingRoot: new URL("..", import.meta.url).pathname,
  transpilePackages: ["@greensite/contracts"],
  experimental: { proxyTimeout: 65000 },
  async rewrites() {
    if (onVercel) return []; // Root vercel.json owns public /api routing.
    const gateway = (process.env.GATEWAY_URL ?? "http://127.0.0.1:4000").replace(/\/$/, "");
    return [{ source: "/api/:path*", destination: `${gateway}/api/:path*` }];
  },
};
export default nextConfig;
