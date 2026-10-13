import { SHOT } from "../../lib/shots";

export const EDITORIAL = {
  hero: SHOT.oil,
  citrus: SHOT.spice,
  oil: SHOT.oil,
  spice: SHOT.spice,
  avocado: SHOT.oil,
  coffee: SHOT.coffee,
  honey: SHOT.comb,
  night: SHOT.night,
  hands: SHOT.hands,
  linen: SHOT.comb,
  produce: SHOT.hands,
} as const;

const FALLBACKS = [SHOT.oil, SHOT.spice, SHOT.coffee, SHOT.night, SHOT.comb, SHOT.hands];

export function editorialFallback(seed: string) {
  let hash = 0;
  for (const char of seed) hash = (hash + char.charCodeAt(0)) % FALLBACKS.length;
  return FALLBACKS[hash];
}

export function resolveMediaSrc(src: string | null | undefined, seed = "atelier") {
  return src || editorialFallback(seed);
}
