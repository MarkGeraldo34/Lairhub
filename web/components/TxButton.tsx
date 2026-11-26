"use client";

import { useEffect } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { CONTRACT } from "@/lib/contract";
import { activeChain } from "@/lib/chains";

type Props = {
  label: string;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
  disabled?: boolean;
  variant?: "ghost" | "danger";
  onDone?: () => void;
};

/** One contract write with its own pending / confirming / error state. Refreshes all reads when mined. */
export default function TxButton({ label, functionName, args, value, disabled, variant, onDone }: Props) {
  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: write.data, chainId: activeChain.id });
  const qc = useQueryClient();

  useEffect(() => {
    if (receipt.isSuccess) {
      qc.invalidateQueries();
      onDone?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt.isSuccess]);

  const busy = write.isPending || receipt.isLoading;
  const err = write.error ?? receipt.error;
  const explorer = activeChain.blockExplorers.default.url;

  return (
    <div className="tx">
      <button
        className={variant}
        disabled={disabled || busy}
        onClick={() =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          write.mutate({ ...CONTRACT, functionName, args, value } as any)
        }
      >
        {write.isPending ? "Confirm in wallet…" : receipt.isLoading ? "Confirming…" : label}
      </button>
      {receipt.isSuccess && write.data && (
        <a className="small" href={`${explorer}/tx/${write.data}`} target="_blank" rel="noreferrer">
          Done · view transaction
        </a>
      )}
      {err && <span className="err small">{"shortMessage" in err ? String(err.shortMessage) : err.message}</span>}
    </div>
  );
}
