import { NextResponse } from "next/server";
import { createPublicClient, createWalletClient, fallback, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { activeChain } from "@/lib/chains";
import { abi, CONTRACT_ADDRESS, configured, autoReleaseAtOf, BOOKED } from "@/lib/contract";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Fallback payout keeper. Normally the guest confirms the stay and the host is paid at once. If a
 * guest neither confirms nor disputes within the 24h confirm window, a daily scheduled trigger (keeper-cron Worker) calls release()
 * so the host isn't left unpaid. release() is permissionless — the keeper key can only trigger
 * payouts that are already owed, never redirect or withdraw funds.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const key = process.env.KEEPER_PRIVATE_KEY;
  if (!key || !configured) {
    return NextResponse.json({ error: "keeper not configured" }, { status: 500 });
  }

  const transport = fallback(activeChain.rpcUrls.default.http.map((u) => http(u)));
  const publicClient = createPublicClient({ chain: activeChain, transport });
  const walletClient = createWalletClient({
    account: privateKeyToAccount(key as `0x${string}`),
    chain: activeChain,
    transport,
  });

  const count = await publicClient.readContract({ address: CONTRACT_ADDRESS, abi, functionName: "bookingCount" });
  const now = Math.floor(Date.now() / 1000);
  const released: number[] = [];
  const failed: { id: number; error: string }[] = [];

  for (let id = 1n; id <= count; id++) {
    const b = await publicClient.readContract({ address: CONTRACT_ADDRESS, abi, functionName: "bookings", args: [id] });
    const night = Number(b[4]);
    const status = b[6];
    if (status !== BOOKED || now < autoReleaseAtOf(night)) continue;
    try {
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: "release",
        args: [id],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      released.push(Number(id));
    } catch (e) {
      failed.push({ id: Number(id), error: e instanceof Error ? e.message.slice(0, 200) : "unknown" });
    }
  }

  return NextResponse.json({ checked: Number(count), released, failed });
}
