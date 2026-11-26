import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;

// Lets `next dev` use Cloudflare bindings/vars from wrangler.jsonc and .dev.vars locally.
initOpenNextCloudflareForDev();
