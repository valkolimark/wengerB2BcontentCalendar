import { BRANDS, tint } from "@/lib/brands";

// Five large, heavily-blurred brand blobs drifting slowly behind everything.
// Hidden unless the Vivid theme is active (see `.v-backdrop` in globals.css).
// Pure atmosphere: fixed, pointer-events:none, z-index:-10.
const BLOBS = [
  { brand: "wenger", top: "-8%", left: "-6%", size: 460, dur: "30s", delay: "0s", dx: "60px", dy: "40px", a: 0.3 },
  { brand: "cc", top: "12%", left: "70%", size: 400, dur: "34s", delay: "-6s", dx: "-50px", dy: "50px", a: 0.26 },
  { brand: "lutefish", top: "55%", left: "8%", size: 420, dur: "28s", delay: "-12s", dx: "45px", dy: "-40px", a: 0.24 },
  { brand: "gearboss", top: "68%", left: "62%", size: 380, dur: "32s", delay: "-3s", dx: "-55px", dy: "-30px", a: 0.22 },
  { brand: "jrclancy", top: "30%", left: "34%", size: 340, dur: "26s", delay: "-9s", dx: "40px", dy: "60px", a: 0.2 },
];

export function VividBackdrop() {
  const byId = Object.fromEntries(BRANDS.map((b) => [b.id, b]));
  return (
    <div className="v-backdrop" aria-hidden>
      {BLOBS.map((b, i) => {
        const dot = byId[b.brand]?.dot ?? "#888";
        return (
          <span
            key={i}
            className="v-blob"
            style={
              {
                top: b.top,
                left: b.left,
                width: b.size,
                height: b.size,
                background: tint(dot, b.a),
                "--dur": b.dur,
                "--delay": b.delay,
                "--dx": b.dx,
                "--dy": b.dy,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
