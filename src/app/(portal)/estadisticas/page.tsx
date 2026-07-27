"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { getProductions } from "@/lib/firebase/firestore";
import type { Production } from "@/types";
import { DollarSign, FolderOpen, TrendingDown, Loader2, MapPin } from "lucide-react";

export default function EstadisticasPage() {
  const { profile } = useAuth();
  const [producciones, setProducciones] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!profile) return;
      try {
        const data = await getProductions({ agenteId: profile.uid });
        setProducciones(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [profile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-[#F2B968]" />
      </div>
    );
  }

  const totalProducciones = producciones.length;
  const totalInvertido = producciones.reduce((sum, p) => sum + (p.precioFinal || 0), 0);
  const totalAhorrado = producciones.reduce((sum, p) => sum + (p.descuentoAplicado || 0), 0);

  const monthlyData: Record<string, { count: number; amount: number }> = {};
  producciones.forEach((p) => {
    if (!p.fechaSolicitud) return;
    const d = typeof p.fechaSolicitud === "object" && "toDate" in p.fechaSolicitud
      ? (p.fechaSolicitud as { toDate: () => Date }).toDate()
      : new Date(p.fechaSolicitud);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyData[key]) monthlyData[key] = { count: 0, amount: 0 };
    monthlyData[key].count++;
    monthlyData[key].amount += p.precioFinal || 0;
  });

  const months = Object.entries(monthlyData)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 6)
    .reverse();

  const maxCount = Math.max(...months.map(([, d]) => d.count), 1);
  const recent = producciones.slice(0, 5);

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-[#E2ECF4] mb-8">Mis Estadísticas</h1>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#161C26] border border-[#263040] rounded-xl p-5">
          <div className="flex items-center gap-2 text-[#F2B968] mb-2">
            <FolderOpen className="w-5 h-5" />
            <span className="text-sm font-medium text-[#E2ECF4]">Total producciones</span>
          </div>
          <p className="text-3xl font-bold text-[#E2ECF4]">{totalProducciones}</p>
        </div>
        <div className="bg-[#161C26] border border-[#263040] rounded-xl p-5">
          <div className="flex items-center gap-2 text-[#F2B968] mb-2">
            <DollarSign className="w-5 h-5" />
            <span className="text-sm font-medium text-[#E2ECF4]">Total invertido</span>
          </div>
          <p className="text-3xl font-bold text-[#E2ECF4]">${totalInvertido.toFixed(0)}</p>
          <p className="text-xs text-[#7A96A8]">USD</p>
        </div>
        <div className="bg-[#161C26] border border-[#263040] rounded-xl p-5">
          <div className="flex items-center gap-2 text-green-400 mb-2">
            <TrendingDown className="w-5 h-5" />
            <span className="text-sm font-medium text-[#E2ECF4]">Total ahorrado</span>
          </div>
          <p className="text-3xl font-bold text-green-400">${totalAhorrado.toFixed(0)}</p>
          <p className="text-xs text-[#7A96A8]">USD en descuentos</p>
        </div>
      </div>

      {/* Monthly chart */}
      {months.length > 0 && (
        <div className="bg-[#161C26] border border-[#263040] rounded-xl p-5 mb-8">
          <h2 className="font-semibold text-[#E2ECF4] mb-4">Producciones por mes</h2>
          <div className="flex items-end gap-2 h-32">
            {months.map(([month, data]) => {
              const height = (data.count / maxCount) * 100;
              const [y, m] = month.split("-");
              const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
              return (
                <div key={month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-mono text-[#E2ECF4]">{data.count}</span>
                  <div
                    className="w-full bg-[#F2B968] rounded-t-md transition-all opacity-80"
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                  <span className="text-xs text-[#7A96A8]">
                    {monthNames[parseInt(m) - 1]} {y.slice(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent productions */}
      {recent.length > 0 && (
        <div className="bg-[#161C26] border border-[#263040] rounded-xl p-5">
          <h2 className="font-semibold text-[#E2ECF4] mb-4">Últimas producciones</h2>
          <div className="space-y-3">
            {recent.map((prod) => {
              const d = prod.fechaSolicitud
                ? typeof prod.fechaSolicitud === "object" && "toDate" in prod.fechaSolicitud
                  ? (prod.fechaSolicitud as { toDate: () => Date }).toDate()
                  : new Date(prod.fechaSolicitud)
                : null;
              return (
                <div key={prod.id} className="flex items-center justify-between text-sm border-b border-[#1E2A38] pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="w-4 h-4 text-[#7A96A8] shrink-0" />
                    <span className="text-[#E2ECF4] truncate">{prod.direccion}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[#7A96A8]">
                      {d ? d.toLocaleDateString("es-AR") : "—"}
                    </span>
                    <span className="font-mono font-medium text-[#F2B968]">
                      ${prod.precioFinal?.toFixed(0)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {totalProducciones === 0 && (
        <div className="text-center py-12 bg-[#161C26] rounded-xl border border-[#263040]">
          <p className="text-[#7A96A8]">Todavía no tenés producciones para mostrar estadísticas.</p>
        </div>
      )}
    </div>
  );
}
