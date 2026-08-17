"use client";

import { useEffect, useRef, useState } from "react";
import { getProductions, updateProduction, deleteProduction, getUser, setEntregaActiva } from "@/lib/firebase/firestore";
import { sendEmail } from "@/lib/email/send";
import type { ArchivoR2, Production, ProductionStatus } from "@/types";
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
  CheckCircle,
  FileArchive,
  X,
} from "lucide-react";

const statusConfig: Record<ProductionStatus, { label: string; color: string; next?: ProductionStatus; nextLabel?: string }> = {
  pendiente: { label: "Pendiente", color: "bg-amber-500/15 text-amber-300 border-amber-500/30", next: "en_proceso", nextLabel: "Pasar a En Proceso" },
  en_proceso: { label: "En proceso", color: "bg-blue-500/15 text-blue-300 border-blue-500/30", next: "listo", nextLabel: "Marcar como Listo" },
  listo: { label: "Listo", color: "bg-green-500/15 text-green-300 border-green-500/30" },
  cancelado: { label: "Cancelado", color: "bg-red-500/15 text-red-300 border-red-500/30" },
};

const SUGGESTED_TAGS = ["Premium", "Urgente", "Con Drone", "Video Vertical", "Amoblamiento", "Tour 360"];

const TIME_OPTIONS: string[] = [];
for (let h = 7; h <= 21; h++) {
  for (const m of [0, 15, 30, 45]) {
    if (h === 21 && m > 0) break;
    TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}

const DIAS = ["DOMINGO", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO"];

function formatFechaConfirmada(fecha: string): string {
  const [year, month, day] = fecha.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const diaNombre = DIAS[date.getDay()];
  const dd = String(day).padStart(2, "0");
  const mm = String(month).padStart(2, "0");
  const yy = String(year).slice(-2);
  return `${diaNombre} ${dd}/${mm}/${yy}`;
}

function formatHorario(horario: string): string {
  if (!horario) return "";
  // Convert "09:00" or "09:00 - 11:00" → "9:00 AM - 11:00 AM" style
  return horario.replace(/(\d{1,2}):(\d{2})/g, (_, h, m) => {
    const hour = parseInt(h, 10);
    const suffix = hour < 12 ? "AM" : "PM";
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return m === "00" ? `${h12} ${suffix}` : `${h12}:${m} ${suffix}`;
  });
}

export default function AdminProduccionesPage() {
  const [producciones, setProducciones] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTimeFrom, setScheduleTimeFrom] = useState("");
  const [scheduleTimeTo, setScheduleTimeTo] = useState("");
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);

  const scheduleTime = scheduleTimeFrom && scheduleTimeTo ? `${scheduleTimeFrom} - ${scheduleTimeTo}` : "";

  // Entrega R2
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          // WhatsApp al teléfono del agente si tiene número
          if (agent.telefono) {
            fetch("/api/notify-whatsapp", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                telefono: agent.telefono,
                nombre: agent.nombre,
                direccion: prod.direccion,
              }),
            }).catch(() => {});
          }
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
    const isRescheduling = !!prod.horarioConfirmado;
    try {
      let agenteEmail = "";
      let agenteName = prod.agenteNombre;
      let agenteTelefono = "";
      try {
        const agente = await getUser(prod.agenteId);
        if (agente) {
          agenteEmail = agente.email;
          agenteName = agente.nombre || prod.agenteNombre;
          agenteTelefono = agente.telefono || "";
        }
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

      // Delete old calendar event if rescheduling
      if (isRescheduling && prod.horarioConfirmado?.googleCalendarEventId) {
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
          console.warn("Could not delete old calendar event");
        }
      }

      let calendarEventId: string | null = null;
      try {
        const calRes = await fetch("/api/calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create",
            data: {
              fecha: scheduleDate,
              horario: scheduleTime,
              direccion: prod.direccion,
              agenteNombre: agenteName,
              agenteEmail,
              agenteTelefono,
              tipoPropiedad: prod.tipoPropiedad,
              metraje,
              servicios: serviciosList,
            },
          }),
        });
        const calData = await calRes.json();
        console.log("[Calendar response]", JSON.stringify(calData));
        if (calData.eventId) {
          calendarEventId = calData.eventId;
        } else {
          alert(`Zoho Calendar: ${JSON.stringify(calData)}`);
        }
      } catch (calErr) {
        console.error("Calendar fetch error:", calErr);
        alert(`Error al crear evento en Zoho: ${calErr}`);
      }

      // Send email to agent
      if (agenteEmail) {
        try {
          await fetch("/api/email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: isRescheduling ? "horario_reagendado" : "horario_confirmado",
              to: agenteEmail,
              data: isRescheduling
                ? {
                    nombre: agenteName,
                    direccion: prod.direccion,
                    fechaAnterior: prod.horarioConfirmado!.fecha,
                    horarioAnterior: prod.horarioConfirmado!.horario,
                    fechaNueva: scheduleDate,
                    horarioNuevo: scheduleTime,
                  }
                : {
                    nombre: agenteName,
                    direccion: prod.direccion,
                    fecha: scheduleDate,
                    horario: scheduleTime,
                    servicios: serviciosList,
                    agenteTelefono,
                  },
            }),
          });
        } catch {
          console.warn("Email not sent (not configured)");
        }
      }

      await updateProduction(prod.id, {
        horarioConfirmado: {
          fecha: scheduleDate,
          horario: scheduleTime,
          googleCalendarEventId: calendarEventId,
        },
      });
      setScheduleDate("");
      setScheduleTimeFrom(""); setScheduleTimeTo("");
      setReschedulingId(null);
      await loadData();
    } catch (err) {
      console.error("Error confirming schedule:", err);
    }
  }

  async function togglePagada(prod: Production) {
    try {
      await updateProduction(prod.id, { pagada: !prod.pagada });
      await loadData();
    } catch (err) {
      console.error("Error toggling pagada:", err);
    }
  }

  async function aplicarRecargo(prod: Production) {
    const monto = prod.precioFinal * 0.1;
    if (!confirm(`¿Aplicar cargo del 10% por cancelación/reagendado en el día? Monto: $${monto.toFixed(2)} USD`)) return;
    try {
      await updateProduction(prod.id, { recargoCancelacion: monto });
      await loadData();
    } catch (err) {
      console.error("Error aplicando recargo:", err);
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
    if (!confirm(`¿ELIMINAR permanentemente la producción en ${prod.direccion}? Esta acción no se puede deshacer.\n\nSe cancelará el evento de calendario y se notificará al agente.`)) return;
    try {
      // 1. Borrar evento de Zoho Calendar si existe
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

      // 2. Notificar al agente por email
      try {
        const agente = await getUser(prod.agenteId);
        if (agente?.email) {
          await fetch("/api/email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "produccion_cancelada",
              to: agente.email,
              data: {
                nombre: agente.nombre || agente.email,
                direccion: prod.direccion,
                fecha: prod.horarioConfirmado?.fecha,
                horario: prod.horarioConfirmado?.horario,
              },
            }),
          });
        }
      } catch {
        console.warn("Could not send cancellation email");
      }

      // 3. Eliminar de Firestore
      await deleteProduction(prod.id);
      await loadData();
    } catch (err) {
      console.error("Error deleting production:", err);
    }
  }

  async function handleEntregaUpload(prod: Production) {
    if (!uploadFiles.length) return;
    setUploadingId(prod.id);
    setUploadError(null);
    const archivosSubidos: ArchivoR2[] = [];
    try {
      for (const file of uploadFiles) {
        // 1. Pedir URL firmada al servidor
        const presignRes = await fetch("/api/r2/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ produccionId: prod.id, nombre: file.name, contentType: file.type || "application/octet-stream" }),
        });
        if (!presignRes.ok) throw new Error("Error generando URL de subida");
        const { url, key } = await presignRes.json();

        // 2. Subir directo a R2 con XMLHttpRequest para tener progreso
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setUploadProgress((prev) => ({ ...prev, [file.name]: Math.round((e.loaded / e.total) * 100) }));
            }
          };
          xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`Error subiendo ${file.name}: ${xhr.status}`)));
          xhr.onerror = () => reject(new Error(`Error de red subiendo ${file.name}`));
          xhr.open("PUT", url);
          xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
          xhr.send(file);
        });

        archivosSubidos.push({ nombre: file.name, key, contentType: file.type || "application/octet-stream", size: file.size });
      }

      // 3. Verificar en R2 (server-side con HeadObject)
      const confirmRes = await fetch("/api/r2/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archivos: archivosSubidos }),
      });
      if (!confirmRes.ok) {
        const body = await confirmRes.json().catch(() => ({}));
        throw new Error(body.error || "Error verificando archivos en R2");
      }
      const { archivos: archivosVerificados } = await confirmRes.json();

      // 4. Guardar en Firestore desde el cliente (usuario autenticado)
      await setEntregaActiva(prod.id, archivosVerificados);

      // Notificar al agente
      const agent = await getUser(prod.agenteId);
      if (agent) {
        sendEmail("archivos_listos", agent.email, { nombre: agent.nombre, direccion: prod.direccion });
      }

      setUploadFiles([]);
      setUploadProgress({});
      setUploadingId(null);
      await loadData();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Error desconocido");
      setUploadingId(null);
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
                      {prod.estado === "listo" && (
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${prod.pagada ? "bg-green-500/15 text-green-400 border-green-500/30" : "bg-red-500/15 text-red-400 border-red-500/30"}`}>
                          {prod.pagada ? "Pagada" : "Impaga"}
                        </span>
                      )}
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
                    <div className="bg-[#0D1117] rounded-lg px-4 py-3 border border-[#263040]">
                      <p className="text-xs text-[#7A96A8] capitalize font-medium mb-2">{prod.tipoPropiedad}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#7A96A8]">
                        {prod.superficie && <span><span className="text-[#E2ECF4] font-medium">{prod.superficie}m²</span> construidos</span>}
                        {prod.construida && <span><span className="text-[#E2ECF4] font-medium">{prod.construida}m²</span> construidos</span>}
                        {prod.descubierta !== undefined && prod.descubierta > 0 && <span><span className="text-[#E2ECF4] font-medium">{prod.descubierta}m²</span> semi+desc</span>}
                        {prod.amenidades > 0 && <span><span className="text-[#E2ECF4] font-medium">{prod.amenidades}</span> amenities</span>}
                        <span className="capitalize">
                          <span className="text-[#E2ECF4] font-medium">{prod.estadoPropiedad?.ocupacion}</span>
                          {prod.estadoPropiedad?.ocupacion === "ocupada" && prod.estadoPropiedad?.tipo && (
                            <span className="ml-1 text-amber-400">
                              ({prod.estadoPropiedad.tipo === "inquilino" ? "inquilino" : "dueño"})
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Services */}
                    <div>
                      <p className="text-xs text-[#7A96A8] uppercase tracking-wide mb-2">Servicios solicitados</p>
                      <div className="flex flex-wrap gap-2">
                        {(() => {
                          const chips = [
                            { label: prod.servicios?.soloFotos ? "Solo Fotos −25%" : prod.servicios?.videoAdicional ? "Fotos + Video + 2do Video" : "Fotos + Video", base: true },
                            prod.servicios?.plano2d ? { label: "Plano 2D" } : null,
                            prod.servicios?.tour360 ? { label: "Tour 360°" } : null,
                            prod.servicios?.drone ? { label: "Drone" } : null,
                            prod.servicios?.amoblamiento ? { label: `Amoblamiento (${prod.servicios.cantidadFotosAmobladas} fotos)` } : null,
                          ].filter(Boolean) as { label: string; base?: boolean }[];
                          return chips.map((c, i) => (
                            <span
                              key={i}
                              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium ${
                                c.base
                                  ? "bg-[#F2B968]/12 border-[#F2B968]/40 text-[#F2B968]"
                                  : "bg-[#161C26] border-[#263040] text-[#E2ECF4]"
                              }`}
                            >
                              {c.label}
                            </span>
                          ));
                        })()}
                      </div>
                    </div>

                    {/* Schedule — two side-by-side cards */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Left: Horarios sugeridos */}
                      <div className="bg-[#0D1C2E] border border-[#1E3A5A] rounded-lg p-3">
                        <p className="text-xs font-semibold text-[#7AB3D4] uppercase tracking-wide mb-2 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> Sugeridos por el agente
                        </p>
                        {prod.horariosSugeridos?.length > 0 ? (
                          <ul className="text-sm text-[#A8C8E0] space-y-1">
                            {prod.horariosSugeridos.map((h, i) => (
                              <li key={i} className="flex items-start gap-1">
                                <span className="text-[#5A8AAA] mt-0.5">•</span>
                                <span>{h}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-[#4A6070] italic">Sin horarios sugeridos</p>
                        )}
                      </div>

                      {/* Right: Confirmado / Formulario */}
                      {prod.horarioConfirmado && reschedulingId !== prod.id ? (
                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex flex-col justify-between">
                          <div>
                            <p className="text-xs font-semibold text-green-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" /> Horario confirmado
                            </p>
                            <p className="text-sm font-bold text-green-300 leading-snug">
                              {formatFechaConfirmada(prod.horarioConfirmado.fecha)}
                            </p>
                            <p className="text-sm text-green-400 mt-0.5">
                              a las {formatHorario(prod.horarioConfirmado.horario)}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setReschedulingId(prod.id);
                              setScheduleDate("");
                              setScheduleTimeFrom(""); setScheduleTimeTo("");
                            }}
                            className="mt-3 text-xs text-[#7A96A8] hover:text-amber-400 underline underline-offset-2 transition text-left"
                          >
                            Cambiar / Reagendar
                          </button>
                        </div>
                      ) : reschedulingId === prod.id || !prod.horarioConfirmado ? (
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                          <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {reschedulingId === prod.id ? "Reagendar" : "Confirmar horario"}
                          </p>
                          <div className="space-y-2">
                            <div>
                              <Label className="text-xs text-amber-400 mb-0.5 block">Fecha</Label>
                              <Input
                                type="date"
                                value={scheduleDate}
                                onChange={(e) => setScheduleDate(e.target.value)}
                                className="h-8 text-sm bg-[#0D1117] border-amber-500/30 text-[#E2ECF4]"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-amber-400 mb-0.5 block">Desde</Label>
                              <select
                                value={scheduleTimeFrom}
                                onChange={(e) => setScheduleTimeFrom(e.target.value)}
                                className="w-full h-8 text-sm bg-[#0D1117] border border-amber-500/30 rounded-md text-[#E2ECF4] px-2"
                              >
                                <option value="">-- hora --</option>
                                {TIME_OPTIONS.map((t) => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <Label className="text-xs text-amber-400 mb-0.5 block">Hasta</Label>
                              <select
                                value={scheduleTimeTo}
                                onChange={(e) => setScheduleTimeTo(e.target.value)}
                                className="w-full h-8 text-sm bg-[#0D1117] border border-amber-500/30 rounded-md text-[#E2ECF4] px-2"
                              >
                                <option value="">-- hora --</option>
                                {TIME_OPTIONS.filter((t) => t > scheduleTimeFrom).map((t) => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => confirmSchedule(prod)}
                                disabled={!scheduleDate || !scheduleTime}
                                className="flex-1 bg-amber-500 hover:bg-amber-600 text-[#0D1117] font-semibold h-8 text-xs"
                              >
                                {reschedulingId === prod.id ? "Reagendar" : "Confirmar"}
                              </Button>
                              {reschedulingId === prod.id && (
                                <button
                                  onClick={() => { setReschedulingId(null); setScheduleDate(""); setScheduleTimeFrom(""); setScheduleTimeTo(""); }}
                                  className="text-xs text-[#7A96A8] hover:text-[#E2ECF4] transition px-2"
                                >
                                  Cancelar
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {prod.observaciones && (
                      <div>
                        <p className="text-sm font-medium text-[#E2ECF4] mb-1">Observaciones:</p>
                        <p className="text-sm text-[#7A96A8] whitespace-pre-line">{prod.observaciones}</p>
                      </div>
                    )}

                    {/* Price breakdown */}
                    {(() => {
                      // Recompute package discount from services (backward compat for old productions)
                      const elegibles = [
                        true,
                        !prod.servicios?.soloFotos,
                        prod.servicios?.videoAdicional,
                        prod.servicios?.plano2d,
                        prod.servicios?.tour360,
                        prod.servicios?.drone,
                      ].filter(Boolean).length;
                      const withMinimo = Math.max(prod.subtotal ?? 0, 50);
                      const descuentoPaquete = prod.descuentoPaquete != null
                        ? prod.descuentoPaquete
                        : elegibles >= 4 ? withMinimo * 0.05 : 0;
                      const descuentoInmob = prod.descuentoAplicado ?? 0;
                      const totalMostrado = prod.precioFinal ?? 0;

                      return (
                        <div className="bg-[#0D1117] rounded-lg p-4 border border-[#263040] text-sm space-y-1.5">
                          <p className="text-xs text-[#7A96A8] uppercase tracking-wide mb-3">Desglose</p>

                          <div className="flex justify-between">
                            <span className="text-[#7A96A8]">
                              {prod.servicios?.soloFotos ? "Solo Fotos (−25%)" : prod.servicios?.videoAdicional ? "Fotos + Video + 2do Video (+25%)" : "Fotos + Video"}
                            </span>
                            <span className="font-mono text-[#E2ECF4]">${prod.precioBase?.toFixed(2)}</span>
                          </div>

                          {prod.desglose?.map((item, i) => (
                            <div key={i} className="flex justify-between">
                              <span className="text-[#7A96A8]">
                                {item.concepto}
                                <span className="text-xs opacity-50 ml-1">({item.calculo})</span>
                              </span>
                              <span className="font-mono text-[#E2ECF4]">${item.monto?.toFixed(2)}</span>
                            </div>
                          ))}

                          <hr className="border-[#263040] my-1" />

                          <div className="flex justify-between text-[#7A96A8]">
                            <span>Subtotal</span>
                            <span className="font-mono text-[#E2ECF4]">${(prod.subtotal ?? 0).toFixed(2)}</span>
                          </div>

                          {descuentoInmob > 0 ? (
                            <div className="flex justify-between text-green-400">
                              <span>Descuento inmobiliaria</span>
                              <span className="font-mono">−${descuentoInmob.toFixed(2)}</span>
                            </div>
                          ) : (
                            <div className="flex justify-between text-[#263040]">
                              <span>Descuento inmobiliaria</span>
                              <span className="font-mono">—</span>
                            </div>
                          )}

                          {descuentoPaquete > 0 ? (
                            <div className="flex justify-between text-green-400">
                              <span>Descuento paquete 4+ servicios (5%)</span>
                              <span className="font-mono">−${descuentoPaquete.toFixed(2)}</span>
                            </div>
                          ) : (
                            <div className="flex justify-between text-[#263040]">
                              <span>Descuento paquete 4+ servicios</span>
                              <span className="font-mono">—</span>
                            </div>
                          )}

                          <hr className="border-[#263040] my-1" />

                          <div className="flex justify-between font-bold text-base">
                            <span className="text-[#E2ECF4]">TOTAL</span>
                            <span className="text-[#F2B968] font-mono">${totalMostrado.toFixed(2)} USD</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Ratio de inversión — 4 cuadrantes */}
                    {prod.valorEstimado && prod.valorEstimado > 0 && (
                      <div className="bg-[#F2B968]/8 border border-[#F2B968]/25 rounded-lg p-4">
                        <p className="text-xs text-[#F2B968] font-semibold uppercase tracking-wide mb-3">Inversión vs. comisión de venta</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-[#0D1117]/40 rounded-lg px-3 py-2.5">
                            <p className="text-xs text-[#7A96A8] mb-1">Valor inmueble</p>
                            <p className="text-base font-bold text-[#E2ECF4]">
                              ${prod.valorEstimado.toLocaleString("es-AR")} USD
                            </p>
                          </div>
                          <div className="bg-[#0D1117]/40 rounded-lg px-3 py-2.5">
                            <p className="text-xs text-[#7A96A8] mb-1">Comisión est. (5%)</p>
                            <p className="text-base font-bold text-[#E2ECF4]">
                              ${(prod.valorEstimado * 0.05).toLocaleString("es-AR", { maximumFractionDigits: 0 })} USD
                            </p>
                          </div>
                          <div className="bg-[#0D1117]/40 rounded-lg px-3 py-2.5">
                            <p className="text-xs text-[#7A96A8] mb-1">Esta producción</p>
                            <p className="text-base font-bold text-[#E2ECF4]">${prod.precioFinal?.toFixed(2)} USD</p>
                          </div>
                          <div className="bg-[#F2B968]/10 rounded-lg px-3 py-2.5">
                            <p className="text-xs text-[#7A96A8] mb-1">% de la comisión</p>
                            <p className="text-base font-bold text-[#F2B968]">
                              {((prod.precioFinal / (prod.valorEstimado * 0.05)) * 100).toFixed(2)}%
                            </p>
                          </div>
                        </div>
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

                    {/* Entrega R2 */}
                    <div className="border border-[#263040] rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-[#E2ECF4] flex items-center gap-1.5">
                          <FileArchive className="w-4 h-4 text-[#F2B968]" /> Entrega de archivos
                        </Label>
                        {/* Badge de estado */}
                        {!prod.entregaStatus || prod.entregaStatus === "sin_entrega" ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[#263040] text-[#7A96A8]">Sin entrega</span>
                        ) : prod.entregaStatus === "activa" ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">
                            Activa · vence {prod.entregaExpiresAt ? new Date(
                              (prod.entregaExpiresAt as unknown as { toDate?: () => Date }).toDate
                                ? (prod.entregaExpiresAt as unknown as { toDate: () => Date }).toDate()
                                : prod.entregaExpiresAt
                            ).toLocaleDateString("es-AR") : "—"}
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[#263040] text-[#7A96A8]">Archivada</span>
                        )}
                      </div>

                      {/* Archivos actuales */}
                      {prod.entregaStatus === "activa" && (prod.entregaArchivos?.length ?? 0) > 0 && (
                        <div className="space-y-1">
                          {(prod.entregaArchivos ?? []).map((a, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-[#7A96A8]">
                              <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
                              <span className="truncate">{a.nombre}</span>
                              <span className="shrink-0 opacity-60">{(a.size / 1024 / 1024).toFixed(1)} MB</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Selector de archivos */}
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e) => setUploadFiles(Array.from(e.target.files ?? []))}
                        />
                        {uploadFiles.length === 0 ? (
                          <button
                            onClick={() => { setUploadError(null); fileInputRef.current?.click(); }}
                            className="w-full border border-dashed border-[#263040] hover:border-[#F2B968]/50 rounded-lg py-3 text-sm text-[#7A96A8] hover:text-[#F2B968] transition flex items-center justify-center gap-2"
                          >
                            <Upload className="w-4 h-4" />
                            {prod.entregaStatus === "activa" ? "Reemplazar archivos" : "Seleccionar archivos"}
                          </button>
                        ) : (
                          <div className="space-y-2">
                            {uploadFiles.map((f) => (
                              <div key={f.name} className="flex items-center gap-2 text-xs">
                                <span className="flex-1 truncate text-[#E2ECF4]">{f.name}</span>
                                <span className="text-[#7A96A8] shrink-0">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                                {uploadProgress[f.name] !== undefined && (
                                  <span className="text-[#F2B968] shrink-0 tabular-nums">{uploadProgress[f.name]}%</span>
                                )}
                                {uploadingId !== prod.id && (
                                  <button onClick={() => setUploadFiles((prev) => prev.filter((x) => x.name !== f.name))}>
                                    <X className="w-3.5 h-3.5 text-[#7A96A8] hover:text-red-400" />
                                  </button>
                                )}
                              </div>
                            ))}
                            <div className="flex gap-2 pt-1">
                              <Button
                                onClick={() => handleEntregaUpload(prod)}
                                disabled={uploadingId === prod.id}
                                size="sm"
                                className="bg-[#F2B968] hover:bg-[#d9a050] text-[#0D1117] font-semibold"
                              >
                                {uploadingId === prod.id
                                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Subiendo...</>
                                  : <><Upload className="w-3.5 h-3.5 mr-1" /> Subir y entregar</>
                                }
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={uploadingId === prod.id}
                                onClick={() => { setUploadFiles([]); setUploadProgress({}); setUploadError(null); }}
                                className="text-[#7A96A8]"
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        )}
                        {uploadError && <p className="text-xs text-red-400 mt-2">{uploadError}</p>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {prod.estado === "listo" && (
                        <Button
                          variant="outline"
                          onClick={() => togglePagada(prod)}
                          className={`border font-semibold ${prod.pagada ? "border-red-500/40 text-red-400 hover:bg-red-500/10" : "border-green-500/40 text-green-400 hover:bg-green-500/10"}`}
                        >
                          {prod.pagada ? "Marcar como impaga" : "Marcar como pagada"}
                        </Button>
                      )}
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
                      {!prod.recargoCancelacion ? (
                        <Button
                          variant="outline"
                          onClick={() => aplicarRecargo(prod)}
                          className="border-orange-500/40 text-orange-400 hover:bg-orange-500/10 text-xs"
                        >
                          Cobrar 10% cancelación
                        </Button>
                      ) : (
                        <span className="text-xs text-orange-400 border border-orange-500/30 rounded-md px-3 py-1.5 font-medium">
                          Recargo 10%: ${prod.recargoCancelacion.toFixed(2)} USD
                        </span>
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
