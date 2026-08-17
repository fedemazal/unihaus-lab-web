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
  Banknote,
  DollarSign,
  Copy,
  Check,
  Info,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { CUENTA_BANCARIA } from "@/lib/config/cuentaBancaria";

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
  const [expandedBanco, setExpandedBanco] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [blueRate, setBlueRate] = useState<number | null>(null);
  const [expandedCalc, setExpandedCalc] = useState(false);
  const [montoUsdDash, setMontoUsdDash] = useState("");

  function copyField(value: string, id: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedField(id);
      setTimeout(() => setCopiedField(null), 2000);
    });
  }

  useEffect(() => {
    fetch("https://dolarapi.com/v1/dolares/blue")
      .then((r) => r.json())
      .then((d) => setBlueRate(d.venta ?? null))
      .catch(() => {});
  }, []);

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
              {tieneCC ? (
                saldoCC > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${ccBloqueada ? "bg-red-500/15 text-red-300 border-red-500/30" : "bg-blue-500/15 text-blue-300 border-blue-500/30"}`}>
                    {usd(saldoCC, 0)} pendiente
                  </span>
                )
              ) : (
                saldoPendiente > 0 && (
                  <span className="text-xs bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">
                    {impagas.length} impaga{impagas.length !== 1 ? "s" : ""}
                  </span>
                )
              )}
            </div>
            {cuentasOpen
              ? <ChevronUp className="w-4 h-4 text-[#7A96A8]" />
              : <ChevronDown className="w-4 h-4 text-[#7A96A8]" />}
          </button>

          {cuentasOpen && (
            <div className="border-t border-[#263040] bg-[#0D1117]/60 p-4 space-y-3">

              {tieneCC ? (
                /* ── Vista cuenta corriente: solo info CC ── */
                <>
                  {/* Card CC */}
                  <div className={`rounded-lg p-4 border ${ccBloqueada ? "border-red-500/40 bg-red-500/5" : "border-blue-500/30 bg-blue-500/5"}`}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-blue-300 uppercase tracking-wide font-semibold flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5" />
                        Cuenta corriente activa
                      </p>
                      {ccBloqueada && (
                        <span className="text-xs bg-red-500/15 text-red-300 border border-red-500/30 rounded px-2 py-0.5">
                          BLOQUEADA
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <p className="text-xs text-[#7A96A8] mb-0.5">Saldo pendiente</p>
                        <p className={`text-xl font-bold font-mono ${saldoCC >= LIMITE_CC ? "text-red-400" : saldoCC > LIMITE_CC * 0.7 ? "text-amber-300" : saldoCC > 0 ? "text-[#E2ECF4]" : "text-green-400"}`}>
                          {saldoCC > 0 ? usd(saldoCC, 0) : "Al día ✓"}
                        </p>
                        {impagoCC.length > 0 && (
                          <p className="text-xs text-[#7A96A8] mt-0.5">
                            {impagoCC.length} producción{impagoCC.length !== 1 ? "es" : ""}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-[#7A96A8] mb-0.5">Límite de cuenta</p>
                        <p className="text-xl font-bold font-mono text-[#E2ECF4]">
                          {usd(LIMITE_CC, 0)}
                        </p>
                        <p className="text-xs text-[#7A96A8] mt-0.5">en efectivo USD</p>
                      </div>
                    </div>
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-[#7A96A8] mb-1">
                        <span>Saldo acumulado</span>
                        <span>{Math.min(Math.round((saldoCC / LIMITE_CC) * 100), 100)}%</span>
                      </div>
                      <div className="h-2 bg-[#0D1117] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${saldoCC >= LIMITE_CC ? "bg-red-500" : saldoCC > LIMITE_CC * 0.7 ? "bg-amber-400" : "bg-blue-500"}`}
                          style={{ width: `${Math.min((saldoCC / LIMITE_CC) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    {diasCC !== null && (
                      <p className={`text-xs ${diasCC > DIAS_PLAZO_CC ? "text-red-400" : "text-[#7A96A8]"}`}>
                        {diasCC > DIAS_PLAZO_CC
                          ? `⚠ En mora: ${diasCC} días desde la primera entrega (límite ${DIAS_PLAZO_CC} días)`
                          : `${diasCC} días transcurridos desde la primera entrega sin pagar · límite ${DIAS_PLAZO_CC} días`}
                      </p>
                    )}
                    {ccBloqueada && (
                      <p className="text-xs text-red-300 mt-1.5">
                        Nuevas producciones bloqueadas hasta saldar el saldo total
                      </p>
                    )}
                  </div>

                  {/* Condiciones CC */}
                  <div className="bg-[#161C26] rounded-lg p-3 border border-[#263040]">
                    <p className="text-xs text-[#7A96A8] uppercase tracking-wide mb-2 font-medium">Condiciones de tu cuenta corriente</p>
                    {inmobiliaria && (
                      <div className="flex items-start gap-2 mb-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-[#F2B968] shrink-0 mt-0.5" />
                        <p className="text-xs text-[#7A96A8]">
                          Agente de <span className="text-[#E2ECF4] font-medium">{inmobiliaria.nombre}</span>
                          {inmobiliaria.descuento > 0 && (
                            <span className="ml-1 text-green-400">· {inmobiliaria.descuento}% de descuento aplicado</span>
                          )}
                        </p>
                      </div>
                    )}
                    {[
                      { text: <>Plazo de pago: hasta <span className="text-[#E2ECF4]">{DIAS_PLAZO_CC} días corridos</span> desde la primera producción entregada sin pagar.</> },
                      { text: <>Al llegar a <span className="text-[#E2ECF4]">{usd(LIMITE_CC, 0)}</span> acumulados, se bloquean nuevas producciones hasta saldar el <span className="text-[#E2ECF4]">saldo total</span>.</> },
                      { text: <>Pago exclusivamente en <span className="text-[#E2ECF4]">efectivo en dólares</span>.</> },
                      { text: <>Recargo por mora: <span className="text-[#E2ECF4]">5% mensual</span> sobre el saldo vencido si superás los {DIAS_PLAZO_CC} días sin pagar.</> },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-2 mt-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-[#7A96A8] shrink-0 mt-0.5" />
                        <p className="text-xs text-[#7A96A8]">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                /* ── Vista normal sin CC ── */
                <>
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

                  {/* Condiciones de pago */}
                  <div className="bg-[#161C26] rounded-lg p-3 border border-[#263040]">
                    <p className="text-xs text-[#7A96A8] uppercase tracking-wide mb-2 font-medium">Condiciones de pago</p>
                    <div className="space-y-1.5">
                      {inmobiliaria && (
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-3.5 h-3.5 text-[#F2B968] shrink-0 mt-0.5" />
                          <p className="text-xs text-[#7A96A8]">
                            Agente de <span className="text-[#E2ECF4] font-medium">{inmobiliaria.nombre}</span>
                            {inmobiliaria.descuento > 0 && (
                              <span className="ml-1 text-green-400">· {inmobiliaria.descuento}% de descuento aplicado</span>
                            )}
                          </p>
                        </div>
                      )}
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-[#7A96A8] shrink-0 mt-0.5" />
                        <p className="text-xs text-[#7A96A8]">
                          Tenés <span className="text-[#E2ECF4]">5 días</span> para pagar contados desde la última producción entregada. Si solicitás otra producción durante ese período, el plazo se extiende 5 días desde esa nueva entrega.
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-red-400/70 shrink-0 mt-0.5" />
                        <p className="text-xs text-[#7A96A8]">
                          La mora genera un interés del <span className="text-red-400 font-medium">5% mensual</span>, calculado diariamente y aplicado de forma automática a partir del día siguiente al vencimiento.
                        </p>
                      </div>
                      {inmobiliaria?.beneficios && (
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-3.5 h-3.5 text-[#7A96A8] shrink-0 mt-0.5" />
                          <p className="text-xs text-[#7A96A8] whitespace-pre-line">{inmobiliaria.beneficios}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Datos bancarios colapsable */}
                  <div className="border border-[#263040] rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedBanco(!expandedBanco)}
                      className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#1E2A38] transition text-left"
                    >
                      <span className="font-medium text-[#E2ECF4] flex items-center gap-2 text-sm">
                        <Banknote className="w-4 h-4 text-[#F2B968]" />
                        Datos bancarios para abonar
                      </span>
                      {expandedBanco ? <ChevronUp className="w-4 h-4 text-[#7A96A8]" /> : <ChevronDown className="w-4 h-4 text-[#7A96A8]" />}
                    </button>
                    {expandedBanco && (
                      <div className="px-4 pb-4 pt-2 bg-[#0D1117] border-t border-[#263040]">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mb-3">
                          {[
                            { label: "Banco", value: CUENTA_BANCARIA.banco, id: null },
                            { label: "Tipo de cuenta", value: CUENTA_BANCARIA.tipoCuenta, id: null },
                            { label: "CBU", value: CUENTA_BANCARIA.cbu, id: "dash-cbu" },
                            { label: "Alias", value: CUENTA_BANCARIA.alias, id: "dash-alias" },
                            { label: "Titular", value: CUENTA_BANCARIA.titular, id: null },
                            { label: "CUIT", value: CUENTA_BANCARIA.cuit, id: null },
                          ].map(({ label, value, id }) => (
                            <div key={label} className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-xs text-[#7A96A8]">{label}</p>
                                <p className="text-sm text-[#E2ECF4] font-medium font-mono truncate">{value}</p>
                              </div>
                              {id && (
                                <button
                                  onClick={() => copyField(value, id)}
                                  className="shrink-0 p-1.5 rounded hover:bg-[#1E2A38] text-[#7A96A8] hover:text-[#E2ECF4] transition"
                                  title={`Copiar ${label}`}
                                >
                                  {copiedField === id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => copyField(
                            `Banco: ${CUENTA_BANCARIA.banco}\nTipo: ${CUENTA_BANCARIA.tipoCuenta}\nCBU: ${CUENTA_BANCARIA.cbu}\nAlias: ${CUENTA_BANCARIA.alias}\nTitular: ${CUENTA_BANCARIA.titular}\nCUIT: ${CUENTA_BANCARIA.cuit}`,
                            "dash-todos"
                          )}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-[#263040] hover:border-[#F2B968]/40 hover:bg-[#F2B968]/5 text-xs text-[#7A96A8] hover:text-[#F2B968] transition"
                        >
                          {copiedField === "dash-todos"
                            ? <><Check className="w-3.5 h-3.5 text-green-400" /> Datos copiados</>
                            : <><Copy className="w-3.5 h-3.5" /> Copiar todos los datos</>}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Calculadora pesos colapsable */}
                  <div className="border border-[#263040] rounded-xl overflow-hidden">
                    <button
                      onClick={() => {
                        setExpandedCalc(!expandedCalc);
                        if (!expandedCalc && !montoUsdDash) setMontoUsdDash(String(Math.round(saldoPendiente)));
                      }}
                      className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#1E2A38] transition text-left"
                    >
                      <span className="font-medium text-[#E2ECF4] flex items-center gap-2 text-sm">
                        <DollarSign className="w-4 h-4 text-blue-400" />
                        Calculadora para pago en transferencias
                      </span>
                      {expandedCalc ? <ChevronUp className="w-4 h-4 text-[#7A96A8]" /> : <ChevronDown className="w-4 h-4 text-[#7A96A8]" />}
                    </button>
                    {expandedCalc && (
                      <div className="px-4 pb-4 pt-3 bg-[#0D1117] border-t border-[#263040]">
                        {blueRate ? (
                          <p className="text-xs text-[#7A96A8] mb-3">
                            Cotización de referencia: <span className="text-blue-300 font-semibold">$1 USD = ${blueRate.toLocaleString("es-AR")} ARS</span>
                          </p>
                        ) : (
                          <p className="text-xs text-[#7A96A8] mb-3">Cargando cotización...</p>
                        )}
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <p className="text-xs text-[#7A96A8] mb-1">Monto en USD</p>
                            <Input
                              type="number"
                              min={0}
                              value={montoUsdDash}
                              onChange={(e) => setMontoUsdDash(e.target.value)}
                              className="bg-[#161C26] border-[#263040] text-[#E2ECF4] font-mono"
                              placeholder="0"
                            />
                          </div>
                          <div className="text-[#7A96A8] text-xl mt-4">=</div>
                          <div className="flex-1">
                            <p className="text-xs text-[#7A96A8] mb-1">Equivalente ARS</p>
                            <div className="h-10 flex items-center px-3 rounded-md border border-[#263040] bg-[#161C26]/50">
                              <span className="text-base font-bold text-blue-300 font-mono">
                                {blueRate && montoUsdDash
                                  ? `$${(parseFloat(montoUsdDash) * blueRate).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`
                                  : "—"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-amber-400/70 mt-3">
                          Orientativo. El monto exacto en pesos queda sujeto a la cotización acordada al momento del pago.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Formas de pago + comprobante */}
                  <div className="border border-[#263040] rounded-xl p-4 bg-[#0D1117]">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-[#E2ECF4] flex items-center gap-2 mb-2 text-sm">
                          <Info className="w-4 h-4 text-[#F2B968]" />
                          Formas de pago aceptadas
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs bg-green-500/10 text-green-300 border border-green-500/20 rounded-full px-3 py-1 font-medium">
                            Efectivo en USD
                          </span>
                          <span className="text-xs bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded-full px-3 py-1 font-medium">
                            Transferencia en pesos
                          </span>
                        </div>
                        <p className="text-xs text-[#7A96A8] mt-2">
                          Subí el comprobante de la transferencia o el recibo en efectivo y lo verificamos.
                        </p>
                      </div>
                      <div className="shrink-0">
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
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/25 text-green-400 text-xs font-medium">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Comprobante enviado
                            </div>
                            <button onClick={() => setComprobanteOk(false)} className="text-xs text-[#7A96A8] hover:text-[#E2ECF4] transition">
                              Subir otro
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingComprobante}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition ${uploadingComprobante ? "opacity-50 cursor-not-allowed border-[#263040] text-[#7A96A8]" : "border-[#F2B968]/40 hover:border-[#F2B968]/70 hover:bg-[#F2B968]/5 text-[#F2B968]"}`}
                          >
                            {uploadingComprobante
                              ? <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</>
                              : <><Upload className="w-4 h-4" /> {comprobanteFile ? comprobanteFile.name : "Cargar comprobante"}</>}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                </>
              )}
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
