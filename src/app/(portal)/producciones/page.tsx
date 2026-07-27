"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { getProductions } from "@/lib/firebase/firestore";
import type { Production, ProductionStatus } from "@/types";
import Link from "next/link";
import { Plus, Search, MapPin, Calendar, DollarSign, Download, Loader2 } from "lucide-react";
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
        <h1 className="text-2xl font-bold text-[#C5D3E0]">Mis Producciones</h1>
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A6070]" />
          <Input
            placeholder="Buscar por dirección..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-10 bg-[#0D1117] border-[#263040] text-[#C5D3E0] placeholder:text-[#4A6070]"
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
                  : "bg-[#161C26] text-[#4A6070] border border-[#263040] hover:bg-[#1E2A38] hover:text-[#C5D3E0]"
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
          <p className="text-[#4A6070] mb-4">
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
            return (
              <div
                key={prod.id}
                className="bg-[#161C26] rounded-xl border border-[#263040] p-5 hover:border-[#3A4A60] transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`${status.color} border text-xs`}>
                        {status.label}
                      </Badge>
                      <span className="text-xs text-[#4A6070] capitalize">{prod.tipoPropiedad}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#C5D3E0] font-medium">
                      <MapPin className="w-4 h-4 text-[#4A6070] shrink-0" />
                      <span className="truncate">{prod.direccion}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-[#4A6070]">
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
                  <div className="flex items-center gap-2">
                    {prod.estado === "listo" && prod.archivos?.fotosVideosZip && (
                      <a
                        href={prod.archivos.fotosVideosZip}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-[#F2B968] hover:underline"
                      >
                        <Download className="w-4 h-4" />
                        Descargar
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
