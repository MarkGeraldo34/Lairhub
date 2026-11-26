import { createConfig, http, fallback } from "wagmi";
import { injected } from "wagmi/connectors";
import { qieMainnet, qieTestnet } from "./chains";

// QIE Wallet is a standard EIP-1193 injected provider, so `injected()` (EIP-6963 discovery) finds it.
export const config = createConfig({
  chains: [qieTestnet, qieMainnet],
  connectors: [injected()],
  transports: {
    [qieTestnet.id]: fallback(qieTestnet.rpcUrls.default.http.map((u) => http(u))),
    [qieMainnet.id]: fallback(qieMainnet.rpcUrls.default.http.map((u) => http(u))),
  },
  ssr: true,
});
