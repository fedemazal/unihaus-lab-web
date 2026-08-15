export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { collection, getDocs, query, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/config";
import { Timestamp } from "firebase/firestore";
import type { Production, UserProfile } from "@/types";
import { recordatorioPago } from "@/lib/email/templates";

const PLAZO_DIAS = 5;
const CRON_SECRET = process.env.CRON_SECRET;

// GET /api/cron/recordatorios-pago
// Llamar diariamente. Envía recordatorio en día 3 y día 5 de vencimiento.
// Requiere header: Authorization: Bearer <CRON_SECRET>
export async function GET(req: Request) {
  if (CRON_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const db = getFirebaseDb();
  const hoy = new Date();

  // Cargar todas las producciones listas e impagas
  const prodsSnap = await getDocs(
    query(collection(db, "producciones"), where("estado", "==", "listo"), where("pagada", "==", false))
  );
  const prods = prodsSnap.docs.map((d) => ({ ...d.data(), id: d.id } as Production));

  // Agrupar por agente
  const byAgente: Record<string, Production[]> = {};
  for (const p of prods) {
    if (!byAgente[p.agenteId]) byAgente[p.agenteId] = [];
    byAgente[p.agenteId].push(p);
  }

  const enviados: string[] = [];

  for (const [agenteId, agenteProds] of Object.entries(byAgente)) {
    // Fecha de última producción listo
    const fechas = agenteProds.map((p) => {
      const f = p.fechaListo;
      if (!f) return new Date(0);
      return f instanceof Timestamp ? f.toDate() : new Date(f as unknown as string);
    });
    const ultimaFecha = new Date(Math.max(...fechas.map((d) => d.getTime())));
    const vto = new Date(ultimaFecha.getTime() + PLAZO_DIAS * 24 * 60 * 60 * 1000);
    const diasRestantes = Math.ceil((vto.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

    // Enviar en día 3 (diasRestantes === 3) y día 5 (diasRestantes === 0 o 1, i.e. último día)
    const esDia3 = diasRestantes === 3;
    const esUltimoDia = diasRestantes <= 1 && diasRestantes >= 0;
    if (!esDia3 && !esUltimoDia) continue;

    // Obtener datos del agente
    const userSnap = await getDocs(query(collection(db, "users"), where("__name__", "==", agenteId)));
    if (userSnap.empty) continue;
    const user = { ...userSnap.docs[0].data(), uid: userSnap.docs[0].id } as UserProfile;

    const saldoPendiente = agenteProds.reduce((sum, p) => sum + (p.precioFinal || 0), 0);
    const template = recordatorioPago({
      nombre: user.nombre,
      saldoPendiente,
      diasRestantes,
      producciones: agenteProds.length,
      esUltimoDia,
    });

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: user.email, subject: template.subject, html: template.html }),
    });

    if (res.ok) enviados.push(`${user.email} (${esDia3 ? "día 3" : "último día"})`);
  }

  return NextResponse.json({ ok: true, enviados });
}
