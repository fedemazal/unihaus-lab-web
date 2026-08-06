"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { getProductions } from "@/lib/firebase/firestore";
import type { Production } from "@/types";
import Link from "next/link";
import {
  FolderOpen,
  Plus,
  Gift,
  Clock,
  CheckCircle,
  Loader2,
  DollarSign,
  ChevronDown,
  ChevronUp,
  TrendingUp,
} from "lucide-react";

export default function DashboardPage() {
  const { profile } = useAuth();
  const [producciones, setProducciones] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);
  const [inversionOpen, setInversionOpen] = useState(false);

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

  const prodsConValor = producciones.filter((p) => p.valorEstimado && p.valorEstimado > 0);
  const totalValorInmuebles = prodsConValor.reduce((sum, p) => sum + (p.valorEstimado || 0), 0);
  const totalComision = totalValorInmuebles * 0.05;
  const pctComision = totalComision > 0 ? (totalInvertido / totalComision) * 100 : 0;

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
      <p className="text-[#7A96A8] mb-8">Bienvenido a tu portal de producciones</p>

      {/* Status cards */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {statusCards.map(({ label, value, icon: Icon, color, bg, border, href }) => (
            <Link
              key={label}
              href={href}
              className={`rounded-xl border ${border} ${bg} p-4 flex flex-col gap-3 hover:brightness-110 transition group`}
            >
              <div className={`w-9 h-9 rounded-lg bg-[#0D1117]/40 flex items-center justify-center ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-3xl font-bold text-[#E2ECF4] tabular-nums leading-none">
                  {value}
                </p>
                <p className={`text-xs font-medium mt-1 ${color}`}>{label}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Inversión total — expandible */}
      {!loading && totalInvertido > 0 && (
        <div className="mb-6 border border-[#263040] rounded-xl overflow-hidden">
          <button
            onClick={() => setInversionOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#1E2A38] transition"
          >
            <div className="flex items-center gap-2.5">
              <DollarSign className="w-4 h-4 text-[#F2B968]" />
              <span className="text-sm font-medium text-[#E2ECF4]">Inversión total en producciones</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-[#F2B968] font-mono">
                ${totalInvertido.toLocaleString("es-AR", { maximumFractionDigits: 0 })} USD
              </span>
              {inversionOpen
                ? <ChevronUp className="w-4 h-4 text-[#7A96A8]" />
                : <ChevronDown className="w-4 h-4 text-[#7A96A8]" />}
            </div>
          </button>

          {inversionOpen && (
            <div className="border-t border-[#263040] bg-[#0D1117]/60 p-4">
              {prodsConValor.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#161C26] rounded-lg px-3 py-2.5">
                    <p className="text-xs text-[#7A96A8] mb-1">Total invertido</p>
                    <p className="text-base font-bold text-[#E2ECF4] font-mono">
                      ${totalInvertido.toLocaleString("es-AR", { maximumFractionDigits: 0 })} USD
                    </p>
                  </div>
                  <div className="bg-[#161C26] rounded-lg px-3 py-2.5">
                    <p className="text-xs text-[#7A96A8] mb-1">Valor inmuebles</p>
                    <p className="text-base font-bold text-[#E2ECF4] font-mono">
                      ${totalValorInmuebles.toLocaleString("es-AR", { maximumFractionDigits: 0 })} USD
                    </p>
                  </div>
                  <div className="bg-[#161C26] rounded-lg px-3 py-2.5">
                    <p className="text-xs text-[#7A96A8] mb-1">Comisión est. (5%)</p>
                    <p className="text-base font-bold text-[#E2ECF4] font-mono">
                      ${totalComision.toLocaleString("es-AR", { maximumFractionDigits: 0 })} USD
                    </p>
                  </div>
                  <div className="bg-[#F2B968]/10 rounded-lg px-3 py-2.5">
                    <p className="text-xs text-[#7A96A8] mb-1">% de tu comisión</p>
                    <p className="text-base font-bold text-[#F2B968] font-mono">
                      {pctComision.toFixed(2)}%
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2 bg-[#161C26] rounded-lg px-3 py-2.5">
                    <p className="text-xs text-[#7A96A8] mb-1">Total invertido</p>
                    <p className="text-base font-bold text-[#E2ECF4] font-mono">
                      ${totalInvertido.toLocaleString("es-AR", { maximumFractionDigits: 0 })} USD
                    </p>
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

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          href="/producciones/nueva"
          className="bg-[#F2B968] hover:bg-[#d9a050] text-[#0D1117] p-6 rounded-xl transition group flex items-start gap-4"
        >
          <div className="w-10 h-10 rounded-lg bg-[#0D1117]/15 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-0.5">Nueva producción</h2>
            <p className="text-[#0D1117]/60 text-sm">Solicitá una nueva producción fotográfica</p>
          </div>
        </Link>

        <Link
          href="/producciones"
          className="bg-[#161C26] border border-[#263040] hover:border-[#F2B968]/50 p-6 rounded-xl transition group flex items-start gap-4"
        >
          <div className="w-10 h-10 rounded-lg bg-[#F2B968]/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <FolderOpen className="w-5 h-5 text-[#F2B968]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#E2ECF4] mb-0.5">Mis producciones</h2>
            <p className="text-[#7A96A8] text-sm">Mirá el estado de tus producciones</p>
          </div>
        </Link>

        <Link
          href="/beneficios"
          className="bg-[#161C26] border border-[#263040] hover:border-[#F2B968]/50 p-6 rounded-xl transition group flex items-start gap-4"
        >
          <div className="w-10 h-10 rounded-lg bg-[#F2B968]/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Gift className="w-5 h-5 text-[#F2B968]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#E2ECF4] mb-0.5">Beneficios</h2>
            <p className="text-[#7A96A8] text-sm">Descubrí los beneficios de tu inmobiliaria</p>
          </div>
        </Link>

        <Link
          href="/preparacion"
          className="bg-[#161C26] border border-[#263040] hover:border-[#F2B968]/50 p-6 rounded-xl transition group flex items-start gap-4"
        >
          <div className="w-10 h-10 rounded-lg bg-[#F2B968]/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-5 h-5 text-[#F2B968]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#E2ECF4] mb-0.5">Preparación</h2>
            <p className="text-[#7A96A8] text-sm">Tips para preparar la propiedad</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
