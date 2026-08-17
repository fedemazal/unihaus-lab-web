"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter } from "next/navigation";
import {
  createProduction,
  getInmobiliaria,
  getBeneficiosConfig,
  getProductions,
  computeCapa1,
  validateCodigo,
  usarCodigo,
  LIMITE_CC,
  DIAS_PLAZO_CC,
} from "@/lib/firebase/firestore";
import type { CodigoDescuento } from "@/types";
import { sendEmail, ADMIN_EMAIL } from "@/lib/email/send";
import { calcularPrecioDepto } from "@/lib/pricing/departamentos";
import { calcularPrecioCasa } from "@/lib/pricing/casas";
import { precioBaseProgresivo, precioPlano } from "@/lib/pricing/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  PropertyType,
  PropertyOccupation,
  OccupationType,
  ProductionServices,
  PriceBreakdownItem,
} from "@/types";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Home,
  CheckCircle,
  Loader2,
  X,
  Plus,
  CreditCard,
} from "lucide-react";
import dynamic from "next/dynamic";

const AddressInput = dynamic(() => import("@/components/shared/AddressMap"), {
  ssr: false,
  loading: () => <div className="h-10 rounded-md border border-[#263040] bg-[#0D1117]" />,
});

type Step = 1 | 2 | 3 | 4 | 5 | 6;

