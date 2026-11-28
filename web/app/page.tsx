"use client";

import Link from "next/link";
import { useState } from "react";
import HomeScene from "@/components/HomeScene";
import HowItWorks from "@/components/HowItWorks";
import ListingCard from "@/components/ListingCard";
import LocationSearch from "@/components/LocationSearch";
import { useListings } from "@/lib/hooks";
import { matchesQuery } from "@/lib/locations";

const d = (ms: number) => ({ ["--d" as string]: `${ms}ms` });

export default function Home() {
  const { listings, isLoading } = useListings();
  const [q, setQ] = useState("");
  // A room is only shown once its required photos + video are on file.
  const shown = listings.filter((l) => l.active && l.media && matchesQuery(`${l.title} ${l.area}`, q));

  return (
    <>
      <section className="hero">
        <HomeScene />
        <div className="hero-in">
          <span className="eyebrow reveal" style={d(0)}>
            <i /> Rooms open tonight across Nigeria
          </span>
          <h1 className="reveal" style={d(90)}>
            A bed for tonight.
          </h1>
          <p className="reveal" style={d(180)}>
            Locals open a spare room for one night. You pay into escrow when you book, and the host is paid only after
            you confirm the stay happened — so neither side has to trust the other.
          </p>
          <div className="reveal hero-search" style={d(270)}>
            <LocationSearch value={q} onChange={setQ} />
          </div>
        </div>
      </section>
