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
        <p style="margin: 4px 0; color: ${TEXT_COLOR};"><strong>Precio final:</strong> $${data.precioFinal} USD</p>
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
