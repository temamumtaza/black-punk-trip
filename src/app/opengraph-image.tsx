import { ImageResponse } from "next/og";

export const alt = "Black Punk Trip — Urusan nombok, beresin.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#171715",
          color: "#f7f4ed",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          padding: "72px",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, letterSpacing: 8, textTransform: "uppercase" }}>Black Punk Trip</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", fontSize: 92, letterSpacing: -4, lineHeight: 1 }}>Urusan nombok,</div>
          <div style={{ color: "#d6aa80", display: "flex", fontSize: 92, letterSpacing: -4, lineHeight: 1 }}>beresin.</div>
        </div>
        <div style={{ color: "#c8c2b6", display: "flex", fontSize: 28 }}>Catat talangan · Bagi pengeluaran · Bereskan settlement</div>
      </div>
    ),
    size,
  );
}
