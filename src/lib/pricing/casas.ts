import type { ProductionServices, PriceBreakdownItem } from "@/types";
import { precioBaseProgresivo, precioDescubiertoProgresivo, precioPlano } from "./utils";

interface CasaPricingInput {
  construida: number;
  descubierta: number;
  amenidades: number;
  servicios: ProductionServices;
  descuentoPorcentaje?: number;
}

export function calcularPrecioCasa(datos: CasaPricingInput) {
  const { construida, descubierta, amenidades, servicios, descuentoPorcentaje = 0 } = datos;

  // Precio base: superficie construida (progresivo) + descubierta (progresivo)
  const precioBaseConstruida = precioBaseProgresivo(construida);
  const precioBaseDescubierta = precioDescubiertoProgresivo(descubierta);
  let precioBase = precioBaseConstruida + precioBaseDescubierta;

  // Ajuste de video (solo_fotos y segundo_video son mutuamente excluyentes)
  if (servicios.soloFotos) {
    precioBase = precioBase * 0.75; // -25%, sin video
  } else if (servicios.videoAdicional) {
    precioBase = precioBase * 1.25; // +25%, 2do video
  }

  // Servicios adicionales
  let precioExtras = 0;
  const desglose: PriceBreakdownItem[] = [];

  if (servicios.plano2d) {
    const monto = precioPlano(construida);
    const tarifa = construida <= 35 ? 0.30 : 0.25;
    precioExtras += monto;
    desglose.push({ concepto: "Plano 2D", calculo: `${construida}m² construida × $${tarifa.toFixed(2)}`, monto });
  }

  if (servicios.tour360) {
    // Interior
    const m2Interior = construida + amenidades * 7;
    const puntosInterior = Math.ceil(m2Interior / 10);
    const montoInterior = puntosInterior * 2;

    // Exterior (tope de cálculo: 240m²)
    let puntosExterior = 0;
    let montoExterior = 0;
    if (descubierta > 0) {
      const m2Tope = Math.min(descubierta, 240);
      puntosExterior = Math.ceil(m2Tope / 40 + 1 + amenidades);
      montoExterior = puntosExterior * 2;
    }

    precioExtras += montoInterior + montoExterior;

    desglose.push({
      concepto: "Tour 360 Interior",
      calculo: `${puntosInterior} pts × $2`,
      detalle: `(${construida}m² + ${amenidades} amenities × 7m²) ÷ 10`,
      monto: montoInterior,
    });

    if (puntosExterior > 0) {
      const m2Tope = Math.min(descubierta, 240);
      desglose.push({
        concepto: "Tour 360 Exterior",
        calculo: `${puntosExterior} pts × $2`,
        detalle: descubierta > 240
          ? `Tope 240m² ÷ 40 + calle + ${amenidades} amenities`
          : `${descubierta}m² ÷ 40 + calle + ${amenidades} amenities`,
        monto: montoExterior,
      });
      void m2Tope;
    }
  }

  if (servicios.drone) {
    precioExtras += 65;
    desglose.push({ concepto: "Drone", calculo: "Fijo", monto: 65 });
  }

  if (servicios.amoblamiento && servicios.cantidadFotosAmobladas > 0) {
    const monto = servicios.cantidadFotosAmobladas * 2;
    precioExtras += monto;
    desglose.push({
      concepto: "Amoblamiento Virtual",
      calculo: `${servicios.cantidadFotosAmobladas} fotos × $2`,
      monto,
    });
  }

  // Mínimo $50 se aplica antes del descuento
  const subtotal = precioBase + precioExtras;
  const withMinimo = Math.max(subtotal, 50);
  const minimoAplicado = subtotal < 50;
  const descuentoInmobiliaria = descuentoPorcentaje > 0 ? withMinimo * (descuentoPorcentaje / 100) : 0;
  const total = withMinimo - descuentoInmobiliaria;

  return {
    precioBase,
    precioBaseConstruida,
    precioBaseDescubierta,
    precioExtras,
    desglose,
    subtotal,
    descuentoInmobiliaria,
    porcentajeDescuento: descuentoPorcentaje,
    total,
    minimoAplicado,
  };
}
