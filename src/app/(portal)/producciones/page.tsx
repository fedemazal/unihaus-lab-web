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
  pendiente: { label: "Pendiente", color: "bg-amber-100 text-amber-800 border-amber-200" },
  en_proceso: { label: "En proceso", color: "bg-blue-100 text-blue-800 border-blue-200" },
  listo: { label: "Listo", color: "bg-green-100 text-green-800 border-green-200" },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-800 border-red-200" },
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
        <Loader2 className="w-6 h-6 animate-spin text-[#C07856]" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold text-[#2C2C2C]">Mis Producciones</h1>
        <Link href="/producciones/nueva">
          <Button className="bg-[#C07856] hover:bg-[#a8654a]">
            <Plus className="w-4 h-4 mr-2" />
            Nueva producción
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por dirección..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-10 bg-white border-gray-200"
          />
        </div>
        <div className="flex gap-2">
          {["todos", "pendiente", "en_proceso", "listo"].map((estado) => (
            <button
              key={estado}
              onClick={() => setFiltroEstado(estado)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filtroEstado === estado
                  ? "bg-[#C07856] text-white"
                  : "bg-white text-[#5A5A5A] border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {estado === "todos" ? "Todos" : statusConfig[estado as ProductionStatus].label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-[#5A5A5A] mb-4">
            {producciones.length === 0
              ? "Todavía no tenés producciones"
              : "No se encontraron resultados"}
          </p>
          {producciones.length === 0 && (
            <Link href="/producciones/nueva">
              <Button className="bg-[#C07856] hover:bg-[#a8654a]">
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
                className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`${status.color} border text-xs`}>
                        {status.label}
                      </Badge>
                      <span className="text-xs text-[#5A5A5A] capitalize">{prod.tipoPropiedad}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#2C2C2C] font-medium">
                      <MapPin className="w-4 h-4 text-[#5A5A5A] shrink-0" />
                      <span className="truncate">{prod.direccion}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-[#5A5A5A]">
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
                        className="flex items-center gap-1.5 text-sm text-[#C07856] hover:underline"
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
