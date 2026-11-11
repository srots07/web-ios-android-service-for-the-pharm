import { NextRequest, NextResponse } from "next/server";

const FASTAPI_URL = process.env.API_BASE_URL || "http://127.0.0.1:8000";

export async function GET(request: NextRequest) {
  const targetUrl = `${FASTAPI_URL}/api/v1/admin/dashboard/summary`;

  const headers = new Headers();
  const authHeader = request.headers.get("authorization");
  if (authHeader) headers.set("authorization", authHeader);
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) headers.set("cookie", cookieHeader);

  try {
    const res = await fetch(targetUrl, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { error: "Unable to connect to administration backend service." },
      { status: 502 }
    );
  }
}

