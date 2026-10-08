/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@roughcut/shared"],
  // Vercel's file tracing doesn't follow the runtime path.join() calls in
  // label-art.ts, so the bundled label fonts have to be listed explicitly or
  // they're dropped from the serverless function bundle.
  outputFileTracingIncludes: {
    "src/app/app/stickers/actions.ts": ["./src/lib/print/fonts/*.ttf"],
    "src/app/admin/(dashboard)/companies/[id]/actions.ts": ["./src/lib/print/fonts/*.ttf"],
  },
};

export default nextConfig;
