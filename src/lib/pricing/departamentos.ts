import type { ProductionServices, PriceBreakdownItem } from "@/types";
import { precioBaseProgresivo, precioDescubiertoProgresivo, precioPlano } from "./utils";

interface DeptoPricingInput {
  superficie: number;
  descubierta?: number;
  amenidades: number;
  servicios: ProductionServices;
  descuentoPorcentaje?: number;
}

export function calcularPrecioDepto(datos: DeptoPricingInput) {
  const { superficie, descubierta = 0, amenidades, servicios, descuentoPorcentaje = 0 } = datos;

  // Semi + descubiertos: los primeros 20m² se suman como cubiertos; el exceso usa tarifa descubiertos
  const descubiertaComoCubierta = Math.min(descubierta, 20);
  const descubiertaExceso = Math.max(0, descubierta - 20);

  // m² totales = cubiertos + hasta 20m² de semi/desc + amenities (1 amenity = 7m²)
  const m2Totales = superficie + descubiertaComoCubierta + amenidades * 7;

  // Precio base progresivo — fotos HDR + 1 video ya incluidos
  let precioBase = precioBaseProgresivo(m2Totales);

  // Ajuste de video (solo_fotos y segundo_video son mutuamente excluyentes)
  if (servicios.soloFotos) {
    precioBase = precioBase * 0.75; // -25%, sin video
  } else if (servicios.videoAdicional) {
    precioBase = precioBase * 1.25; // +25%, 2do video
  }

  // Exceso de descubierta (> 20m²) se pricean con tarifa descubiertos de casas
  const precioSemiDesc = descubiertaExceso > 0 ? precioDescubiertoProgresivo(descubiertaExceso) : 0;

  // Servicios adicionales
  let precioExtras = precioSemiDesc;
  const desglose: PriceBreakdownItem[] = [];

  if (descubiertaExceso > 0) {
    desglose.push({
      concepto: "Semi + Descubiertos (exceso)",
      calculo: `${descubiertaExceso}m² sobre 20m² — tarifa descubiertos`,
      monto: precioSemiDesc,
    });
  }

  if (servicios.plano2d) {
    const monto = precioPlano(superficie);
    const tarifa = superficie <= 35 ? 0.30 : 0.25;
    precioExtras += monto;
    desglose.push({ concepto: "Plano 2D", calculo: `${superficie}m² × $${tarifa.toFixed(2)}`, monto });
  }

  if (servicios.tour360) {
    const puntos = Math.ceil(m2Totales / 10);
    const monto = puntos * 2;
    precioExtras += monto;
    desglose.push({
      concepto: "Tour 360",
      calculo: `${puntos} pts × $2`,
      detalle: `${superficie}m²${amenidades > 0 ? ` + ${amenidades} amenities × 7m²` : ""} ÷ 10`,
      monto,
    });
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
    m2Totales,
    precioExtras,
    desglose,
    subtotal,
    withMinimo,
    descuentoInmobiliaria,
    porcentajeDescuento: descuentoPorcentaje,
    total,
    minimoAplicado,
  };
}
