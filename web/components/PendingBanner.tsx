"use client";

import { useAccount } from "wagmi";
import { formatEther } from "viem";
import { usePending } from "@/lib/hooks";
import TxButton from "./TxButton";

/** Funds a payout couldn't be pushed to (e.g. a contract wallet that rejected it) wait here to be pulled. */
export default function PendingBanner() {
  const { address } = useAccount();
  const pending = usePending(address);
  if (!pending.data || pending.data === 0n) return null;
  return (
    <div className="card row">
      <span>You have {formatEther(pending.data)} QIE waiting to be withdrawn.</span>
      <TxButton label="Withdraw" functionName="withdraw" />
    </div>
  );
}
