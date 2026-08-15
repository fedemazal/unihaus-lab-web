"use client";

import { useEffect, useState } from "react";
import {
  getInmobiliarias,
  createInmobiliaria,
  updateInmobiliaria,
} from "@/lib/firebase/firestore";
import type { Inmobiliaria } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Loader2 } from "lucide-react";

export default function InmobiliariasPage() {
  const [inmobiliarias, setInmobiliarias] = useState<Inmobiliaria[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Inmobiliaria | null>(null);
  const [formData, setFormData] = useState({
    nombre: "",
    descuento: 0,
    beneficios: "",
    activa: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getInmobiliarias();
      setInmobiliarias(data);
    } catch (err) {
      console.error("Error loading inmobiliarias:", err);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setFormData({ nombre: "", descuento: 0, beneficios: "", activa: true });
    setShowForm(true);
  }

  function openEdit(inmob: Inmobiliaria) {
    setEditing(inmob);
    setFormData({
      nombre: inmob.nombre,
      descuento: inmob.descuento,
      beneficios: inmob.beneficios,
      activa: inmob.activa,
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!formData.nombre) return;
    setSaving(true);
    try {
      if (editing) {
        await updateInmobiliaria(editing.id, formData);
      } else {
        await createInmobiliaria(formData);
      }
      setShowForm(false);
      await loadData();
    } catch (err) {
      console.error("Error saving:", err);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(inmob: Inmobiliaria) {
    try {
      await updateInmobiliaria(inmob.id, { activa: !inmob.activa });
      await loadData();
    } catch (err) {
      console.error("Error toggling:", err);
    }
  }

  async function toggleCuentaCentral(inmob: Inmobiliaria) {
    const next = !inmob.cuentaCentralActiva;
    const msg = next
      ? `¿Activar cuenta central para ${inmob.nombre}? Sus agentes podrán derivar pagos a la oficina.`
      : `¿Desactivar cuenta central de ${inmob.nombre}?`;
    if (!confirm(msg)) return;
    try {
      await updateInmobiliaria(inmob.id, { cuentaCentralActiva: next });
      await loadData();
    } catch (err) {
      console.error("Error toggling cuenta central:", err);
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
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-[#E2ECF4]">Gestión de Inmobiliarias</h1>
        <Button onClick={openCreate} className="bg-[#F2B968] hover:bg-[#d9a050] text-[#0D1117] font-semibold">
          <Plus className="w-4 h-4 mr-2" />
          Nueva inmobiliaria
        </Button>
      </div>

      {/* List */}
      {inmobiliarias.length === 0 ? (
        <div className="text-center py-12 bg-[#161C26] rounded-xl border border-[#263040]">
          <p className="text-[#7A96A8] mb-4">No hay inmobiliarias creadas</p>
          <Button onClick={openCreate} className="bg-[#F2B968] hover:bg-[#d9a050] text-[#0D1117] font-semibold">
            Crear primera inmobiliaria
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {inmobiliarias.map((inmob) => (
            <div key={inmob.id} className="bg-[#161C26] rounded-xl border border-[#263040] p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-semibold text-[#E2ECF4]">{inmob.nombre}</p>
                    <Badge className={inmob.activa
                      ? "bg-green-500/15 text-green-300 border border-green-500/30"
                      : "bg-[#1E2A38] text-[#7A96A8] border border-[#263040]"
                    }>
                      {inmob.activa ? "Activa" : "Inactiva"}
                    </Badge>
                    {inmob.cuentaCentralActiva && (
                      <Badge className="bg-purple-500/15 text-purple-300 border border-purple-500/30 text-xs">
                        Cuenta central activa
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-[#7A96A8]">
                    Descuento: <strong className="text-[#E2ECF4]">{inmob.descuento}%</strong>
                  </p>
                  {inmob.beneficios && (
                    <p className="text-sm text-[#7A96A8] mt-1 whitespace-pre-line">{inmob.beneficios}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(inmob)}
                    className="border-[#263040] text-[#E2ECF4] hover:bg-[#1E2A38]"
                  >
                    <Pencil className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActive(inmob)}
                    className="border-[#263040] text-[#E2ECF4] hover:bg-[#1E2A38]"
                  >
                    {inmob.activa ? "Desactivar" : "Activar"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleCuentaCentral(inmob)}
                    className={inmob.cuentaCentralActiva
                      ? "border-purple-500/40 text-purple-400 hover:bg-purple-500/10 text-xs"
                      : "border-[#263040] text-[#7A96A8] hover:bg-[#1E2A38] text-xs"}
                  >
                    {inmob.cuentaCentralActiva ? "Desactivar cta. central" : "Activar cta. central"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowForm(false)}>
          <div className="bg-[#161C26] border border-[#263040] rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-[#E2ECF4] mb-4">
              {editing ? "Editar inmobiliaria" : "Nueva inmobiliaria"}
            </h2>

            <div className="space-y-4">
              <div>
                <Label className="text-[#E2ECF4]">Nombre</Label>
                <Input
                  value={formData.nombre}
                  onChange={(e) => setFormData((p) => ({ ...p, nombre: e.target.value }))}
                  placeholder="REMAX Palermo"
                  className="mt-1 bg-[#0D1117] border-[#263040] text-[#E2ECF4] placeholder:text-[#7A96A8]"
                />
              </div>
              <div>
                <Label className="text-[#E2ECF4]">Descuento (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.descuento || ""}
                  onChange={(e) => setFormData((p) => ({ ...p, descuento: Number(e.target.value) }))}
                  placeholder="15"
                  className="mt-1 bg-[#0D1117] border-[#263040] text-[#E2ECF4] placeholder:text-[#7A96A8] w-32"
                />
              </div>
              <div>
                <Label className="text-[#E2ECF4]">Beneficios</Label>
                <textarea
                  value={formData.beneficios}
                  onChange={(e) => setFormData((p) => ({ ...p, beneficios: e.target.value }))}
                  placeholder={"• Video adicional gratis en propiedades +150m²\n• Prioridad en agenda"}
                  rows={4}
                  className="mt-1 w-full rounded-md border border-[#263040] bg-[#0D1117] px-3 py-2 text-sm text-[#E2ECF4] placeholder:text-[#7A96A8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B968] resize-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activa"
                  checked={formData.activa}
                  onChange={(e) => setFormData((p) => ({ ...p, activa: e.target.checked }))}
                  className="rounded border-[#263040]"
                />
                <Label htmlFor="activa" className="text-[#E2ECF4]">Activa</Label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                className="border-[#263040] text-[#E2ECF4] hover:bg-[#1E2A38]"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={!formData.nombre || saving}
                className="bg-[#F2B968] hover:bg-[#d9a050] text-[#0D1117] font-semibold"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? "Guardar" : "Crear"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
