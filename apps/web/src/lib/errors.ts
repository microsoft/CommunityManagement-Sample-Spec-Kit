import { NextResponse } from "next/server";
import { ZodError } from "zod";
import type { ApiError } from "@acroyoga/shared/api";

export type { ApiError };

export function badRequest(message: string, details?: Record<string, string[]>): NextResponse<ApiError> {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function unauthorized(message = "Authentication required"): NextResponse<ApiError> {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Insufficient permissions"): NextResponse<ApiError> {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function notFound(message = "Resource not found"): NextResponse<ApiError> {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function conflict(message: string): NextResponse<ApiError> {
  return NextResponse.json({ error: message }, { status: 409 });
}

export function fromZodError(error: ZodError): NextResponse<ApiError> {
  const details = error.flatten().fieldErrors as Record<string, string[]>;
  return badRequest("Validation failed", details);
}
