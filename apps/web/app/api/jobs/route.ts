import { NextResponse } from "next/server";

const API_BASE_URL = process.env.CLIRCEL_API_URL ?? "http://localhost:3001";

export const runtime = "nodejs";

export async function GET() {
  try {
    const response = await fetch(`${API_BASE_URL}/jobs`, {
      method: "GET",
      cache: "no-store",
    });

    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        ok: false,
        message: `Failed to fetch jobs: ${message}`,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const response = await fetch(`${API_BASE_URL}/jobs`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        ok: false,
        message: `Failed to create job: ${message}`,
      },
      { status: 500 },
    );
  }
}
