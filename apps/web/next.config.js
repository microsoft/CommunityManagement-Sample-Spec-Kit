import withBundleAnalyzer from "@next/bundle-analyzer";

const analyze = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@acroyoga/shared",
    "@acroyoga/shared-ui",
    "@acroyoga/tokens",
  ],
};

export default analyze(nextConfig);
