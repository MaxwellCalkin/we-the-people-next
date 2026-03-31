import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import User from "@/models/User";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { state, cd } = await req.json();

  if (!state || !cd) {
    return NextResponse.json({ error: "State and district are required" }, { status: 400 });
  }

  const US_STATES = new Set([
    "al","ak","az","ar","ca","co","ct","de","fl","ga","hi","id","il","in","ia",
    "ks","ky","la","me","md","ma","mi","mn","ms","mo","mt","ne","nv","nh","nj",
    "nm","ny","nc","nd","oh","ok","or","pa","ri","sc","sd","tn","tx","ut","vt",
    "va","wa","wv","wi","wy","dc","as","gu","mp","pr","vi"
  ]);

  if (!US_STATES.has(state.toLowerCase())) {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }
  const cdNum = parseInt(cd, 10);
  if (isNaN(cdNum) || cdNum < 0 || cdNum > 53) {
    return NextResponse.json({ error: "Invalid district" }, { status: 400 });
  }

  await connectDB();
  await User.findByIdAndUpdate(session.user.id, { state, cd });

  return NextResponse.json({ success: true });
}
