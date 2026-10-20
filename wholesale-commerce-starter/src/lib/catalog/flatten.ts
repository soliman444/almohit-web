export { primaryImage } from "./media";

export function flattenCategories<T extends { id: string; parentId: string | null; sortOrder: number; name: string }>(
  categories: T[],
) {
  const ids = new Set(categories.map((category) => category.id));
  const byParent = new Map<string | null, T[]>();
  for (const category of categories) {
    const key = category.parentId && ids.has(category.parentId) ? category.parentId : null;
    const list = byParent.get(key) ?? [];
    list.push(category);
    byParent.set(key, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "ar"));
  }

  const walk = (parentId: string | null, depth: number): Array<T & { depth: number }> =>
    (byParent.get(parentId) ?? []).flatMap((category) => [
      { ...category, depth },
      ...walk(category.id, depth + 1),
    ]);

  return walk(null, 0);
}
