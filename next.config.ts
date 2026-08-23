import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // One deployable modular monolith. Module boundaries live under
  // src/modules/*; Next.js is only the host.

  // Trace the server bundle and its dependencies into .next/standalone, so the
  // runtime image carries neither the source tree nor devDependencies.
  output: "standalone",
  poweredByHeader: false,
};

export default nextConfig;
