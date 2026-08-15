"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { getProduccionesDerivadasAOficina, updateProduction } from "@/lib/firebase/firestore";
import type { Production } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Building2, CheckCircle, Clock } from "lucide-react";
import { Timestamp } from "firebase/firestore";

function toDate(val: unknown): Date | null {
  if (!val) return null;
  if (typeof val === "object" && "toDate" in (val as object)) return (val as Timestamp).toDate();
  return new Date(val as string);
}

function formatDate(val: unknown) {
  const d = toDate(val);
  if (!d) return "—";
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function OficinaPage() {
  const { profile } = useAuth();
  const [productions, setProductions] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);

  const inmobiliariaId = profile?.inmobiliariaId;

  useEffect(() => {
    if (!inmobiliariaId) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inmobiliariaId]);

  async function loadData() {
    if (!inmobiliariaId) return;
    setLoading(true);
    try {
      const data = await getProduccionesDerivadasAOficina(inmobiliariaId);
      setProductions(data);
    } catch (err) {
      console.error("Error loading producciones:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkPaid(prod: Production) {
    if (!confirm(`¿Marcar como pagada la producción de ${prod.direccion}?`)) return;
    setMarkingPaid(prod.id);
    try {
      await updateProduction(prod.id, { pagada: true });
      await loadData();
    } catch (err) {
      console.error("Error marking paid:", err);
    } finally {
      setMarkingPaid(null);
    }
  }

  if (!profile?.esCuentaCentral) {
    return (
      <div className="text-center py-20">
        <p className="text-[#7A96A8]">No tenés acceso a esta sección.</p>
      </div>
    );
  }

  const pendientes = productions.filter((p) => !p.pagada);
  const pagadas = productions.filter((p) => p.pagada);
  const totalPendiente = pendientes.reduce((sum, p) => sum + (p.precioFinal || 0), 0);

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Building2 className="w-6 h-6 text-purple-400" />
        <h1 className="text-2xl font-bold text-[#E2ECF4]">Mi Oficina</h1>
      </div>
      <p className="text-sm text-[#7A96A8] mb-8">
        Producciones de tu inmobiliaria derivadas a pago por oficina.
      </p>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#161C26] border border-[#263040] rounded-xl p-5">
          <p className="text-xs text-[#7A96A8] uppercase tracking-wider mb-1">Saldo pendiente</p>
          <p className="text-2xl font-bold text-red-400">${totalPendiente.toFixed(0)}</p>
          <p className="text-xs text-[#7A96A8] mt-1">{pendientes.length} producción{pendientes.length !== 1 ? "es" : ""}</p>
        </div>
        <div className="bg-[#161C26] border border-[#263040] rounded-xl p-5">
          <p className="text-xs text-[#7A96A8] uppercase tracking-wider mb-1">Produciones pagadas</p>
          <p className="text-2xl font-bold text-green-400">{pagadas.length}</p>
          <p className="text-xs text-[#7A96A8] mt-1">
            ${pagadas.reduce((s, p) => s + (p.precioFinal || 0), 0).toFixed(0)} total abonado
          </p>
        </div>
        <div className="bg-[#161C26] border border-[#263040] rounded-xl p-5">
          <p className="text-xs text-[#7A96A8] uppercase tracking-wider mb-1">Total derivado</p>
          <p className="text-2xl font-bold text-[#E2ECF4]">{productions.length}</p>
          <p className="text-xs text-[#7A96A8] mt-1">producciones en total</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[#F2B968]" />
        </div>
      ) : productions.length === 0 ? (
        <div className="text-center py-16 bg-[#161C26] rounded-xl border border-[#263040]">
          <Building2 className="w-10 h-10 text-[#263040] mx-auto mb-3" />
          <p className="text-[#7A96A8]">No hay producciones derivadas a tu oficina todavía.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pendientes */}
          {pendientes.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-[#7A96A8] uppercase tracking-wider mb-3">Pendientes de pago</h2>
              <div className="space-y-3">
                {pendientes.map((prod) => (
                  <div key={prod.id} className="bg-[#161C26] border border-red-500/20 rounded-xl p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="font-semibold text-[#E2ECF4]">{prod.direccion}</p>
                          <Badge className="bg-red-500/15 text-red-300 border border-red-500/30 text-xs">
                            Impaga
                          </Badge>
                        </div>
                        <p className="text-xs text-[#7A96A8]">
                          Agente: <span className="text-[#E2ECF4]">{prod.agenteNombre}</span>
                        </p>
                        <p className="text-xs text-[#7A96A8] mt-0.5">
                          Solicitado: {formatDate(prod.fechaSolicitud)}
                          {prod.fechaListo && (
                            <> · Entregado: {formatDate(prod.fechaListo)}</>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <p className="text-lg font-bold text-[#F2B968]">${prod.precioFinal?.toFixed(0)}</p>
                        <Button
                          size="sm"
                          onClick={() => handleMarkPaid(prod)}
                          disabled={markingPaid === prod.id}
                          className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                        >
                          {markingPaid === prod.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Marcar pagada
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pagadas */}
          {pagadas.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-[#7A96A8] uppercase tracking-wider mb-3 mt-6">Pagadas</h2>
              <div className="space-y-3">
                {pagadas.map((prod) => (
                  <div key={prod.id} className="bg-[#161C26] border border-[#263040] rounded-xl p-5 opacity-70">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="font-semibold text-[#E2ECF4]">{prod.direccion}</p>
                          <Badge className="bg-green-500/15 text-green-300 border border-green-500/30 text-xs">
                            Pagada
                          </Badge>
                        </div>
                        <p className="text-xs text-[#7A96A8]">
                          Agente: <span className="text-[#E2ECF4]">{prod.agenteNombre}</span>
                        </p>
                        <p className="text-xs text-[#7A96A8] mt-0.5">
                          {formatDate(prod.fechaSolicitud)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Clock className="w-4 h-4 text-green-400" />
                        <p className="text-lg font-bold text-[#E2ECF4]">${prod.precioFinal?.toFixed(0)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
