"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { getProductions, getInmobiliaria, LIMITE_CC, DIAS_PLAZO_CC } from "@/lib/firebase/firestore";
import type { Inmobiliaria, Production } from "@/types";
import Link from "next/link";
import {
  FolderOpen,
  Plus,
  Gift,
  Clock,
  CheckCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  ClipboardCheck,
  CreditCard,
  Upload,
  AlertCircle,
  CalendarClock,
} from "lucide-react";

function usd(value: number, decimals = 2) {
  return `USD ${value.toLocaleString("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

function toTimestamp(val: unknown): Date | null {
  if (!val) return null;
  if (typeof val === "object" && val !== null && "toDate" in val)
    return (val as { toDate: () => Date }).toDate();
  if (val instanceof Date) return val;
  return null;
}

function getDiasRestantes(impagas: Production[]): { dias: number; vencimiento: string } | null {
  if (impagas.length === 0) return null;
  let ultimaFecha: Date | null = null;
  for (const p of impagas) {
    const f = toTimestamp(p.fechaListo);
    if (f && (!ultimaFecha || f > ultimaFecha)) ultimaFecha = f;
  }
  if (!ultimaFecha) return null;
  const vto = new Date(ultimaFecha.getTime() + 5 * 24 * 60 * 60 * 1000);
  const hoy = new Date();
  const dias = Math.ceil((vto.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  const vencimiento = vto.toLocaleDateString("es-AR", { day: "numeric", month: "long" });
  return { dias, vencimiento };
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const [producciones, setProducciones] = useState<Production[]>([]);
  const [inmobiliaria, setInmobiliaria] = useState<Inmobiliaria | null>(null);
  const [loading, setLoading] = useState(true);
  const [estadisticasOpen, setEstadisticasOpen] = useState(false);
  const [cuentasOpen, setCuentasOpen] = useState(false);
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);
  const [uploadingComprobante, setUploadingComprobante] = useState(false);
  const [comprobanteOk, setComprobanteOk] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      if (!profile) return;
      try {
        const [data, inmo] = await Promise.all([
          getProductions({ agenteId: profile.uid }),
          profile.inmobiliariaId ? getInmobiliaria(profile.inmobiliariaId) : Promise.resolve(null),
        ]);
        setProducciones(data);
        setInmobiliaria(inmo);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [profile]);

  const pendientes = producciones.filter((p) => p.estado === "pendiente").length;
  const enProceso = producciones.filter((p) => p.estado === "en_proceso").length;
  const listas = producciones.filter((p) => p.estado === "listo").length;

  // Saldo: producciones listas y no marcadas como pagadas
  const impagas = producciones.filter((p) => p.estado === "listo" && !p.pagada);
  const saldoPendiente = impagas.reduce((sum, p) => sum + (p.precioFinal || 0), 0);
  const pagoInfo = getDiasRestantes(impagas);

  // Cuenta corriente
  const tieneCC = profile?.cuentaCorrienteAprobada === true;
  const impagoCC = producciones.filter((p) => p.esCuentaCorriente && !p.pagada && p.estado === "listo");
  const saldoCC = impagoCC.reduce((sum, p) => sum + (p.precioFinal || 0), 0);
  const ccBloqueada = (() => {
    if (!tieneCC) return false;
    if (saldoCC >= LIMITE_CC) return true;
    if (impagoCC.length > 0) {
      const fechas = impagoCC.map((p) => {
        const f = p.fechaListo;
        if (!f) return new Date(0);
        return typeof f === "object" && "toDate" in f ? (f as { toDate: () => Date }).toDate() : new Date(f as unknown as string);
      });
      const oldest = new Date(Math.min(...fechas.map((d) => d.getTime())));
      return Math.floor((Date.now() - oldest.getTime()) / (1000 * 60 * 60 * 24)) > DIAS_PLAZO_CC;
    }
    return false;
  })();
  const diasCC = (() => {
    if (impagoCC.length === 0) return null;
    const fechas = impagoCC.map((p) => {
      const f = p.fechaListo;
      if (!f) return new Date(0);
      return typeof f === "object" && "toDate" in f ? (f as { toDate: () => Date }).toDate() : new Date(f as unknown as string);
    });
    const oldest = new Date(Math.min(...fechas.map((d) => d.getTime())));
    return Math.floor((Date.now() - oldest.getTime()) / (1000 * 60 * 60 * 24));
  })();

  // Estadísticas de inversión
  const totalInvertido = producciones.reduce((sum, p) => sum + (p.precioFinal || 0), 0);
  const prodsConValor = producciones.filter((p) => p.valorEstimado && p.valorEstimado > 0);
  const totalValorInmuebles = prodsConValor.reduce((sum, p) => sum + (p.valorEstimado || 0), 0);
  const totalComision = totalValorInmuebles * 0.05;
  const pctInvertido = totalComision > 0 ? (totalInvertido / totalComision) * 100 : 0;

  async function handleComprobanteUpload(file: File) {
    setUploadingComprobante(true);
    try {
      const presignRes = await fetch("/api/r2/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produccionId: `comprobantes/${profile?.uid}`,
          nombre: file.name,
          contentType: file.type || "application/octet-stream",
        }),
      });
      if (!presignRes.ok) throw new Error("No se pudo obtener URL de carga");
      const { url } = await presignRes.json();
      const uploadRes = await fetch(url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      if (!uploadRes.ok) throw new Error("Error subiendo archivo");
      setComprobanteOk(true);
    } catch (err) {
      console.error("Error subiendo comprobante:", err);
    } finally {
      setUploadingComprobante(false);
    }
  }

  const statusCards = [
    {
      label: "Pendientes",
      value: pendientes,
      icon: Clock,
      color: "text-amber-400",
      bg: "bg-amber-400/10",
      border: "border-amber-400/20",
      href: "/producciones?estado=pendiente",
    },
    {
      label: "En proceso",
      value: enProceso,
      icon: Loader2,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
      border: "border-blue-400/20",
      href: "/producciones?estado=en_proceso",
    },
    {
      label: "Listas",
      value: listas,
      icon: CheckCircle,
      color: "text-green-400",
      bg: "bg-green-400/10",
      border: "border-green-400/20",
      href: "/producciones?estado=listo",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#E2ECF4] mb-1">
        ¡Hola, {profile?.nombre?.split(" ")[0]}!
      </h1>
      <p className="text-[#7A96A8] mb-6">Bienvenido a tu portal de producciones</p>

      {/* Status cards — compactas */}
      {!loading && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {statusCards.map(({ label, value, icon: Icon, color, bg, border, href }) => (
            <Link
              key={label}
              href={href}
              className={`rounded-xl border ${border} ${bg} px-3 py-2.5 flex items-center gap-3 hover:brightness-110 transition group`}
            >
              <div className={`w-8 h-8 rounded-lg bg-[#0D1117]/40 flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#E2ECF4] tabular-nums leading-none">{value}</p>
                <p className={`text-xs font-medium mt-0.5 ${color}`}>{label}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <Link
          href="/producciones/nueva"
          className="bg-[#F2B968] hover:bg-[#d9a050] text-[#0D1117] p-5 rounded-xl transition group flex items-start gap-3"
        >
          <div className="w-9 h-9 rounded-lg bg-[#0D1117]/15 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Plus className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold mb-0.5">Nueva producción</h2>
            <p className="text-[#0D1117]/60 text-sm">Solicitá una nueva producción fotográfica</p>
          </div>
        </Link>

        <Link
          href="/producciones"
          className="bg-[#161C26] border border-[#263040] hover:border-[#F2B968]/50 p-5 rounded-xl transition group flex items-start gap-3"
        >
          <div className="w-9 h-9 rounded-lg bg-[#F2B968]/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <FolderOpen className="w-4 h-4 text-[#F2B968]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#E2ECF4] mb-0.5">Mis producciones</h2>
            <p className="text-[#7A96A8] text-sm">Mirá el estado de tus producciones</p>
          </div>
        </Link>

        <Link
          href="/beneficios"
          className="bg-[#161C26] border border-[#263040] hover:border-[#F2B968]/50 p-5 rounded-xl transition group flex items-start gap-3"
        >
          <div className="w-9 h-9 rounded-lg bg-[#F2B968]/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Gift className="w-4 h-4 text-[#F2B968]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#E2ECF4] mb-0.5">Beneficios</h2>
            <p className="text-[#7A96A8] text-sm">Descubrí los beneficios de tu inmobiliaria</p>
          </div>
        </Link>

        <Link
          href="/preparacion"
          className="bg-[#161C26] border border-[#263040] hover:border-[#F2B968]/50 p-5 rounded-xl transition group flex items-start gap-3"
        >
          <div className="w-9 h-9 rounded-lg bg-[#F2B968]/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <ClipboardCheck className="w-4 h-4 text-[#F2B968]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#E2ECF4] mb-0.5">Preparación</h2>
            <p className="text-[#7A96A8] text-sm">Tips para preparar la propiedad</p>
          </div>
        </Link>
      </div>

      {/* ── Cuentas y Saldos a pagar ── */}
      {!loading && (
        <div className="mb-4 border border-[#263040] rounded-xl overflow-hidden">
          <button
            onClick={() => setCuentasOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#1E2A38] transition"
          >
            <div className="flex items-center gap-2.5">
              <CreditCard className="w-4 h-4 text-[#7A96A8]" />
              <span className="text-sm font-medium text-[#E2ECF4]">Cuentas y Saldos a pagar</span>
              {saldoPendiente > 0 && (
                <span className="text-xs bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">
                  {impagas.length} impaga{impagas.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            {cuentasOpen
              ? <ChevronUp className="w-4 h-4 text-[#7A96A8]" />
              : <ChevronDown className="w-4 h-4 text-[#7A96A8]" />}
          </button>

          {cuentasOpen && (
            <div className="border-t border-[#263040] bg-[#0D1117]/60 p-4 space-y-3">

              {/* Saldo + Días restantes */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#161C26] rounded-lg px-3 py-3">
                  <p className="text-xs text-[#7A96A8] mb-1">Saldo pendiente de pago</p>
                  <p className={`text-xl font-bold font-mono ${saldoPendiente > 0 ? "text-amber-300" : "text-green-400"}`}>
                    {saldoPendiente > 0 ? usd(saldoPendiente, 0) : "Al día ✓"}
                  </p>
                  {saldoPendiente > 0 && (
                    <p className="text-xs text-[#7A96A8] mt-1">
                      {impagas.length} producción{impagas.length !== 1 ? "es" : ""} sin pagar
                    </p>
                  )}
                </div>
                {pagoInfo ? (
                  <div className={`rounded-lg px-3 py-3 ${pagoInfo.dias <= 2 ? "bg-red-500/10 border border-red-500/20" : pagoInfo.dias <= 4 ? "bg-amber-500/10 border border-amber-500/20" : "bg-[#161C26]"}`}>
                    <p className="text-xs text-[#7A96A8] mb-1 flex items-center gap-1">
                      <CalendarClock className="w-3 h-3" /> Días para pagar
                    </p>
                    <p className={`text-xl font-bold font-mono ${pagoInfo.dias <= 2 ? "text-red-400" : pagoInfo.dias <= 4 ? "text-amber-300" : "text-[#E2ECF4]"}`}>
                      {pagoInfo.dias > 0 ? `${pagoInfo.dias} días` : "¡Vencido!"}
                    </p>
                    <p className="text-xs text-[#7A96A8] mt-1">
                      {pagoInfo.dias > 0 ? `Vence el ${pagoInfo.vencimiento}` : `Venció el ${pagoInfo.vencimiento}`}
                    </p>
                  </div>
                ) : (
                  <div className="bg-[#161C26] rounded-lg px-3 py-3 flex items-center justify-center">
                    <p className="text-xs text-[#7A96A8] text-center">Sin producciones<br />pendientes de pago</p>
                  </div>
                )}
              </div>

              {/* Cargar comprobante */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setComprobanteFile(f);
                      setComprobanteOk(false);
                      handleComprobanteUpload(f);
                    }
                  }}
                />
                {comprobanteOk ? (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/25 text-green-400 text-sm font-medium">
                    <CheckCircle className="w-4 h-4" />
                    Comprobante enviado correctamente
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingComprobante}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-[#263040] hover:border-[#F2B968]/50 hover:bg-[#F2B968]/5 transition text-sm text-[#7A96A8] hover:text-[#F2B968] disabled:opacity-50"
                  >
                    {uploadingComprobante
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo comprobante...</>
                      : <><Upload className="w-4 h-4" /> {comprobanteFile ? comprobanteFile.name : "Cargar comprobante de pago"}</>}
                  </button>
                )}
              </div>

              {/* Cuenta Corriente */}
              {tieneCC && (
                <div className={`rounded-lg p-3 border ${ccBloqueada ? "border-red-500/40 bg-red-500/5" : "border-blue-500/30 bg-blue-500/5"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-blue-300 uppercase tracking-wide font-medium flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5" />
                      Cliente con cuenta corriente activa
                    </p>
                    {ccBloqueada && (
                      <span className="text-xs bg-red-500/15 text-red-300 border border-red-500/30 rounded px-2 py-0.5">
                        BLOQUEADA
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-[#7A96A8]">Saldo CC pendiente</p>
                      <p className={`text-lg font-bold font-mono ${saldoCC >= LIMITE_CC ? "text-red-400" : saldoCC > LIMITE_CC * 0.7 ? "text-amber-300" : "text-[#E2ECF4]"}`}>
                        {usd(saldoCC, 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#7A96A8]">Límite de cuenta</p>
                      <p className="text-lg font-bold font-mono text-[#E2ECF4]">{usd(LIMITE_CC, 0)}</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="h-1.5 bg-[#0D1117] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${saldoCC >= LIMITE_CC ? "bg-red-500" : saldoCC > LIMITE_CC * 0.7 ? "bg-amber-400" : "bg-blue-500"}`}
                        style={{ width: `${Math.min((saldoCC / LIMITE_CC) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  {diasCC !== null && (
                    <p className={`text-xs mt-2 ${diasCC > DIAS_PLAZO_CC ? "text-red-400" : "text-[#7A96A8]"}`}>
                      {diasCC > DIAS_PLAZO_CC
                        ? `En mora: ${diasCC} días desde la primera entrega (límite ${DIAS_PLAZO_CC} días)`
                        : `${diasCC} días desde la primera entrega · límite ${DIAS_PLAZO_CC} días`}
                    </p>
                  )}
                  {ccBloqueada && (
                    <p className="text-xs text-red-300 mt-1">
                      Nuevas producciones bloqueadas hasta saldar la cuenta corriente
                    </p>
                  )}
                  <p className="text-xs text-[#4A6070] mt-2">Pago exclusivamente en efectivo en dólares</p>
                </div>
              )}

              {/* Condiciones de pago */}
              <div className="bg-[#161C26] rounded-lg p-3 border border-[#263040]">
                <p className="text-xs text-[#7A96A8] uppercase tracking-wide mb-2 font-medium">Condiciones de pago</p>
                {inmobiliaria ? (
                  <div className="space-y-1.5">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-[#F2B968] shrink-0 mt-0.5" />
                      <p className="text-xs text-[#7A96A8]">
                        Agente de <span className="text-[#E2ECF4] font-medium">{inmobiliaria.nombre}</span>
                        {inmobiliaria.descuento > 0 && (
                          <span className="ml-1 text-green-400">· {inmobiliaria.descuento}% de descuento aplicado</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-[#7A96A8] shrink-0 mt-0.5" />
                      <p className="text-xs text-[#7A96A8]">
                        Tenés <span className="text-[#E2ECF4]">5 días</span> para pagar contados desde la última producción entregada. Si solicitás otra producción durante ese período, el plazo se extiende 5 días desde esa nueva entrega.
                      </p>
                    </div>
                    {inmobiliaria.beneficios && (
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-[#7A96A8] shrink-0 mt-0.5" />
                        <p className="text-xs text-[#7A96A8] whitespace-pre-line">{inmobiliaria.beneficios}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-[#7A96A8]">
                    Tenés <span className="text-[#E2ECF4]">5 días</span> para pagar contados desde la última producción entregada. Si solicitás otra producción durante ese período, el plazo se extiende 5 días desde esa nueva entrega.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Estadísticas de inversión en producciones (al fondo) ── */}
      {!loading && totalInvertido > 0 && (
        <div className="border border-[#263040] rounded-xl overflow-hidden">
          <button
            onClick={() => setEstadisticasOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#1E2A38] transition"
          >
            <div className="flex items-center gap-2.5">
              <TrendingUp className="w-4 h-4 text-[#F2B968]" />
              <span className="text-sm font-medium text-[#E2ECF4]">Estadísticas de inversión en producciones</span>
            </div>
            {estadisticasOpen
              ? <ChevronUp className="w-4 h-4 text-[#7A96A8]" />
              : <ChevronDown className="w-4 h-4 text-[#7A96A8]" />}
          </button>

          {estadisticasOpen && (
            <div className="border-t border-[#263040] bg-[#0D1117]/60 p-4">
              {prodsConValor.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#161C26] rounded-lg px-3 py-2.5">
                    <p className="text-xs text-[#7A96A8] mb-1">
                      Total invertido en {producciones.length} producción{producciones.length !== 1 ? "es" : ""}
                    </p>
                    <p className="text-base font-bold text-[#E2ECF4] font-mono">{usd(totalInvertido, 0)}</p>
                  </div>
                  <div className="bg-[#161C26] rounded-lg px-3 py-2.5">
                    <p className="text-xs text-[#7A96A8] mb-1">Valor total de inmuebles</p>
                    <p className="text-base font-bold text-[#E2ECF4] font-mono">{usd(totalValorInmuebles, 0)}</p>
                  </div>
                  <div className="bg-[#161C26] rounded-lg px-3 py-2.5">
                    <p className="text-xs text-[#7A96A8] mb-1">Comisión estimada (5%, según promedios generales)</p>
                    <p className="text-base font-bold text-[#E2ECF4] font-mono">{usd(totalComision, 0)}</p>
                  </div>
                  <div className="bg-[#F2B968]/10 rounded-lg px-3 py-2.5">
                    <p className="text-xs text-[#7A96A8] mb-1">% invertido de la comisión en nuestros servicios</p>
                    <p className="text-base font-bold text-[#F2B968] font-mono">{pctInvertido.toFixed(2)}%</p>
                    <p className="text-xs text-[#7A96A8] mt-1.5 italic">¡Mirá si no vale la pena! 😉</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2 bg-[#161C26] rounded-lg px-3 py-2.5">
                    <p className="text-xs text-[#7A96A8] mb-1">
                      Total invertido en {producciones.length} producción{producciones.length !== 1 ? "es" : ""}
                    </p>
                    <p className="text-base font-bold text-[#E2ECF4] font-mono">{usd(totalInvertido, 0)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-[#7A96A8] mt-1">
                      Cargá el valor del inmueble en cada producción para ver el ratio vs. comisión.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
