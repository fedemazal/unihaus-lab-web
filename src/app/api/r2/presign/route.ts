import { NextRequest, NextResponse } from "next/server";
import { r2UploadSignedUrl } from "@/lib/r2";

// POST /api/r2/presign
// Body: { produccionId: string, nombre: string, contentType: string }
// Devuelve una URL firmada para que el browser suba directo a R2
export async function POST(req: NextRequest) {
  try {
    const { produccionId, nombre, contentType } = await req.json();
    if (!produccionId || !nombre || !contentType) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }
    // Sanitize filename
    const safeName = nombre.replace(/[^a-zA-Z0-9._\-() ]/g, "_");
    const key = `producciones/${produccionId}/${Date.now()}-${safeName}`;
    const url = await r2UploadSignedUrl(key, contentType, 3600);
    return NextResponse.json({ url, key });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
