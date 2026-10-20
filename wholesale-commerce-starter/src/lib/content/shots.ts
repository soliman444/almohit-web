/** Coherent temporary art set: dark tabletop / oil / spice / honey. No white studio cutouts. */
export const SHOT = {
  oil: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=2000&q=80",
  coffee: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1800&q=80",
  beans: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1600&q=80",
  honey: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=1600&q=80",
  comb: "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=1800&q=80",
  spice: "https://images.unsplash.com/photo-1506368249639-73a7d55fe26c?auto=format&fit=crop&w=1800&q=80",
  night: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=2200&q=80",
  hands: "https://images.unsplash.com/photo-1466637574441-749b8f19452f?auto=format&fit=crop&w=1800&q=80",
  citrus: "https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?auto=format&fit=crop&w=1600&q=80",
  citrusMacro: "https://images.unsplash.com/photo-1547514701-42782101795e?auto=format&fit=crop&w=2200&q=80",
  avocado: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=1600&q=80",
  apple: "https://images.unsplash.com/photo-1560806889-67de0c3d4ed7?auto=format&fit=crop&w=1600&q=80",
  greenApple: "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=1600&q=80",
  pear: "https://images.unsplash.com/photo-1514756331096-242fdeb70d4d?auto=format&fit=crop&w=1600&q=80",
  banana: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=1600&q=80",
  lemon: "https://images.unsplash.com/photo-1572635148818-ef6fd45eb394?auto=format&fit=crop&w=1600&q=80",
  strawberry: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=1600&q=80",
  blueberry: "https://images.unsplash.com/photo-1498557850523-fd3d1186ec31?auto=format&fit=crop&w=1600&q=80",
  grapes: "https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&w=1600&q=80",
  mango: "https://images.unsplash.com/photo-1553279768-865429faaa3f?auto=format&fit=crop&w=1600&q=80",
  pineapple: "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&w=1600&q=80",
  kiwi: "https://images.unsplash.com/photo-1585059895524-c81990c49fba?auto=format&fit=crop&w=1600&q=80",
  coconut: "https://images.unsplash.com/photo-1580982268783-56860c4b26c2?auto=format&fit=crop&w=1600&q=80",
  dragon: "https://images.unsplash.com/photo-1526318472351-c75fcf070305?auto=format&fit=crop&w=1600&q=80",
  peach: "https://images.unsplash.com/photo-1692561796478-3c43d6656e42?auto=format&fit=crop&w=1600&q=80",
  cherry: "https://images.unsplash.com/photo-1528821154947-1aa3ddbce3f8?auto=format&fit=crop&w=1600&q=80",
  watermelon: "https://images.unsplash.com/photo-1589984662646-e7b2e4962f18?auto=format&fit=crop&w=1600&q=80",
  melon: "https://images.unsplash.com/photo-1571575173700-afb9492e6a50?auto=format&fit=crop&w=1600&q=80",
  dates: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&w=1600&q=80",
  fig: "https://images.unsplash.com/photo-1601379760883-1bb497c558e0?auto=format&fit=crop&w=1600&q=80",
  pomegranate: "https://images.unsplash.com/photo-1615485500704-8e990659ee7a?auto=format&fit=crop&w=1600&q=80",
  nuts: "https://images.unsplash.com/photo-1606923829579-0cb981a83e2e?auto=format&fit=crop&w=1600&q=80",
} as const;

export const FIELDS = ["flare", "acid", "night", "wash"] as const;
export type ColorField = (typeof FIELDS)[number];

export function fieldFor(index: number): ColorField {
  return FIELDS[index % FIELDS.length];
}
