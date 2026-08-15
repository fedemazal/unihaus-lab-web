import { NextResponse } from "next/server";

// POST /api/notify-whatsapp
// Body: { telefono: string, nombre: string, direccion: string }
// Requiere: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM en .env.local
// El número de origen debe estar registrado en Twilio WhatsApp Business.
export async function POST(req: Request) {
  const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
  const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
  const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
    return NextResponse.json(
      { error: "WhatsApp no configurado. Agregar TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN y TWILIO_WHATSAPP_FROM en .env.local" },
      { status: 503 }
    );
  }

  const { telefono, nombre, direccion } = await req.json() as {
    telefono: string;
    nombre: string;
    direccion: string;
  };

  if (!telefono) {
    return NextResponse.json({ error: "Falta telefono" }, { status: 400 });
  }

  // Normalizar número: agregar código de país Argentina si no lo tiene
  const normalized = telefono.startsWith("+") ? telefono : `+54${telefono.replace(/^0/, "")}`;

  const body = `¡Hola ${nombre}! 📸 Tu producción en *${direccion}* ya está lista. Entrá a tu portal para ver y descargar los archivos: https://unihaus.com.ar/producciones`;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const params = new URLSearchParams({
    From: `whatsapp:${TWILIO_WHATSAPP_FROM}`,
    To: `whatsapp:${normalized}`,
    Body: body,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Twilio error:", err);
    return NextResponse.json({ error: "Error enviando WhatsApp", detail: err }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
