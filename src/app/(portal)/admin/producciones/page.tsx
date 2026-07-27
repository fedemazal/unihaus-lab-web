"use client";

import { useEffect, useState } from "react";
import { getProductions, updateProduction, deleteProduction, getUser } from "@/lib/firebase/firestore";
import { sendEmail } from "@/lib/email/send";
import type { Production, ProductionStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Search,
  MapPin,
  DollarSign,
  Calendar,
  ChevronDown,
  ChevronUp,
  Loader2,
  Upload,
  Tag,
  Trash2,
  XCircle,
} from "lucide-react";

const statusConfig: Record<ProductionStatus, { label: string; color: string; next?: ProductionStatus; nextLabel?: string }> = {
  pendiente: { label: "Pendiente", color: "bg-amber-500/15 text-amber-300 border-amber-500/30", next: "en_proceso", nextLabel: "Pasar a En Proceso" },
  en_proceso: { label: "En proceso", color: "bg-blue-500/15 text-blue-300 border-blue-500/30", next: "listo", nextLabel: "Marcar como Listo" },
  listo: { label: "Listo", color: "bg-green-500/15 text-green-300 border-green-500/30" },
  cancelado: { label: "Cancelado", color: "bg-red-500/15 text-red-300 border-red-500/30" },
};

const SUGGESTED_TAGS = ["Premium", "Urgente", "Con Drone", "Video Vertical", "Amoblamiento", "Tour 360"];

