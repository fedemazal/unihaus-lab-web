import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

function getCalendarClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CALENDAR_CLIENT_ID,
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_CALENDAR_REFRESH_TOKEN,
  });
  return google.calendar({ version: "v3", auth: oauth2Client });
}

export async function POST(req: NextRequest) {
  try {
    if (
      !process.env.GOOGLE_CALENDAR_CLIENT_ID ||
      !process.env.GOOGLE_CALENDAR_CLIENT_SECRET ||
      !process.env.GOOGLE_CALENDAR_REFRESH_TOKEN
    ) {
      console.warn("Google Calendar not configured, skipping");
      return NextResponse.json({ ok: true, skipped: true });
    }

    const body = await req.json();
    const { action, data } = body;

    const calendar = getCalendarClient();

    if (action === "create") {
      const { fecha, horario, direccion, agenteNombre, agenteEmail, tipoPropiedad, metraje, servicios } = data;

      // Parse date (YYYY-MM-DD) and time range
      const startHour = horario?.split("-")[0]?.trim() || "09:00";
      const startDateTime = `${fecha}T${startHour}:00`;

      // Default 2 hours for session
      const endDate = new Date(`${fecha}T${startHour}:00`);
      endDate.setHours(endDate.getHours() + 2);
      const endDateTime = endDate.toISOString();

      // Build description with metraje and services (no prices)
      const descriptionLines = [
        `📍 Dirección: ${direccion}`,
        `👤 Agente: ${agenteNombre}`,
        `🏠 Tipo: ${tipoPropiedad === "casa" ? "Casa" : "Departamento"}`,
        `📐 Metraje: ${metraje || "No especificado"}`,
        "",
        "🎬 Servicios contratados:",
        ...(servicios || []).map((s: string) => `  • ${s}`),
      ];

      // Add agent as attendee if email available
      const attendees = [];
      if (agenteEmail) {
        attendees.push({ email: agenteEmail, displayName: agenteNombre });
      }

      // Extract barrio from address (second part after comma, e.g. "Av. Santa Fe 1234, Palermo, CABA" → "Palermo")
      const addressParts = direccion.split(",").map((p: string) => p.trim());
      const barrio = addressParts.length >= 2 ? addressParts[1] : "";
      const tipoLabel = tipoPropiedad === "casa" ? "Casa" : "Depto";
      const titleParts = [`📸 ${tipoLabel}`, agenteNombre, barrio].filter(Boolean);

      const event = await calendar.events.insert({
        calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
        sendUpdates: agenteEmail ? "all" : "none",
        requestBody: {
          summary: titleParts.join(" - "),
          description: descriptionLines.join("\n"),
          start: {
            dateTime: startDateTime,
            timeZone: "America/Argentina/Buenos_Aires",
          },
          end: {
            dateTime: endDateTime,
            timeZone: "America/Argentina/Buenos_Aires",
          },
          location: direccion,
          attendees: attendees.length > 0 ? attendees : undefined,
          reminders: {
            useDefault: false,
            overrides: [
              { method: "popup", minutes: 60 },
              { method: "popup", minutes: 1440 },
            ],
          },
        },
      });

      return NextResponse.json({ ok: true, eventId: event.data.id });
    }

    if (action === "delete") {
      const { eventId } = data;
      await calendar.events.delete({
        calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
        eventId,
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Calendar error:", error);
    return NextResponse.json({ error: "Calendar operation failed" }, { status: 500 });
  }
}
