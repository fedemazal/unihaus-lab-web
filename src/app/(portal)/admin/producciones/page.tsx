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
  pendiente: { label: "Pendiente", color: "bg-amber-100 text-amber-800 border-amber-200", next: "en_proceso", nextLabel: "Pasar a En Proceso" },
  en_proceso: { label: "En proceso", color: "bg-blue-100 text-blue-800 border-blue-200", next: "listo", nextLabel: "Marcar como Listo" },
  listo: { label: "Listo", color: "bg-green-100 text-green-800 border-green-200" },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-800 border-red-200" },
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
        // Get agent email for calendar invite
        let agenteEmail = "";
        try {
          const agente = await getUser(prod.agenteId);
          if (agente) agenteEmail = agente.email;
        } catch {}

        // Build services list for calendar notes
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

        // Build metraje info
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
      // If there's a calendar event, try to delete it
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
        <Loader2 className="w-6 h-6 animate-spin text-[#C07856]" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#2C2C2C] mb-8">Gestión de Producciones</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por dirección, agente o inmobiliaria..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-10 bg-white border-gray-200"
          />
        </div>
        <div className="flex gap-2">
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
                    ? "bg-[#C07856] text-white"
                    : "bg-white text-[#5A5A5A] border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {estado === "todos" ? "Todos" : statusConfig[estado as ProductionStatus].label}
                <span className={`text-xs ${filtroEstado === estado ? "text-white/70" : "text-gray-400"}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-[#5A5A5A]">No hay producciones</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((prod) => {
            const status = statusConfig[prod.estado];
            const isExpanded = expandedId === prod.id;

            return (
              <div key={prod.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Row header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : prod.id)}
                  className="w-full p-5 text-left flex items-center justify-between hover:bg-gray-50 transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`${status.color} border text-xs`}>{status.label}</Badge>
                      <span className="text-xs text-[#5A5A5A] capitalize">{prod.tipoPropiedad}</span>
                      {prod.tags.map((tag) => (
                        <Badge key={tag} className="bg-gray-100 text-gray-600 border border-gray-200 text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 text-[#2C2C2C] font-medium">
                      <MapPin className="w-4 h-4 text-[#5A5A5A] shrink-0" />
                      <span className="truncate">{prod.direccion}</span>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-1.5 text-sm text-[#5A5A5A]">
                      <span>{prod.agenteNombre}</span>
                      {prod.inmobiliariaNombre && <span>{prod.inmobiliariaNombre}</span>}
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" />
                        ${prod.precioFinal?.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-5 space-y-5">
                    {/* Property details */}
                    <div className="grid sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-[#5A5A5A]">Tipo: <span className="text-[#2C2C2C] capitalize">{prod.tipoPropiedad}</span></p>
                        {prod.superficie && <p className="text-[#5A5A5A]">Superficie: <span className="text-[#2C2C2C]">{prod.superficie} m²</span></p>}
                        {prod.construida && <p className="text-[#5A5A5A]">Construida: <span className="text-[#2C2C2C]">{prod.construida} m²</span></p>}
                        {prod.descubierta !== undefined && prod.descubierta > 0 && <p className="text-[#5A5A5A]">Descubierta: <span className="text-[#2C2C2C]">{prod.descubierta} m²</span></p>}
                        <p className="text-[#5A5A5A]">Amenidades: <span className="text-[#2C2C2C]">{prod.amenidades}</span></p>
                        <p className="text-[#5A5A5A]">Estado: <span className="text-[#2C2C2C] capitalize">{prod.estadoPropiedad?.ocupacion}</span></p>
                      </div>
                      <div>
                        <p className="font-medium text-[#2C2C2C] mb-1">Servicios:</p>
                        <p className="text-[#2C2C2C]">{prod.servicios?.soloFotos ? "Solo Fotos" : "Fotos + Video"}</p>
                        {prod.servicios?.videoAdicional && <p className="text-[#2C2C2C]">+ Video Adicional</p>}
                        {prod.servicios?.plano2d && <p className="text-[#2C2C2C]">+ Plano 2D</p>}
                        {prod.servicios?.tour360 && <p className="text-[#2C2C2C]">+ Tour 360°</p>}
                        {prod.servicios?.drone && <p className="text-[#2C2C2C]">+ Drone</p>}
                        {prod.servicios?.amoblamiento && <p className="text-[#2C2C2C]">+ Amoblamiento ({prod.servicios.cantidadFotosAmobladas} fotos)</p>}
                      </div>
                    </div>

                    {/* Schedule */}
                    {prod.horariosSugeridos?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-[#2C2C2C] mb-1 flex items-center gap-1">
                          <Calendar className="w-4 h-4" /> Horarios sugeridos:
                        </p>
                        <ul className="text-sm text-[#5A5A5A] space-y-0.5">
                          {prod.horariosSugeridos.map((h, i) => (
                            <li key={i}>• {h}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Confirm schedule */}
                    {prod.horarioConfirmado ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm font-medium text-green-800 flex items-center gap-1">
                          <Calendar className="w-4 h-4" /> Horario confirmado
                        </p>
                        <p className="text-sm text-green-700 mt-1">
                          {prod.horarioConfirmado.fecha} — {prod.horarioConfirmado.horario}
                        </p>
                      </div>
                    ) : prod.estado === "pendiente" ? (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-1">
                          <Calendar className="w-4 h-4" /> Confirmar horario
                        </p>
                        <div className="flex gap-2 items-end">
                          <div>
                            <Label className="text-xs text-amber-700">Fecha</Label>
                            <Input
                              type="date"
                              value={scheduleDate}
                              onChange={(e) => setScheduleDate(e.target.value)}
                              className="h-8 text-sm bg-white border-amber-200"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-amber-700">Horario</Label>
                            <Input
                              type="text"
                              placeholder="09:00 - 11:00"
                              value={scheduleTime}
                              onChange={(e) => setScheduleTime(e.target.value)}
                              className="h-8 text-sm bg-white border-amber-200"
                            />
                          </div>
                          <Button
                            size="sm"
                            onClick={() => confirmSchedule(prod)}
                            disabled={!scheduleDate || !scheduleTime}
                            className="bg-amber-600 hover:bg-amber-700 h-8"
                          >
                            Confirmar
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    {prod.observaciones && (
                      <div>
                        <p className="text-sm font-medium text-[#2C2C2C] mb-1">Observaciones:</p>
                        <p className="text-sm text-[#5A5A5A] whitespace-pre-line">{prod.observaciones}</p>
                      </div>
                    )}

                    {/* Price */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#5A5A5A]">Base</span>
                        <span className="font-mono">${prod.precioBase?.toFixed(2)}</span>
                      </div>
                      {prod.precioExtras > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-[#5A5A5A]">Extras</span>
                          <span className="font-mono">${prod.precioExtras?.toFixed(2)}</span>
                        </div>
                      )}
                      {prod.descuentoAplicado > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Descuento</span>
                          <span className="font-mono">-${prod.descuentoAplicado?.toFixed(2)}</span>
                        </div>
                      )}
                      <hr className="my-2 border-gray-200" />
                      <div className="flex justify-between font-bold">
                        <span>Total</span>
                        <span className="text-[#C07856] font-mono">${prod.precioFinal?.toFixed(2)} USD</span>
                      </div>
                    </div>

                    {/* Tags */}
                    <div>
                      <p className="text-sm font-medium text-[#2C2C2C] mb-2 flex items-center gap-1">
                        <Tag className="w-4 h-4" /> Tags:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {SUGGESTED_TAGS.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => toggleTag(prod, tag)}
                            className={`text-xs px-3 py-1 rounded-full border transition ${
                              prod.tags.includes(tag)
                                ? "bg-[#C07856] text-white border-[#C07856]"
                                : "bg-white text-[#5A5A5A] border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* File upload for en_proceso */}
                    {prod.estado === "en_proceso" && (
                      <div>
                        <Label className="text-[#2C2C2C] flex items-center gap-1 mb-1">
                          <Upload className="w-4 h-4" /> Link de archivos (ZIP)
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            value={fileUrl}
                            onChange={(e) => setFileUrl(e.target.value)}
                            placeholder="https://drive.google.com/..."
                            className="bg-white border-gray-200"
                          />
                          <Button onClick={() => saveFileUrl(prod)} size="sm" className="bg-[#C07856] hover:bg-[#a8654a] shrink-0">
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
                          className="bg-[#C07856] hover:bg-[#a8654a]"
                        >
                          {status.nextLabel}
                        </Button>
                      )}
                      {prod.estado === "listo" && (
                        <Button
                          variant="outline"
                          onClick={() => changeStatus(prod, "en_proceso")}
                          className="border-gray-200"
                        >
                          Volver a En Proceso
                        </Button>
                      )}
                      {prod.estado !== "cancelado" && (
                        <Button
                          variant="outline"
                          onClick={() => cancelProduction(prod)}
                          className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Cancelar
                        </Button>
                      )}
                      {(prod.estado === "cancelado" || prod.estado === "pendiente") && (
                        <Button
                          variant="outline"
                          onClick={() => handleDelete(prod)}
                          className="border-red-300 text-red-700 hover:bg-red-100"
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
