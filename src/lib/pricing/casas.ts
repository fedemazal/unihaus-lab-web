import type { ProductionServices, PriceBreakdownItem } from "@/types";

interface CasaPricingInput {
  construida: number;
  descubierta: number;
  amenidades: number;
  servicios: ProductionServices;
  descuentoPorcentaje?: number;
}

export function calcularPrecioCasa(datos: CasaPricingInput) {
  const { construida, descubierta, amenidades, servicios, descuentoPorcentaje = 0 } = datos;

  // 1. PRECIO BASE CONSTRUIDA
  let precioBaseConstruida = 0;
  let rangoConstruida = "";
  let tarifaConstruida = 0;

  if (construida <= 200) {
    precioBaseConstruida = construida * 1.0;
    rangoConstruida = "≤200m²";
    tarifaConstruida = 1.0;
  } else {
    precioBaseConstruida = construida * 0.8;
    rangoConstruida = ">200m²";
    tarifaConstruida = 0.8;
  }

  // 2. PRECIO BASE DESCUBIERTA
  let precioBaseDescubierta = 0;
  let rangoDescubierta = "";

  if (descubierta <= 500) {
    precioBaseDescubierta = descubierta * 0.1;
    rangoDescubierta = "≤500m²";
  } else {
    precioBaseDescubierta = 500 * 0.1;
    rangoDescubierta = ">500m² (excedente gratis)";
  }

  let precioBase = precioBaseConstruida + precioBaseDescubierta;

  // 3. DESCUENTO SI SOLO FOTOS
  if (servicios.soloFotos) {
    precioBase = precioBase * 0.7;
  }

  // 4. EXTRAS
  let precioExtras = 0;
  const desglose: PriceBreakdownItem[] = [];

  if (servicios.videoAdicional && !servicios.soloFotos) {
    const monto = precioBase * 0.2;
    precioExtras += monto;
    desglose.push({ concepto: "Video Adicional", calculo: "Base × 20%", monto });
  }

  if (servicios.plano2d) {
    const monto = construida * 0.35;
    precioExtras += monto;
    desglose.push({ concepto: "Plano 2D", calculo: `${construida}m² construida × $0.35`, monto });
  }

  if (servicios.tour360) {
    // INTERIOR
    const superficieInterior = construida + amenidades * 7;
    const fotosInterior = Math.ceil(superficieInterior / 10);
    const montoInterior = fotosInterior * 2;

    // EXTERIOR
    let fotosExterior = 0;
    let montoExterior = 0;

    if (descubierta > 0) {
      const superficieParaCalculo = descubierta > 300 ? 240 : descubierta;
      const fotosPorTerreno = superficieParaCalculo / 40;
      fotosExterior = Math.ceil(fotosPorTerreno + 1 + amenidades);
      montoExterior = fotosExterior * 2;
    }

    precioExtras += montoInterior + montoExterior;

    desglose.push({
      concepto: "Tour 360 Interior",
      calculo: `${fotosInterior} fotos × $2`,
      detalle: `(${construida}m² + ${amenidades} amenidades × 7m²) ÷ 10`,
      monto: montoInterior,
    });

    if (fotosExterior > 0) {
      desglose.push({
        concepto: "Tour 360 Exterior",
        calculo: `${fotosExterior} fotos × $2`,
        detalle:
          descubierta > 300
            ? `Tope 240m² + calle + ${amenidades} amenidades`
            : `${descubierta}m² ÷ 40 + calle + ${amenidades} amenidades`,
        monto: montoExterior,
      });
    }
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

  // 5-8. SUBTOTAL, DESCUENTO, TOTAL, MÍNIMO
  const subtotal = precioBase + precioExtras;
  const descuentoInmobiliaria = descuentoPorcentaje > 0 ? subtotal * (descuentoPorcentaje / 100) : 0;
  let total = subtotal - descuentoInmobiliaria;
  const minimoAplicado = total < 50;
  total = Math.max(total, 50);

  return {
    precioBaseConstruida,
    precioBaseDescubierta,
    precioBase,
    rangoConstruida,
    rangoDescubierta,
    tarifaConstruida,
    precioExtras,
    desglose,
    subtotal,
    descuentoInmobiliaria,
    porcentajeDescuento: descuentoPorcentaje,
    total,
    minimoAplicado,
  };
}
