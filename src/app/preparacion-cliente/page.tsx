"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getMateriales } from "@/lib/firebase/firestore";
import type { MaterialPreparacion } from "@/types";
import { CheckCircle, Circle, FileText, Image, ExternalLink, Download } from "lucide-react";
import Link from "next/link";

type Tipo = "propietario" | "inquilino";

const propietarioSections = [
  {
    title: "Antes de que llegue el fotógrafo",
    items: [
      { id: "p01", label: "Encender todas las luces, incluso de día" },
      { id: "p02", label: "Abrir cortinas y persianas al máximo" },
      { id: "p03", label: "Cambiar cualquier lámpara quemada" },
      { id: "p04", label: "Despejar las mesadas por completo" },
      { id: "p05", label: "Guardar objetos religiosos, políticos o deportivos" },
      { id: "p06", label: "Sacar ropa colgada, tendederos y percheros" },
      { id: "p07", label: "Correr autos y motos del frente y del garage" },
      { id: "p08", label: "Mascotas fuera del recorrido durante la sesión" },
      { id: "p09", label: "Mover muebles u objetos grandes que no suman" },
      { id: "p10", label: "Dejar visible el punto fuerte: hogar, vista, pileta" },
      { id: "p11", label: "Un detalle prolijo en la entrada" },
    ],
  },
  {
    title: "Dormitorios",
    items: [
      { id: "d01", label: "Cama tendida con ropa de cama clara" },
      { id: "d02", label: "Placares cerrados, sin ropa a la vista" },
      { id: "d03", label: "Mesas de luz con lo mínimo" },
      { id: "d04", label: "Cargadores y cables fuera de cuadro" },
    ],
  },
  {
    title: "Baños",
    items: [
      { id: "b01", label: "Cuanto más despejado, más amplio se ve" },
      { id: "b02", label: "Toallas prolijas, o sin toallas" },
      { id: "b03", label: "Higiene y limpieza guardados" },
      { id: "b04", label: "Espejos sin manchas · tapa del inodoro baja" },
    ],
  },
  {
    title: "Cocina",
    items: [
      { id: "c01", label: "Mesadas 100% libres" },
      { id: "c02", label: "Sin trapos, esponjas ni vajilla a la vista" },
      { id: "c03", label: "Heladera sin imanes ni papeles" },
      { id: "c04", label: "Tacho de residuos fuera de cuadro" },
    ],
  },
  {
    title: "Living y comedor",
    items: [
      { id: "l01", label: "Mesas despejadas" },
      { id: "l02", label: "TV apagada" },
      { id: "l03", label: "Almohadones acomodados" },
      { id: "l04", label: "Cables de TV, router o consolas ocultos" },
    ],
  },
  {
    title: "Patio, balcón o terraza",
    items: [
      { id: "e01", label: "Piso barrido, sin hojas ni tierra" },
      { id: "e02", label: "Mangueras, baldes y herramientas guardados" },
      { id: "e03", label: "Plantas prolijas: sacar las secas" },
      { id: "e04", label: "Muebles de exterior ordenados" },
      { id: "e05", label: "Sin ropa tendida ni juguetes a la vista" },
    ],
  },
  {
    title: "Repaso final — el día de la sesión",
    items: [
      { id: "r01", label: "Todas las luces encendidas, incluso de día" },
      { id: "r02", label: "Ventiladores de techo apagados (generan desenfoque)" },
      { id: "r03", label: "Autos corridos del frente y del garage" },
      { id: "r04", label: "Un último vistazo a mesadas y mesas" },
      { id: "r05", label: "Camas repasadas si alguien durmió esa noche" },
    ],
  },
];

const inquilinoItems = [
  { id: "i01", label: "Encender todas las luces y abrir cortinas / persianas" },
  { id: "i02", label: "Despejar las mesadas de cocina lo más posible" },
  { id: "i03", label: "Tender las camas" },
  { id: "i04", label: "Guardar ropa y objetos personales que estén a la vista" },
  { id: "i05", label: "Correr los autos del frente, si corresponde" },
  { id: "i06", label: "Mantener a las mascotas fuera del recorrido durante la sesión" },
  { id: "i07", label: "Retirar residuos y bolsas de basura que estén a la vista" },
];

