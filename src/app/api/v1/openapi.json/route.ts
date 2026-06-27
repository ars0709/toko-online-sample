import { NextResponse } from "next/server";
import { getOpenApiDocument } from "@/lib/api/openapi";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function GET() {
  const doc = getOpenApiDocument();
  return NextResponse.json(doc, { headers: CORS });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
