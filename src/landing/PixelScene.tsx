type Variant = "street" | "cafe" | "embankment";

const PAL: Record<Variant, { sky: string; sun: string; far: string; near: string[]; ground: string; walk: string }> = {
  street: { sky: "#f6c768", sun: "#fff1c9", far: "#d9a46a", near: ["#c9391f", "#1d6a4c", "#e8dcc0", "#3a3850"], ground: "#3a3850", walk: "#8d8aa3" },
  cafe: { sky: "#a9d3c4", sun: "#f4ecdc", far: "#7fb2a0", near: ["#f0b83a", "#c9391f", "#e8dcc0", "#1c1b2e"], ground: "#2a2940", walk: "#b8a98a" },
  embankment: { sky: "#f0a58c", sun: "#ffe3a8", far: "#c77d7d", near: ["#1c1b2e", "#3a3850", "#1d6a4c", "#e8dcc0"], ground: "#2a2940", walk: "#7a6f93" },
};

function rnd(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

export default function PixelScene({
  variant = "street",
  slice = false,
  className = "",
}: {
  variant?: Variant;
  slice?: boolean;
  className?: string;
}) {
  const p = PAL[variant];
  const GY = 66;
  const seed = variant === "street" ? 1 : variant === "cafe" ? 7 : 13;

  const far: { x: number; w: number; h: number }[] = [];
  for (let x = -2, i = 0; x < 160; i++) {
    const w = 10 + Math.floor(rnd(seed + i) * 14);
    far.push({ x, w, h: 18 + Math.floor(rnd(seed + i + 40) * 20) });
    x += w;
  }

  const near: { x: number; w: number; h: number; c: string }[] = [];
  for (let x = 2, i = 0; x < 160; i++) {
    const w = 18 + Math.floor(rnd(seed + i + 90) * 14);
    near.push({ x, w, h: 24 + Math.floor(rnd(seed + i + 130) * 22), c: p.near[i % p.near.length] });
    x += w + 2 + Math.floor(rnd(seed + i + 3) * 3);
  }

  return (
    <svg
      viewBox="0 0 160 90"
      preserveAspectRatio={slice ? "xMidYMid slice" : "xMidYMid meet"}
      shapeRendering="crispEdges"
      className={className}
      role="img"
      aria-label="Pixel-art illustration of a Vinnytsia street scene"
    >
      <rect width="160" height="90" fill={p.sky} />
      <rect x="118" y="10" width="14" height="14" fill={p.sun} />
      <rect x="114" y="14" width="22" height="6" fill={p.sun} />
      <rect x="122" y="6" width="6" height="22" fill={p.sun} />
      {[[20, 12, 14], [52, 20, 10], [84, 8, 12]].map(([x, y, w], i) => (
        <g key={i}>
          <rect x={x} y={y} width={w} height="3" fill="#fff" opacity=".75" />
          <rect x={x + 3} y={y - 2} width={w - 6} height="2" fill="#fff" opacity=".75" />
        </g>
      ))}
      {far.map((b, i) => (
        <rect key={i} x={b.x} y={GY - b.h} width={b.w} height={b.h} fill={p.far} />
      ))}
      {near.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={GY - b.h} width={b.w} height={b.h} fill={b.c} />
          <rect x={b.x} y={GY - b.h} width={b.w} height="2" fill="#000" opacity=".18" />
          {Array.from({ length: Math.floor((b.w - 3) / 4) }).map((_, wx) =>
            Array.from({ length: Math.floor((b.h - 6) / 6) }).map((_, wy) => {
              const lit = rnd(seed + i * 31 + wx * 7 + wy * 3) > 0.45;
              return (
                <rect
                  key={`${wx}-${wy}`}
                  x={b.x + 2 + wx * 4}
                  y={GY - b.h + 4 + wy * 6}
                  width="2"
                  height="3"
                  fill={lit ? "#ffe9a6" : "#000"}
                  opacity={lit ? 1 : 0.28}
                />
              );
            })
          )}
        </g>
      ))}
      {variant === "cafe" && (
        <g>
          <rect x="60" y="48" width="40" height="18" fill="#f4ecdc" />
          <rect x="58" y="44" width="44" height="5" fill="#c9391f" />
          {[58, 66, 74, 82, 90, 98].map((x) => (
            <rect key={x} x={x} y="44" width="4" height="5" fill="#f4ecdc" />
          ))}
          <rect x="64" y="52" width="14" height="14" fill="#1c1b2e" />
          <rect x="82" y="53" width="14" height="8" fill="#a9d3c4" />
        </g>
      )}
      {variant === "embankment" && (
        <g>
          <rect y="66" width="160" height="2" fill="#1c1b2e" />
          {Array.from({ length: 16 }).map((_, i) => (
            <rect key={i} x={i * 10 + 3} y="62" width="2" height="6" fill="#1c1b2e" />
          ))}
          <rect y="76" width="160" height="14" fill="#6f87b5" />
          {Array.from({ length: 10 }).map((_, i) => (
            <rect key={i} x={i * 17 + (i % 2) * 5} y={80 + (i % 3) * 3} width="8" height="1" fill="#f4ecdc" opacity=".6" />
          ))}
        </g>
      )}
      <rect y={GY} width="160" height="24" fill={p.ground} />
      <rect y={GY} width="160" height="5" fill={p.walk} />
      {Array.from({ length: 10 }).map((_, i) => (
        <rect key={i} x={i * 18 + 4} y="80" width="9" height="2" fill="#f4ecdc" opacity=".8" />
      ))}
      {variant === "street" && (
        <g>
          <rect x="110" y="38" width="2" height="32" fill="#1c1b2e" />
          <rect x="102" y="32" width="18" height="10" fill="#f0b83a" />
          <rect x="104" y="34" width="14" height="6" fill="#1c1b2e" />
          <rect x="106" y="36" width="10" height="2" fill="#f0b83a" />
        </g>
      )}
      <g className="bob" style={{ transformBox: "fill-box" }}>
        <rect x="36" y="52" width="8" height="5" fill="#1c1b2e" />
        <rect x="37" y="57" width="6" height="5" fill="#f4ecdc" />
        <rect x="36" y="62" width="3" height="8" fill="#c9391f" />
        <rect x="40" y="62" width="3" height="8" fill="#c9391f" />
        <rect x="38" y="53" width="6" height="2" fill="#e9b48a" />
        <rect x="35" y="58" width="2" height="5" fill="#c9391f" />
        <rect x="43" y="58" width="2" height="5" fill="#c9391f" />
      </g>
      {variant === "street" && (
        <g>
          <rect x="52" y="44" width="30" height="10" fill="#f4ecdc" />
          <rect x="52" y="44" width="30" height="10" fill="none" stroke="#1c1b2e" strokeWidth="1" />
          <rect x="55" y="47" width="2" height="2" fill="#1c1b2e" />
          <rect x="59" y="47" width="2" height="2" fill="#1c1b2e" />
          <rect x="63" y="47" width="2" height="2" fill="#1c1b2e" />
          <rect x="52" y="54" width="3" height="2" fill="#f4ecdc" />
        </g>
      )}
    </svg>
  );
}
