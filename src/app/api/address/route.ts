import { NextResponse } from "next/server";
import { searchAddresses } from "@/lib/address";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  try {
    const results = await searchAddresses(q);
    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Address search failed";
    return NextResponse.json({ error: message, results: [] }, { status: 502 });
  }
}
