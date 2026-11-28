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

  // A colour for the host's avatar, derived from their address.
  const hue = parseInt(listing.host.slice(2, 8), 16) % 360;
  const avatar = `linear-gradient(135deg, hsl(${hue} 70% 62%), hsl(${(hue + 55) % 360} 70% 42%))`;

  // Cursor spotlight (mouse only).
  function spot(e: React.PointerEvent<HTMLElement>) {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  }

  return (
    <article className="lc" onPointerMove={spot}>
      <div className="lc-media">
        {media ? <Gallery media={media} title={listing.title} /> : <div className="lc-noimg" />}
        <span className="lc-chip lc-area">
          <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
            <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <circle cx="12" cy="9.5" r="2.4" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
          {listing.area}
        </span>
        <span className="lc-chip lc-price">
          <b>{formatEther(listing.price)}</b> QIE <i>per night</i>
        </span>
      </div>

      <div className="lc-body">
        <h3>{listing.title}</h3>
        <div className="lc-host">
          <span className="lc-av" style={{ background: avatar }} aria-hidden="true" />
          <span>
            Hosted by <b>{shortAddr(listing.host)}</b>
          </span>
        </div>
        {media?.houseRules && (
          <details className="lc-rules">
            <summary>House rules</summary>
            <p>{media.houseRules}</p>
            <p className="muted small">The host&apos;s phone number is shared with you once you book.</p>
          </details>
        )}
      </div>

      {listing.active ? (
        <div className="lc-ticket">
