import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// LairHub reads everything from the chain, so no incremental cache (R2) is needed.
export default defineCloudflareConfig();
