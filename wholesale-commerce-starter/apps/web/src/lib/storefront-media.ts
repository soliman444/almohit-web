import { resolveMediaMode, type MediaFitMode, type MediaMode } from "./media-system";
import type { MediaFraming, StorefrontProduct } from "./storefront-types";

type MediaHost = {
  media: Array<{
    id?: string;
    isPrimary: boolean;
    type: string;
    fitMode?: MediaFitMode | null;
    focalX?: number | null;
    focalY?: number | null;
    visualScale?: number | null;
    media: { filePath: string; altText: string | null; fileType?: string };
  }>;
};

export function galleryImages(product: MediaHost) {
  return product.media.filter((item) => {
    const type = item.media.fileType;
    return !type || type === "IMAGE" || type === "IMAGE_360";
  });
}

export function framingFromRecord(item?: MediaHost["media"][number] | null): MediaFraming {
  return {
    fitMode: item?.fitMode ?? "AUTO",
    focalX: item?.focalX ?? 50,
    focalY: item?.focalY ?? 50,
    scale: item?.visualScale ?? 1,
  };
}

export function primaryImage(product: MediaHost) {
  const images = galleryImages(product);
  const main = images.find((item) => item.isPrimary || item.type === "MAIN") ?? images[0];
  return main ? { src: main.media.filePath, alt: main.media.altText, ...framingFromRecord(main) } : null;
}

export function secondaryImage(product: StorefrontProduct) {
  const images = galleryImages(product);
  return images[1] ? { src: images[1].media.filePath, alt: images[1].media.altText, ...framingFromRecord(images[1]) } : null;
}

export type ProductShot = {
  src: string;
  alt: string;
  isolated: boolean;
  fitMode?: MediaFitMode | null;
  focalX?: number | null;
  focalY?: number | null;
  scale?: number | null;
};

export function productShots(product: MediaHost): ProductShot[] {
  return galleryImages(product).map((item) => ({
    src: item.media.filePath,
    alt: item.media.altText || "",
    isolated:
      item.fitMode === "CONTAIN"
      || (item.fitMode !== "COVER" && resolveMediaMode({ src: item.media.filePath, fileType: item.media.fileType }) === "ISOLATED_PRODUCT"),
    ...framingFromRecord(item),
  }));
}

export function viewTransitionName(slug: string) {
  const safe = slug.replace(/[^a-zA-Z0-9_-]/g, "");
  return safe ? `img-${safe}` : "img-product";
}

export type ProductRevealMode = MediaMode;

export function productRevealMode(src?: string | null): ProductRevealMode {
  return resolveMediaMode({ src });
}
