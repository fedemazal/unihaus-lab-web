"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { getInmobiliaria } from "@/lib/firebase/firestore";
import type { Inmobiliaria } from "@/types";
import { Building2, Percent, Gift, Loader2 } from "lucide-react";

export default function BeneficiosPage() {
  const { profile } = useAuth();
  const [inmobiliaria, setInmobiliaria] = useState<Inmobiliaria | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (profile?.inmobiliariaId) {
        try {
          const data = await getInmobiliaria(profile.inmobiliariaId);
          setInmobiliaria(data);
        } catch (err) {
          console.error(err);
        }
      }
      setLoading(false);
    }
    load();
  }, [profile?.inmobiliariaId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-[#C07856]" />
      </div>
    );
  }

  if (!inmobiliaria) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-[#2C2C2C] mb-6">Mis Beneficios</h1>
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-[#5A5A5A]">No tenés una inmobiliaria asignada todavía.</p>
        </div>
      </div>
    );
  }

  // Example savings
  const examples = [
    { label: "Depto 80m² (Fotos + Video)", base: 96, savings: (96 * inmobiliaria.descuento) / 100 },
    { label: "Depto 100m² + Plano 2D", base: 145, savings: (145 * inmobiliaria.descuento) / 100 },
    { label: "Casa 200m² + Tour 360", base: 280, savings: (280 * inmobiliaria.descuento) / 100 },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-[#2C2C2C] mb-8">Mis Beneficios</h1>

      {/* Inmobiliaria card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-[#C07856]/10 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-[#C07856]" />
          </div>
          <div>
            <p className="text-sm text-[#5A5A5A]">Tu inmobiliaria</p>
            <p className="text-lg font-bold text-[#2C2C2C]">{inmobiliaria.nombre}</p>
          </div>
        </div>

        {/* Discount highlight */}
        <div className="bg-[#C07856]/5 border border-[#C07856]/20 rounded-xl p-5 mb-5">
          <div className="flex items-center gap-2 mb-1">
            <Percent className="w-5 h-5 text-[#C07856]" />
            <span className="font-semibold text-[#C07856]">Descuento exclusivo</span>
          </div>
          <p className="text-3xl font-bold text-[#C07856]">{inmobiliaria.descuento}%</p>
          <p className="text-sm text-[#5A5A5A] mt-1">En todas tus producciones</p>
        </div>

        {/* Benefits */}
        {inmobiliaria.beneficios && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Gift className="w-5 h-5 text-[#C07856]" />
              <span className="font-semibold text-[#2C2C2C]">Beneficios extra</span>
            </div>
            <div className="text-sm text-[#5A5A5A] whitespace-pre-line leading-relaxed">
              {inmobiliaria.beneficios}
            </div>
          </div>
        )}
      </div>

      {/* Example savings */}
      {inmobiliaria.descuento > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold text-[#2C2C2C] mb-4">Ejemplos de ahorro</h2>
          <div className="space-y-3">
            {examples.map((ex) => (
              <div key={ex.label} className="flex items-center justify-between text-sm">
                <span className="text-[#5A5A5A]">{ex.label}</span>
                <span className="font-medium text-green-600">
                  Ahorrás ${ex.savings.toFixed(0)} USD
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
