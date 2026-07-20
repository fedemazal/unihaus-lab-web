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

  // Form state
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-[#C07856]" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-[#2C2C2C]">Gestión de Inmobiliarias</h1>
        <Button onClick={openCreate} className="bg-[#C07856] hover:bg-[#a8654a]">
          <Plus className="w-4 h-4 mr-2" />
          Nueva inmobiliaria
        </Button>
      </div>

      {/* List */}
      {inmobiliarias.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-[#5A5A5A] mb-4">No hay inmobiliarias creadas</p>
          <Button onClick={openCreate} className="bg-[#C07856] hover:bg-[#a8654a]">
            Crear primera inmobiliaria
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {inmobiliarias.map((inmob) => (
            <div key={inmob.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-[#2C2C2C]">{inmob.nombre}</p>
                    <Badge className={inmob.activa
                      ? "bg-green-100 text-green-800 border border-green-200"
                      : "bg-gray-100 text-gray-600 border border-gray-200"
                    }>
                      {inmob.activa ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>
                  <p className="text-sm text-[#5A5A5A]">
                    Descuento: <strong>{inmob.descuento}%</strong>
                  </p>
                  {inmob.beneficios && (
                    <p className="text-sm text-[#5A5A5A] mt-1 whitespace-pre-line">{inmob.beneficios}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => openEdit(inmob)} className="border-gray-200">
                    <Pencil className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActive(inmob)}
                    className="border-gray-200"
                  >
                    {inmob.activa ? "Desactivar" : "Activar"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-[#2C2C2C] mb-4">
              {editing ? "Editar inmobiliaria" : "Nueva inmobiliaria"}
            </h2>

            <div className="space-y-4">
              <div>
                <Label className="text-[#2C2C2C]">Nombre</Label>
                <Input
                  value={formData.nombre}
                  onChange={(e) => setFormData((p) => ({ ...p, nombre: e.target.value }))}
                  placeholder="REMAX Palermo"
                  className="mt-1 bg-white border-gray-200"
                />
              </div>
              <div>
                <Label className="text-[#2C2C2C]">Descuento (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.descuento || ""}
                  onChange={(e) => setFormData((p) => ({ ...p, descuento: Number(e.target.value) }))}
                  placeholder="15"
                  className="mt-1 bg-white border-gray-200 w-32"
                />
              </div>
              <div>
                <Label className="text-[#2C2C2C]">Beneficios</Label>
                <textarea
                  value={formData.beneficios}
                  onChange={(e) => setFormData((p) => ({ ...p, beneficios: e.target.value }))}
                  placeholder={"• Video adicional gratis en propiedades +150m²\n• Prioridad en agenda"}
                  rows={4}
                  className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C07856] resize-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activa"
                  checked={formData.activa}
                  onChange={(e) => setFormData((p) => ({ ...p, activa: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="activa" className="text-[#2C2C2C]">Activa</Label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowForm(false)} className="border-gray-200">
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={!formData.nombre || saving}
                className="bg-[#C07856] hover:bg-[#a8654a]"
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
