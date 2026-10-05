import { SHOT } from "./shots";

export type CategoryHeroMode =
  | "image-parallax"
  | "video-loop"
  | "split-dynamic"
  | "macro-reveal"
  | "color-field-product";

export type CategoryHeroAccent = "flare" | "acid" | "night" | "wash";

export type CategoryHeroConfig = {
  mode: CategoryHeroMode;
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  image?: string;
  video?: string;
  poster?: string;
  accent?: CategoryHeroAccent;
};

export type CategoryHeroProps = {
  mode: CategoryHeroMode;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  image?: string;
  video?: string;
  poster?: string;
  accent?: CategoryHeroAccent;
  productCount?: number;
  slug?: string;
  focalX?: number | null;
  focalY?: number | null;
  frameScale?: number | null;
};

/** Frontend art direction defaults. Database heroVideoUrl/heroPosterUrl override media per category when present. */
export const CATEGORY_HEROES: Record<string, CategoryHeroConfig> = {
  "basic-fruits": {
    mode: "video-loop",
    title: "Everyday fruit, first.",
    subtitle: "Apples, pears, and bananas before any number.",
    eyebrow: "01 / Basic Fruits",
    image: SHOT.apple,
    poster: SHOT.apple,
    video: "/heroes/fresh-produce.mp4?v=2",
    accent: "flare",
  },
  "citrus-fruits": {
    mode: "macro-reveal",
    title: "A clean, bright peel.",
    subtitle: "Juice and table citrus on one cold chain.",
    eyebrow: "02 / Citrus",
    image: SHOT.citrusMacro,
    poster: SHOT.citrusMacro,
    accent: "acid",
  },
  berries: {
    mode: "color-field-product",
    title: "Soft fruit, held cold.",
    subtitle: "Berries and grapes for pastry and the shelf.",
    eyebrow: "03 / Berries",
    image: SHOT.strawberry,
    poster: SHOT.strawberry,
    accent: "flare",
  },
  "tropical-fruits": {
    mode: "split-dynamic",
    title: "Warm climate, tight pack.",
    subtitle: "Mango, pineapple, and hotel fruit.",
    eyebrow: "04 / Tropical",
    image: SHOT.mango,
    poster: SHOT.mango,
    accent: "wash",
  },
  "stone-fruits": {
    mode: "image-parallax",
    title: "A short, clean season.",
    subtitle: "Peach, plum, and cherry while they last.",
    eyebrow: "05 / Stone Fruits",
    image: SHOT.peach,
    poster: SHOT.peach,
    accent: "flare",
  },
  "desert-fruits": {
    mode: "image-parallax",
    title: "Dates, figs, summer water.",
    subtitle: "Gulf fruit with a long memory and a short melon season.",
    eyebrow: "06 / Desert",
    image: SHOT.dates,
    poster: SHOT.dates,
    accent: "night",
  },
  "dried-fruits-nuts": {
    mode: "split-dynamic",
    title: "Stored with dignity.",
    subtitle: "Raisins, dried fruit, and nuts in quiet cartons.",
    eyebrow: "07 / Dry Store",
    image: SHOT.nuts,
    poster: SHOT.nuts,
    accent: "acid",
  },
  "fatty-fruits": {
    mode: "macro-reveal",
    title: "Cream and brine.",
    subtitle: "Avocado and olives for kitchens that wait.",
    eyebrow: "08 / Fatty Fruits",
    image: SHOT.avocado,
    poster: SHOT.avocado,
    accent: "night",
  },
  "other-fruits": {
    mode: "color-field-product",
    title: "The extra line.",
    subtitle: "Pomegranate and other specialty fruit.",
    eyebrow: "09 / Other",
    image: SHOT.pomegranate,
    poster: SHOT.pomegranate,
    accent: "wash",
  },
  "fresh-produce": {
    mode: "video-loop",
    title: "Fresh at first sight.",
    subtitle: "The fruit is read before it is counted.",
    eyebrow: "01 / Fruit",
    image: SHOT.citrusMacro,
    poster: SHOT.citrusMacro,
    video: "/heroes/fresh-produce.mp4?v=2",
    accent: "flare",
  },
  beverages: {
    mode: "macro-reveal",
    title: "Liquid with a clear density.",
    subtitle: "A short pour. A long finish.",
    eyebrow: "02 / Beverages",
    image: SHOT.coffee,
    poster: SHOT.coffee,
    accent: "night",
  },
  spices: {
    mode: "color-field-product",
    title: "A grain that changes the plate.",
    subtitle: "Spice shown as a campaign, not a shelf.",
    eyebrow: "04 / Spices",
    image: SHOT.spice,
    poster: SHOT.spice,
    accent: "flare",
  },
  pantry: {
    mode: "split-dynamic",
    title: "Stored with dignity.",
    subtitle: "Oil, honey, and rice on one table.",
    eyebrow: "03 / Pantry",
    image: SHOT.oil,
    poster: SHOT.oil,
    accent: "acid",
  },
  dairy: {
    mode: "image-parallax",
    title: "A steady cold chain.",
    subtitle: "Dairy read quietly before any number.",
    eyebrow: "05 / Dairy",
    image: SHOT.night,
    poster: SHOT.night,
    accent: "night",
  },
};

export function resolveCategoryHero(
  slug: string,
  fallback: { title: string; subtitle?: string | null; image?: string | null },
): CategoryHeroProps {
  const config = CATEGORY_HEROES[slug];
  const image = config?.image || fallback.image || SHOT.oil;
  return {
    mode: config?.mode ?? "image-parallax",
    title: config?.title ?? fallback.title,
    subtitle: config?.subtitle ?? fallback.subtitle ?? undefined,
    eyebrow: config?.eyebrow ?? "Collection",
    image,
    video: config?.video,
    poster: config?.poster || image,
    accent: config?.accent ?? "night",
    slug,
  };
}
