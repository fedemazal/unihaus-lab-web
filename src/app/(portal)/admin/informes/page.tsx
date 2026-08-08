"use client";

import { useEffect, useState } from "react";
import { getInmobiliarias, getProductions } from "@/lib/firebase/firestore";
import type { Inmobiliaria, Production } from "@/types";
import { Loader2, FileText, Printer, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function toDate(val: unknown): Date | null {
  if (!val) return null;
  if (typeof val === "object" && val !== null && "toDate" in val)
    return (val as { toDate: () => Date }).toDate();
  if (val instanceof Date) return val;
  return null;
}

function serviciosStr(p: Production): string {
  const parts: string[] = [];
  if (p.servicios?.soloFotos) parts.push("Solo Fotos");
  else if (p.servicios?.videoAdicional) parts.push("Fotos + Video + 2do Video");
  else parts.push("Fotos + Video");
  if (p.servicios?.plano2d) parts.push("Plano 2D");
  if (p.servicios?.tour360) parts.push("Tour 360°");
  if (p.servicios?.drone) parts.push("Drone");
  if (p.servicios?.amoblamiento) parts.push(`Amblamiento (${p.servicios.cantidadFotosAmobladas} fotos)`);
  return parts.join(", ");
}

function fechaStr(p: Production): string {
  if (p.horarioConfirmado?.fecha) {
    return `${p.horarioConfirmado.fecha}${p.horarioConfirmado.horario ? ` (${p.horarioConfirmado.horario})` : ""}`;
  }
  const f = toDate(p.fechaListo) ?? toDate(p.fechaEnProceso) ?? toDate(p.fechaSolicitud);
  return f ? f.toLocaleDateString("es-AR") : "—";
}

function abrirVentanaImpresion(inmo: Inmobiliaria, prods: Production[], mes: string, anio: number) {
  const totalUSD = prods.reduce((s, p) => s + (p.precioFinal || 0), 0);
  const totalPagado = prods.filter((p) => p.pagada).reduce((s, p) => s + (p.precioFinal || 0), 0);
  const totalImpago = totalUSD - totalPagado;

  const filas = prods
    .map(
      (p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${p.direccion}</td>
        <td>${p.agenteNombre}</td>
        <td>${fechaStr(p)}</td>
        <td>${serviciosStr(p)}</td>
        <td>USD ${p.precioFinal?.toFixed(2) ?? "—"}</td>
        <td class="${p.pagada ? "pagada" : "impaga"}">${p.pagada ? "Pagada" : "Impaga"}</td>
      </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Informe — ${inmo.nombre} — ${MESES[mes as unknown as number - 1] ?? mes} ${anio}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; padding: 24px; }
    .header { margin-bottom: 20px; border-bottom: 2px solid #111; padding-bottom: 12px; }
    .header h1 { font-size: 20px; font-weight: bold; margin-bottom: 4px; }
    .header p { font-size: 12px; color: #555; }
    .meta { display: flex; gap: 32px; margin-bottom: 16px; }
    .meta div { background: #f5f5f5; padding: 8px 12px; border-radius: 6px; }
    .meta div strong { display: block; font-size: 14px; }
    .meta div span { color: #555; font-size: 10px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #111; color: #fff; padding: 7px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
    td { padding: 6px 8px; border-bottom: 1px solid #e5e5e5; vertical-align: top; }
    tr:nth-child(even) td { background: #fafafa; }
    .pagada { color: #16a34a; font-weight: bold; }
    .impaga { color: #dc2626; font-weight: bold; }
    tfoot td { font-weight: bold; border-top: 2px solid #111; padding-top: 8px; background: #f9f9f9; }
    .footer { color: #888; font-size: 10px; margin-top: 20px; text-align: center; }
    @media print {
      body { padding: 0; }
      button { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>UniHaus Lab — Informe de Producciones</h1>
    <p>${inmo.nombre}${inmo.descuento > 0 ? ` · Descuento aplicado: ${inmo.descuento}%` : ""} &nbsp;|&nbsp; ${MESES[Number(mes) - 1]} ${anio} &nbsp;|&nbsp; ${prods.length} producción${prods.length !== 1 ? "es" : ""}</p>
  </div>

  <div class="meta">
    <div><strong>USD ${totalUSD.toFixed(2)}</strong><span>Total facturado</span></div>
    <div><strong style="color:#16a34a">USD ${totalPagado.toFixed(2)}</strong><span>Pagado</span></div>
    <div><strong style="color:#dc2626">USD ${totalImpago.toFixed(2)}</strong><span>Pendiente de pago</span></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Dirección</th>
        <th>Agente</th>
        <th>Fecha</th>
        <th>Servicios</th>
        <th>Total</th>
        <th>Pago</th>
      </tr>
    </thead>
    <tbody>${filas}</tbody>
    <tfoot>
      <tr>
        <td colspan="5">TOTAL ${prods.length} producción${prods.length !== 1 ? "es" : ""}</td>
        <td>USD ${totalUSD.toFixed(2)}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>

  <div class="footer">
    Informe generado por UniHaus Lab · ${new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
  </div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  }
}

export default function InformesPage() {
  const [inmobiliarias, setInmobiliarias] = useState<Inmobiliaria[]>([]);
  const [selectedInmoId, setSelectedInmoId] = useState("");
  const [selectedMes, setSelectedMes] = useState(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [selectedAnio, setSelectedAnio] = useState(new Date().getFullYear());
  const [producciones, setProducciones] = useState<Production[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingInmos, setLoadingInmos] = useState(true);
  const [generado, setGenerado] = useState(false);

  useEffect(() => {
    getInmobiliarias()
      .then(setInmobiliarias)
      .finally(() => setLoadingInmos(false));
  }, []);

  const selectedInmo = inmobiliarias.find((i) => i.id === selectedInmoId) ?? null;

  async function generar() {
    if (!selectedInmoId) return;
    setLoading(true);
    setGenerado(false);
    try {
      const todas = await getProductions({ inmobiliariaId: selectedInmoId });
      // Filtrar por mes y año
      const filtradas = todas.filter((p) => {
        const fecha = toDate(p.fechaSolicitud);
        if (!fecha) return false;
        return (
          fecha.getMonth() + 1 === Number(selectedMes) &&
          fecha.getFullYear() === selectedAnio
        );
      });
      setProducciones(filtradas);
      setGenerado(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const anios = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#E2ECF4] mb-2">Informes por Inmobiliaria</h1>
      <p className="text-[#7A96A8] mb-8 text-sm">Generá un informe mensual de producciones para entregar a cada inmobiliaria.</p>

      {/* Filtros */}
      <div className="bg-[#161C26] border border-[#263040] rounded-xl p-5 mb-6">
        <div className="grid sm:grid-cols-3 gap-4 mb-4">
          {/* Inmobiliaria */}
          <div>
            <label className="block text-xs text-[#7A96A8] mb-1.5 font-medium">Inmobiliaria</label>
            {loadingInmos ? (
              <div className="flex items-center gap-2 text-[#7A96A8] text-sm"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando...</div>
            ) : (
              <select
                value={selectedInmoId}
                onChange={(e) => { setSelectedInmoId(e.target.value); setGenerado(false); }}
                className="w-full bg-[#0D1117] border border-[#263040] text-[#E2ECF4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F2B968]/50"
              >
                <option value="">— Seleccioná una inmobiliaria —</option>
                {inmobiliarias.map((inmo) => (
                  <option key={inmo.id} value={inmo.id}>{inmo.nombre}</option>
                ))}
              </select>
            )}
          </div>

          {/* Mes */}
          <div>
            <label className="block text-xs text-[#7A96A8] mb-1.5 font-medium">Mes</label>
            <select
              value={selectedMes}
              onChange={(e) => { setSelectedMes(e.target.value); setGenerado(false); }}
              className="w-full bg-[#0D1117] border border-[#263040] text-[#E2ECF4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F2B968]/50"
            >
              {MESES.map((m, i) => (
                <option key={i} value={String(i + 1).padStart(2, "0")}>{m}</option>
              ))}
            </select>
          </div>

          {/* Año */}
          <div>
            <label className="block text-xs text-[#7A96A8] mb-1.5 font-medium">Año</label>
            <select
              value={selectedAnio}
              onChange={(e) => { setSelectedAnio(Number(e.target.value)); setGenerado(false); }}
              className="w-full bg-[#0D1117] border border-[#263040] text-[#E2ECF4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F2B968]/50"
            >
              {anios.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        <Button
          onClick={generar}
          disabled={!selectedInmoId || loading}
          className="bg-[#F2B968] hover:bg-[#d9a050] text-[#0D1117] font-semibold"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cargando...</>
            : <><FileText className="w-4 h-4 mr-2" /> Generar informe</>}
        </Button>
      </div>

      {/* Vista previa del informe */}
      {generado && selectedInmo && (
        <div className="bg-[#161C26] border border-[#263040] rounded-xl overflow-hidden">
          {/* Header del informe */}
          <div className="p-5 border-b border-[#263040] flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-4 h-4 text-[#F2B968]" />
                <span className="font-semibold text-[#E2ECF4]">{selectedInmo.nombre}</span>
                {selectedInmo.descuento > 0 && (
                  <span className="text-xs bg-green-500/15 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">
                    {selectedInmo.descuento}% dto.
                  </span>
                )}
              </div>
              <p className="text-sm text-[#7A96A8]">
                {MESES[Number(selectedMes) - 1]} {selectedAnio} · {producciones.length} producción{producciones.length !== 1 ? "es" : ""}
              </p>
            </div>
            <Button
              onClick={() => abrirVentanaImpresion(selectedInmo, producciones, selectedMes, selectedAnio)}
              className="bg-[#F2B968] hover:bg-[#d9a050] text-[#0D1117] font-semibold"
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimir / Exportar
            </Button>
          </div>

          {/* Resumen */}
          {producciones.length > 0 && (
            <div className="px-5 py-3 border-b border-[#263040] grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-[#7A96A8]">Total facturado</p>
                <p className="text-base font-bold text-[#E2ECF4] font-mono">
                  USD {producciones.reduce((s, p) => s + (p.precioFinal || 0), 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#7A96A8]">Pagado</p>
                <p className="text-base font-bold text-green-400 font-mono">
                  USD {producciones.filter((p) => p.pagada).reduce((s, p) => s + (p.precioFinal || 0), 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#7A96A8]">Pendiente</p>
                <p className="text-base font-bold text-amber-300 font-mono">
                  USD {producciones.filter((p) => !p.pagada).reduce((s, p) => s + (p.precioFinal || 0), 0).toFixed(2)}
                </p>
              </div>
            </div>
          )}

          {/* Listado */}
          {producciones.length === 0 ? (
            <div className="py-16 text-center text-[#7A96A8] text-sm">
              No hay producciones para {selectedInmo.nombre} en {MESES[Number(selectedMes) - 1]} {selectedAnio}.
            </div>
          ) : (
            <div className="divide-y divide-[#263040]">
              {producciones.map((prod, i) => (
                <div key={prod.id} className="px-5 py-3.5 flex items-start gap-4">
                  <span className="text-xs text-[#7A96A8] font-mono w-5 shrink-0 pt-0.5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-medium text-[#E2ECF4] truncate">{prod.direccion}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${prod.pagada ? "bg-green-500/15 text-green-400 border-green-500/30" : "bg-red-500/15 text-red-400 border-red-500/30"}`}>
                        {prod.pagada ? "Pagada" : "Impaga"}
                      </span>
                    </div>
                    <p className="text-xs text-[#7A96A8]">
                      {prod.agenteNombre} · {fechaStr(prod)} · {serviciosStr(prod)}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-[#F2B968] font-mono shrink-0">
                    USD {prod.precioFinal?.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
