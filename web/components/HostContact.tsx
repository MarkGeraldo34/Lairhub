"use client";

import { useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { contactMessage } from "@/lib/hostInfo";

/** Guest-only: sign a free message to prove the wallet, then the server reveals the host's phone number. */
export default function HostContact({ listingId }: { listingId: number }) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function reveal() {
    if (!address) return;
    setBusy(true);
    setErr("");
    try {
      const timestamp = Date.now();
      const signature = await signMessageAsync({ message: contactMessage(listingId, address, timestamp) });
      const r = await fetch("/api/host-contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listingId, address, timestamp, signature }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Could not load the number");
      setPhone(j.phone);
    } catch (e) {
      setErr(e instanceof Error ? e.message.split("\n")[0] : "Cancelled");
    } finally {
      setBusy(false);
    }
  }

  if (phone) {
    return (
      <div className="small">
        <span className="muted">Host phone: </span>
        <a className="ok" href={`tel:${phone}`}>
          {phone}
        </a>
      </div>
    );
  }
  return (
    <div className="small">
      <button type="button" className="ghost" onClick={reveal} disabled={busy}>
        {busy ? "Check your wallet…" : "Show host phone number"}
      </button>
      {err && <div className="err">{err}</div>}
    </div>
  );
}