export default function AdminProduccionesPage() {
  const [producciones, setProducciones] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getProductions();
      setProducciones(data);
    } catch (err) {
      console.error("Error loading productions:", err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = producciones.filter((p) => {
    if (filtroEstado !== "todos" && p.estado !== filtroEstado) return false;
    if (busqueda) {
      const s = busqueda.toLowerCase();
      return (
        p.direccion.toLowerCase().includes(s) ||
        p.agenteNombre.toLowerCase().includes(s) ||
        p.inmobiliariaNombre.toLowerCase().includes(s)
      );
    }
    return true;
  });

  async function changeStatus(prod: Production, newStatus: ProductionStatus) {
    try {
      const updates: Partial<Production> = { estado: newStatus };
      if (newStatus === "en_proceso") updates.fechaEnProceso = new Date();
      if (newStatus === "listo") updates.fechaListo = new Date();
      await updateProduction(prod.id, updates);
      const agent = await getUser(prod.agenteId);
      if (agent) {
        if (newStatus === "en_proceso") {
          sendEmail("produccion_en_proceso", agent.email, {
            nombre: agent.nombre,
            direccion: prod.direccion,
            fecha: prod.horarioConfirmado?.fecha,
            horario: prod.horarioConfirmado?.horario,
          });
        }
        if (newStatus === "listo") {
          sendEmail("archivos_listos", agent.email, {
            nombre: agent.nombre,
            direccion: prod.direccion,
          });
        }
      }
      await loadData();
    } catch (err) {
      console.error("Error changing status:", err);
    }
  }

  async function toggleTag(prod: Production, tag: string) {
    const tags = prod.tags.includes(tag)
      ? prod.tags.filter((t) => t !== tag)
      : [...prod.tags, tag];
    try {
      await updateProduction(prod.id, { tags });
      await loadData();
    } catch (err) {
      console.error("Error updating tags:", err);
    }
  }

  async function confirmSchedule(prod: Production) {
    if (!scheduleDate || !scheduleTime) return;
    try {
      let calendarEventId: string | null = null;
      try {
        let agenteEmail = "";
        try {
          const agente = await getUser(prod.agenteId);
          if (agente) agenteEmail = agente.email;
        } catch {}

        const serviciosList: string[] = [];
        if (prod.servicios.soloFotos) {
          serviciosList.push("Fotos");
        } else {
          serviciosList.push("Fotos + Video");
        }
        if (prod.servicios.videoAdicional) serviciosList.push("Video Adicional");
        if (prod.servicios.plano2d) serviciosList.push("Plano 2D");
        if (prod.servicios.tour360) serviciosList.push("Tour 360°");
        if (prod.servicios.drone) serviciosList.push("Drone");
        if (prod.servicios.amoblamiento) serviciosList.push(`Amoblamiento Virtual (${prod.servicios.cantidadFotosAmobladas} fotos)`);

        let metraje = "";
        if (prod.tipoPropiedad === "departamento") {
          metraje = `${prod.superficie || 0}m²`;
        } else {
          metraje = `${prod.construida || 0}m² construida, ${prod.descubierta || 0}m² descubierta`;
        }
        if (prod.amenidades > 0) metraje += ` + ${prod.amenidades} amenidades`;

        const calRes = await fetch("/api/calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create",
            data: {
              fecha: scheduleDate,
              horario: scheduleTime,
              direccion: prod.direccion,
              agenteNombre: prod.agenteNombre,
              agenteEmail,
              tipoPropiedad: prod.tipoPropiedad,
              metraje,
              servicios: serviciosList,
            },
          }),
        });
        const calData = await calRes.json();
        if (calData.eventId) calendarEventId = calData.eventId;
      } catch {
        console.warn("Calendar event not created (not configured)");
      }

      await updateProduction(prod.id, {
        horarioConfirmado: {
          fecha: scheduleDate,
          horario: scheduleTime,
          googleCalendarEventId: calendarEventId,
        },
      });
      setScheduleDate("");
      setScheduleTime("");
      await loadData();
    } catch (err) {
      console.error("Error confirming schedule:", err);
    }
  }

  async function cancelProduction(prod: Production) {
    if (!confirm(`¿Cancelar la producción en ${prod.direccion}?`)) return;
    try {
      await updateProduction(prod.id, { estado: "cancelado" as ProductionStatus });
      if (prod.horarioConfirmado?.googleCalendarEventId) {
        try {
          await fetch("/api/calendar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "delete",
              data: { eventId: prod.horarioConfirmado.googleCalendarEventId },
            }),
          });
        } catch {
          console.warn("Could not delete calendar event");
        }
      }
      await loadData();
    } catch (err) {
      console.error("Error canceling production:", err);
    }
  }

  async function handleDelete(prod: Production) {
    if (!confirm(`¿ELIMINAR permanentemente la producción en ${prod.direccion}? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteProduction(prod.id);
      await loadData();
    } catch (err) {
      console.error("Error deleting production:", err);
    }
  }

  async function saveFileUrl(prod: Production) {
    if (!fileUrl) return;
    try {
      await updateProduction(prod.id, {
        archivos: { ...prod.archivos, fotosVideosZip: fileUrl },
      });
      setFileUrl("");
      await loadData();
    } catch (err) {
      console.error("Error saving file:", err);
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
      <h1 className="text-2xl font-bold text-[#E2ECF4] mb-8">Gestión de Producciones</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A96A8]" />
          <Input
            placeholder="Buscar por dirección, agente o inmobiliaria..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-10 bg-[#0D1117] border-[#263040] text-[#E2ECF4] placeholder:text-[#7A96A8]"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["todos", "pendiente", "en_proceso", "listo", "cancelado"].map((estado) => {
            const count = estado === "todos"
              ? producciones.length
              : producciones.filter((p) => p.estado === estado).length;
            return (
              <button
                key={estado}
                onClick={() => setFiltroEstado(estado)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                  filtroEstado === estado
                    ? "bg-[#F2B968] text-[#0D1117]"
                    : "bg-[#161C26] text-[#7A96A8] border border-[#263040] hover:bg-[#1E2A38] hover:text-[#E2ECF4]"
                }`}
              >
                {estado === "todos" ? "Todos" : statusConfig[estado as ProductionStatus].label}
                <span className={`text-xs ${filtroEstado === estado ? "text-[#0D1117]/60" : "text-[#7A96A8]"}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-[#161C26] rounded-xl border border-[#263040]">
          <p className="text-[#7A96A8]">No hay producciones</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((prod) => {
            const status = statusConfig[prod.estado];
            const isExpanded = expandedId === prod.id;

            return (
              <div key={prod.id} className="bg-[#161C26] rounded-xl border border-[#263040] overflow-hidden">
                {/* Row header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : prod.id)}
                  className="w-full p-5 text-left flex items-center justify-between hover:bg-[#1E2A38] transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge className={`${status.color} border text-xs`}>{status.label}</Badge>
                      <span className="text-xs text-[#7A96A8] capitalize">{prod.tipoPropiedad}</span>
                      {prod.tags.map((tag) => (
                        <Badge key={tag} className="bg-[#1E2A38] text-[#7A96A8] border border-[#263040] text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 text-[#E2ECF4] font-medium">
                      <MapPin className="w-4 h-4 text-[#7A96A8] shrink-0" />
                      <span className="truncate">{prod.direccion}</span>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-1.5 text-sm text-[#7A96A8]">
                      <span>{prod.agenteNombre}</span>
                      {prod.inmobiliariaNombre && <span>{prod.inmobiliariaNombre}</span>}
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" />
                        ${prod.precioFinal?.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  {isExpanded
                    ? <ChevronUp className="w-5 h-5 text-[#7A96A8]" />
                    : <ChevronDown className="w-5 h-5 text-[#7A96A8]" />}
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-[#263040] p-5 space-y-5">
                    {/* Property details */}
                    <div className="grid sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-[#7A96A8]">Tipo: <span className="text-[#E2ECF4] capitalize">{prod.tipoPropiedad}</span></p>
                        {prod.superficie && <p className="text-[#7A96A8]">Superficie: <span className="text-[#E2ECF4]">{prod.superficie} m²</span></p>}
                        {prod.construida && <p className="text-[#7A96A8]">Construida: <span className="text-[#E2ECF4]">{prod.construida} m²</span></p>}
                        {prod.descubierta !== undefined && prod.descubierta > 0 && <p className="text-[#7A96A8]">Descubierta: <span className="text-[#E2ECF4]">{prod.descubierta} m²</span></p>}
                        <p className="text-[#7A96A8]">Amenidades: <span className="text-[#E2ECF4]">{prod.amenidades}</span></p>
                        <p className="text-[#7A96A8]">Estado: <span className="text-[#E2ECF4] capitalize">{prod.estadoPropiedad?.ocupacion}</span></p>
                      </div>
                      <div>
                        <p className="font-medium text-[#E2ECF4] mb-1">Servicios:</p>
                        <p className="text-[#E2ECF4]">{prod.servicios?.soloFotos ? "Solo Fotos" : "Fotos + Video"}</p>
                        {prod.servicios?.videoAdicional && <p className="text-[#E2ECF4]">+ Video Adicional</p>}
                        {prod.servicios?.plano2d && <p className="text-[#E2ECF4]">+ Plano 2D</p>}
                        {prod.servicios?.tour360 && <p className="text-[#E2ECF4]">+ Tour 360°</p>}
                        {prod.servicios?.drone && <p className="text-[#E2ECF4]">+ Drone</p>}
                        {prod.servicios?.amoblamiento && <p className="text-[#E2ECF4]">+ Amoblamiento ({prod.servicios.cantidadFotosAmobladas} fotos)</p>}
                      </div>
                    </div>

                    {/* Schedule */}
                    {prod.horariosSugeridos?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-[#E2ECF4] mb-1 flex items-center gap-1">
                          <Calendar className="w-4 h-4" /> Horarios sugeridos:
                        </p>
                        <ul className="text-sm text-[#7A96A8] space-y-0.5">
                          {prod.horariosSugeridos.map((h, i) => (
                            <li key={i}>• {h}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Confirm schedule */}
                    {prod.horarioConfirmado ? (
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                        <p className="text-sm font-medium text-green-400 flex items-center gap-1">
                          <Calendar className="w-4 h-4" /> Horario confirmado
                        </p>
                        <p className="text-sm text-green-300 mt-1">
                          {prod.horarioConfirmado.fecha} — {prod.horarioConfirmado.horario}
                        </p>
                      </div>
                    ) : prod.estado === "pendiente" ? (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                        <p className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-1">
                          <Calendar className="w-4 h-4" /> Confirmar horario
                        </p>
                        <div className="flex gap-2 items-end flex-wrap">
                          <div>
                            <Label className="text-xs text-amber-400">Fecha</Label>
                            <Input
                              type="date"
                              value={scheduleDate}
                              onChange={(e) => setScheduleDate(e.target.value)}
                              className="h-8 text-sm bg-[#0D1117] border-amber-500/30 text-[#E2ECF4]"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-amber-400">Horario</Label>
                            <Input
                              type="text"
                              placeholder="09:00 - 11:00"
                              value={scheduleTime}
                              onChange={(e) => setScheduleTime(e.target.value)}
                              className="h-8 text-sm bg-[#0D1117] border-amber-500/30 text-[#E2ECF4] placeholder:text-[#7A96A8]"
                            />
                          </div>
                          <Button
                            size="sm"
                            onClick={() => confirmSchedule(prod)}
                            disabled={!scheduleDate || !scheduleTime}
                            className="bg-amber-500 hover:bg-amber-600 text-[#0D1117] font-semibold h-8"
                          >
                            Confirmar
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    {prod.observaciones && (
                      <div>
                        <p className="text-sm font-medium text-[#E2ECF4] mb-1">Observaciones:</p>
                        <p className="text-sm text-[#7A96A8] whitespace-pre-line">{prod.observaciones}</p>
                      </div>
                    )}

                    {/* Price */}
                    <div className="bg-[#0D1117] rounded-lg p-4 border border-[#263040]">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#7A96A8]">Base</span>
                        <span className="font-mono text-[#E2ECF4]">${prod.precioBase?.toFixed(2)}</span>
                      </div>
                      {prod.precioExtras > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-[#7A96A8]">Extras</span>
                          <span className="font-mono text-[#E2ECF4]">${prod.precioExtras?.toFixed(2)}</span>
                        </div>
                      )}
                      {prod.descuentoAplicado > 0 && (
                        <div className="flex justify-between text-sm text-green-400">
                          <span>Descuento</span>
                          <span className="font-mono">-${prod.descuentoAplicado?.toFixed(2)}</span>
                        </div>
                      )}
                      <hr className="my-2 border-[#263040]" />
                      <div className="flex justify-between font-bold">
                        <span className="text-[#E2ECF4]">Total</span>
                        <span className="text-[#F2B968] font-mono">${prod.precioFinal?.toFixed(2)} USD</span>
                      </div>
                    </div>

                    {/* Valor estimado ratio */}
                    {prod.valorEstimado && prod.valorEstimado > 0 && (
                      <div className="bg-[#F2B968]/8 border border-[#F2B968]/25 rounded-lg p-4">
                        <p className="text-xs text-[#F2B968] font-semibold mb-1">Ratio de inversión</p>
                        <p className="text-lg font-bold text-[#E2ECF4]">
                          {((prod.precioFinal / prod.valorEstimado) * 100).toFixed(3)}%
                        </p>
                        <p className="text-xs text-[#7A96A8]">
                          ${prod.precioFinal.toFixed(0)} de ${prod.valorEstimado.toLocaleString("es-AR")} USD estimados
                        </p>
                      </div>
                    )}

                    {/* Tags */}
                    <div>
                      <p className="text-sm font-medium text-[#E2ECF4] mb-2 flex items-center gap-1">
                        <Tag className="w-4 h-4" /> Tags:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {SUGGESTED_TAGS.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => toggleTag(prod, tag)}
                            className={`text-xs px-3 py-1 rounded-full border transition ${
                              prod.tags.includes(tag)
                                ? "bg-[#F2B968] text-[#0D1117] border-[#F2B968]"
                                : "bg-[#0D1117] text-[#7A96A8] border-[#263040] hover:border-[#3A4A60] hover:text-[#E2ECF4]"
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* File upload */}
                    {prod.estado === "en_proceso" && (
                      <div>
                        <Label className="text-[#E2ECF4] flex items-center gap-1 mb-1">
                          <Upload className="w-4 h-4" /> Link de archivos (ZIP)
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            value={fileUrl}
                            onChange={(e) => setFileUrl(e.target.value)}
                            placeholder="https://drive.google.com/..."
                            className="bg-[#0D1117] border-[#263040] text-[#E2ECF4] placeholder:text-[#7A96A8]"
                          />
                          <Button
                            onClick={() => saveFileUrl(prod)}
                            size="sm"
                            className="bg-[#F2B968] hover:bg-[#d9a050] text-[#0D1117] font-semibold shrink-0"
                          >
                            Guardar
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {status.next && status.nextLabel && (
                        <Button
                          onClick={() => changeStatus(prod, status.next!)}
                          className="bg-[#F2B968] hover:bg-[#d9a050] text-[#0D1117] font-semibold"
                        >
                          {status.nextLabel}
                        </Button>
                      )}
                      {prod.estado === "listo" && (
                        <Button
                          variant="outline"
                          onClick={() => changeStatus(prod, "en_proceso")}
                          className="border-[#263040] text-[#E2ECF4] hover:bg-[#1E2A38]"
                        >
                          Volver a En Proceso
                        </Button>
                      )}
                      {prod.estado !== "cancelado" && (
                        <Button
                          variant="outline"
                          onClick={() => cancelProduction(prod)}
                          className="border-red-500/40 text-red-400 hover:bg-red-500/10"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Cancelar
                        </Button>
                      )}
                      {(prod.estado === "cancelado" || prod.estado === "pendiente") && (
                        <Button
                          variant="outline"
                          onClick={() => handleDelete(prod)}
                          className="border-red-500/50 text-red-400 hover:bg-red-500/15"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Eliminar
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
