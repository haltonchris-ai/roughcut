/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@roughcut/shared"],
  // @resvg/resvg-js ships a native .node binary (used to render sticker
  // label art to PDF/image). Webpack can't parse that binary as a JS
  // module, so it has to be excluded from bundling and required at
  // runtime instead, like any other native Node addon.
  serverExternalPackages: ["@resvg/resvg-js", "pdfkit"],
  // Vercel's file tracing doesn't follow the runtime path.join() calls in
  // label-art.ts, so the bundled label fonts have to be listed explicitly or
  // they're dropped from the serverless function bundle.
  outputFileTracingIncludes: {
    "src/app/app/stickers/actions.ts": ["./src/lib/print/fonts/*.ttf"],
    "src/app/admin/(dashboard)/companies/[id]/actions.ts": ["./src/lib/print/fonts/*.ttf"],
  },
};

export default nextConfig;
