// ============================================
// UNIHAUS LAB - EMAIL TEMPLATES
// ============================================

const BRAND_COLOR = "#C07856";
const TEXT_COLOR = "#2C2C2C";
const MUTED_COLOR = "#5A5A5A";

function layout(content: string): string {
  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="padding: 32px 24px; border-bottom: 3px solid ${BRAND_COLOR};">
        <img src="https://unihaus.com.ar/img/logo.svg" alt="Unihaus LAB" style="height: 40px;" />
      </div>
      <div style="padding: 32px 24px;">
        ${content}
      </div>
      <div style="padding: 24px; background: #F5F5F0; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: ${MUTED_COLOR};">
          Unihaus LAB — Producciones inmobiliarias profesionales
        </p>
      </div>
    </div>
  `;
}

// 1. Nueva cuenta registrada (al admin)
export function nuevaCuentaAdmin(data: { nombre: string; email: string; telefono: string }) {
  return {
    subject: `Nueva cuenta: ${data.nombre}`,
    html: layout(`
      <h2 style="color: ${TEXT_COLOR}; margin: 0 0 16px;">Nueva cuenta registrada</h2>
      <p style="color: ${MUTED_COLOR}; line-height: 1.6;">
        Se registró un nuevo agente en la plataforma:
      </p>
      <div style="background: #F5F5F0; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 4px 0; color: ${TEXT_COLOR};"><strong>Nombre:</strong> ${data.nombre}</p>
        <p style="margin: 4px 0; color: ${TEXT_COLOR};"><strong>Email:</strong> ${data.email}</p>
        <p style="margin: 4px 0; color: ${TEXT_COLOR};"><strong>Teléfono:</strong> ${data.telefono}</p>
      </div>
      <p style="color: ${MUTED_COLOR}; line-height: 1.6;">
        Ingresá al panel de administración para aprobar o rechazar la cuenta.
      </p>
    `),
  };
}

// 2. Cuenta aprobada (al agente)
export function cuentaAprobada(data: { nombre: string; inmobiliariaNombre?: string }) {
  return {
    subject: "¡Tu cuenta fue aprobada!",
    html: layout(`
      <h2 style="color: ${TEXT_COLOR}; margin: 0 0 16px;">¡Bienvenido, ${data.nombre}!</h2>
      <p style="color: ${MUTED_COLOR}; line-height: 1.6;">
        Tu cuenta fue aprobada. Ya podés ingresar al portal y solicitar producciones.
      </p>
      ${data.inmobiliariaNombre ? `
        <div style="background: #F5F5F0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; color: ${TEXT_COLOR};">
            <strong>Inmobiliaria asignada:</strong> ${data.inmobiliariaNombre}
          </p>
        </div>
      ` : ""}
      <a href="https://unihaus.com.ar/login" style="display: inline-block; background: ${BRAND_COLOR}; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin-top: 16px; font-weight: 600;">
        Ingresar al portal
      </a>
    `),
  };
}

// 3. Cuenta rechazada (al agente)
export function cuentaRechazada(data: { nombre: string }) {
  return {
    subject: "Actualización sobre tu cuenta",
    html: layout(`
      <h2 style="color: ${TEXT_COLOR}; margin: 0 0 16px;">Hola, ${data.nombre}</h2>
      <p style="color: ${MUTED_COLOR}; line-height: 1.6;">
        Lamentablemente no pudimos aprobar tu cuenta en este momento.
        Si creés que es un error, respondé a este email y lo revisamos.
      </p>
    `),
  };
}

// 4. Nueva producción solicitada (al admin)
export function nuevaProduccionAdmin(data: {
  agenteNombre: string;
  direccion: string;
  tipoPropiedad: string;
  precioFinal: number;
}) {
  return {
    subject: `Nueva producción: ${data.direccion}`,
    html: layout(`
      <h2 style="color: ${TEXT_COLOR}; margin: 0 0 16px;">Nueva producción solicitada</h2>
      <div style="background: #F5F5F0; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 4px 0; color: ${TEXT_COLOR};"><strong>Agente:</strong> ${data.agenteNombre}</p>
        <p style="margin: 4px 0; color: ${TEXT_COLOR};"><strong>Dirección:</strong> ${data.direccion}</p>
        <p style="margin: 4px 0; color: ${TEXT_COLOR};"><strong>Tipo:</strong> ${data.tipoPropiedad}</p>
        <p style="margin: 4px 0; color: ${TEXT_COLOR};"><strong>Precio final:</strong> $${data.precioFinal.toFixed(2)} USD</p>
      </div>
      <p style="color: ${MUTED_COLOR}; line-height: 1.6;">
        Ingresá al panel para gestionar esta producción.
      </p>
    `),
  };
}

// 5. Archivos listos (al agente)
export function archivosListos(data: { nombre: string; direccion: string }) {
  return {
    subject: `Archivos listos: ${data.direccion}`,
    html: layout(`
      <h2 style="color: ${TEXT_COLOR}; margin: 0 0 16px;">¡Tus archivos están listos!</h2>
      <p style="color: ${MUTED_COLOR}; line-height: 1.6;">
        Hola ${data.nombre}, los archivos de la producción en <strong>${data.direccion}</strong> ya están disponibles para descargar.
      </p>
      <a href="https://unihaus.com.ar/producciones" style="display: inline-block; background: ${BRAND_COLOR}; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin-top: 16px; font-weight: 600;">
        Ver producción
      </a>
    `),
  };
}

// 6. Producción en proceso (al agente)
export function produccionEnProceso(data: {
  nombre: string;
  direccion: string;
  fecha?: string;
  horario?: string;
}) {
  return {
    subject: `Producción confirmada: ${data.direccion}`,
    html: layout(`
      <h2 style="color: ${TEXT_COLOR}; margin: 0 0 16px;">Tu producción fue confirmada</h2>
      <p style="color: ${MUTED_COLOR}; line-height: 1.6;">
        Hola ${data.nombre}, tu producción en <strong>${data.direccion}</strong> fue confirmada y está en proceso.
      </p>
      ${data.fecha ? `
        <div style="background: #F5F5F0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 4px 0; color: ${TEXT_COLOR};"><strong>Fecha:</strong> ${data.fecha}</p>
          ${data.horario ? `<p style="margin: 4px 0; color: ${TEXT_COLOR};"><strong>Horario:</strong> ${data.horario}</p>` : ""}
        </div>
      ` : ""}
      <a href="https://unihaus.com.ar/preparacion" style="display: inline-block; background: ${BRAND_COLOR}; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin-top: 16px; font-weight: 600;">
        Ver guía de preparación
      </a>
    `),
  };
}

export function recordatorioPago(data: {
  nombre: string;
  saldoPendiente: number;
  diasRestantes: number;
  producciones: number;
  esUltimoDia: boolean;
}) {
  const urgency = data.esUltimoDia
    ? `<p style="color: #e53e3e; font-weight: 600;">⚠️ Hoy vence tu plazo de pago.</p>`
    : `<p style="color: ${MUTED_COLOR};">Te quedan <strong style="color: ${TEXT_COLOR};">${data.diasRestantes} día${data.diasRestantes !== 1 ? "s" : ""}</strong> para realizar el pago.</p>`;
  return {
    subject: data.esUltimoDia
      ? `⚠️ Vence hoy: USD ${data.saldoPendiente.toFixed(2)} pendiente de pago`
      : `Recordatorio de pago — USD ${data.saldoPendiente.toFixed(2)} pendiente`,
    html: layout(`
      <h2 style="color: ${TEXT_COLOR}; margin: 0 0 16px;">Recordatorio de pago</h2>
      <p style="color: ${MUTED_COLOR}; line-height: 1.6;">
        Hola ${data.nombre}, tenés ${data.producciones} producción${data.producciones !== 1 ? "es" : ""} entregada${data.producciones !== 1 ? "s" : ""} con saldo pendiente.
      </p>
      <div style="background: #F5F5F0; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 4px 0; color: ${TEXT_COLOR}; font-size: 24px; font-weight: 700;">USD ${data.saldoPendiente.toFixed(2)}</p>
        <p style="margin: 4px 0; color: ${MUTED_COLOR}; font-size: 14px;">Saldo total pendiente</p>
      </div>
      ${urgency}
      <a href="https://unihaus.com.ar/dashboard" style="display: inline-block; background: ${BRAND_COLOR}; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin-top: 16px; font-weight: 600;">
        Ver mi saldo y cargar comprobante
      </a>
      <p style="color: ${MUTED_COLOR}; font-size: 12px; margin-top: 16px;">
        El pago se realiza en efectivo en dólares. Cargá el comprobante desde tu dashboard.
      </p>
    `),
  };
}

function formatFechaEmail(fecha: string): string {
  const dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const [y, m, d] = fecha.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${dias[date.getDay()]} ${d} de ${meses[m - 1]} de ${y}`;
}

