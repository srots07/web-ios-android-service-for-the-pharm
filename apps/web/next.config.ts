import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@unified/typescript-client",
    "@unified/typescript-types",
    "@unified/validation-schemas",
    "@unified/design-tokens"
  ],
};

export default nextConfig;
