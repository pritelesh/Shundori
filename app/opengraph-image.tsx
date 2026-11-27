import { ImageResponse } from "next/og";

export const alt = "Shundori cosmetics and skincare";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#fff4db",
          padding: 80,
          color: "#1f1f1f",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, letterSpacing: 8 }}>
          Shundori
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 72,
            lineHeight: 1.1,
            maxWidth: 900,
          }}
        >
          Beauty, thoughtfully curated.
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 26,
            color: "#046a38",
          }}
        >
          <span>Cosmetics &amp; skincare</span>
          <span>Bangladesh</span>
        </div>
      </div>
    ),
    size,
  );
}
