"use client";

import { useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { formatEther } from "viem";
import { CONTRACT } from "@/lib/contract";
import { dateToNight, nightToISO, todayNight, formatNight, shortAddr } from "@/lib/format";
import type { Listing } from "@/lib/hooks";
import Gallery from "./Gallery";
import TxButton from "./TxButton";
import type { Media } from "@/lib/media";

export default function ListingCard({ listing, media }: { listing: Listing; media?: Media | null }) {
  const { address, isConnected } = useAccount();
  const [date, setDate] = useState("");
  const night = dateToNight(date);
  const valid = night !== null && night >= todayNight();

  const taken = useReadContract({
    ...CONTRACT,
    functionName: "nightTaken",
    args: night !== null ? [BigInt(listing.id), BigInt(night)] : undefined,
    query: { enabled: valid },
  });

  const mine = address?.toLowerCase() === listing.host.toLowerCase();

  return (
    <article className="card listing">
      <div className="glow" aria-hidden />
      {media && <Gallery media={media} title={listing.title} />}
      <h3>{listing.title}</h3>
      <p className="muted">📍 {listing.area}</p>
      <p className="price">
        {formatEther(listing.price)} <span>QIE / night</span>
      </p>
      <p className="small muted">Host {shortAddr(listing.host)}</p>
      {media?.houseRules && (
        <details className="rules">
          <summary>House rules</summary>
          <p>{media.houseRules}</p>
          <p className="muted small">The host&apos;s phone number is shared with you once you book.</p>
        </details>
      )}

      {listing.active ? (
        <div className="book">
          <label>
            Night of
            <input type="date" min={nightToISO(todayNight())} value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          {valid && taken.data === true && <p className="err small">That night is already booked.</p>}
          {valid && taken.data === false && <p className="ok small">{formatNight(night!)} is free.</p>}
          {mine ? (
            <p className="small muted">This is your listing.</p>
          ) : !isConnected ? (
            <p className="small muted">Connect your wallet to book.</p>
          ) : (
            <TxButton
              label={`Book & pay ${formatEther(listing.price)} QIE`}
              functionName="bookNight"
              args={[BigInt(listing.id), BigInt(night ?? 0)]}
              value={listing.price}
              disabled={!valid || taken.data === true}
              onDone={() => setDate("")}
            />
          )}
        </div>
      ) : (
        <p className="small muted">Not accepting guests right now.</p>
      )}
    </article>
  );
}
