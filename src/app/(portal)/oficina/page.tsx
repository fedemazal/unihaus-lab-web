"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { getProduccionesDerivadasAOficina, updateProduction } from "@/lib/firebase/firestore";
import type { Production } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2, Building2, CheckCircle, Clock,
  Banknote, ChevronDown, ChevronUp, Copy, Check, DollarSign,
  Upload, Info,
} from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { CUENTA_BANCARIA } from "@/lib/config/cuentaBancaria";

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

function serviciosLabel(prod: Production): string {
  const parts: string[] = [];
  if (prod.servicios?.soloFotos) parts.push("Solo Fotos −25%");
  else if (prod.servicios?.videoAdicional) parts.push("Fotos + Video + 2do Video");
  else parts.push("Fotos + Video");
  if (prod.servicios?.plano2d) parts.push("Plano 2D");
  if (prod.servicios?.tour360) parts.push("Tour 360°");
  if (prod.servicios?.drone) parts.push("Drone");
  if (prod.servicios?.amoblamiento) parts.push(`Amoblamiento (${prod.servicios.cantidadFotosAmobladas} fotos)`);
  return parts.join(" · ");
}

export default function OficinaPage() {
  const { profile } = useAuth();
  const [productions, setProductions] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkPaying, setBulkPaying] = useState(false);
  const [showBanco, setShowBanco] = useState(false);
  const [dolarBlue, setDolarBlue] = useState<number | null>(null);
  const [showCalc, setShowCalc] = useState(false);
  const [calcUsd, setCalcUsd] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [uploadingComp, setUploadingComp] = useState(false);
  const [comprobanteOk, setComprobanteOk] = useState(false);

  const inmobiliariaId = profile?.inmobiliariaId;

  useEffect(() => {
    if (!inmobiliariaId) return;
    loadData();
    fetch("https://dolarapi.com/v1/dolares/blue")
      .then((r) => r.json())
      .then((d) => setDolarBlue(d.venta ?? null))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inmobiliariaId]);

  async function loadData() {
    if (!inmobiliariaId) return;
    setLoading(true);
    try {
      const data = await getProduccionesDerivadasAOficina(inmobiliariaId);
      setProductions(data);
      setSelected(new Set());
    } catch (err) {
      console.error("Error loading producciones:", err);
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
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

  async function handleBulkPay() {
    if (selected.size === 0) return;
    if (!confirm(`¿Marcar ${selected.size} producción${selected.size > 1 ? "es" : ""} como pagadas?`)) return;
    setBulkPaying(true);
    try {
      await Promise.all(Array.from(selected).map((id) => updateProduction(id, { pagada: true })));
      await loadData();
    } catch (err) {
      console.error("Error en pago bulk:", err);
    } finally {
      setBulkPaying(false);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubirComprobante(file: File) {
    setUploadingComp(true);
    setComprobanteOk(false);
    try {
      const presignRes = await fetch("/api/r2/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produccionId: `comprobante-oficina-${inmobiliariaId}`,
          nombre: file.name,
          contentType: file.type || "application/octet-stream",
        }),
      });
      if (!presignRes.ok) throw new Error("Error generando URL de subida");
      const { url } = await presignRes.json();
      const uploadRes = await fetch(url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      if (!uploadRes.ok) throw new Error("Error subiendo archivo");
      setComprobanteOk(true);
    } catch (err) {
      console.error("Error subiendo comprobante:", err);
      alert("Hubo un error al subir el comprobante. Intentá de nuevo.");
    } finally {
      setUploadingComp(false);
    }
  }

  const pendientes = productions.filter((p) => !p.pagada);
  const pagadas = productions.filter((p) => p.pagada);
  const totalPendiente = pendientes.reduce((sum, p) => sum + (p.precioFinal || 0), 0);
  const allPendientesSelected = pendientes.length > 0 && pendientes.every((p) => selected.has(p.id));

  function toggleSelectAll() {
    if (allPendientesSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendientes.map((p) => p.id)));
    }
  }

  if (!profile?.esCuentaCentral) {
    return (
      <div className="text-center py-20">
        <p className="text-[#7A96A8]">No tenés acceso a esta sección.</p>
      </div>
    );
  }

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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#161C26] border border-[#263040] rounded-xl p-5">
          <p className="text-xs text-[#7A96A8] uppercase tracking-wider mb-1">Saldo pendiente</p>
          <p className="text-2xl font-bold text-red-400">${totalPendiente.toFixed(0)}</p>
          <p className="text-xs text-[#7A96A8] mt-1">{pendientes.length} producción{pendientes.length !== 1 ? "es" : ""}</p>
        </div>
        <div className="bg-[#161C26] border border-[#263040] rounded-xl p-5">
          <p className="text-xs text-[#7A96A8] uppercase tracking-wider mb-1">Producciones pagadas</p>
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

      {/* Datos bancarios */}
      <div className="mb-4 border border-[#263040] rounded-xl overflow-hidden">
        <button
          onClick={() => setShowBanco(!showBanco)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#1E2A38] transition text-left"
        >
          <span className="font-medium text-[#E2ECF4] flex items-center gap-2">
            <Banknote className="w-5 h-5 text-[#F2B968]" />
            Datos bancarios para abonar
          </span>
          {showBanco ? <ChevronUp className="w-4 h-4 text-[#7A96A8]" /> : <ChevronDown className="w-4 h-4 text-[#7A96A8]" />}
        </button>
        {showBanco && (
          <div className="px-5 pb-5 pt-2 bg-[#0D1117] border-t border-[#263040] grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            {[
              { label: "Banco", value: CUENTA_BANCARIA.banco, id: "ofic-banco" },
              { label: "Tipo de cuenta", value: CUENTA_BANCARIA.tipoCuenta, id: "ofic-tipo" },
              { label: "CBU", value: CUENTA_BANCARIA.cbu, id: "ofic-cbu" },
              { label: "Alias", value: CUENTA_BANCARIA.alias, id: "ofic-alias" },
              { label: "Titular", value: CUENTA_BANCARIA.titular, id: "ofic-titular" },
              { label: "CUIT", value: CUENTA_BANCARIA.cuit, id: "ofic-cuit" },
            ].map(({ label, value, id }) => (
              <div key={id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-[#7A96A8]">{label}</p>
                  <p className="text-sm text-[#E2ECF4] font-medium font-mono">{value}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(value, id)}
                  className="shrink-0 p-1.5 rounded hover:bg-[#1E2A38] text-[#7A96A8] hover:text-[#E2ECF4] transition"
                  title="Copiar"
                >
                  {copiedField === id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))}
            <div className="sm:col-span-2 pt-2 border-t border-[#263040]">
              <p className="text-xs text-amber-400/80">{CUENTA_BANCARIA.nota}</p>
            </div>
          </div>
        )}
      </div>

      {/* Calculadora pesos */}
      <div className="mb-6 border border-[#263040] rounded-xl overflow-hidden">
        <button
          onClick={() => { setShowCalc(!showCalc); if (!showCalc && !calcUsd) setCalcUsd(String(Math.round(totalPendiente))); }}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#1E2A38] transition text-left"
        >
          <span className="font-medium text-[#E2ECF4] flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-blue-400" />
            Calculadora para pago en transferencias
          </span>
          {showCalc ? <ChevronUp className="w-4 h-4 text-[#7A96A8]" /> : <ChevronDown className="w-4 h-4 text-[#7A96A8]" />}
        </button>
        {showCalc && (
          <div className="px-5 pb-5 pt-3 bg-[#0D1117] border-t border-[#263040]">
            {dolarBlue ? (
              <p className="text-xs text-[#7A96A8] mb-4">
                Cotización de referencia: <span className="text-blue-300 font-semibold">$1 USD = ${dolarBlue.toLocaleString("es-AR")} ARS</span>
              </p>
            ) : (
              <p className="text-xs text-[#7A96A8] mb-4">Cargando cotización...</p>
            )}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs text-[#7A96A8] mb-1">Monto en USD</p>
                <Input
                  type="number"
                  min={0}
                  value={calcUsd}
                  onChange={(e) => setCalcUsd(e.target.value)}
                  className="bg-[#161C26] border-[#263040] text-[#E2ECF4] font-mono"
                  placeholder="0"
                />
              </div>
              <div className="text-[#7A96A8] text-xl mt-4">=</div>
              <div className="flex-1">
                <p className="text-xs text-[#7A96A8] mb-1">Equivalente ARS</p>
                <div className="h-10 flex items-center px-3 rounded-md border border-[#263040] bg-[#161C26]/50">
                  <span className="text-base font-bold text-blue-300 font-mono">
                    {dolarBlue && calcUsd
                      ? `$${(parseFloat(calcUsd) * dolarBlue).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-amber-400/70 mt-3">
              Orientativo. El monto exacto en pesos queda sujeto a la cotización acordada al momento del pago.
            </p>
          </div>
        )}
      </div>

      {/* Pago + comprobante unificados */}
      <div className="mb-6 border border-[#263040] rounded-xl p-5 bg-[#0D1117]">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <p className="font-medium text-[#E2ECF4] flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-[#F2B968]" />
              Formas de pago aceptadas
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs bg-green-500/10 text-green-300 border border-green-500/20 rounded-full px-3 py-1 font-medium">
                Efectivo en USD
              </span>
              <span className="text-xs bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded-full px-3 py-1 font-medium">
                Transferencia en pesos
              </span>
            </div>
            <p className="text-xs text-[#7A96A8] mt-2">
              Subí el comprobante de la transferencia o el recibo en efectivo y lo verificamos.
            </p>
          </div>
          <div className="shrink-0">
            {comprobanteOk ? (
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/25 text-green-400 text-xs font-medium">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Comprobante enviado
                </div>
                <button onClick={() => setComprobanteOk(false)} className="text-xs text-[#7A96A8] hover:text-[#E2ECF4] transition">
                  Subir otro
                </button>
              </div>
            ) : (
              <label className={`cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition ${uploadingComp ? "opacity-50 cursor-not-allowed border-[#263040] text-[#7A96A8]" : "border-[#F2B968]/40 hover:border-[#F2B968]/70 hover:bg-[#F2B968]/5 text-[#F2B968]"}`}>
                {uploadingComp
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</>
                  : <><Upload className="w-4 h-4" /> Cargar comprobante</>}
                <input type="file" accept="image/*,.pdf" className="hidden" disabled={uploadingComp}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSubirComprobante(f); }} />
              </label>
            )}
          </div>
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
        <div className="space-y-6">
          {/* Pendientes */}
          {pendientes.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-[#7A96A8] uppercase tracking-wider">
                  Pendientes de pago
                </h2>
                <div className="flex items-center gap-3">
                  {selected.size > 0 && (
                    <Button
                      size="sm"
                      onClick={handleBulkPay}
                      disabled={bulkPaying}
                      className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                    >
                      {bulkPaying
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Procesando...</>
                        : <><CheckCircle className="w-3.5 h-3.5 mr-1" /> Marcar {selected.size} como pagada{selected.size > 1 ? "s" : ""}</>
                      }
                    </Button>
                  )}
                  <button
                    onClick={toggleSelectAll}
                    className="text-xs text-[#7A96A8] hover:text-[#E2ECF4] transition"
                  >
                    {allPendientesSelected ? "Deseleccionar todas" : "Seleccionar todas"}
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {pendientes.map((prod) => (
                  <div
                    key={prod.id}
                    className={`bg-[#161C26] border rounded-xl p-5 transition ${selected.has(prod.id) ? "border-purple-500/40 bg-purple-500/5" : "border-red-500/20"}`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selected.has(prod.id)}
                        onChange={() => toggleSelect(prod.id)}
                        className="mt-1 w-4 h-4 rounded accent-purple-500 cursor-pointer shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="min-w-0">
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
                              {serviciosLabel(prod)}
                            </p>
                            <p className="text-xs text-[#7A96A8] mt-0.5">
                              Solicitado: {formatDate(prod.fechaSolicitud)}
                              {prod.fechaListo && <> · Entregado: {formatDate(prod.fechaListo)}</>}
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
                              {markingPaid === prod.id
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <><CheckCircle className="w-4 h-4 mr-1" /> Marcar pagada</>}
                            </Button>
                          </div>
                        </div>
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
              <h2 className="text-sm font-semibold text-[#7A96A8] uppercase tracking-wider mb-3">Pagadas</h2>
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
                        <p className="text-xs text-[#7A96A8] mt-0.5">{serviciosLabel(prod)}</p>
                        <p className="text-xs text-[#7A96A8] mt-0.5">{formatDate(prod.fechaSolicitud)}</p>
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
