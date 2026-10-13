import { NextRequest } from "next/server";
import { getOdooApiUrl } from "../../../lib/odoo/config";
import { isAllowedOdooImagePath } from "../../../lib/odoo/images";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  if (!isAllowedOdooImagePath(path)) {
    return new Response("Not found", { status: 404 });
  }

  const upstream = new URL(`${getOdooApiUrl()}/${path.join("/")}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    upstream.searchParams.set(key, value);
  });

  try {
    const response = await fetch(upstream, {
      cache: "no-store",
      credentials: "omit",
      redirect: "manual",
      headers: { accept: "image/*" },
    });
    if (!response.ok || response.status >= 300) {
      return new Response("Image unavailable", { status: response.status >= 400 ? response.status : 502 });
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    if (contentType.includes("text/html") || contentType.includes("application/json")) {
      return new Response("Image unavailable", { status: 502 });
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response("Image unavailable", { status: 503 });
  }
}
