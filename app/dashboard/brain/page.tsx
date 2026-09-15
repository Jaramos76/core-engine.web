"use client";

import { useEffect } from "react";

export default function BrainPage() {
  useEffect(() => {
    window.location.replace(
      "/api/v1/ais-brain/"
    );
  }, []);

  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        placeItems: "center",
        background: "#000001",
        color: "#e5e7eb",
        fontFamily:
          "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "18px",
            marginBottom: "8px",
          }}
        >
          Opening Core Engine Brain…
        </div>

        <a
          href="/api/v1/ais-brain/"
          style={{
            color: "#93c5fd",
          }}
        >
          Open Brain directly
        </a>
      </div>
    </main>
  );
}
