"use client";

import { useEffect, useState } from "react";
import { getMateriales } from "@/lib/firebase/firestore";
import type { MaterialPreparacion } from "@/types";
import { CheckCircle, Circle, FileText, Image, ExternalLink, Download } from "lucide-react";
import Link from "next/link";

const sections = [
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
      { id: "s2", label: "Asegurar que las mascotas estén en un lugar seguro" },
      { id: "s3", label: "Verificar que todas las luces funcionen" },
      { id: "s4", label: "Último repaso de orden general" },
    ],
  },
];

const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);

export default function PreparacionClientePage() {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [materiales, setMateriales] = useState<MaterialPreparacion[]>([]);

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

  const checkedCount = checked.size;
  const progress = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#F8F7F4]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">enviado por</p>
            <p className="font-semibold text-[#2C2C2C]">UniHaus Lab</p>
          </div>
          <Link href="/" className="text-sm text-[#C07856] hover:underline">
            unihaus.com.ar
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-[#2C2C2C] mb-1">
          Cómo preparar tu propiedad para la sesión fotográfica
        </h1>
        <p className="text-gray-500 mb-6">
          Seguí esta guía para que tu propiedad luzca increíble en las fotos y videos.
          Marcá cada ítem a medida que lo completás.
        </p>

        {/* Progress */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#2C2C2C]">Progreso</span>
            <span className="text-sm text-gray-500">{checkedCount} / {totalItems}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-[#C07856] h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          {checkedCount === totalItems && (
            <p className="text-sm text-green-600 font-medium mt-2">¡Todo listo para la sesión!</p>
          )}
        </div>

        {/* Checklist */}
        <div className="space-y-5 mb-10">
          {sections.map((section) => {
            const sectionChecked = section.items.filter((i) => checked.has(i.id)).length;
            const allDone = sectionChecked === section.items.length;

            return (
              <div key={section.title} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className={`px-5 py-3 border-b border-gray-100 flex items-center justify-between ${allDone ? "bg-green-50" : ""}`}>
                  <h2 className="font-semibold text-[#2C2C2C]">{section.title}</h2>
                  <span className={`text-xs font-medium ${allDone ? "text-green-600" : "text-gray-400"}`}>
                    {sectionChecked}/{section.items.length}
                  </span>
                </div>
                <div className="divide-y divide-gray-50">
                  {section.items.map((item) => {
                    const isChecked = checked.has(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggle(item.id)}
                        className="w-full px-5 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition"
                      >
                        {isChecked ? (
                          <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-300 shrink-0" />
                        )}
                        <p className={`text-sm ${isChecked ? "text-gray-400 line-through" : "text-[#2C2C2C]"}`}>
                          {item.label}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Materials from admin */}
        {materiales.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-[#2C2C2C] mb-4">Materiales adicionales</h2>
            <div className="space-y-3">
              {materiales.map((mat) => (
                <a
                  key={mat.id}
                  href={mat.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-4 hover:border-[#C07856] transition group"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#C07856]/10 flex items-center justify-center shrink-0">
                    {mat.tipo === "pdf" && <FileText className="w-5 h-5 text-[#C07856]" />}
                    {mat.tipo === "imagen" && <Image className="w-5 h-5 text-[#C07856]" />}
                    {mat.tipo === "link" && <ExternalLink className="w-5 h-5 text-[#C07856]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#2C2C2C] group-hover:text-[#C07856] transition">{mat.titulo}</p>
                    {mat.descripcion && (
                      <p className="text-sm text-gray-500 mt-0.5">{mat.descripcion}</p>
                    )}
                  </div>
                  <Download className="w-4 h-4 text-gray-400 group-hover:text-[#C07856] transition shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-sm text-gray-400 mt-10">
          Cualquier consulta contactá a tu agente inmobiliario
        </p>
      </main>
    </div>
  );
}
