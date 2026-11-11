import { NextRequest, NextResponse } from "next/server";

const FASTAPI_URL = process.env.API_BASE_URL || "http://127.0.0.1:8000";

export async function GET(request: NextRequest) {
  const targetUrl = `${FASTAPI_URL}/api/v1/products${request.nextUrl.search}`;

  try {
    const res = await fetch(targetUrl, {
      method: "GET",
      cache: "no-store",
    });

    const data = await res.json().catch(() => ([]));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { error: "Unable to reach product catalogue service." },
      { status: 502 }
    );
  }
}

