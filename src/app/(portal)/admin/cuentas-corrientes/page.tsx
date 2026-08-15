"use client";

import { useEffect, useState } from "react";
import {
  getUsers,
  getInmobiliarias,
  getProductions,
  calcularResumenCC,
  LIMITE_CC,
  DIAS_PLAZO_CC,
  RECARGO_MORA_CC,
  type CCResumenInmobiliaria,
} from "@/lib/firebase/firestore";
import { Loader2, CreditCard, Building2, AlertTriangle, CheckCircle, Ban, TrendingUp } from "lucide-react";
import type { Production } from "@/types";

function usd(v: number) {
  return `USD ${v.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CuentasCorrientesPage() {
  const [loading, setLoading] = useState(true);
  const [resumenes, setResumenes] = useState<CCResumenInmobiliaria[]>([]);
  const [sinCC, setSinCC] = useState<{ nombre: string; id: string }[]>([]);
  const [totales, setTotales] = useState({ saldo: 0, bloqueadas: 0, enMora: 0 });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [users, inmobiliarias] = await Promise.all([
        getUsers(),
        getInmobiliarias(),
      ]);

      const agentesCC = users.filter((u) => u.cuentaCorrienteAprobada && u.inmobiliariaId);

      // Agrupar agentes CC por inmobiliaria
      const byInmob: Record<string, typeof agentesCC> = {};
      for (const a of agentesCC) {
        if (!a.inmobiliariaId) continue;
        if (!byInmob[a.inmobiliariaId]) byInmob[a.inmobiliariaId] = [];
        byInmob[a.inmobiliariaId].push(a);
      }

      // Cargar producciones CC de cada inmobiliaria con agentes CC
      const resList: CCResumenInmobiliaria[] = [];
      for (const inmobId of Object.keys(byInmob)) {
        const inmob = inmobiliarias.find((i) => i.id === inmobId);
        const agentes = byInmob[inmobId];
        const prods: Production[] = [];
        for (const ag of agentes) {
          const p = await getProductions({ agenteId: ag.uid });
          prods.push(...p.filter((pr) => pr.esCuentaCorriente));
        }
        resList.push(
          calcularResumenCC(
            inmobId,
            inmob?.nombre ?? inmobId,
            prods,
            agentes.map((a) => ({ uid: a.uid, nombre: a.nombre, email: a.email }))
          )
        );
      }

      resList.sort((a, b) => b.saldoPendiente - a.saldoPendiente);
      setResumenes(resList);

      // Inmobiliarias sin agentes CC (informativo)
      const conCC = new Set(Object.keys(byInmob));
      setSinCC(inmobiliarias.filter((i) => !conCC.has(i.id)).map((i) => ({ id: i.id, nombre: i.nombre })));

      setTotales({
        saldo: resList.reduce((s, r) => s + r.saldoPendiente, 0),
        bloqueadas: resList.filter((r) => r.bloqueada).length,
        enMora: resList.filter((r) => r.enMora).length,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
      <h1 className="text-2xl font-bold text-[#E2ECF4] mb-2">Cuentas Corrientes</h1>
      <p className="text-sm text-[#7A96A8] mb-8">
        Límite: {usd(LIMITE_CC)} · Plazo: {DIAS_PLAZO_CC} días · Mora: {RECARGO_MORA_CC * 100}% mensual sobre saldo vencido
      </p>

      {/* Métricas globales */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#161C26] rounded-xl border border-[#263040] p-4">
          <p className="text-xs text-[#7A96A8] mb-1">Saldo total pendiente</p>
          <p className="text-xl font-bold font-mono text-[#F2B968]">{usd(totales.saldo)}</p>
        </div>
        <div className="bg-[#161C26] rounded-xl border border-[#263040] p-4">
          <p className="text-xs text-[#7A96A8] mb-1">Inmobiliarias bloqueadas</p>
          <p className={`text-xl font-bold font-mono ${totales.bloqueadas > 0 ? "text-red-400" : "text-green-400"}`}>
            {totales.bloqueadas}
          </p>
        </div>
        <div className="bg-[#161C26] rounded-xl border border-[#263040] p-4">
          <p className="text-xs text-[#7A96A8] mb-1">En mora (+{DIAS_PLAZO_CC}d)</p>
          <p className={`text-xl font-bold font-mono ${totales.enMora > 0 ? "text-red-400" : "text-green-400"}`}>
            {totales.enMora}
          </p>
        </div>
      </div>

      {/* Listado por inmobiliaria */}
      {resumenes.length === 0 ? (
        <div className="text-center py-12 bg-[#161C26] rounded-xl border border-[#263040]">
          <CreditCard className="w-8 h-8 text-[#7A96A8] mx-auto mb-3" />
          <p className="text-[#7A96A8]">No hay agentes con cuenta corriente activa</p>
          <p className="text-xs text-[#4A6070] mt-1">Aprobá desde Cuentas → pestaña Aprobadas</p>
        </div>
      ) : (
        <div className="space-y-4">
          {resumenes.map((r) => {
            const pctUsado = Math.min((r.saldoPendiente / LIMITE_CC) * 100, 100);
            const moraAmount = r.enMora ? r.saldoPendiente * RECARGO_MORA_CC : 0;
            return (
              <div
                key={r.inmobiliariaId}
                className={`bg-[#161C26] rounded-xl border p-5 ${
                  r.bloqueada ? "border-red-500/40" : r.enMora ? "border-amber-500/40" : "border-[#263040]"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#7A96A8]" />
                      <h3 className="font-semibold text-[#E2ECF4]">{r.inmobiliariaNombre}</h3>
                      {r.bloqueada && (
                        <span className="text-xs bg-red-500/15 text-red-300 border border-red-500/30 rounded px-2 py-0.5 flex items-center gap-1">
                          <Ban className="w-3 h-3" /> BLOQUEADA
                        </span>
                      )}
                      {r.enMora && !r.bloqueada && (
                        <span className="text-xs bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded px-2 py-0.5 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> EN MORA
                        </span>
                      )}
                      {!r.bloqueada && !r.enMora && (
                        <span className="text-xs bg-green-500/15 text-green-300 border border-green-500/30 rounded px-2 py-0.5 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Al día
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#7A96A8] mt-1">
                      {r.agentesCC.map((a) => a.nombre).join(", ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#7A96A8]">Saldo pendiente</p>
                    <p className={`text-xl font-bold font-mono ${r.saldoPendiente >= LIMITE_CC ? "text-red-400" : r.saldoPendiente > LIMITE_CC * 0.7 ? "text-amber-300" : "text-[#E2ECF4]"}`}>
                      {usd(r.saldoPendiente)}
                    </p>
                    <p className="text-xs text-[#7A96A8]">de {usd(LIMITE_CC)}</p>
                  </div>
                </div>

                {/* Barra de cupo */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-[#7A96A8] mb-1">
                    <span>Cupo usado</span>
                    <span>{pctUsado.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-[#0D1117] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pctUsado >= 100 ? "bg-red-500" : pctUsado >= 70 ? "bg-amber-400" : "bg-green-500"
                      }`}
                      style={{ width: `${pctUsado}%` }}
                    />
                  </div>
                </div>

                {/* Datos */}
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-[#7A96A8]">Producciones impagadas</p>
                    <p className="font-mono text-[#E2ECF4]">{r.producciones}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#7A96A8]">Días desde 1ª entrega</p>
                    <p className={`font-mono ${(r.diasDesdeFirstEntrega ?? 0) > DIAS_PLAZO_CC ? "text-red-400" : "text-[#E2ECF4]"}`}>
                      {r.diasDesdeFirstEntrega !== null ? `${r.diasDesdeFirstEntrega}d` : "—"}
                    </p>
                  </div>
                  {r.enMora && (
                    <div>
                      <p className="text-xs text-[#7A96A8] flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-red-400" /> Recargo mora (5%/mes)
                      </p>
                      <p className="font-mono text-red-400">{usd(moraAmount)}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inmobiliarias sin CC (colapsado) */}
      {sinCC.length > 0 && (
        <div className="mt-8">
          <p className="text-xs text-[#4A6070] mb-2">
            Inmobiliarias sin agentes con CC ({sinCC.length}): {sinCC.map((i) => i.nombre).join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}
