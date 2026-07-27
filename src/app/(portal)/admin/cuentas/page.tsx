"use client";

import { useEffect, useState } from "react";
import { getUsers, updateUser, getInmobiliarias, getInmobiliaria } from "@/lib/firebase/firestore";
import { sendEmail } from "@/lib/email/send";
import type { UserProfile, Inmobiliaria } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Loader2, Mail, Phone, Building2, Search } from "lucide-react";

type Tab = "pendiente" | "aprobado" | "rechazado";

export default function CuentasPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [inmobiliarias, setInmobiliarias] = useState<Inmobiliaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("pendiente");
  const [busqueda, setBusqueda] = useState("");

  const [approving, setApproving] = useState<UserProfile | null>(null);
  const [selectedInmobiliaria, setSelectedInmobiliaria] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const usersData = await getUsers();
      setUsers(usersData.filter((u) => u.rol === "agente"));
    } catch (err) {
      console.error("Error loading users:", err);
    }
    try {
      const inmobData = await getInmobiliarias(true);
      setInmobiliarias(inmobData);
    } catch (err) {
      console.error("Error loading inmobiliarias:", err);
      try {
        const allInmob = await getInmobiliarias(false);
        setInmobiliarias(allInmob.filter((i) => i.activa));
      } catch (err2) {
        console.error("Error loading all inmobiliarias:", err2);
      }
    }
    setLoading(false);
  }

  const filtered = users.filter((u) => {
    if (u.estado !== tab) return false;
    if (busqueda) {
      const search = busqueda.toLowerCase();
      return (
        u.nombre.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const counts = {
    pendiente: users.filter((u) => u.estado === "pendiente").length,
    aprobado: users.filter((u) => u.estado === "aprobado").length,
    rechazado: users.filter((u) => u.estado === "rechazado").length,
  };

  async function handleApprove() {
    if (!approving || !selectedInmobiliaria) return;
    setActionLoading(true);
    try {
      await updateUser(approving.uid, {
        estado: "aprobado",
        inmobiliariaId: selectedInmobiliaria,
      });
      const inmob = await getInmobiliaria(selectedInmobiliaria);
      sendEmail("cuenta_aprobada", approving.email, {
        nombre: approving.nombre,
        inmobiliariaNombre: inmob?.nombre,
      });
      setApproving(null);
      setSelectedInmobiliaria("");
      await loadData();
    } catch (err) {
      console.error("Error approving user:", err);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(user: UserProfile) {
    if (!confirm(`¿Rechazar la cuenta de ${user.nombre}?`)) return;
    try {
      await updateUser(user.uid, { estado: "rechazado" });
      sendEmail("cuenta_rechazada", user.email, { nombre: user.nombre });
      await loadData();
    } catch (err) {
      console.error("Error rejecting user:", err);
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
      <h1 className="text-2xl font-bold text-[#C5D3E0] mb-8">Gestión de Cuentas</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(["pendiente", "aprobado", "rechazado"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
              tab === t
                ? "bg-[#F2B968] text-[#0D1117]"
                : "bg-[#161C26] text-[#4A6070] border border-[#263040] hover:bg-[#1E2A38] hover:text-[#C5D3E0]"
            }`}
          >
            {t === "pendiente" ? "Pendientes" : t === "aprobado" ? "Aprobadas" : "Rechazadas"}
            {counts[t] > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                tab === t ? "bg-[#0D1117]/20" : "bg-[#1E2A38]"
              }`}>
                {counts[t]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A6070]" />
        <Input
          placeholder="Buscar por nombre o email..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="pl-10 bg-[#0D1117] border-[#263040] text-[#C5D3E0] placeholder:text-[#4A6070]"
        />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-[#161C26] rounded-xl border border-[#263040]">
          <p className="text-[#4A6070]">
            No hay cuentas {tab === "pendiente" ? "pendientes" : tab === "aprobado" ? "aprobadas" : "rechazadas"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((user) => (
            <div key={user.uid} className="bg-[#161C26] rounded-xl border border-[#263040] p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-[#C5D3E0]">{user.nombre}</p>
                  <div className="flex flex-wrap gap-3 mt-1.5 text-sm text-[#4A6070]">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" />
                      {user.email}
                    </span>
                    {user.telefono && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {user.telefono}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      {(user as UserProfile & { inmobiliariaSugerida?: string }).inmobiliariaSugerida || "Sin indicar"}
                    </span>
                  </div>
                </div>

                {tab === "pendiente" && (
                  <div className="flex gap-2 shrink-0">
                    <Button
                      onClick={() => setApproving(user)}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Aprobar
                    </Button>
                    <Button
                      onClick={() => handleReject(user)}
                      size="sm"
                      variant="outline"
                      className="border-red-500/40 text-red-400 hover:bg-red-500/10"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Rechazar
                    </Button>
                  </div>
                )}

                {tab === "aprobado" && (
                  <Badge className="bg-green-500/15 text-green-300 border border-green-500/30">
                    Aprobado
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approve Modal */}
      {approving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setApproving(null)}>
          <div className="bg-[#161C26] border border-[#263040] rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-[#C5D3E0] mb-4">Aprobar cuenta</h2>
            <p className="text-sm text-[#4A6070] mb-4">
              Aprobando a <strong className="text-[#C5D3E0]">{approving.nombre}</strong> ({approving.email})
            </p>

            <div className="mb-6">
              <Label className="text-[#C5D3E0]">Asignar inmobiliaria</Label>
              <select
                value={selectedInmobiliaria}
                onChange={(e) => setSelectedInmobiliaria(e.target.value)}
                className="mt-1 w-full rounded-md border border-[#263040] bg-[#0D1117] px-3 py-2 text-sm text-[#C5D3E0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B968]"
              >
                <option value="">Seleccioná una inmobiliaria</option>
                {inmobiliarias.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nombre} ({i.descuento}% desc.)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setApproving(null)}
                className="border-[#263040] text-[#C5D3E0] hover:bg-[#1E2A38]"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleApprove}
                disabled={!selectedInmobiliaria || actionLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
