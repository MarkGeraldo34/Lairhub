"use client";

import { useEffect, useState } from "react";

type Phase = "idle" | "starting" | "waiting" | "verified" | "failed";

/**
 * Proves the host owns `phone` via the LairHub Telegram bot. Calls onVerified(token) when done, and
 * onVerified(null) again as soon as the phone number is edited.
 */
export default function TelegramVerify({
  phone,
  onVerified,
}: {
  /** Normalised phone number, or "" while the field is empty/invalid. */
  phone: string;
  onVerified: (token: string | null) => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [token, setToken] = useState("");
  const [link, setLink] = useState("");
  const [err, setErr] = useState("");
  const [forPhone, setForPhone] = useState("");

  // Editing the number cancels any earlier verification.
  useEffect(() => {
    if (forPhone && phone !== forPhone) {
      setPhase("idle");
      setToken("");
      setLink("");
      setErr("");
      setForPhone("");
      onVerified(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone]);

  // Poll until the bot confirms.
  useEffect(() => {
    if (phase !== "waiting" || !token) return;
    let live = true;
    const tick = async () => {
      try {
        const r = await fetch(`/api/telegram/status?token=${token}`, { cache: "no-store" });
        const j = await r.json();
        if (!live) return;
        if (j.status === "verified") {
          setPhase("verified");
          onVerified(token);
        } else if (j.status === "failed") {
          setErr(j.reason || "Number didn't match.");
          setPhase("failed");
        } else if (j.status === "expired") {
          setErr("The link expired. Start again.");
          setPhase("failed");
        }
      } catch {
        /* keep polling */
      }
    };
    const t = setInterval(tick, 2000);
    return () => {
      live = false;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, token]);

  async function start() {
    setPhase("starting");
    setErr("");
    try {
      const r = await fetch("/api/telegram/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Could not start verification");
      setToken(j.token);
      setLink(j.link);
      setForPhone(phone);
      setPhase("waiting");
      window.open(j.link, "_blank", "noopener");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not start verification");
      setPhase("failed");
    }
  }

  if (phase === "verified") {
    return <p className="ok small tgv">✓ Phone verified with Telegram</p>;
  }
  return (
    <div className="tgv">
      {(phase === "idle" || phase === "starting" || phase === "failed") && (
        <button type="button" className="ghost" disabled={!phone || phase === "starting"} onClick={start}>
          {phase === "starting" ? "Starting…" : phase === "failed" ? "Try again" : "Verify with Telegram"}
        </button>
      )}
      {phase === "waiting" && (
        <div className="small">
          <p className="muted">
            In Telegram, press <strong>Start</strong> and tap <strong>“Share my phone number”</strong>. Waiting for
            confirmation…
          </p>
          <a href={link} target="_blank" rel="noopener noreferrer">
            Open Telegram again
          </a>
        </div>
      )}
      {err && <p className="err small">{err}</p>}
      {phase === "idle" && !phone && <p className="muted small">Enter your phone number above, then verify it.</p>}
    </div>
  );
}
