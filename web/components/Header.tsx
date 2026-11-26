"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useConnect, useConnectors, useDisconnect, useSwitchChain } from "wagmi";
import { activeChain } from "@/lib/chains";
import { configured } from "@/lib/contract";
import { shortAddr } from "@/lib/format";

export default function Header() {
  const path = usePathname();
  const { address, isConnected, chainId } = useAccount();
  const connect = useConnect();
  const connectors = useConnectors();
  const { disconnect } = useDisconnect();
  const switchChain = useSwitchChain();

  const link = (href: string, label: string) => (
    <Link href={href} className={path === href ? "nav on" : "nav"}>
      {label}
    </Link>
  );

  return (
    <>
      <header className="bar">
        <div className="wrap barin">
          <Link href="/" className="logo">
            <span className="moon" aria-hidden /> LairHub
          </Link>
          <nav>
            {link("/", "Find a bed")}
            {link("/trips", "My trips")}
            {link("/host", "Host")}
          </nav>
          <div className="wallet">
            {isConnected ? (
              <>
                <span className="pill">{shortAddr(address)}</span>
                <button className="ghost" onClick={() => disconnect()}>
                  Disconnect
                </button>
              </>
            ) : (
              <button onClick={() => connect.mutate({ connector: connectors[0] })} disabled={connect.isPending}>
                {connect.isPending ? "Connecting…" : "Connect QIE Wallet"}
              </button>
            )}
          </div>
        </div>
      </header>

      {!configured && (
        <div className="notice">
          Contract not configured. Deploy <code>StayEscrow</code> and set <code>NEXT_PUBLIC_CONTRACT_ADDRESS</code>.
        </div>
      )}
      {isConnected && chainId !== activeChain.id && (
        <div className="notice">
          Wrong network. This app runs on {activeChain.name} (chain {activeChain.id}).{" "}
          <button onClick={() => switchChain.mutate({ chainId: activeChain.id })} disabled={switchChain.isPending}>
            Switch network
          </button>
        </div>
      )}
      {connect.error && <div className="notice">{connect.error.message}</div>}
    </>
  );
}