export default function NuevaProduccionPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ccBloqueada, setCcBloqueada] = useState(false);
  const [descuento, setDescuento] = useState(0);
  const [descuentoManual, setDescuentoManual] = useState(0);
  const [descuentoCapa1, setDescuentoCapa1] = useState(0);
  const [codigoInput, setCodigoInput] = useState("");
  const [codigoAplicado, setCodigoAplicado] = useState<CodigoDescuento | null>(null);
  const [codigoError, setCodigoError] = useState("");
  const [codigoLoading, setCodigoLoading] = useState(false);

  const [tipoPropiedad, setTipoPropiedad] = useState<PropertyType | null>(null);

  const [direccion, setDireccion] = useState("");
  const [superficie, setSuperficie] = useState<number>(0);
  const [construida, setConstruida] = useState<number>(0);
  const [descubierta, setDescubierta] = useState<number>(0);
  const [amenidades, setAmenidades] = useState<number>(0);
  const [valorEstimado, setValorEstimado] = useState<number>(0);

  const [ocupacion, setOcupacion] = useState<PropertyOccupation>("vacia");
  const [tipoOcupacion, setTipoOcupacion] = useState<OccupationType>("propietario");

  const [servicios, setServicios] = useState<ProductionServices>({
    soloFotos: false,
    videoAdicional: false,
    plano2d: false,
    tour360: false,
    drone: false,
    amoblamiento: false,
    cantidadFotosAmobladas: 0,
  });

  const [horarios, setHorarios] = useState("");
  const [observaciones, setObservaciones] = useState("");

  useEffect(() => {
    async function loadDiscount() {
      if (!profile?.inmobiliariaId) return;
      const now = new Date();
      const [inmob, cfg, prods] = await Promise.all([
        getInmobiliaria(profile.inmobiliariaId),
        getBeneficiosConfig(),
        getProductions({ inmobiliariaId: profile.inmobiliariaId }),
      ]);
      const manual = inmob?.descuento ?? 0;
      // Check CC block
      if (profile?.cuentaCorrienteAprobada) {
        const impagoCC = prods.filter((p) => p.esCuentaCorriente && !p.pagada && p.estado === "listo");
        const saldoCC = impagoCC.reduce((sum, p) => sum + (p.precioFinal || 0), 0);
        let bloqueada = saldoCC >= LIMITE_CC;
        if (!bloqueada && impagoCC.length > 0) {
          const fechas = impagoCC.map((p) => {
            const f = p.fechaListo;
            if (!f) return new Date(0);
            return typeof f === "object" && "toDate" in f ? (f as { toDate: () => Date }).toDate() : new Date(f as unknown as string);
          });
          const oldest = new Date(Math.min(...fechas.map((d) => d.getTime())));
          bloqueada = Math.floor((Date.now() - oldest.getTime()) / (1000 * 60 * 60 * 24)) > DIAS_PLAZO_CC;
        }
        setCcBloqueada(bloqueada);
      }

      const countMes = prods.filter((p) => {
        const d = p.createdAt instanceof Date ? p.createdAt
          : (p.createdAt as unknown as { toDate?: () => Date })?.toDate?.() ?? new Date(p.createdAt as unknown as string ?? 0);
        return d.getFullYear() === now.getFullYear()
          && d.getMonth() === now.getMonth()
          && p.estado !== "cancelado";
      }).length;
      const capa1Calculado = computeCapa1(countMes, cfg.capa1);
      const capa1ManualInmob = inmob?.descuentoManualCapa1 ?? 0;
      const capa1 = Math.max(capa1Calculado, countMes === 0 ? capa1ManualInmob : capa1Calculado);
      setDescuentoManual(manual);
      setDescuentoCapa1(capa1);
      setDescuento(manual + capa1);
    }
    loadDiscount();
  }, [profile?.inmobiliariaId]);

  const toggleServicio = (key: keyof ProductionServices) => {
    setServicios((prev) => {
      const updated = { ...prev };
      if (key === "soloFotos") {
        updated.soloFotos = !prev.soloFotos;
        if (updated.soloFotos) updated.videoAdicional = false;
      } else if (key === "videoAdicional") {
        updated.videoAdicional = !prev.videoAdicional;
        if (updated.videoAdicional) updated.soloFotos = false;
      } else if (key === "amoblamiento") {
        updated.amoblamiento = !prev.amoblamiento;
        if (!updated.amoblamiento) updated.cantidadFotosAmobladas = 0;
      } else {
        (updated[key] as boolean) = !(prev[key] as boolean);
      }
      return updated;
    });
  };

  const calcResult = tipoPropiedad === "departamento"
    ? calcularPrecioDepto({
        superficie,
        descubierta,
        amenidades,
        servicios,
        descuentoPorcentaje: descuento,
      })
    : tipoPropiedad === "casa"
    ? calcularPrecioCasa({
        construida,
        descubierta,
        amenidades,
        servicios,
        descuentoPorcentaje: descuento,
      })
    : null;

  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});

  const canNext = (): boolean => {
    switch (step) {
      case 1: return tipoPropiedad !== null;
      case 2: return true; // validated on click
      case 3: return true;
      case 4: return true;
      case 5: return true; // validated on click
      case 6: return true;
      default: return false;
    }
  };

  const validateAndNext = () => {
    const errors: Record<string, string> = {};

    if (step === 2) {
      if (!direccion.trim()) errors.direccion = "Este campo es obligatorio";
      if (tipoPropiedad === "departamento" && superficie <= 0) errors.superficie = "Este campo es obligatorio";
      if (tipoPropiedad === "casa" && construida <= 0) errors.construida = "Este campo es obligatorio";
      if (!valorEstimado) errors.valorEstimado = "Este campo es obligatorio";
    }

    if (step === 5 && !horarios.trim()) {
      errors.horarios = "Ingresá al menos un rango horario";
    }

    setStepErrors(errors);
    if (Object.keys(errors).length === 0) {
      setStep((step + 1) as Step);
    }
  };

  async function handleValidarCodigo() {
    if (!codigoInput.trim()) return;
    setCodigoLoading(true);
    setCodigoError("");
    const result = await validateCodigo(codigoInput);
    if (!result) {
      setCodigoError("Código inválido, inactivo o agotado");
      setCodigoAplicado(null);
    } else {
      setCodigoAplicado(result);
      setCodigoError("");
    }
    setCodigoLoading(false);
  }

  function handleQuitarCodigo() {
    setCodigoAplicado(null);
    setCodigoInput("");
    setCodigoError("");
  }

  const handleSubmit = async () => {
    if (!profile || !calcResult) return;
    setLoading(true);
    try {
      const horariosSugeridos = horarios
        .split("\n")
        .map((h) => h.trim())
        .filter(Boolean);

      const elegibles = [
        true,
        !servicios.soloFotos,
        servicios.videoAdicional,
        servicios.plano2d,
        servicios.tour360,
        servicios.drone,
      ].filter(Boolean).length;
      const descuentoPaquete = elegibles >= 4 ? calcResult.withMinimo * 0.05 : 0;

      let descuentoCodigoMonto = 0;
      if (codigoAplicado) {
        const ok = await usarCodigo(codigoAplicado.id);
        if (!ok) {
          setCodigoError("El código ya fue agotado. Revisá con el admin.");
          setCodigoAplicado(null);
          setLoading(false);
          return;
        }
        descuentoCodigoMonto = (calcResult.total - descuentoPaquete) * (codigoAplicado.porcentaje / 100);
      }

      const precioFinalReal = calcResult.total - descuentoPaquete - descuentoCodigoMonto;

      await createProduction({
        agenteId: profile.uid,
        agenteNombre: profile.nombre,
        inmobiliariaId: profile.inmobiliariaId || "",
        inmobiliariaNombre: "",
        tipoPropiedad: tipoPropiedad!,
        direccion,
        ...(tipoPropiedad === "departamento" ? { superficie, descubierta } : { construida, descubierta }),
        amenidades,
        estadoPropiedad: {
          ocupacion,
          tipo: ocupacion === "ocupada" ? tipoOcupacion : null,
        },
        servicios,
        horariosSugeridos,
        observaciones,
        horarioConfirmado: null,
        precioBase: calcResult.precioBase,
        precioExtras: calcResult.precioExtras,
        subtotal: calcResult.subtotal,
        descuentoAplicado: calcResult.descuentoInmobiliaria,
        descuentoPaquete,
        ...(codigoAplicado ? {
          codigoDescuento: codigoAplicado.codigo,
          descuentoCodigo: descuentoCodigoMonto,
        } : {}),
        precioFinal: precioFinalReal,
        desglose: calcResult.desglose,
        valorEstimado,
        ...(profile.cuentaCorrienteAprobada ? { esCuentaCorriente: true } : {}),
        estado: "pendiente",
        tags: [],
        archivos: { fotosVideosZip: null, planoImagen: null },
        fechaSolicitud: new Date(),
        fechaEnProceso: null,
        fechaListo: null,
      });
      setSubmitted(true);
      sendEmail("nueva_produccion", ADMIN_EMAIL, {
        agenteNombre: profile.nombre,
        direccion,
        tipoPropiedad: tipoPropiedad!,
        precioFinal: precioFinalReal,
      });
    } catch (err) {
      console.error("Error creating production:", err);
    } finally {
      setLoading(false);
    }
  };

  if (ccBloqueada) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
          <CreditCard className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-[#E2ECF4] mb-3">Cuenta corriente bloqueada</h1>
        <p className="text-[#7A96A8] mb-2">
          Tu cuenta corriente alcanzó el límite o el plazo de pago de {DIAS_PLAZO_CC} días.
        </p>
        <p className="text-[#7A96A8] mb-8">
          Para volver a solicitar producciones es necesario saldar el <strong className="text-[#E2ECF4]">saldo total</strong> de la cuenta corriente. El pago es en <strong className="text-[#E2ECF4]">efectivo en dólares</strong>.
        </p>
        <Button
          onClick={() => router.push("/dashboard")}
          className="bg-[#F2B968] hover:bg-[#d9a050] text-[#0D1117] font-semibold"
        >
          Ver mi saldo
        </Button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-[#E2ECF4] mb-4">¡Producción solicitada!</h1>
        <p className="text-[#7A96A8] mb-8">
          Tu solicitud fue enviada. Te notificaremos cuando confirmemos el horario.
        </p>
        <Button
          onClick={() => router.push("/producciones")}
          className="bg-[#F2B968] hover:bg-[#d9a050] text-[#0D1117] font-semibold"
        >
          Ver mis producciones
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-[#E2ECF4] mb-2">Nueva Producción</h1>
      <p className="text-[#7A96A8] mb-8">Paso {step} de 6</p>

      {/* Progress bar */}
      <div className="flex gap-1 mb-8">
        {[1, 2, 3, 4, 5, 6].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition ${
              s <= step ? "bg-[#F2B968]" : "bg-[#263040]"
            }`}
          />
        ))}
      </div>

      {/* Step 1: Tipo de propiedad */}
      {step === 1 && (
        <div>
          <h2 className="text-lg font-semibold text-[#E2ECF4] mb-6">Tipo de propiedad</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setTipoPropiedad("departamento")}
              className={`p-6 rounded-xl border-2 transition text-left ${
                tipoPropiedad === "departamento"
                  ? "border-[#F2B968] bg-[#F2B968]/8"
                  : "border-[#263040] hover:border-[#3A4A60]"
              }`}
            >
              <Building2 className={`w-8 h-8 mb-3 ${tipoPropiedad === "departamento" ? "text-[#F2B968]" : "text-[#7A96A8]"}`} />
              <p className="font-semibold text-[#E2ECF4]">Departamento</p>
            </button>
            <button
              onClick={() => setTipoPropiedad("casa")}
              className={`p-6 rounded-xl border-2 transition text-left ${
                tipoPropiedad === "casa"
                  ? "border-[#F2B968] bg-[#F2B968]/8"
                  : "border-[#263040] hover:border-[#3A4A60]"
              }`}
            >
              <Home className={`w-8 h-8 mb-3 ${tipoPropiedad === "casa" ? "text-[#F2B968]" : "text-[#7A96A8]"}`} />
              <p className="font-semibold text-[#E2ECF4]">Casa</p>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Datos de propiedad */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[#E2ECF4] mb-6">Datos de la propiedad</h2>

          <div>
            <Label className="text-[#E2ECF4] mb-1.5 block">
              Dirección completa <span className="text-red-400">*</span>
            </Label>
            <AddressInput
              address={direccion}
              onAddressChange={(val) => { setDireccion(val); setStepErrors((prev) => ({ ...prev, direccion: "" })); }}
            />
            {stepErrors.direccion && <p className="text-xs text-red-400 mt-1">{stepErrors.direccion}</p>}
          </div>

          {tipoPropiedad === "departamento" ? (
            <>
              <div>
                <Label className="text-[#E2ECF4]">
                  Superficie cubierta (m²) <span className="text-red-400">*</span>
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={superficie || ""}
                  onChange={(e) => { setSuperficie(Number(e.target.value)); setStepErrors((prev) => ({ ...prev, superficie: "" })); }}
                  placeholder="85"
                  className={`mt-1 bg-[#0D1117] text-[#E2ECF4] placeholder:text-[#7A96A8] ${stepErrors.superficie ? "border-red-500" : "border-[#263040]"}`}
                />
                {stepErrors.superficie && <p className="text-xs text-red-400 mt-1">{stepErrors.superficie}</p>}
              </div>
              <div>
                <Label className="text-[#E2ECF4]">Semi + descubiertos (m²) <span className="text-[#7A96A8] font-normal">— opcional</span></Label>
                <Input
                  type="number"
                  min={0}
                  value={descubierta || ""}
                  onChange={(e) => setDescubierta(Number(e.target.value))}
                  placeholder="0"
                  className="mt-1 bg-[#0D1117] border-[#263040] text-[#E2ECF4] placeholder:text-[#7A96A8]"
                />
                <p className="text-xs text-[#7A96A8] mt-1">Balcón, terraza, patio, jardín.</p>
              </div>
            </>
          ) : (
            <>
              <div>
                <Label className="text-[#E2ECF4]">
                  Superficie construida (m²) <span className="text-red-400">*</span>
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={construida || ""}
                  onChange={(e) => { setConstruida(Number(e.target.value)); setStepErrors((prev) => ({ ...prev, construida: "" })); }}
                  placeholder="180"
                  className={`mt-1 bg-[#0D1117] text-[#E2ECF4] placeholder:text-[#7A96A8] ${stepErrors.construida ? "border-red-500" : "border-[#263040]"}`}
                />
                {stepErrors.construida && <p className="text-xs text-red-400 mt-1">{stepErrors.construida}</p>}
              </div>
              <div>
                <Label className="text-[#E2ECF4]">Semi + descubiertos (m²) <span className="text-[#7A96A8] font-normal">— opcional</span></Label>
                <Input
                  type="number"
                  min={0}
                  value={descubierta || ""}
                  onChange={(e) => setDescubierta(Number(e.target.value))}
                  placeholder="250"
                  className="mt-1 bg-[#0D1117] border-[#263040] text-[#E2ECF4] placeholder:text-[#7A96A8]"
                />
              </div>
            </>
          )}

          <div>
            <Label className="text-[#E2ECF4]">Amenities (cantidad) <span className="text-[#7A96A8] font-normal">— opcional</span></Label>
            <Input
              type="number"
              min={0}
              value={amenidades || ""}
              onChange={(e) => setAmenidades(Number(e.target.value))}
              placeholder="2"
              className="mt-1 bg-[#0D1117] border-[#263040] text-[#E2ECF4] placeholder:text-[#7A96A8]"
            />
            <p className="text-xs text-[#7A96A8] mt-1">Pileta, quincho, SUM, gimnasio, etc.</p>
          </div>

          <div>
            <Label className="text-[#E2ECF4]">
              Valor estimado de la propiedad (USD) <span className="text-red-400">*</span>
            </Label>
            <Input
              type="number"
              min={0}
              value={valorEstimado || ""}
              onChange={(e) => { setValorEstimado(Number(e.target.value)); setStepErrors((prev) => ({ ...prev, valorEstimado: "" })); }}
              placeholder="200000"
              className={`mt-1 bg-[#0D1117] text-[#E2ECF4] placeholder:text-[#7A96A8] w-48 ${stepErrors.valorEstimado ? "border-red-500" : "border-[#263040]"}`}
            />
            {stepErrors.valorEstimado && <p className="text-xs text-red-400 mt-1">{stepErrors.valorEstimado}</p>}
            {!stepErrors.valorEstimado && <p className="text-xs text-[#7A96A8] mt-1">Para calcular el ratio de inversión en fotografía</p>}
          </div>
        </div>
      )}

      {/* Step 3: Estado de propiedad */}
      {step === 3 && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-[#E2ECF4] mb-6">Estado de la propiedad</h2>
          <div>
            <Label className="text-[#E2ECF4] mb-3 block">
              Ocupación <span className="text-red-400">*</span>
            </Label>
            <div className="flex gap-3">
              {(["vacia", "ocupada"] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setOcupacion(opt)}
                  className={`px-6 py-3 rounded-lg border-2 font-medium transition ${
                    ocupacion === opt
                      ? "border-[#F2B968] bg-[#F2B968]/8 text-[#F2B968]"
                      : "border-[#263040] text-[#7A96A8] hover:border-[#3A4A60] hover:text-[#E2ECF4]"
                  }`}
                >
                  {opt === "vacia" ? "Vacía" : "Ocupada"}
                </button>
              ))}
            </div>
          </div>

          {ocupacion === "ocupada" && (
            <div>
              <Label className="text-[#E2ECF4] mb-3 block">¿Quién la ocupa?</Label>
              <div className="flex gap-3">
                {(["propietario", "inquilino"] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setTipoOcupacion(opt)}
                    className={`px-6 py-3 rounded-lg border-2 font-medium transition ${
                      tipoOcupacion === opt
                        ? "border-[#F2B968] bg-[#F2B968]/8 text-[#F2B968]"
                        : "border-[#263040] text-[#7A96A8] hover:border-[#3A4A60] hover:text-[#E2ECF4]"
                    }`}
                  >
                    {opt === "propietario" ? "Propietario" : "Inquilino"}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Servicios */}
      {step === 4 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-[#E2ECF4] mb-6">Servicios</h2>

          <div className="w-full p-4 rounded-xl border-2 border-[#F2B968] bg-[#F2B968]/8 text-left">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-[#E2ECF4]">Fotos + Video</p>
                  <span className="text-xs bg-[#F2B968] text-[#0D1117] px-2 py-0.5 rounded-full font-semibold">Base</span>
                  <span className="text-xs text-[#7A96A8]">(tarifa progresiva x m²)</span>
                </div>
                <p className="text-sm text-[#7A96A8]">
                  {tipoPropiedad === "departamento"
                    ? (() => {
                        const descComoCub = Math.min(descubierta, 20);
                        const m2T = superficie + descComoCub + amenidades * 7;
                        const precio = precioBaseProgresivo(m2T);
                        const partes = [`${superficie}m² cub.`];
                        if (descComoCub > 0) partes.push(`${descComoCub}m² semi/desc`);
                        if (amenidades > 0) partes.push(`${amenidades} amenities (${amenidades * 7}m²)`);
                        return `${partes.join(" + ")} = ${m2T}m² — tarifa progresiva = USD ${precio.toFixed(2)}`;
                      })()
                    : calcResult ? `Construida: $${calcResult.precioBase.toFixed(2)} USD base` : "Calculado según superficie construida y descubierta"}
                </p>
              </div>
              <CheckCircle className="w-5 h-5 text-[#F2B968] shrink-0" />
            </div>
          </div>

          <p className="text-xs text-[#7A96A8] font-medium uppercase tracking-wide pt-2">Modificadores y extras</p>

          {[
            { key: "soloFotos" as const, label: "Solo Fotos (sin video)", desc: "−25% sobre base" },
            { key: "videoAdicional" as const, label: "Segundo Video", desc: "+25% sobre base" },
            { key: "plano2d" as const, label: "Plano 2D", desc: "$0.30/m² (≤35m²) o $0.25/m²" },
            { key: "tour360" as const, label: "Tour 360°", desc: "Calculado por superficie" },
            { key: "drone" as const, label: "Drone", desc: "$65 USD" },
            { key: "amoblamiento" as const, label: "Amoblamiento Virtual", desc: "1 foto incluida gratis · adicionales $2/foto" },
          ].map((item) => (
            <div key={item.key}>
              <button
                onClick={() => toggleServicio(item.key)}
                className={`w-full p-4 rounded-xl border-2 transition text-left flex items-center justify-between ${
                  servicios[item.key]
                    ? "border-[#F2B968] bg-[#F2B968]/8"
                    : "border-[#263040] hover:border-[#3A4A60]"
                }`}
              >
                <div>
                  <p className="font-medium text-[#E2ECF4]">{item.label}</p>
                  <p className="text-sm text-[#7A96A8]">{item.desc}</p>
                </div>
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                    servicios[item.key]
                      ? "border-[#F2B968] bg-[#F2B968]"
                      : "border-[#263040]"
                  }`}
                >
                  {servicios[item.key] && (
                    <svg className="w-3 h-3 text-[#0D1117]" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </button>

              {item.key === "amoblamiento" && servicios.amoblamiento && (
                <div className="mt-2 ml-4">
                  <Label className="text-[#E2ECF4]">Fotos adicionales a amoblar <span className="text-[#7A96A8] font-normal">(1ª incluida gratis)</span></Label>
                  <Input
                    type="number"
                    min={0}
                    value={servicios.cantidadFotosAmobladas || ""}
                    onChange={(e) =>
                      setServicios((prev) => ({
                        ...prev,
                        cantidadFotosAmobladas: Number(e.target.value),
                      }))
                    }
                    placeholder="0"
                    className="mt-1 bg-[#0D1117] border-[#263040] text-[#E2ECF4] placeholder:text-[#7A96A8] w-32"
                  />
                  <p className="text-xs text-[#7A96A8] mt-1">Ingresá cuántas fotos adicionales querés amoblar — $2/foto</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Step 5: Coordinación */}
      {step === 5 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[#E2ECF4] mb-6">Coordinación</h2>
          <div>
            <Label className="text-[#E2ECF4]">
              Sugerí 2-3 rangos horarios <span className="text-red-400">*</span>
            </Label>
            <textarea
              value={horarios}
              onChange={(e) => { setHorarios(e.target.value); setStepErrors((prev) => ({ ...prev, horarios: "" })); }}
              placeholder={"Lunes 18/3 de 9-11hs\nMartes 19/3 de 14-16hs\nMiércoles 20/3 de 10-12hs"}
              rows={4}
              className={`mt-1 w-full rounded-md border bg-[#0D1117] px-3 py-2 text-sm text-[#E2ECF4] placeholder:text-[#7A96A8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B968] resize-none ${stepErrors.horarios ? "border-red-500" : "border-[#263040]"}`}
            />
            {stepErrors.horarios && <p className="text-xs text-red-400 mt-1">{stepErrors.horarios}</p>}
          </div>
          <div>
            <Label className="text-[#E2ECF4]">Observaciones</Label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder={"¿Desde dónde iniciar el video?\n¿Algo que quieras resaltar?\n¿Hay mascotas en la propiedad?"}
              rows={4}
              className="mt-1 w-full rounded-md border border-[#263040] bg-[#0D1117] px-3 py-2 text-sm text-[#E2ECF4] placeholder:text-[#7A96A8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B968] resize-none"
            />
          </div>
        </div>
      )}

      {/* Step 6: Resumen y precio */}
      {step === 6 && calcResult && (
        <div className="space-y-5">
          <h2 className="text-lg font-semibold text-[#E2ECF4] mb-6">Resumen y precio</h2>

          {/* Property summary — compact */}
          <div className="bg-[#161C26] rounded-xl border border-[#263040] px-4 py-3">
            <p className="text-sm text-[#C8D8E4] truncate mb-1.5 font-medium">{direccion}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="text-[#F2B968] capitalize font-semibold">{tipoPropiedad}</span>
              <span className="text-[#4A6070]">·</span>
              {tipoPropiedad === "departamento" ? (
                <span className="text-[#A8BCC8]">
                  {superficie}m² construidos
                  {descubierta > 0 && ` · ${descubierta}m² semi+desc`}
                </span>
              ) : (
                <span className="text-[#A8BCC8]">
                  {construida}m² construidos · {descubierta}m² semi+desc
                </span>
              )}
              {amenidades > 0 && (
                <>
                  <span className="text-[#4A6070]">·</span>
                  <span className="text-[#A8BCC8]">{amenidades} amenities</span>
                </>
              )}
              <span className="text-[#4A6070]">·</span>
              <span className="text-[#A8BCC8] capitalize">{ocupacion}</span>
            </div>
          </div>

          {/* Price breakdown with inline remove buttons */}
          <div className="bg-[#161C26] rounded-xl border border-[#263040] p-5">
            <h3 className="font-semibold text-[#E2ECF4] mb-4">Desglose</h3>
            <div className="text-sm space-y-2">

              {/* Base package line */}
              <div className="flex items-center justify-between py-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[#C8D8E4]">
                    {servicios.soloFotos
                      ? "Solo Fotos (−25%)"
                      : servicios.videoAdicional
                      ? "Fotos + Video + 2do Video (+25%)"
                      : "Fotos + Video"}
                    <span className="text-xs ml-1 text-[#7A96A8]">
                      {tipoPropiedad === "departamento"
                        ? `(para ${superficie + Math.min(descubierta, 20) + amenidades * 7}m²)`
                        : `(para ${construida}m² construidos)`}
                    </span>
                  </span>
                  {(servicios.soloFotos || servicios.videoAdicional) && (
                    <button
                      onClick={() => setServicios((prev) => ({ ...prev, soloFotos: false, videoAdicional: false }))}
                      className="w-4 h-4 rounded-full bg-[#263040] hover:bg-red-500/20 flex items-center justify-center transition"
                      title="Revertir a Fotos + Video estándar"
                    >
                      <X className="w-2.5 h-2.5 text-[#7A96A8]" />
                    </button>
                  )}
                </div>
                <span className="text-[#E2ECF4] font-mono">${calcResult.precioBase.toFixed(2)}</span>
              </div>

              {/* Extras with remove buttons */}
              {calcResult.desglose.map((item: PriceBreakdownItem, i: number) => {
                const serviceKey =
                  item.concepto.startsWith("Tour 360") ? "tour360"
                  : item.concepto === "Plano 2D" ? "plano2d"
                  : item.concepto === "Drone" ? "drone"
                  : item.concepto === "Amoblamiento Virtual" ? "amoblamiento"
                  : null;
                return (
                  <div key={i} className="flex items-center justify-between py-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[#C8D8E4]">
                        {item.concepto}
                        <span className="text-xs ml-1 text-[#7A96A8]">({item.calculo})</span>
                      </span>
                      {serviceKey && (
                        <button
                          onClick={() => toggleServicio(serviceKey as keyof ProductionServices)}
                          className="w-4 h-4 rounded-full bg-[#263040] hover:bg-red-500/20 flex items-center justify-center transition"
                          title="Quitar servicio"
                        >
                          <X className="w-2.5 h-2.5 text-[#7A96A8]" />
                        </button>
                      )}
                    </div>
                    <span className="text-[#E2ECF4] font-mono">${item.monto.toFixed(2)}</span>
                  </div>
                );
              })}

              <hr className="border-[#263040] my-1" />

              <div className="flex justify-between">
                <span className="text-[#A8BCC8]">Subtotal</span>
                <span className="text-[#E2ECF4] font-mono">${calcResult.subtotal.toFixed(2)}</span>
              </div>

              {calcResult.minimoAplicado && (
                <p className="text-xs text-amber-400">* Se aplica mínimo de $50 USD</p>
              )}

              {calcResult.descuentoInmobiliaria > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>
                    Descuento inmobiliaria ({calcResult.porcentajeDescuento}%
                    {descuentoManual > 0 && descuentoCapa1 > 0 && (
                      <span className="text-xs opacity-70"> = {descuentoManual}% base + {descuentoCapa1}% Capa 1</span>
                    )}
                    {descuentoCapa1 > 0 && descuentoManual === 0 && (
                      <span className="text-xs opacity-70"> Capa 1 por volumen</span>
                    )}
                    )
                  </span>
                  <span className="font-mono">−${calcResult.descuentoInmobiliaria.toFixed(2)}</span>
                </div>
              )}

              {(() => {
                const elegibles = [
                  true,
                  !servicios.soloFotos,
                  servicios.videoAdicional,
                  servicios.plano2d,
                  servicios.tour360,
                  servicios.drone,
                ].filter(Boolean).length;
                if (elegibles < 4) return null;
                const descPaquete = calcResult.withMinimo * 0.05;
                return (
                  <div className="flex justify-between text-green-400">
                    <span>Descuento paquete 4+ servicios (5%)</span>
                    <span className="font-mono">−${descPaquete.toFixed(2)}</span>
                  </div>
                );
              })()}

              {/* Código de descuento aplicado */}
              {codigoAplicado && (() => {
                const elegibles = [true, !servicios.soloFotos, servicios.videoAdicional, servicios.plano2d, servicios.tour360, servicios.drone].filter(Boolean).length;
                const descPaquete = elegibles >= 4 ? calcResult.withMinimo * 0.05 : 0;
                const baseParaCodigo = calcResult.total - descPaquete;
                const descCodigo = baseParaCodigo * (codigoAplicado.porcentaje / 100);
                return (
                  <div className="flex justify-between text-green-400">
                    <span className="flex items-center gap-1.5">
                      Código {codigoAplicado.codigo} ({codigoAplicado.porcentaje}%)
                      <button onClick={handleQuitarCodigo} className="w-3.5 h-3.5 rounded-full bg-green-500/20 hover:bg-red-500/30 flex items-center justify-center transition" title="Quitar código">
                        <X className="w-2 h-2" />
                      </button>
                    </span>
                    <span className="font-mono">−${descCodigo.toFixed(2)}</span>
                  </div>
                );
              })()}

              <hr className="border-[#263040] my-1" />

              <div className="flex justify-between items-center pt-1">
                <span className="text-lg font-bold text-[#E2ECF4]">TOTAL</span>
                {(() => {
                  const elegibles = [
                    true,
                    !servicios.soloFotos,
                    servicios.videoAdicional,
                    servicios.plano2d,
                    servicios.tour360,
                    servicios.drone,
                  ].filter(Boolean).length;
                  const descPaquete = elegibles >= 4 ? calcResult.withMinimo * 0.05 : 0;
                  const baseParaCodigo = calcResult.total - descPaquete;
                  const descCodigo = codigoAplicado ? baseParaCodigo * (codigoAplicado.porcentaje / 100) : 0;
                  const totalFinal = baseParaCodigo - descCodigo;
                  return (
                    <span className="text-2xl font-bold text-[#F2B968] font-mono">
                      ${totalFinal.toFixed(2)} USD
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Quick-add suggestions */}
            {(() => {
              const m2Relevante = tipoPropiedad === "departamento" ? superficie : construida;
              const m2T = tipoPropiedad === "departamento"
                ? superficie + amenidades * 7
                : construida + amenidades * 7;
              const sugs: { key: keyof ProductionServices; label: string; price: string }[] = [];

              if (!servicios.soloFotos && !servicios.videoAdicional) {
                const incr = calcResult.precioBase * 0.25;
                sugs.push({ key: "videoAdicional", label: "2do Video", price: `+$${incr.toFixed(2)}` });
              }
              if (!servicios.drone) {
                sugs.push({ key: "drone", label: "Drone", price: "+$65.00" });
              }
              if (!servicios.plano2d) {
                sugs.push({ key: "plano2d", label: "Plano 2D", price: `+$${precioPlano(m2Relevante).toFixed(2)}` });
              }
              if (!servicios.tour360) {
                const pInt = Math.ceil(m2T / 10) * 2;
                const pExt = tipoPropiedad === "casa" && descubierta > 0
                  ? Math.ceil(Math.min(descubierta, 240) / 40 + 1 + amenidades) * 2
                  : 0;
                sugs.push({ key: "tour360", label: "Tour 360°", price: `+$${(pInt + pExt).toFixed(2)}` });
              }
              if (sugs.length === 0) return null;
              return (
                <div className="mt-4 pt-4 border-t border-[#263040]">
                  <p className="text-xs text-[#7A96A8] uppercase tracking-wide mb-2">Agregar <span className="normal-case opacity-70">(por si creés que puede sumar)</span></p>
                  <div className="flex flex-wrap gap-2">
                    {sugs.map((s) => (
                      <button
                        key={s.key}
                        onClick={() => toggleServicio(s.key)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#263040] bg-[#0D1117] text-sm text-[#7A96A8] hover:border-[#F2B968]/50 hover:text-[#F2B968] transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {s.label}
                        <span className="opacity-60 text-xs">{s.price}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Código de descuento — input */}
          <div className="bg-[#161C26] rounded-xl border border-[#263040] p-4">
            <p className="text-xs text-[#7A96A8] uppercase tracking-wide mb-3">Código de descuento</p>
            {codigoAplicado ? (
              <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-2.5">
                <div>
                  <span className="font-mono font-bold text-green-400 tracking-wider">{codigoAplicado.codigo}</span>
                  <span className="text-sm text-green-400 ml-2">— {codigoAplicado.porcentaje}% de descuento aplicado</span>
                </div>
                <button onClick={handleQuitarCodigo} className="text-green-400/60 hover:text-red-400 transition text-xs underline">Quitar</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ingresá tu código"
                  value={codigoInput}
                  onChange={(e) => { setCodigoInput(e.target.value.toUpperCase()); setCodigoError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleValidarCodigo()}
                  className="flex-1 bg-[#0D1117] border border-[#263040] rounded-lg px-3 py-2 text-sm text-[#E2ECF4] placeholder:text-[#7A96A8] focus:outline-none focus:border-[#F2B968]/50 font-mono uppercase tracking-wider"
                />
                <button
                  onClick={handleValidarCodigo}
                  disabled={codigoLoading || !codigoInput.trim()}
                  className="px-4 py-2 rounded-lg bg-[#F2B968]/10 border border-[#F2B968]/30 text-[#F2B968] text-sm font-medium hover:bg-[#F2B968]/20 transition disabled:opacity-40"
                >
                  {codigoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aplicar"}
                </button>
              </div>
            )}
            {codigoError && <p className="text-xs text-red-400 mt-2">{codigoError}</p>}
          </div>

          {/* Ratio card — 4 cuadrantes */}
          {(() => {
            const elegibles = [
              true,
              !servicios.soloFotos,
              servicios.videoAdicional,
              servicios.plano2d,
              servicios.tour360,
              servicios.drone,
            ].filter(Boolean).length;
            const descPaquete = elegibles >= 4 ? calcResult.withMinimo * 0.05 : 0;
            const descCodigo = codigoAplicado ? (calcResult.total - descPaquete) * (codigoAplicado.porcentaje / 100) : 0;
            const totalFinal = calcResult.total - descPaquete - descCodigo;
            const comision = valorEstimado * 0.05;
            const ratio = (totalFinal / comision) * 100;
            return (
              <div className="border border-[#F2B968]/25 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-[#F2B968]/8 flex items-center gap-2">
                  <p className="text-sm font-medium text-[#F2B968]">Estadísticas de inversión</p>
                </div>
                <div className="p-4 bg-[#F2B968]/5 grid grid-cols-2 gap-2">
                  <div className="bg-[#0D1117]/60 rounded-lg px-3 py-2.5">
                    <p className="text-xs text-[#7A96A8] mb-1">Valor del inmueble</p>
                    <p className="text-base font-bold text-[#E2ECF4]">
                      USD {valorEstimado.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="bg-[#0D1117]/60 rounded-lg px-3 py-2.5">
                    <p className="text-xs text-[#7A96A8] mb-1">Comisión estimada (5%, prom. gral.)</p>
                    <p className="text-base font-bold text-[#E2ECF4]">
                      USD {comision.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="bg-[#0D1117]/60 rounded-lg px-3 py-2.5">
                    <p className="text-xs text-[#7A96A8] mb-1">Esta producción</p>
                    <p className="text-base font-bold text-[#E2ECF4]">USD {totalFinal.toFixed(2)}</p>
                  </div>
                  <div className="bg-[#F2B968]/10 rounded-lg px-3 py-2.5">
                    <p className="text-xs text-[#7A96A8] mb-1">% invertido de la comisión en nuestros servicios</p>
                    <p className="text-base font-bold text-[#F2B968]">{ratio.toFixed(2)}%</p>
                    <p className="text-xs text-[#7A96A8] mt-1.5 italic">¡Mirá si no vale la pena! 😉</p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        {step > 1 ? (
          <Button
            variant="outline"
            onClick={() => { setStep((step - 1) as Step); setStepErrors({}); }}
            className="border-[#263040] bg-transparent text-[#E2ECF4] hover:bg-[#1E2A38]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Anterior
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard")}
            className="border-[#263040] bg-transparent text-[#E2ECF4] hover:bg-[#1E2A38]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        )}

        {step < 6 ? (
          <Button
            onClick={validateAndNext}
            disabled={!canNext()}
            className="bg-[#F2B968] hover:bg-[#d9a050] text-[#0D1117] font-semibold"
          >
            Siguiente
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-[#F2B968] hover:bg-[#d9a050] text-[#0D1117] font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              "Solicitar Producción"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
