import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      status: "healthy",
      service: "prime-web-frontend",
      timestamp: new Date().toISOString(),
      uptime_seconds: process.uptime(),
    },
    { status: 200 }
  );
}

