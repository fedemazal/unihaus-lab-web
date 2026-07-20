import type { ProductionServices, PriceBreakdownItem } from "@/types";

interface DeptoPricingInput {
  superficie: number;
  amenidades: number;
  servicios: ProductionServices;
  descuentoPorcentaje?: number;
}

export function calcularPrecioDepto(datos: DeptoPricingInput) {
  const { superficie, amenidades, servicios, descuentoPorcentaje = 0 } = datos;

  // 1. PRECIO BASE CON 3 RANGOS (superficie + amenidades × 7m²)
  const m2Amenidades = amenidades * 7;
  const superficieTotal = superficie + m2Amenidades;
  let precioBase = 0;
  let rangoAplicado = "";
  let tarifaBase = 0;

  if (superficieTotal <= 60) {
    precioBase = superficieTotal * 1.5;
    rangoAplicado = "≤60m²";
    tarifaBase = 1.5;
  } else if (superficieTotal <= 80) {
    precioBase = superficieTotal * 1.35;
    rangoAplicado = "61-80m²";
    tarifaBase = 1.35;
  } else if (superficieTotal <= 100) {
    precioBase = superficieTotal * 1.1;
    rangoAplicado = "81-100m²";
    tarifaBase = 1.1;
  } else {
    precioBase = superficieTotal * 1.0;
    rangoAplicado = ">100m²";
    tarifaBase = 1.0;
  }

  // 2. DESCUENTO SI SOLO FOTOS
  if (servicios.soloFotos) {
    precioBase = precioBase * 0.7;
  }

  // 3. EXTRAS
  let precioExtras = 0;
  const desglose: PriceBreakdownItem[] = [];

  if (servicios.videoAdicional && !servicios.soloFotos) {
    const monto = precioBase * 0.2;
    precioExtras += monto;
    desglose.push({ concepto: "Video Adicional", calculo: "Base × 20%", monto });
  }

  if (servicios.plano2d) {
    const monto = superficieTotal * 0.35;
    precioExtras += monto;
    desglose.push({ concepto: "Plano 2D", calculo: `${superficieTotal}m² × $0.35`, monto });
  }

  if (servicios.tour360) {
    const fotos = Math.ceil(superficieTotal / 10);
    const monto = fotos * 2;
    precioExtras += monto;
    desglose.push({
      concepto: "Tour 360",
      calculo: `${fotos} fotos × $2`,
      detalle: `${superficieTotal}m² ÷ 10`,
      monto,
    });
  }

  if (servicios.drone) {
    precioExtras += 65;
    desglose.push({ concepto: "Drone", calculo: "Fijo", monto: 65 });
  }

  if (servicios.amoblamiento && servicios.cantidadFotosAmobladas > 0) {
    const monto = servicios.cantidadFotosAmobladas * 6;
    precioExtras += monto;
    desglose.push({
      concepto: "Amoblamiento Virtual",
      calculo: `${servicios.cantidadFotosAmobladas} fotos × $6`,
      monto,
    });
  }

  // 4-7. SUBTOTAL, DESCUENTO, TOTAL, MÍNIMO
  const subtotal = precioBase + precioExtras;
  const descuentoInmobiliaria = descuentoPorcentaje > 0 ? subtotal * (descuentoPorcentaje / 100) : 0;
  let total = subtotal - descuentoInmobiliaria;
  const minimoAplicado = total < 50;
  total = Math.max(total, 50);

  return {
    precioBase,
    rangoAplicado,
    tarifaBase,
    superficieTotal,
    m2Amenidades,
    precioExtras,
    desglose,
    subtotal,
    descuentoInmobiliaria,
    porcentajeDescuento: descuentoPorcentaje,
    total,
    minimoAplicado,
  };
}
