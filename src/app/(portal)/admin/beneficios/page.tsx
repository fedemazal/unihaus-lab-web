"use client";

import { useEffect, useState } from "react";
import {
  getBeneficiosConfig,
  saveBeneficiosConfig,
  getInmobiliarias,
  getUsers,
  getProductions,
  computeCapa1,
  DEFAULT_BENEFICIOS_CONFIG,
} from "@/lib/firebase/firestore";
import type { BeneficiosConfig, Inmobiliaria, UserProfile, Production, Capa1Tier } from "@/types";
import { Loader2, Save, RotateCcw, Building2, User, Settings, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Timestamp } from "firebase/firestore";

type Tab = "config" | "inmobiliarias" | "agentes";

function toDate(v: unknown): Date {
  if (!v) return new Date(0);
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  return new Date(v as string);
}

function getMonth(prod: Production, year: number, month: number) {
  const d = toDate(prod.createdAt);
  return d.getFullYear() === year && d.getMonth() === month;
}

function getYear(prod: Production, year: number) {
  return toDate(prod.createdAt).getFullYear() === year;
}

export default function AdminBeneficiosPage() {
  const [tab, setTab] = useState<Tab>("config");
  const [config, setConfig] = useState<BeneficiosConfig | null>(null);
  const [draft, setDraft] = useState<BeneficiosConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [inmobiliarias, setInmobiliarias] = useState<Inmobiliaria[]>([]);
  const [agents, setAgents] = useState<UserProfile[]>([]);
  const [productions, setProductions] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedInmob, setExpandedInmob] = useState<string | null>(null);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  useEffect(() => {
    async function load() {
      try {
        const [cfg, inmobs, users, prods] = await Promise.all([
          getBeneficiosConfig(),
          getInmobiliarias(),
          getUsers(),
          getProductions(),
        ]);
        setConfig(cfg);
        setDraft(JSON.parse(JSON.stringify(cfg)));
        setInmobiliarias(inmobs);
        setAgents(users.filter((u) => u.rol === "agente" && u.estado === "aprobado"));
        setProductions(prods.filter((p) => p.estado !== "cancelado"));
      } catch (e) {
        console.error("Error cargando beneficios admin:", e);
        setConfig(DEFAULT_BENEFICIOS_CONFIG);
        setDraft(JSON.parse(JSON.stringify(DEFAULT_BENEFICIOS_CONFIG)));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    await saveBeneficiosConfig(draft);
    setConfig(draft);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function updateTier(i: number, field: keyof Capa1Tier, value: string) {
    if (!draft) return;
    const tiers = [...draft.capa1];
    if (field === "max") {
      tiers[i] = { ...tiers[i], max: value === "" ? null : Number(value) };
    } else {
      tiers[i] = { ...tiers[i], [field]: Number(value) };
    }
    setDraft({ ...draft, capa1: tiers });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-[#F2B968]" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "config", label: "Configuración", icon: <Settings className="w-4 h-4" /> },
    { id: "inmobiliarias", label: "Por Inmobiliaria", icon: <Building2 className="w-4 h-4" /> },
    { id: "agentes", label: "Por Agente", icon: <User className="w-4 h-4" /> },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#E2ECF4] mb-2">Sistema de Beneficios</h1>
      <p className="text-[#7A96A8] text-sm mb-6">Configurá los descuentos y seguí el progreso de cada inmobiliaria y agente.</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#0D1117] rounded-xl p-1 border border-[#263040]">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition ${
              tab === t.id
                ? "bg-[#F2B968] text-[#0D1117]"
                : "text-[#7A96A8] hover:text-[#E2ECF4]"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: CONFIGURACIÓN */}
      {tab === "config" && draft && (
        <div className="space-y-6">

          {/* Capa 1 */}
          <div className="bg-[#161C26] border border-[#263040] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-semibold text-[#E2ECF4]">Capa 1 — Descuento por Inmobiliaria</p>
                <p className="text-xs text-[#7A96A8] mt-0.5">Descuento según producciones del mes (se acumula con Capa 3)</p>
              </div>
            </div>
            <div className="space-y-3">
              {draft.capa1.map((tier, i) => (
                <div key={i} className="grid grid-cols-3 gap-3 items-end">
                  <div>
                    <Label className="text-xs text-[#7A96A8]">Desde (prod.)</Label>
                    <Input
                      type="number"
                      value={tier.min}
                      onChange={(e) => updateTier(i, "min", e.target.value)}
                      className="mt-1 h-8 text-sm bg-[#0D1117] border-[#263040] text-[#E2ECF4]"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-[#7A96A8]">Hasta (vacío = sin límite)</Label>
                    <Input
                      type="number"
                      value={tier.max ?? ""}
                      placeholder="∞"
                      onChange={(e) => updateTier(i, "max", e.target.value)}
                      className="mt-1 h-8 text-sm bg-[#0D1117] border-[#263040] text-[#E2ECF4] placeholder:text-[#263040]"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-[#7A96A8]">Descuento (%)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={tier.porcentaje}
                      onChange={(e) => updateTier(i, "porcentaje", e.target.value)}
                      className="mt-1 h-8 text-sm bg-[#0D1117] border-[#263040] text-[#E2ECF4]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Capa 2 */}
          <div className="bg-[#161C26] border border-[#263040] rounded-xl p-5">
            <p className="font-semibold text-[#E2ECF4] mb-1">Capa 2 — Beneficios individuales por agente</p>
            <p className="text-xs text-[#7A96A8] mb-4">Acumulado anual por agente (se resetea cada año)</p>
            <div className="space-y-3">
              {draft.capa2.map((b, i) => (
                <div key={i} className="grid grid-cols-3 gap-3 items-end">
                  <div>
                    <Label className="text-xs text-[#7A96A8]">Producciones</Label>
                    <Input
                      type="number"
                      value={b.producciones}
                      onChange={(e) => {
                        const c2 = [...draft.capa2];
                        c2[i] = { ...c2[i], producciones: Number(e.target.value) };
                        setDraft({ ...draft, capa2: c2 });
                      }}
                      className="mt-1 h-8 text-sm bg-[#0D1117] border-[#263040] text-[#E2ECF4]"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-[#7A96A8]">Descripción del beneficio</Label>
                    <Input
                      value={b.descripcion}
                      onChange={(e) => {
                        const c2 = [...draft.capa2];
                        c2[i] = { ...c2[i], descripcion: e.target.value };
                        setDraft({ ...draft, capa2: c2 });
                      }}
                      className="mt-1 h-8 text-sm bg-[#0D1117] border-[#263040] text-[#E2ECF4]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Capa 3 + otros */}
          <div className="bg-[#161C26] border border-[#263040] rounded-xl p-5">
            <p className="font-semibold text-[#E2ECF4] mb-4">Otros parámetros</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-[#7A96A8]">Capa 3 — Bundle descuento (%)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={draft.capa3.porcentaje}
                  onChange={(e) => setDraft({ ...draft, capa3: { ...draft.capa3, porcentaje: Number(e.target.value) } })}
                  className="mt-1 h-8 text-sm bg-[#0D1117] border-[#263040] text-[#E2ECF4]"
                />
              </div>
              <div>
                <Label className="text-xs text-[#7A96A8]">Capa 3 — Mínimo de servicios</Label>
                <Input
                  type="number"
                  value={draft.capa3.minServicios}
                  onChange={(e) => setDraft({ ...draft, capa3: { ...draft.capa3, minServicios: Number(e.target.value) } })}
                  className="mt-1 h-8 text-sm bg-[#0D1117] border-[#263040] text-[#E2ECF4]"
                />
              </div>
              <div>
                <Label className="text-xs text-[#7A96A8]">Bono de bienvenida (%)</Label>
                <Input
                  type="number"
                  value={draft.bonoBienvenida}
                  onChange={(e) => setDraft({ ...draft, bonoBienvenida: Number(e.target.value) })}
                  className="mt-1 h-8 text-sm bg-[#0D1117] border-[#263040] text-[#E2ECF4]"
                />
              </div>
              <div>
                <Label className="text-xs text-[#7A96A8]">Prepago — descuento (%)</Label>
                <Input
                  type="number"
                  value={draft.prepago.descuento}
                  onChange={(e) => setDraft({ ...draft, prepago: { ...draft.prepago, descuento: Number(e.target.value) } })}
                  className="mt-1 h-8 text-sm bg-[#0D1117] border-[#263040] text-[#E2ECF4]"
                />
              </div>
            </div>
          </div>

          {/* Beneficios chicos */}
          <div className="bg-[#161C26] border border-[#263040] rounded-xl p-5">
            <p className="font-semibold text-[#E2ECF4] mb-1">Beneficios incluidos sin condición</p>
            <p className="text-xs text-[#7A96A8] mb-4">Disponibles desde la primera producción para todos</p>
            <div className="space-y-2">
              {draft.beneficiosChicos.map((b, i) => (
                <Input
                  key={i}
                  value={b}
                  onChange={(e) => {
                    const bc = [...draft.beneficiosChicos];
                    bc[i] = e.target.value;
                    setDraft({ ...draft, beneficiosChicos: bc });
                  }}
                  className="h-8 text-sm bg-[#0D1117] border-[#263040] text-[#E2ECF4]"
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#F2B968] hover:bg-[#d9a050] text-[#0D1117] font-semibold"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {saved ? "¡Guardado!" : "Guardar cambios"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setDraft(JSON.parse(JSON.stringify(config)))}
              className="border-[#263040] bg-transparent text-[#E2ECF4] hover:bg-[#1E2A38]"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Descartar
            </Button>
          </div>
        </div>
      )}

      {/* TAB: POR INMOBILIARIA */}
      {tab === "inmobiliarias" && config && (
        <div className="space-y-3">
          <p className="text-xs text-[#7A96A8] mb-4">
            Mes actual: {now.toLocaleString("es-AR", { month: "long", year: "numeric" })}
          </p>
          {inmobiliarias.map((inmob) => {
            const prodsEstesMes = productions.filter(
              (p) => p.inmobiliariaId === inmob.id && getMonth(p, currentYear, currentMonth)
            );
            const countMes = prodsEstesMes.length;
            const capa1 = computeCapa1(countMes, config.capa1);
            const nextTier = config.capa1.find((t) => t.min > countMes);
            const isExpanded = expandedInmob === inmob.id;

            return (
              <div key={inmob.id} className="bg-[#161C26] border border-[#263040] rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedInmob(isExpanded ? null : inmob.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-[#1E2A38] transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#F2B968]/10 rounded-lg flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-[#F2B968]" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-[#E2ECF4] text-sm">{inmob.nombre}</p>
                      <p className="text-xs text-[#7A96A8]">
                        {countMes} prod. este mes
                        {capa1 > 0 && <span className="text-green-400 ml-2">→ Capa 1: {capa1}% desc.</span>}
                        {capa1 === 0 && <span className="text-[#7A96A8] ml-2">→ Sin descuento Capa 1 aún</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {capa1 > 0 && (
                      <span className="text-xs bg-green-500/15 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">
                        −{capa1}%
                      </span>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-[#7A96A8]" /> : <ChevronDown className="w-4 h-4 text-[#7A96A8]" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-[#263040] p-4 space-y-4">
                    {/* Progress bar */}
                    <div>
                      <div className="flex justify-between text-xs text-[#7A96A8] mb-1">
                        <span>{countMes} producciones este mes</span>
                        {nextTier && <span>Siguiente nivel: {nextTier.min} prod. → {nextTier.porcentaje}%</span>}
                        {!nextTier && capa1 > 0 && <span className="text-green-400">Nivel máximo alcanzado</span>}
                      </div>
                      <div className="h-2 bg-[#263040] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#F2B968] rounded-full transition-all"
                          style={{ width: `${Math.min((countMes / (nextTier?.min ?? (countMes || 1))) * 100, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Tier table */}
                    <div className="grid grid-cols-3 gap-2">
                      {config.capa1.map((tier, i) => {
                        const active = computeCapa1(countMes, config.capa1) === tier.porcentaje && capa1 > 0;
                        return (
                          <div
                            key={i}
                            className={`rounded-lg px-3 py-2 text-center border ${
                              active
                                ? "border-green-500/40 bg-green-500/10"
                                : "border-[#263040] bg-[#0D1117]/40"
                            }`}
                          >
                            <p className="text-xs text-[#7A96A8]">
                              {tier.min}{tier.max ? `–${tier.max}` : "+"} prod.
                            </p>
                            <p className={`text-base font-bold ${active ? "text-green-400" : "text-[#7A96A8]"}`}>
                              {tier.porcentaje}%
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Descuento manual */}
                    <p className="text-xs text-[#7A96A8]">
                      Descuento manual configurado: <span className="text-[#E2ECF4]">{inmob.descuento}%</span>
                      {inmob.descuento > 0 && capa1 > 0 && (
                        <span className="ml-2 text-[#F2B968]">
                          → Total aplicado: {inmob.descuento + capa1}%
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB: POR AGENTE */}
      {tab === "agentes" && config && (
        <div className="space-y-3">
          <p className="text-xs text-[#7A96A8] mb-4">Año {currentYear} — acumulado individual</p>
          {agents.map((agent) => {
            const prodsAnio = productions.filter(
              (p) => p.agenteId === agent.uid && getYear(p, currentYear)
            );
            const count = prodsAnio.length;
            const maxBenefit = config.capa2[config.capa2.length - 1];
            const nextBenefit = config.capa2.find((b) => b.producciones > count);
            const earnedBenefits = config.capa2.filter((b) => count >= b.producciones);

            return (
              <div key={agent.uid} className="bg-[#161C26] border border-[#263040] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#263040] rounded-full flex items-center justify-center shrink-0">
                      <span className="text-[#E2ECF4] text-sm font-bold">
                        {agent.nombre.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-[#E2ECF4] text-sm">{agent.nombre}</p>
                      <p className="text-xs text-[#7A96A8]">{count} prod. en {currentYear}</p>
                    </div>
                  </div>
                  {earnedBenefits.length > 0 && (
                    <span className="text-xs bg-[#F2B968]/15 text-[#F2B968] border border-[#F2B968]/30 px-2 py-0.5 rounded-full">
                      {earnedBenefits.length} beneficio{earnedBenefits.length > 1 ? "s" : ""} ganado{earnedBenefits.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {/* Progress bar to next benefit */}
                {nextBenefit && (
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-[#7A96A8] mb-1">
                      <span>{count}/{nextBenefit.producciones} para próximo beneficio</span>
                      <span className="text-[#F2B968]">{nextBenefit.producciones - count} restantes</span>
                    </div>
                    <div className="h-1.5 bg-[#263040] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#F2B968] rounded-full"
                        style={{ width: `${Math.min((count / nextBenefit.producciones) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Earned */}
                {earnedBenefits.map((b, i) => (
                  <p key={i} className="text-xs text-green-400 mt-1">✓ {b.descripcion}</p>
                ))}

                {!nextBenefit && count >= maxBenefit.producciones && (
                  <p className="text-xs text-[#F2B968] mt-1">🏆 Todos los beneficios del año desbloqueados</p>
                )}
              </div>
            );
          })}

          {agents.length === 0 && (
            <div className="text-center py-12 bg-[#161C26] rounded-xl border border-[#263040]">
              <p className="text-[#7A96A8]">No hay agentes aprobados</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
