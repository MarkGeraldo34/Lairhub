"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { formatEther, parseEther } from "viem";
import TxButton from "@/components/TxButton";
import PendingBanner from "@/components/PendingBanner";
import { useBookings, useListings } from "@/lib/hooks";
import { BOOKED, STATUS } from "@/lib/contract";
import { formatNight, formatTime, shortAddr } from "@/lib/format";

function parsePrice(v: string): bigint | null {
  try {
    const p = parseEther(v.trim());
    return p > 0n ? p : null;
  } catch {
    return null;
  }
}

export default function Host() {
  const { address, isConnected } = useAccount();
  const { listings } = useListings();
  const { bookings } = useBookings();
  const [title, setTitle] = useState("");
  const [area, setArea] = useState("");
  const [uri, setUri] = useState("");
  const [price, setPrice] = useState("");
  const now = Math.floor(Date.now() / 1000);

  if (!isConnected) return <p className="muted">Connect your wallet to host guests.</p>;

  const me = address!.toLowerCase();
  const mine = listings.filter((l) => l.host.toLowerCase() === me);
  const incoming = bookings.filter((b) => b.host.toLowerCase() === me).reverse();
  const parsed = parsePrice(price);
  const formOk = title.trim() && area.trim() && parsed !== null;

  return (
    <>
      <h2>Open your spare room</h2>
      <PendingBanner />
      <div className="card form">
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quiet room near the airport" />
        </label>
        <label>
          Area <span className="muted small">(neighbourhood only — never your street address)</span>
          <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Lekki Phase 1, Lagos" />
        </label>
        <label>
          Price per night (QIE)
          <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="25" inputMode="decimal" />
        </label>
        <label>
          Details link <span className="muted small">(optional — photos, house rules)</span>
          <input value={uri} onChange={(e) => setUri(e.target.value)} placeholder="https://…" />
        </label>
        <TxButton
          label="Publish listing"
          functionName="createListing"
          args={[title.trim(), area.trim(), uri.trim(), parsed ?? 0n]}
          disabled={!formOk}
          onDone={() => {
            setTitle("");
            setArea("");
            setUri("");
            setPrice("");
          }}
        />
      </div>

      <h2>My listings</h2>
      {mine.length === 0 && <p className="muted">Nothing listed yet.</p>}
      <div className="list">
        {mine.map((l) => (
          <div className="card row" key={l.id}>
            <div>
              <strong>{l.title}</strong>
              <div className="muted small">
                {l.area} · {formatEther(l.price)} QIE / night · {l.active ? "visible" : "paused"}
              </div>
            </div>
            <TxButton
              label={l.active ? "Pause" : "Resume"}
              functionName="updateListing"
              args={[BigInt(l.id), l.price, !l.active, l.uri]}
              variant="ghost"
            />
          </div>
        ))}
      </div>

      <h2>Guests</h2>
      {incoming.length === 0 && <p className="muted">No bookings yet.</p>}
      <div className="list">
        {incoming.map((b) => {
          const listing = listings.find((l) => l.id === b.listingId);
          const booked = b.status === BOOKED;
          const beforeMorning = now < b.releaseAt; // you can still cancel and refund
          const awaitingGuest = booked && !beforeMorning && now < b.autoReleaseAt;
          const canCollect = booked && now >= b.autoReleaseAt; // guest never responded
          const net = b.amount - (b.amount * BigInt(b.feeBps)) / 10000n;
          return (
            <div className="card row" key={b.id}>
              <div>
                <strong>{listing?.title ?? `Listing #${b.listingId}`}</strong>
                <div className="muted small">
                  Guest {shortAddr(b.guest)} · night of {formatNight(b.night)} · you receive {formatEther(net)} QIE
                </div>
                <div className="small">
                  <span className={`badge s${b.status}`}>{STATUS[b.status]}</span>
                  {booked && beforeMorning && (
                    <span className="muted"> Paid when the guest confirms their stay (from {formatTime(b.releaseAt)}).</span>
                  )}
                  {awaitingGuest && (
                    <span className="muted">
                      {" "}
                      Waiting for the guest to confirm. If they don&apos;t respond you can collect on{" "}
                      {formatTime(b.autoReleaseAt)}.
                    </span>
                  )}
                  {canCollect && <span className="muted"> The guest didn&apos;t respond in time — you can collect now.</span>}
                </div>
              </div>
              <div className="actions">
                {canCollect && <TxButton label="Collect payout" functionName="release" args={[BigInt(b.id)]} />}
                {booked && beforeMorning && (
                  <TxButton label="Cancel & refund guest" functionName="cancelByHost" args={[BigInt(b.id)]} variant="ghost" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
