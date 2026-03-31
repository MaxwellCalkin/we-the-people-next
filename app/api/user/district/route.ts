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

  await connectDB();
  await User.findByIdAndUpdate(session.user.id, { state, cd });

  return NextResponse.json({ success: true });
}
