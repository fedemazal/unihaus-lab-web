"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { getProductions } from "@/lib/firebase/firestore";
import type { Production, ProductionStatus } from "@/types";
import Link from "next/link";
import {
  Plus, Search, MapPin, Calendar, DollarSign,
  Download, Loader2, ChevronDown, ChevronUp,
  CheckCircle, Package, Clock, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const statusConfig: Record<ProductionStatus, { label: string; color: string }> = {
  pendiente: { label: "Pendiente", color: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  en_proceso: { label: "En proceso", color: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  listo: { label: "Listo", color: "bg-green-500/15 text-green-300 border-green-500/30" },
  cancelado: { label: "Cancelado", color: "bg-red-500/15 text-red-300 border-red-500/30" },
};

function toDate(val: unknown): Date | null {
  if (!val) return null;
  if (typeof val === "object" && val !== null && "toDate" in val) {
    return (val as { toDate: () => Date }).toDate();
  }
  if (val instanceof Date) return val;
  return null;
}

function usd(value: number, decimals = 2) {
  return `USD ${value.toLocaleString("es-AR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export default function ProduccionesPage() {
  const { profile } = useAuth();
  const [producciones, setProducciones] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDesglose, setExpandedDesglose] = useState<string | null>(null);
  const [expandedRatio, setExpandedRatio] = useState<string | null>(null);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!profile) return;
      try {
        const data = await getProductions({ agenteId: profile.uid });
        setProducciones(data);
      } catch (err) {
        console.error("Error loading productions:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [profile]);

  const filtered = producciones.filter((p) => {
    if (filtroEstado !== "todos" && p.estado !== filtroEstado) return false;
    if (busqueda && !p.direccion.toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  });

  async function handleDescargar(key: string, nombre: string) {
    setDownloadingKey(key);
    try {
      const res = await fetch(`/api/r2/download?key=${encodeURIComponent(key)}`);
      if (!res.ok) throw new Error("Error generando link de descarga");
      const { url } = await res.json();
      const a = document.createElement("a");
      a.href = url;
      a.download = nombre;
      a.click();
    } catch (err) {
      console.error("Error descargando:", err);
    } finally {
      setDownloadingKey(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-[#F2B968]" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold text-[#E2ECF4]">Mis Producciones</h1>
        <Link href="/producciones/nueva">
          <Button className="bg-[#F2B968] hover:bg-[#d9a050] text-[#0D1117] font-semibold">
            <Plus className="w-4 h-4 mr-2" />
            Nueva producción
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A96A8]" />
          <Input
            placeholder="Buscar por dirección..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-10 bg-[#0D1117] border-[#263040] text-[#E2ECF4] placeholder:text-[#7A96A8]"
          />
        </div>
        <div className="flex gap-2">
          {["todos", "pendiente", "en_proceso", "listo"].map((estado) => (
            <button
              key={estado}
              onClick={() => setFiltroEstado(estado)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filtroEstado === estado
                  ? "bg-[#F2B968] text-[#0D1117]"
                  : "bg-[#161C26] text-[#7A96A8] border border-[#263040] hover:bg-[#1E2A38] hover:text-[#E2ECF4]"
              }`}
            >
              {estado === "todos" ? "Todos" : statusConfig[estado as ProductionStatus].label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-[#161C26] rounded-xl border border-[#263040]">
          <p className="text-[#7A96A8] mb-4">
            {producciones.length === 0
              ? "Todavía no tenés producciones"
              : "No se encontraron resultados"}
          </p>
          {producciones.length === 0 && (
            <Link href="/producciones/nueva">
              <Button className="bg-[#F2B968] hover:bg-[#d9a050] text-[#0D1117] font-semibold">
                <Plus className="w-4 h-4 mr-2" />
                Solicitar primera producción
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((prod) => {
            const status = statusConfig[prod.estado];
            const isExpanded = expandedId === prod.id;
            const isDesgloseOpen = expandedDesglose === prod.id;
            const isRatioOpen = expandedRatio === prod.id;
            const tieneEntregaActiva = prod.entregaStatus === "activa" && (prod.entregaArchivos?.length ?? 0) > 0;
            const tieneEntregaArchivada = prod.entregaStatus === "archivada";
            const fechaRealizacion = toDate(prod.horarioConfirmado?.fecha
              ? null
              : prod.fechaListo) ?? toDate(prod.fechaEnProceso);
            const fechaConfirmada = prod.horarioConfirmado
              ? `${prod.horarioConfirmado.fecha}${prod.horarioConfirmado.horario ? ` — ${prod.horarioConfirmado.horario}` : ""}`
              : null;

            const comisionEstimada = prod.valorEstimado ? prod.valorEstimado * 0.05 : 0;
            const pctInvertido = comisionEstimada > 0
              ? ((prod.precioFinal / comisionEstimada) * 100).toFixed(2)
              : null;

            return (
              <div key={prod.id} className="bg-[#161C26] rounded-xl border border-[#263040] overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : prod.id)}
                  className="w-full p-5 text-left flex items-center justify-between hover:bg-[#1E2A38] transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge className={`${status.color} border text-xs`}>{status.label}</Badge>
                      <span className="text-xs text-[#7A96A8] capitalize">{prod.tipoPropiedad}</span>
                      {prod.estado === "listo" && (
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${prod.pagada ? "bg-green-500/15 text-green-400 border-green-500/30" : "bg-red-500/15 text-red-400 border-red-500/30"}`}>
                          {prod.pagada ? "Pagada" : "Impaga"}
                        </span>
                      )}
                      {tieneEntregaActiva && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30 flex items-center gap-1">
                          <Package className="w-3 h-3" /> Material listo
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[#E2ECF4] font-medium">
                      <MapPin className="w-4 h-4 text-[#7A96A8] shrink-0" />
                      <span className="truncate">{prod.direccion}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-[#7A96A8]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {prod.fechaSolicitud
                          ? new Date(
                              typeof prod.fechaSolicitud === "object" && "toDate" in prod.fechaSolicitud
                                ? (prod.fechaSolicitud as { toDate: () => Date }).toDate()
                                : prod.fechaSolicitud
                            ).toLocaleDateString("es-AR")
                          : "—"}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" />
                        {usd(prod.precioFinal ?? 0)}
                      </span>
                    </div>
                  </div>
                  {isExpanded
                    ? <ChevronUp className="w-5 h-5 text-[#7A96A8] shrink-0 ml-3" />
                    : <ChevronDown className="w-5 h-5 text-[#7A96A8] shrink-0 ml-3" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-[#263040] p-5 space-y-5">

                    {/* ── Descarga de material (siempre arriba) ── */}
                    {tieneEntregaActiva && (
                      <div className="bg-green-500/8 border border-green-500/25 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <p className="text-sm font-semibold text-green-400 flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4" /> Material listo para descargar
                          </p>
                          {prod.entregaExpiresAt && (
                            <span className="text-xs text-[#7A96A8] flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Disponible hasta {toDate(prod.entregaExpiresAt)?.toLocaleDateString("es-AR") ?? "—"}
                            </span>
                          )}
                        </div>
                        <div className="space-y-2">
                          {(prod.entregaArchivos ?? []).map((archivo, i) => (
                            <div key={i} className="flex items-center justify-between gap-3 bg-[#0D1117]/40 rounded-lg px-3 py-2.5">
                              <div className="min-w-0">
                                <p className="text-sm text-[#E2ECF4] truncate font-medium">{archivo.nombre}</p>
                                <p className="text-xs text-[#7A96A8]">{(archivo.size / 1024 / 1024).toFixed(1)} MB</p>
                              </div>
                              <button
                                onClick={() => handleDescargar(archivo.key, archivo.nombre)}
                                disabled={downloadingKey === archivo.key}
                                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F2B968] hover:bg-[#d9a050] text-[#0D1117] text-xs font-bold disabled:opacity-50 transition"
                              >
                                {downloadingKey === archivo.key
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  : <Download className="w-3.5 h-3.5" />}
                                Descargar
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {tieneEntregaArchivada && (
                      <div className="bg-[#263040]/40 border border-[#263040] rounded-xl p-4">
                        <p className="text-sm text-[#7A96A8]">
                          Los archivos de esta entrega ya no están disponibles (vencieron los 15 días).
                          Contactá a Unihaus Lab si necesitás reposición.
                        </p>
                      </div>
                    )}

                    {!tieneEntregaActiva && !tieneEntregaArchivada && prod.archivos?.fotosVideosZip && (
                      <div className="bg-green-500/8 border border-green-500/25 rounded-xl p-4">
                        <p className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4" /> Material listo para descargar
                        </p>
                        <a
                          href={prod.archivos.fotosVideosZip}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#F2B968] hover:bg-[#d9a050] text-[#0D1117] text-sm font-bold transition"
                        >
                          <Download className="w-4 h-4" />
                          Descargar material
                        </a>
                      </div>
                    )}

                    {/* ── Fecha de realización ── */}
                    {fechaConfirmada && (
                      <div className="flex items-center gap-2 text-sm bg-[#0D1117] rounded-lg px-4 py-3 border border-[#263040]">
                        <Calendar className="w-4 h-4 text-[#F2B968] shrink-0" />
                        <span className="text-[#7A96A8]">Fecha de realización:</span>
                        <span className="text-[#E2ECF4] font-medium">{fechaConfirmada}</span>
                      </div>
                    )}
                    {!fechaConfirmada && fechaRealizacion && (
                      <div className="flex items-center gap-2 text-sm bg-[#0D1117] rounded-lg px-4 py-3 border border-[#263040]">
                        <Calendar className="w-4 h-4 text-[#F2B968] shrink-0" />
                        <span className="text-[#7A96A8]">Fecha de realización:</span>
                        <span className="text-[#E2ECF4] font-medium">{fechaRealizacion.toLocaleDateString("es-AR")}</span>
                      </div>
                    )}

                    {/* ── Datos de la propiedad ── */}
                    <div className="bg-[#0D1117] rounded-lg px-4 py-3 border border-[#263040]">
                      <p className="text-xs text-[#7A96A8] font-medium uppercase tracking-wide mb-2 capitalize">{prod.tipoPropiedad}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#7A96A8]">
                        {prod.superficie && <span><span className="text-[#E2ECF4] font-medium">{prod.superficie}m²</span> totales</span>}
                        {prod.construida && <span><span className="text-[#E2ECF4] font-medium">{prod.construida}m²</span> construidos</span>}
                        {prod.descubierta !== undefined && prod.descubierta > 0 && <span><span className="text-[#E2ECF4] font-medium">{prod.descubierta}m²</span> semi+desc</span>}
                        {prod.amenidades > 0 && <span><span className="text-[#E2ECF4] font-medium">{prod.amenidades}</span> amenities</span>}
                        <span className="capitalize">
                          <span className="text-[#E2ECF4] font-medium">{prod.estadoPropiedad?.ocupacion}</span>
                          {prod.estadoPropiedad?.ocupacion === "ocupada" && prod.estadoPropiedad?.tipo && (
                            <span className="ml-1 text-amber-400">
                              ({prod.estadoPropiedad.tipo === "inquilino" ? "inquilino" : "dueño"})
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* ── Servicios ── */}
                    <div>
                      <p className="text-xs text-[#7A96A8] uppercase tracking-wide mb-2">Servicios</p>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs px-3 py-1.5 rounded-full bg-[#F2B968]/12 border border-[#F2B968]/40 text-[#F2B968] font-medium">
                          {prod.servicios?.soloFotos ? "Solo Fotos −25%" : prod.servicios?.videoAdicional ? "Fotos + Video + 2do Video" : "Fotos + Video"}
                        </span>
                        {prod.servicios?.plano2d && <span className="text-xs px-3 py-1.5 rounded-full bg-[#161C26] border border-[#263040] text-[#E2ECF4]">Plano 2D</span>}
                        {prod.servicios?.tour360 && <span className="text-xs px-3 py-1.5 rounded-full bg-[#161C26] border border-[#263040] text-[#E2ECF4]">Tour 360°</span>}
                        {prod.servicios?.drone && <span className="text-xs px-3 py-1.5 rounded-full bg-[#161C26] border border-[#263040] text-[#E2ECF4]">Drone</span>}
                        {prod.servicios?.amoblamiento && <span className="text-xs px-3 py-1.5 rounded-full bg-[#161C26] border border-[#263040] text-[#E2ECF4]">Amoblamiento ({prod.servicios.cantidadFotosAmobladas} fotos)</span>}
                      </div>
                    </div>

                    {/* ── Observaciones ── */}
                    {prod.observaciones && (
                      <div>
                        <p className="text-xs text-[#7A96A8] uppercase tracking-wide mb-1">Observaciones</p>
                        <p className="text-sm text-[#7A96A8] whitespace-pre-line">{prod.observaciones}</p>
                      </div>
                    )}

                    {/* ── Desglose de presupuesto (expandible) ── */}
                    <div className="border border-[#263040] rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedDesglose(isDesgloseOpen ? null : prod.id)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#1E2A38] transition"
                      >
                        <span className="text-sm font-medium text-[#E2ECF4] flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-[#F2B968]" />
                          Desglose de presupuesto
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-[#F2B968] font-mono">{usd(prod.precioFinal ?? 0)}</span>
                          {isDesgloseOpen ? <ChevronUp className="w-4 h-4 text-[#7A96A8]" /> : <ChevronDown className="w-4 h-4 text-[#7A96A8]" />}
                        </div>
                      </button>
                      {isDesgloseOpen && (
                        <div className="px-4 pb-4 pt-1 bg-[#0D1117] text-sm space-y-1.5 border-t border-[#263040]">
                          <div className="flex justify-between pt-2">
                            <span className="text-[#7A96A8]">
                              {prod.servicios?.soloFotos ? "Solo Fotos (−25%)" : prod.servicios?.videoAdicional ? "Fotos + Video + 2do Video (+25%)" : "Fotos + Video"}
                            </span>
                            <span className="font-mono text-[#E2ECF4]">{usd(prod.precioBase ?? 0)}</span>
                          </div>

                          {prod.desglose?.map((item, i) => (
                            <div key={i} className="flex justify-between">
                              <span className="text-[#7A96A8]">
                                {item.concepto}
                                <span className="text-xs opacity-50 ml-1">({item.calculo})</span>
                              </span>
                              <span className="font-mono text-[#E2ECF4]">{usd(item.monto ?? 0)}</span>
                            </div>
                          ))}

                          <hr className="border-[#263040] my-1" />
                          <div className="flex justify-between text-[#7A96A8]">
                            <span>Subtotal</span>
                            <span className="font-mono text-[#E2ECF4]">{usd(prod.subtotal ?? 0)}</span>
                          </div>

                          {(prod.descuentoAplicado ?? 0) > 0 && (
                            <div className="flex justify-between text-green-400">
                              <span>Descuento inmobiliaria</span>
                              <span className="font-mono">−{usd(prod.descuentoAplicado)}</span>
                            </div>
                          )}
                          {(prod.descuentoPaquete ?? 0) > 0 && (
                            <div className="flex justify-between text-green-400">
                              <span>Descuento paquete 4+ servicios (5%)</span>
                              <span className="font-mono">−{usd(prod.descuentoPaquete!)}</span>
                            </div>
                          )}
                          {(prod.descuentoCodigo ?? 0) > 0 && (
                            <div className="flex justify-between text-green-400">
                              <span>Código {prod.codigoDescuento && <span className="opacity-60">({prod.codigoDescuento})</span>}</span>
                              <span className="font-mono">−{usd(prod.descuentoCodigo!)}</span>
                            </div>
                          )}

                          <hr className="border-[#263040] my-1" />
                          <div className="flex justify-between font-bold text-base pb-1">
                            <span className="text-[#E2ECF4]">TOTAL</span>
                            <span className="text-[#F2B968] font-mono">{usd(prod.precioFinal ?? 0)}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ── Estadísticas de inversión (expandible, solo si hay valorEstimado) ── */}
                    {prod.valorEstimado && prod.valorEstimado > 0 && (
                      <div className="border border-[#F2B968]/25 rounded-xl overflow-hidden">
                        <button
                          onClick={() => setExpandedRatio(isRatioOpen ? null : prod.id)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F2B968]/5 transition"
                        >
                          <span className="text-sm font-medium text-[#F2B968] flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Estadísticas de inversión
                          </span>
                          {isRatioOpen ? <ChevronUp className="w-4 h-4 text-[#F2B968]" /> : <ChevronDown className="w-4 h-4 text-[#F2B968]" />}
                        </button>
                        {isRatioOpen && (
                          <div className="px-4 pb-4 pt-1 bg-[#F2B968]/5 border-t border-[#F2B968]/20">
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              <div className="bg-[#0D1117]/60 rounded-lg px-3 py-2.5">
                                <p className="text-xs text-[#7A96A8] mb-1">Valor del inmueble</p>
                                <p className="text-base font-bold text-[#E2ECF4]">
                                  {usd(prod.valorEstimado, 0)}
                                </p>
                              </div>
                              <div className="bg-[#0D1117]/60 rounded-lg px-3 py-2.5">
                                <p className="text-xs text-[#7A96A8] mb-1">Comisión estimada (5%, prom. gral.)</p>
                                <p className="text-base font-bold text-[#E2ECF4]">
                                  {usd(comisionEstimada, 0)}
                                </p>
                              </div>
                              <div className="bg-[#0D1117]/60 rounded-lg px-3 py-2.5">
                                <p className="text-xs text-[#7A96A8] mb-1">Esta producción</p>
                                <p className="text-base font-bold text-[#E2ECF4]">{usd(prod.precioFinal ?? 0)}</p>
                              </div>
                              <div className="bg-[#F2B968]/10 rounded-lg px-3 py-2.5">
                                <p className="text-xs text-[#7A96A8] mb-1">% invertido de la comisión en nuestros servicios</p>
                                <p className="text-base font-bold text-[#F2B968]">
                                  {pctInvertido}%
                                </p>
                                <p className="text-xs text-[#7A96A8] mt-1.5 italic">¡Mirá si no vale la pena! 😉</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
