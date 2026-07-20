"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter } from "next/navigation";
import { createProduction, getInmobiliaria } from "@/lib/firebase/firestore";
import { sendEmail, ADMIN_EMAIL } from "@/lib/email/send";
import { calcularPrecioDepto } from "@/lib/pricing/departamentos";
import { calcularPrecioCasa } from "@/lib/pricing/casas";
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
} from "lucide-react";
import dynamic from "next/dynamic";

const AddressInput = dynamic(() => import("@/components/shared/AddressMap"), {
  ssr: false,
  loading: () => <div className="h-10 rounded-md border border-gray-200 bg-gray-50" />,
});

type Step = 1 | 2 | 3 | 4 | 5 | 6;

export default function NuevaProduccionPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [descuento, setDescuento] = useState(0);

  // Step 1
  const [tipoPropiedad, setTipoPropiedad] = useState<PropertyType | null>(null);

  // Step 2
  const [direccion, setDireccion] = useState("");
  const [superficie, setSuperficie] = useState<number>(0);
  const [construida, setConstruida] = useState<number>(0);
  const [descubierta, setDescubierta] = useState<number>(0);
  const [amenidades, setAmenidades] = useState<number>(0);

  // Step 3
  const [ocupacion, setOcupacion] = useState<PropertyOccupation>("vacia");
  const [tipoOcupacion, setTipoOcupacion] = useState<OccupationType>("propietario");

  // Step 4
  const [servicios, setServicios] = useState<ProductionServices>({
    soloFotos: false,
    videoAdicional: false,
    plano2d: false,
    tour360: false,
    drone: false,
    amoblamiento: false,
    cantidadFotosAmobladas: 0,
  });

  // Step 5
  const [horarios, setHorarios] = useState("");
  const [observaciones, setObservaciones] = useState("");

  // Load discount
  useEffect(() => {
    async function loadDiscount() {
      if (profile?.inmobiliariaId) {
        const inmob = await getInmobiliaria(profile.inmobiliariaId);
        if (inmob) setDescuento(inmob.descuento);
      }
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

  // Calculate price
  const calcResult = tipoPropiedad === "departamento"
    ? calcularPrecioDepto({
        superficie,
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

  const canNext = (): boolean => {
    switch (step) {
      case 1: return tipoPropiedad !== null;
      case 2:
        if (!direccion) return false;
        if (tipoPropiedad === "departamento") return superficie > 0;
        return construida > 0;
      case 3: return true;
      case 4: return true;
      case 5: return horarios.trim().length > 0;
      case 6: return true;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    if (!profile || !calcResult) return;
    setLoading(true);
    try {
      const horariosSugeridos = horarios
        .split("\n")
        .map((h) => h.trim())
        .filter(Boolean);

      await createProduction({
        agenteId: profile.uid,
        agenteNombre: profile.nombre,
        inmobiliariaId: profile.inmobiliariaId || "",
        inmobiliariaNombre: "",
        tipoPropiedad: tipoPropiedad!,
        direccion,
        ...(tipoPropiedad === "departamento" ? { superficie } : { construida, descubierta }),
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
        precioFinal: calcResult.total,
        desglose: calcResult.desglose,
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
        precioFinal: calcResult.total,
      });
    } catch (err) {
      console.error("Error creating production:", err);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-[#2C2C2C] mb-4">¡Producción solicitada!</h1>
        <p className="text-[#5A5A5A] mb-8">
          Tu solicitud fue enviada. Te notificaremos cuando confirmemos el horario.
        </p>
        <Button
          onClick={() => router.push("/producciones")}
          className="bg-[#C07856] hover:bg-[#a8654a]"
        >
          Ver mis producciones
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-[#2C2C2C] mb-2">Nueva Producción</h1>
      <p className="text-[#5A5A5A] mb-8">Paso {step} de 6</p>

      {/* Progress bar */}
      <div className="flex gap-1 mb-8">
        {[1, 2, 3, 4, 5, 6].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition ${
              s <= step ? "bg-[#C07856]" : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      {/* Step 1: Tipo de propiedad */}
      {step === 1 && (
        <div>
          <h2 className="text-lg font-semibold text-[#2C2C2C] mb-6">Tipo de propiedad</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setTipoPropiedad("departamento")}
              className={`p-6 rounded-xl border-2 transition text-left ${
                tipoPropiedad === "departamento"
                  ? "border-[#C07856] bg-[#C07856]/5"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <Building2 className={`w-8 h-8 mb-3 ${tipoPropiedad === "departamento" ? "text-[#C07856]" : "text-gray-400"}`} />
              <p className="font-semibold text-[#2C2C2C]">Departamento</p>
            </button>
            <button
              onClick={() => setTipoPropiedad("casa")}
              className={`p-6 rounded-xl border-2 transition text-left ${
                tipoPropiedad === "casa"
                  ? "border-[#C07856] bg-[#C07856]/5"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <Home className={`w-8 h-8 mb-3 ${tipoPropiedad === "casa" ? "text-[#C07856]" : "text-gray-400"}`} />
              <p className="font-semibold text-[#2C2C2C]">Casa</p>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Datos de propiedad */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[#2C2C2C] mb-6">Datos de la propiedad</h2>

          <div>
            <Label className="text-[#2C2C2C] mb-1.5 block">Dirección completa</Label>
            <AddressInput
              address={direccion}
              onAddressChange={setDireccion}
            />
          </div>

          {tipoPropiedad === "departamento" ? (
            <div>
              <Label className="text-[#2C2C2C]">Superficie (m²)</Label>
              <Input
                type="number"
                min={1}
                value={superficie || ""}
                onChange={(e) => setSuperficie(Number(e.target.value))}
                placeholder="85"
                className="mt-1 bg-white border-gray-200"
              />
            </div>
          ) : (
            <>
              <div>
                <Label className="text-[#2C2C2C]">Superficie construida (m²)</Label>
                <Input
                  type="number"
                  min={1}
                  value={construida || ""}
                  onChange={(e) => setConstruida(Number(e.target.value))}
                  placeholder="180"
                  className="mt-1 bg-white border-gray-200"
                />
              </div>
              <div>
                <Label className="text-[#2C2C2C]">Superficie descubierta (m²)</Label>
                <Input
                  type="number"
                  min={0}
                  value={descubierta || ""}
                  onChange={(e) => setDescubierta(Number(e.target.value))}
                  placeholder="250"
                  className="mt-1 bg-white border-gray-200"
                />
              </div>
            </>
          )}

          <div>
            <Label className="text-[#2C2C2C]">Amenidades (cantidad)</Label>
            <Input
              type="number"
              min={0}
              value={amenidades || ""}
              onChange={(e) => setAmenidades(Number(e.target.value))}
              placeholder="2"
              className="mt-1 bg-white border-gray-200"
            />
            <p className="text-xs text-[#5A5A5A] mt-1">Pileta, quincho, SUM, gimnasio, etc.</p>
          </div>
        </div>
      )}

      {/* Step 3: Estado de propiedad */}
      {step === 3 && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-[#2C2C2C] mb-6">Estado de la propiedad</h2>
          <div>
            <Label className="text-[#2C2C2C] mb-3 block">Ocupación</Label>
            <div className="flex gap-3">
              {(["vacia", "ocupada"] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setOcupacion(opt)}
                  className={`px-6 py-3 rounded-lg border-2 font-medium transition ${
                    ocupacion === opt
                      ? "border-[#C07856] bg-[#C07856]/5 text-[#C07856]"
                      : "border-gray-200 text-[#5A5A5A] hover:border-gray-300"
                  }`}
                >
                  {opt === "vacia" ? "Vacía" : "Ocupada"}
                </button>
              ))}
            </div>
          </div>

          {ocupacion === "ocupada" && (
            <div>
              <Label className="text-[#2C2C2C] mb-3 block">¿Quién la ocupa?</Label>
              <div className="flex gap-3">
                {(["propietario", "inquilino"] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setTipoOcupacion(opt)}
                    className={`px-6 py-3 rounded-lg border-2 font-medium transition ${
                      tipoOcupacion === opt
                        ? "border-[#C07856] bg-[#C07856]/5 text-[#C07856]"
                        : "border-gray-200 text-[#5A5A5A] hover:border-gray-300"
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
          <h2 className="text-lg font-semibold text-[#2C2C2C] mb-6">Servicios</h2>

          {/* Base service - always included */}
          <div className="w-full p-4 rounded-xl border-2 border-[#C07856] bg-[#C07856]/5 text-left">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-[#2C2C2C]">Fotos + Video</p>
                  <span className="text-xs bg-[#C07856] text-white px-2 py-0.5 rounded-full">Base</span>
                </div>
                <p className="text-sm text-[#5A5A5A]">
                  {tipoPropiedad === "departamento"
                    ? (() => {
                        const supTotal = superficie + amenidades * 7;
                        const tarifa = supTotal <= 60 ? 1.50 : supTotal <= 80 ? 1.35 : supTotal <= 100 ? 1.10 : 1.00;
                        return `${superficie}m²${amenidades > 0 ? ` + ${amenidades} amenidades (${amenidades * 7}m²) = ${supTotal}m²` : ""} × $${tarifa.toFixed(2)}/m² = $${(supTotal * tarifa).toFixed(2)} USD`;
                      })()
                    : "Calculado según superficie construida y descubierta"}
                </p>
              </div>
              <CheckCircle className="w-5 h-5 text-[#C07856] shrink-0" />
            </div>
          </div>

          <p className="text-xs text-[#5A5A5A] font-medium uppercase tracking-wide pt-2">Modificadores y extras</p>

          {[
            { key: "soloFotos" as const, label: "Solo Fotos (sin video)", desc: "30% descuento sobre base" },
            { key: "videoAdicional" as const, label: "Video Adicional", desc: "+20% sobre base" },
            { key: "plano2d" as const, label: "Plano 2D", desc: "$0.35/m²" },
            { key: "tour360" as const, label: "Tour 360°", desc: "Calculado por superficie" },
            { key: "drone" as const, label: "Drone", desc: "$65 USD" },
            { key: "amoblamiento" as const, label: "Amoblamiento Virtual", desc: "$6/foto" },
          ].map((item) => (
            <div key={item.key}>
              <button
                onClick={() => toggleServicio(item.key)}
                className={`w-full p-4 rounded-xl border-2 transition text-left flex items-center justify-between ${
                  servicios[item.key]
                    ? "border-[#C07856] bg-[#C07856]/5"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div>
                  <p className="font-medium text-[#2C2C2C]">{item.label}</p>
                  <p className="text-sm text-[#5A5A5A]">{item.desc}</p>
                </div>
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                    servicios[item.key]
                      ? "border-[#C07856] bg-[#C07856]"
                      : "border-gray-300"
                  }`}
                >
                  {servicios[item.key] && (
                    <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </button>

              {item.key === "amoblamiento" && servicios.amoblamiento && (
                <div className="mt-2 ml-4">
                  <Label className="text-[#2C2C2C]">Cantidad de fotos a amoblar</Label>
                  <Input
                    type="number"
                    min={1}
                    value={servicios.cantidadFotosAmobladas || ""}
                    onChange={(e) =>
                      setServicios((prev) => ({
                        ...prev,
                        cantidadFotosAmobladas: Number(e.target.value),
                      }))
                    }
                    placeholder="3"
                    className="mt-1 bg-white border-gray-200 w-32"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Step 5: Coordinación */}
      {step === 5 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[#2C2C2C] mb-6">Coordinación</h2>
          <div>
            <Label className="text-[#2C2C2C]">Sugerí 2-3 rangos horarios</Label>
            <textarea
              value={horarios}
              onChange={(e) => setHorarios(e.target.value)}
              placeholder={"Lunes 18/3 de 9-11hs\nMartes 19/3 de 14-16hs\nMiércoles 20/3 de 10-12hs"}
              rows={4}
              className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C07856] resize-none"
            />
          </div>
          <div>
            <Label className="text-[#2C2C2C]">Observaciones</Label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder={"¿Desde dónde iniciar el video?\n¿Algo que quieras resaltar?\n¿Hay mascotas en la propiedad?"}
              rows={4}
              className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C07856] resize-none"
            />
          </div>
        </div>
      )}

      {/* Step 6: Resumen y precio */}
      {step === 6 && calcResult && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-[#2C2C2C] mb-6">Resumen y precio</h2>

          {/* Property summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h3 className="font-semibold text-[#2C2C2C]">Propiedad</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-[#5A5A5A]">Tipo:</span>
              <span className="text-[#2C2C2C] capitalize">{tipoPropiedad}</span>
              <span className="text-[#5A5A5A]">Dirección:</span>
              <span className="text-[#2C2C2C]">{direccion}</span>
              {tipoPropiedad === "departamento" ? (
                <>
                  <span className="text-[#5A5A5A]">Superficie:</span>
                  <span className="text-[#2C2C2C]">{superficie} m²</span>
                </>
              ) : (
                <>
                  <span className="text-[#5A5A5A]">Construida:</span>
                  <span className="text-[#2C2C2C]">{construida} m²</span>
                  <span className="text-[#5A5A5A]">Descubierta:</span>
                  <span className="text-[#2C2C2C]">{descubierta} m²</span>
                </>
              )}
              <span className="text-[#5A5A5A]">Amenidades:</span>
              <span className="text-[#2C2C2C]">{amenidades}</span>
              <span className="text-[#5A5A5A]">Estado:</span>
              <span className="text-[#2C2C2C] capitalize">{ocupacion}</span>
            </div>
          </div>

          {/* Services summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h3 className="font-semibold text-[#2C2C2C]">Servicios</h3>
            <div className="text-sm space-y-1">
              <p className="text-[#2C2C2C]">
                {servicios.soloFotos ? "Solo Fotos" : "Fotos + Video"}
              </p>
              {servicios.videoAdicional && <p className="text-[#2C2C2C]">+ Video Adicional</p>}
              {servicios.plano2d && <p className="text-[#2C2C2C]">+ Plano 2D</p>}
              {servicios.tour360 && <p className="text-[#2C2C2C]">+ Tour 360°</p>}
              {servicios.drone && <p className="text-[#2C2C2C]">+ Drone</p>}
              {servicios.amoblamiento && (
                <p className="text-[#2C2C2C]">+ Amoblamiento Virtual ({servicios.cantidadFotosAmobladas} fotos)</p>
              )}
            </div>
          </div>

          {/* Price breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h3 className="font-semibold text-[#2C2C2C]">Desglose de precio</h3>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-[#5A5A5A]">
                  Precio base {servicios.soloFotos ? "(solo fotos)" : "(fotos + video)"}
                </span>
                <span className="text-[#2C2C2C] font-mono">${calcResult.precioBase.toFixed(2)}</span>
              </div>

              {calcResult.desglose.map((item: PriceBreakdownItem, i: number) => (
                <div key={i} className="flex justify-between">
                  <span className="text-[#5A5A5A]">
                    {item.concepto}
                    <span className="text-xs ml-1">({item.calculo})</span>
                  </span>
                  <span className="text-[#2C2C2C] font-mono">${item.monto.toFixed(2)}</span>
                </div>
              ))}

              <hr className="border-gray-100" />

              <div className="flex justify-between">
                <span className="text-[#5A5A5A]">Subtotal</span>
                <span className="text-[#2C2C2C] font-mono">${calcResult.subtotal.toFixed(2)}</span>
              </div>

              {calcResult.descuentoInmobiliaria > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Descuento inmobiliaria ({calcResult.porcentajeDescuento}%)</span>
                  <span className="font-mono">-${calcResult.descuentoInmobiliaria.toFixed(2)}</span>
                </div>
              )}

              {calcResult.minimoAplicado && (
                <p className="text-xs text-amber-600">* Se aplica mínimo de $50 USD</p>
              )}

              <hr className="border-gray-200" />

              <div className="flex justify-between items-center pt-1">
                <span className="text-lg font-bold text-[#2C2C2C]">TOTAL</span>
                <span className="text-2xl font-bold text-[#C07856] font-mono">
                  ${calcResult.total.toFixed(2)} USD
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        {step > 1 ? (
          <Button
            variant="outline"
            onClick={() => setStep((step - 1) as Step)}
            className="border-gray-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Anterior
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard")}
            className="border-gray-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        )}

        {step < 6 ? (
          <Button
            onClick={() => setStep((step + 1) as Step)}
            disabled={!canNext()}
            className="bg-[#C07856] hover:bg-[#a8654a]"
          >
            Siguiente
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-[#C07856] hover:bg-[#a8654a]"
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
