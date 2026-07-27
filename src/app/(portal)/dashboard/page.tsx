"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { getProductions } from "@/lib/firebase/firestore";
import type { Production } from "@/types";
import Link from "next/link";
import {
  FolderOpen,
  Plus,
  BarChart3,
  Gift,
  Clock,
  CheckCircle,
  Loader2,
  DollarSign,
} from "lucide-react";

export default function DashboardPage() {
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

  const pendientes = producciones.filter((p) => p.estado === "pendiente").length;
  const enProceso = producciones.filter((p) => p.estado === "en_proceso").length;
  const listas = producciones.filter((p) => p.estado === "listo").length;
  const totalInvertido = producciones.reduce((sum, p) => sum + (p.precioFinal || 0), 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#E2ECF4] mb-2">
        ¡Hola, {profile?.nombre?.split(" ")[0]}!
      </h1>
      <p className="text-[#7A96A8] mb-8">Bienvenido a tu portal de producciones</p>

      {/* Metrics */}
      {!loading && producciones.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#161C26] border border-[#263040] rounded-xl p-4">
            <div className="flex items-center gap-2 text-amber-400 mb-2">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Pendientes</span>
            </div>
            <p className="text-2xl font-bold text-[#E2ECF4]">{pendientes}</p>
          </div>
          <div className="bg-[#161C26] border border-[#263040] rounded-xl p-4">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <Loader2 className="w-4 h-4" />
              <span className="text-sm font-medium">En proceso</span>
            </div>
            <p className="text-2xl font-bold text-[#E2ECF4]">{enProceso}</p>
          </div>
          <div className="bg-[#161C26] border border-[#263040] rounded-xl p-4">
            <div className="flex items-center gap-2 text-green-400 mb-2">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Listas</span>
            </div>
            <p className="text-2xl font-bold text-[#E2ECF4]">{listas}</p>
          </div>
          <div className="bg-[#161C26] border border-[#263040] rounded-xl p-4">
            <div className="flex items-center gap-2 text-[#F2B968] mb-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm font-medium">Invertido</span>
            </div>
            <p className="text-2xl font-bold text-[#E2ECF4]">${totalInvertido.toFixed(0)}</p>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          href="/producciones/nueva"
          className="bg-[#F2B968] hover:bg-[#d9a050] text-[#0D1117] p-6 rounded-xl transition group"
        >
          <Plus className="w-8 h-8 mb-3 group-hover:scale-110 transition-transform" />
          <h2 className="text-lg font-semibold mb-1">Nueva producción</h2>
          <p className="text-[#0D1117]/60 text-sm">Solicitá una nueva producción fotográfica</p>
        </Link>

        <Link
          href="/producciones"
          className="bg-[#161C26] border border-[#263040] hover:border-[#F2B968]/50 p-6 rounded-xl transition group"
        >
          <FolderOpen className="w-8 h-8 mb-3 text-[#F2B968] group-hover:scale-110 transition-transform" />
          <h2 className="text-lg font-semibold text-[#E2ECF4] mb-1">Mis producciones</h2>
          <p className="text-[#7A96A8] text-sm">Mirá el estado de tus producciones</p>
        </Link>

        <Link
          href="/estadisticas"
          className="bg-[#161C26] border border-[#263040] hover:border-[#F2B968]/50 p-6 rounded-xl transition group"
        >
          <BarChart3 className="w-8 h-8 mb-3 text-[#F2B968] group-hover:scale-110 transition-transform" />
          <h2 className="text-lg font-semibold text-[#E2ECF4] mb-1">Estadísticas</h2>
          <p className="text-[#7A96A8] text-sm">Revisá tus métricas y actividad</p>
        </Link>

        <Link
          href="/beneficios"
          className="bg-[#161C26] border border-[#263040] hover:border-[#F2B968]/50 p-6 rounded-xl transition group"
        >
          <Gift className="w-8 h-8 mb-3 text-[#F2B968] group-hover:scale-110 transition-transform" />
          <h2 className="text-lg font-semibold text-[#E2ECF4] mb-1">Beneficios</h2>
          <p className="text-[#7A96A8] text-sm">Descubrí los beneficios de tu inmobiliaria</p>
        </Link>
      </div>
    </div>
  );
}
