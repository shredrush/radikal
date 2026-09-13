import { NextResponse } from "next/server";

const MAX_MESSAGE_LENGTH = 2_000;
const MAX_PATHNAME_LENGTH = 2_000;
const MAX_STACK_LENGTH = 8_000;

function boundedString(value: unknown, limit: number) {
  return typeof value === "string" ? value.slice(0, limit) : undefined;
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return new NextResponse(null, { status: 403 });
  }

  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") {
      return new NextResponse(null, { status: 400 });
    }

    const { digest, message, pathname, stack } = body as Record<string, unknown>;
    console.error("[client-error-boundary]", {
      digest: boundedString(digest, MAX_MESSAGE_LENGTH),
      message: boundedString(message, MAX_MESSAGE_LENGTH),
      pathname: boundedString(pathname, MAX_PATHNAME_LENGTH),
      stack: boundedString(stack, MAX_STACK_LENGTH),
    });
  } catch (error) {
    console.error("[client-error-boundary] failed to parse report", error);
    return new NextResponse(null, { status: 400 });
  }

  return new NextResponse(null, { status: 204 });
}