const WSP_URL = "https://wa.me/5491126141525";

const CANCELACION_HTML = `
  <div style="background: #FFF8F0; border-left: 3px solid ${BRAND_COLOR}; border-radius: 0 6px 6px 0; padding: 12px 16px; margin: 20px 0;">
    <p style="margin: 0 0 6px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: ${BRAND_COLOR};">Política de cancelación</p>
    <p style="margin: 2px 0; font-size: 13px; color: ${MUTED_COLOR};">• <strong>Por clima:</strong> sin costo, reagendamos sin cargo.</p>
    <p style="margin: 2px 0; font-size: 13px; color: ${MUTED_COLOR};">• <strong>Cancelación en el día por otros motivos:</strong> se cobrará el 10% del valor de la producción.</p>
  </div>
`;

export function horarioConfirmadoAgente(data: {
  nombre: string;
  direccion: string;
  fecha: string;
  horario: string;
  servicios: string[];
  ocupacion?: string;
  tipoOcupante?: string | null;
}) {
  const BASE = "https://unihaus.com.ar";
  let guiaHtml = `
    <a href="${BASE}/preparacion-cliente" style="display: inline-block; background: ${BRAND_COLOR}; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600; font-size: 14px;">
      Ver guía de preparación
    </a>`;
  if (data.ocupacion === "ocupada") {
    if (data.tipoOcupante === "inquilino") {
      guiaHtml = `
        <div style="background: #FFF8F5; border: 1px solid #F0DDD4; border-radius: 10px; padding: 16px; margin-bottom: 16px;">
          <p style="margin: 0 0 6px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: ${BRAND_COLOR};">La propiedad tiene inquilino</p>
          <p style="margin: 0 0 12px; font-size: 13px; color: ${MUTED_COLOR}; line-height: 1.5;">Por favor compartí esta guía con el inquilino para que pueda preparar la propiedad antes de la visita.</p>
          <a href="${BASE}/guia-inquilinos.html" style="display: inline-block; background: ${BRAND_COLOR}; color: #fff; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; font-size: 13px;">
            Guía para inquilinos
          </a>
        </div>`;
    } else if (data.tipoOcupante === "propietario") {
      guiaHtml = `
        <div style="background: #FFF8F5; border: 1px solid #F0DDD4; border-radius: 10px; padding: 16px; margin-bottom: 16px;">
          <p style="margin: 0 0 6px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: ${BRAND_COLOR};">La propiedad está habitada por el propietario</p>
          <p style="margin: 0 0 12px; font-size: 13px; color: ${MUTED_COLOR}; line-height: 1.5;">Compartí esta guía con el propietario para que prepare la propiedad antes de la visita.</p>
          <a href="${BASE}/guia-propietarios.html" style="display: inline-block; background: ${BRAND_COLOR}; color: #fff; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; font-size: 13px;">
            Guía para propietarios
          </a>
        </div>`;
    }
  }
  return {
    subject: `Producción confirmada — ${data.direccion}`,
    html: layout(`
      <h2 style="color: ${TEXT_COLOR}; margin: 0 0 8px; font-size: 22px;">¡Tu producción tiene fecha! 📅</h2>
      <p style="color: ${MUTED_COLOR}; line-height: 1.6; margin: 0 0 20px;">
        Hola <strong>${data.nombre}</strong>, confirmamos el horario de tu producción.
      </p>

      <div style="background: #F5F5F0; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
        <p style="margin: 0 0 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: ${BRAND_COLOR};">Propiedad</p>
        <p style="margin: 0 0 16px; font-size: 15px; font-weight: 600; color: ${TEXT_COLOR};">${data.direccion}</p>

        <div style="display: flex; gap: 16px; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 130px;">
            <p style="margin: 0 0 2px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: ${MUTED_COLOR};">Fecha</p>
            <p style="margin: 0; font-size: 15px; font-weight: 700; color: ${TEXT_COLOR}; text-transform: capitalize;">${formatFechaEmail(data.fecha)}</p>
          </div>
          <div style="flex: 1; min-width: 100px;">
            <p style="margin: 0 0 2px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: ${MUTED_COLOR};">Horario</p>
            <p style="margin: 0; font-size: 15px; font-weight: 700; color: ${TEXT_COLOR};">${data.horario}</p>
          </div>
        </div>

        ${data.servicios.length > 0 ? `
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #E8E8E4;">
          <p style="margin: 0 0 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: ${MUTED_COLOR};">Servicios contratados</p>
          ${data.servicios.map((s) => `<span style="display: inline-block; background: #fff; border: 1px solid #E0DDD8; border-radius: 20px; padding: 3px 10px; font-size: 13px; color: ${TEXT_COLOR}; margin: 2px 4px 2px 0;">${s}</span>`).join("")}
        </div>` : ""}
      </div>

      <p style="color: ${MUTED_COLOR}; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
        Adjuntamos una invitación de calendario (.ics) para agregar el evento a tu agenda.
      </p>

      ${CANCELACION_HTML}

      <div style="margin-top: 24px;">
        ${guiaHtml}
        <a href="${WSP_URL}" style="display: inline-block; background: #25D366; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 8px;">
          Escribinos por WhatsApp
        </a>
      </div>
    `),
  };
}

