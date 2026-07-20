import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import {
  nuevaCuentaAdmin,
  cuentaAprobada,
  cuentaRechazada,
  nuevaProduccionAdmin,
  archivosListos,
  produccionEnProceso,
} from "@/lib/email/templates";

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = process.env.RESEND_FROM_EMAIL || "producciones@unihaus.com.ar";
const FROM = `Unihaus LAB <${ADMIN_EMAIL}>`;

type TemplateType =
  | "nueva_cuenta"
  | "cuenta_aprobada"
  | "cuenta_rechazada"
  | "nueva_produccion"
  | "archivos_listos"
  | "produccion_en_proceso";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, to, data } = body as {
      type: TemplateType;
      to: string;
      data: Record<string, string | number>;
    };

    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not configured, skipping email");
      return NextResponse.json({ ok: true, skipped: true });
    }

    let email: { subject: string; html: string };

    switch (type) {
      case "nueva_cuenta":
        email = nuevaCuentaAdmin(data as Parameters<typeof nuevaCuentaAdmin>[0]);
        break;
      case "cuenta_aprobada":
        email = cuentaAprobada(data as Parameters<typeof cuentaAprobada>[0]);
        break;
      case "cuenta_rechazada":
        email = cuentaRechazada(data as Parameters<typeof cuentaRechazada>[0]);
        break;
      case "nueva_produccion":
        email = nuevaProduccionAdmin(data as Parameters<typeof nuevaProduccionAdmin>[0]);
        break;
      case "archivos_listos":
        email = archivosListos(data as Parameters<typeof archivosListos>[0]);
        break;
      case "produccion_en_proceso":
        email = produccionEnProceso(data as Parameters<typeof produccionEnProceso>[0]);
        break;
      default:
        return NextResponse.json({ error: "Invalid template type" }, { status: 400 });
    }

    const result = await resend.emails.send({
      from: FROM,
      to,
      subject: email.subject,
      html: email.html,
    });

    return NextResponse.json({ ok: true, id: result.data?.id });
  } catch (error) {
    console.error("Email error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
