"use client";

import { useEffect, useState } from "react";
import { getCodigos, createCodigo, updateCodigo, deleteCodigo } from "@/lib/firebase/firestore";
import type { CodigoDescuento } from "@/types";
import { Loader2, Plus, Trash2, ToggleLeft, ToggleRight, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CodigosPage() {
  const [codigos, setCodigos] = useState<CodigoDescuento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    codigo: "",
    porcentaje: "",
    cantidadTotal: "",
    descripcion: "",
  });

  async function load() {
    setLoading(true);
    setCodigos(await getCodigos());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!form.codigo || !form.porcentaje || !form.cantidadTotal) return;
    setSaving(true);
    await createCodigo({
      codigo: form.codigo.toUpperCase().trim(),
      porcentaje: Number(form.porcentaje),
      cantidadTotal: Number(form.cantidadTotal),
      descripcion: form.descripcion,
      activo: true,
    });
    setForm({ codigo: "", porcentaje: "", cantidadTotal: "", descripcion: "" });
    setShowForm(false);
    await load();
    setSaving(false);
  }

  async function toggleActivo(c: CodigoDescuento) {
    await updateCodigo(c.id, { activo: !c.activo });
    setCodigos((prev) => prev.map((x) => x.id === c.id ? { ...x, activo: !x.activo } : x));
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este código?")) return;
    await deleteCodigo(id);
    setCodigos((prev) => prev.filter((x) => x.id !== id));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-[#F2B968]" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#E2ECF4]">Códigos de Descuento</h1>
          <p className="text-sm text-[#7A96A8] mt-1">Descuentos puntuales sin tocar el esquema de beneficios</p>
        </div>
        <Button
          onClick={() => setShowForm((v) => !v)}
          className="bg-[#F2B968] hover:bg-[#E5A94E] text-[#0D1117] text-sm font-semibold gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Nuevo código
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-[#161C26] border border-[#263040] rounded-xl p-5 mb-6 space-y-4">
          <h2 className="font-semibold text-[#E2ECF4] text-sm">Nuevo código de descuento</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[#7A96A8] text-xs mb-1 block">Código</Label>
              <Input
                placeholder="Ej: PROMO20"
                value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
                className="bg-[#0D1117] border-[#263040] text-[#E2ECF4] uppercase"
              />
            </div>
            <div>
              <Label className="text-[#7A96A8] text-xs mb-1 block">Descuento (%)</Label>
              <Input
                type="number"
                min="1"
                max="100"
                placeholder="Ej: 20"
                value={form.porcentaje}
                onChange={(e) => setForm({ ...form, porcentaje: e.target.value })}
                className="bg-[#0D1117] border-[#263040] text-[#E2ECF4]"
              />
            </div>
            <div>
              <Label className="text-[#7A96A8] text-xs mb-1 block">Cantidad de usos disponibles</Label>
              <Input
                type="number"
                min="1"
                placeholder="Ej: 10"
                value={form.cantidadTotal}
                onChange={(e) => setForm({ ...form, cantidadTotal: e.target.value })}
                className="bg-[#0D1117] border-[#263040] text-[#E2ECF4]"
              />
            </div>
            <div>
              <Label className="text-[#7A96A8] text-xs mb-1 block">Descripción (opcional)</Label>
              <Input
                placeholder="Ej: Lanzamiento julio"
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                className="bg-[#0D1117] border-[#263040] text-[#E2ECF4]"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button
              onClick={handleCreate}
              disabled={saving || !form.codigo || !form.porcentaje || !form.cantidadTotal}
              className="bg-[#F2B968] hover:bg-[#E5A94E] text-[#0D1117] font-semibold text-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear código"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowForm(false)}
              className="text-[#7A96A8] hover:text-[#E2ECF4] text-sm"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      {codigos.length === 0 ? (
        <div className="text-center py-16 text-[#7A96A8]">
          <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay códigos creados todavía</p>
        </div>
      ) : (
        <div className="space-y-3">
          {codigos.map((c) => {
            const agotado = c.cantidadUsada >= c.cantidadTotal;
            const pct = Math.round((c.cantidadUsada / c.cantidadTotal) * 100);
            return (
              <div
                key={c.id}
                className={`bg-[#161C26] border rounded-xl p-4 ${
                  !c.activo || agotado ? "border-[#263040] opacity-60" : "border-[#263040]"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono font-bold text-[#F2B968] text-lg tracking-wider">{c.codigo}</span>
                      <span className="text-xs font-semibold text-[#E2ECF4] bg-[#F2B968]/10 border border-[#F2B968]/20 px-2 py-0.5 rounded-full">
                        {c.porcentaje}% OFF
                      </span>
                      {agotado && (
                        <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">Agotado</span>
                      )}
                      {!c.activo && !agotado && (
                        <span className="text-xs text-[#7A96A8] bg-[#263040] px-2 py-0.5 rounded-full">Inactivo</span>
                      )}
                    </div>
                    {c.descripcion && (
                      <p className="text-xs text-[#7A96A8] mb-2">{c.descripcion}</p>
                    )}
                    {/* Usage bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-[#263040] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${agotado ? "bg-red-500" : "bg-[#F2B968]"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-[#7A96A8] tabular-nums shrink-0">
                        {c.cantidadUsada}/{c.cantidadTotal} usos
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleActivo(c)}
                      className="text-[#7A96A8] hover:text-[#F2B968] transition"
                      title={c.activo ? "Desactivar" : "Activar"}
                    >
                      {c.activo
                        ? <ToggleRight className="w-5 h-5 text-green-400" />
                        : <ToggleLeft className="w-5 h-5" />
                      }
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-[#7A96A8] hover:text-red-400 transition"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
