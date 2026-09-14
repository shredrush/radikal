import { ImageResponse } from "next/og";

export const alt = "Radikal outdoor adventures led by expert guides";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "flex-start",
          background: "#1c1917",
          color: "#fff7ed",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          padding: "72px",
          width: "100%",
        }}
      >
        <div style={{ color: "#fb923c", display: "flex", fontSize: 34, fontWeight: 700, letterSpacing: 4 }}>
          RADIKAL
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 930 }}>
          <div style={{ fontSize: 78, fontWeight: 700, letterSpacing: -3, lineHeight: 1.05 }}>
            Learn the skills. Live the adventure.
          </div>
          <div style={{ color: "#fed7aa", fontSize: 30, lineHeight: 1.3 }}>
            Small-group outdoor adventures led by expert guides.
          </div>
        </div>
        <div style={{ color: "#a8a29e", display: "flex", fontSize: 24 }}>radikal.in</div>
      </div>
    ),
    size,
  );
}
