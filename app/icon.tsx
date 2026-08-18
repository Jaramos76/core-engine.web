import { ImageResponse } from "next/og";
import { LOGO_DATA_URI } from "./logo-data-uri";

export const size = { width: 32, height: 32 };
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
          background: "#0a0b0d",
          border: "1px solid #22262c",
        }}
      >
        <img src={LOGO_DATA_URI} width={24} height={24} alt="" />
      </div>
    ),
    { ...size }
  );
}
