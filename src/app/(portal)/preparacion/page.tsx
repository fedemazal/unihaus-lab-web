"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Home, User, ExternalLink } from "lucide-react";

export default function PreparacionPage() {
  const [copied, setCopied] = useState<"" | "propietario" | "inquilino">("");

  const handleShare = (tipo: "propietario" | "inquilino") => {
    const path = tipo === "propietario" ? "/guia-propietarios.html" : "/guia-inquilinos.html";
    const url = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(tipo);
      setTimeout(() => setCopied(""), 2500);
    });
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-[#E2ECF4] mb-2">Preparación de Propiedad</h1>
      <p className="text-[#7A96A8] mb-8">
        Copiá el link de la guía y mandáselo a tu cliente antes de la sesión.
      </p>

      <div className="space-y-4">
        {/* Propietario */}
        <div className="bg-[#161C26] border border-[#263040] rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 bg-[#F2B968]/10 rounded-xl flex items-center justify-center shrink-0">
              <Home className="w-5 h-5 text-[#F2B968]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#E2ECF4] mb-0.5">Guía para propietarios</p>
              <p className="text-sm text-[#7A96A8] mb-4">
                Guía completa ambiente por ambiente — ideal para enviar antes de la sesión al dueño.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleShare("propietario")}
                  size="sm"
                  className="bg-[#F2B968] hover:bg-[#d9a050] text-[#0D1117] font-semibold"
                >
                  {copied === "propietario" ? (
                    <><Check className="w-4 h-4 mr-1.5" />Link copiado</>
                  ) : (
                    "Copiar link"
                  )}
                </Button>
                <a
                  href="/guia-propietarios.html"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#263040] bg-transparent text-[#E2ECF4] hover:bg-[#1E2A38]"
                  >
                    <ExternalLink className="w-4 h-4 mr-1.5" />
                    Ver guía
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Inquilino */}
        <div className="bg-[#161C26] border border-[#263040] rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 bg-[#F2B968]/10 rounded-xl flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-[#F2B968]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#E2ECF4] mb-0.5">Guía para inquilinos</p>
              <p className="text-sm text-[#7A96A8] mb-4">
                Checklist breve de 7 puntos — tono amigable, pensado para quien recibe al fotógrafo sin ser el dueño.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleShare("inquilino")}
                  size="sm"
                  className="bg-[#F2B968] hover:bg-[#d9a050] text-[#0D1117] font-semibold"
                >
                  {copied === "inquilino" ? (
                    <><Check className="w-4 h-4 mr-1.5" />Link copiado</>
                  ) : (
                    "Copiar link"
                  )}
                </Button>
                <a
                  href="/guia-inquilinos.html"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#263040] bg-transparent text-[#E2ECF4] hover:bg-[#1E2A38]"
                  >
                    <ExternalLink className="w-4 h-4 mr-1.5" />
                    Ver guía
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
