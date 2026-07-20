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
      <h1 className="text-2xl font-bold text-[#2C2C2C] mb-2">
        ¡Hola, {profile?.nombre?.split(" ")[0]}!
      </h1>
      <p className="text-[#5A5A5A] mb-8">Bienvenido a tu portal de producciones</p>

      {/* Metrics */}
      {!loading && producciones.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Pendientes</span>
            </div>
            <p className="text-2xl font-bold text-[#2C2C2C]">{pendientes}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <Loader2 className="w-4 h-4" />
              <span className="text-sm font-medium">En proceso</span>
            </div>
            <p className="text-2xl font-bold text-[#2C2C2C]">{enProceso}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Listas</span>
            </div>
            <p className="text-2xl font-bold text-[#2C2C2C]">{listas}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-[#C07856] mb-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm font-medium">Invertido</span>
            </div>
            <p className="text-2xl font-bold text-[#2C2C2C]">${totalInvertido.toFixed(0)}</p>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          href="/producciones/nueva"
          className="bg-[#C07856] hover:bg-[#a8654a] text-white p-6 rounded-xl transition group"
        >
          <Plus className="w-8 h-8 mb-3 group-hover:scale-110 transition-transform" />
          <h2 className="text-lg font-semibold mb-1">Nueva producción</h2>
          <p className="text-white/80 text-sm">Solicitá una nueva producción fotográfica</p>
        </Link>

        <Link
          href="/producciones"
          className="bg-white border border-gray-200 hover:border-[#C07856] p-6 rounded-xl transition group"
        >
          <FolderOpen className="w-8 h-8 mb-3 text-[#C07856] group-hover:scale-110 transition-transform" />
          <h2 className="text-lg font-semibold text-[#2C2C2C] mb-1">Mis producciones</h2>
          <p className="text-[#5A5A5A] text-sm">Mirá el estado de tus producciones</p>
        </Link>

        <Link
          href="/estadisticas"
          className="bg-white border border-gray-200 hover:border-[#C07856] p-6 rounded-xl transition group"
        >
          <BarChart3 className="w-8 h-8 mb-3 text-[#C07856] group-hover:scale-110 transition-transform" />
          <h2 className="text-lg font-semibold text-[#2C2C2C] mb-1">Estadísticas</h2>
          <p className="text-[#5A5A5A] text-sm">Revisá tus métricas y actividad</p>
        </Link>

        <Link
          href="/beneficios"
          className="bg-white border border-gray-200 hover:border-[#C07856] p-6 rounded-xl transition group"
        >
          <Gift className="w-8 h-8 mb-3 text-[#C07856] group-hover:scale-110 transition-transform" />
          <h2 className="text-lg font-semibold text-[#2C2C2C] mb-1">Beneficios</h2>
          <p className="text-[#5A5A5A] text-sm">Descubrí los beneficios de tu inmobiliaria</p>
        </Link>
      </div>
    </div>
  );
}
