import { NextRequest, NextResponse } from "next/server";
import { r2HeadObject } from "@/lib/r2";
import { setEntregaActiva } from "@/lib/firebase/firestore";
import type { ArchivoR2 } from "@/types";

// POST /api/r2/confirm
// Body: { produccionId: string, archivos: ArchivoR2[] }
// Verifica que los archivos existan en R2 y actualiza Firestore
export async function POST(req: NextRequest) {
  try {
    const { produccionId, archivos } = await req.json() as {
      produccionId: string;
      archivos: ArchivoR2[];
    };
    if (!produccionId || !archivos?.length) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    // Verificar que cada archivo exista en R2 y obtener tamaño real
    const archivosVerificados: ArchivoR2[] = await Promise.all(
      archivos.map(async (a) => {
        const { size } = await r2HeadObject(a.key);
        return { ...a, size };
      })
    );

    await setEntregaActiva(produccionId, archivosVerificados);
    return NextResponse.json({ ok: true, archivos: archivosVerificados });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