export function horarioReagendadoAgente(data: {
  nombre: string;
  direccion: string;
  fechaAnterior: string;
  horarioAnterior: string;
  fechaNueva: string;
  horarioNuevo: string;
}) {
  return {
    subject: `Producción reagendada — ${data.direccion}`,
    html: layout(`
      <h2 style="color: ${TEXT_COLOR}; margin: 0 0 8px; font-size: 22px;">Tu producción fue reagendada 🔄</h2>
      <p style="color: ${MUTED_COLOR}; line-height: 1.6; margin: 0 0 20px;">
        Hola <strong>${data.nombre}</strong>, modificamos el horario de tu producción en <strong>${data.direccion}</strong>.
      </p>

      <div style="background: #F5F5F0; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
        <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: ${MUTED_COLOR};">Fecha anterior</p>
        <p style="margin: 0 0 16px; font-size: 14px; color: ${MUTED_COLOR}; text-decoration: line-through; text-transform: capitalize;">${formatFechaEmail(data.fechaAnterior)} — ${data.horarioAnterior}</p>

        <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: ${BRAND_COLOR};">Nueva fecha</p>
        <p style="margin: 0; font-size: 17px; font-weight: 700; color: ${TEXT_COLOR}; text-transform: capitalize;">${formatFechaEmail(data.fechaNueva)}</p>
        <p style="margin: 4px 0 0; font-size: 15px; color: ${TEXT_COLOR};">${data.horarioNuevo}</p>
      </div>

      <p style="color: ${MUTED_COLOR}; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
        Adjuntamos una nueva invitación de calendario. Si tenés alguna consulta, contactanos.
      </p>

      ${CANCELACION_HTML}

      <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 24px;">
        <a href="https://unihaus.com.ar/producciones" style="display: inline-block; background: ${BRAND_COLOR}; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600; font-size: 14px;">
          Ver mis producciones
        </a>
        <a href="${WSP_URL}" style="display: inline-block; background: #25D366; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600; font-size: 14px;">
          Escribinos por WhatsApp
        </a>
      </div>
    `),
  };
}

