const STEPS = [
  { t: 0.04, icon: "🔎", title: "Find a room", text: "Search by city or area. Every room has photos, a video tour and house rules, and the host's phone is verified." },
  { t: 0.3, icon: "🔒", title: "Pay into escrow", text: "Your QIE goes into the StayEscrow smart contract — not to the host. Nobody can touch it yet." },
  { t: 0.56, icon: "🌙", title: "Stay the night", text: "Check in, sleep, check out. Cancel free up to 24 hours before, if plans change." },
  { t: 0.82, icon: "✅", title: "Confirm & host is paid", text: "From 09:00 UTC the next morning, confirm your stay and the host is paid. Problem? Open a dispute instead." },
];

/** Scroll-linked: the line fills and each step lights up as you scroll through the section. */
export default function HowItWorks() {
  return (
    <section className="hiw" aria-labelledby="hiw-title">
      <h2 id="hiw-title" className="reveal">
        How a night works
      </h2>
      <p className="muted reveal" style={{ ["--d" as string]: "80ms" }}>
        Neither side has to trust the other — the contract holds the money until the stay is confirmed.
      </p>
      <div className="hiw-track" data-scrollprog>
        <div className="hiw-line" aria-hidden="true">
          <span />
        </div>
        {STEPS.map((s, i) => (
          <div className="hiw-step" key={s.title} style={{ ["--t" as string]: s.t }}>
            <div className="hiw-dot">{s.icon}</div>
            <div className="hiw-card">
              <span className="hiw-n">0{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
