import { NextRequest, NextResponse } from "next/server";
import { r2SignedUrl } from "@/lib/r2";

// GET /api/r2/download?key=producciones/...
// Genera una URL firmada de descarga válida por 1 hora
export async function GET(req: NextRequest) {
  try {
    const key = req.nextUrl.searchParams.get("key");
    if (!key) return NextResponse.json({ error: "Falta el parámetro key" }, { status: 400 });
    const url = await r2SignedUrl(key, 3600);
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
