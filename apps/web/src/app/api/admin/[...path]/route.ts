import { NextRequest, NextResponse } from "next/server";

const FASTAPI_URL = process.env.API_BASE_URL || "http://127.0.0.1:8000";

async function proxyAdminRequest(
  request: NextRequest,
  params: Promise<{ path: string[] }>,
  method: string
) {
  const { path } = await params;
  const targetPath = path.join("/");
  const targetUrl = `${FASTAPI_URL}/api/v1/admin/${targetPath}${request.nextUrl.search}`;

  const headers = new Headers();
  const authHeader = request.headers.get("authorization");
  if (authHeader) headers.set("authorization", authHeader);
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) headers.set("cookie", cookieHeader);

  const incomingContentType = request.headers.get("content-type");
  let body: any = undefined;

  if (method !== "GET" && method !== "HEAD") {
    if (incomingContentType?.includes("multipart/form-data")) {
      headers.set("content-type", incomingContentType);
      body = await request.arrayBuffer();
    } else {
      headers.set("content-type", "application/json");
      body = await request.text().catch(() => "");
    }
  }

  try {
    const res = await fetch(targetUrl, {
      method,
      headers,
      body: body ? body : undefined,
      cache: "no-store",
    });

    // Check if binary download
    const resContentType = res.headers.get("content-type") || "";
    if (
      resContentType.includes("application/pdf") ||
      resContentType.includes("image/") ||
      resContentType.includes("application/octet-stream")
    ) {
      const blob = await res.arrayBuffer();
      const response = new NextResponse(blob, { status: res.status });
      response.headers.set("content-type", resContentType);
      const contentDisposition = res.headers.get("content-disposition");
      if (contentDisposition) {
        response.headers.set("content-disposition", contentDisposition);
      }
      return response;
    }

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { error: "Unable to reach core administrative API service." },
      { status: 502 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyAdminRequest(request, params, "GET");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyAdminRequest(request, params, "POST");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyAdminRequest(request, params, "PATCH");
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyAdminRequest(request, params, "PUT");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyAdminRequest(request, params, "DELETE");
}
