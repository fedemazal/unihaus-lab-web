import { NextRequest, NextResponse } from "next/server";

const ZOHO_TOKEN_URL = "https://accounts.zoho.com/oauth/v2/token";
const ZOHO_API_BASE = "https://calendar.zoho.com/api/v1";

async function getZohoAccessToken(): Promise<string> {
  const res = await fetch(
    `${ZOHO_TOKEN_URL}?grant_type=refresh_token&client_id=${process.env.ZOHO_CLIENT_ID}&client_secret=${process.env.ZOHO_CLIENT_SECRET}&refresh_token=${process.env.ZOHO_REFRESH_TOKEN}`,
    { method: "POST" }
  );
  const data = await res.json();
  if (!data.access_token) throw new Error("Failed to get Zoho access token");
  return data.access_token;
}

function buildZohoDateTime(fecha: string, hora: string): string {
  // fecha: "2026-08-19", hora: "09:00" → "20260819T090000Z" (Zoho uses UTC-style or local)
  const clean = hora.replace(":", "").padEnd(4, "0");
  return `${fecha.replace(/-/g, "")}T${clean}00`;
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ZOHO_CLIENT_ID || !process.env.ZOHO_CLIENT_SECRET || !process.env.ZOHO_REFRESH_TOKEN) {
      console.warn("Zoho Calendar not configured, skipping");
      return NextResponse.json({ ok: true, skipped: true });
    }

    const body = await req.json();
    const { action, data } = body;

    const token = await getZohoAccessToken();
    const calendarId = process.env.ZOHO_CALENDAR_ID;

    if (action === "create") {
      const {
        fecha,
        horario,
        direccion,
        agenteNombre,
        agenteEmail,
        agenteTelefono,
        tipoPropiedad,
        metraje,
        servicios,
      } = data;

      const startHora = horario?.split(/[-–]/)[0]?.trim() || "09:00";
      const endDate = new Date(
        `${fecha}T${startHora.length === 5 ? startHora : startHora + ":00"}`
      );
      endDate.setHours(endDate.getHours() + 2);
      const endHora = `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;

      const addressParts = direccion.split(",").map((p: string) => p.trim());
      const barrio = addressParts.length >= 2 ? addressParts[1] : "";
      const tipoLabel = tipoPropiedad === "casa" ? "Casa" : "Depto";
      const title = [tipoLabel, agenteNombre, barrio].filter(Boolean).join(" - ");

      const descLines = [
        `Direccion: ${direccion}`,
        `Agente: ${agenteNombre}`,
        agenteTelefono ? `Tel: ${agenteTelefono}` : null,
        agenteEmail ? `Email: ${agenteEmail}` : null,
        `Tipo: ${tipoPropiedad === "casa" ? "Casa" : "Departamento"}`,
        metraje ? `Metraje: ${metraje}` : null,
        "Servicios: " + (servicios || []).join(", "),
      ].filter(Boolean);

      const eventData: Record<string, unknown> = {
        title,
        dateandtime: {
          start: buildZohoDateTime(fecha, startHora),
          end: buildZohoDateTime(fecha, endHora),
          timezone: "America/Argentina/Buenos_Aires",
        },
        location: direccion,
        description: descLines.join("\n"),
      };

      // Zoho attendees only accept { email }
      if (agenteEmail) {
        eventData.attendees = [{ email: agenteEmail }];
      }

      const formBody = new URLSearchParams();
      formBody.append("eventdata", JSON.stringify(eventData));

      const res = await fetch(`${ZOHO_API_BASE}/calendars/${calendarId}/events`, {
        method: "POST",
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formBody.toString(),
      });

      const result = await res.json();
      if (!res.ok) {
        console.error("Zoho create event error:", result);
        return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
      }

      const eventId = result?.events?.[0]?.uid || result?.uid || null;
      return NextResponse.json({ ok: true, eventId });
    }

    if (action === "delete") {
      const { eventId } = data;
      const res = await fetch(`${ZOHO_API_BASE}/calendars/${calendarId}/events/${eventId}`, {
        method: "DELETE",
        headers: { Authorization: `Zoho-oauthtoken ${token}` },
      });
      if (!res.ok) console.warn("Zoho delete event warning:", await res.text());
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Calendar error:", error);
    return NextResponse.json({ error: "Calendar operation failed" }, { status: 500 });
  }
}
