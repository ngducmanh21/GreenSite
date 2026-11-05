/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  outputFileTracingRoot: new URL("..", import.meta.url).pathname,
  transpilePackages: ["@greensite/contracts"],
  experimental: { proxyTimeout: 65000 },
  async rewrites() {
    const gateway = (process.env.GATEWAY_URL ?? "http://127.0.0.1:4000").replace(/\/$/, "");
    return [{ source: "/api/:path*", destination: `${gateway}/api/:path*` }];
  },
};
export default nextConfig;
