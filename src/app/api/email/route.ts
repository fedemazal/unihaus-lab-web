import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import {
  nuevaCuentaAdmin,
  cuentaAprobada,
  cuentaRechazada,
  nuevaProduccionAdmin,
  archivosListos,
  produccionEnProceso,
  horarioConfirmadoAgente,
  horarioReagendadoAgente,
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
  | "produccion_en_proceso"
  | "horario_confirmado"
  | "horario_reagendado";

function buildIcs(fecha: string, horario: string, title: string, location: string, description: string): string {
  // fecha: "2026-08-19", horario: "09:00" or "09:00 - 11:00"
  // Use -03:00 so the local Argentina time is correctly converted to UTC
  const parts = horario.split(/[-–]/);
  const startHora = parts[0].trim();
  const endHora = parts[1]?.trim() || null;
  const [sh, sm] = startHora.split(":").map((n) => n.padStart(2, "0"));
  const startDate = new Date(`${fecha}T${sh}:${sm || "00"}:00-03:00`);
  let endDate: Date;
  if (endHora) {
    const [eh, em] = endHora.split(":").map((n) => n.padStart(2, "0"));
    endDate = new Date(`${fecha}T${eh}:${em || "00"}:00-03:00`);
  } else {
    endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
  }

  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const uid = `prod-${fecha}-${Date.now()}@unihaus.com.ar`;
  const now = fmt(new Date());

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Unihaus LAB//Producciones//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${fmt(startDate)}`,
    `DTEND:${fmt(endDate)}`,
    `SUMMARY:${title}`,
    `LOCATION:${location}`,
    `DESCRIPTION:${description.replace(/\n/g, "\\n")}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT60M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Recordatorio producción Unihaus",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, to, data } = body as {
      type: TemplateType;
      to: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: Record<string, any>;
    };

    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not configured, skipping email");
      return NextResponse.json({ ok: true, skipped: true });
    }

    let email: { subject: string; html: string };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let attachments: any[] = [];

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
      case "horario_confirmado": {
        email = horarioConfirmadoAgente(data as Parameters<typeof horarioConfirmadoAgente>[0]);
        const icsDesc = [
          `Dirección: ${data.direccion}`,
          data.servicios?.length ? `Servicios: ${(data.servicios as string[]).join(", ")}` : "",
        ].filter(Boolean).join("\n");
        const ics = buildIcs(
          data.fecha,
          data.horario,
          `📸 Producción Unihaus — ${data.direccion}`,
          data.direccion,
          icsDesc
        );
        attachments = [{ filename: "produccion-unihaus.ics", content: Buffer.from(ics).toString("base64") }];
        break;
      }
      case "horario_reagendado": {
        email = horarioReagendadoAgente(data as Parameters<typeof horarioReagendadoAgente>[0]);
        const icsDesc = `Dirección: ${data.direccion}\nReagendado desde ${data.fechaAnterior} ${data.horarioAnterior}`;
        const ics = buildIcs(
          data.fechaNueva,
          data.horarioNuevo,
          `📸 Producción Unihaus (reagendada) — ${data.direccion}`,
          data.direccion,
          icsDesc
        );
        attachments = [{ filename: "produccion-unihaus-reagendada.ics", content: Buffer.from(ics).toString("base64") }];
        break;
      }
      default:
        return NextResponse.json({ error: "Invalid template type" }, { status: 400 });
    }

    const result = await resend.emails.send({
      from: FROM,
      to,
      subject: email.subject,
      html: email.html,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    return NextResponse.json({ ok: true, id: result.data?.id });
  } catch (error) {
    console.error("Email error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