export function produccionCancelada(data: {
  nombre: string;
  direccion: string;
  fecha?: string;
  horario?: string;
}) {
  const scheduleInfo = data.fecha
    ? `<p style="color: ${MUTED_COLOR}; line-height: 1.6; margin-top: 8px;">
        La producción estaba agendada para el <strong>${data.fecha}</strong>${data.horario ? ` a las <strong>${data.horario}</strong>` : ""}.
       </p>`
    : "";
  return {
    subject: `Producción cancelada: ${data.direccion}`,
    html: layout(`
      <h2 style="color: ${TEXT_COLOR}; margin: 0 0 16px;">Producción cancelada</h2>
      <p style="color: ${MUTED_COLOR}; line-height: 1.6;">
        Hola ${data.nombre}, te informamos que la producción en <strong>${data.direccion}</strong> fue cancelada.
      </p>
      ${scheduleInfo}
      <p style="color: ${MUTED_COLOR}; line-height: 1.6; margin-top: 12px;">
        Si tenés dudas o querés reprogramarla, escribinos por WhatsApp.
      </p>
      <a href="https://wa.me/5491126141525" style="display: inline-block; background: #25D366; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin-top: 16px; font-weight: 600;">
        Contactar por WhatsApp
      </a>
    `),
  };
}

export function produccionLista(data: {
  nombre: string;
  direccion: string;
  linkDescarga?: string;
}) {
  return {
    subject: `✅ Tu producción está lista: ${data.direccion}`,
    html: layout(`
      <h2 style="color: ${TEXT_COLOR}; margin: 0 0 16px;">¡Tu producción está lista!</h2>
      <p style="color: ${MUTED_COLOR}; line-height: 1.6;">
        Hola ${data.nombre}, los archivos de tu propiedad en <strong>${data.direccion}</strong> ya están disponibles.
      </p>
      <a href="https://unihaus.com.ar/producciones" style="display: inline-block; background: ${BRAND_COLOR}; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin-top: 16px; font-weight: 600;">
        Ver mis producciones
      </a>
      <p style="color: ${MUTED_COLOR}; font-size: 12px; margin-top: 16px;">
        Los archivos estarán disponibles por 15 días. Descargalos antes de que venzan.
      </p>
    `),
  };
}
