"use client";

import { useAccount } from "wagmi";
import { formatEther } from "viem";
import TxButton from "@/components/TxButton";
import PendingBanner from "@/components/PendingBanner";
import { useBookings, useListings } from "@/lib/hooks";
import { BOOKED, DAY, FREE_CANCEL_WINDOW, STATUS } from "@/lib/contract";
import { formatNight, formatTime } from "@/lib/format";

export default function Trips() {
  const { address, isConnected } = useAccount();
  const { bookings, isLoading } = useBookings();
  const { listings } = useListings();
  const now = Math.floor(Date.now() / 1000);

  if (!isConnected) return <p className="muted">Connect your wallet to see your trips.</p>;

  const mine = bookings.filter((b) => b.guest.toLowerCase() === address?.toLowerCase()).reverse();

  return (
    <>
      <h2>My trips</h2>
      <PendingBanner />
      {isLoading && <p className="muted">Loading…</p>}
      {!isLoading && mine.length === 0 && <p className="muted">No bookings yet.</p>}
      <div className="list">
        {mine.map((b) => {
          const listing = listings.find((l) => l.id === b.listingId);
          const booked = b.status === BOOKED;
          const canCancel = booked && now + FREE_CANCEL_WINDOW <= b.night * DAY;
          const canConfirm = booked && now >= b.releaseAt; // the host is paid the moment you confirm
          const canDispute = booked && now < b.autoReleaseAt;
          const windowClosed = booked && now >= b.autoReleaseAt;
          return (
            <div className="card row" key={b.id}>
              <div>
                <strong>{listing?.title ?? `Listing #${b.listingId}`}</strong>
                <div className="muted small">
                  {listing?.area} · night of {formatNight(b.night)} · {formatEther(b.amount)} QIE
                </div>
                <div className="small">
                  <span className={`badge s${b.status}`}>{STATUS[b.status]}</span>
                  {booked && !canConfirm && (
                    <span className="muted"> You can confirm your stay from {formatTime(b.releaseAt)}.</span>
                  )}
                  {booked && canConfirm && !windowClosed && (
                    <span className="muted">
                      {" "}
                      Did your stay happen? Confirming pays the host. If you do nothing, the host is paid
                      automatically on {formatTime(b.autoReleaseAt)}.
                    </span>
                  )}
                  {windowClosed && <span className="muted"> The confirm window has closed; the host can now collect payment.</span>}
                </div>
              </div>
              <div className="actions">
                {canConfirm && canDispute && (
                  <TxButton label="Confirm stay & pay host" functionName="confirmStay" args={[BigInt(b.id)]} />
                )}
                {canCancel && (
                  <TxButton label="Cancel (full refund)" functionName="cancelByGuest" args={[BigInt(b.id)]} variant="ghost" />
                )}
                {canDispute && (
                  <TxButton label="Report a problem" functionName="dispute" args={[BigInt(b.id)]} variant="danger" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
