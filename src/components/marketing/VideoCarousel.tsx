"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface VideoSlide {
  id: number;
  embedUrl?: string;
  title: string;
  subtitle?: string;
}

const slides: VideoSlide[] = [
  { id: 1, title: "Departamento · Palermo", subtitle: "Fotografía + Video + Tour 360°" },
  { id: 2, title: "Casa · Nordelta", subtitle: "Fotografía + Drone + Plano 2D" },
  { id: 3, title: "PH · San Isidro", subtitle: "Fotografía + Video" },
  { id: 4, title: "Depto · Puerto Madero", subtitle: "Fotografía + Amoblamiento Virtual" },
  { id: 5, title: "Casa · Tigre", subtitle: "Drone + Video" },
];

export default function VideoCarousel() {
  const [current, setCurrent] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const goTo = useCallback(
    (index: number) => {
      if (isAnimating) return;
      setIsAnimating(true);
      setCurrent((index + slides.length) % slides.length);
      setTimeout(() => setIsAnimating(false), 400);
    },
    [isAnimating]
  );

  const startAutoplay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
  }, []);

  useEffect(() => {
    startAutoplay();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startAutoplay]);

  const pause = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const slide = slides[current];

  return (
    <div
      className="relative w-full max-w-5xl mx-auto"
      onMouseEnter={pause}
      onMouseLeave={startAutoplay}
    >
      {/* Slide principal */}
      <div className="relative aspect-video bg-zinc-900 rounded-2xl overflow-hidden">
        {slide.embedUrl ? (
          <iframe
            key={slide.id}
            src={slide.embedUrl}
            className="w-full h-full"
            allow="autoplay; encrypted-media"
            allowFullScreen
            title={slide.title}
          />
        ) : (
          /* Placeholder visual mientras no hay video real */
          <div className="w-full h-full flex flex-col items-center justify-center gap-4">
            {/* Ícono play */}
            <div className="w-16 h-16 rounded-full bg-[#F2B968]/20 border border-[#F2B968]/40 flex items-center justify-center">
              <div className="w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[18px] border-l-[#F2B968] ml-1" />
            </div>
            <div className="text-center">
              <p className="text-white font-semibold text-lg">{slide.title}</p>
              {slide.subtitle && (
                <p className="text-zinc-500 text-sm mt-1">{slide.subtitle}</p>
              )}
            </div>
          </div>
        )}

        {/* Caption overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pointer-events-none">
          <p className="text-white font-semibold">{slide.title}</p>
          {slide.subtitle && (
            <p className="text-zinc-400 text-sm">{slide.subtitle}</p>
          )}
        </div>

        {/* Flechas */}
        <button
          onClick={() => goTo(current - 1)}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 border border-white/10 flex items-center justify-center transition"
          aria-label="Anterior"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={() => goTo(current + 1)}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 border border-white/10 flex items-center justify-center transition"
          aria-label="Siguiente"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-2 mt-5">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`transition-all rounded-full ${
              i === current
                ? "w-6 h-2 bg-[#F2B968]"
                : "w-2 h-2 bg-zinc-600 hover:bg-zinc-400"
            }`}
            aria-label={`Ir a slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Thumbnails mini */}
      <div className="flex gap-3 mt-5 overflow-x-auto pb-1">
        {slides.map((s, i) => (
          <button
            key={s.id}
            onClick={() => goTo(i)}
            className={`flex-shrink-0 w-24 aspect-video rounded-lg bg-zinc-900 border transition overflow-hidden flex items-center justify-center ${
              i === current
                ? "border-[#F2B968]"
                : "border-zinc-700 hover:border-zinc-500"
            }`}
          >
            <div className="text-center px-1">
              <p className="text-zinc-400 text-[9px] leading-tight">{s.title}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
