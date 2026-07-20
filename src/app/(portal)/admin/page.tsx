"use client";

import { useEffect, useState } from "react";
import { getUsers, getProductions } from "@/lib/firebase/firestore";
import type { Production, UserProfile } from "@/types";
import Link from "next/link";
import {
  Users,
  FolderOpen,
  Building2,
  BarChart3,
  DollarSign,
  Clock,
  Loader2,
  AlertCircle,
} from "lucide-react";

export default function AdminDashboardPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [producciones, setProducciones] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [usersData, prodsData] = await Promise.all([
          getUsers(),
          getProductions(),
        ]);
        setUsers(usersData);
        setProducciones(prodsData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-[#C07856]" />
      </div>
    );
  }

  const pendingAccounts = users.filter((u) => u.estado === "pendiente" && u.rol === "agente").length;
  const pendingProds = producciones.filter((p) => p.estado === "pendiente").length;
  const inProcessProds = producciones.filter((p) => p.estado === "en_proceso").length;

  const now = new Date();
  const thisMonth = producciones.filter((p) => {
    if (!p.fechaSolicitud) return false;
    const d = typeof p.fechaSolicitud === "object" && "toDate" in p.fechaSolicitud
      ? (p.fechaSolicitud as { toDate: () => Date }).toDate()
      : new Date(p.fechaSolicitud);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const ingresosMes = thisMonth.reduce((sum, p) => sum + (p.precioFinal || 0), 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#2C2C2C] mb-8">Panel de Administración</h1>

      {/* Alerts */}
      {(pendingAccounts > 0 || pendingProds > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            {pendingAccounts > 0 && (
              <p className="text-amber-800">
                <strong>{pendingAccounts}</strong> cuenta{pendingAccounts > 1 ? "s" : ""} pendiente{pendingAccounts > 1 ? "s" : ""} de aprobación
              </p>
            )}
            {pendingProds > 0 && (
              <p className="text-amber-800">
                <strong>{pendingProds}</strong> producción{pendingProds > 1 ? "es" : ""} pendiente{pendingProds > 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-600 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">Pendientes</span>
          </div>
          <p className="text-2xl font-bold text-[#2C2C2C]">{pendingProds}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <Loader2 className="w-4 h-4" />
            <span className="text-sm font-medium">En proceso</span>
          </div>
          <p className="text-2xl font-bold text-[#2C2C2C]">{inProcessProds}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-[#5A5A5A] mb-2">
            <FolderOpen className="w-4 h-4" />
            <span className="text-sm font-medium">Total este mes</span>
          </div>
          <p className="text-2xl font-bold text-[#2C2C2C]">{thisMonth.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-[#C07856] mb-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm font-medium">Ingresos mes</span>
          </div>
          <p className="text-2xl font-bold text-[#2C2C2C]">${ingresosMes.toFixed(0)}</p>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/admin/cuentas" className="bg-white border border-gray-200 hover:border-[#C07856] p-5 rounded-xl transition group">
          <Users className="w-6 h-6 text-[#C07856] mb-2" />
          <h2 className="font-semibold text-[#2C2C2C]">Gestionar cuentas</h2>
          <p className="text-sm text-[#5A5A5A]">Aprobar y gestionar agentes</p>
          {pendingAccounts > 0 && (
            <span className="inline-block mt-2 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
              {pendingAccounts} pendiente{pendingAccounts > 1 ? "s" : ""}
            </span>
          )}
        </Link>
        <Link href="/admin/inmobiliarias" className="bg-white border border-gray-200 hover:border-[#C07856] p-5 rounded-xl transition group">
          <Building2 className="w-6 h-6 text-[#C07856] mb-2" />
          <h2 className="font-semibold text-[#2C2C2C]">Inmobiliarias</h2>
          <p className="text-sm text-[#5A5A5A]">Crear y gestionar inmobiliarias</p>
        </Link>
        <Link href="/admin/producciones" className="bg-white border border-gray-200 hover:border-[#C07856] p-5 rounded-xl transition group">
          <FolderOpen className="w-6 h-6 text-[#C07856] mb-2" />
          <h2 className="font-semibold text-[#2C2C2C]">Producciones</h2>
          <p className="text-sm text-[#5A5A5A]">Gestionar todas las producciones</p>
        </Link>
        <Link href="/admin/estadisticas" className="bg-white border border-gray-200 hover:border-[#C07856] p-5 rounded-xl transition group">
          <BarChart3 className="w-6 h-6 text-[#C07856] mb-2" />
          <h2 className="font-semibold text-[#2C2C2C]">Estadísticas</h2>
          <p className="text-sm text-[#5A5A5A]">Ingresos y métricas globales</p>
        </Link>
      </div>
    </div>
  );
}
