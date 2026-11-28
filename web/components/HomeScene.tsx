// Decorative night-forest scene for the hero. Pure SVG + CSS (no video, no images), so it loads instantly.
// Layers move at different speeds as you scroll (see --sy in globals.css) for a parallax depth effect.

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function pines(seed: number, n: number, minH: number, maxH: number, base: number, skip: [number, number][] = []) {
  const r = rng(seed);
  let d = "";
  for (let i = 0; i < n; i++) {
    const x = (i + r() * 0.8) * (1440 / n);
    if (skip.some(([a, b]) => x > a && x < b)) continue;
    const h = minH + r() * (maxH - minH);
    const w = h * 0.4;
    const y = base;
    d += `M${x},${y - h}L${x + w * 0.34},${y - h * 0.64}L${x + w * 0.17},${y - h * 0.64}L${x + w * 0.5},${y - h * 0.32}L${x + w * 0.25},${y - h * 0.32}L${x + w * 0.62},${y}L${x - w * 0.62},${y}L${x - w * 0.25},${y - h * 0.32}L${x - w * 0.5},${y - h * 0.32}L${x - w * 0.17},${y - h * 0.64}L${x - w * 0.34},${y - h * 0.64}Z`;
  }
  return d;
}

const STARS = (() => {
  const r = rng(7);
  return Array.from({ length: 46 }, () => ({
    x: r() * 100,
    y: r() * 62,
    s: 1 + r() * 1.6,
    d: r() * 5,
  }));
})();

export default function HomeScene() {
  return (
    <div className="scene" aria-hidden="true">
      <div className="scene-sky" />
      <div className="scene-layer l-stars">
        {STARS.map((s, i) => (
          <i key={i} style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDelay: `${s.d}s` }} />
        ))}
      </div>
      <div className="scene-layer l-moon">
        <span className="scene-moon" />
      </div>

      <div className="scene-layer l-back">
        <svg viewBox="0 0 1440 420" preserveAspectRatio="xMidYMax slice">
          <path d={pines(11, 34, 90, 170, 420)} fill="#12313d" />
          <g>
            <rect x="214" y="352" width="46" height="30" fill="#0d2530" />
            <path d="M206 352 L237 330 L268 352Z" fill="#0b202a" />
            <rect className="win" x="228" y="360" width="9" height="11" rx="1" fill="#ffb454" />
          </g>
        </svg>
      </div>

      <div className="scene-mist m1" />

      <div className="scene-layer l-mid">
        <svg viewBox="0 0 1440 420" preserveAspectRatio="xMidYMax slice">
          <path d={pines(23, 22, 140, 250, 420, [[900, 1130]])} fill="#0c2530" />
          {/* the cabin with the lamp on */}
          <g>
            <rect x="930" y="316" width="170" height="104" fill="#081a23" />
            <path d="M914 318 L1015 252 L1116 318Z" fill="#06151c" />
            <rect x="1062" y="262" width="16" height="36" fill="#06151c" />
            <rect className="win" x="958" y="344" width="34" height="38" rx="2" fill="#ffb454" />
            <rect className="win w2" x="1024" y="344" width="34" height="38" rx="2" fill="#ff9f5a" />
            <rect x="1074" y="360" width="16" height="60" fill="#050f15" />
            <ellipse className="glow-pool" cx="1015" cy="420" rx="150" ry="22" fill="#ffb454" />
          </g>
        </svg>
      </div>

      <div className="scene-mist m2" />

      <div className="scene-layer l-front">
        <svg viewBox="0 0 1440 420" preserveAspectRatio="xMidYMax slice">
          <path d={pines(41, 12, 220, 360, 440)} fill="#040d12" />
          <rect x="0" y="400" width="1440" height="40" fill="#040d12" />
        </svg>
      </div>
      <div className="scene-fade" />
    </div>
  );
}
