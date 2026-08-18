import { ImageResponse } from "next/og";
import { LOGO_DATA_URI } from "./logo-data-uri";

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
          justifyContent: "center",
          padding: "80px",
          background: "#0a0b0d",
          color: "#eef0f2",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 32,
          }}
        >
          <img src={LOGO_DATA_URI} width={40} height={40} alt="" />
          <div
            style={{
              fontSize: 22,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#62686f",
            }}
          >
            Core Engine
          </div>
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            maxWidth: 900,
          }}
        >
          An operating foundation for intelligent systems.
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 24,
            color: "#9aa2ac",
          }}
        >
          coreengine.online
        </div>
      </div>
    ),
    { ...size }
  );
}
