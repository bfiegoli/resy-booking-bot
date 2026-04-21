import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Maître d' — automated Resy reservation booking";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #09090b 0%, #18181b 50%, #09090b 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Subtle radial glow */}
        <div
          style={{
            position: "absolute",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(193,39,45,0.15) 0%, transparent 70%)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* Emoji */}
        <div style={{ fontSize: 96, marginBottom: 16 }}>🍽️</div>

        {/* Name */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "white",
            letterSpacing: "-2px",
            display: "flex",
            alignItems: "baseline",
          }}
        >
          <span>Maître</span>
          <span style={{ color: "#e04850", marginLeft: 14 }}>d&apos;</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: "#71717a",
            marginTop: 16,
            letterSpacing: "0.5px",
          }}
        >
          Automated Resy reservation booking
        </div>

        {/* Bottom accent line */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "linear-gradient(90deg, transparent, #c1272d, #e04850, #c1272d, transparent)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
