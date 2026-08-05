import { NextResponse } from "next/server";
import { r2Upload, r2SignedUrl, r2Delete } from "@/lib/r2";

// GET /api/r2-test
// Sube un archivo de prueba, genera una URL firmada, y devuelve el resultado.
// El archivo se borra del bucket al final para no dejar basura.
export async function GET() {
  const key = `test/prueba-${Date.now()}.txt`;
  const contenido = `Unihaus R2 test — ${new Date().toISOString()}`;

  try {
    // 1. Subir
    await r2Upload(key, Buffer.from(contenido, "utf-8"), "text/plain");

    // 2. Generar URL firmada (válida 5 minutos)
    const url = await r2SignedUrl(key, 300);

    // 3. Borrar el archivo de prueba
    await r2Delete(key);

    return NextResponse.json({
      ok: true,
      mensaje: "Conexión con R2 funcionando correctamente",
      key,
      url,
      nota: "El archivo ya fue borrado del bucket. La URL sigue siendo válida por 5 min.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
