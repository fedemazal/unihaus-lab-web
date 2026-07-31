"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getInmobiliaria,
  getBeneficiosConfig,
  getProductions,
  computeCapa1,
} from "@/lib/firebase/firestore";
import type { BeneficiosConfig, Inmobiliaria, Production } from "@/types";
import { Building2, Percent, Gift, Loader2, Star, Zap, CheckCircle, Lock } from "lucide-react";
import { Timestamp } from "firebase/firestore";

function toDate(v: unknown): Date {
  if (!v) return new Date(0);
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  return new Date(v as string);
}

export default function BeneficiosPage() {
  const { profile } = useAuth();
  const [inmobiliaria, setInmobiliaria] = useState<Inmobiliaria | null>(null);
  const [config, setConfig] = useState<BeneficiosConfig | null>(null);
  const [prodsAgente, setProdsAgente] = useState<Production[]>([]);
  const [prodsInmob, setProdsInmob] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    async function load() {
      if (!profile) return;
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const [cfg, allProds] = await Promise.all([
        getBeneficiosConfig(),
        getProductions({ agenteId: profile.uid }),
      ]);
      setConfig(cfg);

      const anio = allProds.filter((p) => {
        const d = toDate(p.createdAt);
        return d.getFullYear() === year && p.estado !== "cancelado";
      });
      setProdsAgente(anio);

      if (profile.inmobiliariaId) {
        const [inmob, inmobProds] = await Promise.all([
          getInmobiliaria(profile.inmobiliariaId),
          getProductions({ inmobiliariaId: profile.inmobiliariaId }),
        ]);
        setInmobiliaria(inmob);
        const mes = inmobProds.filter((p) => {
          const d = toDate(p.createdAt);
          return d.getFullYear() === year && d.getMonth() === month && p.estado !== "cancelado";
        });
        setProdsInmob(mes);
      }
      setLoading(false);
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

  if (!config) return null;

  const countMes = prodsInmob.length;
  const capa1 = inmobiliaria ? computeCapa1(countMes, config.capa1) : 0;
  const manualDescuento = inmobiliaria?.descuento ?? 0;
  const totalDescuento = manualDescuento + capa1;
  const nextCapa1 = config.capa1.find((t) => t.min > countMes);

  const countAnio = prodsAgente.length;
  const nextCapa2 = config.capa2.find((b) => b.producciones > countAnio);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold text-[#E2ECF4] mb-6">Mis Beneficios</h1>

      {/* CAPA 1 — Descuento inmobiliaria */}
      {inmobiliaria && (
        <div className="bg-[#161C26] border border-[#263040] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-[#F2B968]" />
            <p className="font-semibold text-[#E2ECF4] text-sm">Capa 1 — Descuento de tu inmobiliaria</p>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#F2B968]/10 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-[#F2B968]" />
            </div>
            <p className="font-bold text-[#E2ECF4]">{inmobiliaria.nombre}</p>
          </div>

          {/* Current discount highlight */}
          <div className="bg-[#F2B968]/8 border border-[#F2B968]/20 rounded-xl p-4 mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-[#7A96A8] mb-0.5">Descuento activo este mes</p>
              <p className="text-3xl font-bold text-[#F2B968]">{totalDescuento > 0 ? `${totalDescuento}%` : "—"}</p>
              {capa1 > 0 && manualDescuento > 0 && (
                <p className="text-xs text-[#7A96A8] mt-0.5">
                  {manualDescuento}% base + {capa1}% Capa 1
                </p>
              )}
              {capa1 > 0 && manualDescuento === 0 && (
                <p className="text-xs text-[#7A96A8] mt-0.5">por volumen mensual</p>
              )}
            </div>
            <Percent className="w-8 h-8 text-[#F2B968]/40" />
          </div>

          {/* Monthly progress */}
          <div>
            <div className="flex justify-between text-xs text-[#7A96A8] mb-1">
              <span>{countMes} producciones este mes</span>
              {nextCapa1 && <span>{nextCapa1.min - countMes} más para {nextCapa1.porcentaje}%</span>}
              {!nextCapa1 && capa1 > 0 && <span className="text-green-400">Nivel máximo ✓</span>}
              {!nextCapa1 && capa1 === 0 && config.capa1[0] && (
                <span>{config.capa1[0].min - countMes} más para {config.capa1[0].porcentaje}%</span>
              )}
            </div>
            <div className="h-2 bg-[#263040] rounded-full overflow-hidden mb-3">
              {(() => {
                const target = nextCapa1?.min ?? (capa1 > 0 ? countMes : config.capa1[0]?.min ?? 5);
                return (
                  <div
                    className="h-full bg-[#F2B968] rounded-full transition-all"
                    style={{ width: `${Math.min((countMes / target) * 100, 100)}%` }}
                  />
                );
              })()}
            </div>

            {/* Tier badges */}
            <div className="grid grid-cols-3 gap-2">
              {config.capa1.map((tier, i) => {
                const tierActive = capa1 === tier.porcentaje && capa1 > 0;
                const tierReached = countMes >= tier.min;
                return (
                  <div
                    key={i}
                    className={`rounded-lg px-3 py-2 text-center border ${
                      tierActive
                        ? "border-green-500/40 bg-green-500/10"
                        : tierReached
                        ? "border-[#F2B968]/30 bg-[#F2B968]/5"
                        : "border-[#263040] bg-[#0D1117]/40"
                    }`}
                  >
                    <p className="text-xs text-[#7A96A8]">{tier.min}{tier.max ? `–${tier.max}` : "+"}</p>
                    <p className={`font-bold ${tierActive ? "text-green-400" : tierReached ? "text-[#F2B968]" : "text-[#7A96A8]"}`}>
                      {tier.porcentaje}%
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CAPA 2 — Progreso individual */}
      <div className="bg-[#161C26] border border-[#263040] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-4 h-4 text-[#F2B968]" />
          <p className="font-semibold text-[#E2ECF4] text-sm">Capa 2 — Tus beneficios individuales</p>
          <span className="text-xs text-[#7A96A8] ml-auto">Año {currentYear}</span>
        </div>

        {/* Annual count */}
        <div className="bg-[#0D1117] rounded-xl p-4 mb-4 flex items-center gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-[#E2ECF4]">{countAnio}</p>
            <p className="text-xs text-[#7A96A8]">prod. este año</p>
          </div>
          <div className="flex-1">
            {nextCapa2 ? (
              <>
                <div className="flex justify-between text-xs text-[#7A96A8] mb-1">
                  <span>{countAnio}/{nextCapa2.producciones}</span>
                  <span className="text-[#F2B968]">{nextCapa2.producciones - countAnio} restantes</span>
                </div>
                <div className="h-2.5 bg-[#263040] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#F2B968] rounded-full transition-all"
                    style={{ width: `${Math.min((countAnio / nextCapa2.producciones) * 100, 100)}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-[#F2B968] font-semibold">🏆 Todos los beneficios desbloqueados</p>
            )}
          </div>
        </div>

        {/* Benefit milestones */}
        <div className="space-y-2">
          {config.capa2.map((b, i) => {
            const earned = countAnio >= b.producciones;
            return (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  earned ? "border-green-500/30 bg-green-500/8" : "border-[#263040] bg-[#0D1117]/30"
                }`}
              >
                <div className={`mt-0.5 shrink-0 ${earned ? "text-green-400" : "text-[#263040]"}`}>
                  {earned ? <CheckCircle className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </div>
                <div>
                  <p className={`text-xs font-semibold ${earned ? "text-green-400" : "text-[#7A96A8]"}`}>
                    Al llegar a {b.producciones} producciones
                  </p>
                  <p className={`text-sm ${earned ? "text-[#E2ECF4]" : "text-[#7A96A8]"}`}>{b.descripcion}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CAPA 3 — Bundle */}
      <div className="bg-[#161C26] border border-[#263040] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-[#F2B968]" />
          <p className="font-semibold text-[#E2ECF4] text-sm">
            Capa 3 — {config.capa3.porcentaje}% por bundle de servicios
          </p>
        </div>
        <p className="text-sm text-[#7A96A8]">
          Contratá {config.capa3.minServicios} o más de los 6 servicios principales en una misma producción (Fotos, Video, 2° Video, Plano, Tour 360, Drone) y obtenés un {config.capa3.porcentaje}% adicional. Se acumula con Capa 1.
        </p>
      </div>

      {/* Beneficios incluidos */}
      <div className="bg-[#161C26] border border-[#263040] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="w-4 h-4 text-[#F2B968]" />
          <p className="font-semibold text-[#E2ECF4] text-sm">Siempre incluidos desde la primera producción</p>
        </div>
        <div className="space-y-2">
          {config.beneficiosChicos.map((b, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-[#F2B968] mt-0.5 shrink-0" />
              <span className="text-[#7A96A8]">{b}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
