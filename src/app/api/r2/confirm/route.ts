import { NextRequest, NextResponse } from "next/server";
import { r2HeadObject } from "@/lib/r2";
import type { ArchivoR2 } from "@/types";

// POST /api/r2/confirm
// Body: { archivos: ArchivoR2[] }
// Solo verifica que los archivos existan en R2 y devuelve la lista con tamaños reales.
// La escritura a Firestore la hace el cliente directamente (tiene auth de Firebase).
export async function POST(req: NextRequest) {
  try {
    const { archivos } = await req.json() as { archivos: ArchivoR2[] };
    if (!archivos?.length) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const archivosVerificados: ArchivoR2[] = await Promise.all(
      archivos.map(async (a) => {
        const { size } = await r2HeadObject(a.key);
        return { ...a, size };
      })
    );

    return NextResponse.json({ ok: true, archivos: archivosVerificados });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
