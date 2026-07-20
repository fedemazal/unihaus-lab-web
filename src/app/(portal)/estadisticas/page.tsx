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
        <Loader2 className="w-6 h-6 animate-spin text-[#C07856]" />
      </div>
    );
  }

  const totalProducciones = producciones.length;
  const totalInvertido = producciones.reduce((sum, p) => sum + (p.precioFinal || 0), 0);
  const totalAhorrado = producciones.reduce((sum, p) => sum + (p.descuentoAplicado || 0), 0);

  // Group by month (last 6)
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

  // Last 5 productions
  const recent = producciones.slice(0, 5);

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-[#2C2C2C] mb-8">Mis Estadísticas</h1>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 text-[#C07856] mb-2">
            <FolderOpen className="w-5 h-5" />
            <span className="text-sm font-medium">Total producciones</span>
          </div>
          <p className="text-3xl font-bold text-[#2C2C2C]">{totalProducciones}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 text-[#C07856] mb-2">
            <DollarSign className="w-5 h-5" />
            <span className="text-sm font-medium">Total invertido</span>
          </div>
          <p className="text-3xl font-bold text-[#2C2C2C]">${totalInvertido.toFixed(0)}</p>
          <p className="text-xs text-[#5A5A5A]">USD</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <TrendingDown className="w-5 h-5" />
            <span className="text-sm font-medium">Total ahorrado</span>
          </div>
          <p className="text-3xl font-bold text-green-600">${totalAhorrado.toFixed(0)}</p>
          <p className="text-xs text-[#5A5A5A]">USD en descuentos</p>
        </div>
      </div>

      {/* Monthly chart (simple bars) */}
      {months.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-8">
          <h2 className="font-semibold text-[#2C2C2C] mb-4">Producciones por mes</h2>
          <div className="flex items-end gap-2 h-32">
            {months.map(([month, data]) => {
              const height = (data.count / maxCount) * 100;
              const [y, m] = month.split("-");
              const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
              return (
                <div key={month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-mono text-[#2C2C2C]">{data.count}</span>
                  <div
                    className="w-full bg-[#C07856] rounded-t-md transition-all"
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                  <span className="text-xs text-[#5A5A5A]">
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
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-[#2C2C2C] mb-4">Últimas producciones</h2>
          <div className="space-y-3">
            {recent.map((prod) => {
              const d = prod.fechaSolicitud
                ? typeof prod.fechaSolicitud === "object" && "toDate" in prod.fechaSolicitud
                  ? (prod.fechaSolicitud as { toDate: () => Date }).toDate()
                  : new Date(prod.fechaSolicitud)
                : null;
              return (
                <div key={prod.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="w-4 h-4 text-[#5A5A5A] shrink-0" />
                    <span className="text-[#2C2C2C] truncate">{prod.direccion}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[#5A5A5A]">
                      {d ? d.toLocaleDateString("es-AR") : "—"}
                    </span>
                    <span className="font-mono font-medium text-[#2C2C2C]">
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
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-[#5A5A5A]">Todavía no tenés producciones para mostrar estadísticas.</p>
        </div>
      )}
    </div>
  );
}
