import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // On a static export there are no RSC/server routes; disable in dev so the SW never
  // intercepts localhost requests unexpectedly. It is only generated at build time.
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
};

export default withSerwist(nextConfig);
