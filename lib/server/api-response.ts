import { NextResponse } from "next/server";

export type ValidationIssue = {
  nodeId: string | null;
  field: string;
  message: string;
  fix: string;
};

export function success<T>(data: T, status = 200) {
  return NextResponse.json(
    { ok: true, data },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export function failure(
  status: number,
  code: string,
  message: string,
  details?: { validationErrors?: ValidationIssue[] },
) {
  return NextResponse.json(
    { ok: false, error: { code, message, ...details } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export function databaseUnavailable() {
  return failure(
    503,
    "DATABASE_UNAVAILABLE",
    "Workflow storage is not configured or is temporarily unavailable.",
  );
}
