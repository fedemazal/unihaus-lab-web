"use client";

import { TextAnimate } from "@/components/ui/text-animate";

export function HeroHeadline() {
  return (
    <TextAnimate
      text="DESTACÁ TUS PROPIEDADES"
      type="whipInUp"
      className="text-5xl md:text-7xl font-bold mb-6 tracking-tight text-white"
    />
  );
}