const totalPropietario = propietarioSections.reduce((s, sec) => s + sec.items.length, 0);

function PreparacionClienteInner() {
  const searchParams = useSearchParams();
  const paramTipo = searchParams.get("tipo") as Tipo | null;

  const [tipo, setTipo] = useState<Tipo | null>(paramTipo);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [materiales, setMateriales] = useState<MaterialPreparacion[]>([]);

  useEffect(() => {
    getMateriales()
      .then((data) => setMateriales(data.filter((m) => m.activo)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setChecked(new Set());
  }, [tipo]);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalItems = tipo === "propietario" ? totalPropietario : inquilinoItems.length;
  const checkedCount = checked.size;
  const progress = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0;
  const allDone = checkedCount === totalItems && totalItems > 0;

  return (
    <div className="min-h-screen bg-[#F8F7F4]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
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

        {/* Selector inicial */}
        {!tipo ? (
          <div className="py-4">
            <h1 className="text-2xl font-bold text-[#2C2C2C] mb-2">
              Preparación para la sesión fotográfica
            </h1>
            <p className="text-gray-500 mb-10">
              Seleccioná tu caso para ver la guía correspondiente.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setTipo("propietario")}
                className="bg-white border-2 border-gray-200 rounded-2xl p-8 text-left hover:border-[#C07856] transition group"
              >
                <div className="w-12 h-12 bg-[#C07856]/10 rounded-xl flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-[#C07856]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                  </svg>
                </div>
                <p className="text-lg font-bold text-[#2C2C2C] group-hover:text-[#C07856] transition mb-1">Soy propietario</p>
                <p className="text-sm text-gray-500">Guía completa ambiente por ambiente · 11 puntos generales + 5 ambientes</p>
              </button>

              <button
                onClick={() => setTipo("inquilino")}
                className="bg-white border-2 border-gray-200 rounded-2xl p-8 text-left hover:border-[#C07856] transition group"
              >
                <div className="w-12 h-12 bg-[#C07856]/10 rounded-xl flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-[#C07856]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
                <p className="text-lg font-bold text-[#2C2C2C] group-hover:text-[#C07856] transition mb-1">Soy inquilino</p>
                <p className="text-sm text-gray-500">Checklist breve de 7 puntos · se hace en 45 minutos, una sola visita</p>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tipo toggle */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex bg-white border border-gray-200 rounded-full p-1 gap-1">
                <button
                  onClick={() => setTipo("propietario")}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                    tipo === "propietario"
                      ? "bg-[#2C2C2C] text-white"
                      : "text-gray-500 hover:text-[#2C2C2C]"
                  }`}
                >
                  Propietario
                </button>
                <button
                  onClick={() => setTipo("inquilino")}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                    tipo === "inquilino"
                      ? "bg-[#2C2C2C] text-white"
                      : "text-gray-500 hover:text-[#2C2C2C]"
                  }`}
                >
                  Inquilino
                </button>
              </div>
            </div>

            {/* ── PROPIETARIO ── */}
            {tipo === "propietario" && (
              <>
                <h1 className="text-2xl font-bold text-[#2C2C2C] mb-1">
                  Preparación para tu sesión fotográfica
                </h1>
                <p className="text-gray-500 mb-6">
                  Cómo dejar tu propiedad lista para que las fotos vendan más rápido y a mejor precio.
                </p>

                <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
                  <p className="text-sm text-gray-600 leading-relaxed mb-4">
                    Gracias de antemano por tomarte el tiempo de preparar la propiedad — sabemos que implica un esfuerzo extra en un momento que ya viene con bastante encima. Las fotos son el primer contacto de cada potencial comprador o inquilino con tu propiedad, y esa primera impresión define si alguien agenda una visita o sigue mirando otro aviso.
                  </p>
                  <blockquote className="border-l-4 border-[#C07856] pl-4">
                    <p className="text-[#2C2C2C] font-medium italic text-sm">
                      &ldquo;Unas horas de preparación pueden valer, literalmente, semanas de tiempo de venta.&rdquo;
                    </p>
                  </blockquote>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[#2C2C2C]">Progreso</span>
                    <span className="text-sm text-gray-500">{checkedCount} / {totalItems}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-[#C07856] h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                  {allDone && <p className="text-sm text-green-600 font-medium mt-2">¡Todo listo para la sesión!</p>}
                </div>

                <div className="space-y-3 mb-8">
                  {propietarioSections.map((section) => {
                    const sectionChecked = section.items.filter((i) => checked.has(i.id)).length;
                    const secDone = sectionChecked === section.items.length;
                    return (
                      <div key={section.title} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <div className={`px-5 py-3 border-b border-gray-100 flex items-center justify-between ${secDone ? "bg-green-50" : ""}`}>
                          <h2 className="font-semibold text-[#2C2C2C] text-sm">{section.title}</h2>
                          <span className={`text-xs font-medium ${secDone ? "text-green-600" : "text-gray-400"}`}>
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

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-8">
                  <h3 className="font-semibold text-[#2C2C2C] mb-3 text-sm">Qué no hace el fotógrafo</h3>
                  <ul className="space-y-1.5 text-sm text-gray-600">
                    <li>✕ No limpia el inmueble</li>
                    <li>✕ No mueve objetos frágiles, pesados o de higiene personal</li>
                    <li>✕ No ordena ambientes, no hace camas ni maneja pertenencias</li>
                  </ul>
                  <p className="text-sm text-gray-500 mt-3 italic">
                    Sí puede sugerir ajustes puntuales en el momento — correr un objeto, abrir una cortina. Vale la pena escucharlos.
                  </p>
                </div>
              </>
            )}

            {/* ── INQUILINO ── */}
            {tipo === "inquilino" && (
              <>
                <h1 className="text-2xl font-bold text-[#2C2C2C] mb-1">
                  Preparación breve para la sesión de fotos
                </h1>
                <p className="text-gray-500 mb-6">
                  Unos minutos de orden antes de que llegue el fotógrafo.
                </p>

                <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Antes que nada, muchas gracias por la buena predisposición para recibirnos. Sabemos que no siempre es el mejor momento para este tipo de visitas, así que valoramos mucho que nos abran las puertas. La sesión va a ser relativamente rápida y es algo que se hace <strong>una sola vez</strong>. Te dejamos algunas recomendaciones simples que, si podés tenerlas en cuenta antes de que llegue el fotógrafo, nos ayudarían muchísimo.
                  </p>
                </div>

                <div className="flex items-center gap-3 bg-[#C07856]/8 border border-[#C07856]/20 rounded-xl px-5 py-3 mb-5">
                  <span className="text-2xl font-bold text-[#C07856]">45 min</span>
                  <span className="text-sm text-gray-600">duración estimada · una sola visita, no se repite</span>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[#2C2C2C]">Checklist — 7 puntos</span>
                    <span className="text-sm text-gray-500">{checkedCount} / {totalItems}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-[#C07856] h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                  {allDone && <p className="text-sm text-green-600 font-medium mt-2">¡Todo listo para la sesión!</p>}
                </div>

                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
                  <div className="divide-y divide-gray-50">
                    {inquilinoItems.map((item) => {
                      const isChecked = checked.has(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => toggle(item.id)}
                          className="w-full px-5 py-3.5 flex items-center gap-3 text-left hover:bg-gray-50 transition"
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

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-8">
                  <h3 className="font-semibold text-[#2C2C2C] mb-2 text-sm">Una aclaración</h3>
                  <p className="text-sm text-gray-600">
                    El fotógrafo <strong>no limpia, no ordena ni mueve pertenencias</strong>. Sí puede sugerir un ajuste puntual en el momento —correr un objeto, abrir una cortina— para que el ambiente luzca mejor en la foto.
                  </p>
                </div>
              </>
            )}

            {/* Materiales desde Firestore */}
            {materiales.length > 0 && (
              <div className="mb-8">
                <h2 className="text-base font-semibold text-[#2C2C2C] mb-3">Materiales adicionales</h2>
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

            <p className="text-center text-sm text-gray-400 pb-4">
              Cualquier consulta contactá a tu agente inmobiliario
            </p>
          </>
        )}
      </main>
    </div>
  );
}

export default function PreparacionClientePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8F7F4]" />}>
      <PreparacionClienteInner />
    </Suspense>
  );
}
