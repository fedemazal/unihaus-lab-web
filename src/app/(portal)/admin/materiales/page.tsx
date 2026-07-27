"use client";

import { useEffect, useState } from "react";
import {
  getMateriales,
  createMaterial,
  updateMaterial,
  deleteMaterial,
} from "@/lib/firebase/firestore";
import type { MaterialPreparacion } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Loader2, FileText, Image, Link as LinkIcon, GripVertical } from "lucide-react";

const TIPO_ICONS = {
  pdf: FileText,
  imagen: Image,
  link: LinkIcon,
};

const TIPO_LABELS = {
  pdf: "PDF",
  imagen: "Imagen",
  link: "Link externo",
};

export default function MaterialesPage() {
  const [materiales, setMateriales] = useState<MaterialPreparacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MaterialPreparacion | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    titulo: "",
    descripcion: "",
    url: "",
    tipo: "pdf" as MaterialPreparacion["tipo"],
    orden: 0,
    activo: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getMateriales();
      setMateriales(data);
    } catch (err) {
      console.error("Error loading materiales:", err);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setFormData({
      titulo: "",
      descripcion: "",
      url: "",
      tipo: "pdf",
      orden: materiales.length + 1,
      activo: true,
    });
    setShowForm(true);
  }

  function openEdit(mat: MaterialPreparacion) {
    setEditing(mat);
    setFormData({
      titulo: mat.titulo,
      descripcion: mat.descripcion,
      url: mat.url,
      tipo: mat.tipo,
      orden: mat.orden,
      activo: mat.activo,
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!formData.titulo || !formData.url) return;
    setSaving(true);
    try {
      if (editing) {
        await updateMaterial(editing.id, formData);
      } else {
        await createMaterial(formData);
      }
      setShowForm(false);
      await loadData();
    } catch (err) {
      console.error("Error saving material:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(mat: MaterialPreparacion) {
    if (!confirm(`¿Eliminar "${mat.titulo}"?`)) return;
    try {
      await deleteMaterial(mat.id);
      await loadData();
    } catch (err) {
      console.error("Error deleting material:", err);
    }
  }

  async function toggleActive(mat: MaterialPreparacion) {
    try {
      await updateMaterial(mat.id, { activo: !mat.activo });
      await loadData();
    } catch (err) {
      console.error("Error toggling material:", err);
    }
  }

  const publicUrl = typeof window !== "undefined"
    ? `${window.location.origin}/preparacion-cliente`
    : "/preparacion-cliente";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-[#F2B968]" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#E2ECF4]">Materiales de Preparación</h1>
          <p className="text-sm text-[#7A96A8] mt-1">
            PDFs, imágenes y links que los agentes pueden compartir con sus clientes
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-[#F2B968] hover:bg-[#d9a050] text-[#0D1117] font-semibold shrink-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Agregar material
        </Button>
      </div>

      {/* Public link */}
      <div className="bg-[#161C26] border border-[#263040] rounded-xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#E2ECF4]">Link público del checklist</p>
          <p className="text-sm text-[#7A96A8] truncate">{publicUrl}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="border-[#263040] text-[#E2ECF4] hover:bg-[#1E2A38] shrink-0"
          onClick={() => navigator.clipboard.writeText(publicUrl)}
        >
          Copiar link
        </Button>
      </div>

      {/* List */}
      {materiales.length === 0 ? (
        <div className="text-center py-12 bg-[#161C26] rounded-xl border border-[#263040]">
          <p className="text-[#7A96A8] mb-4">No hay materiales cargados todavía</p>
          <Button
            onClick={openCreate}
            className="bg-[#F2B968] hover:bg-[#d9a050] text-[#0D1117] font-semibold"
          >
            Agregar primer material
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {materiales.map((mat) => {
            const Icon = TIPO_ICONS[mat.tipo];
            return (
              <div
                key={mat.id}
                className={`bg-[#161C26] border rounded-xl p-5 transition ${
                  mat.activo ? "border-[#263040]" : "border-[#263040] opacity-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <GripVertical className="w-4 h-4 text-[#7A96A8] mt-0.5 shrink-0" />
                    <div className="w-9 h-9 rounded-lg bg-[#F2B968]/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-[#F2B968]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-[#E2ECF4]">{mat.titulo}</p>
                        <span className="text-xs text-[#7A96A8] border border-[#263040] px-1.5 py-0.5 rounded">
                          {TIPO_LABELS[mat.tipo]}
                        </span>
                        {!mat.activo && (
                          <span className="text-xs text-[#7A96A8]">inactivo</span>
                        )}
                      </div>
                      {mat.descripcion && (
                        <p className="text-sm text-[#7A96A8] mt-0.5">{mat.descripcion}</p>
                      )}
                      <a
                        href={mat.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#F2B968] hover:underline mt-1 block truncate"
                      >
                        {mat.url}
                      </a>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(mat)}
                      className="border-[#263040] text-[#E2ECF4] hover:bg-[#1E2A38]"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(mat)}
                      className="border-[#263040] text-[#7A96A8] hover:bg-[#1E2A38]"
                    >
                      {mat.activo ? "Ocultar" : "Mostrar"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(mat)}
                      className="border-red-500/40 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowForm(false)}
        >
          <div
            className="bg-[#161C26] border border-[#263040] rounded-xl p-6 w-full max-w-lg mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-[#E2ECF4] mb-5">
              {editing ? "Editar material" : "Nuevo material"}
            </h2>

            <div className="space-y-4">
              <div>
                <Label className="text-[#E2ECF4]">Tipo</Label>
                <div className="flex gap-2 mt-1">
                  {(["pdf", "imagen", "link"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setFormData((p) => ({ ...p, tipo: t }))}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition ${
                        formData.tipo === t
                          ? "border-[#F2B968] bg-[#F2B968]/10 text-[#F2B968]"
                          : "border-[#263040] text-[#7A96A8] hover:border-[#3A4A60] hover:text-[#E2ECF4]"
                      }`}
                    >
                      {TIPO_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-[#E2ECF4]">Título</Label>
                <Input
                  value={formData.titulo}
                  onChange={(e) => setFormData((p) => ({ ...p, titulo: e.target.value }))}
                  placeholder="Guía de preparación fotográfica"
                  className="mt-1 bg-[#0D1117] border-[#263040] text-[#E2ECF4] placeholder:text-[#7A96A8]"
                />
              </div>

              <div>
                <Label className="text-[#E2ECF4]">Descripción <span className="text-[#7A96A8] font-normal">— opcional</span></Label>
                <Input
                  value={formData.descripcion}
                  onChange={(e) => setFormData((p) => ({ ...p, descripcion: e.target.value }))}
                  placeholder="Instrucciones paso a paso para preparar el inmueble"
                  className="mt-1 bg-[#0D1117] border-[#263040] text-[#E2ECF4] placeholder:text-[#7A96A8]"
                />
              </div>

              <div>
                <Label className="text-[#E2ECF4]">
                  {formData.tipo === "pdf" ? "URL del PDF" : formData.tipo === "imagen" ? "URL de la imagen" : "URL del link"}
                </Label>
                <Input
                  value={formData.url}
                  onChange={(e) => setFormData((p) => ({ ...p, url: e.target.value }))}
                  placeholder="https://drive.google.com/..."
                  className="mt-1 bg-[#0D1117] border-[#263040] text-[#E2ECF4] placeholder:text-[#7A96A8]"
                />
                <p className="text-xs text-[#7A96A8] mt-1">
                  Pegá el link público de Google Drive, Dropbox, o cualquier servicio de almacenamiento
                </p>
              </div>

              <div>
                <Label className="text-[#E2ECF4]">Orden</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.orden || ""}
                  onChange={(e) => setFormData((p) => ({ ...p, orden: Number(e.target.value) }))}
                  className="mt-1 bg-[#0D1117] border-[#263040] text-[#E2ECF4] w-24"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activo"
                  checked={formData.activo}
                  onChange={(e) => setFormData((p) => ({ ...p, activo: e.target.checked }))}
                  className="rounded border-[#263040]"
                />
                <Label htmlFor="activo" className="text-[#E2ECF4]">Visible para agentes</Label>
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
                disabled={!formData.titulo || !formData.url || saving}
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
