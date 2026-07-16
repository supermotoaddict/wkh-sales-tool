import { NextResponse } from "next/server";
import { lookupYearBuilt } from "@/lib/yearBuilt";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address") ?? "";

  if (address.trim().length < 5) {
    return NextResponse.json(
      { error: "address query param required", lookup: null },
      { status: 400 }
    );
  }

  try {
    const lookup = await lookupYearBuilt(address);
    return NextResponse.json({ lookup });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Year-built lookup failed";
    return NextResponse.json({ error: message, lookup: null }, { status: 502 });
  }
}
