"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { getProductions } from "@/lib/firebase/firestore";
import type { Production, ProductionStatus } from "@/types";
import Link from "next/link";
import {
  Plus, Search, MapPin, Calendar, DollarSign,
  Download, Loader2, ChevronDown, ChevronUp,
  CheckCircle, Package, Clock,
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

export default function ProduccionesPage() {
  const { profile } = useAuth();
  const [producciones, setProducciones] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
            const tieneEntregaActiva = prod.entregaStatus === "activa" && (prod.entregaArchivos?.length ?? 0) > 0;
            const tieneEntregaArchivada = prod.entregaStatus === "archivada";

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
                      {tieneEntregaActiva && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30 flex items-center gap-1">
                          <Package className="w-3 h-3" /> Archivos listos
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
                        ${prod.precioFinal?.toFixed(2)} USD
                      </span>
                    </div>
                  </div>
                  {isExpanded
                    ? <ChevronUp className="w-5 h-5 text-[#7A96A8] shrink-0 ml-3" />
                    : <ChevronDown className="w-5 h-5 text-[#7A96A8] shrink-0 ml-3" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-[#263040] p-5 space-y-5">

                    {/* ── Entrega R2 (siempre arriba) ── */}
                    {tieneEntregaActiva && (
                      <div className="bg-green-500/8 border border-green-500/25 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <p className="text-sm font-semibold text-green-400 flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4" /> Archivos listos para descargar
                          </p>
                          {prod.entregaExpiresAt && (
                            <span className="text-xs text-[#7A96A8] flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Vence {new Date(
                                (prod.entregaExpiresAt as unknown as { toDate?: () => Date }).toDate
                                  ? (prod.entregaExpiresAt as unknown as { toDate: () => Date }).toDate()
                                  : prod.entregaExpiresAt
                              ).toLocaleDateString("es-AR")}
                            </span>
                          )}
                        </div>
                        <div className="space-y-2">
                          {(prod.entregaArchivos ?? []).map((archivo, i) => (
                            <div key={i} className="flex items-center justify-between gap-3 bg-[#0D1117]/40 rounded-lg px-3 py-2">
                              <div className="min-w-0">
                                <p className="text-sm text-[#E2ECF4] truncate">{archivo.nombre}</p>
                                <p className="text-xs text-[#7A96A8]">{(archivo.size / 1024 / 1024).toFixed(1)} MB</p>
                              </div>
                              <button
                                onClick={() => handleDescargar(archivo.key, archivo.nombre)}
                                disabled={downloadingKey === archivo.key}
                                className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-[#F2B968] hover:text-[#d9a050] disabled:opacity-50 transition"
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

                    {/* Link viejo (WeTransfer) si existe */}
                    {!tieneEntregaActiva && !tieneEntregaArchivada && prod.archivos?.fotosVideosZip && (
                      <a
                        href={prod.archivos.fotosVideosZip}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-[#F2B968] hover:underline"
                      >
                        <Download className="w-4 h-4" />
                        Descargar archivos
                      </a>
                    )}

                    {/* ── Datos de la propiedad ── */}
                    <div className="bg-[#0D1117] rounded-lg px-4 py-3 border border-[#263040]">
                      <p className="text-xs text-[#7A96A8] font-medium uppercase tracking-wide mb-2 capitalize">{prod.tipoPropiedad}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#7A96A8]">
                        {prod.superficie && <span><span className="text-[#E2ECF4] font-medium">{prod.superficie}m²</span> construidos</span>}
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

                    {/* ── Horario confirmado ── */}
                    {prod.horarioConfirmado && (
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                        <p className="text-sm font-medium text-green-400 flex items-center gap-1">
                          <Calendar className="w-4 h-4" /> Horario confirmado
                        </p>
                        <p className="text-sm text-green-300 mt-1">
                          {prod.horarioConfirmado.fecha} — {prod.horarioConfirmado.horario}
                        </p>
                      </div>
                    )}

                    {/* ── Horarios sugeridos ── */}
                    {!prod.horarioConfirmado && prod.horariosSugeridos?.length > 0 && (
                      <div>
                        <p className="text-xs text-[#7A96A8] uppercase tracking-wide mb-2">Horarios sugeridos</p>
                        <ul className="text-sm text-[#7A96A8] space-y-0.5">
                          {prod.horariosSugeridos.map((h, i) => <li key={i}>• {h}</li>)}
                        </ul>
                      </div>
                    )}

                    {/* ── Observaciones ── */}
                    {prod.observaciones && (
                      <div>
                        <p className="text-xs text-[#7A96A8] uppercase tracking-wide mb-1">Observaciones</p>
                        <p className="text-sm text-[#7A96A8] whitespace-pre-line">{prod.observaciones}</p>
                      </div>
                    )}

                    {/* ── Desglose de precios ── */}
                    <div className="bg-[#0D1117] rounded-lg p-4 border border-[#263040] text-sm space-y-1.5">
                      <p className="text-xs text-[#7A96A8] uppercase tracking-wide mb-3">Desglose</p>

                      <div className="flex justify-between">
                        <span className="text-[#7A96A8]">
                          {prod.servicios?.soloFotos ? "Solo Fotos (−25%)" : prod.servicios?.videoAdicional ? "Fotos + Video + 2do Video (+25%)" : "Fotos + Video"}
                        </span>
                        <span className="font-mono text-[#E2ECF4]">${prod.precioBase?.toFixed(2)}</span>
                      </div>

                      {prod.desglose?.map((item, i) => (
                        <div key={i} className="flex justify-between">
                          <span className="text-[#7A96A8]">
                            {item.concepto}
                            <span className="text-xs opacity-50 ml-1">({item.calculo})</span>
                          </span>
                          <span className="font-mono text-[#E2ECF4]">${item.monto?.toFixed(2)}</span>
                        </div>
                      ))}

                      <hr className="border-[#263040] my-1" />

                      <div className="flex justify-between text-[#7A96A8]">
                        <span>Subtotal</span>
                        <span className="font-mono text-[#E2ECF4]">${(prod.subtotal ?? 0).toFixed(2)}</span>
                      </div>

                      {(prod.descuentoAplicado ?? 0) > 0 && (
                        <div className="flex justify-between text-green-400">
                          <span>Descuento inmobiliaria</span>
                          <span className="font-mono">−${prod.descuentoAplicado.toFixed(2)}</span>
                        </div>
                      )}

                      {(prod.descuentoPaquete ?? 0) > 0 && (
                        <div className="flex justify-between text-green-400">
                          <span>Descuento paquete 4+ servicios (5%)</span>
                          <span className="font-mono">−${prod.descuentoPaquete!.toFixed(2)}</span>
                        </div>
                      )}

                      {(prod.descuentoCodigo ?? 0) > 0 && (
                        <div className="flex justify-between text-green-400">
                          <span>Código de descuento {prod.codigoDescuento && <span className="opacity-60">({prod.codigoDescuento})</span>}</span>
                          <span className="font-mono">−${prod.descuentoCodigo!.toFixed(2)}</span>
                        </div>
                      )}

                      <hr className="border-[#263040] my-1" />

                      <div className="flex justify-between font-bold text-base">
                        <span className="text-[#E2ECF4]">TOTAL</span>
                        <span className="text-[#F2B968] font-mono">${prod.precioFinal?.toFixed(2)} USD</span>
                      </div>
                    </div>

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
