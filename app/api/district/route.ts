import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { lookupDistrict } from "@/lib/geocodio";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { zip } = await req.json();

  if (!zip || !/^\d{5}$/.test(zip)) {
    return NextResponse.json({ error: "Invalid ZIP code" }, { status: 400 });
  }

  const result = await lookupDistrict(zip);
  if (!result) {
    return NextResponse.json(
      { error: "Could not find congressional district for this ZIP code" },
      { status: 400 }
    );
  }

  return NextResponse.json(result);
}
