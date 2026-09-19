import { NextResponse } from "next/server";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const MAX_MESSAGE_LENGTH = 2_000;
const MAX_PATHNAME_LENGTH = 2_000;
const MAX_STACK_LENGTH = 8_000;
const MAX_BODY_BYTES = 16_384;

function boundedString(value: unknown, limit: number) {
  return typeof value === "string"
    ? value.slice(0, limit).replace(/[\u0000-\u001F\u007F]/g, " ")
    : undefined;
}

async function readBoundedBody(request: Request) {
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return new NextResponse(null, { status: 403 });
  }

  const ip = await getClientIp();
  if (!(await rateLimit(`client-errors:ip:${ip}`, 20, 60_000)).success) {
    return new NextResponse(null, { status: 429 });
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return new NextResponse(null, { status: 413 });
  }

  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return new NextResponse(null, { status: 415 });
  }

  try {
    const rawBody = await readBoundedBody(request);
    if (rawBody === null) {
      return new NextResponse(null, { status: 413 });
    }
    const body: unknown = JSON.parse(rawBody);
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
