import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const configuredSecret =
    process.env.REVALIDATE_SECRET ?? "dev-revalidate-secret";
  const headerSecret = request.headers.get("x-revalidate-secret");

  let body: { tag?: string; path?: string; secret?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const providedSecret = headerSecret ?? body.secret;
  if (!providedSecret || providedSecret !== configuredSecret) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "Invalid secret" } },
      { status: 401 }
    );
  }

  if (body.tag) {
    revalidateTag(body.tag, "max");
  }
  if (body.path) {
    revalidatePath(body.path);
  }

  return NextResponse.json({
    ok: true,
    data: { revalidated: true, tag: body.tag ?? null, path: body.path ?? null },
  });
}
