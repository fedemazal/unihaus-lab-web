import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo") ?? "propietarios";

  const isPropietario = tipo === "propietarios";
  const titulo = isPropietario
    ? "Guía para Propietarios"
    : "Guía para Inquilinos";
  const subtitulo = isPropietario
    ? "Preparación ambiente por ambiente para tu sesión fotográfica"
    : "Checklist breve para recibir al fotógrafo";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "#0D1117",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px 100px",
          fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        {/* Top accent line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "6px",
            background: "#F2B968",
            display: "flex",
          }}
        />

        {/* Brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "56px",
          }}
        >
          <div
            style={{
              width: "52px",
              height: "52px",
              background: "#F2B968",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0D1117"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <span
            style={{
              fontSize: "22px",
              fontWeight: "700",
              color: "#E2ECF4",
              letterSpacing: "-0.5px",
            }}
          >
            Unihaus Lab
          </span>
        </div>

        {/* Label */}
        <div
          style={{
            display: "flex",
            background: "#F2B968",
            color: "#0D1117",
            fontSize: "14px",
            fontWeight: "700",
            padding: "6px 18px",
            borderRadius: "100px",
            letterSpacing: "1px",
            textTransform: "uppercase",
            marginBottom: "28px",
          }}
        >
          Fotografía Inmobiliaria
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "72px",
            fontWeight: "800",
            color: "#E2ECF4",
            lineHeight: "1.05",
            letterSpacing: "-2px",
            marginBottom: "24px",
          }}
        >
          {titulo}
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: "28px",
            color: "#7A96A8",
            lineHeight: "1.4",
            maxWidth: "800px",
          }}
        >
          {subtitulo}
        </div>

        {/* Bottom right decoration */}
        <div
          style={{
            position: "absolute",
            bottom: "60px",
            right: "100px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            color: "#263040",
            fontSize: "18px",
          }}
        >
          www.unihaus.com.ar
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
