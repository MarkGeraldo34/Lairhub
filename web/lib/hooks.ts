"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { CONTRACT, configured, releaseAtOf, autoReleaseAtOf } from "./contract";

export type Listing = {
  id: number;
  host: `0x${string}`;
  price: bigint;
  active: boolean;
  title: string;
  area: string;
  uri: string;
};

export type BookingRow = {
  id: number;
  listingId: number;
  guest: `0x${string}`;
  host: `0x${string}`;
  amount: bigint;
  night: number;
  feeBps: number;
  status: number;
  /** Guest can confirm from here (09:00 UTC the morning after). */
  releaseAt: number;
  /** If the guest hasn't confirmed or disputed by here, the host can be paid anyway. */
  autoReleaseAt: number;
};

const ids = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

export function useListings() {
  const count = useReadContract({ ...CONTRACT, functionName: "listingCount", query: { enabled: configured } });
  const n = Number(count.data ?? 0n);
  const res = useReadContracts({
    contracts: ids(n).map((id) => ({ ...CONTRACT, functionName: "listings" as const, args: [BigInt(id)] as const })),
    query: { enabled: configured && n > 0 },
  });
  const listings: Listing[] = (res.data ?? []).flatMap((r, i) => {
    if (r.status !== "success") return [];
    const [host, price, active, title, area, uri] = r.result as readonly [
      `0x${string}`,
      bigint,
      boolean,
      string,
      string,
      string,
    ];
    return [{ id: i + 1, host, price, active, title, area, uri }];
  });
  return { listings, isLoading: count.isLoading || res.isLoading };
}

export function useBookings() {
  const count = useReadContract({ ...CONTRACT, functionName: "bookingCount", query: { enabled: configured } });
  const n = Number(count.data ?? 0n);
  const res = useReadContracts({
    contracts: ids(n).map((id) => ({ ...CONTRACT, functionName: "bookings" as const, args: [BigInt(id)] as const })),
    query: { enabled: configured && n > 0 },
  });
  const bookings: BookingRow[] = (res.data ?? []).flatMap((r, i) => {
    if (r.status !== "success") return [];
    const [listingId, guest, host, amount, night, feeBps, status] = r.result as readonly [
      bigint,
      `0x${string}`,
      `0x${string}`,
      bigint,
      bigint,
      number,
      number,
    ];
    return [
      {
        id: i + 1,
        listingId: Number(listingId),
        guest,
        host,
        amount,
        night: Number(night),
        feeBps,
        status,
        releaseAt: releaseAtOf(Number(night)),
        autoReleaseAt: autoReleaseAtOf(Number(night)),
      },
    ];
  });
  return { bookings, isLoading: count.isLoading || res.isLoading };
}

export function usePending(address?: `0x${string}`) {
  return useReadContract({
    ...CONTRACT,
    functionName: "pending",
    args: address ? [address] : undefined,
    query: { enabled: configured && !!address },
  });
}
