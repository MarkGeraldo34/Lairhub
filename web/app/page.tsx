"use client";

import { useState } from "react";
import ListingCard from "@/components/ListingCard";
import LocationSearch from "@/components/LocationSearch";
import { useListings } from "@/lib/hooks";
import { matchesQuery } from "@/lib/locations";

export default function Home() {
  const { listings, isLoading } = useListings();
  const [q, setQ] = useState("");
  const shown = listings.filter((l) => l.active && matchesQuery(`${l.title} ${l.area}`, q));

  return (
    <>
      <section className="hero">
        <h1>A bed for tonight.</h1>
        <p>
          Locals open a spare room for one night. You pay into escrow when you book, and the host is paid only after
          you confirm the stay happened — so neither side has to trust the other.
        </p>
        <LocationSearch value={q} onChange={setQ} />
      </section>

      {isLoading && <p className="muted">Loading rooms…</p>}
      {!isLoading && shown.length === 0 && (
        <p className="muted">
          {q.trim()
            ? `No rooms in "${q.trim()}" yet. Try a nearby area, or be the first — open your spare room from the Host tab.`
            : "No rooms yet. Be the first — open your spare room from the Host tab."}
        </p>
      )}
      <div className="grid">
        {shown.map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </div>
    </>
  );
}
