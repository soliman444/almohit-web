export type MediaFraming = {
  fitMode?: "AUTO" | "COVER" | "CONTAIN" | null;
  focalX?: number | null;
  focalY?: number | null;
  scale?: number | null;
};

export type StorefrontCategoryCard = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  productCount: number;
  image: string | null;
  imageFraming?: MediaFraming | null;
  heroFocalX?: number | null;
  heroFocalY?: number | null;
  heroScale?: number | null;
};

export type StorefrontProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string | null;
  description: string | null;
  minOrderQuantity: number;
  isFeatured: boolean;
  isNew: boolean;
  productType: "SIMPLE" | "VARIABLE";
  category: { id: string; name: string; slug: string };
  brand: { id: string; name: string; slug: string } | null;
  media: Array<{
    id: string;
    type: string;
    isPrimary: boolean;
    fitMode?: "AUTO" | "COVER" | "CONTAIN" | null;
    focalX?: number | null;
    focalY?: number | null;
    visualScale?: number | null;
    media: { id: string; filePath: string; fileType: string; altText: string | null };
  }>;
  inStock: boolean;
  price: { amount: string; currency: string } | null;
  attributes?: Array<{
    id: string;
    name: string;
    type: "TEXT" | "COLOR" | "SELECT";
    values: Array<{ id: string; value: string; colorHex: string | null }>;
  }>;
  variants?: Array<{
    id: string;
    name: string;
    sku: string;
    inStock: boolean;
    valueIds: string[];
    price?: { amount: string; currency: string };
  }>;
};
