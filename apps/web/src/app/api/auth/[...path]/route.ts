import { NextRequest, NextResponse } from "next/server";

const FASTAPI_URL = process.env.API_BASE_URL || "http://127.0.0.1:8000";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const targetPath = path.join("/");
  const targetUrl = `${FASTAPI_URL}/api/v1/auth/${targetPath}${request.nextUrl.search}`;

  const headers = new Headers();
  const authHeader = request.headers.get("authorization");
  if (authHeader) headers.set("authorization", authHeader);
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) headers.set("cookie", cookieHeader);
  const realIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "127.0.0.1";
  headers.set("x-forwarded-for", realIp);

  try {
    const res = await fetch(targetUrl, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    const response = NextResponse.json(data, { status: res.status });

    // Forward Set-Cookie headers from FastAPI to client browser
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      response.headers.set("set-cookie", setCookie);
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "Unable to reach core authentication service." },
      { status: 502 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const targetPath = path.join("/");
  const targetUrl = `${FASTAPI_URL}/api/v1/auth/${targetPath}`;

  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  const authHeader = request.headers.get("authorization");
  if (authHeader) headers.set("authorization", authHeader);
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) headers.set("cookie", cookieHeader);
  const originHeader = request.headers.get("origin");
  if (originHeader) headers.set("origin", originHeader);
  const refererHeader = request.headers.get("referer");
  if (refererHeader) headers.set("referer", refererHeader);
  const realIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "127.0.0.1";
  headers.set("x-forwarded-for", realIp);

  try {
    const body = await request.json().catch(() => ({}));

    const res = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    const response = NextResponse.json(data, { status: res.status });

    // Forward Set-Cookie headers from FastAPI to client browser
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      response.headers.set("set-cookie", setCookie);
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "Unable to reach core authentication service." },
      { status: 502 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const targetPath = path.join("/");
  const targetUrl = `${FASTAPI_URL}/api/v1/auth/${targetPath}`;

  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  const authHeader = request.headers.get("authorization");
  if (authHeader) headers.set("authorization", authHeader);
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) headers.set("cookie", cookieHeader);
  const originHeader = request.headers.get("origin");
  if (originHeader) headers.set("origin", originHeader);
  const refererHeader = request.headers.get("referer");
  if (refererHeader) headers.set("referer", refererHeader);
  const realIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "127.0.0.1";
  headers.set("x-forwarded-for", realIp);

  try {
    const body = await request.json().catch(() => ({}));

    const res = await fetch(targetUrl, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { error: "Unable to reach core authentication service." },
      { status: 502 }
    );
  }
}
