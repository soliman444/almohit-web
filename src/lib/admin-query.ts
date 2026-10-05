export function queryValue(value: string | string[] | undefined) {
  const text = Array.isArray(value) ? value[0] : value;
  return text?.trim() ?? "";
}

export function insensitiveContains(value: string) {
  return { contains: value, mode: "insensitive" as const };
}

export function isActiveQuery(params: Record<string, string | undefined>) {
  return Object.values(params).some((value) => Boolean(value));
}
