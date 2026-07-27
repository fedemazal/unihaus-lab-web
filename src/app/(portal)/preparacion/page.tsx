"use client";

import { useEffect, useState } from "react";
import { getMateriales } from "@/lib/firebase/firestore";
import type { MaterialPreparacion } from "@/types";
import { CheckCircle, Circle, Share2, FileText, Image, ExternalLink, Download, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CheckItem {
  id: string;
  label: string;
  tip?: string;
}

interface Section {
  title: string;
  items: CheckItem[];
}

const sections: Section[] = [
  {
    title: "General",
    items: [
      { id: "g1", label: "Realizar una limpieza general de toda la propiedad" },
      { id: "g2", label: "Abrir cortinas y persianas para maximizar la luz natural" },
      { id: "g3", label: "Encender todas las luces interiores" },
      { id: "g4", label: "Apagar televisores y pantallas" },
      { id: "g5", label: "Guardar objetos personales (fotos familiares, medicamentos, etc.)" },
      { id: "g6", label: "Retirar elementos de limpieza a la vista" },
    ],
  },
  {
    title: "Living / Comedor",
    items: [
      { id: "l1", label: "Ordenar almohadones y mantas decorativas" },
      { id: "l2", label: "Despejar la mesa (dejar máximo un centro de mesa)" },
      { id: "l3", label: "Guardar controles remotos y cables sueltos" },
      { id: "l4", label: "Si hay chimenea/hogar, asegurar que esté limpio" },
    ],
  },
  {
    title: "Cocina",
    items: [
      { id: "k1", label: "Limpiar mesadas y dejar despejadas" },
      { id: "k2", label: "Guardar platos, vasos y utensilios" },
      { id: "k3", label: "Ocultar productos de limpieza" },
      { id: "k4", label: "Retirar imanes y papeles de la heladera" },
      { id: "k5", label: "Vaciar el cesto de basura" },
    ],
  },
  {
    title: "Dormitorios",
    items: [
      { id: "d1", label: "Tender las camas prolijamente" },
      { id: "d2", label: "Ordenar las mesas de luz (máximo 1-2 objetos)" },
      { id: "d3", label: "Cerrar las puertas de los placards" },
      { id: "d4", label: "Guardar ropa y zapatos" },
    ],
  },
  {
    title: "Baños",
    items: [
      { id: "b1", label: "Limpiar espejos, grifería y superficies" },
      { id: "b2", label: "Guardar productos de higiene personal" },
      { id: "b3", label: "Colocar toallas limpias y ordenadas" },
      { id: "b4", label: "Bajar la tapa del inodoro" },
      { id: "b5", label: "Vaciar el cesto" },
    ],
  },
  {
    title: "Exterior / Balcón",
    items: [
      { id: "e1", label: "Barrer y limpiar pisos exteriores" },
      { id: "e2", label: "Ordenar muebles de exterior" },
      { id: "e3", label: "Retirar basura y elementos fuera de lugar" },
      { id: "e4", label: "Si hay pileta, asegurar agua limpia y bordes despejados" },
      { id: "e5", label: "Podar plantas si es necesario" },
    ],
  },
  {
    title: "Día de la sesión",
    items: [
      { id: "s1", label: "Estacionar los autos fuera de la vista de la entrada" },
      { id: "s2", label: "Asegurar que las mascotas estén en un lugar seguro", tip: "Idealmente fuera de la propiedad durante la sesión" },
      { id: "s3", label: "Verificar que todas las luces funcionen" },
      { id: "s4", label: "Último repaso de orden general" },
    ],
  },
];

export default function PreparacionPage() {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [materiales, setMateriales] = useState<MaterialPreparacion[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getMateriales()
      .then((data) => setMateriales(data.filter((m) => m.activo)))
      .catch(() => {});
  }, []);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleShare = () => {
    const url = `${window.location.origin}/preparacion-cliente`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);
  const checkedCount = checked.size;
  const progress = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-2">
        <h1 className="text-2xl font-bold text-[#E2ECF4]">Preparación de Propiedad</h1>
        <Button
          onClick={handleShare}
          variant="outline"
          size="sm"
          className="border-[#263040] text-[#E2ECF4] hover:bg-[#1E2A38] shrink-0"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-1 text-green-400" />
              <span className="text-green-400">Copiado</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4 mr-1" />
              Compartir con cliente
            </>
          )}
        </Button>
      </div>
      <p className="text-[#7A96A8] mb-6">
        Seguí esta guía para que tu propiedad luzca increíble en las fotos y videos. Podés compartir este checklist con tu cliente.
      </p>

      {/* Progress */}
      <div className="bg-[#161C26] border border-[#263040] rounded-xl p-4 mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[#E2ECF4]">Progreso</span>
          <span className="text-sm text-[#7A96A8]">{checkedCount} / {totalItems}</span>
        </div>
        <div className="w-full bg-[#1E2A38] rounded-full h-2">
          <div
            className="bg-[#F2B968] h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-5 mb-10">
        {sections.map((section) => {
          const sectionChecked = section.items.filter((i) => checked.has(i.id)).length;
          const allDone = sectionChecked === section.items.length;

          return (
            <div key={section.title} className="bg-[#161C26] border border-[#263040] rounded-xl overflow-hidden">
              <div className={`px-5 py-3 border-b border-[#263040] flex items-center justify-between ${allDone ? "bg-green-500/10" : ""}`}>
                <h2 className="font-semibold text-[#E2ECF4]">{section.title}</h2>
                <span className={`text-xs font-medium ${allDone ? "text-green-400" : "text-[#7A96A8]"}`}>
                  {sectionChecked}/{section.items.length}
                </span>
              </div>
              <div className="divide-y divide-[#1E2A38]">
                {section.items.map((item) => {
                  const isChecked = checked.has(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggle(item.id)}
                      className="w-full px-5 py-3 flex items-start gap-3 text-left hover:bg-[#1E2A38] transition"
                    >
                      {isChecked ? (
                        <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="w-5 h-5 text-[#263040] shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className={`text-sm ${isChecked ? "text-[#7A96A8] line-through" : "text-[#E2ECF4]"}`}>
                          {item.label}
                        </p>
                        {item.tip && (
                          <p className="text-xs text-[#7A96A8] mt-0.5">{item.tip}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Materials */}
      {materiales.length > 0 && (
        <div>
          <h2 className="font-semibold text-[#E2ECF4] mb-4">Materiales adicionales</h2>
          <div className="space-y-3">
            {materiales.map((mat) => (
              <a
                key={mat.id}
                href={mat.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 bg-[#161C26] border border-[#263040] rounded-xl p-4 hover:border-[#F2B968]/50 transition group"
              >
                <div className="w-10 h-10 rounded-lg bg-[#F2B968]/10 flex items-center justify-center shrink-0">
                  {mat.tipo === "pdf" && <FileText className="w-5 h-5 text-[#F2B968]" />}
                  {mat.tipo === "imagen" && <Image className="w-5 h-5 text-[#F2B968]" />}
                  {mat.tipo === "link" && <ExternalLink className="w-5 h-5 text-[#F2B968]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#E2ECF4] group-hover:text-[#F2B968] transition">{mat.titulo}</p>
                  {mat.descripcion && (
                    <p className="text-sm text-[#7A96A8] mt-0.5">{mat.descripcion}</p>
                  )}
                </div>
                <Download className="w-4 h-4 text-[#7A96A8] group-hover:text-[#F2B968] transition shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
