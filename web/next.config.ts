import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};
module.exports = {
  allowedDevOrigins: ['192.168.88.8', 'ellen-packet-suite-promotes.trycloudflare.com']
}

export default nextConfig;
