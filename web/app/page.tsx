"use client";

import { useState } from "react";
import ListingCard from "@/components/ListingCard";
import { useListings } from "@/lib/hooks";

export default function Home() {
  const { listings, isLoading } = useListings();
  const [q, setQ] = useState("");
  const shown = listings.filter(
    (l) => l.active && `${l.title} ${l.area}`.toLowerCase().includes(q.trim().toLowerCase())
  );

  return (
    <>
      <section className="hero">
        <h1>A bed for tonight.</h1>
        <p>
          Locals open a spare room for one night. You pay into escrow when you book, and the host is paid only after
          you confirm the stay happened — so neither side has to trust the other.
        </p>
        <input
          className="search"
          placeholder="Search by city, area or place name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </section>

      {isLoading && <p className="muted">Loading rooms…</p>}
      {!isLoading && shown.length === 0 && (
        <p className="muted">No rooms match yet. Be the first — open your spare room from the Host tab.</p>
      )}
      <div className="grid">
        {shown.map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </div>
    </>
  );
}
