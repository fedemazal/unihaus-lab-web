const TRAMOS_CONSTRUIDA: [number, number, number][] = [
  [0, 30, 1.5225],
  [30, 45, 0.735],
  [45, 80, 0.60],
  [80, 114, 0.42],
  [114, 200, 0.18],
  [200, 250, 0.40],
  [250, Infinity, 0.35],
];

const TRAMOS_DESCUBIERTA: [number, number, number][] = [
  [0, 150, 0.15],
  [150, 300, 0.10],
  [300, 500, 0.07],
  [500, Infinity, 0.00],
];

export function precioBaseProgresivo(m2: number): number {
  let total = 0;
  for (const [lower, upper, rate] of TRAMOS_CONSTRUIDA) {
    total += Math.max(0, Math.min(m2, upper) - lower) * rate;
  }
  return total;
}

export function precioDescubiertoProgresivo(m2: number): number {
  let total = 0;
  for (const [lower, upper, rate] of TRAMOS_DESCUBIERTA) {
    total += Math.max(0, Math.min(m2, upper) - lower) * rate;
  }
  return total;
}

export function precioPlano(m2Relevante: number): number {
  return m2Relevante * (m2Relevante <= 35 ? 0.30 : 0.25);
}
