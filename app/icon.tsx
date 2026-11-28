import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#14261A",
          color: "#F8F7F0",
          fontFamily: "sans-serif",
          fontSize: 44,
          fontWeight: 800,
          letterSpacing: -2,
          borderRadius: 16,
        }}
      >
        S
      </div>
    ),
    size,
  );
}
